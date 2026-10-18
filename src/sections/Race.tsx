// Section 03 — Race.
//
// A playable browser circuit. The 3D layer is only mounted once the visitor asks
// for it; after that the simulation is deterministic (fixed 1/120 s steps), so the
// same inputs always produce the same lap. HUD values are written straight to the
// DOM from the render loop rather than through React state.
//
// This is a lightweight arcade model, not a physics-grade simulator.

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Flag, Gauge, Pause, Play, RotateCcw, TriangleAlert } from 'lucide-react';
import { GameScene, type RaceSnapshot } from '../three/GameScene';
import { ErrorBoundary, ImageFrame, SectionHeader } from '../components/ui';
import { RaceSim, TOTAL_LAPS, trackCurve, TRACK_WIDTH } from '../lib/racePhysics';
import { useDocumentVisible, useMediaQuery, useOnScreen } from '../lib/motion';
import { useQuality } from '../lib/quality';
import { fmtLap, pad } from '../lib/format';
import { audio } from '../lib/audio';

type Phase = 'idle' | 'running' | 'paused' | 'finished';

const CONTROLS: { keys: string; action: string }[] = [
  { keys: 'W / ↑', action: 'Throttle' },
  { keys: 'S / ↓', action: 'Brake, then reverse' },
  { keys: 'A D / ← →', action: 'Steer' },
  { keys: 'Space', action: 'Handbrake' },
  { keys: 'R', action: 'Restart the session' },
  { keys: 'Esc', action: 'Pause' },
];

