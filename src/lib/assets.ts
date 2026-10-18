// Asset URL helpers. Every image key resolves through the generated index that is
// produced from public/assets/manifest.json by scripts/gen-image-module.mjs.

import { IMAGES, type ImageEntry } from '../data/images.generated';

const base = import.meta.env.BASE_URL || './';

export function assetUrl(path: string): string {
  return base + path.replace(/^\/+/, '');
}

export function imageEntry(key: string): ImageEntry | undefined {
  return IMAGES[key];
}

export function imageSrc(key: string, fallback = 'assets/images/fallback.svg'): string {
  const entry = IMAGES[key];
  return assetUrl(entry ? entry.src : fallback);
}

export function imageVariants(key: string): { src: string; w: number }[] {
  const entry = IMAGES[key];
  if (!entry) return [];
  const out = (entry.variants ?? []).map((v) => ({ src: assetUrl(v.src), w: v.w }));
  return out.length ? out : [{ src: assetUrl(entry.src), w: entry.w }];
}

export function imageSrcSet(key: string): string | undefined {
  const variants = imageVariants(key);
  if (variants.length < 2) return undefined;
  return variants.map((v) => `${v.src} ${v.w}w`).join(', ');
}

export function imageSizes(): string {
  return '(max-width: 760px) 92vw, (max-width: 1200px) 60vw, 46vw';
}

export function imageCredit(key: string): ImageEntry | undefined {
  return IMAGES[key];
}

export function placeholderFor(key: string): string | undefined {
  return IMAGES[key]?.lqip;
}

export function hasImage(key: string): boolean {
  return Boolean(IMAGES[key]);
}
