// Throwaway verification harness for the Grand Prix model. Not shipped.
// Bundled with esbuild because the model is authored in TypeScript.

import { FIELD, DEFAULT_CONFIG, simulateRace, type RaceConfig } from '../../src/lib/raceSim';

const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(3).padStart(6, '0')}`;

function run(label: string, config: RaceConfig) {
  const result = simulateRace(config);
  const player = result.classification.find((row) => row.isPlayer);
  const winner = result.classification[0];
  console.log(`\n== ${label}`);
  console.log(`  laps ${result.totalLaps}  leadChanges ${result.leadChanges}  fastest ${fmt(result.fastestLap.time)} (${FIELD[result.fastestLap.index].code} L${result.fastestLap.lap})`);
  console.log(`  winner ${winner.competitor.name} (${winner.competitor.team}) ${fmt(winner.total)} stops ${winner.stops} best ${fmt(winner.bestLap)}`);
  console.log(`  player P${player.position} gap ${player.position === 1 ? '—' : '+' + player.gap.toFixed(3)} stops ${player.stops} best ${fmt(player.bestLap)}`);
  console.log('  top 5:', result.classification.slice(0, 5).map((r) => `P${r.position} ${r.competitor.code}`).join('  '));
  // Integrity checks
  const bad = result.classification.filter((r) => !Number.isFinite(r.total) || !Number.isFinite(r.bestLap) || r.bestLap <= 0);
  if (bad.length) console.log('  !! non-finite rows', bad.length);
  for (const row of result.laps) {
    if (row.order.length !== FIELD.length) console.log('  !! order length', row.lap);
    const leader = row.cumulative[row.order[0]];
    for (const value of row.cumulative) if (value - leader < -1e-6) console.log('  !! negative gap lap', row.lap);
    for (const t of row.lapTime) if (!Number.isFinite(t) || t <= 0) console.log('  !! bad lap time', row.lap, t);
  }
  return result;
}

const a = run('default (24 laps, medium→hard, stop L12, normal)', DEFAULT_CONFIG);
const b = simulateRace(DEFAULT_CONFIG);
console.log('\ndeterministic:', JSON.stringify(a.classification.map((r) => r.total)) === JSON.stringify(b.classification.map((r) => r.total)));

run('no stops', { ...DEFAULT_CONFIG, pitLaps: [] });
run('two stops', { ...DEFAULT_CONFIG, pitLaps: [8, 16] });
run('soft start, stop L10', { ...DEFAULT_CONFIG, startCompound: 'soft', stopCompound: 'hard', pitLaps: [10] });
run('push pace all race', { ...DEFAULT_CONFIG, paceMode: 'push' });
run('conserve pace all race', { ...DEFAULT_CONFIG, paceMode: 'conserve' });
run('full 44-lap distance', { ...DEFAULT_CONFIG, laps: 44, pitLaps: [15, 31] });
run('sprint 6 laps', { ...DEFAULT_CONFIG, laps: 6, pitLaps: [] });
run('different car (P12 V. Duarte)', { ...DEFAULT_CONFIG, carIndex: 11, pitLaps: [11] });
run('seed re-roll', { ...DEFAULT_CONFIG, seed: 42 });
