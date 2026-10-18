// Site-wide configuration: navigation map, brand strings and the honest
// disclaimer copy reused in the footer, hero and simulation panels.

export interface NavItem {
  id: string;
  label: string;
  index: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'showcase', label: 'The Car', index: '01' },
  { id: 'laboratory', label: 'Laboratory', index: '02' },
  { id: 'race', label: 'Race', index: '03' },
  { id: 'grandprix', label: 'Grand Prix', index: '04' },
  { id: 'telemetry', label: 'Telemetry', index: '05' },
  { id: 'circuits', label: 'Circuits', index: '06' },
  { id: 'weekend', label: 'Weekend', index: '07' },
  { id: 'history', label: 'History', index: '08' },
  { id: 'drivers', label: 'Drivers', index: '09' },
  { id: 'pitstops', label: 'Pit Stops', index: '10' },
  { id: 'gallery', label: 'Gallery', index: '11' },
];

export const BRAND = {
  name: 'F1',
  edition: 'Ultimate Cinema Edition',
  tagline: 'Engineered beyond the limit.',
  intro: ['Aerodynamics', 'Telemetry', 'Powertrain', 'Race Systems'],
};

export const DISCLAIMER =
  'This is an unofficial, non-commercial fan and design project. It is not associated with Formula 1, the FIA, any racing team, driver or sponsor, and the logo is an original mark drawn for this project.';

export const DATA_NOTE =
  'Circuit and driver figures come from the linked Wikipedia infoboxes; every simulation on this site is a browser model, not a live data feed.';

export const SIM_NOTE =
  'Simulated values. This is a deterministic browser model for demonstration — it is not official telemetry and has no live data connection.';

export const CONCEPT_NOTE =
  'Concept figures for a fictional car, defined for this project. Not measured manufacturer data.';
