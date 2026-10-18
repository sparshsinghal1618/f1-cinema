// Telemetry command-centre model.
//
// A deterministic, scripted lap. Every channel is generated from elapsed time and
// the current scenario — there is no randomness and no network data. All values
// are simulated and labelled as such in the interface.

export interface TelemetryChannel {
  speed: number;
  rpm: number;
  gear: number;
  throttle: number;
  brake: number;
  steer: number;
  /** Per-corner surface temperatures, °C. */
  tyreTemp: [number, number, number, number];
  /** Per-corner wear, 0 (fresh) .. 1 (finished). */
  tyreWear: [number, number, number, number];
  battery: number;
  deploy: number;
  drs: boolean;
  gLat: number;
  gLong: number;
  sector: number;
  lap: number;
  lapTime: number;
  lastLap: number | null;
  bestLap: number | null;
  sectors: (number | null)[];
  progress: number;
}

export type Scenario = 'push' | 'race' | 'manage' | 'cool';

export interface ScenarioSpec {
  id: Scenario;
  label: string;
  blurb: string;
  pace: number;
  tyreStress: number;
  energyUse: number;
}

export const SCENARIOS: ScenarioSpec[] = [
  { id: 'push', label: 'Push lap', blurb: 'Maximum pace, high tyre stress, full deployment.', pace: 1.07, tyreStress: 1.35, energyUse: 1.05 },
  { id: 'race', label: 'Race stint', blurb: 'Representative race pace with normal energy use.', pace: 1, tyreStress: 1, energyUse: 1 },
  { id: 'manage', label: 'Manage', blurb: 'Lift and coast; tyres and energy protected.', pace: 0.9, tyreStress: 0.7, energyUse: 0.78 },
  { id: 'cool', label: 'Cool-down', blurb: 'Low pace, temperatures coming back down.', pace: 0.76, tyreStress: 0.5, energyUse: 0.6 },
];

export const LAP_LENGTH_M = 5793;
const BASE_LAP = 82.4;
/** Sector boundaries as a fraction of the lap. */
const SECTOR_EDGES = [0.25, 0.62, 1];

/** Schematic map nodes, in a 0..100 box. */
export const TELEMETRY_TRACK: [number, number][] = [
  [8, 62], [14, 34], [32, 14], [54, 20], [68, 10], [88, 18], [95, 42],
  [86, 64], [64, 70], [56, 88], [34, 94], [18, 80], [8, 62],
];

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const wrap = (u: number) => ((u % 1) + 1) % 1;

/** Synthetic speed profile for a lap: 0.3 (slowest corner) .. 1 (top speed). */
function speedProfile(u: number): number {
  const corners = [
    { at: 0.06, depth: 0.52, width: 0.05 },
    { at: 0.17, depth: 0.3, width: 0.06 },
    { at: 0.3, depth: 0.6, width: 0.05 },
    { at: 0.42, depth: 0.36, width: 0.05 },
    { at: 0.55, depth: 0.66, width: 0.045 },
    { at: 0.67, depth: 0.32, width: 0.05 },
    { at: 0.79, depth: 0.5, width: 0.05 },
    { at: 0.9, depth: 0.28, width: 0.06 },
  ];
  let value = 1;
  for (const corner of corners) {
    const distance = Math.abs(wrap(u - corner.at + 0.5) - 0.5);
    const reach = corner.width * 3;
    if (distance < reach) {
      const falloff = 1 - distance / reach;
      value -= corner.depth * falloff * falloff * (3 - 2 * falloff);
    }
  }
  return Math.max(0.3, Math.min(1, value));
}

export class TelemetrySim {
  elapsed = 0;
  lapTime = 0;
  lap = 1;
  progress = 0;
  lastLap: number | null = null;
  bestLap: number | null = null;
  sectors: (number | null)[] = [null, null, null];
  scenario: Scenario = 'race';
  wear: [number, number, number, number] = [0, 0, 0, 0];
  battery = 0.9;
  running = false;

  private sector = 0;
  private sectorStart = 0;
  private history: TelemetryChannel[] = [];

  get spec(): ScenarioSpec {
    return SCENARIOS.find((entry) => entry.id === this.scenario) ?? SCENARIOS[1];
  }

