// Deterministic multi-car race model for the Grand Prix simulator.
//
// Every value is produced from the demonstration grid in src/data/raceWeekend.ts
// and a fixed seed: the same grid, strategy and seed always produce the same race.
// There is no randomness at runtime (a hash stands in for it) and no live data.
//
// The model is deliberately small: a reference lap time per car, a fuel effect, a
// per-compound wear curve with a cliff, a pit-loss penalty and a simple traffic
// penalty. It is not a lap-time simulation of a real car and does not claim to be.

import { clamp } from './format';
import { DEMO_GRID } from '../data/raceWeekend';

export type Compound = 'soft' | 'medium' | 'hard';
export type PaceMode = 'push' | 'normal' | 'conserve';

export interface CompoundSpec {
  id: Compound;
  label: string;
  /** Lap-time offset on a fresh tyre, relative to the reference compound (medium). */
  offset: number;
  /** Seconds lost per lap of tyre age. */
  degPerLap: number;
  /** Age, in laps, at which the tyre falls off the cliff. */
  life: number;
  color: string;
}

export const COMPOUNDS: Record<Compound, CompoundSpec> = {
  soft: { id: 'soft', label: 'Soft', offset: -0.55, degPerLap: 0.13, life: 15, color: '#e10600' },
  medium: { id: 'medium', label: 'Medium', offset: 0, degPerLap: 0.085, life: 24, color: '#f2c200' },
  hard: { id: 'hard', label: 'Hard', offset: 0.5, degPerLap: 0.058, life: 36, color: '#d9dde3' },
};

export const COMPOUND_ORDER: Compound[] = ['soft', 'medium', 'hard'];

export interface PaceSpec {
  id: PaceMode;
  label: string;
  blurb: string;
  /** Lap-time change against the driver's normal pace. */
  offset: number;
  /** Multiplier on tyre wear. */
  wear: number;
}

export const PACE_MODES: PaceSpec[] = [
  { id: 'push', label: 'Push', blurb: 'Faster laps, tyres take a beating.', offset: -0.28, wear: 1.4 },
  { id: 'normal', label: 'Normal', blurb: 'Balanced pace and tyre life.', offset: 0, wear: 1 },
  { id: 'conserve', label: 'Conserve', blurb: 'Lift and coast to make a stint last.', offset: 0.36, wear: 0.72 },
];

export interface Competitor {
  id: string;
  code: string;
  name: string;
  team: string;
  /** Starting position, 1..12. */
  grid: number;
  /** Reference lap time in seconds, from the demonstration grid. */
  quali: number;
  /** Race-pace offset against qualifying (negative is faster). */
  racePace: number;
  /** Tyre-wear multiplier. */
  wearRate: number;
  /** Total pit-lane loss in seconds for a stop. */
  pitTime: number;
  /** 0..1; higher means smoother lap-to-lap times. */
  consistency: number;
  /** 0..1; higher means less time lost in traffic. */
  aggression: number;
}

/**
 * Authored demonstration traits. These are invented for the fictional grid and
 * are not measurements of any real driver.
 */
const TRAITS: Record<string, Omit<Competitor, 'id' | 'code' | 'name' | 'team' | 'grid' | 'quali'>> = {
  'R. Halden': { racePace: -0.14, wearRate: 0.97, pitTime: 20.4, consistency: 0.84, aggression: 0.9 },
  'M. Okonjo': { racePace: -0.05, wearRate: 0.99, pitTime: 20.6, consistency: 0.8, aggression: 0.82 },
  'T. Serra': { racePace: -0.08, wearRate: 1.02, pitTime: 20.9, consistency: 0.74, aggression: 0.86 },
  'K. Lindqvist': { racePace: 0.04, wearRate: 1.01, pitTime: 20.5, consistency: 0.78, aggression: 0.8 },
  'D. Moreau': { racePace: 0.12, wearRate: 0.96, pitTime: 20.7, consistency: 0.7, aggression: 0.6 },
  'S. Aalto': { racePace: -0.02, wearRate: 1.05, pitTime: 21.1, consistency: 0.66, aggression: 0.88 },
  'P. Vasilev': { racePace: 0.18, wearRate: 1.03, pitTime: 20.8, consistency: 0.62, aggression: 0.58 },
  'L. Ferrand': { racePace: 0.06, wearRate: 0.98, pitTime: 20.6, consistency: 0.72, aggression: 0.7 },
  'J. Beaulieu': { racePace: 0.2, wearRate: 1.04, pitTime: 21.2, consistency: 0.58, aggression: 0.64 },
  'A. Kowalczyk': { racePace: 0.1, wearRate: 1.0, pitTime: 20.9, consistency: 0.64, aggression: 0.66 },
  'E. Nakamura': { racePace: 0.02, wearRate: 1.06, pitTime: 21.0, consistency: 0.6, aggression: 0.74 },
  'V. Duarte': { racePace: 0.16, wearRate: 1.02, pitTime: 21.3, consistency: 0.56, aggression: 0.6 },
};

