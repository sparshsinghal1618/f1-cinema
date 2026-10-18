// Race simulation for the browser game.
//
// A lightweight arcade model, not a vehicle dynamics package: a kinematic bicycle
// steering model, a single longitudinal force balance, and a grip ceiling that
// produces understeer rather than spins. It steps on a fixed 1/120 s timestep so
// the same input always produces the same lap, and it owns the centreline the
// renderer draws so physics and graphics can never disagree about the track.

import * as THREE from 'three';

/* ------------------------------------------------------------------- track */

/** Closed circuit control points in metres, on the ground plane. */
export const TRACK_CONTROL: [number, number][] = [
  [-150, -96],
  [-30, -128],
  [96, -120],
  [186, -74],
  [214, 6],
  [186, 84],
  [104, 128],
  [12, 112],
  [-24, 70],
  [-84, 78],
  [-152, 44],
  [-186, -28],
];

export const TRACK_WIDTH = 12;
export const TRACK_HALF = TRACK_WIDTH / 2;
/** Distance from the track edge to the barrier. */
export const RUNOFF = 3.4;
export const TOTAL_LAPS = 3;

export function trackCurve(): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(
    TRACK_CONTROL.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    true,
    'catmullrom',
    0.5,
  );
}

export interface TrackSamples {
  points: THREE.Vector3[];
  tangents: THREE.Vector3[];
  /** Unit lateral vector at each sample (90° left of the tangent). */
  normals: THREE.Vector3[];
  length: number;
}

export function sampleTrack(segments: number): TrackSamples {
  const curve = trackCurve();
  const points: THREE.Vector3[] = [];
  const tangents: THREE.Vector3[] = [];
  const normals: THREE.Vector3[] = [];
  for (let i = 0; i < segments; i += 1) {
    const u = i / segments;
    const point = curve.getPointAt(u);
    const tangent = curve.getTangentAt(u).normalize();
    points.push(point);
    tangents.push(tangent);
    normals.push(new THREE.Vector3(tangent.z, 0, -tangent.x));
  }
  return { points, tangents, normals, length: curve.getLength() };
}

/* ------------------------------------------------------------------ physics */

export interface SimInput {
  throttle: number;
  brake: number;
  steer: number;
  handbrake: boolean;
}

export interface SimCar {
  x: number;
  z: number;
  yaw: number;
  speed: number;
  steer: number;
  gear: number;
  rpm: number;
  wheelSpin: number;
  brakeGlow: number;
  offTrack: boolean;
  impact: number;
}

export interface SimTiming {
  lap: number;
  lapTime: number;
  lastLap: number | null;
  bestLap: number | null;
  laps: number[];
  sector: number;
  sectors: (number | null)[];
  sectorStart: number;
}

export type SimPhase = 'idle' | 'running' | 'paused' | 'finished';

const MASS = 800;
const MAX_FORCE = 13600;
const TOP_SPEED = 88;
const DRAG = 1.72;
const ROLLING = 14;
const BRAKE_FORCE = 24000;
const WHEELBASE = 3.3;
const MAX_STEER = 0.5;
const STEER_RATE = 4.2;
const GRIP = 1.62;
const WHEEL_RADIUS = 0.35;

/** Speed at the top of each gear, m/s. */
const GEAR_TOP = [13, 23, 34, 46, 58, 70, 81, 92];

export class RaceSim {
  readonly segments = 900;
  readonly track: TrackSamples;
  readonly input: SimInput = { throttle: 0, brake: 0, steer: 0, handbrake: false };

  phase: SimPhase = 'idle';
  car: SimCar;
  timing: SimTiming;
  elapsed = 0;

  /** Odometer in samples, unwrapped so laps can be counted without ambiguity. */
  private progress = 0;
  private nearest = 0;
  private accumulator = 0;
  private readonly stepSize = 1 / 120;
  private finishLogged = false;

  constructor() {
    this.track = sampleTrack(this.segments);
    this.car = this.spawn();
    this.timing = this.emptyTiming();
  }

  private spawn(): SimCar {
    const point = this.track.points[0];
    const tangent = this.track.tangents[0];
    return {
      x: point.x,
      z: point.z,
      yaw: Math.atan2(-tangent.z, tangent.x),
      speed: 0,
      steer: 0,
      gear: 1,
      rpm: 0,
      wheelSpin: 0,
      brakeGlow: 0,
      offTrack: false,
      impact: 0,
    };
  }