  reset(): void {
    this.elapsed = 0;
    this.lapTime = 0;
    this.lap = 1;
    this.progress = 0;
    this.lastLap = null;
    this.bestLap = null;
    this.sectors = [null, null, null];
    this.wear = [0, 0, 0, 0];
    this.battery = 0.9;
    this.sector = 0;
    this.sectorStart = 0;
    this.history = [];
    this.running = false;
  }

  setScenario(scenario: Scenario): void {
    this.scenario = scenario;
  }

  start(): void {
    this.running = true;
  }

  pause(): void {
    this.running = false;
  }

  toggle(): void {
    this.running = !this.running;
  }

  step(dt: number): void {
    if (!this.running) return;
    const spec = this.spec;
    const rate = (1 / BASE_LAP) * spec.pace;
    const from = this.progress;
    const to = from + dt * rate;

    this.elapsed += dt;
    this.lapTime += dt;

    for (const edge of SECTOR_EDGES) {
      if (from < edge && to >= edge) {
        this.sectors[this.sector] = Math.max(1, this.elapsed - this.sectorStart);
        if (edge === 1) {
          const completed = this.lapTime;
          this.lastLap = completed;
          this.bestLap = this.bestLap === null ? completed : Math.min(this.bestLap, completed);
          this.lap += 1;
          this.lapTime = 0;
          // The splits stay on screen once set; the next lap overwrites them as
          // each sector completes, so the third split is never wiped at the line.
          this.sector = 0;
          this.wear = this.wear.map((value) => Math.min(1, value + 0.05 * spec.tyreStress)) as typeof this.wear;
        } else {
          this.sector += 1;
        }
        this.sectorStart = this.elapsed;
      }
    }

    this.progress = wrap(to);

    const channel = this.sample();
    this.battery = clamp01(
      this.battery + channel.brake * 0.2 * dt - channel.throttle * 0.14 * spec.energyUse * dt,
    );
    this.history.push(channel);
    if (this.history.length > 360) this.history.shift();
  }

  sample(): TelemetryChannel {
    const spec = this.spec;
    const u = this.progress;
    const profile = speedProfile(u);
    const ahead = speedProfile(wrap(u + 0.006));
    const behind = speedProfile(wrap(u - 0.006));
    // Normalised longitudinal demand: +1 accelerating hard, -1 braking hard.
    const slope = Math.max(-1, Math.min(1, (ahead - behind) / 0.24));

    const speed = profile * 322 * spec.pace;
    const rpm = 4200 + profile * 10600;
    const gear = Math.max(1, Math.min(8, Math.ceil(profile * 8)));
    const throttle = clamp01(0.32 + slope * 1.3 + profile * 0.25);
    const brake = clamp01(0.05 - slope * 1.5 + (1 - profile) * 0.55);
    const steer = Math.sin(u * Math.PI * 7) * (1 - profile) * 1.2;
    const baseTemp = 86 + spec.tyreStress * 24 + this.wear[0] * 14;

    const tyreTemp: TelemetryChannel['tyreTemp'] = [
      baseTemp + Math.sin(u * 11) * 5,
      baseTemp + Math.cos(u * 9) * 4,
      baseTemp - 7 + Math.sin(u * 8 + 1) * 4,
      baseTemp - 5 + Math.cos(u * 12 + 2) * 4,
    ];

    return {
      speed,
      rpm,
      gear,
      throttle,
      brake,
      steer,
      tyreTemp,
      tyreWear: [...this.wear] as TelemetryChannel['tyreWear'],
      battery: this.battery,
      deploy: throttle * (this.battery > 0.1 ? 1 : 0) * spec.energyUse,
      drs: profile > 0.88,
      gLat: Math.abs(steer) * profile * 4.4,
      gLong: throttle * 1.7 - brake * 4.6,
      sector: this.sector,
      lap: this.lap,
      lapTime: this.lapTime,
      lastLap: this.lastLap,
      bestLap: this.bestLap,
      sectors: this.sectors,
      progress: u,
    };
  }

  get historySlice(): TelemetryChannel[] {
    return this.history;
  }
}

/** Position on the schematic map for a 0..1 lap progress. */
export function mapPosition(progress: number): [number, number] {
  const points = TELEMETRY_TRACK;
  const scaled = wrap(progress) * (points.length - 1);
  const index = Math.min(points.length - 2, Math.floor(scaled));
  const t = scaled - index;
  const a = points[index];
  const b = points[index + 1];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Closed SVG path for the schematic map. */
export function mapPath(): string {
  return `${TELEMETRY_TRACK.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ')} Z`;
}