const FALLBACK_TRAIT = TRAITS['R. Halden'];

/** Lap / sector string ("1:41.882") to seconds. */
function parseLap(text: string): number {
  const [minutes, seconds] = text.split(':');
  return Number(minutes) * 60 + Number(seconds);
}

/** 0..1 hash of three integers. Order-independent, so results never depend on iteration order. */
function hashUnit(seed: number, a: number, b: number): number {
  let h = seed >>> 0;
  h = (h ^ Math.imul(a + 0x9e3779b9, 0x85ebca6b)) >>> 0;
  h = (h ^ Math.imul(b + 0x165667b1, 0xc2b2ae35)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2545f491) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  return h / 4294967296;
}

export const FIELD: Competitor[] = DEMO_GRID.map((entry) => {
  const trait = TRAITS[entry.name] ?? FALLBACK_TRAIT;
  return {
    id: `${entry.code}-${entry.position}`,
    code: entry.code,
    name: entry.name,
    team: entry.team,
    grid: entry.position,
    quali: parseLap(entry.time),
    ...trait,
  };
});

export const MAX_LAPS = 44;
const FUEL_PER_LAP = 0.055;
/** Extra time on lap one for the standing start. */
const LAUNCH_LOSS = 0.7;

export interface RaceConfig {
  laps: number;
  /** The competitor the player's strategy applies to (index into FIELD). */
  carIndex: number;
  /** Tyre fitted for the start. */
  startCompound: Compound;
  /** Tyre fitted at each stop. */
  stopCompound: Compound;
  /** Laps after which the car pits. Sorted, de-duplicated and clamped by the model. */
  pitLaps: number[];
  paceMode: PaceMode;
  seed: number;
}

export const DEFAULT_CONFIG: RaceConfig = {
  laps: 24,
  carIndex: 0,
  startCompound: 'medium',
  stopCompound: 'hard',
  pitLaps: [12],
  paceMode: 'normal',
  seed: 7,
};

interface Plan {
  compounds: Compound[];
  pitLaps: number[];
}

function rivalCompound(index: number, salt: number): Compound {
  return COMPOUND_ORDER[Math.floor(hashUnit(0x51ed, index, salt) * 3) % 3];
}

/** Authored, deterministic strategy for a rival: one or two stops, tyres to suit. */
function planForRival(competitor: Competitor, laps: number, index: number): Plan {
  if (laps <= 12) {
    return { compounds: [rivalCompound(index, 1)], pitLaps: [] };
  }
  if (laps <= 30) {
    const pit = clamp(Math.round(laps * (0.45 + hashUnit(0x9e37, index, 2) * 0.16)), 4, laps - 3);
    return { compounds: [rivalCompound(index, 3), rivalCompound(index, 4)], pitLaps: [pit] };
  }
  const first = clamp(Math.round(laps * (0.28 + hashUnit(0x9e37, index, 5) * 0.1)), 3, laps - 8);
  const second = clamp(Math.round(laps * (0.64 + hashUnit(0x9e37, index, 6) * 0.12)), first + 4, laps - 2);
  return { compounds: [rivalCompound(index, 7), rivalCompound(index, 8), 'medium'], pitLaps: [first, second] };
}

export interface LapRow {
  lap: number;
  /** Competitor indices in running order. */
  order: number[];
  /** 1-based position per competitor index. */
  positions: number[];
  /** Cumulative race time per competitor index. */
  cumulative: number[];
  /** Lap time per competitor index. */
  lapTime: number[];
  /** Compound used on this lap per competitor index. */
  compound: Compound[];
  /** Tyre age in laps at the start of this lap, per competitor index. */
  age: number[];
  /** Whether the car pitted at the end of this lap, per competitor index. */
  pitted: boolean[];
}

export interface ClassificationRow {
  position: number;
  competitor: Competitor;
  /** Total race time in seconds. */
  total: number;
  /** Seconds behind the winner. */
  gap: number;
  stops: number;
  bestLap: number;
  bestLapNumber: number;
  isPlayer: boolean;
}

export interface RaceResult {
  laps: LapRow[];
  classification: ClassificationRow[];
  fastestLap: { index: number; time: number; lap: number };
  leadChanges: number;
  totalLaps: number;
}

