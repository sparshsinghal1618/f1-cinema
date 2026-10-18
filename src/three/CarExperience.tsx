// The car experience. One canvas, four presentation modes:
//
//   film     — the opening sequence, driven by a 0..1 progress ref
//   showcase — the scroll story, driven by the same kind of progress ref
//   viewer   — free orbit with camera presets, liveries and hotspots
//   lab      — framing that animates to whichever component is selected
//
// The two playback modes read their progress value every frame rather than
// storing it in React state, so a long camera move costs no re-renders.

import { Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Html, MeshReflectorMaterial, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { RaceCar, type PartRegistry } from './RaceCar';
import { Airflow } from './Airflow';
import { Effects } from './Effects';
import { assetUrl } from '../lib/assets';
import {
  ENV_PRESETS,
  HOTSPOTS,
  LIVERIES,
  SHOWCASE_STEPS,
  type Livery,
  type PartId,
} from '../data/car';
import { useQuality, type QualitySettings } from '../lib/quality';

export type CarVariant = 'film' | 'showcase' | 'viewer' | 'lab';
export type LightRig = 'studio' | 'key' | 'dark';
export type NumericRef = { current: number };

export interface CameraView {
  position: [number, number, number];
  target: [number, number, number];
}

/* ------------------------------------------------------------------ helpers */

const clamp01 = (value: number): number => (value < 0 ? 0 : value > 1 ? 1 : value);
const smoothstep = (t: number): number => t * t * (3 - 2 * t);

function sampleVector(points: THREE.Vector3[], u: number, out: THREE.Vector3): THREE.Vector3 {
  const last = points.length - 1;
  const scaled = clamp01(u) * last;
  const index = Math.min(last - 1, Math.max(0, Math.floor(scaled)));
  out.lerpVectors(points[index], points[index + 1], smoothstep(scaled - index));
  return out;
}

function sampleNumber(values: number[], u: number): number {
  const last = values.length - 1;
  const scaled = clamp01(u) * last;
  const index = Math.min(last - 1, Math.max(0, Math.floor(scaled)));
  const from = values[index];
  return from + (values[index + 1] - from) * smoothstep(scaled - index);
}

const toVectors = (tuples: [number, number, number][]): THREE.Vector3[] =>
  tuples.map(([x, y, z]) => new THREE.Vector3(x, y, z));

/** Opening film path: floor → wet asphalt → front wing → flank → rear wing. */
const FILM_POSITIONS = toVectors([
  [3.15, 0.1, 0.45],
  [2.05, 0.3, 2.3],
  [3.05, 0.34, 1.05],
  [0.55, 0.85, 2.95],
  [-3.55, 1.25, 1.85],
]);
const FILM_TARGETS = toVectors([
  [2.55, 0.1, 0.15],
  [1.6, 0.16, 0.25],
  [2.6, 0.24, 0.8],
  [-0.1, 0.5, 0.3],
  [-2.4, 0.88, 0.1],
]);
const FILM_FOV = [48, 42, 33, 38, 31];
const FILM_ROLL = [0.01, -0.02, 0.014, -0.026, 0.008];
const FILM_BOOST = [0.1, 0.35, 0.7, 0.85, 0.6];

const STORY_POSITIONS = toVectors(SHOWCASE_STEPS.map((step) => step.camera.position));
const STORY_TARGETS = toVectors(SHOWCASE_STEPS.map((step) => step.camera.target));
const STORY_BOOST = SHOWCASE_STEPS.map((step) => step.lightBoost);

/* ----------------------------------------------------------------- lighting */

interface RigLevels {
  ambient: number;
  key: number;
  rim: number;
  fill: number;
}

const LIGHT_RIGS: Record<LightRig, RigLevels> = {
  studio: { ambient: 0.34, key: 2.5, rim: 0.75, fill: 0.5 },
  key: { ambient: 0.16, key: 3.2, rim: 0.95, fill: 0.22 },
  dark: { ambient: 0.04, key: 0.9, rim: 0.3, fill: 0.04 },
};

function Lighting({
  rig,
  boostRef,
  quality,
}: {
  rig: LightRig;
  boostRef: NumericRef;
  quality: QualitySettings;
}) {
  const levels = LIGHT_RIGS[rig];
  const keyRef = useRef<THREE.DirectionalLight>(null);
  const rimRef = useRef<THREE.DirectionalLight>(null);

  useFrame(() => {
    const boost = 1 + boostRef.current * 0.55;
    if (keyRef.current) keyRef.current.intensity = levels.key * boost;
    if (rimRef.current) rimRef.current.intensity = levels.rim * boost;
  });

  return (
    <>
      <ambientLight intensity={levels.ambient} />
      <hemisphereLight args={['#8ea4c0', '#07080a', 0.26]} />
      <directionalLight
        ref={keyRef}
        position={[5.5, 7.5, 3.5]}
        intensity={levels.key}
        castShadow={quality.shadows}
        shadow-mapSize-width={quality.shadowMapSize}
        shadow-mapSize-height={quality.shadowMapSize}
        shadow-bias={-0.0007}
        shadow-normalBias={0.022}
      >
        <orthographicCamera attach="shadow-camera" args={[-7, 7, 7, -7, 0.5, 30]} />
      </directionalLight>
      <directionalLight ref={rimRef} position={[-6, 3.4, -4.2]} intensity={levels.rim} color="#ffd9cf" />
      <directionalLight position={[0.4, 2.2, -7]} intensity={levels.fill} color="#8fb6ff" />
      <pointLight position={[2.4, 0.5, 1.7]} intensity={1.1} distance={4.5} color="#e10600" />
    </>
  );
}

/* ------------------------------------------------------------------- ground */

function Ground({
  wet,
  quality,
  environmentTint,
}: {
  wet: boolean;
  quality: QualitySettings;
  environmentTint: string;
}) {
  if (wet && quality.preset !== 'eco') {
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[140, 140]} />
        <MeshReflectorMaterial
          resolution={quality.reflectionRes}
          blur={[420, 120]}
          mixBlur={1.1}
          mixStrength={2.6}
          depthScale={1.1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.5}
          roughness={0.72}
          metalness={0.55}
          mirror={0.38}
          color={environmentTint}
        />
      </mesh>
    );
  }

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[46, 64]} />
      <meshStandardMaterial color={environmentTint} roughness={0.92} metalness={0.06} />
    </mesh>
  );
}

