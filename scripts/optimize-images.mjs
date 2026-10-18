// Post-process the downloaded photographs: build responsive WebP variants so the
// site never has to ship a 3840px original to a phone, and record them in the manifest.

import { readFile, writeFile, rm } from 'node:fs/promises';
import sharp from 'sharp';

const MANIFEST = new URL('../public/assets/manifest.json', import.meta.url);
const ROOT = new URL('../public/', import.meta.url);
const WIDTHS = [640, 1280, 1920];
const MAX_WIDTH = 2560;

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
let done = 0;
let skipped = 0;
let removed = 0;
let bytes = 0;

for (const [key, entry] of Object.entries(manifest.images)) {
  const source = new URL(entry.webp, ROOT);
  let image;
  try {
    image = sharp(await readFile(source));
  } catch {
    skipped += 1;
    continue;
  }
  const meta = await image.metadata();
  const originalWidth = meta.width ?? 0;
  const basePath = entry.webp.replace(/\.webp$/, '');
  const variants = [];

  // Cap the largest asset: full-bleed sections never need more than MAX_WIDTH.
  if (originalWidth > MAX_WIDTH) {
    const capped = `${basePath}-${MAX_WIDTH}.webp`;
    const buf = await sharp(await readFile(source)).resize({ width: MAX_WIDTH }).webp({ quality: 82 }).toBuffer();
    await writeFile(new URL(capped, ROOT), buf);
    variants.push({ w: MAX_WIDTH, src: capped });
    bytes += buf.length;
  } else {
    variants.push({ w: originalWidth, src: entry.webp });
  }

  for (const width of WIDTHS) {
    if (width >= originalWidth) continue;
    const out = `${basePath}-${width}.webp`;
    const buf = await sharp(await readFile(source)).resize({ width }).webp({ quality: 78 }).toBuffer();
    await writeFile(new URL(out, ROOT), buf);
    variants.push({ w: width, src: out });
    bytes += buf.length;
  }

  variants.sort((a, b) => a.w - b.w);
  entry.variants = variants;

  // The site only ever requests the WebP set, so the pristine .jpg originals are
  // dead weight in the shipped build. They stay re-fetchable via `npm run assets`.
  if (entry.jpg) {
    await rm(new URL(entry.jpg, ROOT), { force: true });
    delete entry.jpg;
    removed += 1;
  }
  done += 1;
}

manifest.derived = {
  generated: new Date().toISOString(),
  note: 'Responsive WebP variants derived from the local originals with sharp.',
  originalsRemoved: removed,
  variantBytes: bytes,
};
await writeFile(MANIFEST, JSON.stringify(manifest, null, 2));
console.log(
  `optimized ${done} images, skipped ${skipped}, removed ${removed} jpg originals, wrote ${(bytes / 1024 / 1024).toFixed(1)} MB of variants`,
);
