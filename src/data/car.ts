// Configuration for the procedural F1 single-seater: part registry, viewer
// camera presets, hotspot annotations, livery parameters, environment presets and
// the nine-step scroll story.
//
// The car does not exist in the real world, so every performance figure below is
// explicitly a concept value chosen for this fictional design (see CONCEPT_NOTE).

import { CONCEPT_NOTE } from './site';

export { CONCEPT_NOTE };

export type PartId =
  | 'monocoque'
  | 'nose'
  | 'frontWing'
  | 'rearWing'
  | 'floor'
  | 'diffuser'
  | 'sidepod'
  | 'engineCover'
  | 'halo'
  | 'cockpit'
  | 'coolingInlet'
  | 'brakes'
  | 'suspensionFront'
  | 'suspensionRear'
  | 'wheelFL'
  | 'wheelFR'
  | 'wheelRL'
  | 'wheelRR';

/** Overall dimensions of the procedural model, in metres. */
export const CAR_DIMS = {
  length: 5.6,
  width: 2.0,
  height: 1.05,
  wheelbase: 3.3,
  frontTrack: 1.6,
  rearTrack: 1.55,
  frontWheelRadius: 0.33,
  rearWheelRadius: 0.36,
  frontTyreWidth: 0.305,
  rearTyreWidth: 0.405,
  noseTipX: 2.75,
  frontAxleX: 1.65,
  rearAxleX: -1.65,
  tailX: -2.7,
} as const;

export interface LabComponent {
  id: PartId;
  name: string;
  group: 'Aerodynamics' | 'Chassis' | 'Powertrain' | 'Running gear';
  summary: string;
  detail: string;
  metrics: { label: string; value: string }[];
  diagram?: string;
  /** Suggested camera for the focused view: azimuth/elevation in degrees, distance in metres. */
  view: { azimuth: number; elevation: number; distance: number };
}

