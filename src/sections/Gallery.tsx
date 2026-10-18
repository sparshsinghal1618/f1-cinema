// Section 11 — Gallery.
//
// An asymmetric editorial grid over the locally downloaded photographs, filtered
// by category and opened in the shared lightbox. Entries whose file is missing are
// dropped rather than shown as empty frames, and every image carries its credit.

import { useMemo, useState } from 'react';
import {
  Credit,
  ImageFrame,
  Lightbox,
  SectionHeader,
  revealIndex,
  useRevealGroup,
  type LightboxItem,
} from '../components/ui';
import { GALLERY, GALLERY_CATEGORIES, type GalleryCategory } from '../data/gallery';
import { hasImage } from '../lib/assets';

type Filter = 'All' | GalleryCategory;

const FILTERS: Filter[] = ['All', ...GALLERY_CATEGORIES];

export function Gallery() {
  const [filter, setFilter] = useState<Filter>('All');
  const [open, setOpen] = useState<number | null>(null);
  const grid = useRevealGroup<HTMLUListElement>(55);

  // Only show entries whose file actually exists locally.
  const available = useMemo(() => GALLERY.filter((item) => hasImage(item.key)), []);
  const list = useMemo(
    () => (filter === 'All' ? available : available.filter((item) => item.category === filter)),
    [available, filter],
  );

  const items: LightboxItem[] = useMemo(
    () =>
      list.map((item) => ({
        imageKey: item.key,
        alt: item.title,
        caption: (
          <>
            <strong>{item.title}</strong> — {item.caption}{' '}
            <Credit imageKey={item.key} />
          </>
        ),
      })),
    [list],
  );

  const missing = GALLERY.length - available.length;

  return (
    <section className="section" id="gallery" aria-labelledby="gallery-title">
      <div className="shell section__head">
        <SectionHeader
          index="11"
          eyebrow="Licensed photography"
          title="Gallery"
          titleId="gallery-title"
          lede="Motorsport photography downloaded locally and credited individually. Open any frame for the full-size view and its licence."
          actions={
            <div className="control__row" role="group" aria-label="Filter gallery">
              {FILTERS.map((entry) => (
                <button
                  key={entry}
                  type="button"
                  className={`chip${filter === entry ? ' is-on' : ''}`}
                  aria-pressed={filter === entry}
                  onClick={() => setFilter(entry)}
                >
                  {entry}
                </button>
              ))}
            </div>
          }
        />
      </div>

      <div className="shell">
        {list.length === 0 ? (
          <p className="notice">No photographs are available in this category yet.</p>
        ) : (
          <ul ref={grid.ref} className={`gallery ${grid.className}`} style={grid.style}>
            {list.map((item, index) => (
              <li
                key={item.key}
                className={`gallery__item gallery__item--${item.span}`}
                style={revealIndex(index)}
              >
                <ImageFrame
                  imageKey={item.key}
                  alt={item.title}
                  ratio={item.span === 'tall' ? '4 / 5' : item.span === 'hero' ? '16 / 9' : '3 / 2'}
                  position={item.span === 'hero' ? 'center 38%' : undefined}
                  onClick={() => setOpen(index)}
                />
                <div className="gallery__meta">
                  <div>
                    <strong>{item.title}</strong>
                    <p className="copy">{item.caption}</p>
                  </div>
                  <Credit imageKey={item.key} />
                </div>
              </li>
            ))}
          </ul>
        )}

        {missing > 0 && (
          <p className="mono gallery__note">
            {missing} further {missing === 1 ? 'photograph was' : 'photographs were'} unavailable at build time and are
            not shown.
          </p>
        )}
      </div>

      {open !== null && items[open] && (
        <Lightbox items={items} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />
      )}
    </section>
  );
}
