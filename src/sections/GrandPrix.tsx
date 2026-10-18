// Section 04 — Grand Prix simulator.
//
// A deterministic multi-car race against the fictional grid from the race-weekend
// dataset. The race is computed once per strategy with src/lib/raceSim.ts and then
// revealed lap by lap. Nothing here is measured, live or random: the same strategy
// always produces the same result.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Flag, Info, Pause, Play, RotateCcw, SkipForward, Trophy } from 'lucide-react';
import { SectionHeader } from '../components/ui';
import {
  COMPOUNDS,
  COMPOUND_ORDER,
  DEFAULT_CONFIG,
  FIELD,
  MAX_LAPS,
  PACE_MODES,
  simulateRace,
  type RaceConfig,
} from '../lib/raceSim';
import { useDocumentVisible, useFrameLoop, useOnScreen } from '../lib/motion';
import { clamp, fmtDelta, fmtDuration, fmtLap } from '../lib/format';
import { audio } from '../lib/audio';

/** Seconds of wall-clock time per simulated lap, at 1x speed. */
const LAP_SECONDS = 0.9;

const TEAM_COLORS: Record<string, string> = {
  'F1 Concept': '#e10600',
  'Vertex Motorsport': '#5ad1ff',
  'Horizon Dynamics': '#ffb01f',
  'Northwind Racing': '#7ee787',
  'Meridian Works': '#c792ea',
  'Carbon Union': '#d9dde3',
};

const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

