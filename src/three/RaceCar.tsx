// The F1 single-seater, modelled procedurally in the browser.
//
// Every surface is generated from the helpers in geometry.ts, which means each
// assembly (front wing, sidepods, floor, diffuser, suspension, cockpit, halo,
// wheels, brakes) is a real, separately transformable object. That is what makes
// the hotspot tour, the engineering laboratory and the exploded view possible.

import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CAR_DIMS, HIGHLIGHT_COLOR, type Livery, type PartId } from '../data/car';
import { aerofoilRing, bodyRing, loft, type Station } from './geometry';
import { brushedMetalTexture, carbonTexture, textDecal, tyreTexture } from './textures';
import type { QualitySettings } from '../lib/quality';

const ALL_PARTS: PartId[] = [
  'monocoque',
  'nose',
  'frontWing',
  'rearWing',
  'floor',
  'diffuser',
  'sidepod',
  'engineCover',
  'halo',
  'cockpit',
  'coolingInlet',
  'brakes',
  'suspensionFront',
  'suspensionRear',
  'wheelFL',
  'wheelFR',
  'wheelRL',
  'wheelRR',
];

const WHEEL_PARTS: PartId[] = ['wheelFL', 'wheelFR', 'wheelRL', 'wheelRR'];

/** Direction each assembly travels in the exploded view, in metres. */
const EXPLODE: Record<PartId, [number, number, number]> = {
  monocoque: [0, 0.15, 0],
  nose: [0.5, 0.25, 0],
  frontWing: [0.55, -0.25, 0],
  rearWing: [-0.55, 0.6, 0],
  floor: [0, -0.5, 0],
  diffuser: [-0.6, -0.35, 0],
  sidepod: [0, 0.05, 0.75],
  engineCover: [-0.2, 0.8, 0],
  halo: [0.15, 0.9, 0],
  cockpit: [0.2, 0.6, 0],
  coolingInlet: [0, 0.1, 0.5],
  brakes: [0, 0.55, 0.3],
  suspensionFront: [0.35, 0.35, 0.15],
  suspensionRear: [-0.35, 0.35, 0.15],
  wheelFL: [0.15, 0.1, 1.2],
  wheelFR: [0.15, 0.1, -1.2],
  wheelRL: [-0.15, 0.1, 1.2],
  wheelRR: [-0.15, 0.1, -1.2],
};

export type PartRegistry = Map<PartId, THREE.Object3D>;

export interface RaceCarProps {
  livery: Livery;
  quality: QualitySettings;
  highlighted?: PartId | null;
  /** 0 = assembled, 1 = fully exploded. Read every frame, so it can be animated outside React. */
  explodeRef?: { current: number };
  registryRef?: { current: PartRegistry };
  /** Wheel rotation speed in radians/second (0 stops the wheels). */
  wheelSpin?: number;
  /** Front wheel steering angle in radians. */
  steer?: number;
  /** Brake disc glow, 0..1. */
  brakeGlow?: number;
  /**
   * Per-frame dynamics used by the simulator. When present it overrides the
   * steering, spin and brake-glow props so the race loop never re-renders the
   * scene graph.
   */
  dynamicsRef?: { current: { steer: number; spin: number; brake: number } };
  children?: ReactNode;
}

interface Kit {
  carbon: THREE.MeshPhysicalMaterial;
  paint: THREE.MeshPhysicalMaterial;
  panel: THREE.MeshPhysicalMaterial;
  accent: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  darkMetal: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  rim: THREE.MeshPhysicalMaterial;
  glass: THREE.MeshPhysicalMaterial;
  interior: THREE.MeshStandardMaterial;
  disc: THREE.MeshStandardMaterial;
}

function createKit(livery: Livery, quality: QualitySettings): Kit {
  const aniso = quality.anisotropy;
  const carbonMap = carbonTexture();
  carbonMap.anisotropy = aniso;
  const tyreMap = tyreTexture();
  tyreMap.anisotropy = aniso;
  const metalMap = brushedMetalTexture();
  metalMap.anisotropy = aniso;

  return {
    carbon: new THREE.MeshPhysicalMaterial({
      map: carbonMap,
      color: '#ffffff',
      roughness: 0.44,
      metalness: 0.12,
      clearcoat: 1,
      clearcoatRoughness: 0.16,
      envMapIntensity: 1.1,
    }),
    paint: new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(livery.body),
      roughness: 0.2,
      metalness: 0.36,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.35,
    }),
    panel: new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(livery.panel),
      roughness: 0.17,
      metalness: 0.42,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.5,
    }),
    accent: new THREE.MeshStandardMaterial({
      color: new THREE.Color(livery.accent),
      roughness: 0.3,
      metalness: 0.2,
      emissive: new THREE.Color(livery.accent),
      emissiveIntensity: 0.28,
    }),
    metal: new THREE.MeshStandardMaterial({
      map: metalMap,
      color: '#c8cdd4',
      roughness: 0.34,
      metalness: 1,
      envMapIntensity: 1.2,
    }),
    darkMetal: new THREE.MeshStandardMaterial({
      color: '#33373d',
      roughness: 0.52,
      metalness: 0.95,
      envMapIntensity: 0.9,
    }),
    rubber: new THREE.MeshStandardMaterial({
      map: tyreMap,
      color: '#f0f0f0',
      roughness: 0.84,
      metalness: 0.04,
    }),
    rim: new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(livery.rim),
      roughness: 0.26,
      metalness: 0.96,
      clearcoat: 0.7,
      clearcoatRoughness: 0.12,
      envMapIntensity: 1.3,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: '#0a0d12',
      roughness: 0.06,
      metalness: 0.25,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      transparent: true,
      opacity: 0.62,
      envMapIntensity: 1.6,
    }),
    interior: new THREE.MeshStandardMaterial({ color: '#07080a', roughness: 0.9, metalness: 0.1 }),
    disc: new THREE.MeshStandardMaterial({
      color: '#2a2223',
      roughness: 0.45,
      metalness: 0.75,
      emissive: new THREE.Color('#ff3b12'),
      emissiveIntensity: 0,
    }),
  };
}