export const LAB_COMPONENTS: LabComponent[] = [
  {
    id: 'frontWing',
    name: 'Front Wing',
    group: 'Aerodynamics',
    summary: 'The first surface to meet the air, and the most sensitive to ride height.',
    detail:
      'In this concept layout the front wing runs a multi-element main plane with a powered flap, endplates that turn the tip vortex outward, and a pair of turning vanes feeding the floor edge. Front-wing balance shifts the aero centre of pressure, which is why teams adjust flap angle to tune understeer.',
    metrics: [
      { label: 'Elements', value: '4 + flap' },
      { label: 'Span', value: '2.00 m' },
      { label: 'Concept downforce share', value: '~26%' },
    ],
    diagram: 'cars-0',
    view: { azimuth: 34, elevation: 14, distance: 2.6 },
  },
  {
    id: 'rearWing',
    name: 'Rear Wing',
    group: 'Aerodynamics',
    summary: 'The main downforce generator, and the biggest single drag lever on the car.',
    detail:
      'A twin-element wing with a drag-reduction flap that rotates to dump load on the straights, supported by swan-neck pillars to keep the underside clean and by a beam wing that interacts with the diffuser to pull more air out of the floor.',
    metrics: [
      { label: 'Elements', value: '2 + beam' },
      { label: 'DRS travel', value: '≈ 40°' },
      { label: 'Concept downforce share', value: '~24%' },
    ],
    diagram: 'cars-5',
    view: { azimuth: 158, elevation: 16, distance: 2.5 },
  },
  {
    id: 'wheelRL',
    name: 'Tyres',
    group: 'Running gear',
    summary: 'Four contact patches the size of a hand carry every force the car makes.',
    detail:
      'Slicks modelled as a rounded-shoulder carcass with a tuned sidewall and a blank tread surface. The procedural model exposes front and rear sizes independently so the tyre detail views can show the difference in width and diameter.',
    metrics: [
      { label: 'Front', value: '305 mm / 0.33 m radius' },
      { label: 'Rear', value: '405 mm / 0.36 m radius' },
      { label: 'Pattern', value: 'Slick, no grooves' },
    ],
    diagram: 'details-0',
    view: { azimuth: 65, elevation: 10, distance: 1.6 },
  },
  {
    id: 'suspensionFront',
    name: 'Suspension',
    group: 'Running gear',
    summary: 'Pushrod-actuated wishbones that keep the tyre contact patch where the aero wants it.',
    detail:
      'Double wishbones front and rear with pushrod rockers feeding inboard torsion bars and dampers. Because the floor is so ride-height sensitive, anti-dive and anti-squat geometry matter as much as outright stiffness.',
    metrics: [
      { label: 'Layout', value: 'Double wishbone, pushrod' },
      { label: 'Actuation', value: 'Inboard torsion bar' },
      { label: 'Tuneable', value: 'Heave, roll, ride height' },
    ],
    view: { azimuth: 30, elevation: -6, distance: 1.5 },
  },
  {
    id: 'cockpit',
    name: 'Cockpit & Halo',
    group: 'Chassis',
    summary: 'A survival cell, a steering wheel carrying most of the controls, and a titanium halo.',
    detail:
      'The monocoque is a carbon survival cell with a raised cockpit rim. The halo is modelled as a curved titanium hoop with a central pillar. Since the model is procedural, the steering wheel is a real object in the scene rather than a texture on a dashboard.',
    metrics: [
      { label: 'Structure', value: 'Carbon monocoque' },
      { label: 'Halo', value: 'Titanium hoop' },
      { label: 'Wheel', value: 'Concept 12-button layout' },
    ],
    diagram: 'details-5',
    view: { azimuth: 20, elevation: 34, distance: 1.8 },
  },
  {
    id: 'brakes',
    name: 'Brakes',
    group: 'Running gear',
    summary: 'Carbon discs and ducted calipers that convert 350 km/h into heat.',
    detail:
      'Ventilated carbon discs with multi-piston monobloc calipers, fed by brake ducts whose covers change with circuit demand. The procedural model shows ducts, disc and caliper as separate objects so the exploded view can pull them apart cleanly.',
    metrics: [
      { label: 'Disc', value: 'Ventilated carbon' },
      { label: 'Bias', value: 'Driver-adjustable' },
      { label: 'Cooling', value: 'Ducted, circuit specific' },
    ],
    view: { azimuth: 122, elevation: 6, distance: 1.5 },
  },
  {
    id: 'floor',
    name: 'Floor',
    group: 'Aerodynamics',
    summary: 'The largest downforce surface on a ground-effect car, and the least visible one.',
    detail:
      'A venturi floor accelerating air under a sealed edge, with fences and a large kick-up to the diffuser. In this model the floor is generated as a lofted surface so the tunnel entry and the edge fences can be highlighted on their own.',
    metrics: [
      { label: 'Type', value: 'Venturi / ground effect' },
      { label: 'Concept downforce share', value: '~39%' },
      { label: 'Sensitivity', value: 'Ride height, yaw, roll' },
    ],
    view: { azimuth: 46, elevation: -14, distance: 2.2 },
  },
  {
    id: 'diffuser',
    name: 'Diffuser',
    group: 'Aerodynamics',
    summary: 'The exit of the underfloor tunnel, where the floor’s work is finally paid out.',
    detail:
      'A ramped diffuser with vertical strakes and a defined throat, expanding the underfloor flow and setting up the wake the rear wing then works in. Its interaction with the beam wing is why the two are always developed together.',
    metrics: [
      { label: 'Ramp', value: 'Multi-plane' },
      { label: 'Strakes', value: '5 concept fences' },
      { label: 'Exit height', value: '≈ 0.28 m' },
    ],
    view: { azimuth: 196, elevation: -12, distance: 1.9 },
  },
  {
    id: 'coolingInlet',
    name: 'Cooling & Inlets',
    group: 'Powertrain',
    summary: 'Sidepod mouths and the roll-hoop inlet that feed radiators and the power unit.',
    detail:
      'Under-cut sidepod inlets with internal ducting to the charge-cooler and radiator packs, plus the airbox above the driver feeding the engine. Cooling openings trade drag for temperature margin, so they change from circuit to circuit in the real sport — here they are a fixed concept layout.',
    metrics: [
      { label: 'Inlets', value: '2 sidepod + airbox' },
      { label: 'Trade', value: 'Cooling vs. drag' },
      { label: 'Layout', value: 'Concept, fixed' },
    ],
    view: { azimuth: 96, elevation: 8, distance: 2.3 },
  },
];

export interface Hotspot {
  id: PartId;
  label: string;
  value: string;
  position: [number, number, number];
  body: string;
}

