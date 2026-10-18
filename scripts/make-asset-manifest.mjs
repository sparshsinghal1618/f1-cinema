// Assemble the deliverable ASSET-MANIFEST.json at the repository root from the
// per-directory sources: the WebP image index, the Poly Haven environment list,
// the bundled fonts and the project's own icons. Run after `assets` +
// `optimize-images` + `gen-image-module`.

import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const pub = new URL('../public/', import.meta.url);
const publicPath = (p) => new URL(p.replace(/^\/+/, ''), pub);

const size = async (url) => {
  try {
    return (await stat(url)).size;
  } catch {
    return 0;
  }
};

const images = JSON.parse(await readFile(publicPath('assets/manifest.json'), 'utf8'));
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

const environmentList = JSON.parse(await readFile(publicPath('assets/environments/polyhaven.json'), 'utf8'));
const environments = [];
for (const e of environmentList) {
  if (!e?.file || !existsSync(publicPath(e.file))) continue;
  environments.push({
    id: e.id,
    type: e.type,
    path: e.file,
    bytes: e.bytes ?? (await size(publicPath(e.file))),
    source: e.source,
    license: e.license ?? 'CC0',
    attribution: `${e.id} - Poly Haven (${e.license ?? 'CC0'})`,
  });
}

const fontFiles = (await readdir(new URL('assets/fonts/', pub))).filter((f) => f.endsWith('.woff2')).sort();
const fontFamilies = [...new Set(fontFiles.map((f) => f.replace(/-(400|500|600|700|800|900).*$/, '')))].sort();

const icons = (await readdir(new URL('assets/icons/', pub)))
  .filter((f) => /\.(svg|png|ico)$/.test(f))
  .map((f) => ({ path: `assets/icons/${f}`, bytes: 0, license: 'Original work (this project)', attribution: 'F1' }));

const imageEntries = [];
let imageBytes = 0;
let imageFiles = 0;
for (const [key, e] of Object.entries(images.images)) {
  const variants = (e.variants ?? []).map((v) => v.src);
  for (const p of [e.webp, ...variants]) {
    imageBytes += await size(publicPath(p));
    imageFiles += 1;
  }
  imageEntries.push({
    key,
    category: e.cat,
    path: e.webp,
    width: e.webpW ?? e.w,
    height: e.webpH ?? e.h,
    variants,
    title: e.title,
    author: e.author,
    license: e.license,
    licenseUrl: e.licenseUrl,
    source: e.source,
  });
}

let environmentBytes = 0;
for (const e of environments) environmentBytes += await size(publicPath(e.path));
let fontBytes = 0;
for (const f of fontFiles) fontBytes += await size(new URL(`assets/fonts/${f}`, pub));

const totalBytes = imageBytes + environmentBytes + fontBytes;

const out = {
  project: pkg.name,
  version: pkg.version,
  description: pkg.description,
  generatedAt: new Date().toISOString(),
  summary: {
    images: imageEntries.length,
    imageFiles,
    environments: environments.length,
    fonts: fontFiles.length,
    icons: icons.length,
    models: 0,
    audio: 0,
    totalFiles: imageFiles + environments.length + fontFiles.length + icons.length,
    totalBytes,
  },
  notes: {
    images:
      'Licensed motorsport photography from Wikimedia Commons, converted to WebP with 640/1280/1920/2560 responsive variants. Every entry keeps its author, licence and source URL. The full-resolution .jpg originals are intentionally not shipped; re-run `npm run assets` to restore them.',
    environments: 'HDRI and texture environments from Poly Haven, all CC0.',
    fonts: `Bundled locally as woff2: ${fontFamilies.join(', ')} (SIL Open Font License 1.1).`,
    icons: 'Original project artwork.',
    models:
      'No third-party 3D model ships with this project. Two CC-BY candidates were downloaded, evaluated and rejected; the car is procedural. See public/assets/models/README.md.',
    audio: 'No audio files ship with this project; all sound is synthesised with the Web Audio API.',
  },
  images: imageEntries,
  environments,
  fonts: fontFiles.map((f) => ({ path: `assets/fonts/${f}`, license: 'SIL OFL 1.1' })),
  icons,
  models: [],
  audio: [],
};

await writeFile(new URL('../ASSET-MANIFEST.json', import.meta.url), JSON.stringify(out, null, 2));
console.log(
  `ASSET-MANIFEST.json: ${imageEntries.length} images (${imageFiles} files), ${environments.length} environments, ${fontFiles.length} fonts, ${icons.length} icons, ${(totalBytes / 1048576).toFixed(1)} MB on disk`,
);
