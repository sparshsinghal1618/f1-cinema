// Small numeric / time formatting helpers used across the telemetry, timing and
// race-weekend UIs.

export const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const invLerp = (a: number, b: number, v: number): number => (b === a ? 0 : (v - a) / (b - a));

export const damp = (current: number, target: number, lambda: number, dt: number): number =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

export function pad(n: number, len = 2): string {
  return String(Math.floor(Math.abs(n))).padStart(len, '0');
}

/** 1:23.456 — lap / sector time. */
export function fmtLap(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '--:--.---';
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s.toFixed(3).padStart(6, '0')}`;
}

/** mm:ss — plain duration. */
export function fmtClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${pad(m)}:${pad(s)}`;
}

/** h:mm:ss.mmm — race duration. */
export function fmtDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--:--.---';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${pad(m)}:${s.toFixed(3).padStart(6, '0')}`;
}

/** "+1.234" / "-0.512" delta. */
export function fmtDelta(seconds: number): string {
  const sign = seconds >= 0 ? '+' : '-';
  return `${sign}${Math.abs(seconds).toFixed(3)}`;
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export function countdownParts(from: number, to: number): CountdownParts {
  const total = Math.max(0, to - from);
  return {
    total,
    days: Math.floor(total / 86400000),
    hours: Math.floor((total / 3600000) % 24),
    minutes: Math.floor((total / 60000) % 60),
    seconds: Math.floor((total / 1000) % 60),
  };
}

export function fmtTemperature(celsius: number, unit: 'C' | 'F' = 'C'): string {
  const value = unit === 'C' ? celsius : celsius * 1.8 + 32;
  return `${value.toFixed(1)}°${unit}`;
}
