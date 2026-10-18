// The playable race scene.
//
// Owns the visual track (built from the same centreline the physics uses), the
// scenery, the chase camera and the per-frame physics pump. Nothing in here
// re-renders while racing: the car transform, wheel dynamics and HUD values are
// all written imperatively.

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { RaceCar } from './RaceCar';
import { ribbonGeometry } from './geometry';
import { asphaltTexture, checkerTexture, hazardStripeTexture, asphaltRoughnessTexture } from './textures';
import { RaceSim, RUNOFF, TRACK_HALF, TOTAL_LAPS, sampleTrack } from '../lib/racePhysics';
import { LIVERIES } from '../data/car';
import { assetUrl } from '../lib/assets';
import type { QualitySettings } from '../lib/quality';

export interface RaceSnapshot {
  speed: number;
  rpm: number;
  gear: number;
  throttle: number;
  brake: number;
  steer: number;
  lap: number;
  lapTime: number;
  lastLap: number | null;
  bestLap: number | null;
  sectors: (number | null)[];
  offTrack: boolean;
  impact: number;
  progress: number;
}

const SEGMENTS = 900;

type P3 = [number, number, number];

interface TrackBuild {
  road: THREE.BufferGeometry;
  lines: THREE.BufferGeometry[];
  kerbs: THREE.BufferGeometry[];
  walls: THREE.BufferGeometry[];
  ground: THREE.BufferGeometry;
  startLine: THREE.BufferGeometry;
  startYaw: number;
  startCentre: THREE.Vector3;
  scenery: { position: P3; scale: P3; rotation: number; hue: number }[];
}

function buildTrack(): TrackBuild {
  const { points, normals } = sampleTrack(SEGMENTS);
  const offsetPoint = (index: number, distance: number, y = 0): P3 => {
    const p = points[index];
    const n = normals[index];
    return [p.x + n.x * distance, y, p.z + n.z * distance];
  };
  const band = (from: number, to: number, y = 0) => ribbonGeometry(
    points.map((p) => [p.x, y, p.z] as P3),
    points.map((_, i) => offsetPoint(i, from, y)),
    points.map((_, i) => offsetPoint(i, to, y)),
  );

  const centre: P3[] = points.map((p) => [p.x, 0, p.z]);

  // Scenery: deterministic scatter outside the barriers.
  const scenery: TrackBuild['scenery'] = [];
  let seed = 20261206;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (let i = 0; i < 190; i += 1) {
    const index = Math.floor((i / 190) * SEGMENTS);
    const side = i % 2 === 0 ? 1 : -1;
    const distance = TRACK_HALF + RUNOFF + 7 + rand() * 30;
    const p = points[index];
    const n = normals[index];
    const height = 3 + rand() * 9;
    scenery.push({
      position: [p.x + n.x * distance * side, height / 2, p.z + n.z * distance * side],
      scale: [1.6 + rand() * 2.4, height, 1.6 + rand() * 2.4],
      rotation: rand() * Math.PI,
      hue: rand(),
    });
  }

  const startYaw = Math.atan2(points[0].x - points[SEGMENTS - 1].x, points[0].z - points[SEGMENTS - 1].z);
  const startLine = (() => {
    const geometry = new THREE.PlaneGeometry(TRACK_HALF * 2 + 1.2, 1.4);
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  })();

  return {
    road: ribbonGeometry(centre, points.map((_, i) => offsetPoint(i, TRACK_HALF)), points.map((_, i) => offsetPoint(i, -TRACK_HALF))),
    lines: [band(TRACK_HALF - 0.34, TRACK_HALF - 0.14), band(-TRACK_HALF + 0.14, -TRACK_HALF + 0.34)],
    kerbs: [band(TRACK_HALF, TRACK_HALF + 0.95), band(-TRACK_HALF - 0.95, -TRACK_HALF)],
    walls: [
      ribbonGeometry(points.map((_, i) => offsetPoint(i, TRACK_HALF + RUNOFF)), points.map((_, i) => offsetPoint(i, TRACK_HALF + RUNOFF)), points.map((_, i) => offsetPoint(i, TRACK_HALF + RUNOFF, 1.05))),
      ribbonGeometry(points.map((_, i) => offsetPoint(i, -TRACK_HALF - RUNOFF)), points.map((_, i) => offsetPoint(i, -TRACK_HALF - RUNOFF)), points.map((_, i) => offsetPoint(i, -TRACK_HALF - RUNOFF, 1.05))),
    ],
    ground: (() => {
      const geometry = new THREE.PlaneGeometry(1600, 1600);
      geometry.rotateX(-Math.PI / 2);
      return geometry;
    })(),
    startLine,
    startYaw,
    startCentre: points[0].clone(),
    scenery,
  };
}