/* -------------------------------------------------------------- environment */

function EnvironmentRig({ files, background, exposure }: { files: string; background: boolean; exposure: number }) {
  const scene = useThree((state) => state.scene);
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    scene.environmentIntensity = exposure;
    gl.toneMappingExposure = exposure;
  }, [scene, gl, exposure]);

  return (
    <Environment
      files={assetUrl(files)}
      background={background}
      backgroundBlurriness={0.55}
      backgroundIntensity={0.55}
    />
  );
}

/* ------------------------------------------------------------ camera rigs */

function FilmCamera({ progressRef, boostRef }: { progressRef: NumericRef; boostRef: NumericRef }) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const scene = useThree((state) => state.scene);
  const position = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    elapsed.current += Math.min(delta, 0.05);
    const u = clamp01(progressRef.current);
    sampleVector(FILM_POSITIONS, u, position);
    sampleVector(FILM_TARGETS, u, target);

    // A very small amount of drift keeps the move from feeling like a CAD turntable.
    const breathe = Math.min(1, u * 3);
    position.x += Math.sin(elapsed.current * 0.42) * 0.012 * breathe;
    position.y += Math.cos(elapsed.current * 0.31) * 0.009 * breathe;

    camera.position.copy(position);
    camera.lookAt(target);
    camera.rotation.z += sampleNumber(FILM_ROLL, u);

    const fov = sampleNumber(FILM_FOV, u);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    boostRef.current = sampleNumber(FILM_BOOST, u);

    if (scene.fog instanceof THREE.Fog) {
      scene.fog.near = 1.6 + u * 5.5;
      scene.fog.far = 13 + u * 34;
    }
  });

  return null;
}

function StoryCamera({ progressRef, boostRef }: { progressRef: NumericRef; boostRef: NumericRef }) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const scene = useThree((state) => state.scene);
  const position = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const u = clamp01(progressRef.current);
    sampleVector(STORY_POSITIONS, u, position);
    sampleVector(STORY_TARGETS, u, target);
    camera.position.copy(position);
    camera.lookAt(target);

    const fov = 38 - u * 4;
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    boostRef.current = sampleNumber(STORY_BOOST, u);

    if (scene.fog instanceof THREE.Fog) {
      scene.fog.near = 6 + u * 6;
      scene.fog.far = 40 + u * 30;
    }
  });

  return null;
}

type OrbitImpl = React.ComponentRef<typeof OrbitControls>;

