// Race-weekend data.
//
// IMPORTANT: this is a clearly labelled demonstration dataset. No real event date,
// session time, grid position or result is claimed anywhere. `NEXT_EVENT` is a
// configured timestamp used purely to demonstrate a real, live countdown; point it
// at a verified date (from an official calendar) and the UI reflects that instead.

export interface Session {
  id: string;
  name: string;
  short: string;
  weekday: string;
  time: string;
  duration: string;
  note: string;
}

export interface WeekendPlan {
  id: string;
  title: string;
  circuitId: string;
  format: 'standard' | 'sprint';
  dataset: 'demonstration';
  sessions: Session[];
}

export const WEEKEND: WeekendPlan = {
  id: 'f1-demo-weekend',
  title: 'F1 — Demonstration Weekend',
  circuitId: 'spa',
  format: 'standard',
  dataset: 'demonstration',
  sessions: [
    { id: 'fp1', name: 'Free Practice 1', short: 'FP1', weekday: 'Friday', time: '13:30', duration: '60 min', note: 'Install and aero correlation.' },
    { id: 'fp2', name: 'Free Practice 2', short: 'FP2', weekday: 'Friday', time: '17:00', duration: '60 min', note: 'Race-fuel simulation.' },
    { id: 'fp3', name: 'Free Practice 3', short: 'FP3', weekday: 'Saturday', time: '12:30', duration: '60 min', note: 'Qualifying preparation.' },
    { id: 'quali', name: 'Qualifying', short: 'Q', weekday: 'Saturday', time: '16:00', duration: '60 min', note: 'Three segments, Q1 to Q3.' },
    { id: 'race', name: 'Grand Prix', short: 'R', weekday: 'Sunday', time: '15:00', duration: '44 laps', note: 'Two mandatory compounds.' },
  ],
};

/**
 * The configured countdown target. This is a demonstration timestamp for the
 * fictional demonstration weekend; the countdown itself uses real elapsed time and
 * switches to a "concluded" state once the timestamp passes.
 */
export const NEXT_EVENT = {
  title: 'F1 — Demonstration Grand Prix',
  dateISO: '2026-12-06T14:00:00.000Z',
  timezoneNote: 'Configured demonstration timestamp (UTC). Not a real event.',
  verified: false,
} as const;

export interface Conditions {
  label: string;
  airTempC: number;
  trackTempC: number;
  humidity: number;
  windKph: number;
  windDir: string;
  rainChance: number;
  trackState: 'Dry' | 'Damp' | 'Wet' | 'Drying';
}

/** Fixed simulated weather model for the demonstration weekend. */
export const CONDITIONS: Conditions = {
  label: 'Simulated conditions',
  airTempC: 18.4,
  trackTempC: 27.9,
  humidity: 68,
  windKph: 12,
  windDir: 'SW',
  rainChance: 34,
  trackState: 'Dry',
};

export interface GridEntry {
  position: number;
  code: string;
  name: string;
  team: string;
  time: string;
  gap: string;
}

/**
 * A fictional starting grid for the demonstration weekend. None of these
 * competitors, teams or lap times correspond to real people or real sessions.
 */
export const DEMO_GRID: GridEntry[] = [
  { position: 1, code: 'F1C', name: 'R. Halden', team: 'F1 Concept', time: '1:41.882', gap: '—' },
  { position: 2, code: 'VTX', name: 'M. Okonjo', team: 'Vertex Motorsport', time: '1:41.997', gap: '+0.115' },
  { position: 3, code: 'F1C', name: 'T. Serra', team: 'F1 Concept', time: '1:42.104', gap: '+0.222' },
  { position: 4, code: 'HRZ', name: 'K. Lindqvist', team: 'Horizon Dynamics', time: '1:42.268', gap: '+0.386' },
  { position: 5, code: 'VTX', name: 'D. Moreau', team: 'Vertex Motorsport', time: '1:42.301', gap: '+0.419' },
  { position: 6, code: 'NOR', name: 'S. Aalto', team: 'Northwind Racing', time: '1:42.446', gap: '+0.564' },
  { position: 7, code: 'HRZ', name: 'P. Vasilev', team: 'Horizon Dynamics', time: '1:42.512', gap: '+0.630' },
  { position: 8, code: 'MER', name: 'L. Ferrand', team: 'Meridian Works', time: '1:42.700', gap: '+0.818' },
  { position: 9, code: 'NOR', name: 'J. Beaulieu', team: 'Northwind Racing', time: '1:42.744', gap: '+0.862' },
  { position: 10, code: 'MER', name: 'A. Kowalczyk', team: 'Meridian Works', time: '1:42.918', gap: '+1.036' },
  { position: 11, code: 'CRB', name: 'E. Nakamura', team: 'Carbon Union', time: '1:43.002', gap: '+1.120' },
  { position: 12, code: 'CRB', name: 'V. Duarte', team: 'Carbon Union', time: '1:43.145', gap: '+1.263' },
];

export interface DemoResult {
  position: number;
  name: string;
  team: string;
  time: string;
  points: number;
  note: string;
}

/** Fictional classification used by the results panel. Also demonstration data. */
export const DEMO_RESULTS: DemoResult[] = DEMO_GRID.slice(0, 8).map((entry, index) => ({
  position: index + 1,
  name: entry.name,
  team: entry.team,
  time: index === 0 ? '1:24:07.318' : `+${(index * 4.318 + 1.204).toFixed(3)}`,
  points: [25, 18, 15, 12, 10, 8, 6, 4][index] ?? 0,
  note: index === 0 ? 'Fastest lap: 1:44.902' : '',
}));

export const WEEKEND_NOTE =
  'Demonstration dataset: sessions, grid and classification are fictional and exist to exercise the interface. Only the countdown clock uses real elapsed time.';
