// Interactive car viewer: orbit, camera presets, liveries, environments, a light
// rig switch, exploded view, hotspot annotations and fullscreen.

import { useEffect, useRef, useState } from 'react';
import { Crosshair, Expand, Minimize2, RotateCcw, RotateCw } from 'lucide-react';
import { CarExperience, type LightRig } from '../three/CarExperience';
import { ErrorBoundary, ImageFrame } from '../components/ui';
import { CAMERA_PRESETS, ENV_PRESETS, HOTSPOTS, LIVERIES, type PartId } from '../data/car';
import { useQuality } from '../lib/quality';
import { useDocumentVisible, useFrameLoop, useOnScreen } from '../lib/motion';
import { damp } from '../lib/format';

const LIGHT_RIGS: { id: LightRig; label: string }[] = [
  { id: 'studio', label: 'Studio' },
  { id: 'key', label: 'Hard key' },
  { id: 'dark', label: 'Low key' },
];

export function CarViewer() {
  const { gpu } = useQuality();
  const [presetId, setPresetId] = useState(CAMERA_PRESETS[0].id);
  const [liveryIndex, setLiveryIndex] = useState(0);
  const [envId, setEnvId] = useState(ENV_PRESETS[0].id);
  const [rig, setRig] = useState<LightRig>('studio');
  const [exploded, setExploded] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [hotspot, setHotspot] = useState<PartId | null>(null);
  const [viewToken, setViewToken] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const explodeRef = useRef(0);
  const [frameRef, inView] = useOnScreen<HTMLDivElement>({ rootMargin: '320px' });
  const visible = useDocumentVisible();

  // The explosion amount lives outside React state so the slider/switch can be
  // animated smoothly without re-rendering the scene graph.
  useFrameLoop(
    (dt) => {
      explodeRef.current = damp(explodeRef.current, exploded ? 1 : 0, 3.2, dt);
    },
    inView && visible,
  );

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const preset = CAMERA_PRESETS.find((entry) => entry.id === presetId) ?? CAMERA_PRESETS[0];
  const livery = LIVERIES[liveryIndex];
  const activeHotspot = HOTSPOTS.find((entry) => entry.id === hotspot) ?? null;

  const reset = () => {
    setPresetId(CAMERA_PRESETS[0].id);
    setViewToken((value) => value + 1);
    setExploded(false);
    setAutoRotate(false);
    setHotspot(null);
  };

  const toggleFullscreen = () => {
    const node = stageRef.current;
    if (!node) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void node.requestFullscreen?.().catch(() => {});
    }
  };

  return (
    <div className="viewer" ref={frameRef}>
      <div className="viewer__stage" ref={stageRef}>
        <ErrorBoundary label="Car viewer" fallback={<ViewerFallback />}>
          <CarExperience
            variant="viewer"
            view={{ position: preset.position, target: preset.target }}
            viewKey={`${presetId}:${viewToken}`}
            livery={livery}
            environmentId={envId}
            highlighted={hotspot}
            explodeRef={explodeRef}
            hotspots
            activeHotspot={hotspot}
            onHotspot={(id) => setHotspot((current) => (current === id ? null : id))}
            autoRotate={autoRotate}
            zoomedOut
            active={inView && visible}
          />
        </ErrorBoundary>

        <div className="viewer__hud">
          <span className="mono">
            {preset.label} · {livery.name}
          </span>
          <div className="row gap-8">
            <button
              type="button"
              className={`btn btn--icon${autoRotate ? ' is-on' : ''}`}
              aria-pressed={autoRotate}
              onClick={() => setAutoRotate((value) => !value)}
              title="Auto-rotate"
            >
              <RotateCw size={15} aria-hidden="true" />
              <span className="sr-only">Toggle auto-rotate</span>
            </button>
            <button
              type="button"
              className="btn btn--icon"
              onClick={reset}
              title="Reset view"
            >
              <Crosshair size={15} aria-hidden="true" />
              <span className="sr-only">Reset camera and options</span>
            </button>
            <button
              type="button"
              className="btn btn--icon"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={15} aria-hidden="true" /> : <Expand size={15} aria-hidden="true" />}
              <span className="sr-only">{isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}</span>
            </button>
          </div>
        </div>

        {activeHotspot && (
          <article className="viewer__note" aria-live="polite">
            <header>
              <span className="mono">{activeHotspot.value}</span>
              <button type="button" className="btn btn--icon" onClick={() => setHotspot(null)} aria-label="Close annotation">
                <Minimize2 size={13} aria-hidden="true" />
              </button>
            </header>
            <h3 className="h4">{activeHotspot.label}</h3>
            <p className="copy">{activeHotspot.body}</p>
          </article>
        )}

        {!gpu.webgl && <ViewerFallback />}
      </div>

      <div className="viewer__controls panel panel__pad">
        <div className="control">
          <span className="mono">Camera</span>
          <div className="control__row">
            {CAMERA_PRESETS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={`chip${presetId === entry.id ? ' is-on' : ''}`}
                aria-pressed={presetId === entry.id}
                onClick={() => setPresetId(entry.id)}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>

        <div className="control">
          <span className="mono">Livery</span>
          <div className="control__row">
            {LIVERIES.map((entry, index) => (
              <button
                key={entry.id}
                type="button"
                className={`chip${liveryIndex === index ? ' is-on' : ''}`}
                aria-pressed={liveryIndex === index}
                onClick={() => setLiveryIndex(index)}
              >
                <span className="chip__swatch" style={{ background: entry.panel }} aria-hidden="true" />
                {entry.name}
              </button>
            ))}
          </div>
        </div>

        <div className="control">
          <span className="mono">Environment</span>
          <div className="control__row">
            {ENV_PRESETS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={`chip${envId === entry.id ? ' is-on' : ''}`}
                aria-pressed={envId === entry.id}
                onClick={() => setEnvId(entry.id)}
                title={entry.note}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>

        <div className="control">
          <span className="mono">Lighting</span>
          <div className="control__row">
            {LIGHT_RIGS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={`chip${rig === entry.id ? ' is-on' : ''}`}
                aria-pressed={rig === entry.id}
                onClick={() => setRig(entry.id)}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>

        <div className="control control--switches">
          <span className="mono">View</span>
          <div className="control__row">
            <button
              type="button"
              className={`chip${exploded ? ' is-on' : ''}`}
              aria-pressed={exploded}
              onClick={() => setExploded((value) => !value)}
            >
              Exploded
            </button>
            <button
              type="button"
              className={`chip${hotspot ? ' is-on' : ''}`}
              aria-pressed={Boolean(hotspot)}
              onClick={() => setHotspot((current) => (current ? null : 'frontWing'))}
            >
              Annotations
            </button>
            <button type="button" className="chip" onClick={reset}>
              <RotateCcw size={12} aria-hidden="true" />
              Reset
            </button>
          </div>
        </div>

        <p className="copy viewer__hint">
          Drag to orbit, scroll or pinch to zoom. Half the wing, floor and suspension detail only reads at an angle —
          try the low, rear and overhead presets.
        </p>
      </div>
    </div>
  );
}

function ViewerFallback() {
  return (
    <div className="film__fallback">
      <ImageFrame imageKey="cars-2" alt="Open-wheel car reference photograph" ratio="16 / 9" />
      <p className="mono">Static photograph — interactive 3D is unavailable in this browser.</p>
    </div>
  );
}