  private emptyTiming(): SimTiming {
    return {
      lap: 1,
      lapTime: 0,
      lastLap: null,
      bestLap: null,
      laps: [],
      sector: 0,
      sectors: [null, null, null],
      sectorStart: 0,
    };
  }

  get finished(): boolean {
    return this.phase === 'finished';
  }

  start(): void {
    this.reset();
    this.phase = 'running';
  }

  pause(): void {
    if (this.phase === 'running') this.phase = 'paused';
  }

  resume(): void {
    if (this.phase === 'paused') this.phase = 'running';
  }

  togglePause(): void {
    if (this.phase === 'running') this.pause();
    else if (this.phase === 'paused') this.resume();
  }

  reset(): void {
    this.car = this.spawn();
    this.timing = this.emptyTiming();
    this.elapsed = 0;
    this.progress = 0;
    this.nearest = 0;
    this.accumulator = 0;
    this.finishLogged = false;
    this.phase = 'idle';
    this.input.throttle = 0;
    this.input.brake = 0;
    this.input.steer = 0;
    this.input.handbrake = false;
  }

  /** Advances by a real frame delta, consuming it in fixed steps. */
  advance(delta: number): void {
    if (this.phase !== 'running') return;
    this.accumulator = Math.min(0.25, this.accumulator + Math.max(0, delta));
    while (this.accumulator >= this.stepSize) {
      this.accumulator -= this.stepSize;
      this.step(this.stepSize);
    }
  }

  private step(dt: number): void {
    const car = this.car;
    const input = this.input;

    this.elapsed += dt;
    this.timing.lapTime += dt;

    // Steering: rate-limited toward the input, with the maximum angle falling
    // away as speed rises so the car is not twitchy at 250 km/h.
    const maxSteer = MAX_STEER / (1 + Math.abs(car.speed) / 24);
    const target = input.steer * maxSteer;
    const limit = STEER_RATE * dt;
    car.steer += Math.max(-limit, Math.min(limit, target - car.steer));

    // Longitudinal balance.
    const reversing = input.throttle < 0.08 && input.brake > 0.5 && car.speed < 0.6;
    if (reversing) {
      car.speed = Math.max(-8, car.speed - 9 * dt);
    } else {
      const engine = input.throttle * MAX_FORCE * Math.max(0, 1 - Math.abs(car.speed) / TOP_SPEED);
      const resist = DRAG * car.speed * car.speed + ROLLING * Math.abs(car.speed);
      const braking = (input.brake + (input.handbrake ? 0.35 : 0)) * BRAKE_FORCE;
      const direction = Math.sign(car.speed) || 1;
      const surfaceDrag = car.offTrack ? resist * 2.6 : resist;
      let force = engine - direction * surfaceDrag - direction * Math.min(braking, 900 + Math.abs(car.speed) * 900);
      if (Math.abs(car.speed) < 0.5 && input.throttle < 0.05 && input.brake < 0.05) {
        car.speed = 0;
        force = 0;
      }
      car.speed += (force / MASS) * dt;
      car.speed = Math.max(-9, Math.min(TOP_SPEED + 4, car.speed));
    }

    // Yaw: kinematic bicycle model, then a lateral grip ceiling. Beyond the
    // ceiling the car simply stops turning more (understeer) instead of spinning.
    let yawRate = (car.speed / WHEELBASE) * Math.tan(car.steer);
    const gripLimit = GRIP * 9.81 * (car.offTrack ? 0.55 : 1) * (input.handbrake ? 0.72 : 1);
    const lateral = Math.abs(car.speed * yawRate);
    if (lateral > gripLimit) {
      yawRate = Math.sign(yawRate) * (gripLimit / Math.max(0.4, Math.abs(car.speed)));
    }
    car.yaw += yawRate * dt;

    car.x += Math.cos(car.yaw) * car.speed * dt;
    car.z += -Math.sin(car.yaw) * car.speed * dt;

    this.resolveTrack(dt);

    // Derived readouts.
    car.wheelSpin = car.speed / WHEEL_RADIUS;
    const gearIndex = GEAR_TOP.findIndex((top) => Math.abs(car.speed) <= top);
    car.gear = car.speed < -0.5 ? 0 : gearIndex === -1 ? GEAR_TOP.length : gearIndex + 1;
    const lower = car.gear > 1 ? GEAR_TOP[car.gear - 2] : 0;
    const upper = car.gear >= 1 && car.gear <= GEAR_TOP.length ? GEAR_TOP[car.gear - 1] : TOP_SPEED;
    const span = Math.max(4, upper - lower);
    car.rpm =
      car.speed < -0.5
        ? Math.abs(car.speed) * 700
        : 4200 + Math.max(0, Math.min(1, (Math.abs(car.speed) - lower) / span)) * 10500;
    car.brakeGlow = Math.max(input.brake, input.handbrake ? 0.6 : 0, car.offTrack ? 0.15 : 0) * 0.9;
    car.impact = Math.max(0, car.impact - dt * 2.2);
  }