export const HOTSPOTS: Hotspot[] = [
  {
    id: 'frontWing',
    label: 'Front wing',
    value: '4 + flap',
    position: [2.55, 0.2, 0.55],
    body: 'Outboard-loaded multi-element wing with endplates and turning vanes feeding the floor edge.',
  },
  {
    id: 'sidepod',
    label: 'Sidepod',
    value: 'Under-cut',
    position: [0.35, 0.55, 0.62],
    body: 'Deep under-cut sidepod with a down-washing shoulder to push air around the rear tyre.',
  },
  {
    id: 'cockpit',
    label: 'Cockpit & halo',
    value: 'Titanium',
    position: [0.15, 0.85, 0.28],
    body: 'Carbon survival cell, curved titanium halo and a concept steering wheel with 12 controls.',
  },
  {
    id: 'engineCover',
    label: 'Power unit cover',
    value: 'Coke-bottle',
    position: [-0.95, 0.75, 0.2],
    body: 'Tight bodywork over the power unit, tapering into a coke-bottle waist that feeds the rear wing.',
  },
  {
    id: 'floor',
    label: 'Floor edge',
    value: 'Ground effect',
    position: [-0.4, 0.12, 0.85],
    body: 'Venturi tunnels sealed by edge fences; the largest single downforce contributor on the car.',
  },
  {
    id: 'rearWing',
    label: 'Rear wing',
    value: '2 + beam',
    position: [-2.45, 0.95, 0.5],
    body: 'Swan-neck dual-element wing with a drag-reduction flap and an interacting beam wing.',
  },
];

export interface CameraPreset {
  id: string;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}

export const CAMERA_PRESETS: CameraPreset[] = [
  { id: 'hero', label: 'Hero 3/4', position: [4.6, 2.1, 4.3], target: [0, 0.45, 0] },
  { id: 'front', label: 'Front', position: [6.2, 1.0, 0.0], target: [0.4, 0.4, 0] },
  { id: 'nose', label: 'Nose', position: [3.4, 0.55, 1.5], target: [2.1, 0.2, 0.1] },
  { id: 'side', label: 'Side', position: [0.2, 1.2, 6.0], target: [0, 0.5, 0] },
  { id: 'rear', label: 'Rear', position: [-5.6, 1.9, 2.4], target: [-1.4, 0.6, 0] },
  { id: 'top', label: 'Overhead', position: [0.6, 6.4, 0.5], target: [0, 0.2, 0] },
  { id: 'cockpit', label: 'Cockpit', position: [1.4, 1.9, 1.6], target: [0.1, 0.72, 0.05] },
  { id: 'wheel', label: 'Front wheel', position: [2.3, 0.6, 2.0], target: [1.65, 0.33, 0.8] },
];

export interface Livery {
  id: string;
  name: string;
  body: string;
  panel: string;
  trim: string;
  accent: string;
  carbon: string;
  rim: string;
  number: string;
}

export const LIVERIES: Livery[] = [
  {
    id: 'obsidian',
    name: 'Obsidian',
    body: '#111317',
    panel: '#d20a10',
    trim: '#c9ced6',
    accent: '#ff2b1a',
    carbon: '#0b0c0e',
    rim: '#171a1e',
    number: '#f5f7f9',
  },
  {
    id: 'signal',
    name: 'Signal Red',
    body: '#c8102e',
    panel: '#0c0d0f',
    trim: '#f2f4f6',
    accent: '#ff6a4d',
    carbon: '#101113',
    rim: '#1b1e22',
    number: '#ffffff',
  },
  {
    id: 'titanium',
    name: 'Titanium Works',
    body: '#8d949d',
    panel: '#14161a',
    trim: '#f6f8fa',
    accent: '#5ad1ff',
    carbon: '#0e1013',
    rim: '#22262b',
    number: '#0b0c0e',
  },
];

export interface EnvPreset {
  id: string;
  label: string;
  hdri: string;
  exposure: number;
  background: boolean;
  tint: string;
  note: string;
}

export const ENV_PRESETS: EnvPreset[] = [
  {
    id: 'studio',
    label: 'Studio',
    hdri: 'assets/environments/studio_small_09.hdr',
    exposure: 1.05,
    background: false,
    tint: '#0a0b0d',
    note: 'Neutral photographic studio — best for reading bodywork and carbon detail.',
  },
  {
    id: 'night',
    label: 'Night paddock',
    hdri: 'assets/environments/satara_night.hdr',
    exposure: 1.25,
    background: true,
    tint: '#05060a',
    note: 'Floodlit night ambience for livery and lighting inspection.',
  },
  {
    id: 'sky',
    label: 'Open sky',
    hdri: 'assets/environments/kloofendal_48d_partly_cloudy_puresky.hdr',
    exposure: 1.0,
    background: true,
    tint: '#0b1016',
    note: 'Cloudy daylight dome — shows paint reflections the way an overcast track would.',
  },
  {
    id: 'track',
    label: 'Track dusk',
    hdri: 'assets/environments/moonless_golf.hdr',
    exposure: 1.4,
    background: true,
    tint: '#070a0c',
    note: 'Low-light outdoor probe, useful for checking rim and suspension highlights.',
  },
];

