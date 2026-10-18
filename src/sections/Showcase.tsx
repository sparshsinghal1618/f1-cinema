// Section 01 — The Car.
//
// A nine-station scroll story drives a scripted camera through one pinned
// canvas, followed by a free interactive viewer. The story reads a progress ref
// every frame and only re-renders when the station actually changes.

import { useEffect, useRef, useState } from 'react';
import { CarExperience } from '../three/CarExperience';
import { CarViewer } from './CarViewer';
import { ErrorBoundary, ImageFrame, SectionHeader, revealIndex, useReveal, useRevealGroup } from '../components/ui';
import { SHOWCASE_STEPS } from '../data/car';
import { CONCEPT_NOTE } from '../data/site';
import { ScrollTrigger, scrollTriggerSafe } from '../lib/gsap';
import { useDocumentVisible, useOnScreen, useReducedMotion } from '../lib/motion';
import { useQuality } from '../lib/quality';

function StoryFallback() {
  return (
    <div className="film__fallback">
      <ImageFrame imageKey="cars-4" alt="Open-wheel car reference photograph" ratio="16 / 9" />
      <p className="mono">Static photograph — the scroll story needs WebGL in this browser.</p>
    </div>
  );
}

/** Reduced-motion / no-WebGL presentation: the nine stations as a plain list. */
function StoryStatic() {
  const grid = useRevealGroup<HTMLDivElement>(90);
  return (
    <div ref={grid.ref} className={`shell story__static ${grid.className}`} style={grid.style}>
      {SHOWCASE_STEPS.map((step, index) => (
        <article key={step.id} className="panel panel__pad" style={revealIndex(index)}>
          <p className="mono">{step.kicker}</p>
          <h3 className="h4">{step.title}</h3>
          <p className="copy">{step.body}</p>
        </article>
      ))}
    </div>
  );
}

export function Showcase() {
  const { gpu } = useQuality();
  const reduced = useReducedMotion();
  const visible = useDocumentVisible();

  const progressRef = useRef(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [storyRef, storyInView] = useOnScreen<HTMLDivElement>({ rootMargin: '260px' });
  const subhead = useReveal<HTMLDivElement>();

  const step = SHOWCASE_STEPS[stepIndex];
  const staticFallback = !gpu.webgl || reduced;

  useEffect(() => {
    const node = storyRef.current;
    if (staticFallback || !node) {
      progressRef.current = 1;
      return;
    }

    node.style.setProperty(
      '--story-track',
      window.matchMedia('(max-width: 860px)').matches ? '540vh' : '760vh',
    );

    const trigger = ScrollTrigger.create({
      trigger: node,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        progressRef.current = self.progress;
        const next = Math.min(
          SHOWCASE_STEPS.length - 1,
          Math.max(0, Math.round(self.progress * (SHOWCASE_STEPS.length - 1))),
        );
        setStepIndex((current) => (current === next ? current : next));
      },
    });

    scrollTriggerSafe(() => ScrollTrigger.refresh());
    return () => trigger.kill();
  }, [staticFallback, storyRef]);

  const goToStation = (index: number) => {
    const node = storyRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const span = rect.height - window.innerHeight;
    const top = window.scrollY + rect.top + (span * index) / (SHOWCASE_STEPS.length - 1);
    window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
  };

  return (
    <section className="section section--flush" id="showcase" aria-labelledby="showcase-title">
      <div className="shell section__head">
        <SectionHeader
          index="01"
          eyebrow={CONCEPT_NOTE}
          title="The Car"
          titleId="showcase-title"
          lede="Nine stations through a design that exists only here. Every surface is modelled procedurally in the browser — no downloaded car file, no scan."
        />
      </div>

      {staticFallback ? (
        <StoryStatic />
      ) : (
        <div className="story" ref={storyRef}>
          <div className="story__sticky">
            <ErrorBoundary label="Scroll story" fallback={<StoryFallback />}>
              <CarExperience
                variant="showcase"
                progressRef={progressRef}
                highlighted={step.focus}
                ground
                lightRig="dark"
                active={storyInView && visible}
              />
            </ErrorBoundary>
            <div className="story__grade" aria-hidden="true" />

            <div className="story__hud shell">
              <span className="mono" aria-hidden="true">
                {step.index} / 09
              </span>
              <span className="mono">{step.kicker}</span>
            </div>

            <div className="story__panel shell">
              <h3 className="display h3">{step.title}</h3>
              <p className="story__body">{step.body}</p>
              <ol className="story__rail" aria-label="Story stations">
                {SHOWCASE_STEPS.map((entry, index) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className={`story__dot${index === stepIndex ? ' is-current' : ''}`}
                      aria-label={`Station ${entry.index}: ${entry.title}`}
                      aria-current={index === stepIndex ? 'true' : undefined}
                      onClick={() => goToStation(index)}
                    />
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}

      <div className="shell section__block">
        <div ref={subhead.ref} className={`head head--sub ${subhead.className}`} style={subhead.style}>
          <div className="head__meta">
            <span className="head__index">01b</span>
            <hr className="rule grow" />
            <span className="mono">Interactive</span>
          </div>
          <h3 className="display h3">Free view</h3>
        </div>
        <CarViewer />
      </div>
    </section>
  );
}