export function GrandPrix() {
  const [stageRef, inView] = useOnScreen<HTMLDivElement>({ rootMargin: '180px' });
  const visible = useDocumentVisible();

  const [config, setConfig] = useState<RaceConfig>(DEFAULT_CONFIG);
  const [revealed, setRevealed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const accumulator = useRef(0);
  const result = useMemo(() => simulateRace(config), [config]);

  useEffect(() => {
    setRevealed(0);
    accumulator.current = 0;
  }, [config]);

  useFrameLoop(
    (dt) => {
      accumulator.current += dt * speed;
      let steps = 0;
      while (accumulator.current >= LAP_SECONDS && steps < 6) {
        accumulator.current -= LAP_SECONDS;
        steps += 1;
      }
      if (steps > 0) setRevealed((value) => Math.min(result.totalLaps, value + steps));
    },
    playing && inView && visible,
  );

  useEffect(() => {
    if (revealed >= result.totalLaps) setPlaying(false);
  }, [revealed, result.totalLaps]);

  const finished = revealed >= result.totalLaps;
  const current = revealed > 0 ? result.laps[revealed - 1] : null;
  const playerIndex = config.carIndex;

  const patch = (changes: Partial<RaceConfig>) => setConfig((value) => ({ ...value, ...changes }));

  const stopCount = config.pitLaps.length;
  const setStops = (count: number) => {
    if (count === 0) return patch({ pitLaps: [] });
    const laps = clamp(Math.round(config.laps / (count + 1)), 1, config.laps - 1);
    const next = Array.from({ length: count }, (_, index) => clamp(laps * (index + 1), 1, config.laps - 1));
    return patch({ pitLaps: [...new Set(next)] });
  };

  const setPitLap = (index: number, lap: number) =>
    patch({ pitLaps: config.pitLaps.map((value, i) => (i === index ? lap : value)) });

  const restart = () => {
    setRevealed(0);
    accumulator.current = 0;
  };

  const toggle = () => {
    if (finished) restart();
    setPlaying((value) => !value);
    audio.ui('tick');
  };

  // Gap chart geometry, drawn over the laps revealed so far.
  const chart = useMemo(() => {
    const laps = result.laps.slice(0, Math.max(1, revealed));
    const last = laps[laps.length - 1];
    let maxGap = 8;
    for (const row of laps) {
      const leader = row.cumulative[row.order[0]];
      for (const value of row.cumulative) maxGap = Math.max(maxGap, value - leader);
    }
    const x = (lap: number) => (result.totalLaps <= 1 ? 0 : ((lap - 1) / (result.totalLaps - 1)) * 100);
    const y = (gap: number) => clamp((gap / maxGap) * 100, 0, 100);
    const series = FIELD.map((competitor, index) => {
      const points = laps
        .map((row) => `${x(row.lap).toFixed(2)} ${y(row.cumulative[index] - row.cumulative[row.order[0]]).toFixed(2)}`)
        .join(' L');
      return { index, competitor, path: points ? `M${points}` : '' };
    });
    return { series, maxGap, last };
  }, [result, revealed]);

  return (
    <section className="section" id="grandprix" aria-labelledby="grandprix-title">
      <div className="shell section__head">
        <SectionHeader
          index="04"
          eyebrow="Deterministic model"
          title="Grand Prix"
          titleId="grandprix-title"
          lede="Run the fictional demonstration grid over a full race distance. Pick your car, tyres and stops, and the model plays the race out lap by lap — the same plan always produces the same result."
        />
      </div>

      <div className="shell gp" ref={stageRef}>
        <div className="gp__main">
          <div className="gp__board panel panel__pad">
            <div className="gp__board-top">
              <div>
                <p className="mono">
                  {finished ? 'Chequered flag' : playing ? 'Racing' : revealed > 0 ? 'Paused' : 'On the grid'}
                </p>
                <p className="gp__lap">
                  <span className="display">{revealed}</span>
                  <span className="mono">/ {result.totalLaps} laps</span>
                </p>
              </div>
              <div className="gp__board-flags">
                {result.leadChanges > 0 && revealed > 1 && (
                  <span className="chip">
                    <Info size={12} aria-hidden="true" />
                    {result.leadChanges} lead change{result.leadChanges === 1 ? '' : 's'}
                  </span>
                )}
                <span className="chip" style={{ color: TEAM_COLORS[FIELD[playerIndex].team] }}>
                  You · P{current ? current.positions[playerIndex] : FIELD[playerIndex].grid}
                </span>
              </div>
            </div>

            <div className="gp__controls">
              <button type="button" className="btn btn--primary" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
                {playing ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
                {playing ? 'Pause' : finished ? 'Replay' : 'Play'}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setPlaying(false);
                  setRevealed((value) => Math.min(result.totalLaps, value + 1));
                }}
                disabled={finished}
              >
                <SkipForward size={14} aria-hidden="true" />
                Lap
              </button>
              <button type="button" className="btn" onClick={restart}>
                <RotateCcw size={14} aria-hidden="true" />
                Restart
              </button>
              <div className="control__row gp__speed" role="group" aria-label="Playback speed">
                {[1, 2, 4].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`chip${speed === value ? ' is-on' : ''}`}
                    aria-pressed={speed === value}
                    onClick={() => setSpeed(value)}
                  >
                    {value}×
                  </button>
                ))}
              </div>
            </div>

            {current ? (
              <div className="gp__timing">
                <span className="mono">
                  Leader · <strong>{FIELD[current.order[0]].name}</strong>
                </span>
                <span className="mono">Fastest lap · {fmtLap(result.fastestLap.time)} ({FIELD[result.fastestLap.index].code})</span>
              </div>
            ) : (
              <div className="gp__timing">
                <span className="mono">Starting grid · {FIELD.length} cars</span>
              </div>
            )}
          </div>

          <div className="panel panel__pad gp__chart">
            <p className="mono">Gap to the leader</p>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Chart of each car's gap to the leader by lap">
              {[25, 50, 75].map((line) => (
                <line key={line} x1="0" y1={line} x2="100" y2={line} stroke="rgba(255,255,255,0.08)" strokeWidth="0.4" />
              ))}
              {chart.series.map(({ index, competitor, path }) => {
                const isPlayer = index === playerIndex;
                return (
                  <path
                    key={competitor.id}
                    d={path}
                    fill="none"
                    stroke={TEAM_COLORS[competitor.team]}
                    strokeWidth={isPlayer ? 1.1 : 0.5}
                    strokeOpacity={isPlayer ? 1 : 0.5}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </svg>
            <p className="mono gp__chart-foot">
              {revealed === 0 ? 'Press play to start' : `Lap ${revealed} of ${result.totalLaps}`} · scale 0 –{' '}
              {chart.maxGap.toFixed(0)} s
            </p>
          </div>

          <div className="gp__table-wrap">
            <table className="gp__table">
              <caption className="sr-only">Running order at the current lap</caption>
              <thead>
                <tr>
                  <th scope="col">Pos</th>
                  <th scope="col">Driver</th>
                  <th scope="col" className="gp__col-team">Team</th>
                  <th scope="col">Gap</th>
                  <th scope="col">Int</th>
                  <th scope="col">Tyre</th>
                  <th scope="col">Stops</th>
                </tr>
              </thead>
              <tbody>
                {(current ? current.order : FIELD.map((_, index) => index).sort((a, b) => FIELD[a].grid - FIELD[b].grid)).map(
                  (index) => {
                    const competitor = FIELD[index];
                    const position = current ? current.positions[index] : competitor.grid;
                    const leaderTime = current ? current.cumulative[current.order[0]] : 0;
                    const gap = current ? current.cumulative[index] - leaderTime : 0;
                    const interval = current && position > 1
                      ? current.cumulative[index] - current.cumulative[current.order[position - 2]]
                      : 0;
                    const compound = current ? current.compound[index] : config.startCompound;
                    const age = current ? current.age[index] : 0;
                    const stopped = current ? current.pitted[index] : false;
                    return (
                      <tr key={competitor.id} className={index === playerIndex ? 'is-player' : undefined}>
                        <td className="gp__pos">{position}</td>
                        <td>
                          <span className="gp__code mono">{competitor.code}</span>
                          <span className="gp__name">{competitor.name}</span>
                          {index === playerIndex && <span className="gp__you mono">you</span>}
                        </td>
                        <td className="gp__col-team">{competitor.team}</td>
                        <td className="mono">{position === 1 ? '—' : fmtDelta(gap)}</td>
                        <td className="mono">{position === 1 ? '—' : fmtDelta(interval)}</td>
                        <td>
                          <span className="gp__tyre" style={{ borderColor: COMPOUNDS[compound].color }} title={COMPOUNDS[compound].label}>
                            <span className="gp__tyre-letter mono">{COMPOUNDS[compound].label[0]}</span>
                            <span className="mono">{age}</span>
                          </span>
                          {stopped && <span className="gp__pit mono">pit</span>}
                        </td>
                        <td className="mono">{countStops(result, index, revealed)}</td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
            <p className="sr-only" aria-live="polite">
              {current
                ? `Lap ${revealed}. Leader ${FIELD[current.order[0]].name}. You are ${current.positions[playerIndex] === 1 ? 'leading' : `in position ${current.positions[playerIndex]}`}.`
                : 'Race not started.'}
            </p>
          </div>

          {finished && (
            <div className="panel panel__pad gp__result">
              <p className="mono">
                <Flag size={12} aria-hidden="true" /> Classification
              </p>
              <div className="gp__table-wrap">
                <table className="gp__table">
                  <caption className="sr-only">Final classification</caption>
                  <thead>
                    <tr>
                      <th scope="col">Pos</th>
                      <th scope="col">Driver</th>
                      <th scope="col">Time / gap</th>
                      <th scope="col">Stops</th>
                      <th scope="col">Best lap</th>
                      <th scope="col">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.classification.map((row) => (
                      <tr key={row.competitor.id} className={row.isPlayer ? 'is-player' : undefined}>
                        <td className="gp__pos">{row.position}</td>
                        <td>
                          <span className="gp__code mono">{row.competitor.code}</span>
                          <span className="gp__name">{row.competitor.name}</span>
                        </td>
                        <td className="mono">{row.position === 1 ? fmtDuration(row.total) : fmtDelta(row.gap)}</td>
                        <td className="mono">{row.stops}</td>
                        <td className="mono">{fmtLap(row.bestLap)}</td>
                        <td className="mono">{POINTS[row.position - 1] ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="copy gp__result-foot">
                <Trophy size={13} aria-hidden="true" /> Winner on the road: {result.classification[0].competitor.name}. Best lap{' '}
                {fmtLap(result.fastestLap.time)} on lap {result.fastestLap.lap}.
              </p>
            </div>
          )}
        </div>

        <aside className="gp__side">
          <article className="panel panel__pad">
            <p className="mono">Your car</p>
            <select
              className="gp__select"
              aria-label="Your car"
              value={playerIndex}
              onChange={(event) => patch({ carIndex: Number(event.target.value) })}
            >
              {FIELD.map((competitor, index) => (
                <option key={competitor.id} value={index}>
                  P{competitor.grid} · {competitor.name} ({competitor.code})
                </option>
              ))}
            </select>

            <label className="gp__field">
              <span className="mono">Race distance — {config.laps} laps</span>
              <input
                type="range"
                min={4}
                max={MAX_LAPS}
                value={config.laps}
                onChange={(event) => {
                  const laps = Number(event.target.value);
                  patch({
                    laps,
                    pitLaps: config.pitLaps.map((lap) => clamp(lap, 1, laps - 1)).filter((lap, i, all) => all.indexOf(lap) === i),
                  });
                }}
              />
            </label>

            <div className="gp__field">
              <span className="mono">Start tyre</span>
              <div className="control__row" role="group" aria-label="Start tyre">
                {COMPOUND_ORDER.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={`chip${config.startCompound === id ? ' is-on' : ''}`}
                    aria-pressed={config.startCompound === id}
                    onClick={() => patch({ startCompound: id })}
                  >
                    <span className="gp__dot" style={{ background: COMPOUNDS[id].color }} />
                    {COMPOUNDS[id].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="gp__field">
              <span className="mono">Stops</span>
              <div className="control__row" role="group" aria-label="Number of stops">
                {[0, 1, 2].map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={`chip${stopCount === count ? ' is-on' : ''}`}
                    aria-pressed={stopCount === count}
                    onClick={() => setStops(count)}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {config.pitLaps.map((lap, index) => (
              <label className="gp__field" key={index}>
                <span className="mono">Pit on lap — {lap}</span>
                <input
                  type="range"
                  min={1}
                  max={Math.max(1, config.laps - 1)}
                  value={lap}
                  onChange={(event) => setPitLap(index, Number(event.target.value))}
                />
              </label>
            ))}

            {stopCount > 0 && (
              <div className="gp__field">
                <span className="mono">Tyre at the stop</span>
                <div className="control__row" role="group" aria-label="Tyre fitted at the stop">
                  {COMPOUND_ORDER.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className={`chip${config.stopCompound === id ? ' is-on' : ''}`}
                      aria-pressed={config.stopCompound === id}
                      onClick={() => patch({ stopCompound: id })}
                    >
                      <span className="gp__dot" style={{ background: COMPOUNDS[id].color }} />
                      {COMPOUNDS[id].label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="gp__field">
              <span className="mono">Pace</span>
              <div className="control__row" role="group" aria-label="Pace mode">
                {PACE_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    className={`chip${config.paceMode === mode.id ? ' is-on' : ''}`}
                    aria-pressed={config.paceMode === mode.id}
                    onClick={() => patch({ paceMode: mode.id })}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
              <p className="mono gp__hint">{PACE_MODES.find((mode) => mode.id === config.paceMode)?.blurb}</p>
            </div>

            <div className="row gap-8 wrap">
              <button
                type="button"
                className="btn"
                onClick={() => patch({ seed: (config.seed % 997) + 1 })}
                title="Same strategy, a different variation of the model"
              >
                Re-roll variation
              </button>
              <button type="button" className="btn" onClick={() => setConfig(DEFAULT_CONFIG)}>
                Reset strategy
              </button>
            </div>
          </article>

          <article className="panel panel__pad">
            <p className="mono">Model</p>
            <p className="copy">
              Each car has a reference lap, a fuel effect, a wear curve per compound with a cliff, a pit-lane loss and a
              traffic penalty. Rivals run authored one- or two-stop strategies. No safety cars, no retirements, and the
              two-compound rule is not enforced.
            </p>
          </article>

          <article className="panel panel__pad">
            <p className="mono">What it is not</p>
            <p className="copy">
              Not real timing, not real drivers, not a prediction. The grid, times and traits are an invented
              demonstration dataset, and the model is a browser toy rather than a lap-time simulator.
            </p>
          </article>
        </aside>
      </div>
    </section>
  );
}

/** Pit stops completed by a car after the given number of laps. */
function countStops(result: ReturnType<typeof simulateRace>, index: number, upTo: number): number {
  let stops = 0;
  for (let lap = 0; lap < Math.min(upTo, result.laps.length); lap += 1) {
    if (result.laps[lap].pitted[index]) stops += 1;
  }
  return stops;
}
