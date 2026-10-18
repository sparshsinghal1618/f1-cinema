// Section 06 — Circuit atlas.
//
// Eight circuits, each with the values taken from the linked Wikipedia infobox and
// a schematic outline drawn for this project. The outline is a layout sketch, not a
// survey, and that is stated on the page as well as in the data file.

import { useState } from 'react';
import { ExternalLink, MapPin } from 'lucide-react';
import { ImageFrame, SectionHeader, revealIndex, useReveal, useRevealGroup } from '../components/ui';
import { CIRCUITS, CIRCUIT_NOTE } from '../data/circuits';
import { useReducedMotion } from '../lib/motion';

export function Circuits() {
  const [activeId, setActiveId] = useState(CIRCUITS[0].id);
  const reduced = useReducedMotion();
  const list = useRevealGroup<HTMLDivElement>(45);
  const detail = useReveal<HTMLElement>();

  const index = CIRCUITS.findIndex((circuit) => circuit.id === activeId);
  const circuit = CIRCUITS[index] ?? CIRCUITS[0];

  const step = (delta: number) => {
    const next = (index + delta + CIRCUITS.length) % CIRCUITS.length;
    setActiveId(CIRCUITS[next].id);
    document.getElementById(`circuit-tab-${CIRCUITS[next].id}`)?.focus();
  };

  return (
    <section className="section" id="circuits" aria-labelledby="circuits-title">
      <div className="shell section__head">
        <SectionHeader
          index="06"
          eyebrow="Eight circuits"
          title="Circuit Atlas"
          titleId="circuits-title"
          lede="Length, corner count and lap records are reproduced from each circuit's Wikipedia infobox. The outlines are schematic illustrations drawn for this project."
        />
      </div>

      <div className="shell circuits">
        <div
          className={`circuits__list ${list.className}`}
          style={list.style}
          role="tablist"
          aria-label="Circuits"
          aria-orientation="vertical"
          ref={list.ref}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              step(1);
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              step(-1);
            }
          }}
        >
          {CIRCUITS.map((entry, tabIndex) => {
            const on = entry.id === activeId;
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                id={`circuit-tab-${entry.id}`}
                aria-selected={on}
                aria-controls={`circuit-panel-${entry.id}`}
                tabIndex={on ? 0 : -1}
                className={`circuits__tab${on ? ' is-on' : ''}`}
                style={revealIndex(tabIndex)}
                onClick={() => setActiveId(entry.id)}
              >
                <span className="mono circuits__code">{entry.code}</span>
                <span className="circuits__tab-text">
                  <strong>{entry.name}</strong>
                  <span className="mono">
                    <MapPin size={11} aria-hidden="true" /> {entry.location}
                  </span>
                </span>
                <span className="mono">{entry.lengthKm} km</span>
              </button>
            );
          })}
        </div>

        <article
          ref={detail.ref}
          className={`circuits__detail panel ${detail.className}`}
          style={detail.style}
          role="tabpanel"
          id={`circuit-panel-${circuit.id}`}
          aria-labelledby={`circuit-tab-${circuit.id}`}
          tabIndex={0}
        >
          <div className="circuits__map">
            <svg viewBox="0 0 104 104" role="img" aria-label={`${circuit.name} schematic layout`}>
              <defs>
                <linearGradient id={`grad-${circuit.id}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ff2b1a" />
                  <stop offset="100%" stopColor="#8f0400" />
                </linearGradient>
              </defs>
              <path
                id={`outline-${circuit.id}`}
                d={circuit.outline}
                fill="none"
                stroke={`url(#grad-${circuit.id})`}
                strokeWidth="4.4"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <path
                d={circuit.outline}
                fill="none"
                stroke="rgba(255,255,255,0.28)"
                strokeWidth="0.7"
                strokeDasharray="4 5"
              />
              {!reduced && (
                <circle r="2.6" fill="#f5f7f9">
                  <animateMotion dur="9s" repeatCount="indefinite" rotate="auto">
                    <mpath href={`#outline-${circuit.id}`} />
                  </animateMotion>
                </circle>
              )}
            </svg>
            <span className="mono circuits__map-note">Schematic · not to scale</span>
          </div>

          <div className="circuits__info">
            <p className="mono">
              {circuit.country}
              {circuit.night ? ' · Night race' : ''}
            </p>
            <h3 className="display h3">{circuit.name}</h3>
            <p className="copy">{circuit.summary}</p>

            <ul className="chip-row">
              {circuit.character.map((trait) => (
                <li key={trait} className="chip">
                  {trait}
                </li>
              ))}
            </ul>

            <dl className="circuits__stats">
              <div>
                <dt className="mono">Length</dt>
                <dd>{circuit.lengthKm} km</dd>
              </div>
              <div>
                <dt className="mono">Corners</dt>
                <dd>{circuit.corners}</dd>
              </div>
              <div>
                <dt className="mono">Lap record</dt>
                <dd className="mono">{circuit.lapRecord}</dd>
              </div>
            </dl>

            <div className="circuits__photo">
              <ImageFrame imageKey={circuit.image} alt={`${circuit.name} photograph`} ratio="16 / 9" />
            </div>

            <div className="circuits__footer">
              <span className="mono">{circuit.code}</span>
              <a className="btn btn--ghost" href={circuit.source} target="_blank" rel="noreferrer noopener">
                Values from Wikipedia
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            </div>
          </div>
        </article>
      </div>

      <p className="shell mono circuits__note">{CIRCUIT_NOTE}</p>
    </section>
  );
}
