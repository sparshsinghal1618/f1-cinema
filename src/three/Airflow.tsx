// Conceptual airflow visualisation.
//
// These are illustrative streamlines drawn over the surface of the model — they
// are NOT the result of a CFD solve and the UI says so wherever they appear.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

type Path = [number, number, number][];

/** Hand-authored paths in car space: +X forward, +Y up, nose at x = 2.75. */
const PATHS: Path[] = [
  [
    [3.35, 0.18, 0],
    [2.45, 0.32, 0],
    [1.5, 0.52, 0],
    [0.5, 0.7, 0],
    [-0.5, 0.86, 0],
    [-1.6, 0.95, 0],
    [-2.45, 0.98, 0],
  ],
  [
    [3.05, 0.16, 0.92],
    [2.55, 0.3, 0.97],
    [1.9, 0.42, 0.88],
    [0.95, 0.5, 0.72],
    [-0.1, 0.56, 0.6],
    [-1.3, 0.68, 0.52],
    [-2.4, 0.9, 0.46],
  ],
  [
    [3.05, 0.16, -0.92],
    [2.55, 0.3, -0.97],
    [1.9, 0.42, -0.88],
    [0.95, 0.5, -0.72],
    [-0.1, 0.56, -0.6],
    [-1.3, 0.68, -0.52],
    [-2.4, 0.9, -0.46],
  ],
  [
    [1.7, 0.22, 0.62],
    [1.1, 0.3, 0.66],
    [0.4, 0.34, 0.62],
    [-0.5, 0.38, 0.6],
    [-1.4, 0.5, 0.54],
    [-2.5, 0.78, 0.42],
  ],
  [
    [1.7, 0.22, -0.62],
    [1.1, 0.3, -0.66],
    [0.4, 0.34, -0.62],
    [-0.5, 0.38, -0.6],
    [-1.4, 0.5, -0.54],
    [-2.5, 0.78, -0.42],
  ],
  [
    [2.0, 0.06, 0.68],
    [0.9, 0.05, 0.74],
    [-0.2, 0.06, 0.76],
    [-1.3, 0.09, 0.72],
    [-2.5, 0.22, 0.6],
  ],
  [
    [2.0, 0.06, -0.68],
    [0.9, 0.05, -0.74],
    [-0.2, 0.06, -0.76],
    [-1.3, 0.09, -0.72],
    [-2.5, 0.22, -0.6],
  ],
];

const PARTICLE_COUNT = 7;

export function Airflow({ particles = 520, intensity = 1 }: { particles?: number; intensity?: number }) {
  const perPath = Math.max(2, Math.round((particles * intensity) / PARTICLE_COUNT / PATHS.length / 20));
  const packetCount = perPath * PATHS.length;

  const { curves, tubes, lineMaterial, packetGeometry, packetMaterial, offsets, speeds } = useMemo(() => {
    const curves = PATHS.map(
      (path) => new THREE.CatmullRomCurve3(path.map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, 'catmullrom', 0.2),
    );
    const tubes = curves.map((curve) => new THREE.TubeGeometry(curve, 64, 0.0045, 6, false));
    const lineMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ff6a4d'),
      transparent: true,
      opacity: 0.13,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const packetGeometry = new THREE.SphereGeometry(0.012, 6, 5);
    const packetMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ffd0c4'),
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    // Deterministic offsets: a fixed irrational step reads as irregular without
    // needing a random number generator per frame.
    const offsets = new Float32Array(packetCount);
    const speeds = new Float32Array(packetCount);
    let seed = 0.137;
    for (let i = 0; i < packetCount; i += 1) {
      seed = (seed * 9301 + 49297) % 233280;
      offsets[i] = (i / perPath + seed / 233280) % 1;
      speeds[i] = 0.09 + ((i * 37) % 11) / 90;
    }
    return { curves, tubes, lineMaterial, packetGeometry, packetMaterial, offsets, speeds };
  }, [perPath, packetCount]);

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const temp = useMemo(() => new THREE.Object3D(), []);
  const elapsed = useRef(0);

  useEffect(() => {
    return () => {
      tubes.forEach((tube) => tube.dispose());
      lineMaterial.dispose();
      packetGeometry.dispose();
      packetMaterial.dispose();
    };
  }, [tubes, lineMaterial, packetGeometry, packetMaterial]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    elapsed.current += Math.min(delta, 0.05);
    for (let i = 0; i < packetCount; i += 1) {
      const curve = curves[i % curves.length];
      const speed = speeds[i];
      const t = (offsets[i] + elapsed.current * speed) % 1;
      curve.getPointAt(t, temp.position);
      const scale = 0.65 + 0.5 * Math.sin(t * Math.PI);
      temp.scale.setScalar(scale);
      temp.updateMatrix();
      mesh.setMatrixAt(i, temp.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {tubes.map((tube, index) => (
        <mesh key={index} geometry={tube} material={lineMaterial} />
      ))}
      <instancedMesh
        ref={meshRef}
        args={[packetGeometry, packetMaterial, packetCount]}
        frustumCulled={false}
      />
    </group>
  );
}
