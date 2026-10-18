// Offline structural probe for the downloaded GLB models.
import { readFileSync } from 'node:fs';
import { brotliDecompressSync } from 'node:zlib';

const files = [
  'public/assets/models/open-cockpit-design.glb',
  'public/assets/models/car-model-formula.glb',
];

for (const file of files) {
  let glb = readFileSync(file);
  if (glb.toString('ascii', 0, 4) !== 'glTF') {
    try {
      glb = brotliDecompressSync(glb);
    } catch {}
  }
  const magic = glb.toString('ascii', 0, 4);
  if (magic !== 'glTF') {
    console.log(file, 'bad magic', magic);
    continue;
  }
  const jsonLen = glb.readUInt32LE(12);
  const json = JSON.parse(glb.toString('utf8', 20, 20 + jsonLen));
  console.log(`\n== ${file}`);
  console.log(
    'meshes:',
    json.meshes?.length,
    'nodes:',
    json.nodes?.length,
    'materials:',
    json.materials?.length,
    'images:',
    json.images?.length,
    'textures:',
    json.textures?.length,
    'animations:',
    json.animations?.length,
  );
  console.log('extensions used:', (json.extensionsUsed ?? []).join(', ') || 'none');
  console.log('scenes:', JSON.stringify(json.scenes ?? []).slice(0, 300));
  for (const [i, n] of (json.nodes ?? []).entries()) {
    const bits = [];
    if (n.mesh !== undefined) bits.push(`mesh=${n.mesh}`);
    if (n.children) bits.push(`children=${n.children.length}`);
    if (n.translation) bits.push(`t=[${n.translation.map((v) => v.toFixed(2))}]`);
    console.log(`  node[${i}] ${n.name ?? '?'} ${bits.join(' ')}`);
  }
  console.log('mesh names:', (json.meshes ?? []).map((m) => m.name ?? '?').join(' | '));
  console.log('material names:', (json.materials ?? []).map((m) => m.name ?? '?').join(' | '));
  // Bounding box from POSITION accessors.
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];
  for (const m of json.meshes ?? []) {
    for (const p of m.primitives ?? []) {
      const acc = json.accessors?.[p.attributes?.POSITION];
      if (acc?.min && acc?.max) {
        for (let k = 0; k < 3; k++) {
          min[k] = Math.min(min[k], acc.min[k]);
          max[k] = Math.max(max[k], acc.max[k]);
        }
      }
    }
  }
  console.log('bbox min', min.map((v) => v.toFixed(2)).join(','), 'max', max.map((v) => v.toFixed(2)).join(','));
}
