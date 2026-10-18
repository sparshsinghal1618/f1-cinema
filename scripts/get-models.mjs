// Download candidate GLB models from poly.pizza (.glb.br brotli), validate, and dump structure.
import { writeFile, mkdir } from 'node:fs/promises';
import { brotliDecompressSync } from 'node:zlib';

const candidates = [
  { id: '1LPVwE1bYMS', name: 'open-cockpit-design', uuid: 'b50de88f-bab9-4ed1-b23e-fa4470a2e013', by: 'Niall McCaffrey', lic: 'CC-BY 3.0' },
  { id: '5zUWP5UsLg-', name: 'car-model-formula', uuid: 'f8c6bcd5-92a2-4f88-b821-64935a00216f', by: 'Ignition Labs', lic: 'CC-BY 3.0' },
];

const dir = new URL('../public/assets/models/', import.meta.url);
await mkdir(dir, { recursive: true });

for (const c of candidates) {
  const url = `https://static.poly.pizza/${c.uuid}.glb.br`;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) { console.log(c.name, 'HTTP', r.status); continue; }
  let glb = Buffer.from(await r.arrayBuffer());
  if (glb.toString('ascii', 0, 4) !== 'glTF') {
    try { glb = brotliDecompressSync(glb); } catch { /* server may have already decompressed */ }
  }
  const magic = glb.toString('ascii', 0, 4);
  if (magic !== 'glTF') { console.log(c.name, 'bad magic', magic); continue; }
  const jsonLen = glb.readUInt32LE(12);
  const json = JSON.parse(glb.toString('utf8', 20, 20 + jsonLen));
  const out = new URL(`../public/assets/models/${c.name}.glb`, import.meta.url);
  await writeFile(out, glb);
  console.log(`\n== ${c.name} (${(glb.length / 1024).toFixed(0)} KB) ${c.by} ${c.lic}`);
  console.log('meshes:', json.meshes?.length, 'nodes:', json.nodes?.length, 'materials:', json.materials?.length, 'images:', json.images?.length, 'animations:', json.animations?.length);
  console.log('node names:', (json.nodes ?? []).map(n => n.name || '?').join(', ').slice(0, 700));
  console.log('materials:', (json.materials ?? []).map(m => m.name || '?').join(', ').slice(0, 500));
}