function cloneKit(kit: Kit): Kit {
  return {
    carbon: kit.carbon.clone(),
    paint: kit.paint.clone(),
    panel: kit.panel.clone(),
    accent: kit.accent.clone(),
    metal: kit.metal.clone(),
    darkMetal: kit.darkMetal.clone(),
    rubber: kit.rubber.clone(),
    rim: kit.rim.clone(),
    glass: kit.glass.clone(),
    interior: kit.interior.clone(),
    disc: kit.disc.clone(),
  };
}

/**
 * Releases the material clones. Textures are intentionally left alone: they come
 * from the module-level caches in textures.ts and are reused by every mount.
 */
function disposeKit(kit: Kit): void {
  for (const material of Object.values(kit)) material.dispose();
}

/** Unit cylinder oriented between two points — the workhorse for suspension links. */
function Rod({
  from,
  to,
  radius,
  material,
}: {
  from: [number, number, number];
  to: [number, number, number];
  radius: number;
  material: THREE.Material;
}) {
  const { position, quaternion, length } = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const dir = new THREE.Vector3().subVectors(end, start);
    const len = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    return { position: mid, quaternion: q, length: len };
  }, [from, to]);

  const geometry = useMemo(() => new THREE.CylinderGeometry(radius, radius, length, 8, 1), [radius, length]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} material={material} position={position} quaternion={quaternion} castShadow />
  );
}

/** Aerodynamic surface swept along the span (wings, beam wing, floor fences). */
function Wing({
  sections,
  material,
  castShadow = true,
}: {
  sections: { z: number; chord: number; thickness: number; camber: number; incidence: number; x: number; y: number }[];
  material: THREE.Material;
  castShadow?: boolean;
}) {
  const geometry = useMemo(() => {
    const stations: Station[] = sections.map((s) => ({
      pos: s.z,
      ring: aerofoilRing(s.chord, s.thickness, s.camber, s.incidence).map(
        ([rx, ry]) => [s.x + (s.chord - rx), ry + s.y] as [number, number],
      ),
    }));
    return loft('z', stations, { capStart: true, capEnd: true });
  }, [sections]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={material} castShadow={castShadow} receiveShadow />;
}

/** Flat panel with a decal texture on both faces. */
function Decal({
  texture,
  width,
  height,
  position,
  rotation,
}: {
  texture: THREE.Texture;
  width: number;
  height: number;
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.02,
        roughness: 0.35,
        metalness: 0.1,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        side: THREE.DoubleSide,
      }),
    [texture],
  );
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh position={position} rotation={rotation} material={material}>
      <planeGeometry args={[width, height]} />
    </mesh>
  );
}