function OrbitRig({
  view,
  viewKey,
  autoRotate,
  enabled,
  minDistance,
  maxDistance,
}: {
  view?: CameraView;
  viewKey: string | number;
  autoRotate: boolean;
  enabled: boolean;
  minDistance: number;
  maxDistance: number;
}) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const controlsRef = useRef<OrbitImpl | null>(null);
  const animation = useRef<{
    fromPosition: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toPosition: THREE.Vector3;
    toTarget: THREE.Vector3;
    t: number;
  } | null>(null);

  const key = view ? `${view.position.join(',')}|${view.target.join(',')}|${viewKey}` : '';

  // OrbitControls does not own the target until it has mounted, so the starting
  // framing is applied once here and animated from then on.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    if (view) {
      camera.position.set(...view.position);
      controls.target.set(...view.target);
    } else {
      controls.target.set(0, 0.45, 0);
    }
    camera.lookAt(controls.target);
    controls.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!view || !key) return;
    const controls = controlsRef.current;
    if (!controls) return;
    animation.current = {
      fromPosition: camera.position.clone(),
      fromTarget: controls.target.clone(),
      toPosition: new THREE.Vector3(...view.position),
      toTarget: new THREE.Vector3(...view.target),
      t: 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    const state = animation.current;
    if (!controls || !state) return;
    state.t = Math.min(1, state.t + delta / 1.05);
    const eased = smoothstep(state.t);
    camera.position.lerpVectors(state.fromPosition, state.toPosition, eased);
    controls.target.lerpVectors(state.fromTarget, state.toTarget, eased);
    camera.lookAt(controls.target);
    controls.update();
    if (state.t >= 1) animation.current = null;
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={enabled}
      enableDamping
      dampingFactor={0.075}
      enablePan={false}
      minDistance={minDistance}
      maxDistance={maxDistance}
      minPolarAngle={0.05}
      maxPolarAngle={Math.PI / 2 + 0.05}
      autoRotate={autoRotate}
      autoRotateSpeed={0.55}
    />
  );
}

/* ----------------------------------------------------------------- hotspots */

function HotspotLayer({
  activeId,
  onSelect,
}: {
  activeId: PartId | null;
  onSelect: (id: PartId) => void;
}) {
  return (
    <>
      {HOTSPOTS.map((hotspot) => (
        <Html
          key={hotspot.id}
          position={hotspot.position}
          center
          distanceFactor={5.6}
          zIndexRange={[30, 10]}
          style={{ pointerEvents: 'none' }}
        >
          <button
            type="button"
            className={`hotspot${activeId === hotspot.id ? ' is-active' : ''}`}
            style={{ pointerEvents: 'auto' }}
            onClick={() => onSelect(hotspot.id)}
            aria-label={`${hotspot.label}: ${hotspot.value}`}
          >
            <span className="hotspot__dot" aria-hidden="true" />
            <span className="hotspot__label">
              <strong>{hotspot.label}</strong>
              <em className="mono">{hotspot.value}</em>
            </span>
          </button>
        </Html>
      ))}
    </>
  );
}

/* -------------------------------------------------------------------- scene */

interface SceneProps {
  variant: CarVariant;
  progressRef: NumericRef;
  boostRef: NumericRef;
  view?: CameraView;
  viewKey: string | number;
  livery: Livery;
  environmentId: string;
  highlighted: PartId | null;
  explodeRef: NumericRef;
  steer: number;
  wheelSpin: number;
  brakeGlow: number;
  showAirflow: boolean;
  wet: boolean;
  ground: boolean;
  lightRig: LightRig;
  hotspots: boolean;
  autoRotate: boolean;
  zoomedOut: boolean;
  quality: QualitySettings;
  registryRef: { current: PartRegistry };
  activeHotspot: PartId | null;
  onHotspot?: (id: PartId) => void;
}

function Scene({
  variant,
  progressRef,
  boostRef,
  view,
  viewKey,
  livery,
  environmentId,
  highlighted,
  explodeRef,
  steer,
  wheelSpin,
  brakeGlow,
  showAirflow,
  wet,
  ground,
  lightRig,
  hotspots,
  autoRotate,
  zoomedOut,
  quality,
  registryRef,
  activeHotspot,
  onHotspot,
}: SceneProps) {
  const preset = ENV_PRESETS.find((entry) => entry.id === environmentId) ?? ENV_PRESETS[0];

  return (
    <>
      <EnvironmentRig files={preset.hdri} background={preset.background} exposure={preset.exposure} />
      <Lighting rig={lightRig} boostRef={boostRef} quality={quality} />

      {variant === 'film' && <fog attach="fog" args={[0x05060a, 1.6, 13]} />}
      {variant === 'showcase' && <fog attach="fog" args={[preset.tint, 6, 40]} />}

      {ground && <Ground wet={wet} quality={quality} environmentTint={preset.tint} />}

      <RaceCar
        livery={livery}
        quality={quality}
        highlighted={highlighted}
        explodeRef={explodeRef}
        registryRef={registryRef}
        steer={steer}
        wheelSpin={wheelSpin}
        brakeGlow={brakeGlow}
      />

      {showAirflow && <Airflow particles={quality.particles} />}
      {hotspots && onHotspot && <HotspotLayer activeId={activeHotspot} onSelect={onHotspot} />}
      {quality.post && <Effects />}

      {variant === 'film' || variant === 'showcase' ? (
        variant === 'film' ? (
          <FilmCamera progressRef={progressRef} boostRef={boostRef} />
        ) : (
          <StoryCamera progressRef={progressRef} boostRef={boostRef} />
        )
      ) : (
        <OrbitRig
          view={view}
          viewKey={viewKey}
          autoRotate={autoRotate}
          enabled
          minDistance={zoomedOut ? 2.4 : 1.05}
          maxDistance={zoomedOut ? 28 : 14}
        />
      )}
    </>
  );
}

