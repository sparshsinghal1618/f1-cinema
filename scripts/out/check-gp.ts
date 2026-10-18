// Verification harness for the Grand Prix model (src/lib/raceSim.ts).
// Bundled with esbuild and run under Node: see scripts/out/check-gp.bundle.mjs.

import { DEFAULT_CONFIG, MAX_LAPS, simulateRace, type RaceConfig } from '../../src/lib/raceSim';

function run(config: RaceConfig) {
  const result = simulateRace(config);
  const finite = result.laps.every(
    (row) => row.lapTime.every(Number.isFinite) && row.cumulative.every(Number.isFinite),
  );
  const winner = result.classification[0];
  const last = result.classification[result.classification.length - 1];
  const gaps = result.classification.map((row) => row.gap);
  return {
    laps: result.totalLaps,
    cars: result.classification.length,
    finite,
    leadChanges: result.leadChanges,
    winner: `${winner.competitor.name} ${winner.total.toFixed(3)}s`,
    last: `${last.competitor.name} +${last.gap.toFixed(3)}s`,
    stops: result.classification.reduce((n, row) => n + row.stops, 0),
    fastest: `${result.fastestLap.time.toFixed(3)}s lap ${result.fastestLap.lap}`,
    winnerBestLap: winner.bestLap.toFixed(3),
    gapsMonotonic: gaps.every((gap, index) => index === 0 || gap >= gaps[index - 1] - 1e-9),
    positionSeats: result.classification.every((row, index) => row.position === index + 1),
    lapOneSlowest: Math.max(...result.laps[0].lapTime).toFixed(3),
    lapTwoSlowest: Math.max(...result.laps[1].lapTime).toFixed(3),
    pitLapsApplied: result.laps.filter((row) => row.pitted.some(Boolean)).map((row) => row.lap),
  };
}

const long: RaceConfig = {
  ...DEFAULT_CONFIG,
  laps: MAX_LAPS,
  carIndex: 3,
  startCompound: 'soft',
  stopCompound: 'hard',
  pitLaps: [14, 30],
  paceMode: 'push',
  seed: 11,
};

const one = run(long);
const two = run({ ...long });
const short = run({ ...DEFAULT_CONFIG, laps: 12, seed: 99 });

console.log(JSON.stringify({ long: one, deterministic: JSON.stringify(one) === JSON.stringify(two), short }, null, 1));