export interface ShowcaseStep {
  id: string;
  index: string;
  title: string;
  kicker: string;
  body: string;
  focus: PartId;
  /** Camera position/target the step animates toward, in metres. */
  camera: { position: [number, number, number]; target: [number, number, number] };
  lightBoost: number;
}

export const SHOWCASE_STEPS: ShowcaseStep[] = [
  {
    id: 'silhouette',
    index: '01',
    title: 'Silhouette',
    kicker: 'Station 01 — darkness',
    body: 'The car waits under a single hard key light. Only the wing edges and the tyre shoulders catch the beam.',
    focus: 'monocoque',
    camera: { position: [-5.2, 0.7, 5.6], target: [-0.6, 0.35, 0] },
    lightBoost: 0,
  },
  {
    id: 'front-wing',
    index: '02',
    title: 'Front Wing',
    kicker: 'Station 02 — the first surface',
    body: 'Four elements plus a powered flap, with endplates turning the tip vortex outward and vanes starting the floor’s work.',
    focus: 'frontWing',
    camera: { position: [3.5, 0.5, 1.7], target: [2.15, 0.18, 0.15] },
    lightBoost: 0.4,
  },
  {
    id: 'nose',
    index: '03',
    title: 'Nose & Suspension',
    kicker: 'Station 03 — structure',
    body: 'The nose tapers into the front bulkhead; behind it the pushrod wishbones carry load inboard to the rockers.',
    focus: 'suspensionFront',
    camera: { position: [2.9, 0.75, 2.2], target: [1.5, 0.34, 0.35] },
    lightBoost: 0.5,
  },
  {
    id: 'sidepod',
    index: '04',
    title: 'Sidepod',
    kicker: 'Station 04 — bodywork',
    body: 'A deep under-cut, a down-washing shoulder and a tight coke-bottle waist feeding the rear of the floor.',
    focus: 'sidepod',
    camera: { position: [0.9, 0.8, 3.3], target: [0.15, 0.5, 0.25] },
    lightBoost: 0.6,
  },
  {
    id: 'cockpit',
    index: '05',
    title: 'Cockpit & Halo',
    kicker: 'Station 05 — the office',
    body: 'Carbon survival cell, curved titanium halo, and a steering wheel carrying the brake bias, differential and energy controls.',
    focus: 'cockpit',
    camera: { position: [1.5, 1.6, 1.9], target: [0.05, 0.72, 0.05] },
    lightBoost: 0.7,
  },
  {
    id: 'tyre',
    index: '06',
    title: 'Tyre & Wheel',
    kicker: 'Station 06 — contact patch',
    body: 'Rear slicks run 405 mm wide against 305 mm at the front. Brake ducts sit behind a rim designed to pull air through.',
    focus: 'wheelRL',
    camera: { position: [-1.1, 0.55, 2.3], target: [-1.65, 0.36, 0.7] },
    lightBoost: 0.7,
  },
  {
    id: 'rear',
    index: '07',
    title: 'Rear Wing & Diffuser',
    kicker: 'Station 07 — the exit',
    body: 'Swan-neck pillars, a drag-reduction flap and a beam wing working the diffuser’s expanding flow.',
    focus: 'rearWing',
    camera: { position: [-4.2, 1.2, 2.6], target: [-2.1, 0.7, 0.1] },
    lightBoost: 0.8,
  },
  {
    id: 'full',
    index: '08',
    title: 'Full Car',
    kicker: 'Station 08 — assembled',
    body: 'Five metres of carbon and aluminium, held together by a couple of dozen load paths designed to fail in a controlled order.',
    focus: 'monocoque',
    camera: { position: [4.8, 2.0, 4.5], target: [0, 0.5, 0] },
    lightBoost: 1,
  },
  {
    id: 'grid',
    index: '09',
    title: 'Into the Race',
    kicker: 'Station 09 — the grid',
    body: 'Heat in the tyres, brake temperatures in the window, and the run down to the first corner. The lab and the simulator carry the story from here.',
    focus: 'floor',
    camera: { position: [1.2, 0.5, 6.4], target: [0, 0.45, 0] },
    lightBoost: 0.9,
  },
];

/** Colours used to tint a part when the lab highlights it. */
export const HIGHLIGHT_COLOR = '#ff4a2b';
