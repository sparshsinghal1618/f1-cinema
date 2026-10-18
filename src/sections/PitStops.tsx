// Section 10 — Pit-stop simulator.
//
// A deterministic stop: the same sequence, the same timings, every run. The
// diagram is a schematic plan of the pit box that can be viewed from four angles
// rather than a 3D render, and the timings are a plausible model rather than a
// measured stop.

import { useMemo, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { SectionHeader, revealIndex, useReveal, useRevealGroup } from '../components/ui';
import { useDocumentVisible, useFrameLoop, useOnScreen } from '../lib/motion';
import { pad } from '../lib/format';

/** Per-corner wheel-change timings, seconds from the stop beginning. */
const CORNERS = [
  { id: 'FL', label: 'Front left', x: 74, y: 118, release: 1.92 },
  { id: 'FR', label: 'Front right', x: 246, y: 118, release: 1.84 },
  { id: 'RL', label: 'Rear left', x: 74, y: 268, release: 2.24 },
  { id: 'RR', label: 'Rear right', x: 246, y: 268, release: 2.18 },
] as const;

const ARRIVE = 0.62;
const JACK = 0.72;
const RELEASE_AT = 2.24;
const GONE = 2.62;

const VIEWS = [
  { id: 'plan', label: 'Plan', transform: 'perspective(1100px) rotateX(0deg) rotateZ(0deg)' },
  { id: 'iso', label: 'Isometric', transform: 'perspective(1100px) rotateX(58deg) rotateZ(-34deg)' },
  { id: 'front', label: 'Front', transform: 'perspective(1100px) rotateX(72deg) rotateZ(0deg)' },
  { id: 'side', label: 'Side', transform: 'perspective(1100px) rotateX(72deg) rotateZ(90deg)' },
] as const;

type ViewId = (typeof VIEWS)[number]['id'];

function phaseAt(t: number): { label: string; detail: string } {
  if (t < ARRIVE) return { label: 'Arrival', detail: 'Car entering the box, speed dropping to zero.' };
  if (t < JACK) return { label: 'Set', detail: 'Car stationary. Guns on, jacks engaged.' };
  if (t < 1.9) return { label: 'Wheels off', detail: 'Old wheels removed on all four corners.' };
  if (t < RELEASE_AT) return { label: 'Wheels on', detail: 'New wheels fitted, nut guns running.' };
  if (t < GONE) return { label: 'Release', detail: 'Jacks down, front wing checked, car released.' };
  return { label: 'Complete', detail: 'Car away. Stop time recorded.' };
}

export function PitStops() {
  const [stageRef, inView] = useOnScreen<HTMLDivElement>({ rootMargin: '180px' });
  const visible = useDocumentVisible();

  const [view, setView] = useState<ViewId>('iso');
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [best, setBest] = useState<number | null>(null);
  const [runs, setRuns] = useState<number[]>([]);
  const timeRef = useRef(0);
  const doneRef = useRef(false);
  const stage = useReveal<HTMLDivElement>();
  const side = useRevealGroup<HTMLElement>(70);

  useFrameLoop(
    (dt) => {
      if (!playing) return;
      timeRef.current = Math.min(GONE, timeRef.current + dt);
      setElapsed(timeRef.current);
      if (timeRef.current >= GONE && !doneRef.current) {
        doneRef.current = true;
        setPlaying(false);
        setBest((value) => (value === null ? GONE : Math.min(value, GONE)));
        setRuns((value) => [...value.slice(-4), GONE]);
      }
    },
    inView && visible,
  );

  const start = () => {
    timeRef.current = 0;
    doneRef.current = false;
    setElapsed(0);
    setPlaying(true);
  };

  const pause = () => setPlaying(false);

  const reset = () => {
    timeRef.current = 0;
    doneRef.current = false;
    setElapsed(0);
    setPlaying(false);
  };

  const t = elapsed;
  const phase = phaseAt(t);
  const progress = Math.min(1, t / GONE);
  const crewOnCar = t >= ARRIVE - 0.1;
  const jacksUp = t >= JACK && t < RELEASE_AT;
  const activeView = VIEWS.find((entry) => entry.id === view) ?? VIEWS[0];

  const corners = useMemo(
    () =>
      CORNERS.map((corner) => {
        const state =
          t < ARRIVE
            ? 'waiting'
            : t < JACK
              ? 'ready'
              : t < corner.release - 0.34
                ? 'off'
                : t < corner.release
                  ? 'on'
                  : 'done';
        return { ...corner, state };
      }),
    [t],
  );

  return (
    <section className="section" id="pitstops" aria-labelledby="pit-title">
      <div className="shell section__head">
        <SectionHeader
          index="10"
          eyebrow="Deterministic simulation"
          title="Pit Stop"
          titleId="pit-title"
          lede="A stop replayed as a sequence: arrival, jacks, four wheel changes, release. Same inputs, same timings, every time — a model of a stop, not a measured one."
        />
      </div>

      <div className="shell pit" ref={stageRef}>
        <div ref={stage.ref} className={`pit__stage panel ${stage.className}`} style={stage.style}>
          <div className="pit__stage-head">
            <span className="mono">Pit box · schematic</span>
            <div className="control__row" role="group" aria-label="Diagram view">
              {VIEWS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={`chip${view === entry.id ? ' is-on' : ''}`}
                  aria-pressed={view === entry.id}
                  onClick={() => setView(entry.id)}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pit__viewport">
            <div className="pit__scene" style={{ transform: activeView.transform }}>
              <svg viewBox="0 0 320 380" className="pit__svg" role="img" aria-label={`Pit stop diagram, ${activeView.label} view, phase: ${phase.label}`}>
                {/* pit box and garage */}
                <rect x="26" y="86" width="268" height="214" rx="6" className="pit__box" />
                <rect x="26" y="14" width="268" height="62" rx="4" className="pit__garage" />
                <line x1="26" y1="86" x2="294" y2="86" className="pit__wall" />
                <line x1="160" y1="86" x2="160" y2="300" className="pit__centre" strokeDasharray="6 8" />

                {/* car */}
                <g className="pit__car" style={{ opacity: t < ARRIVE ? 1 : 1, transform: `translateY(${(1 - Math.min(1, t / ARRIVE)) * 22}px)` }}>
                  <rect x="128" y="112" width="64" height="162" rx="14" className="pit__body" />
                  <rect x="132" y="96" width="56" height="18" rx="5" className="pit__wing" />
                  <rect x="132" y="272" width="56" height="18" rx="5" className="pit__wing" />
                  {CORNERS.map((corner) => (
                    <rect
                      key={corner.id}
                      x={corner.x - 12}
                      y={corner.y - 13}
                      width="24"
                      height="26"
                      rx="6"
                      className="pit__tyre"
                    />
                  ))}
                </g>

                {/* crew */}
                <g className={`pit__crew${crewOnCar ? ' is-on' : ''}`}>
                  {CORNERS.map((corner) => (
                    <g key={corner.id}>
                      <circle cx={corner.x < 160 ? corner.x - 30 : corner.x + 30} cy={corner.y} r="6.5" className="pit__person" />
                      <circle cx={corner.x < 160 ? corner.x - 30 : corner.x + 30} cy={corner.y + 16} r="6.5" className="pit__person" />
                    </g>
                  ))}
                  <circle cx="160" cy="96" r="7" className="pit__person pit__person--jack" />
                  <circle cx="160" cy="292" r="7" className="pit__person pit__person--jack" />
                  <circle cx="112" cy="196" r="6.5" className="pit__person" />
                  <circle cx="208" cy="196" r="6.5" className="pit__person" />
                </g>

                {/* jack markers */}
                <g className={`pit__jacks${jacksUp ? ' is-up' : ''}`}>
                  <rect x="146" y="92" width="28" height="8" rx="3" className="pit__jack" />
                  <rect x="146" y="288" width="28" height="8" rx="3" className="pit__jack" />
                </g>

                {/* wheel progress rings */}
                {corners.map((corner) => (
                  <g key={corner.id} className={`pit__ring is-${corner.state}`}>
                    <circle cx={corner.x} cy={corner.y} r="18" className="pit__ring-track" />
                    <circle cx={corner.x} cy={corner.y} r="18" className="pit__ring-fill" />
                    <text x={corner.x} y={corner.y + 3.5} className="pit__ring-label">
                      {corner.id}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          <div className="pit__controls">
            <div className="row gap-8">
              {elapsed === 0 && !playing ? (
                <button type="button" className="btn btn--primary" onClick={start}>
                  <Play size={14} aria-hidden="true" />
                  Start stop
                </button>
              ) : playing ? (
                <button type="button" className="btn" onClick={pause}>
                  <Pause size={14} aria-hidden="true" />
                  Pause
                </button>
              ) : (
                <button type="button" className="btn btn--primary" onClick={start}>
                  <Play size={14} aria-hidden="true" />
                  Replay
                </button>
              )}
              <button type="button" className="btn" onClick={reset}>
                <RotateCcw size={14} aria-hidden="true" />
                Reset
              </button>
            </div>

            <div className="pit__timer">
              <span className="pit__clock mono">{t.toFixed(2)}</span>
              <span className="mono">s</span>
            </div>

            <div
              className="pit__progress"
              role="progressbar"
              aria-label="Stop progress"
              aria-valuemin={0}
              aria-valuemax={GONE}
              aria-valuenow={Number(t.toFixed(2))}
            >
              <div className="pit__progress-fill" style={{ transform: `scaleX(${progress})` }} />
            </div>
          </div>
        </div>

        <aside ref={side.ref} className={`pit__side ${side.className}`} style={side.style}>
          <div className="panel panel__pad" style={revealIndex(0)}>
            <p className="mono">Phase</p>
            <h3 className="h4">{phase.label}</h3>
            <p className="copy">{phase.detail}</p>
            <ol className="pit__running">
              {CORNERS.map((corner) => {
                const state = corners.find((entry) => entry.id === corner.id)?.state ?? 'waiting';
                return (
                  <li key={corner.id}>
                    <span className="mono">{corner.id}</span>
                    <span className="mono">{corner.label}</span>
                    <span className={`chip chip--mini is-${state}`}>{state}</span>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="panel panel__pad" style={revealIndex(1)}>
            <p className="mono">Recorded runs</p>
            {runs.length === 0 ? (
              <p className="copy">No completed stops yet this session.</p>
            ) : (
              <ol className="pit__runs">
                {runs.map((run, index) => (
                  <li key={`${run}-${index}`} className={run === best ? 'is-best' : undefined}>
                    <span className="mono">{pad(index + 1)}</span>
                    <span className="mono">{run.toFixed(2)} s</span>
                  </li>
                ))}
              </ol>
            )}
            <p className="mono">Best {best === null ? '—' : `${best.toFixed(2)} s`}</p>
          </div>

          <div className="panel panel__pad" style={revealIndex(2)}>
            <p className="mono">Caveat</p>
            <p className="copy">
              The diagram is a plan of a pit box drawn as a diagram, not a rendered scene, and the crew layout is
              illustrative. The timings are chosen to look like a real stop; they are not measured from one.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
