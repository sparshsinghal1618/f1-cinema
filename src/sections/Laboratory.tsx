// Section 02 — Engineering Laboratory.
//
// Selecting a component animates the camera to a framing chosen for that part,
// tints it, and pulls up the written explanation, metrics and (where a suitable
// photograph exists) a reference diagram. The exploded view and the airflow
// overlay are both driven without re-rendering the scene.

import { useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Wind } from 'lucide-react';
import { CarExperience, type CameraView } from '../three/CarExperience';
import { ErrorBoundary, ImageFrame, SectionHeader, StatList, revealIndex, useRevealGroup } from '../components/ui';
import { LAB_COMPONENTS, type LabComponent, type PartId } from '../data/car';
import { useDocumentVisible, useFrameLoop, useOnScreen } from '../lib/motion';
import { useQuality } from '../lib/quality';
import { damp } from '../lib/format';

/** Where each component sits, in car-space metres, so focus views aim sensibly. */
const FOCUS_TARGETS: Record<string, [number, number, number]> = {
  frontWing: [2.45, 0.2, 0],
  rearWing: [-2.3, 0.85, 0],
  wheelRL: [-1.65, 0.36, 0.78],
  suspensionFront: [1.5, 0.42, 0.62],
  cockpit: [0.1, 0.74, 0],
  brakes: [1.65, 0.34, 0.8],
  floor: [-0.15, 0.06, 0],
  diffuser: [-2.45, 0.22, 0],
  coolingInlet: [0.3, 0.5, 0.55],
};

const deg = (value: number) => (value * Math.PI) / 180;

/** Spherical framing (azimuth from +X, elevation from the horizontal) to vectors. */
function focusView(component: LabComponent): CameraView {
  const target = FOCUS_TARGETS[component.id] ?? [0, 0.4, 0];
  const { azimuth, elevation, distance } = component.view;
  const horizontal = Math.cos(deg(elevation)) * distance;
  return {
    position: [
      target[0] + Math.cos(deg(azimuth)) * horizontal,
      target[1] + Math.sin(deg(elevation)) * distance,
      target[2] + Math.sin(deg(azimuth)) * horizontal,
    ],
    target,
  };
}

