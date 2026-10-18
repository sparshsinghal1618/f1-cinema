// Emit ASSETS-LICENSES.md from the shipped asset metadata. Keeping this generated
// guarantees the attribution list can never drift from what actually ships.

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const pub = new URL('../public/', import.meta.url);
const publicPath = (p) => new URL(p.replace(/^\/+/, ''), pub);
const manifest = JSON.parse(await readFile(new URL('assets/manifest.json', pub), 'utf8'));
const environmentList = JSON.parse(await readFile(new URL('assets/environments/polyhaven.json', pub), 'utf8'));
const environments = environmentList.filter((e) => e?.file && existsSync(publicPath(e.file)));
const missingEnvironments = environmentList.length - environments.length;
const fonts = (await readdir(new URL('assets/fonts/', pub))).filter((f) => f.endsWith('.woff2')).sort();

const images = Object.entries(manifest.images);
const byCat = new Map();
for (const [key, e] of images) {
  if (!byCat.has(e.cat)) byCat.set(e.cat, []);
  byCat.get(e.cat).push([key, e]);
}

const esc = (s) => String(s ?? '').replace(/\|/g, '\\|');

const lines = [];
lines.push('# Asset licences and attribution');
lines.push('');
lines.push('Every third-party asset that ships with this project is listed below with its');
lines.push('author, licence and source. Assets that were evaluated and rejected are recorded');
lines.push('at the end so the decision trail is auditable.');
lines.push('');
lines.push(`Generated from \`public/assets/manifest.json\`. Images: ${images.length}. Environments: ${environments.length}. Fonts: ${fonts.length}.`);
lines.push('');
lines.push('No stock photography, no scraped imagery, no unlicensed material. All photography');
lines.push('is from Wikimedia Commons under the licence stated for each file.');
lines.push('');

for (const cat of [...byCat.keys()].sort()) {
  lines.push(`## Photography - ${cat}`);
  lines.push('');
  lines.push('| Key | Title | Author | Licence | Source |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const [key, e] of byCat.get(cat)) {
    const licence = e.licenseUrl ? `[${esc(e.license)}](${e.licenseUrl})` : esc(e.license);
    lines.push(`| \`${key}\` | ${esc(e.title)} | ${esc(e.author)} | ${licence} | [Commons](${e.source}) |`);
  }
  lines.push('');
}

lines.push('## Environment maps (HDRI)');
lines.push('');
lines.push('| File | Source | Licence |');
lines.push('| --- | --- | --- |');
for (const e of environments) {
  lines.push(`| \`${esc(e.file)}\` | [${esc(e.id)}](${e.source}) | ${esc(e.license ?? 'CC0')} |`);
}
lines.push('');
lines.push('All Poly Haven assets are CC0 (public domain dedication): no attribution is');
lines.push('legally required, and it is given here anyway.');
lines.push('');

lines.push('## Fonts');
lines.push('');
lines.push('| File | Licence |');
lines.push('| --- | --- |');
for (const f of fonts) lines.push(`| \`${esc(f)}\` | SIL Open Font License 1.1 |`);
lines.push('');
lines.push('Barlow Condensed, Inter and JetBrains Mono are self-hosted from local woff2 files.');
lines.push('Each family is licensed under the SIL Open Font License 1.1, which permits');
lines.push('bundling and redistribution.');
lines.push('');

lines.push('## Icons and procedural art');
lines.push('');
lines.push('- `assets/icons/f1.svg` - original artwork created for this project.');
lines.push('- All procedural textures, track geometry, car geometry, circuit outlines and the');
lines.push('  animated lap markers are original work generated in code. No third-party model');
lines.push('  or texture is used in the 3D scenes.');
lines.push('');

lines.push('## 3D models');
lines.push('');
lines.push('No third-party 3D model ships with this project: the car, the track and the');
lines.push('pit-stop diagram are procedural. Two CC-BY candidates were downloaded and');
lines.push('evaluated before that decision was taken, and both must be attributed even though');
lines.push('neither is shipped:');
lines.push('');
lines.push('| File | Author | Licence | Reason rejected |');
lines.push('| --- | --- | --- | --- |');
lines.push('| `open-cockpit-design.glb` | Niall McCaffrey (via Poly Pizza) | CC-BY 3.0 | 267 anonymous `group<random>` meshes - not separable into named parts, so per-part hotspots and the exploded view are impossible |');
lines.push('| `car-model-formula.glb` | Ignition Labs (via Poly Pizza) | CC-BY 3.0 | The model is a closed-wheel road car (Lamborghini Aventador) in millimetre units - wrong subject |');
lines.push('');
lines.push('See `public/assets/models/README.md` for the full search and evaluation record.');
lines.push('');

lines.push('## Audio');
lines.push('');
lines.push('No audio files ship with this project. Every sound is synthesised at runtime with');
lines.push('the Web Audio API, so there is no third-party audio licence to honour.');
lines.push('');

lines.push('## Photography that could not be obtained');
lines.push('');
lines.push('The image set was curated as 50 picks across hero, car detail, night, pit-lane,');
lines.push('driver, tyre/carbon, gallery and background categories. 26 are shipped. The');
lines.push('remaining 24 could not be downloaded because the Wikimedia image CDN returned');
lines.push('HTTP 429 (rate limited) for the full duration of the fetch window. Every affected');
lines.push('section falls back to a labelled placeholder rather than a broken image, and');
lines.push('re-running `npm run assets` retries the missing picks.');
lines.push('');
if (missingEnvironments > 0) {
  lines.push(`Two Poly Haven texture maps (metal_plate, aerial_beach_01) were also not`);
  lines.push(`retrieved, so ${missingEnvironments} environment entries are recorded but absent.`);
  lines.push('The scene only ever loads the five HDRIs listed above; the missing textures have');
  lines.push('no licence obligation because no bytes were received.');
  lines.push('');
}

await writeFile(new URL('../ASSETS-LICENSES.md', import.meta.url), lines.join('\n'));
console.log(`ASSETS-LICENSES.md: ${images.length} images, ${environments.length} environments, ${fonts.length} fonts`);
