// Formula One history: one entry per era, written for this project from the
// linked Wikipedia articles. No live data and no official source is claimed.
//
// `image` points at a credited Wikimedia Commons photograph in the history
// image category; if a photograph could not be retrieved the frame falls back
// to a drawn plate.

export interface Era {
  id: string;
  span: string;
  title: string;
  summary: string;
  facts: string[];
  image: string;
  source: string;
}

export const HISTORY_NOTE =
  'Era summaries are written for this project from the linked Wikipedia articles. Photographs are Wikimedia Commons files credited in the licences document.';

export const ERAS: Era[] = [
  {
    id: 'origins',
    span: '1950–1959',
    title: 'The championship begins',
    summary:
      'The FIA World Championship for Drivers was created in 1950, and the first round ran at Silverstone on 13 May. Front-engined cars and long-distance European races defined the decade.',
    facts: [
      'Giuseppe Farina won the first title, driving the Alfa Romeo 158.',
      'Juan Manuel Fangio took five championships: 1951, 1954, 1955, 1956 and 1957.',
      'The Constructors’ Cup was added in 1958; Vanwall won it.',
    ],
    image: 'history-0',
    source: 'https://en.wikipedia.org/wiki/1950_Formula_One_season',
  },
  {
    id: 'rear-engine',
    span: '1959–1962',
    title: 'The rear engine wins',
    summary:
      'Cooper put the engine behind the driver, and within two seasons the front-engined cars were obsolete. Engine capacity was cut to 1.5 litres for 1961.',
    facts: [
      'Jack Brabham won the 1959 and 1960 titles in rear-engined Cooper-Climax cars.',
      'Ferrari answered the 1961 rules with the 156 “Sharknose”; Phil Hill took the title.',
      'Graham Hill won his first championship in 1962 with BRM.',
    ],
    image: 'history-1',
    source: 'https://en.wikipedia.org/wiki/Cooper_Car_Company',
  },
  {
    id: 'monocoque',
    span: '1963–1967',
    title: 'Lotus, monocoque and Clark',
    summary:
      'Lotus moved from spaceframes to a stressed-skin monocoque, and Jim Clark became the benchmark driver of the mid-sixties. The 3-litre formula arrived in 1966.',
    facts: [
      'The Lotus 25 of 1962 was an early monocoque Formula One car.',
      'Jim Clark won the title in 1963 and 1965, and the Indianapolis 500 in 1965.',
      'Jack Brabham won the 1966 title in a car bearing his own name.',
    ],
    image: 'history-2',
    source: 'https://en.wikipedia.org/wiki/Lotus_25',
  },
  {
    id: 'wings',
    span: '1968–1972',
    title: 'Wings, airboxes and sponsorship',
    summary:
      'Downforce became the engineering story. Lotus ran the Cosworth DFV and, in 1968, the first commercial livery in the sport; aerodynamic wings followed within months.',
    facts: [
      'The Lotus 49 paired the DFV V8 with a light chassis from 1967.',
      'Team Lotus carried Gold Leaf tobacco branding in 1968.',
      'Jackie Stewart won three titles: 1969, 1971 and 1973.',
    ],
    image: 'history-3',
    source: 'https://en.wikipedia.org/wiki/Lotus_49',
  },
  {
    id: 'ground-effect',
    span: '1973–1979',
    title: 'Tyres, safety and ground effect',
    summary:
      'A dangerous decade forced the sport to reorganise around safety, while Lotus rediscovered downforce by shaping the underside of the car.',
    facts: [
      'The Lotus 78 of 1977 and Lotus 79 of 1978 used ground effect; Mario Andretti won the 1978 title.',
      'Niki Lauda won the championship in 1975 and 1977 for Ferrari; James Hunt won in 1976.',
      'Jochen Rindt became the sport’s only posthumous champion in 1970.',
    ],
    image: 'history-4',
    source: 'https://en.wikipedia.org/wiki/Ground_effect_(cars)',
  },
  {
    id: 'turbo',
    span: '1977–1988',
    title: 'The turbo era',
    summary:
      'Renault brought turbocharging to Formula One in 1977. Boost pressures and qualifying engines climbed until the formula was capped and later abolished.',
    facts: [
      'Renault’s first turbocharged Formula One car ran in 1977.',
      'Nelson Piquet and Alain Prost took titles as turbocharging spread through the grid.',
      'Turbos were banned from 1989, replaced by 3.5-litre naturally aspirated engines.',
    ],
    image: 'history-5',
    source: 'https://en.wikipedia.org/wiki/Renault_in_Formula_One',
  },
  {
    id: 'senna-prost',
    span: '1988–1993',
    title: 'Senna, Prost and McLaren-Honda',
    summary:
      'Two of the sport’s most successful drivers shared the same garage, and the McLaren-Honda was the car to beat. Ayrton Senna won three titles in five seasons.',
    facts: [
      'The McLaren MP4/4 of 1988 won 15 of the 16 races, with Senna champion.',
      'Senna took the title again in 1990 and 1991; Alain Prost won in 1989 and 1993.',
      'Nigel Mansell won the 1992 championship with Williams.',
    ],
    image: 'history-6',
    source: 'https://en.wikipedia.org/wiki/McLaren_MP4/4',
  },
  {
    id: 'safety',
    span: '1994–1999',
    title: 'Safety after Imola',
    summary:
      'The deaths of Roland Ratzenberger and Ayrton Senna at Imola in 1994 changed the sport’s priorities. Circuit, car and medical standards were rewritten through the decade.',
    facts: [
      'Michael Schumacher won his first two titles with Benetton in 1994 and 1995.',
      'Damon Hill (1996) and Jacques Villeneuve (1997) took titles with Williams.',
      'Mika Häkkinen won back-to-back titles with McLaren in 1998 and 1999.',
    ],
    image: 'history-7',
    source: 'https://en.wikipedia.org/wiki/1994_San_Marino_Grand_Prix',
  },
  {
    id: 'ferrari',
    span: '2000–2005',
    title: 'Ferrari’s five in a row',
    summary:
      'Michael Schumacher and Ferrari assembled the most complete combination of the era, winning five consecutive drivers’ titles before Renault broke the run.',
    facts: [
      'Schumacher won the championship every year from 2000 to 2004, his seventh title in 2004.',
      'Fernando Alonso took the title with Renault in 2005 and 2006.',
      'Ferrari also won the constructors’ title from 1999 to 2004.',
    ],
    image: 'history-8',
    source: 'https://en.wikipedia.org/wiki/Michael_Schumacher',
  },
  {
    id: 'v8',
    span: '2006–2013',
    title: 'V8s, KERS and Vettel',
    summary:
      'Engines were frozen and then downsized to 2.4-litre V8s, energy recovery was introduced, and Red Bull and Sebastian Vettel took four straight titles.',
    facts: [
      '2.4-litre V8 engines replaced the V10s in 2006; refuelling was banned from 2010.',
      'Brawn GP won both titles in 2009, the year KERS was first permitted.',
      'Vettel won four consecutive championships from 2010 to 2013 with Red Bull.',
    ],
    image: 'history-9',
    source: 'https://en.wikipedia.org/wiki/2009_Formula_One_season',
  },
  {
    id: 'hybrid',
    span: '2014–2021',
    title: 'Turbo-hybrids and Mercedes',
    summary:
      'A new 1.6-litre turbo-hybrid power unit arrived in 2014, and Mercedes dominated the era while Lewis Hamilton collected titles.',
    facts: [
      'The 2014 regulations introduced 1.6-litre V6 turbo-hybrid power units.',
      'Mercedes won the constructors’ championship every year from 2014 to 2021.',
      'Hamilton took six of his seven titles in this period, matching Schumacher’s seven in 2020.',
    ],
    image: 'history-10',
    source: 'https://en.wikipedia.org/wiki/2014_Formula_One_season',
  },
  {
    id: 'ground-effect-returns',
    span: '2022–2026',
    title: 'Ground effect returns',
    summary:
      'New technical regulations brought ground-effect floors back in 2022, alongside a cost cap, and a further power-unit change is set for 2026.',
    facts: [
      'The 2021 financial regulations introduced a cost cap for the teams.',
      'Max Verstappen won four consecutive drivers’ titles from 2021 to 2024.',
      'From 2026 the power units move to a much larger electrical share with fully sustainable fuel, and active aerodynamics.',
    ],
    image: 'history-11',
    source: 'https://en.wikipedia.org/wiki/2022_Formula_One_World_Championship',
  },
];