function GameEnvironment() {
  const scene = useThree((state) => state.scene);
  const hdr = useLoader(RGBELoader, assetUrl('assets/environments/kloofendal_48d_partly_cloudy_puresky.hdr'));

  useEffect(() => {
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = hdr;
    scene.environmentIntensity = 0.62;
    const previous = scene.background;
    scene.background = new THREE.Color('#0a0e13');
    return () => {
      scene.environment = null;
      scene.background = previous;
    };
  }, [hdr, scene]);

  return null;
}

function Track({ quality }: { quality: QualitySettings }) {
  const build = useMemo(buildTrack, []);
  const roadMap = useMemo(() => asphaltTexture([40, 40]), []);
  const roadRough = useMemo(() => asphaltRoughnessTexture([40, 40]), []);
  const kerbMap = useMemo(() => hazardStripeTexture('#e10600', '#f4f6f8', 6), []);
  const startMap = useMemo(() => checkerTexture(14, 3), []);

  useEffect(() => () => {
    build.road.dispose();
    build.lines.forEach((g) => g.dispose());
    build.kerbs.forEach((g) => g.dispose());
    build.walls.forEach((g) => g.dispose());
    build.ground.dispose();
    build.startLine.dispose();
    roadMap.dispose();
    roadRough.dispose();
    kerbMap.dispose();
    startMap.dispose();
  }, [build, roadMap, roadRough, kerbMap, startMap]);

  const scenery = build.scenery.slice(0, Math.max(24, quality.scenery));
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const position = new THREE.Vector3();
    scenery.forEach((item, index) => {
      position.set(item.position[0], item.position[1], item.position[2]);
      quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), item.rotation);
      scale.set(item.scale[0], item.scale[1], item.scale[2]);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [scenery]);

  return (
    <group>
      <mesh geometry={build.ground} receiveShadow>
        <meshStandardMaterial color="#0d1210" roughness={0.97} metalness={0} />
      </mesh>

      <instancedMesh ref={meshRef} args={[undefined, undefined, scenery.length]} castShadow receiveShadow frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#2a2f33" roughness={0.85} metalness={0.05} />
      </instancedMesh>

      <mesh geometry={build.road} receiveShadow>
        <meshStandardMaterial map={roadMap} roughnessMap={roadRough} roughness={0.92} metalness={0.04} color="#4a4d51" />
      </mesh>

      {build.lines.map((geometry, index) => (
        <mesh key={`line-${index}`} geometry={geometry}>
          <meshStandardMaterial color="#e9edf1" roughness={0.6} />
        </mesh>
      ))}

      {build.kerbs.map((geometry, index) => (
        <mesh key={`kerb-${index}`} geometry={geometry}>
          <meshStandardMaterial map={kerbMap} color="#ffffff" roughness={0.7} />
        </mesh>
      ))}

      {build.walls.map((geometry, index) => (
        <mesh key={`wall-${index}`} geometry={geometry} castShadow receiveShadow>
          <meshStandardMaterial color="#c8ccd1" roughness={0.65} metalness={0.15} side={THREE.DoubleSide} />
        </mesh>
      ))}

      <mesh geometry={build.startLine} position={[build.startCentre.x, 0.02, build.startCentre.z]} rotation={[0, build.startYaw, 0]}>
        <meshStandardMaterial map={startMap} color="#ffffff" roughness={0.5} />
      </mesh>
    </group>
  );
}