export function Race() {
  const { settings, gpu } = useQuality();
  const visible = useDocumentVisible();
  const coarse = useMediaQuery('(pointer: coarse)');
  const [stageRef, inView] = useOnScreen<HTMLDivElement>({ rootMargin: '200px' });

  const simRef = useRef<RaceSim | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [results, setResults] = useState<{ laps: number[]; best: number | null } | null>(null);
  const [impact, setImpact] = useState(false);
  const [liveLap, setLiveLap] = useState({ lap: 1, last: null as number | null, best: null as number | null });

  const speedRef = useRef<HTMLSpanElement>(null);
  const gearRef = useRef<HTMLSpanElement>(null);
  const rpmRef = useRef<HTMLDivElement>(null);
  const rpmTextRef = useRef<HTMLSpanElement>(null);
  const throttleRef = useRef<HTMLDivElement>(null);
  const brakeRef = useRef<HTMLDivElement>(null);
  const lapTimeRef = useRef<HTMLSpanElement>(null);
  const lapRef = useRef<HTMLSpanElement>(null);
  const sectorRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);

  const keys = useRef(new Set<string>());
  const touch = useRef({ throttle: 0, brake: 0, steer: 0 });

  // Track map: the same centreline the physics uses, normalised to a 0..100 box.
  const map = useMemo(() => {
    const samples = trackCurve().getSpacedPoints(160);
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const point of samples) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minZ = Math.min(minZ, point.z);
      maxZ = Math.max(maxZ, point.z);
    }
    const width = maxX - minX;
    const height = maxZ - minZ;
    const scale = 88 / Math.max(width, height);
    const points = samples.map((point) => [
      (point.x - minX) * scale + (100 - width * scale) / 2,
      (point.z - minZ) * scale + (100 - height * scale) / 2,
    ] as [number, number]);
    return {
      path: `${points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ')} Z`,
      points,
    };
  }, []);

  const sim = simRef.current;

  /* --------------------------------------------------------------- input */

  const applyInput = useCallback(() => {
    const current = simRef.current;
    if (!current) return;
    const pressed = keys.current;
    const throttle = pressed.has('throttle') || touch.current.throttle > 0 ? 1 : 0;
    const brake = pressed.has('brake') || touch.current.brake > 0 ? 1 : 0;
    let steer = touch.current.steer;
    if (pressed.has('left')) steer -= 1;
    if (pressed.has('right')) steer += 1;
    current.input.throttle = throttle;
    current.input.brake = brake;
    current.input.steer = Math.max(-1, Math.min(1, steer));
    current.input.handbrake = pressed.has('handbrake');
  }, []);

  useEffect(() => {
    if (!loaded) return;

    const map: Record<string, string> = {
      w: 'throttle',
      arrowup: 'throttle',
      s: 'brake',
      arrowdown: 'brake',
      a: 'left',
      arrowleft: 'left',
      d: 'right',
      arrowright: 'right',
      ' ': 'handbrake',
    };

    const onDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === 'r') {
        event.preventDefault();
        restart();
        return;
      }
      if (key === 'escape') {
        event.preventDefault();
        togglePause();
        return;
      }
      const action = map[key];
      if (!action) return;
      if (key === ' ' || key.startsWith('arrow')) event.preventDefault();
      keys.current.add(action);
      applyInput();
    };

    const onUp = (event: KeyboardEvent) => {
      const action = map[event.key.toLowerCase()];
      if (!action) return;
      keys.current.delete(action);
      applyInput();
    };

    const onBlur = () => {
      keys.current.clear();
      applyInput();
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, applyInput]);

  /* ----------------------------------------------------------- lifecycle */

  const load = () => {
    if (!simRef.current) simRef.current = new RaceSim();
    setLoaded(true);
    setPhase('idle');
    setResults(null);
    void audio.enable();
  };

  const begin = () => {
    const current = simRef.current;
    if (!current) return;
    current.start();
    setResults(null);
    setPhase('running');
    audio.ui('confirm');
  };

  const restart = useCallback(() => {
    const current = simRef.current;
    if (!current) return;
    keys.current.clear();
    touch.current = { throttle: 0, brake: 0, steer: 0 };
    current.start();
    setResults(null);
    setPhase('running');
  }, []);

  const togglePause = useCallback(() => {
    const current = simRef.current;
    if (!current) return;
    if (current.phase === 'running') {
      current.pause();
      setPhase('paused');
    } else if (current.phase === 'paused') {
      current.resume();
      setPhase('running');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Racing off-screen is meaningless, so the clock stops with the section.
  useEffect(() => {
    const current = simRef.current;
    if (!current || !loaded) return;
    if (!inView && current.phase === 'running') {
      current.pause();
      setPhase('paused');
    }
  }, [inView, loaded]);

  const onSnapshot = useCallback(
    (snapshot: RaceSnapshot) => {
      if (speedRef.current) speedRef.current.textContent = String(Math.round(snapshot.speed)).padStart(3, '0');
      if (gearRef.current) gearRef.current.textContent = snapshot.gear === 0 ? 'R' : String(snapshot.gear);
      if (rpmRef.current) rpmRef.current.style.transform = `scaleX(${Math.min(1, snapshot.rpm / 15000)})`;
      if (rpmTextRef.current) rpmTextRef.current.textContent = String(Math.round(snapshot.rpm / 100) * 100);
      if (throttleRef.current) throttleRef.current.style.transform = `scaleY(${snapshot.throttle})`;
      if (brakeRef.current) brakeRef.current.style.transform = `scaleY(${snapshot.brake})`;
      if (lapTimeRef.current) lapTimeRef.current.textContent = fmtLap(snapshot.lapTime);
      if (lapRef.current) lapRef.current.textContent = `${snapshot.lap}`;
      if (sectorRef.current) {
        sectorRef.current.textContent = snapshot.sectors
          .map((sector, index) => (sector === null ? `S${index + 1} --:--.---` : `S${index + 1} ${fmtLap(sector)}`))
          .join('   ');
      }
      if (dotRef.current) {
        const index = Math.min(map.points.length - 1, Math.max(0, Math.round(snapshot.progress * (map.points.length - 1))));
        const [x, y] = map.points[index];
        dotRef.current.setAttribute('cx', x.toFixed(2));
        dotRef.current.setAttribute('cy', y.toFixed(2));
      }
      setImpact((value) => {
        const next = snapshot.impact > 0.35;
        return value === next ? value : next;
      });
      setLiveLap((value) =>
        value.lap === snapshot.lap && value.last === snapshot.lastLap && value.best === snapshot.bestLap
          ? value
          : { lap: snapshot.lap, last: snapshot.lastLap, best: snapshot.bestLap },
      );
    },
    [map],
  );

  const onFinish = useCallback(() => {
    const current = simRef.current;
    if (!current) return;
    setPhase('finished');
    setResults({ laps: current.timing.laps, best: current.timing.bestLap });
    audio.ui('flag');
  }, []);

  const setTouch = (field: 'throttle' | 'brake' | 'steer', value: number) => {
    touch.current[field] = value;
    applyInput();
  };

  const active = loaded && inView && visible;

  return (
    <section className="section" id="race" aria-labelledby="race-title">
      <div className="shell section__head">
        <SectionHeader
          index="03"
          eyebrow="Playable demonstration"
          title="Race"
          titleId="race-title"
          lede="A closed circuit you can drive. The car model is the same one from the showroom, on a synthetic track built for this project."
        />
      </div>

      <div className="shell race">
        <div className="race__stage" ref={stageRef}>
          {!loaded ? (
            <div className="race__intro panel panel__pad">
              <div className="race__intro-media">
                <ImageFrame imageKey="hero-2" alt="Race car on a demonstration run" ratio="16 / 9" />
              </div>
              <div className="race__intro-copy">
                <p className="mono">Circuit · F1 Ring · {TRACK_WIDTH} m wide</p>
                <h3 className="display h3">Take it out</h3>
                <p className="copy">
                  Three laps of a synthetic closed circuit, driving the procedural car from the opening film. The
                  simulation is a lightweight arcade model — a single force balance and a grip ceiling — not a
                  vehicle-dynamics package, and the circuit is an original layout rather than a real one.
                </p>
                <dl className="race__controls">
                  {CONTROLS.map((entry) => (
                    <div key={entry.keys}>
                      <dt className="mono">{entry.keys}</dt>
                      <dd>{entry.action}</dd>
                    </div>
                  ))}
                </dl>
                <button type="button" className="btn btn--primary btn--lg" onClick={load} disabled={!gpu.webgl}>
                  <Play size={15} aria-hidden="true" />
                  Load the simulator
                </button>
                <p className="mono race__note">
                  {gpu.webgl
                    ? `Renderer: ${gpu.renderer} · ${gpu.tier} tier · ${gpu.cores} threads`
                    : 'WebGL is unavailable in this browser — the simulator cannot run here.'}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="race__canvas">
                <ErrorBoundary label="Race simulator" fallback={<RaceFallback />}>
                  <Suspense fallback={<p className="mono race__loading">Loading circuit…</p>}>
                    {sim && <GameScene sim={sim} quality={settings} active={active} onSnapshot={onSnapshot} onFinish={onFinish} />}
                  </Suspense>
                </ErrorBoundary>

                <div className={`race__hud${impact ? ' is-impact' : ''}`}>
                  <div className="race__hud-left">
                    <div className="hud__speed">
                      <span className="hud__value" ref={speedRef}>
                        000
                      </span>
                      <span className="mono">km/h</span>
                    </div>
                    <div className="hud__gear">
                      <span className="hud__value" ref={gearRef}>
                        1
                      </span>
                      <span className="mono">gear</span>
                    </div>
                  </div>

                  <div className="race__hud-right">
                    <div className="hud__row">
                      <span className="mono">Lap</span>
                      <span className="mono">
                        <span ref={lapRef}>1</span>/{TOTAL_LAPS}
                      </span>
                    </div>
                    <div className="hud__row">
                      <span className="mono">Current</span>
                      <span className="mono" ref={lapTimeRef}>
                        {fmtLap(0)}
                      </span>
                    </div>
                    <div className="hud__row">
                      <span className="mono">Last</span>
                      <span className="mono">{liveLap.last === null ? '—' : fmtLap(liveLap.last)}</span>
                    </div>
                    <div className="hud__row">
                      <span className="mono">Best</span>
                      <span className="mono">{liveLap.best === null ? '—' : fmtLap(liveLap.best)}</span>
                    </div>
                    <div className="hud__sectors mono" ref={sectorRef} />
                  </div>

                  <div className="race__map" aria-hidden="true">
                    <svg viewBox="0 0 100 100" role="presentation">
                      <path d={map.path} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="2.6" strokeLinejoin="round" />
                      <circle ref={dotRef} cx="50" cy="50" r="2.6" fill="#e10600" />
                    </svg>
                  </div>

                  <div className="race__rpm">
                    <div className="hud__rpm-bar">
                      <div className="hud__rpm-fill" ref={rpmRef} />
                    </div>
                    <span className="mono">
                      <span ref={rpmTextRef}>0</span> rpm
                    </span>
                  </div>

                  <div className="race__pedals" aria-hidden="true">
                    <div className="hud__pedal hud__pedal--throttle">
                      <div ref={throttleRef} />
                      <span className="mono">THR</span>
                    </div>
                    <div className="hud__pedal hud__pedal--brake">
                      <div ref={brakeRef} />
                      <span className="mono">BRK</span>
                    </div>
                  </div>
                </div>

                {coarse && (
                  <div className="race__touch">
                    <div className="race__touch-steer">
                      <button
                        type="button"
                        className="touch-btn"
                        onPointerDown={() => setTouch('steer', -1)}
                        onPointerUp={() => setTouch('steer', 0)}
                        onPointerLeave={() => setTouch('steer', 0)}
                        onPointerCancel={() => setTouch('steer', 0)}
                        aria-label="Steer left"
                      >
                        ◀
                      </button>
                      <button
                        type="button"
                        className="touch-btn"
                        onPointerDown={() => setTouch('steer', 1)}
                        onPointerUp={() => setTouch('steer', 0)}
                        onPointerLeave={() => setTouch('steer', 0)}
                        onPointerCancel={() => setTouch('steer', 0)}
                        aria-label="Steer right"
                      >
                        ▶
                      </button>
                    </div>
                    <div className="race__touch-pedals">
                      <button
                        type="button"
                        className="touch-btn touch-btn--brake"
                        onPointerDown={() => setTouch('brake', 1)}
                        onPointerUp={() => setTouch('brake', 0)}
                        onPointerLeave={() => setTouch('brake', 0)}
                        onPointerCancel={() => setTouch('brake', 0)}
                        aria-label="Brake"
                      >
                        Brake
                      </button>
                      <button
                        type="button"
                        className="touch-btn touch-btn--throttle"
                        onPointerDown={() => setTouch('throttle', 1)}
                        onPointerUp={() => setTouch('throttle', 0)}
                        onPointerLeave={() => setTouch('throttle', 0)}
                        onPointerCancel={() => setTouch('throttle', 0)}
                        aria-label="Throttle"
                      >
                        Throttle
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="race__bar panel panel__pad">
                <div className="race__bar-status">
                  <span className={`chip${phase === 'running' ? ' is-on' : ''}`}>
                    <Gauge size={12} aria-hidden="true" />
                    {phase === 'running' ? 'Running' : phase === 'paused' ? 'Paused' : phase === 'finished' ? 'Finished' : 'Ready'}
                  </span>
                  {impact && (
                    <span className="chip chip--warn">
                      <TriangleAlert size={12} aria-hidden="true" />
                      Barrier contact
                    </span>
                  )}
                </div>

                <div className="row gap-8">
                  {phase === 'idle' && (
                    <button type="button" className="btn btn--primary" onClick={begin}>
                      <Play size={14} aria-hidden="true" />
                      Start
                    </button>
                  )}
                  {(phase === 'running' || phase === 'paused') && (
                    <button type="button" className="btn" onClick={togglePause}>
                      {phase === 'running' ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
                      {phase === 'running' ? 'Pause' : 'Resume'}
                    </button>
                  )}
                  <button type="button" className="btn" onClick={restart}>
                    <RotateCcw size={14} aria-hidden="true" />
                    Restart
                  </button>
                </div>
              </div>

              {phase === 'paused' && (
                <div className="race__overlay" role="dialog" aria-modal="true" aria-label="Paused">
                  <div className="panel panel__pad race__modal">
                    <p className="mono">Session paused</p>
                    <h3 className="display h3">Paused</h3>
                    <p className="copy">The clock has stopped. The car is where you left it.</p>
                    <div className="row gap-8">
                      <button type="button" className="btn btn--primary" onClick={togglePause}>
                        <Play size={14} aria-hidden="true" />
                        Resume
                      </button>
                      <button type="button" className="btn" onClick={restart}>
                        <RotateCcw size={14} aria-hidden="true" />
                        Restart
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {phase === 'finished' && results && (
                <div className="race__overlay" role="dialog" aria-modal="true" aria-label="Results">
                  <div className="panel panel__pad race__modal">
                    <p className="mono">
                      <Flag size={12} aria-hidden="true" /> Chequered flag
                    </p>
                    <h3 className="display h3">Session complete</h3>
                    <table className="race__results">
                      <caption className="sr-only">Lap times</caption>
                      <thead>
                        <tr>
                          <th scope="col">Lap</th>
                          <th scope="col">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.laps.map((lap, index) => (
                          <tr key={index} className={lap === results.best ? 'is-best' : undefined}>
                            <td>{pad(index + 1)}</td>
                            <td className="mono">{fmtLap(lap)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="copy">
                      Best lap <strong className="mono">{results.best === null ? '—' : fmtLap(results.best)}</strong>
                    </p>
                    <div className="row gap-8">
                      <button type="button" className="btn btn--primary" onClick={restart}>
                        <RotateCcw size={14} aria-hidden="true" />
                        Race again
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <aside className="race__side">
          <article className="panel panel__pad">
            <p className="mono">Model</p>
            <p className="copy">
              Longitudinal: engine force falling off with speed, quadratic drag, rolling and braking resistance.
              Lateral: a kinematic bicycle steering model under a grip ceiling that produces understeer rather than
              a spin. Fixed 1/120 s timestep, no randomness.
            </p>
          </article>
          <article className="panel panel__pad">
            <p className="mono">What it is not</p>
            <p className="copy">
              Not a tyre model, not a real circuit, not a setup tool. Grip, downforce and power figures are chosen for
              an enjoyable lap, not measured from any car.
            </p>
          </article>
          <article className="panel panel__pad">
            <p className="mono">Session</p>
            <p className="copy">
              {TOTAL_LAPS} laps. Best lap is kept for the session and cleared on reload.
            </p>
          </article>
        </aside>
      </div>
    </section>
  );
}

function RaceFallback() {
  return (
    <div className="film__fallback">
      <ImageFrame imageKey="cars-4" alt="Open-wheel car reference photograph" ratio="16 / 9" />
      <p className="mono">The simulator needs WebGL. This browser cannot run it.</p>
    </div>
  );
}
