// Recover image picks that previously failed to download (Wikimedia CDN 429) and
// merge them into the existing manifest without disturbing entries that are already
// present. Also registers the Charles Leclerc portrait pick, which had no selection.
//
// Unlike acquire-assets.mjs this never writes a .jpg to disk: the shipped build keeps
// only WebP plus responsive variants, so a full re-run of the downloader would
// needlessly re-fetch ~50 multi-megabyte originals.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const PUB = fileURLToPath(new URL('../public/', import.meta.url));
const PICKS = new URL('./out/picks.json', import.meta.url);
const CANDIDATES = new URL('./out/candidates.json', import.meta.url);
const MANIFEST = new URL('../public/assets/manifest.json', import.meta.url);

const UA = { 'User-Agent': 'F1-SiteBuilder/1.0 (offline demo project; contact: local)' };
const MAX_WIDTH = 2560;

// Optional category filter: `node scripts/fetch-missing.mjs drivers gallery`
const ONLY = process.argv.slice(2).filter((arg) => !arg.startsWith('-'));

// Picks to register before recovering (cat -> Commons page id).
const ADDITIONS = {
  // FIA F1 Austria 2023 Charles Leclerc - Lukas Raich, CC BY-SA 4.0.
  drivers: [133976967],
};

function safeName(title) {
  return title
    .replace(/^File:/i, '')
    .replace(/\.(jpe?g|png)$/i, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 70);
}

const strip = (s) => String(s ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

async function getJson(url) {
  const r = await fetch(url, { headers: UA });
  if (r.status === 429) throw Object.assign(new Error('429 throttled'), { code: 'E429' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function fetchCandidate(pageid) {
  const api =
    `https://commons.wikimedia.org/w/api.php?action=query&pageids=${pageid}` +
    `&prop=imageinfo&iiprop=url%7Cextmetadata%7Csize%7Cmime&iiurlwidth=${MAX_WIDTH}&format=json`;
  const d = await getJson(api);
  const p = Object.values(d.query?.pages ?? {})[0];
  const ii = p?.imageinfo?.[0];
  if (!ii) throw new Error(`pageid ${pageid} has no imageinfo`);
  const em = ii.extmetadata ?? {};
  return {
    pageid,
    title: p.title,
    query: 'registered addition',
    width: ii.width,
    height: ii.height,
    mime: ii.mime,
    thumburl: ii.thumburl,
    url: ii.url,
    descurl: ii.descriptionurl,
    license: strip(em.LicenseShortName?.value),
    licenseUrl: em.LicenseUrl?.value,
    artist: strip(em.Artist?.value),
    credit: strip(em.Credit?.value),
    description: strip(em.ImageDescription?.value),
    categories: strip(em.Categories?.value),
  };
}

async function download(url, attempt = 0) {
  const r = await fetch(url, { headers: UA });
  if (r.status === 429) {
    if (attempt >= 5) throw Object.assign(new Error('429 throttled by the image CDN'), { code: 'E429' });
    const wait = 5000 * (attempt + 1);
    console.log(`  429, waiting ${wait}ms`);
    await new Promise((res) => setTimeout(res, wait));
    return download(url, attempt + 1);
  }
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

const picks = JSON.parse(await readFile(PICKS, 'utf8'));
const candidates = JSON.parse(await readFile(CANDIDATES, 'utf8'));
const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));

for (const [cat, ids] of Object.entries(ADDITIONS)) {
  candidates[cat] ??= [];
  picks[cat] ??= [];
  const known = new Set(candidates[cat].map((c) => c.pageid));
  for (const id of ids) {
    if (!known.has(id)) {
      const c = await fetchCandidate(id);
      candidates[cat].push(c);
      console.log(`registered candidate ${cat} ${id}: ${c.title}`);
    }
    if (!picks[cat].includes(id)) {
      picks[cat].push(id);
      console.log(`registered pick ${cat}[${picks[cat].length - 1}] = ${id}`);
    }
  }
}

await writeFile(PICKS, `${JSON.stringify(picks, null, 2)}\n`);
await writeFile(CANDIDATES, `${JSON.stringify(candidates, null, 2)}\n`);

const pool = new Map();
for (const list of Object.values(candidates)) for (const c of list) if (!pool.has(c.pageid)) pool.set(c.pageid, c);

let added = 0;
let kept = 0;
const failed = [];

for (const [cat, ids] of Object.entries(picks)) {
  if (ONLY.length && !ONLY.includes(cat)) continue;
  const dir = path.join(PUB, 'assets', 'images', cat);
  await mkdir(dir, { recursive: true });
  for (let idx = 0; idx < ids.length; idx++) {
    const key = `${cat}-${idx}`;
    const existing = manifest.images[key];
    if (existing && existsSync(path.join(PUB, existing.webp))) {
      kept += 1;
      continue;
    }
    const c = pool.get(ids[idx]);
    if (!c) {
      console.log(`!! ${key}: pageid ${ids[idx]} not in the candidate pool`);
      failed.push(key);
      continue;
    }
    const base = `${String(idx).padStart(2, '0')}-${safeName(c.title)}`;
    const rel = `assets/images/${cat}/${base}.webp`;
    try {
      let buf;
      try {
        buf = await download(c.thumburl || c.url);
      } catch (e) {
        if (e.code !== 'E429' || !c.url || c.url === c.thumburl) throw e;
        console.log(`  thumb throttled, fetching the original instead: ${base}`);
        buf = await download(c.url);
      }
      let img = sharp(buf);
      const meta = await img.metadata();
      if (!meta.width || meta.width < 1000) throw new Error(`too small (${meta.width}px)`);
      if (!/^jpe?g$/.test(meta.format ?? '')) {
        img = sharp(await sharp(buf).jpeg({ quality: 92 }).toBuffer());
      }
      const out = await img.resize({ width: MAX_WIDTH, withoutEnlargement: true }).webp({ quality: 82, effort: 4 }).toBuffer();
      await writeFile(path.join(dir, `${base}.webp`), out);
      const wmeta = await sharp(out).metadata();
      manifest.images[key] = {
        cat,
        webp: rel,
        w: meta.width,
        h: meta.height,
        webpW: wmeta.width,
        webpH: wmeta.height,
        title: c.title.replace(/^File:/, ''),
        source: c.descurl,
        author: c.artist || 'Unknown',
        license: c.license,
        licenseUrl: c.licenseUrl,
      };
      added += 1;
      console.log(`ok  ${key}  ${meta.width}x${meta.height}  ${c.license}  ${base}`);
    } catch (e) {
      console.log(`FAIL ${key} (${base}): ${e.message}`);
      failed.push(key);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}

// Keep the derived attribution list consistent with what the manifest now holds.
manifest.attribution = Object.entries(manifest.images).map(([, e]) => ({
  file: e.webp,
  title: e.title,
  author: e.author,
  license: e.license,
  licenseUrl: e.licenseUrl,
  source: e.source,
}));

await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`\nadded ${added}, kept ${kept}, failed ${failed.length}${failed.length ? `: ${failed.join(', ')}` : ''}`);
console.log(`manifest now holds ${Object.keys(manifest.images).length} images`);
