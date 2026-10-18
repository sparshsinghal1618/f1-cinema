// Cinematic gallery index. Every entry points at a locally downloaded photograph
// and carries the credit that must be displayed with it.

export interface GalleryItem {
  key: string;
  title: string;
  caption: string;
  category: GalleryCategory;
  span: 'wide' | 'tall' | 'normal' | 'hero';
}

export type GalleryCategory = 'Race action' | 'Starts' | 'Machinery' | 'Night' | 'Pit lane';

export const GALLERY_CATEGORIES: GalleryCategory[] = ['Race action', 'Starts', 'Machinery', 'Night', 'Pit lane'];

export const GALLERY: GalleryItem[] = [
  {
    key: 'hero-2',
    title: 'Show run, Adelaide',
    caption: 'A 2011-spec car on a demonstration run through the Adelaide street layout at the 2025 season finale weekend.',
    category: 'Race action',
    span: 'hero',
  },
  {
    key: 'gallery-0',
    title: 'Opening lap, Suzuka',
    caption: 'The field funnels into the first complex at the 2010 Japanese Grand Prix.',
    category: 'Starts',
    span: 'wide',
  },
  {
    key: 'gallery-2',
    title: 'Lap one, 2012',
    caption: 'Suzuka again, two seasons later: the pack still three-wide before the esses.',
    category: 'Starts',
    span: 'wide',
  },
  {
    key: 'gallery-1',
    title: 'Hamilton, Suzuka',
    caption: 'Lewis Hamilton on race day at the 2010 Japanese Grand Prix.',
    category: 'Race action',
    span: 'tall',
  },
  {
    key: 'details-0',
    title: 'Slick, 2026 spec',
    caption: 'A medium-compound slick photographed square-on — the tread is a formality, the construction is the story.',
    category: 'Machinery',
    span: 'tall',
  },
  {
    key: 'cars-0',
    title: 'Front wing & suspension',
    caption: 'Multi-element front wing with the pushrod suspension and brake duct assembly behind it.',
    category: 'Machinery',
    span: 'wide',
  },
  {
    key: 'pitlane-0',
    title: 'Pit lane, Sepang',
    caption: 'Crews at rest between sessions at the 2013 Malaysian Grand Prix.',
    category: 'Pit lane',
    span: 'normal',
  },
  {
    key: 'pitlane-1',
    title: 'Garage detail, Sepang',
    caption: 'Wheel guns, blankets and bodywork staged on the pit lane apron.',
    category: 'Pit lane',
    span: 'normal',
  },
  {
    key: 'gallery-4',
    title: 'Lap one, Fuji',
    caption: 'A vertical frame of the opening lap at the 2009 Japanese Grand Prix.',
    category: 'Starts',
    span: 'tall',
  },
  {
    key: 'gallery-6',
    title: 'Kobayashi, Suzuka',
    caption: 'Kamui Kobayashi through the esses at the 2012 Japanese Grand Prix.',
    category: 'Race action',
    span: 'wide',
  },
  {
    key: 'circuits-3',
    title: 'Marina Bay skyline',
    caption: 'The Singapore circuit from above the bay, city lights doubling the floodlights.',
    category: 'Night',
    span: 'wide',
  },
  {
    key: 'cars-3',
    title: 'Cockpit view',
    caption: 'Driver’s-eye view over the halo of a 2020-spec car during pre-season testing.',
    category: 'Machinery',
    span: 'wide',
  },
  {
    key: 'gallery-3',
    title: 'Prost, Phoenix',
    caption: 'Alain Prost in the 1990 United States Grand Prix at Phoenix.',
    category: 'Race action',
    span: 'normal',
  },
  {
    key: 'circuits-0',
    title: 'Night race, Singapore',
    caption: 'The city-state’s street circuit under full floodlight, skyline behind.',
    category: 'Night',
    span: 'wide',
  },
  {
    key: 'gallery-5',
    title: 'Start, Phoenix 1991',
    caption: 'The field launches off the grid at the 1991 United States Grand Prix.',
    category: 'Starts',
    span: 'wide',
  },
  {
    key: 'pitlane-3',
    title: 'Garage, Silverstone',
    caption: 'A team garage set up during the 2011 British Grand Prix weekend.',
    category: 'Pit lane',
    span: 'normal',
  },
  {
    key: 'hero-0',
    title: 'Bodywork study',
    caption: 'A 2020-spec car at rest — sidepod inlets, floor edge and rear tyre in one frame.',
    category: 'Machinery',
    span: 'wide',
  },
  {
    key: 'gallery-7',
    title: 'Demonstration run, Adelaide',
    caption: 'An older-spec car on a show run at the 2025 Adelaide Grand Final.',
    category: 'Race action',
    span: 'normal',
  },
];