export function simulateRace(config: RaceConfig): RaceResult {
  const laps = clamp(Math.round(config.laps), 1, MAX_LAPS);
  const n = FIELD.length;
  const playerIndex = clamp(Math.round(config.carIndex), 0, n - 1);
  const mode = PACE_MODES.find((entry) => entry.id === config.paceMode) ?? PACE_MODES[1];

  const playerPits = [...new Set(config.pitLaps.map((lap) => Math.round(lap)))]
    .filter((lap) => lap >= 1 && lap < laps)
    .sort((a, b) => a - b)
    .slice(0, 2);

  const plans: Plan[] = FIELD.map((competitor, index) =>
    index === playerIndex
      ? { compounds: [config.startCompound, config.stopCompound, config.stopCompound], pitLaps: playerPits }
      : planForRival(competitor, laps, index),
  );

  const cumulative = new Array<number>(n).fill(0);
  const compound: Compound[] = plans.map((plan) => plan.compounds[0]);
  const age = new Array<number>(n).fill(0);
  const stops = new Array<number>(n).fill(0);
  const bestLap = new Array<number>(n).fill(Infinity);
  const bestLapNumber = new Array<number>(n).fill(0);

  const rows: LapRow[] = [];
  let leadChanges = 0;
  let previousLeader = -1;
  let fastestLap = { index: 0, time: Infinity, lap: 0 };

  for (let lap = 1; lap <= laps; lap += 1) {
    const lapTime = new Array<number>(n).fill(0);
    const lapCompound: Compound[] = new Array<Compound>(n);
    const lapAge = new Array<number>(n).fill(0);
    const pitted = new Array<boolean>(n).fill(false);

    for (let i = 0; i < n; i += 1) {
      const competitor = FIELD[i];
      const spec = COMPOUNDS[compound[i]];
      const isPlayer = i === playerIndex;
      const tyreAge = age[i];
      const wearMultiplier = (isPlayer ? mode.wear : 1) * competitor.wearRate;
      const degradation = spec.degPerLap * tyreAge * wearMultiplier;
      const cliff = tyreAge > spec.life ? (tyreAge - spec.life) ** 2 * 0.09 * wearMultiplier : 0;
      const fuel = (laps - lap + 1) * FUEL_PER_LAP;
      const noise = (hashUnit(config.seed, i, lap) - 0.5) * (1 - competitor.consistency) * 0.7;
      lapTime[i] =
        competitor.quali +
        competitor.racePace +
        spec.offset +
        fuel +
        degradation +
        cliff +
        (lap === 1 ? LAUNCH_LOSS : 0) +
        (isPlayer ? mode.offset : 0) +
        noise;
      lapCompound[i] = compound[i];
      lapAge[i] = tyreAge;
    }

    // Traffic: a car stuck within 1.5 s of the car ahead loses time unless it is
    // aggressive enough to follow closely.
    const projected = Array.from({ length: n }, (_, i) => i).sort(
      (a, b) => cumulative[a] + lapTime[a] - (cumulative[b] + lapTime[b]),
    );
    for (let k = 1; k < n; k += 1) {
      const behind = projected[k];
      const ahead = projected[k - 1];
      const gap = cumulative[behind] + lapTime[behind] - (cumulative[ahead] + lapTime[ahead]);
      if (gap < 1.5) {
        lapTime[behind] += (1.5 - gap) * (1 - FIELD[behind].aggression) * 0.3;
      }
    }

    // Pit stops happen at the end of the lap.
    for (let i = 0; i < n; i += 1) {
      if (plans[i].pitLaps.includes(lap)) {
        lapTime[i] += FIELD[i].pitTime;
        pitted[i] = true;
      }
    }

    for (let i = 0; i < n; i += 1) {
      cumulative[i] += lapTime[i];
      if (lapTime[i] < bestLap[i]) {
        bestLap[i] = lapTime[i];
        bestLapNumber[i] = lap;
      }
      if (lapTime[i] < fastestLap.time) fastestLap = { index: i, time: lapTime[i], lap };
    }

    const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => cumulative[a] - cumulative[b]);
    const positions = new Array<number>(n).fill(0);
    order.forEach((carIndex, position) => {
      positions[carIndex] = position + 1;
    });

    rows.push({
      lap,
      order,
      positions,
      cumulative: [...cumulative],
      lapTime,
      compound: lapCompound,
      age: lapAge,
      pitted,
    });

    if (order[0] !== previousLeader) {
      if (previousLeader !== -1) leadChanges += 1;
      previousLeader = order[0];
    }

    // Fresh tyres take effect on the next lap.
    for (let i = 0; i < n; i += 1) {
      if (pitted[i]) {
        stops[i] += 1;
        compound[i] = plans[i].compounds[Math.min(stops[i], plans[i].compounds.length - 1)];
        age[i] = 0;
      } else {
        age[i] += 1;
      }
    }
  }

  const finalOrder = rows[rows.length - 1]?.order ?? Array.from({ length: n }, (_, i) => i);
  const winner = cumulative[finalOrder[0]];
  const classification: ClassificationRow[] = finalOrder.map((i, position) => ({
    position: position + 1,
    competitor: FIELD[i],
    total: position === 0 ? cumulative[i] : cumulative[i] - winner,
    gap: cumulative[i] - winner,
    stops: stops[i],
    bestLap: bestLap[i],
    bestLapNumber: bestLapNumber[i],
    isPlayer: i === playerIndex,
  }));

  return { laps: rows, classification, fastestLap, leadChanges, totalLaps: laps };
}