/* --------------------------------------------------------------- experience */

export interface CarExperienceProps {
  variant: CarVariant;
  /** 0..1 playback for the film and scroll story. */
  progressRef?: NumericRef;
  className?: string;
  livery?: Livery;
  environmentId?: string;
  highlighted?: PartId | null;
  /** Explosion amount, 0..1, applied without re-rendering. */
  explodeRef?: NumericRef;
  view?: CameraView;
  /** Bump to re-run the camera move to the current `view`. */
  viewKey?: string | number;
  steer?: number;
  wheelSpin?: number;
  brakeGlow?: number;
  showAirflow?: boolean;
  wet?: boolean;
  ground?: boolean;
  lightRig?: LightRig;
  hotspots?: boolean;
  activeHotspot?: PartId | null;
  onHotspot?: (id: PartId) => void;
  autoRotate?: boolean;
  zoomedOut?: boolean;
  /** Pause the render loop while the section is off-screen or the tab is hidden. */
  active?: boolean;
  /** Fires once the WebGL renderer is live, before the environment finishes loading. */
  onReady?: () => void;
  children?: ReactNode;
}

export function CarExperience({
  variant,
  progressRef,
  className = '',
  livery = LIVERIES[0],
  environmentId = 'studio',
  highlighted = null,
  explodeRef,
  view,
  viewKey = 0,
  steer = 0,
  wheelSpin = 0,
  brakeGlow = 0,
  showAirflow = false,
  wet = false,
  ground = true,
  lightRig = 'studio',
  hotspots = false,
  activeHotspot = null,
  onHotspot,
  autoRotate = false,
  zoomedOut = false,
  active = true,
  onReady,
  children,
}: CarExperienceProps) {
  const { settings, gpu } = useQuality();
  const boostRef = useRef(0);
  const idleProgress = useRef(variant === 'film' ? 0 : 1);
  const idleExplode = useRef(0);
  const registryRef = useRef<PartRegistry>(new Map<PartId, THREE.Object3D>());

  const progress = progressRef ?? idleProgress;
  const explode = explodeRef ?? idleExplode;

  const initialCamera = useMemo<[number, number, number]>(() => {
    if (variant === 'film') return FILM_POSITIONS[0].toArray() as [number, number, number];
    if (variant === 'showcase') return SHOWCASE_STEPS[0].camera.position;
    return (view?.position ?? [4.6, 2.1, 4.3]) as [number, number, number];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  if (!gpu.webgl) return null;

  return (
    <Canvas
      className={`scene ${className}`.trim()}
      dpr={settings.dpr}
      shadows={settings.shadows ? 'soft' : false}
      frameloop={active ? 'always' : 'never'}
      camera={{ fov: 38, near: 0.05, far: 240, position: initialCamera }}
      gl={{
        antialias: settings.preset !== 'eco',
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color('#050506'));
        onReady?.();
      }}
    >
      <Suspense fallback={null}>
        <Scene
          variant={variant}
          progressRef={progress}
          boostRef={boostRef}
          view={view}
          viewKey={viewKey}
          livery={livery}
          environmentId={environmentId}
          highlighted={highlighted}
          explodeRef={explode}
          steer={steer}
          wheelSpin={wheelSpin}
          brakeGlow={brakeGlow}
          showAirflow={showAirflow}
          wet={wet}
          ground={ground}
          lightRig={lightRig}
          hotspots={hotspots}
          autoRotate={autoRotate}
          zoomedOut={zoomedOut}
          quality={settings}
          registryRef={registryRef}
          activeHotspot={activeHotspot}
          onHotspot={onHotspot}
        />
      </Suspense>
      {children}
    </Canvas>
  );
}