  /** Keeps the car on the ribbon, applies off-track drag and barrier impacts. */
  private resolveTrack(dt: number): void {
    const car = this.car;
    const count = this.segments;
    const { points, normals } = this.track;

    // Local search around the previous nearest sample; a full sweep only if the
    // window somehow loses the car.
    let best = this.nearest;
    let bestDistance = Infinity;
    const search = (from: number, to: number) => {
      for (let i = from; i < to; i += 1) {
        const index = ((i % count) + count) % count;
        const dx = car.x - points[index].x;
        const dz = car.z - points[index].z;
        const distance = dx * dx + dz * dz;
        if (distance < bestDistance) {
          bestDistance = distance;
          best = index;
        }
      }
    };
    search(this.nearest - 30, this.nearest + 30);
    if (Math.sqrt(bestDistance) > 40) {
      bestDistance = Infinity;
      search(0, count);
    }

    const point = points[best];
    const normal = normals[best];
    const lateral = (car.x - point.x) * normal.x + (car.z - point.z) * normal.z;
    const overshoot = Math.abs(lateral) - TRACK_HALF;

    car.offTrack = overshoot > 0.35;

    if (overshoot > 0) {
      // Extra rolling resistance on the grass / kerbs.
      car.speed *= 1 - Math.min(0.5, 1.1 * dt);
    }

    if (overshoot > RUNOFF) {
      const limit = TRACK_HALF + RUNOFF;
      const push = Math.sign(lateral) * limit;
      car.x = point.x + normal.x * push;
      car.z = point.z + normal.z * push;
      // Barrier scrub is scaled by dt so the penalty is frame-rate independent:
      // a graze costs a little, a sustained scrape costs a lot, but a single
      // contact step must never stop the car dead.
      car.speed *= 1 - Math.min(0.3, 5 * dt);
      car.impact = 1;
    }

    // Lap odometer: unwrap the index delta so crossings are unambiguous.
    let delta = best - this.nearest;
    if (delta > count / 2) delta -= count;
    if (delta < -count / 2) delta += count;
    if (Math.abs(delta) < 40) this.progress += delta;
    this.nearest = best;

    const completed = Math.floor(this.progress / count) + 1;
    if (completed > this.timing.lap && this.timing.lap <= TOTAL_LAPS) {
      const lap = this.timing.lapTime;
      this.timing.laps.push(lap);
      this.timing.lastLap = lap;
      this.timing.bestLap = this.timing.bestLap === null ? lap : Math.min(this.timing.bestLap, lap);
      this.timing.lap = completed;
      this.timing.lapTime = 0;

      if (completed > TOTAL_LAPS) {
        this.phase = 'finished';
      }
    }

    // Sector splits across the lap. Every transition records the sector that
    // just ended, including the 2 -> 0 crossing at the line, so all three splits
    // fill in. Splits stay on screen until the next lap overwrites them.
    const withinLap = ((this.progress % count) + count) % count / count;
    const sector = withinLap < 1 / 3 ? 0 : withinLap < 2 / 3 ? 1 : 2;
    if (sector !== this.timing.sector) {
      this.timing.sectors[this.timing.sector] = this.elapsed - this.timing.sectorStart;
      this.timing.sector = sector;
      this.timing.sectorStart = this.elapsed;
    }
  }

  /** 0..1 position around the lap, for the track map. */
  get lapProgress(): number {
    const count = this.segments;
    return ((this.progress % count) + count) % count / count;
  }
}
