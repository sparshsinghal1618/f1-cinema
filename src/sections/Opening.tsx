// The opening film.
//
// A single GSAP timeline drives both the DOM titles and a progress ref that the
// 3D camera rig samples every frame, so the two stay locked together and the
// whole sequence can be skipped or replayed by seeking one value.

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, FastForward } from 'lucide-react';
import { CarExperience } from '../three/CarExperience';
import { ErrorBoundary, ImageFrame } from '../components/ui';
import { BRAND } from '../data/site';
import { gsap } from '../lib/gsap';
import { useDocumentVisible, useOnScreen, useReducedMotion } from '../lib/motion';
import type { PartId } from '../data/car';

const FILM_DURATION = 8.6;

export function Opening() {
  const rootRef = useRef<HTMLElement>(null);
  const progressRef = useRef(0);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const [viewportRef, inView] = useOnScreen<HTMLDivElement>({ rootMargin: '340px', once: false });
  const visible = useDocumentVisible();
  const reduced = useReducedMotion();

  const [highlight, setHighlight] = useState<PartId | null>(null);
  const [ready, setReady] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const context = gsap.context(() => {
      if (reduced) {
        progressRef.current = 1;
        return;
      }

      const timeline = gsap.timeline({ defaults: { ease: 'power2.out' } });
      timelineRef.current = timeline;

      // One tween owns the camera; the text cues are positioned against it.
      timeline.to(progressRef, { current: 1, duration: FILM_DURATION, ease: 'power1.inOut' }, 0);
      timeline.fromTo('.film__brand', { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 1.3 }, 0.35);
      timeline.fromTo('.film__tag', { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.1 }, 1.5);
      timeline.fromTo(
        '.film__labels li',
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.3 },
        3.4,
      );
      timeline.fromTo('.film__enter', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.9 }, 6.4);
      timeline.call(() => setHighlight('frontWing'), undefined, 3.7);
      timeline.call(() => setHighlight(null), undefined, 5.1);

      const onSkip = () => timeline.progress(1);
      root.addEventListener('f1:skip-intro', onSkip);
      return () => root.removeEventListener('f1:skip-intro', onSkip);
    }, root);

    return () => context.revert();
  }, [reduced]);

  const skip = () => {
    timelineRef.current?.progress(1);
    setHighlight(null);
  };

  const enter = () => {
    timelineRef.current?.progress(1);
    setEntered(true);
    const target = document.getElementById('showcase');
    if (target) target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };

  const active = inView && visible && !entered;

  return (
    <section className="film" id="intro" aria-labelledby="film-title" ref={rootRef}>
      <div className="film__stage" ref={viewportRef}>
        <ErrorBoundary label="Opening film" fallback={<OpeningFallback ready />}>
          <CarExperience
            variant="film"
            progressRef={progressRef}
            highlighted={highlight}
            wet
            ground
            lightRig="dark"
            active={active}
            onReady={() => setReady(true)}
          />
        </ErrorBoundary>
        <div className="film__grade" aria-hidden="true" />
      </div>

      <div className="film__content shell">
        <p className="film__brand display h1" id="film-title">
          {BRAND.name}
        </p>
        <p className="film__tag mono">{BRAND.edition}</p>
        <p className="film__statement display h3">{BRAND.tagline}</p>

        <ul className="film__labels">
          {BRAND.intro.map((label, index) => (
            <li key={label}>
              <span className="mono">{String(index + 1).padStart(2, '0')}</span>
              <span>{label}</span>
            </li>
          ))}
        </ul>

        <div className="film__enter">
          <button type="button" className="btn btn--primary btn--lg" onClick={enter}>
            Enter the grid
            <ArrowRight size={16} aria-hidden="true" />
          </button>
          <button type="button" className="btn btn--ghost" onClick={skip}>
            <FastForward size={14} aria-hidden="true" />
            Skip intro
          </button>
        </div>
      </div>

      {!ready && (
        <p className="film__loading mono" aria-live="polite">
          Initialising renderer…
        </p>
      )}
    </section>
  );
}

/** Static stand-in used when WebGL is unavailable or the 3D layer fails. */
function OpeningFallback({ ready = false }: { ready?: boolean }) {
  return (
    <div className="film__fallback">
      <ImageFrame imageKey="hero-0" alt="Motorsport reference photograph" ratio="16 / 9" priority />
      {!ready && <p className="mono">Static image — interactive 3D is unavailable in this browser.</p>}
    </div>
  );
}
