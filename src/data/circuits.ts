// Verified circuit data.
//
// Length / corner count / lap record values were pulled from the English Wikipedia
// infoboxes of each circuit article (scripts/fetch-extra-specs.mjs) in October 2026.
// Circular things that change (current lap-record holder, event dates, standings)
// are deliberately NOT invented here — only the fetched values are shown, with the
// article URL kept alongside each entry.

export interface Circuit {
  id: string;
  name: string;
  location: string;
  country: string;
  code: string;
  lengthKm: string;
  corners: string;
  lapRecord: string;
  image: string;
  night: boolean;
  summary: string;
  character: string[];
  /** Schematic outline drawn by hand for this project (not a survey or scale drawing). */
  outline: string;
  source: string;
}

export const CIRCUIT_NOTE =
  'Outlines are schematic illustrations drawn for this project and are not to scale. Length, corner count and lap records are taken from the linked Wikipedia infoboxes.';

export const CIRCUITS: Circuit[] = [
  {
    id: 'monaco',
    name: 'Circuit de Monaco',
    location: 'Monte Carlo',
    country: 'Monaco',
    code: 'MON',
    lengthKm: '3.337',
    corners: '19',
    lapRecord: '1:12.909',
    image: 'circuits-4',
    night: false,
    summary:
      'The shortest lap on the calendar, threaded through the streets of Monte Carlo with no run-off worth the name. Precision and traction out of the low-speed hairpin decide the order.',
    character: ['Street circuit', 'Low speed', 'Maximum precision'],
    outline:
      'M14 74 L14 44 Q14 40 18 40 L40 40 Q44 40 44 36 L44 22 Q44 18 48 18 L66 18 Q70 18 70 22 L70 34 Q70 38 74 38 L86 38 Q90 38 90 42 L90 58 Q90 62 86 62 L56 62 Q52 62 52 66 L52 78 Q52 82 48 82 L58 82 Q62 82 62 78 L62 74 Q62 70 58 70 L30 70 Q26 70 26 74 L26 78 Q26 82 22 82 L18 82 Q14 82 14 78 Z',
    source: 'https://en.wikipedia.org/wiki/Circuit_de_Monaco',
  },
  {
    id: 'silverstone',
    name: 'Silverstone Circuit',
    location: 'Northamptonshire',
    country: 'United Kingdom',
    code: 'SIL',
    lengthKm: '5.891',
    corners: '18',
    lapRecord: '1:27.097',
    image: 'circuits-5',
    night: false,
    summary:
      'The home of the British Grand Prix and a genuine high-speed test: fast direction changes through the Maggotts–Becketts complex, then the long run to Stowe and Club.',
    character: ['High speed', 'Fast direction changes', 'Aero dependent'],
    outline:
      'M12 62 L12 34 Q12 30 16 30 L34 30 Q38 30 38 26 L38 18 Q38 14 42 14 L74 14 Q78 14 78 18 L78 30 Q78 34 82 34 L88 34 Q92 34 92 38 L92 54 Q92 58 88 58 L74 58 Q70 58 70 62 L70 74 Q70 78 66 78 L38 78 Q34 78 34 74 L34 66 Q34 62 30 62 L16 62 Q12 62 12 58 Z',
    source: 'https://en.wikipedia.org/wiki/Silverstone_Circuit',
  },
  {
    id: 'spa',
    name: 'Circuit de Spa-Francorchamps',
    location: 'Stavelot',
    country: 'Belgium',
    code: 'SPA',
    lengthKm: '7.004',
    corners: '19',
    lapRecord: '1:44.701',
    image: 'circuits-6',
    night: false,
    summary:
      'The longest circuit in use: a plunge through Eau Rouge and Raidillon, long flat-out sections through the forest, and weather that can differ from one end of the lap to the other.',
    character: ['Longest lap', 'Elevation change', 'Unpredictable weather'],
    outline:
      'M10 80 L10 30 Q10 26 14 26 L30 26 Q34 26 34 30 L34 44 Q34 48 38 48 L58 48 Q62 48 62 44 L62 24 Q62 20 66 20 L86 20 Q90 20 90 24 L90 60 Q90 64 86 64 L70 64 Q66 64 66 68 L66 76 Q66 80 62 80 L34 80 Q30 80 30 76 L30 68 Q30 64 26 64 L14 64 Q10 64 10 68 Z',
    source: 'https://en.wikipedia.org/wiki/Circuit_de_Spa-Francorchamps',
  },
  {
    id: 'suzuka',
    name: 'Suzuka International Racing Course',
    location: 'Suzuka, Mie',
    country: 'Japan',
    code: 'SUZ',
    lengthKm: '5.807',
    corners: '18',
    lapRecord: '1:30.965',
    image: 'circuits-7',
    night: false,
    summary:
      'The only figure-of-eight circuit on the calendar, with a crossover bridge built for the purpose. The Esses and the 130R sweep reward rhythm above outright power.',
    character: ['Figure of eight', 'Rhythm circuit', 'Crossover bridge'],
    outline:
      'M22 16 L70 16 Q74 16 74 20 L74 36 Q74 40 70 40 L50 40 Q46 40 46 44 L46 56 Q46 60 50 60 L70 60 Q74 60 74 64 L74 80 Q74 84 70 84 L22 84 Q18 84 18 80 L18 64 Q18 60 22 60 L42 60 Q46 60 46 56 L46 44 Q46 40 42 40 L22 40 Q18 40 18 36 L18 20 Q18 16 22 16 Z',
    source: 'https://en.wikipedia.org/wiki/Suzuka_International_Racing_Course',
  },
  {
    id: 'monza',
    name: 'Autodromo Nazionale di Monza',
    location: 'Monza',
    country: 'Italy',
    code: 'MNZ',
    lengthKm: '5.793',
    corners: '11',
    lapRecord: '1:20.901',
    image: 'circuits-8',
    night: false,
    summary:
      'The temple of speed: four long straights broken by chicanes, with the Parabolica opening onto the main straight. Low downforce, big braking events, slipstream racing.',
    character: ['Lowest downforce', 'Slipstream racing', 'Heavy braking'],
    outline:
      'M16 50 L16 26 Q16 22 20 22 L40 22 Q44 22 44 26 L44 36 Q44 40 48 40 L58 40 Q62 40 62 36 L62 22 Q62 18 66 18 L84 18 Q88 18 88 22 L88 50 Q88 54 84 54 L60 54 Q56 54 56 58 L56 74 Q56 78 52 78 L36 78 Q32 78 32 74 L32 66 Q32 62 28 62 L20 62 Q16 62 16 58 Z',
    source: 'https://en.wikipedia.org/wiki/Autodromo_Nazionale_di_Monza',
  },
  {
    id: 'singapore',
    name: 'Marina Bay Street Circuit',
    location: 'Singapore',
    country: 'Singapore',
    code: 'SIN',
    lengthKm: '4.927',
    corners: '19',
    lapRecord: '1:33.808',
    image: 'circuits-9',
    night: true,
    summary:
      'A floodlit street circuit run after dark, with walls close to the racing line across a long lap and high humidity that punishes both tyres and concentration.',
    character: ['Night race', 'Street circuit', 'Physical'],
    outline:
      'M14 70 L14 44 Q14 40 18 40 L34 40 Q38 40 38 36 L38 22 Q38 18 42 18 L60 18 Q64 18 64 22 L64 34 Q64 38 68 38 L86 38 Q90 38 90 42 L90 62 Q90 66 86 66 L72 66 Q68 66 68 70 L68 78 Q68 82 64 82 L46 82 Q42 82 42 78 L42 72 Q42 68 38 68 L18 68 Q14 68 14 72 Z',
    source: 'https://en.wikipedia.org/wiki/Marina_Bay_Street_Circuit',
  },
  {
    id: 'cota',
    name: 'Circuit of the Americas',
    location: 'Austin, Texas',
    country: 'United States',
    code: 'COTA',
    lengthKm: '5.513',
    corners: '20',
    lapRecord: '1:36.169',
    image: 'backgrounds-2',
    night: false,
    summary:
      'A purpose-built circuit with a steep climb into the blind first corner, a fast esses section lifted from Silverstone’s playbook, and a long back straight into heavy braking.',
    character: ['Steep turn one', 'Esses', 'Long back straight'],
    outline:
      'M12 66 L12 34 Q12 30 16 30 L30 30 Q34 30 34 26 L34 20 Q34 16 38 16 L58 16 Q62 16 62 20 L62 30 Q62 34 66 34 L86 34 Q90 34 90 38 L90 56 Q90 60 86 60 L68 60 Q64 60 64 64 L64 76 Q64 80 60 80 L40 80 Q36 80 36 76 L36 70 Q36 66 32 66 L16 66 Q12 66 12 70 Z',
    source: 'https://en.wikipedia.org/wiki/Circuit_of_the_Americas',
  },
  {
    id: 'yas',
    name: 'Yas Marina Circuit',
    location: 'Abu Dhabi',
    country: 'United Arab Emirates',
    code: 'YAS',
    lengthKm: '5.281',
    corners: '16',
    lapRecord: '1:25.637',
    image: 'circuits-2',
    night: true,
    summary:
      'A twilight-to-night finale laid out around the marina, mixing long straights with a tight, technical final sector where traction out of slow corners is everything.',
    character: ['Day-to-night race', 'Marina setting', 'Technical final sector'],
    outline:
      'M14 72 L14 40 Q14 36 18 36 L44 36 Q48 36 48 32 L48 20 Q48 16 52 16 L74 16 Q78 16 78 20 L78 32 Q78 36 82 36 L88 36 Q92 36 92 40 L92 62 Q92 66 88 66 L52 66 Q48 66 48 70 L48 78 Q48 82 44 82 L26 82 Q22 82 22 78 L22 74 Q22 70 18 70 Q14 70 14 74 Z',
    source: 'https://en.wikipedia.org/wiki/Yas_Marina_Circuit',
  },
];

export const circuitById = (id: string): Circuit | undefined => CIRCUITS.find((c) => c.id === id);
