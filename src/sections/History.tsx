// Section 08 — Formula One history. A twelve-era timeline written for this
// project from the linked Wikipedia articles, illustrated with Commons photos.

import { ExternalLink } from 'lucide-react';
import { ImageFrame, SectionHeader, revealIndex, useReveal, useRevealGroup } from '../components/ui';
import { ERAS, HISTORY_NOTE, MILESTONES } from '../data/history';

export function History() {
  const timeline = useRevealGroup<HTMLOListElement>(55);
  const eras = useRevealGroup<HTMLOListElement>(85);
  const note = useReveal<HTMLParagraphElement>();

  return (
    <section className="section" id="history" aria-labelledby="history-title">
      <div className="shell">
        <SectionHeader
          index="08"
          eyebrow="1950 to today"
          title="Formula One history"
          titleId="history-title"
          lede="Twelve eras, from the first world championship round at Silverstone in 1950 to the ground-effect regulations of the 2020s."
        />
      </div>

      <div className="shell history__timeline">
        <ol
          className={`history__track ${timeline.className}`}
          style={timeline.style}
          ref={timeline.ref}
          aria-label="Formula One milestones, 1950 to 2026"
        >
          {MILESTONES.map((milestone, index) => (
            <li className="milestone" key={milestone.year} style={revealIndex(index)}>
              <span className="mono milestone__year">{milestone.year}</span>
              <span className="milestone__node" aria-hidden="true" />
              <div className="milestone__body">
                <strong className="milestone__label">{milestone.label}</strong>
                <p className="milestone__detail">{milestone.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <ol className={`shell history ${eras.className}`} style={eras.style} ref={eras.ref}>
        {ERAS.map((era, index) => (
          <li key={era.id} className="history__era" style={revealIndex(index)}>
            <div className="history__rail" aria-hidden="true">
              <span className="history__dot" />
            </div>

            <article className="history__card panel">
              <div className="history__media">
                <ImageFrame imageKey={era.image} alt={`${era.title}, ${era.span}`} ratio="4 / 3" />
              </div>

              <div className="history__body">
                <div className="history__meta">
                  <span className="mono history__span">{era.span}</span>
                  <span className="mono history__count">
                    Era {String(index + 1).padStart(2, '0')} / {String(ERAS.length).padStart(2, '0')}
                  </span>
                </div>

                <h3 className="display h3">{era.title}</h3>
                <p className="copy">{era.summary}</p>

                <ul className="history__facts">
                  {era.facts.map((fact) => (
                    <li key={fact}>{fact}</li>
                  ))}
                </ul>

                <a
                  className="mono history__source"
                  href={era.source}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Source: Wikipedia
                  <ExternalLink size={12} aria-hidden="true" />
                </a>
              </div>
            </article>
          </li>
        ))}
      </ol>

      <p ref={note.ref} className={`shell mono history__note ${note.className}`} style={note.style}>
        {HISTORY_NOTE}
      </p>
    </section>
  );
}