export function Laboratory() {
  const { gpu } = useQuality();
  const [selectedId, setSelectedId] = useState<string>(LAB_COMPONENTS[0].id);
  const [exploded, setExploded] = useState(false);
  const [airflow, setAirflow] = useState(false);
  const [viewToken, setViewToken] = useState(0);

  const explodeRef = useRef(0);
  const [stageRef, inView] = useOnScreen<HTMLDivElement>({ rootMargin: '300px' });
  const visible = useDocumentVisible();
  const panel = useRevealGroup<HTMLDivElement>(90);

  const index = LAB_COMPONENTS.findIndex((entry) => entry.id === selectedId);
  const component = LAB_COMPONENTS[index] ?? LAB_COMPONENTS[0];
  const view = useMemo(() => focusView(component), [component]);

  const groups = useMemo(() => {
    const map = new Map<string, LabComponent[]>();
    for (const entry of LAB_COMPONENTS) {
      const list = map.get(entry.group) ?? [];
      list.push(entry);
      map.set(entry.group, list);
    }
    return Array.from(map.entries());
  }, []);

  useFrameLoop(
    (dt) => {
      explodeRef.current = damp(explodeRef.current, exploded ? 1 : 0, 3.2, dt);
    },
    inView && visible,
  );

  const step = (delta: number) => {
    const next = (index + delta + LAB_COMPONENTS.length) % LAB_COMPONENTS.length;
    setSelectedId(LAB_COMPONENTS[next].id);
  };

  const reset = () => {
    setExploded(false);
    setAirflow(false);
    setViewToken((value) => value + 1);
  };

  return (
    <section className="section" id="laboratory" aria-labelledby="lab-title">
      <div className="shell section__head">
        <SectionHeader
          index="02"
          eyebrow="Concept design study"
          title="Laboratory"
          titleId="lab-title"
          lede="Take the car apart. Each station frames one system, tints it and explains what it does and why it is shaped that way."
        />
      </div>

      <div className="shell lab">
        <div className="lab__stage" ref={stageRef}>
          <ErrorBoundary label="Laboratory" fallback={<LabFallback />}>
            <CarExperience
              variant="lab"
              view={view}
              viewKey={`${component.id}:${viewToken}`}
              highlighted={component.id as PartId}
              explodeRef={explodeRef}
              showAirflow={airflow}
              lightRig="key"
              zoomedOut
              active={inView && visible}
            />
          </ErrorBoundary>

          <div className="lab__hud">
            <span className="mono">{component.group}</span>
            <span className="mono">
              {String(index + 1).padStart(2, '0')} / {String(LAB_COMPONENTS.length).padStart(2, '0')}
            </span>
          </div>

          {airflow && (
            <p className="lab__flag mono">
              <Wind size={12} aria-hidden="true" />
              Conceptual airflow visualisation — illustrative streamlines, not a CFD solution.
            </p>
          )}

          <div className="lab__stage-controls">
            <button type="button" className="btn btn--icon" onClick={() => step(-1)} aria-label="Previous component">
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <button type="button" className="btn btn--icon" onClick={() => step(1)} aria-label="Next component">
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div ref={panel.ref} className={`lab__panel ${panel.className}`} style={panel.style}>
          <nav className="lab__list" aria-label="Components" style={revealIndex(0)}>
            {groups.map(([group, entries]) => (
              <div className="lab__group" key={group}>
                <span className="mono">{group}</span>
                <ul>
                  {entries.map((entry) => (
                    <li key={entry.id}>
                      <button
                        type="button"
                        className={`lab__item${entry.id === component.id ? ' is-on' : ''}`}
                        aria-current={entry.id === component.id ? 'true' : undefined}
                        onClick={() => setSelectedId(entry.id)}
                      >
                        {entry.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <article className="lab__detail panel panel__pad" aria-live="polite" style={revealIndex(1)}>
            <p className="mono">{component.group}</p>
            <h3 className="h4">{component.name}</h3>
            <p className="lab__summary">{component.summary}</p>
            <p className="copy">{component.detail}</p>

            <StatList items={component.metrics.map((metric) => ({ label: metric.label, value: metric.value }))} />

            <div className="lab__diagram">
              <ImageFrame
                imageKey={component.diagram}
                alt={`${component.name} reference photograph`}
                ratio="4 / 3"
              />
              <span className="mono">Reference photograph, not this model</span>
            </div>
          </article>

          <div className="lab__tools panel panel__pad" style={revealIndex(2)}>
            <div className="control">
              <span className="mono">Display</span>
              <div className="control__row">
                <button
                  type="button"
                  className={`chip${exploded ? ' is-on' : ''}`}
                  aria-pressed={exploded}
                  onClick={() => setExploded((value) => !value)}
                >
                  Exploded view
                </button>
                <button
                  type="button"
                  className={`chip${airflow ? ' is-on' : ''}`}
                  aria-pressed={airflow}
                  onClick={() => setAirflow((value) => !value)}
                >
                  <Wind size={12} aria-hidden="true" />
                  Airflow
                </button>
                <button type="button" className="chip" onClick={reset}>
                  Reset view
                </button>
              </div>
            </div>

            <p className="copy">
              The exploded view separates the parts that are genuinely separate objects in this model — wings, floor,
              diffuser, wheels, suspension and bodywork. Components that share one surface do not pull apart.
            </p>
            {!gpu.webgl && (
              <p className="copy">Interactive 3D is unavailable in this browser, so the written stations are shown alone.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function LabFallback() {
  return (
    <div className="film__fallback">
      <ImageFrame imageKey="cars-3" alt="Cockpit reference photograph" ratio="16 / 9" />
      <p className="mono">Static photograph — the interactive laboratory needs WebGL.</p>
    </div>
  );
}