function Wheel({
  position,
  radius,
  width,
  side,
  kit,
  spinRef,
}: {
  position: [number, number, number];
  radius: number;
  width: number;
  side: 1 | -1;
  kit: Kit;
  spinRef: { current: number };
}) {
  const inner = useRef<THREE.Group>(null);

  const tyreGeometry = useMemo(() => {
    const half = width / 2;
    const points = [
      new THREE.Vector2(0.155, -half),
      new THREE.Vector2(0.2, -half),
      new THREE.Vector2(radius - 0.045, -half + 0.035),
      new THREE.Vector2(radius - 0.006, -half + 0.09),
      new THREE.Vector2(radius, -half + 0.17),
      new THREE.Vector2(radius, half - 0.17),
      new THREE.Vector2(radius - 0.006, half - 0.09),
      new THREE.Vector2(radius - 0.045, half - 0.035),
      new THREE.Vector2(0.2, half),
      new THREE.Vector2(0.155, half),
    ];
    const geometry = new THREE.LatheGeometry(points, 44);
    geometry.rotateX(Math.PI / 2);
    return geometry;
  }, [radius, width]);

  const rimGeometry = useMemo(() => {
    const geometry = new THREE.CylinderGeometry(0.155, 0.155, width * 0.86, 32, 1, false);
    geometry.rotateX(Math.PI / 2);
    return geometry;
  }, [width]);

  const coverGeometry = useMemo(() => {
    const geometry = new THREE.CylinderGeometry(0.152, 0.152, 0.014, 32, 1);
    geometry.rotateX(Math.PI / 2);
    return geometry;
  }, []);

  const spokeGeometry = useMemo(() => {
    const geometry = new THREE.BoxGeometry(0.05, 0.19, 0.02);
    return geometry;
  }, []);

  const discGeometry = useMemo(() => {
    const geometry = new THREE.CylinderGeometry(0.145, 0.145, 0.03, 28, 1);
    geometry.rotateX(Math.PI / 2);
    return geometry;
  }, []);

  useEffect(
    () => () => {
      tyreGeometry.dispose();
      rimGeometry.dispose();
      coverGeometry.dispose();
      spokeGeometry.dispose();
      discGeometry.dispose();
    },
    [tyreGeometry, rimGeometry, coverGeometry, spokeGeometry, discGeometry],
  );

  useFrame((_, delta) => {
    if (inner.current) inner.current.rotation.z -= spinRef.current * delta;
  });

  return (
    <group position={position}>
      <group ref={inner}>
        <mesh geometry={tyreGeometry} material={kit.rubber} castShadow receiveShadow />
        <mesh geometry={rimGeometry} material={kit.rim} castShadow />
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh
            key={i}
            geometry={spokeGeometry}
            material={kit.rim}
            position={[0, 0, side * (width * 0.22)]}
            rotation={[0, 0, (i / 5) * Math.PI * 2]}
          />
        ))}
        <mesh geometry={discGeometry} material={kit.disc} position={[0, 0, -side * 0.02]} />
      </group>
      <mesh geometry={coverGeometry} material={kit.rim} position={[0, 0, side * width * 0.46]} rotation={[0, 0, 0]} />
      <mesh geometry={discGeometry} material={kit.darkMetal} position={[0, 0, -side * (width * 0.4)]} />
      <mesh position={[0, radius * 0.1, -side * (width * 0.42)]} material={kit.accent} castShadow>
        <boxGeometry args={[0.075, 0.2, 0.05]} />
      </mesh>
    </group>
  );
}

