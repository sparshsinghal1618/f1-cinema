// Section 09 — Drivers and teams.
//
// Real-world careers, read from each driver's Wikipedia infobox and reproduced as
// fetched. The F1 Concept entry is original fiction and is presented in its own
// panel so the two are never mixed.

import { useMemo, useState } from 'react';
import { ExternalLink, Info } from 'lucide-react';
import { ImageFrame, SectionHeader, revealIndex, useReveal, useRevealGroup } from '../components/ui';
import { CONCEPT_TEAM, DRIVERS, type Driver } from '../data/drivers';
import { GRID_YEAR, TEAMS, TEAMS_NOTE } from '../data/teams.generated';

type Filter = 'all' | 'current' | 'legend';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'current', label: 'Current grid' },
  { id: 'legend', label: 'Legends' },
];

function Monogram({ driver }: { driver: Driver }) {
  return (
    <div className="driver__monogram" aria-hidden="true">
      <span className="display">{driver.code}</span>
    </div>
  );
}

function Teams() {
  const grid = useRevealGroup<HTMLUListElement>(60);
  return (
    <div className="shell teams">
      <div className="teams__head">
        <h3 className="display h3" id="teams-heading">
          The {GRID_YEAR} grid
        </h3>
        <p className="copy teams__note">{TEAMS_NOTE}</p>
      </div>

      <ul
        ref={grid.ref}
        className={`teams__grid ${grid.className}`}
        style={grid.style}
        aria-labelledby="teams-heading"
      >
        {TEAMS.map((team, index) => (
          <li key={team.id} style={revealIndex(index)}>
            <article className="team-card panel">
              <header className="team-card__head">
                <span className="mono team-card__index">{String(index + 1).padStart(2, '0')}</span>
                <h4 className="display h4">{team.name}</h4>
                <p className="mono team-card__entrant">{team.entrant}</p>
              </header>

              <dl className="team-card__stats">
                {[
                  { label: 'Base', value: team.base },
                  { label: 'Principal', value: team.principal },
                  { label: 'Chassis', value: team.chassis },
                  { label: 'Power unit', value: team.powerUnit },
                  { label: 'Car numbers', value: team.numbers },
                  { label: 'Constructors’ titles', value: team.constructorsTitles },
                  { label: 'Drivers’ titles', value: team.driversTitles },
                  { label: 'First entry', value: team.firstEntry },
                  { label: 'Entries', value: team.races },
                ].map((field) => (
                  <div key={field.label}>
                    <dt className="mono">{field.label}</dt>
                    <dd>{field.value}</dd>
                  </div>
                ))}
              </dl>

              <p className="mono team-card__label">Race drivers</p>
              <ul className="team-card__drivers">
                {team.drivers.map((driver) => (
                  <li key={driver.name}>
                    <span>{driver.name}</span>
                    <span className="mono team-card__rounds">R{driver.rounds}</span>
                  </li>
                ))}
              </ul>

              <a className="btn btn--ghost team-card__link" href={team.source} target="_blank" rel="noreferrer noopener">
                Team article
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Drivers() {
  const [filter, setFilter] = useState<Filter>('all');
  const [activeId, setActiveId] = useState(DRIVERS[0].id);
  const grid = useRevealGroup<HTMLUListElement>(45);
  const profile = useReveal<HTMLElement>();
  const fictional = useReveal<HTMLElement>();

  const list = useMemo(
    () => (filter === 'all' ? DRIVERS : DRIVERS.filter((driver) => driver.era === filter)),
    [filter],
  );

  const active = DRIVERS.find((driver) => driver.id === activeId) ?? DRIVERS[0];

  return (
    <section className="section" id="drivers" aria-labelledby="drivers-title">
      <div className="shell section__head">
        <SectionHeader
          index="09"
          eyebrow="Verified via Wikipedia"
          title="Drivers & Teams"
          titleId="drivers-title"
          lede="Career figures are read from each driver's Wikipedia infobox and reproduced as fetched — nothing is estimated, and no quotes are invented."
          actions={
            <div className="control__row" role="group" aria-label="Filter drivers">
              {FILTERS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={`chip${filter === entry.id ? ' is-on' : ''}`}
                  aria-pressed={filter === entry.id}
                  onClick={() => setFilter(entry.id)}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          }
        />
      </div>

      <div className="shell drivers">
        <ul ref={grid.ref} className={`drivers__grid ${grid.className}`} style={grid.style}>
          {list.map((driver, index) => {
            const on = driver.id === activeId;
            return (
              <li key={driver.id} style={revealIndex(index)}>
                <button
                  type="button"
                  className={`driver-card${on ? ' is-on' : ''}`}
                  aria-pressed={on}
                  onClick={() => setActiveId(driver.id)}
                >
                  <div className="driver-card__media">
                    {driver.image ? (
                      <ImageFrame imageKey={driver.image} alt={`Portrait of ${driver.name}`} ratio="4 / 5" />
                    ) : (
                      <Monogram driver={driver} />
                    )}
                  </div>
                  <div className="driver-card__body">
                    <span className="mono driver-card__code">{driver.code}</span>
                    <strong className="driver-card__name">{driver.name}</strong>
                    <span className="mono">{driver.country}</span>
                    <span className="mono driver-card__team">{driver.team2026 ?? '—'}</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        <article
          ref={profile.ref}
          className={`drivers__profile panel ${profile.className}`}
          style={profile.style}
          aria-live="polite"
        >
          <div className="drivers__profile-media">
            {active.image ? (
              <ImageFrame imageKey={active.image} alt={`Portrait of ${active.name}`} ratio="1 / 1" />
            ) : (
              <Monogram driver={active} />
            )}
          </div>

          <div className="drivers__profile-body">
            <p className="mono">
              {active.era === 'legend' ? 'Legend' : 'Current grid'} · {active.country}
            </p>
            <h3 className="display h3">{active.name}</h3>
            <p className="mono drivers__profile-team">{active.team2026 ?? 'No current team listed'}</p>
            <p className="copy">{active.note}</p>

            <dl className="drivers__stats">
              {[
                { label: 'Titles', value: active.stats.titles },
                { label: 'Wins', value: active.stats.wins },
                { label: 'Podiums', value: active.stats.podiums },
                { label: 'Poles', value: active.stats.poles },
                { label: 'Entries', value: active.stats.entries },
                { label: 'Starts', value: active.stats.starts },
                { label: 'Points', value: active.stats.points },
                { label: 'First win', value: active.stats.firstWin ?? '—' },
                { label: 'Last win', value: active.stats.lastWin ?? '—' },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="mono">{stat.label}</dt>
                  <dd className="data">{stat.value}</dd>
                </div>
              ))}
            </dl>

            <a className="btn btn--ghost" href={active.source} target="_blank" rel="noreferrer noopener">
              Figures from Wikipedia
              <ExternalLink size={13} aria-hidden="true" />
            </a>
          </div>
        </article>

        <aside
          ref={fictional.ref}
          className={`drivers__fictional panel panel__pad ${fictional.className}`}
          style={fictional.style}
        >
          <p className="mono">
            <Info size={12} aria-hidden="true" /> Concept team
          </p>
          <h3 className="h4">{CONCEPT_TEAM.name}</h3>
          <p className="copy">{CONCEPT_TEAM.statement}</p>
        </aside>
      </div>

      <Teams />
    </section>
  );
}