function ChaseCamera({ sim, active }: { sim: RaceSim; active: boolean }) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const desired = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const current = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const car = sim.car;
    current.set(car.x - Math.cos(car.yaw) * 7, 3, car.z + Math.sin(car.yaw) * 7);
    camera.position.copy(current);
    look.set(car.x, 0.9, car.z);
    camera.lookAt(look);
  }, [sim, camera, current, look]);

  useFrame((_, delta) => {
    if (!active) return;
    const car = sim.car;
    const speed = Math.abs(car.speed);
    const back = 6.2 + speed * 0.055;
    const height = 2.35 + speed * 0.016;
    desired.set(car.x - Math.cos(car.yaw) * back, height, car.z + Math.sin(car.yaw) * back);
    current.lerp(desired, 1 - Math.exp(-5.5 * delta));
    camera.position.copy(current);
    look.set(car.x + Math.cos(car.yaw) * 5, 1.0, car.z - Math.sin(car.yaw) * 5);
    camera.lookAt(look);
  });

  return null;
}

function RaceLoop({
  sim,
  quality,
  active,
  onSnapshot,
  onFinish,
}: {
  sim: RaceSim;
  quality: QualitySettings;
  active: boolean;
  onSnapshot: (snapshot: RaceSnapshot) => void;
  onFinish: () => void;
}) {
  const carGroup = useRef<THREE.Group>(null);
  const dynamicsRef = useRef({ steer: 0, spin: 0, brake: 0 });
  const finished = useRef(false);
  const throttleWrite = useRef(0);

  useFrame((_, delta) => {
    if (active) sim.advance(delta);

    const car = sim.car;
    const group = carGroup.current;
    if (group) {
      group.position.set(car.x, 0, car.z);
      group.rotation.y = car.yaw;
    }

    dynamicsRef.current.steer = car.steer;
    dynamicsRef.current.spin = car.wheelSpin;
    dynamicsRef.current.brake = car.brakeGlow;

    // HUD writes are throttled a little so DOM text updates do not compete with
    // rendering, but stay fast enough to read as live.
    throttleWrite.current += delta;
    if (throttleWrite.current > 0.05) {
      throttleWrite.current = 0;
      onSnapshot({
        speed: Math.abs(car.speed) * 3.6,
        rpm: car.rpm,
        gear: car.gear,
        throttle: sim.input.throttle,
        brake: sim.input.brake,
        steer: car.steer,
        lap: Math.min(sim.timing.lap, TOTAL_LAPS),
        lapTime: sim.timing.lapTime,
        lastLap: sim.timing.lastLap,
        bestLap: sim.timing.bestLap,
        sectors: sim.timing.sectors,
        offTrack: car.offTrack,
        impact: car.impact,
        progress: sim.lapProgress,
      });
    }

    if (sim.finished && !finished.current) {
      finished.current = true;
      onFinish();
    }
    if (!sim.finished) finished.current = false;
  });

  return (
    <group ref={carGroup}>
      <RaceCar livery={LIVERIES[0]} quality={quality} dynamicsRef={dynamicsRef} />
    </group>
  );
}

export function GameScene({
  sim,
  quality,
  active,
  onSnapshot,
  onFinish,
}: {
  sim: RaceSim;
  quality: QualitySettings;
  active: boolean;
  onSnapshot: (snapshot: RaceSnapshot) => void;
  onFinish: () => void;
}) {
  return (
    <Canvas
      dpr={quality.dpr}
      shadows={quality.shadows}
      frameloop={active ? 'always' : 'never'}
      gl={{ antialias: quality.preset !== 'eco', powerPreference: 'high-performance' }}
      camera={{ fov: 62, near: 0.15, far: 1400, position: [0, 4, 14] }}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color('#0a0e13'));
      }}
    >
      <hemisphereLight args={['#9fb6d0', '#1a1d20', 0.55]} />
      <directionalLight
        position={[120, 170, 90]}
        intensity={2.1}
        castShadow={quality.shadows}
        shadow-mapSize-width={quality.shadowMapSize}
        shadow-mapSize-height={quality.shadowMapSize}
        shadow-camera-left={-260}
        shadow-camera-right={260}
        shadow-camera-top={260}
        shadow-camera-bottom={-260}
        shadow-camera-far={600}
        shadow-bias={-0.0006}
      />
      <Track quality={quality} />
      <RaceLoop sim={sim} quality={quality} active={active} onSnapshot={onSnapshot} onFinish={onFinish} />
      <ChaseCamera sim={sim} active={active} />
      <GameEnvironment />
    </Canvas>
  );
}
