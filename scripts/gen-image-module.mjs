// Emit a typed module from public/assets/manifest.json so the app can reference
// images by stable key with full attribution metadata and a tiny inline LQIP.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const MANIFEST = new URL('../public/assets/manifest.json', import.meta.url);
const ROOT = new URL('../public/', import.meta.url);
const OUT = new URL('../src/data/images.generated.ts', import.meta.url);

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
const entries = [];

for (const [key, e] of Object.entries(manifest.images)) {
  let lqip;
  try {
    const buf = await sharp(await readFile(new URL(e.webp, ROOT))).resize({ width: 32 }).webp({ quality: 38 }).toBuffer();
    lqip = `data:image/webp;base64,${buf.toString('base64')}`;
  } catch {
    lqip = undefined;
  }
  entries.push({
    key,
    cat: e.cat,
    src: e.webp,
    w: e.webpW ?? e.w,
    h: e.webpH ?? e.h,
    variants: e.variants ?? [],
    title: e.title,
    author: e.author,
    license: e.license,
    licenseUrl: e.licenseUrl,
    source: e.source,
    lqip,
  });
}

const body = entries
  .map((e) => {
    const variants = e.variants.length
      ? `variants: [${e.variants.map((v) => `{ w: ${v.w}, src: ${JSON.stringify(v.src)} }`).join(', ')}], `
      : '';
    const lqip = e.lqip ? `lqip: ${JSON.stringify(e.lqip)}, ` : '';
    return `  ${JSON.stringify(e.key)}: { cat: ${JSON.stringify(e.cat)}, src: ${JSON.stringify(e.src)}, w: ${
      e.w ?? 0
    }, h: ${e.h ?? 0}, ${variants}title: ${JSON.stringify(e.title)}, author: ${JSON.stringify(
      e.author ?? 'unknown',
    )}, license: ${JSON.stringify(e.license ?? 'unknown')}, licenseUrl: ${JSON.stringify(
      e.licenseUrl ?? '',
    )}, source: ${JSON.stringify(e.source ?? '')}, ${lqip}},`;
  })
  .join('\n');

const file = `// GENERATED FILE — do not edit by hand.
// Source: public/assets/manifest.json via scripts/gen-image-module.mjs
// Regenerate with: node scripts/optimize-images.mjs && node scripts/gen-image-module.mjs

export interface ImageVariant {
  w: number;
  src: string;
}

export interface ImageEntry {
  cat: string;
  src: string;
  w: number;
  h: number;
  variants?: ImageVariant[];
  title: string;
  author: string;
  license: string;
  licenseUrl: string;
  source: string;
  lqip?: string;
}

export const IMAGES: Record<string, ImageEntry> = {
${body}
};

export const IMAGE_KEYS = Object.keys(IMAGES);
`;

await mkdir(new URL('../src/data/', import.meta.url), { recursive: true });
await writeFile(OUT, file);
console.log(`wrote ${entries.length} image entries to src/data/images.generated.ts`);
