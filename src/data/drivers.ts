// Driver and team data.
//
// Career figures were read from the English Wikipedia infoboxes of each driver in
// October 2026 (scripts/fetch-extra-specs.mjs) and are reproduced as fetched —
// nothing is estimated or interpolated. Current teams are the affiliations stated
// in those same articles. The F1 Concept entry is fictional and is kept
// completely separate from the real-world entries below.

export interface DriverStats {
  wins: string;
  poles: string;
  podiums: string;
  points: string;
  titles: string;
  entries: string;
  starts: string;
  firstWin: string | null;
  lastWin: string | null;
}

export interface Driver {
  id: string;
  name: string;
  short: string;
  code: string;
  country: string;
  countryCode: string;
  team2026: string | null;
  image: string | null;
  era: 'current' | 'legend';
  stats: DriverStats;
  note: string;
  source: string;
}

export const DRIVERS: Driver[] = [
  {
    id: 'hamilton',
    name: 'Lewis Hamilton',
    short: 'Hamilton',
    code: 'HAM',
    country: 'United Kingdom',
    countryCode: 'GB',
    team2026: 'Ferrari',
    image: 'drivers-0',
    era: 'current',
    stats: {
      wins: '106',
      poles: '104',
      podiums: '208',
      points: '5247.5',
      titles: '7',
      entries: '397',
      starts: '397',
      firstWin: '2007 Canadian Grand Prix',
      lastWin: '2026 Barcelona-Catalunya Grand Prix',
    },
    note: 'Seven-time champion, racing for Ferrari in the 2026 season.',
    source: 'https://en.wikipedia.org/wiki/Lewis_Hamilton',
  },
  {
    id: 'verstappen',
    name: 'Max Verstappen',
    short: 'Verstappen',
    code: 'VER',
    country: 'Netherlands',
    countryCode: 'NL',
    team2026: 'Red Bull Racing–Red Bull Ford',
    image: 'drivers-1',
    era: 'current',
    stats: {
      wins: '73',
      poles: '50',
      podiums: '136',
      points: '3665.5',
      titles: '4',
      entries: '250',
      starts: '250',
      firstWin: '2016 Spanish Grand Prix',
      lastWin: '2026 Singapore Grand Prix',
    },
    note: 'Four-time champion. Article lists his 2026 entry as Red Bull Racing–Red Bull Ford.',
    source: 'https://en.wikipedia.org/wiki/Max_Verstappen',
  },
  {
    id: 'alonso',
    name: 'Fernando Alonso',
    short: 'Alonso',
    code: 'ALO',
    country: 'Spain',
    countryCode: 'ES',
    team2026: 'Aston Martin Aramco–Honda',
    image: 'drivers-2',
    era: 'current',
    stats: {
      wins: '32',
      poles: '22',
      podiums: '106',
      points: '2400',
      titles: '2',
      entries: '445',
      starts: '442',
      firstWin: null,
      lastWin: null,
    },
    note: 'Two-time champion and the most experienced entry on the grid by race starts.',
    source: 'https://en.wikipedia.org/wiki/Fernando_Alonso',
  },
  {
    id: 'leclerc',
    name: 'Charles Leclerc',
    short: 'Leclerc',
    code: 'LEC',
    country: 'Monaco',
    countryCode: 'MC',
    team2026: 'Ferrari',
    image: 'drivers-6',
    era: 'current',
    stats: {
      wins: '9',
      poles: '27',
      podiums: '55',
      points: '1887',
      titles: '0',
      entries: '190',
      starts: '188',
      firstWin: '2019 Belgian Grand Prix',
      lastWin: '2026 British Grand Prix',
    },
    note: 'Ferrari driver since 2019; figures reproduced as published by Wikipedia.',
    source: 'https://en.wikipedia.org/wiki/Charles_Leclerc',
  },
  {
    id: 'norris',
    name: 'Lando Norris',
    short: 'Norris',
    code: 'NOR',
    country: 'United Kingdom',
    countryCode: 'GB',
    team2026: 'McLaren–Mercedes',
    image: 'drivers-3',
    era: 'current',
    stats: {
      wins: '13',
      poles: '19',
      podiums: '49',
      points: '1631',
      titles: '1',
      entries: '169',
      starts: '168',
      firstWin: '2024 Miami Grand Prix',
      lastWin: '2026 Dutch Grand Prix',
    },
    note: 'Article lists one world title and a McLaren–Mercedes entry for 2026.',
    source: 'https://en.wikipedia.org/wiki/Lando_Norris',
  },
  {
    id: 'senna',
    name: 'Ayrton Senna',
    short: 'Senna',
    code: 'SEN',
    country: 'Brazil',
    countryCode: 'BR',
    team2026: null,
    image: 'drivers-4',
    era: 'legend',
    stats: {
      wins: '41',
      poles: '65',
      podiums: '80',
      points: '610 (614 with dropped scores)',
      titles: '3',
      entries: '162 (161 starts)',
      starts: '161',
      firstWin: '1985 Portuguese Grand Prix',
      lastWin: '1993 Australian Grand Prix',
    },
    note: 'Three-time champion; figures reproduced as published by Wikipedia.',
    source: 'https://en.wikipedia.org/wiki/Ayrton_Senna',
  },
  {
    id: 'schumacher',
    name: 'Michael Schumacher',
    short: 'Schumacher',
    code: 'MSC',
    country: 'Germany',
    countryCode: 'DE',
    team2026: null,
    image: 'drivers-5',
    era: 'legend',
    stats: {
      wins: '91',
      poles: '68',
      podiums: '155',
      points: '1566',
      titles: '7',
      entries: '308 (306 starts)',
      starts: '306',
      firstWin: null,
      lastWin: null,
    },
    note: 'Seven-time champion; figures reproduced as published by Wikipedia.',
    source: 'https://en.wikipedia.org/wiki/Michael_Schumacher',
  },
];

export const DRIVER_NOTE =
  'Career statistics are the values published in each driver’s Wikipedia infobox as read in October 2026 and have not been adjusted. This project is not affiliated with any of these drivers or teams.';

/** Current affiliations grouped from the driver list (no invented constructor data). */
export const TEAM_GROUPS: { team: string; drivers: string[] }[] = Array.from(
  DRIVERS.filter((d) => d.team2026).reduce((map, driver) => {
    const list = map.get(driver.team2026 as string) ?? [];
    list.push(driver.short);
    map.set(driver.team2026 as string, list);
    return map;
  }, new Map<string, string[]>()),
).map(([team, drivers]) => ({ team, drivers }));

export const CONCEPT_TEAM = {
  name: 'F1 Concept',
  founded: 'Concept project',
  base: 'Fictional — the car, livery and identity in this build are original fiction',
  identity: ['Obsidian carbon', 'Racing red', 'Titanium trim'],
  statement:
    'F1 Concept is a design exercise, not a racing team. The single-seater in this build is modelled procedurally in the browser and carries an original livery; it is not a real car, does not reproduce any team’s 2026 challenger, and makes no claim to an official entry.',
};
