// Section 05 — Telemetry command centre.
//
// A deterministic scripted lap drives every readout. The gauges are written from a
// single animation loop straight to the DOM; React state only carries the discrete
// choices (scenario, running or paused).

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Activity, Pause, Play, RotateCcw } from 'lucide-react';
import { SectionHeader, revealIndex, useRevealGroup } from '../components/ui';
import { LAP_LENGTH_M, SCENARIOS, TelemetrySim, mapPath, mapPosition, type Scenario } from '../lib/telemetrySim';
import { useDocumentVisible, useFrameLoop, useOnScreen } from '../lib/motion';
import { clamp, fmtLap } from '../lib/format';

const GAUGE_HISTORY = 180;

export function Telemetry() {
  const [stageRef, inView] = useOnScreen<HTMLDivElement>({ rootMargin: '160px' });
  const visible = useDocumentVisible();
  const simRef = useRef<TelemetrySim | null>(null);
  if (!simRef.current) simRef.current = new TelemetrySim();
  const sim = simRef.current;

  const [scenario, setScenario] = useState<Scenario>('race');
  const [running, setRunning] = useState(false);
  const [lapInfo, setLapInfo] = useState({ lap: 1, last: null as number | null, best: null as number | null });
  const grid = useRevealGroup<HTMLDivElement>(70);
  const side = useRevealGroup<HTMLElement>(90);

  const speedRef = useRef<HTMLSpanElement>(null);
  const gearRef = useRef<HTMLSpanElement>(null);
  const rpmFillRef = useRef<HTMLDivElement>(null);
  const rpmTextRef = useRef<HTMLSpanElement>(null);
  const throttleRef = useRef<HTMLDivElement>(null);
  const brakeRef = useRef<HTMLDivElement>(null);
  const steerRef = useRef<HTMLDivElement>(null);
  const batteryRef = useRef<HTMLDivElement>(null);
  const deployRef = useRef<HTMLDivElement>(null);
  const drsRef = useRef<HTMLSpanElement>(null);
  const lapTimeRef = useRef<HTMLSpanElement>(null);
  const sectorRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const tyreRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const wearRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dotRef = useRef<SVGCircleElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const traceRef = useRef<number[]>([]);

  const path = useMemo(() => mapPath(), []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);

    const grid = 'rgba(255,255,255,0.06)';
    context.strokeStyle = grid;
    context.lineWidth = 1;
    for (let i = 1; i < 4; i += 1) {
      const y = (height / 4) * i;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }

    const values = traceRef.current;
    if (values.length < 2) return;

    const series = (pick: (value: number) => number, color: string, fill: string) => {
      const step = width / Math.max(1, GAUGE_HISTORY - 1);
      context.beginPath();
      values.forEach((value, index) => {
        const x = index * step;
        const y = height - clamp(pick(value), 0, 1) * height;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.strokeStyle = color;
      context.lineWidth = 1.6;
      context.stroke();
      context.lineTo((values.length - 1) * step, height);
      context.lineTo(0, height);
      context.closePath();
      context.fillStyle = fill;
      context.fill();
    };

    series((value) => value, 'rgba(90,209,255,0.95)', 'rgba(90,209,255,0.10)');
    series((value) => value * 0.55, 'rgba(255,176,31,0.9)', 'rgba(255,176,31,0.07)');
  }, []);

  useFrameLoop(
    (dt) => {
      sim.step(dt);
      const channel = sim.sample();
      traceRef.current.push(channel.speed / 340);
      if (traceRef.current.length > GAUGE_HISTORY) traceRef.current.shift();

      if (speedRef.current) speedRef.current.textContent = String(Math.round(channel.speed));
      if (gearRef.current) gearRef.current.textContent = String(channel.gear);
      if (rpmFillRef.current) rpmFillRef.current.style.transform = `scaleX(${clamp((channel.rpm - 4000) / 11000, 0, 1)})`;
      if (rpmTextRef.current) rpmTextRef.current.textContent = String(Math.round(channel.rpm / 50) * 50);
      if (throttleRef.current) throttleRef.current.style.transform = `scaleY(${channel.throttle})`;
      if (brakeRef.current) brakeRef.current.style.transform = `scaleY(${channel.brake})`;
      if (steerRef.current) steerRef.current.style.transform = `translateX(${channel.steer * 46}%)`;
      if (batteryRef.current) batteryRef.current.style.transform = `scaleX(${channel.battery})`;
      if (deployRef.current) deployRef.current.style.transform = `scaleX(${clamp(channel.deploy, 0, 1)})`;
      if (drsRef.current) drsRef.current.dataset.on = channel.drs ? 'true' : 'false';
      if (lapTimeRef.current) lapTimeRef.current.textContent = fmtLap(channel.lapTime);
      channel.sectors.forEach((sector, index) => {
        const node = sectorRefs.current[index];
        if (node) node.textContent = sector === null ? '--:--.---' : fmtLap(sector);
      });
      channel.tyreTemp.forEach((temp, index) => {
        const node = tyreRefs.current[index];
        if (node) {
          node.textContent = `${temp.toFixed(0)}°`;
          node.dataset.hot = temp > 118 ? 'true' : temp < 78 ? 'cold' : 'false';
        }
        const wear = wearRefs.current[index];
        if (wear) wear.style.transform = `scaleX(${clamp(channel.tyreWear[index], 0, 1)})`;
      });
      if (dotRef.current) {
        const [x, y] = mapPosition(channel.progress);
        dotRef.current.setAttribute('cx', x.toFixed(2));
        dotRef.current.setAttribute('cy', y.toFixed(2));
      }
      draw();

      setLapInfo((value) =>
        value.lap === channel.lap && value.last === channel.lastLap && value.best === channel.bestLap
          ? value
          : { lap: channel.lap, last: channel.lastLap, best: channel.bestLap },
      );
    },
    inView && visible,
  );

  // Keep the trace canvas sharp on resize without re-running the loop.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(320, Math.round(rect.width * dpr));
      canvas.height = Math.max(90, Math.round(rect.height * dpr));
      draw();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [draw]);

  useEffect(() => {
    sim.setScenario(scenario);
  }, [sim, scenario]);

  useEffect(() => {
    if (running) sim.start();
    else sim.pause();
  }, [sim, running]);

  const reset = () => {
    sim.reset();
    traceRef.current = [];
    setRunning(false);
    setLapInfo({ lap: 1, last: null, best: null });
  };

  const corners = ['FL', 'FR', 'RL', 'RR'];

  return (
    <section className="section" id="telemetry" aria-labelledby="telemetry-title">
      <div className="shell section__head">
        <SectionHeader
          index="05"
          eyebrow="Simulated data"
          title="Telemetry"
          titleId="telemetry-title"
          lede="A scripted lap of a schematic circuit, streams to every gauge. Nothing here is measured from a real car — it is a deterministic model built to demonstrate the interface."
        />
      </div>

      <div className="shell telemetry" ref={stageRef}>
        <div className="telemetry__main">
          <div className="telemetry__top panel panel__pad">
            <div className="tel-gauge tel-gauge--speed">
              <span className="tel-gauge__value" ref={speedRef}>
                0
              </span>
              <span className="mono">km/h</span>
            </div>
            <div className="tel-gauge">
              <span className="tel-gauge__value" ref={gearRef}>
                1
              </span>
              <span className="mono">gear</span>
            </div>
            <div className="tel-bars">
              <div className="tel-bar">
                <span className="mono">RPM</span>
                <div className="tel-bar__track">
                  <div className="tel-bar__fill" ref={rpmFillRef} />
                </div>
                <span className="mono" ref={rpmTextRef}>
                  0
                </span>
              </div>
              <div className="tel-bar">
                <span className="mono">Battery</span>
                <div className="tel-bar__track">
                  <div className="tel-bar__fill tel-bar__fill--cyan" ref={batteryRef} />
                </div>
              </div>
              <div className="tel-bar">
                <span className="mono">Deploy</span>
                <div className="tel-bar__track">
                  <div className="tel-bar__fill tel-bar__fill--green" ref={deployRef} />
                </div>
              </div>
            </div>
            <div className="tel-state">
              <span className="chip" ref={drsRef} data-on="false">
                DRS
              </span>
              <span className="mono">
                Lap <strong>{lapInfo.lap}</strong>
              </span>
            </div>
          </div>

          <div ref={grid.ref} className={`telemetry__grid ${grid.className}`} style={grid.style}>
            <div className="panel panel__pad tel-panel" style={revealIndex(0)}>
              <p className="mono">Speed / throttle trace</p>
              <canvas className="tel-trace" ref={canvasRef} aria-hidden="true" />
              <p className="mono tel-panel__legend">
                <span className="tel-key tel-key--cyan" /> speed
                <span className="tel-key tel-key--amber" /> throttle
              </p>
            </div>

            <div className="panel panel__pad tel-panel" style={revealIndex(1)}>
              <p className="mono">Track map</p>
              <svg className="tel-map" viewBox="-4 -4 108 108" role="img" aria-label="Schematic lap map with a live position marker">
                <path d={path} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="5" strokeLinejoin="round" />
                <path d={path} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.7" strokeDasharray="3 3" />
                <circle ref={dotRef} cx="8" cy="62" r="3.2" fill="#e10600" />
              </svg>
              <p className="mono tel-panel__legend">Schematic circuit · {LAP_LENGTH_M.toLocaleString()} m</p>
            </div>

            <div className="panel panel__pad tel-panel" style={revealIndex(2)}>
              <p className="mono">Inputs</p>
              <div className="tel-inputs">
                <div className="tel-vert">
                  <span className="mono">THR</span>
                  <div className="tel-vert__track">
                    <div className="tel-vert__fill tel-vert__fill--green" ref={throttleRef} />
                  </div>
                </div>
                <div className="tel-vert">
                  <span className="mono">BRK</span>
                  <div className="tel-vert__track">
                    <div className="tel-vert__fill tel-vert__fill--red" ref={brakeRef} />
                  </div>
                </div>
                <div className="tel-steer">
                  <span className="mono">Steering</span>
                  <div className="tel-steer__track">
                    <div className="tel-steer__knob" ref={steerRef} />
                  </div>
                </div>
              </div>
            </div>

            <div className="panel panel__pad tel-panel" style={revealIndex(3)}>
              <p className="mono">Tyres — temperature / wear</p>
              <ul className="tel-tyres">
                {corners.map((corner, index) => (
                  <li key={corner}>
                    <span className="mono">{corner}</span>
                    <span className="tel-tyres__temp mono" ref={(node) => { tyreRefs.current[index] = node; }}>
                      --°
                    </span>
                    <div className="tel-tyres__wear">
                      <div
                        className="tel-tyres__wear-fill"
                        ref={(node) => { wearRefs.current[index] = node; }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="panel panel__pad tel-panel" style={revealIndex(4)}>
              <p className="mono">Timing</p>
              <dl className="tel-timing">
                <div>
                  <dt className="mono">Current</dt>
                  <dd className="mono" ref={lapTimeRef}>
                    {fmtLap(0)}
                  </dd>
                </div>
                <div>
                  <dt className="mono">Last</dt>
                  <dd className="mono">{lapInfo.last === null ? '—' : fmtLap(lapInfo.last)}</dd>
                </div>
                <div>
                  <dt className="mono">Best</dt>
                  <dd className="mono">{lapInfo.best === null ? '—' : fmtLap(lapInfo.best)}</dd>
                </div>
              </dl>
              <ol className="tel-sectors">
                {[0, 1, 2].map((index) => (
                  <li key={index}>
                    <span className="mono">S{index + 1}</span>
                    <span className="mono" ref={(node) => { sectorRefs.current[index] = node; }}>
                      --:--.---
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        <aside ref={side.ref} className={`telemetry__side ${side.className}`} style={side.style}>
          <div className="panel panel__pad" style={revealIndex(0)}>
            <p className="mono">Scenario</p>
            <div className="control__row">
              {SCENARIOS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={`chip${scenario === entry.id ? ' is-on' : ''}`}
                  aria-pressed={scenario === entry.id}
                  onClick={() => setScenario(entry.id)}
                >
                  {entry.label}
                </button>
              ))}
            </div>
            <p className="copy">{SCENARIOS.find((entry) => entry.id === scenario)?.blurb}</p>
          </div>

          <div className="panel panel__pad" style={revealIndex(1)}>
            <p className="mono">Run controls</p>
            <div className="control__row">
              <button type="button" className="btn btn--primary" onClick={() => setRunning((value) => !value)}>
                {running ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
                {running ? 'Pause' : 'Start'}
              </button>
              <button type="button" className="btn" onClick={reset}>
                <RotateCcw size={14} aria-hidden="true" />
                Reset
              </button>
            </div>
            <p className="mono">
              <Activity size={12} aria-hidden="true" /> {running ? 'streaming' : 'stopped'}
            </p>
          </div>

          <div className="panel panel__pad" style={revealIndex(2)}>
            <p className="mono">Read this as a model</p>
            <p className="copy">
              Speed, RPM, temperatures, wear, energy and the timing set are all generated by this page. They are
              internally consistent — the trace, gauges and map all read the same state — but they describe a
              fictional car on a schematic lap.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