export function RaceCar({
  livery,
  quality,
  highlighted = null,
  explodeRef,
  registryRef,
  wheelSpin = 0,
  steer = 0,
  brakeGlow = 0,
  dynamicsRef,
}: RaceCarProps) {
  const baseKit = useMemo(() => createKit(livery, quality), [livery, quality]);
  const kits = useMemo(() => {
    const map = new Map<PartId, Kit>();
    for (const id of ALL_PARTS) map.set(id, cloneKit(baseKit));
    return map;
  }, [baseKit]);

  const groups = useRef<Map<PartId, THREE.Group>>(new Map());
  const spinRef = useRef(0);
  if (!dynamicsRef) spinRef.current = wheelSpin;

  // Textures created for decals live for the component's lifetime.
  const decals = useMemo(() => {
    const bodyDecal = textDecal('F1', { color: '#f5f7f9', letterSpacing: 14, sub: 'RACE SYSTEMS', subColor: livery.accent });
    const number = textDecal('01', { width: 512, height: 512, color: livery.number, letterSpacing: 0, weight: 800 });
    const endplate = textDecal('F1', { width: 512, height: 160, color: '#f5f7f9', letterSpacing: 18 });
    return { bodyDecal, number, endplate };
  }, [livery]);

  // Geometry, built once per quality tier (segment counts do not change, but
  // textures/anisotropy do, so this recomputes with the kit).
  const geo = useMemo(() => {
    const hullStations: { x: number; halfWidth: number; bottom: number; top: number; topInset?: number }[] = [
      { x: 2.75, halfWidth: 0.05, bottom: 0.11, top: 0.2 },
      { x: 2.5, halfWidth: 0.085, bottom: 0.085, top: 0.26 },
      { x: 2.2, halfWidth: 0.115, bottom: 0.075, top: 0.33 },
      { x: 1.95, halfWidth: 0.14, bottom: 0.07, top: 0.4 },
      { x: 1.7, halfWidth: 0.17, bottom: 0.07, top: 0.47 },
      { x: 1.45, halfWidth: 0.215, bottom: 0.07, top: 0.53 },
      { x: 1.2, halfWidth: 0.27, bottom: 0.075, top: 0.57 },
      { x: 0.95, halfWidth: 0.32, bottom: 0.08, top: 0.59 },
      { x: 0.7, halfWidth: 0.35, bottom: 0.09, top: 0.6, topInset: 0.72 },
      { x: 0.45, halfWidth: 0.36, bottom: 0.09, top: 0.61, topInset: 0.68 },
      { x: 0.2, halfWidth: 0.35, bottom: 0.1, top: 0.63, topInset: 0.7 },
      { x: -0.05, halfWidth: 0.33, bottom: 0.1, top: 0.66 },
      { x: -0.3, halfWidth: 0.3, bottom: 0.11, top: 0.68 },
      { x: -0.6, halfWidth: 0.28, bottom: 0.12, top: 0.68 },
      { x: -0.95, halfWidth: 0.25, bottom: 0.13, top: 0.66 },
      { x: -1.3, halfWidth: 0.22, bottom: 0.15, top: 0.62 },
      { x: -1.65, halfWidth: 0.18, bottom: 0.17, top: 0.58 },
      { x: -1.95, halfWidth: 0.15, bottom: 0.2, top: 0.54 },
      { x: -2.2, halfWidth: 0.12, bottom: 0.24, top: 0.5 },
    ];

    const hull = loft(
      'x',
      hullStations.map((s) => ({
        pos: s.x,
        ring: bodyRing(s.halfWidth, s.bottom, s.top, {
          segments: quality.preset === 'eco' ? 22 : 30,
          bottomExponent: 3.6,
          topExponent: 2.5,
          topInsetHalfWidth: s.topInset,
        }),
      })),
      { capStart: true, capEnd: true },
    );

    const podStations: { x: number; halfWidth: number; bottom: number; top: number; dz: number }[] = [
      { x: 1.25, halfWidth: 0.2, bottom: 0.16, top: 0.5, dz: 0.2 },
      { x: 1.05, halfWidth: 0.24, bottom: 0.2, top: 0.55, dz: 0.23 },
      { x: 0.7, halfWidth: 0.25, bottom: 0.22, top: 0.56, dz: 0.24 },
      { x: 0.3, halfWidth: 0.25, bottom: 0.2, top: 0.55, dz: 0.25 },
      { x: -0.1, halfWidth: 0.24, bottom: 0.18, top: 0.53, dz: 0.25 },
      { x: -0.5, halfWidth: 0.21, bottom: 0.17, top: 0.5, dz: 0.24 },
      { x: -0.9, halfWidth: 0.17, bottom: 0.16, top: 0.45, dz: 0.22 },
      { x: -1.25, halfWidth: 0.13, bottom: 0.16, top: 0.4, dz: 0.2 },
      { x: -1.5, halfWidth: 0.09, bottom: 0.18, top: 0.34, dz: 0.19 },
    ];
    const buildPod = (side: 1 | -1) =>
      loft(
        'x',
        podStations.map((s) => ({
          pos: s.x,
          ring: bodyRing(s.halfWidth, s.bottom, s.top, {
            segments: quality.preset === 'eco' ? 18 : 24,
            bottomExponent: 2.1,
            topExponent: 2.9,
          }).map(([z, y]) => [z + side * s.dz, y] as [number, number]),
        })),
        { capStart: true, capEnd: true },
      );

    const floor = loft(
      'x',
      [
        { x: 1.75, halfWidth: 0.5, bottom: 0.04, top: 0.1 },
        { x: 1.2, halfWidth: 0.66, bottom: 0.04, top: 0.12 },
        { x: 0.4, halfWidth: 0.76, bottom: 0.04, top: 0.13 },
        { x: -0.4, halfWidth: 0.78, bottom: 0.04, top: 0.14 },
        { x: -1.2, halfWidth: 0.74, bottom: 0.045, top: 0.16 },
        { x: -1.85, halfWidth: 0.68, bottom: 0.05, top: 0.19 },
      ].map((s) => ({
        pos: s.x,
        ring: bodyRing(s.halfWidth, s.bottom, s.top, { segments: 18, bottomExponent: 6, topExponent: 6 }),
      })),
      { capStart: true, capEnd: true },
    );

    const diffuser = loft(
      'x',
      [
        { x: -1.8, halfWidth: 0.66, bottom: 0.05, top: 0.2 },
        { x: -2.1, halfWidth: 0.72, bottom: 0.055, top: 0.26 },
        { x: -2.45, halfWidth: 0.76, bottom: 0.06, top: 0.31 },
        { x: -2.7, halfWidth: 0.78, bottom: 0.07, top: 0.33 },
      ].map((s) => ({
        pos: s.x,
        ring: bodyRing(s.halfWidth, s.bottom, s.top, { segments: 16, bottomExponent: 8, topExponent: 8 }),
      })),
      { capStart: false, capEnd: true },
    );

    const engineCover = loft(
      'x',
      [
        { x: -0.15, halfWidth: 0.2, bottom: 0.2, top: 0.78 },
        { x: -0.4, halfWidth: 0.19, bottom: 0.28, top: 0.8 },
        { x: -0.75, halfWidth: 0.17, bottom: 0.36, top: 0.82 },
        { x: -1.1, halfWidth: 0.14, bottom: 0.44, top: 0.78 },
        { x: -1.5, halfWidth: 0.11, bottom: 0.5, top: 0.7 },
        { x: -1.85, halfWidth: 0.08, bottom: 0.52, top: 0.62 },
      ].map((s) => ({
        pos: s.x,
        ring: bodyRing(s.halfWidth, s.bottom, s.top, { segments: 16, bottomExponent: 3, topExponent: 2.4 }),
      })),
      { capStart: true, capEnd: true },
    );

    // Roll hoop / airbox: the tallest point of the car.
    const airbox = loft(
      'x',
      [
        { x: -0.05, halfWidth: 0.13, bottom: 0.7, top: 0.88 },
        { x: -0.22, halfWidth: 0.16, bottom: 0.72, top: 1.0 },
        { x: -0.5, halfWidth: 0.15, bottom: 0.74, top: 0.96 },
        { x: -0.8, halfWidth: 0.1, bottom: 0.78, top: 0.86 },
      ].map((s) => ({
        pos: s.x,
        ring: bodyRing(s.halfWidth, s.bottom, s.top, { segments: 16, bottomExponent: 2.2, topExponent: 2.2 }),
      })),
      { capStart: false, capEnd: true },
    );

    return { hull, podL: buildPod(1), podR: buildPod(-1), floor, diffuser, engineCover, airbox };
  }, [quality.preset]);

  const haloGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [
      new THREE.Vector3(-0.12, 0.7, 0.4),
      new THREE.Vector3(0.2, 0.84, 0.42),
      new THREE.Vector3(0.5, 0.9, 0.34),
      new THREE.Vector3(0.66, 0.88, 0.18),
      new THREE.Vector3(0.72, 0.86, 0),
      new THREE.Vector3(0.66, 0.88, -0.18),
      new THREE.Vector3(0.5, 0.9, -0.34),
      new THREE.Vector3(0.2, 0.84, -0.42),
      new THREE.Vector3(-0.12, 0.7, -0.4),
      new THREE.Vector3(-0.2, 0.68, 0),
      new THREE.Vector3(-0.12, 0.7, 0.4),
    ];
    const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.4);
    return new THREE.TubeGeometry(curve, 96, 0.024, 10, true);
  }, []);

  const pillarGeometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.72, 0.86, 0),
      new THREE.Vector3(0.74, 0.75, 0),
      new THREE.Vector3(0.72, 0.64, 0),
    ]);
    return new THREE.TubeGeometry(curve, 12, 0.03, 10, false);
  }, []);

  useEffect(() => {
    return () => {
      Object.values(geo).forEach((geometry) => geometry.dispose());
      haloGeometry.dispose();
      pillarGeometry.dispose();
      for (const kit of kits.values()) disposeKit(kit);
      disposeKit(baseKit);
      Object.values(decals).forEach((texture) => texture.dispose());
    };
  }, [geo, haloGeometry, pillarGeometry, kits, baseKit, decals]);

  // Register parts for external camera focus / exploded control.
  useEffect(() => {
    if (!registryRef) return;
    const map = registryRef.current;
    map.clear();
    groups.current.forEach((group, id) => map.set(id, group));
  });

  // Highlight pass.
  useEffect(() => {
    const targets = new Set<PartId>(
      highlighted === 'wheelRL' ? WHEEL_PARTS : highlighted ? [highlighted] : [],
    );
    kits.forEach((kit, id) => {
      const on = targets.has(id);
      for (const material of Object.values(kit)) {
        const std = material as THREE.MeshStandardMaterial;
        if (!std.emissive) continue;
        if (on) {
          std.emissive.set(HIGHLIGHT_COLOR);
          std.emissiveIntensity = 0.32;
        } else if (std === kit.disc) {
          std.emissive.set('#ff3b12');
          std.emissiveIntensity = brakeGlow * 1.6;
        } else if (std === kit.accent) {
          std.emissive.set(livery.accent);
          std.emissiveIntensity = 0.28;
        } else {
          std.emissive.set('#000000');
          std.emissiveIntensity = 0;
        }
      }
    });
  }, [highlighted, kits, livery, brakeGlow]);

  useFrame(() => {
    const explode = explodeRef?.current ?? 0;
    groups.current.forEach((group, id) => {
      const dir = EXPLODE[id];
      const home = (group.userData.home as [number, number, number]) ?? [0, 0, 0];
      group.position.set(
        home[0] + dir[0] * explode,
        home[1] + dir[1] * explode,
        home[2] + dir[2] * explode,
      );
    });
  });

  // Simulator dynamics: steering, wheel spin and brake glow are written straight
  // to the scene objects so the race loop never re-renders this component.
  useFrame(() => {
    const dynamics = dynamicsRef?.current;
    if (!dynamics) return;
    const frontLeft = groups.current.get('wheelFL');
    const frontRight = groups.current.get('wheelFR');
    if (frontLeft) frontLeft.rotation.y = dynamics.steer;
    if (frontRight) frontRight.rotation.y = dynamics.steer;
    spinRef.current = dynamics.spin;
    kits.forEach((kit) => {
      kit.disc.emissiveIntensity = Math.max(0, Math.min(1, dynamics.brake)) * 1.6;
    });
  });

  // Callback refs are cached per part so React keeps the same function across
  // renders. Otherwise every render would re-capture `home` from the exploded
  // position and parts would drift.
  const register = useMemo(() => {
    const cache = new Map<PartId, (node: THREE.Group | null) => void>();
    return (id: PartId) => {
      let fn = cache.get(id);
      if (!fn) {
        fn = (node: THREE.Group | null) => {
          if (node) {
            node.userData.home = node.position.toArray();
            groups.current.set(id, node);
          } else {
            groups.current.delete(id);
          }
        };
        cache.set(id, fn);
      }
      return fn;
    };
  }, []);

  const frontAxle = CAR_DIMS.frontAxleX;
  const rearAxle = CAR_DIMS.rearAxleX;
  const frontTrack = CAR_DIMS.frontTrack / 2;
  const rearTrack = CAR_DIMS.rearTrack / 2;

  const wingSections = (span: number, chord: number, thickness: number, camber: number, incidence: number, x: number, y: number, rise: number) => [
    { z: -span / 2, chord: chord * 0.72, thickness, camber, incidence: incidence + 2, x, y: y + rise },
    { z: -span / 2 + 0.08, chord: chord * 0.92, thickness, camber, incidence, x, y: y + rise * 0.75 },
    { z: 0, chord, thickness, camber, incidence, x, y },
    { z: span / 2 - 0.08, chord: chord * 0.92, thickness, camber, incidence, x, y: y + rise * 0.75 },
    { z: span / 2, chord: chord * 0.72, thickness, camber, incidence: incidence + 2, x, y: y + rise },
  ];

  const frontWingSections = useMemo(
    () => wingSections(1.98, 0.36, 0.085, 0.1, -7, 2.5, 0.085, 0.075),
    [],
  );
  const frontFlapSections = useMemo(
    () => wingSections(1.86, 0.24, 0.07, 0.13, 16, 2.6, 0.17, 0.09),
    [],
  );
  const rearWingSections = useMemo(
    () => wingSections(1.06, 0.34, 0.08, 0.11, -11, -2.5, 0.98, 0.05),
    [],
  );
  const rearFlapSections = useMemo(
    () => wingSections(1.0, 0.2, 0.06, 0.14, 20, -2.38, 1.09, 0.05),
    [],
  );
  const beamWingSections = useMemo(
    () => wingSections(0.92, 0.22, 0.06, 0.12, -6, -2.66, 0.5, 0.02),
    [],
  );

  return (
    <group name="f1-car">
      {/* Monocoque, nose cone and engine cover spine */}
      <group ref={register('monocoque')}>
        <mesh geometry={geo.hull} material={kits.get('monocoque')!.paint} castShadow receiveShadow />
      </group>

      <group ref={register('nose')}>
        <Decal
          texture={decals.bodyDecal}
          width={0.4}
          height={0.11}
          position={[2.06, 0.31, 0.13]}
          rotation={[0, 0.14, 0]}
        />
        <Decal
          texture={decals.bodyDecal}
          width={0.4}
          height={0.11}
          position={[2.06, 0.31, -0.13]}
          rotation={[0, Math.PI - 0.14, 0]}
        />
      </group>

      {/* Front wing assembly */}
      <group ref={register('frontWing')}>
        <Wing sections={frontWingSections} material={kits.get('frontWing')!.carbon} />
        <Wing sections={frontFlapSections} material={kits.get('frontWing')!.carbon} />
        {[1, -1].map((side) => (
          <group key={side}>
            <mesh position={[2.62, 0.2, side * 0.99]} material={kits.get('frontWing')!.carbon} castShadow>
              <boxGeometry args={[0.62, 0.3, 0.014]} />
            </mesh>
            <mesh position={[2.44, 0.225, side * 0.985]} material={kits.get('frontWing')!.accent} castShadow>
              <boxGeometry args={[0.18, 0.05, 0.02]} />
            </mesh>
            <mesh position={[2.8, 0.34, side * 0.98]} material={kits.get('frontWing')!.carbon} castShadow>
              <boxGeometry args={[0.3, 0.06, 0.012]} />
            </mesh>
          </group>
        ))}
        {/* Pylons joining the wing to the nose, and the turning vanes behind it */}
        {[0.09, -0.09].map((z) => (
          <mesh key={z} position={[2.62, 0.16, z]} material={kits.get('frontWing')!.carbon} castShadow>
            <boxGeometry args={[0.3, 0.22, 0.03]} />
          </mesh>
        ))}
        {[0.3, -0.3].map((z) => (
          <mesh key={z} position={[2.14, 0.19, z]} rotation={[0, 0.45, 0.1]} material={kits.get('frontWing')!.carbon} castShadow>
            <boxGeometry args={[0.26, 0.24, 0.014]} />
          </mesh>
        ))}
        <mesh position={[2.5, 0.25, 0]} material={kits.get('frontWing')!.darkMetal}>
          <boxGeometry args={[0.5, 0.02, 0.16]} />
        </mesh>
      </group>

      {/* Sidepods */}
      <group ref={register('sidepod')}>
        <mesh geometry={geo.podL} material={kits.get('sidepod')!.paint} castShadow receiveShadow />
        <mesh geometry={geo.podR} material={kits.get('sidepod')!.paint} castShadow receiveShadow />
        {/* Under-cut accent along the pod shoulder */}
        {[1, -1].map((side) => (
          <mesh key={side} position={[0.2, 0.44, side * 0.47]} material={kits.get('sidepod')!.accent} castShadow>
            <boxGeometry args={[1.4, 0.028, 0.028]} />
          </mesh>
        ))}
        <Decal texture={decals.number} width={0.34} height={0.34} position={[0.42, 0.4, 0.5]} rotation={[0, 0, 0]} />
        <Decal
          texture={decals.number}
          width={0.34}
          height={0.34}
          position={[0.42, 0.4, -0.5]}
          rotation={[0, Math.PI, 0]}
        />
      </group>

      {/* Cooling inlets and radiator exits */}
      <group ref={register('coolingInlet')}>
        {[1, -1].map((side) => (
          <group key={side}>
            <mesh position={[1.22, 0.36, side * 0.22]} material={kits.get('coolingInlet')!.interior} castShadow>
              <boxGeometry args={[0.08, 0.26, 0.3]} />
            </mesh>
            {[0, 1, 2].map((i) => (
              <mesh
                key={i}
                position={[-0.74 - i * 0.05, 0.4 + i * 0.015, side * 0.42]}
                rotation={[0.35, 0, 0]}
                material={kits.get('coolingInlet')!.darkMetal}
              >
                <boxGeometry args={[0.04, 0.02, 0.16]} />
              </mesh>
            ))}
          </group>
        ))}
        {/* Roll-hoop intake mouth */}
        <mesh position={[-0.03, 0.86, 0]} material={kits.get('coolingInlet')!.interior}>
          <boxGeometry args={[0.05, 0.24, 0.2]} />
        </mesh>
      </group>

      {/* Engine cover + airbox */}
      <group ref={register('engineCover')}>
        <mesh geometry={geo.engineCover} material={kits.get('engineCover')!.carbon} castShadow receiveShadow />
        <mesh geometry={geo.airbox} material={kits.get('engineCover')!.carbon} castShadow />
        <Decal
          texture={decals.bodyDecal}
          width={0.42}
          height={0.11}
          position={[-0.9, 0.66, 0.16]}
          rotation={[0, 0, 0]}
        />
        <Decal
          texture={decals.bodyDecal}
          width={0.42}
          height={0.11}
          position={[-0.9, 0.66, -0.16]}
          rotation={[0, Math.PI, 0]}
        />
      </group>

      {/* Cockpit: opening, headrest, steering wheel, driver */}
      <group ref={register('cockpit')}>
        {/* Dark plate flush with the hull top reads as the open cockpit. */}
        <mesh position={[0.46, 0.622, 0]} rotation={[0, 0, -0.02]} material={kits.get('cockpit')!.interior} receiveShadow>
          <boxGeometry args={[0.6, 0.016, 0.3]} />
        </mesh>
        <mesh position={[0.08, 0.66, 0]} material={kits.get('cockpit')!.interior} castShadow>
          <boxGeometry args={[0.18, 0.2, 0.38]} />
        </mesh>
        {/* Steering wheel */}
        <group position={[0.78, 0.65, 0]} rotation={[0, 0, -0.32]}>
          <mesh material={kits.get('cockpit')!.darkMetal}>
            <torusGeometry args={[0.1, 0.026, 8, 20]} />
          </mesh>
          <mesh material={kits.get('cockpit')!.interior}>
            <boxGeometry args={[0.13, 0.09, 0.04]} />
          </mesh>
          <mesh position={[0, 0, 0.022]} material={kits.get('cockpit')!.accent}>
            <planeGeometry args={[0.11, 0.07]} />
          </mesh>
        </group>
        {/* Helmet and visor */}
        <mesh position={[0.4, 0.75, 0]} material={kits.get('cockpit')!.panel} castShadow>
          <sphereGeometry args={[0.135, 24, 18]} />
        </mesh>
        <mesh position={[0.48, 0.745, 0]} material={kits.get('cockpit')!.glass}>
          <boxGeometry args={[0.1, 0.09, 0.19]} />
        </mesh>
        <mesh position={[0.4, 0.7, 0]} material={kits.get('cockpit')!.interior}>
          <cylinderGeometry args={[0.06, 0.09, 0.14, 12]} />
        </mesh>
      </group>

      {/* Halo */}
      <group ref={register('halo')}>
        <mesh geometry={haloGeometry} material={kits.get('halo')!.metal} castShadow />
        <mesh geometry={pillarGeometry} material={kits.get('halo')!.metal} castShadow />
      </group>

      {/* Floor and diffuser */}
      <group ref={register('floor')}>
        <mesh geometry={geo.floor} material={kits.get('floor')!.carbon} receiveShadow castShadow />
        {[1, -1].map((side) => (
          <mesh key={side} position={[0.1, 0.1, side * 0.73]} material={kits.get('floor')!.panel} castShadow>
            <boxGeometry args={[2.2, 0.12, 0.022]} />
          </mesh>
        ))}
        {/* Under-floor fences */}
        {[-0.72, -0.42, 0, 0.42, 0.72].map((z) => (
          <mesh key={z} position={[0.2, 0.025, z]} material={kits.get('floor')!.carbon}>
            <boxGeometry args={[2.6, 0.03, 0.03]} />
          </mesh>
        ))}
      </group>

      <group ref={register('diffuser')}>
        <mesh geometry={geo.diffuser} material={kits.get('diffuser')!.carbon} castShadow receiveShadow />
        {[-0.6, -0.3, 0, 0.3, 0.6].map((z) => (
          <mesh key={z} position={[-2.3, 0.17, z]} material={kits.get('diffuser')!.carbon} castShadow>
            <boxGeometry args={[0.8, 0.2, 0.016]} />
          </mesh>
        ))}
      </group>

      {/* Rear wing assembly */}
      <group ref={register('rearWing')}>
        <Wing sections={rearWingSections} material={kits.get('rearWing')!.carbon} />
        <Wing sections={rearFlapSections} material={kits.get('rearWing')!.carbon} />
        <Wing sections={beamWingSections} material={kits.get('rearWing')!.carbon} castShadow={false} />
        {[1, -1].map((side) => (
          <group key={side}>
            <mesh position={[-2.31, 1.02, side * 0.53]} material={kits.get('rearWing')!.carbon} castShadow>
              <boxGeometry args={[0.68, 0.64, 0.014]} />
            </mesh>
            <Decal
              texture={decals.endplate}
              width={0.34}
              height={0.11}
              position={[-2.31, 0.98, side * 0.538]}
              rotation={[0, side > 0 ? 0 : Math.PI, 0]}
            />
            {/* Swan-neck pillar rising from the engine cover to the main plane */}
            <mesh position={[-2.22, 0.84, side * 0.4]} rotation={[0, 0, 0.5]} material={kits.get('rearWing')!.carbon} castShadow>
              <boxGeometry args={[0.05, 0.36, 0.11]} />
            </mesh>
          </group>
        ))}
        <mesh position={[-2.55, 1.16, 0]} material={kits.get('rearWing')!.darkMetal}>
          <boxGeometry args={[0.16, 0.06, 0.5]} />
        </mesh>
      </group>

      {/* Suspension: front and rear wishbones, pushrods and track rods */}
      <group ref={register('suspensionFront')}>
        {[1, -1].map((side) => (
          <group key={side}>
            <Rod from={[frontAxle + 0.34, 0.5, side * 0.16]} to={[frontAxle, 0.44, side * frontTrack - side * 0.05]} radius={0.021} material={kits.get('suspensionFront')!.carbon} />
            <Rod from={[frontAxle + 0.22, 0.34, side * 0.1]} to={[frontAxle, 0.24, side * frontTrack - side * 0.05]} radius={0.024} material={kits.get('suspensionFront')!.carbon} />
            <Rod from={[frontAxle + 0.4, 0.3, side * 0.12]} to={[frontAxle - 0.02, 0.22, side * frontTrack - side * 0.04]} radius={0.017} material={kits.get('suspensionFront')!.metal} />
            <Rod from={[frontAxle + 0.5, 0.28, side * 0.1]} to={[frontAxle + 0.02, 0.36, side * frontTrack - side * 0.06]} radius={0.014} material={kits.get('suspensionFront')!.metal} />
          </group>
        ))}
      </group>

      <group ref={register('suspensionRear')}>
        {[1, -1].map((side) => (
          <group key={side}>
            <Rod from={[rearAxle + 0.3, 0.52, side * 0.14]} to={[rearAxle, 0.46, side * rearTrack - side * 0.04]} radius={0.022} material={kits.get('suspensionRear')!.carbon} />
            <Rod from={[rearAxle + 0.2, 0.32, side * 0.1]} to={[rearAxle, 0.22, side * rearTrack - side * 0.04]} radius={0.025} material={kits.get('suspensionRear')!.carbon} />
            <Rod from={[rearAxle + 0.42, 0.3, side * 0.12]} to={[rearAxle - 0.02, 0.2, side * rearTrack - side * 0.03]} radius={0.017} material={kits.get('suspensionRear')!.metal} />
            <Rod from={[rearAxle + 0.52, 0.3, side * 0.1]} to={[rearAxle + 0.04, 0.38, side * rearTrack - side * 0.05]} radius={0.014} material={kits.get('suspensionRear')!.metal} />
          </group>
        ))}
      </group>

      {/* Brakes: ducts and calipers (discs live inside the wheels) */}
      <group ref={register('brakes')}>
        {[1, -1].map((side) => (
          <group key={side}>
            <mesh position={[frontAxle - 0.02, 0.34, side * (frontTrack - 0.12)]} rotation={[0, 0, 0.2]} material={kits.get('brakes')!.carbon} castShadow>
              <boxGeometry args={[0.28, 0.24, 0.14]} />
            </mesh>
            <mesh position={[rearAxle - 0.02, 0.36, side * (rearTrack - 0.12)]} rotation={[0, 0, 0.2]} material={kits.get('brakes')!.carbon} castShadow>
              <boxGeometry args={[0.3, 0.26, 0.14]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Wheels — the front pair steers about its own vertical axis */}
      <group ref={register('wheelFL')} rotation={[0, steer, 0]}>
        <Wheel position={[frontAxle, CAR_DIMS.frontWheelRadius, frontTrack]} radius={CAR_DIMS.frontWheelRadius} width={CAR_DIMS.frontTyreWidth} side={1} kit={kits.get('wheelFL')!} spinRef={spinRef} />
      </group>
      <group ref={register('wheelFR')} rotation={[0, steer, 0]}>
        <Wheel position={[frontAxle, CAR_DIMS.frontWheelRadius, -frontTrack]} radius={CAR_DIMS.frontWheelRadius} width={CAR_DIMS.frontTyreWidth} side={-1} kit={kits.get('wheelFR')!} spinRef={spinRef} />
      </group>
      <group ref={register('wheelRL')}>
        <Wheel position={[rearAxle, CAR_DIMS.rearWheelRadius, rearTrack]} radius={CAR_DIMS.rearWheelRadius} width={CAR_DIMS.rearTyreWidth} side={1} kit={kits.get('wheelRL')!} spinRef={spinRef} />
      </group>
      <group ref={register('wheelRR')}>
        <Wheel position={[rearAxle, CAR_DIMS.rearWheelRadius, -rearTrack]} radius={CAR_DIMS.rearWheelRadius} width={CAR_DIMS.rearTyreWidth} side={-1} kit={kits.get('wheelRR')!} spinRef={spinRef} />
      </group>
    </group>
  );
}