export interface Milestone {
  year: string;
  label: string;
  detail: string;
}

export const MILESTONES: Milestone[] = [
  {
    year: '1950',
    label: 'The championship starts',
    detail:
      'The first World Championship round runs at Silverstone on 13 May. Giuseppe Farina takes the inaugural title in the Alfa Romeo 158.',
  },
  {
    year: '1958',
    label: 'Rear engine and a constructors’ title',
    detail:
      'Vanwall wins the first Constructors’ Cup, and Stirling Moss opens the season with the first championship win for a rear-engined car, a Cooper-Climax.',
  },
  {
    year: '1961',
    label: 'Engines cut to 1.5 litres',
    detail:
      'The formula shrinks to 1.5-litre engines. Ferrari’s 156 “Sharknose” answers the rules, and Phil Hill takes the title.',
  },
  {
    year: '1966',
    label: 'The 3-litre formula',
    detail:
      'Capacity is doubled to 3 litres. Jack Brabham wins the championship in a car bearing his own name.',
  },
  {
    year: '1968',
    label: 'Wings and sponsorship arrive',
    detail:
      'Lotus runs the first commercial livery in the sport and brings aerodynamic wings to the grid within months; downforce becomes the engineering story.',
  },
  {
    year: '1970',
    label: 'A posthumous champion',
    detail:
      'Jochen Rindt is killed at Monza but keeps the points lead and becomes the sport’s only posthumous World Champion.',
  },
  {
    year: '1976',
    label: 'A title decided by one point',
    detail:
      'James Hunt beats Niki Lauda by a single point after Lauda returns from his fire at the Nürburgring.',
  },
  {
    year: '1977',
    label: 'The turbo arrives',
    detail:
      'Renault runs the first turbocharged Formula One car, the RS01. Lotus answers with ground effect in the 78.',
  },
  {
    year: '1983',
    label: 'Ground effect is banned',
    detail:
      'A flat-floor rule ends the sliding-skirt era, and the cars are forced back to conventional underbodies.',
  },
  {
    year: '1988',
    label: 'Fifteen wins from sixteen',
    detail:
      'The McLaren-Honda MP4/4 wins all but one race of the season; Ayrton Senna takes the title.',
  },
  {
    year: '1989',
    label: 'Turbochargers banned',
    detail:
      'The formula returns to naturally aspirated engines, now 3.5 litres, ending twelve seasons of turbocharging.',
  },
  {
    year: '1994',
    label: 'Safety after Imola',
    detail:
      'Roland Ratzenberger and Ayrton Senna are killed at Imola, triggering the safety reforms that reshaped car and circuit design.',
  },
  {
    year: '2009',
    label: 'KERS and Brawn GP',
    detail:
      'Energy recovery is permitted for the first time, and the new Brawn GP team wins both championships.',
  },
  {
    year: '2014',
    label: 'The hybrid power unit',
    detail:
      '1.6-litre V6 turbo-hybrid power units replace the V8s, opening a long run of Mercedes championships.',
  },
  {
    year: '2021',
    label: 'Cost cap and a new champion',
    detail:
      'A cost cap is introduced for the teams, and Max Verstappen wins his first drivers’ title.',
  },
  {
    year: '2022',
    label: 'Ground effect returns',
    detail:
      'New technical regulations bring ground-effect floors back after almost forty years away.',
  },
  {
    year: '2026',
    label: 'A new power unit formula',
    detail:
      'The power units move to a much larger electrical share with fully sustainable fuel, alongside active aerodynamics.',
  },
];

