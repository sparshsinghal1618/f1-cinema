// Procedural geometry helpers.
//
// The F1 car is built in code rather than imported, so these are the two
// primitives everything else is made of: a lofting function that sweeps profiles
// along an axis, and the parametric profiles (super-ellipse bodies, NACA-style
// aerofoil sections) that get swept.

import * as THREE from 'three';

export type Ring = [number, number][];
export type Axis = 'x' | 'z';

export interface Station {
  /** Position along the loft axis, in metres. */
  pos: number;
  /** Cross-section in the plane perpendicular to the axis. */
  ring: Ring;
}

function ringVertex(axis: Axis, pos: number, point: [number, number]): [number, number, number] {
  return axis === 'x' ? [pos, point[1], point[0]] : [point[0], point[1], pos];
}

function ringCentroid(ring: Ring): [number, number] {
  let z = 0;
  let y = 0;
  for (const p of ring) {
    z += p[0];
    y += p[1];
  }
  return [z / ring.length, y / ring.length];
}

/**
 * Sweep equal-length rings along an axis into an indexed, UV'd mesh.
 *
 * Winding is repaired per triangle against the swept spine so that normals always
 * face outward, which means callers can build sections in either direction without
 * worrying about inside-out shading.
 */
export function loft(
  axis: Axis,
  stations: Station[],
  options: { capStart?: boolean; capEnd?: boolean } = {},
): THREE.BufferGeometry {
  const count = stations.length;
  const segments = stations[0].ring.length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const spine: [number, number, number][] = [];

  for (let i = 0; i < count; i += 1) {
    const station = stations[i];
    const [cz, cy] = ringCentroid(station.ring);
    spine.push(ringVertex(axis, station.pos, [cz, cy]));
    for (let j = 0; j < segments; j += 1) {
      const [x, y, z] = ringVertex(axis, station.pos, station.ring[j]);
      positions.push(x, y, z);
      uvs.push(i / (count - 1), j / segments);
    }
  }

  for (let i = 0; i < count - 1; i += 1) {
    for (let j = 0; j < segments; j += 1) {
      const j2 = (j + 1) % segments;
      const a = i * segments + j;
      const b = i * segments + j2;
      const c = (i + 1) * segments + j2;
      const d = (i + 1) * segments + j;
      indices.push(a, b, c, a, c, d);
    }
  }

  // Caps: fan the first and last rings to a centre vertex.
  const addCap = (stationIndex: number, reverse: boolean) => {
    const station = stations[stationIndex];
    const [cz, cy] = ringCentroid(station.ring);
    const [cx, cyy, czz] = ringVertex(axis, station.pos, [cz, cy]);
    const centre = positions.length / 3;
    positions.push(cx, cyy, czz);
    uvs.push(stationIndex === 0 ? 0 : 1, 0.5);
    const base = stationIndex * segments;
    for (let j = 0; j < segments; j += 1) {
      const j2 = (j + 1) % segments;
      if (reverse) indices.push(centre, base + j2, base + j);
      else indices.push(centre, base + j, base + j2);
    }
  };

  if (options.capStart) addCap(0, true);
  if (options.capEnd) addCap(count - 1, false);

  // Repair winding against the spine so normals point outward.
  const p = positions;
  const triCount = indices.length / 3;
  for (let t = 0; t < triCount; t += 1) {
    const i0 = indices[t * 3];
    const i1 = indices[t * 3 + 1];
    const i2 = indices[t * 3 + 2];
    const ax = p[i0 * 3];
    const ay = p[i0 * 3 + 1];
    const az = p[i0 * 3 + 2];
    const bx = p[i1 * 3] - ax;
    const by = p[i1 * 3 + 1] - ay;
    const bz = p[i1 * 3 + 2] - az;
    const dx = p[i2 * 3] - ax;
    const dy = p[i2 * 3 + 1] - ay;
    const dz = p[i2 * 3 + 2] - az;
    const nx = by * dz - bz * dy;
    const ny = bz * dx - bx * dz;
    const nz = bx * dy - by * dx;
    const cx = (ax + p[i1 * 3] + p[i2 * 3]) / 3;
    const cyy = (ay + p[i1 * 3 + 1] + p[i2 * 3 + 1]) / 3;
    const czz = (az + p[i1 * 3 + 2] + p[i2 * 3 + 2]) / 3;
    // Nearest spine sample to the triangle centroid.
    let best = 0;
    let bestDist = Infinity;
    for (let s = 0; s < spine.length; s += 1) {
      const sp = spine[s];
      const dist = (sp[0] - cx) ** 2 + (sp[1] - cyy) ** 2 + (sp[2] - czz) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        best = s;
      }
    }
    const sp = spine[best];
    const rx = cx - sp[0];
    const ry = cyy - sp[1];
    const rz = czz - sp[2];
    if (nx * rx + ny * ry + nz * rz < 0) {
      indices[t * 3 + 1] = i2;
      indices[t * 3 + 2] = i1;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Super-ellipse cross-section: flat-ish bottom, rounded top, for bodywork. */
export function bodyRing(
  halfWidth: number,
  yBottom: number,
  yTop: number,
  options: { bottomExponent?: number; topExponent?: number; segments?: number; topInsetHalfWidth?: number } = {},
): Ring {
  const { bottomExponent = 3.4, topExponent = 2.6, segments = 30, topInsetHalfWidth } = options;
  const cy = (yBottom + yTop) / 2;
  const hy = (yTop - yBottom) / 2;
  const ring: Ring = [];
  for (let i = 0; i < segments; i += 1) {
    const t = (i / segments) * Math.PI * 2;
    const ct = Math.cos(t);
    const st = Math.sin(t);
    const exponent = st >= 0 ? topExponent : bottomExponent;
    const width = st >= 0 && topInsetHalfWidth !== undefined ? halfWidth * topInsetHalfWidth : halfWidth;
    const z = width * Math.sign(ct) * Math.pow(Math.abs(ct), 2 / exponent);
    const y = cy + hy * Math.sign(st) * Math.pow(Math.abs(st), 2 / exponent);
    ring.push([z, y]);
  }
  return ring;
}

/**
 * Thin cambered aerofoil section (NACA-style thickness distribution with a
 * parabolic camber line), returned in the ring's local 2D plane.
 */
export function aerofoilRing(
  chord: number,
  thicknessRatio: number,
  camberRatio: number,
  incidenceDeg: number,
  segments = 34,
): Ring {
  const half = Math.max(4, Math.floor(segments / 2));
  const thicknessAt = (x: number) =>
    5 *
    thicknessRatio *
    (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1015 * x ** 4);
  const camberAt = (x: number) => 4 * camberRatio * x * (1 - x);
  const ring: Ring = [];

  for (let i = 0; i <= half; i += 1) {
    const x = i / half;
    ring.push([x * chord, camberAt(x) * chord + thicknessAt(x) * chord]);
  }
  for (let i = half - 1; i >= 1; i -= 1) {
    const x = i / half;
    ring.push([x * chord, camberAt(x) * chord - thicknessAt(x) * chord]);
  }

  const angle = (incidenceDeg * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return ring.map(([x, y]) => [x * cos - y * sin, x * sin + y * cos] as [number, number]);
}

/** Sweep a 2D outline (in the XY plane) into a thin solid of a given thickness. */
export function extrudeProfile(outline: Ring, thickness: number): THREE.BufferGeometry {
  const geometry = new THREE.ExtrudeGeometry(new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y))), {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: 2,
  });
  geometry.translate(0, 0, -thickness / 2);
  geometry.computeVertexNormals();
  return geometry;
}

/** Closed-loop ribbon (used for the game track surface). */
export function ribbonGeometry(
  points: [number, number, number][],
  leftEdge: [number, number, number][],
  rightEdge: [number, number, number][],
  closed = true,
): THREE.BufferGeometry {
  const count = points.length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let run = 0;
  for (let i = 0; i < count; i += 1) {
    const l = leftEdge[i];
    const r = rightEdge[i];
    positions.push(l[0], l[1], l[2], r[0], r[1], r[2]);
    if (i > 0) {
      const prev = points[i - 1];
      const cur = points[i];
      run += Math.hypot(cur[0] - prev[0], cur[1] - prev[1], cur[2] - prev[2]);
    }
    uvs.push(0, run / 12, 1, run / 12);
  }
  const last = closed ? count : count - 1;
  for (let i = 0; i < last; i += 1) {
    const next = (i + 1) % count;
    const a = i * 2;
    const b = i * 2 + 1;
    const c = next * 2 + 1;
    const d = next * 2;
    indices.push(a, b, c, a, c, d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
