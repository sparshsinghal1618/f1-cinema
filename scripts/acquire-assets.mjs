/**
 * F1 — asset acquisition pipeline.
 *
 * Modes:
 *   node scripts/acquire-assets.mjs search   -> writes scripts/out/candidates.json (review step)
 *   node scripts/acquire-assets.mjs download -> reads scripts/out/picks.json, downloads, verifies,
 *                                               converts to WebP (sharp), writes public/assets
 *                                               + src/data/manifest.json + attribution records
 *   node scripts/acquire-assets.mjs specs    -> verified circuit/driver data from Wikipedia wikitext
 *
 * Sources: Wikimedia Commons (API w/ license metadata), Poly Haven (CC0 HDRIs/textures).
 * No API keys required. Attribution data is captured for ASSETS-LICENSES.md.
 */
import { mkdir, writeFile, readFile, stat, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '').replace(/^(\/([A-Za-z]:))/, '$2')), '..');
const OUT = path.join(ROOT, 'scripts', 'out');
const PUB = path.join(ROOT, 'public', 'assets');
const UA = 'F1-SiteBuilder/1.0 (offline demo project; contact: local)';

const mode = process.argv[2] || 'search';

/* ---------------------------------------------------------------- helpers */
async function getJson(url, tries = 6) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } });
      if (r.ok) return await r.json();
      if (r.status === 404) return null;
      if (r.status === 429) {
        const wait = 4000 * (i + 1);
        console.error(`  429, backing off ${wait}ms`);
        await new Promise((res) => setTimeout(res, wait));
        continue;
      }
      throw new Error(`HTTP ${r.status}`);
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise((res) => setTimeout(res, 1200 * (i + 1)));
    }
  }
}

async function download(url, dest, tries = 8) {
  let throttled = false;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (r.status === 429) {
        throttled = true;
        const wait = Math.min(45000, 6000 * (i + 1));
        console.error(`  429, waiting ${wait}ms`);
        await new Promise((res) => setTimeout(res, wait));
        continue;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 5000) throw new Error('suspiciously small');
      await writeFile(dest, buf);
      return buf;
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
    }
  }
  // The loop can also end by exhausting retries on 429 alone; callers need to
  // know that specifically, so they can switch to the (usually cached) original.
  if (throttled) {
    const err = new Error('429 throttled by the image CDN');
    err.code = 'E429';
    throw err;
  }
}

const stripTags = (s) => (s || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/\s+/g, ' ').trim();

/* ------------------------------------------------------- Commons search */
const ALLOWED_LICENSE = /(pd|cc0|cc-by|cc by|public domain|attribution)/i;

async function commonsSearch(query, limit = 14) {
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2' +
    '&generator=search&gsrnamespace=6&gsrlimit=' + limit +
    '&gsrsearch=' + encodeURIComponent(query + ' filetype:bitmap') +
    '&prop=imageinfo&iiprop=url%7Cextmetadata%7Csize%7Cmime&iiurlwidth=2560';
  const data = await getJson(url);
  if (!data?.query?.pages) return [];
  return data.query.pages.map((p) => {
    const ii = p.imageinfo?.[0];
    if (!ii) return null;
    const em = ii.extmetadata || {};
    const lic = stripTags(em.LicenseShortName?.value || '');
    return {
      pageid: p.pageid,
      title: p.title,
      query,
      width: ii.width,
      height: ii.height,
      mime: ii.mime,
      thumburl: ii.thumburl,
      url: (ii.url || '').split('?')[0],
      descurl: ii.descriptionurl,
      license: lic,
      licenseUrl: stripTags(em.LicenseUrl?.value || ''),
      artist: stripTags(em.Artist?.value || ''),
      credit: stripTags(em.Credit?.value || ''),
      description: stripTags(em.ImageDescription?.value || '').slice(0, 300),
      categories: stripTags(em.Categories?.value || '').slice(0, 400),
    };
  }).filter(Boolean);
}

function plausible(c) {
  if (!c.mime || !/jpeg|png/.test(c.mime)) return false;
  if (c.width < 1200 || c.height < 700) return false;
  if (c.width / c.height > 3.2 || c.height / c.width > 1.9) return false;
  if (!ALLOWED_LICENSE.test(c.license)) return false;
  const t = (c.title + ' ' + c.description + ' ' + c.categories).toLowerCase();
  const bad = /(logo|wordmark|icon|svg|poster|diagram|map of|track map|seating plan|blueprint|kart|slot car|toy|model kit|rc car|toyota|supercar|lamborghini|ferrari (488|296|f8|sf90)|video game|screenshot|sims|assetto|forza)/;
  if (bad.test(t)) return false;
  const good = /(formula|f1|fia|grand prix|race|racing|circuit|pit|tyre|tire|helmet|driver|monaco|silverstone|spa|suzuka|monza|singapore|paddock|grid|start|lap|track)/;
  return good.test(t);
}

/* Category plan — required buckets from the brief */
const SEARCH_PLAN = {
  hero: [
    'Formula One car night race floodlights',
    'Formula One 2023 car track action',
    'Formula One show car studio',
    'Formula One front wing low angle',
    'Formula One car rain spray wet track',
    'Red Bull Racing Formula One car',
    'Mercedes AMG Formula One car',
    'Ferrari Formula One car 2019',
    'McLaren Formula One car',
    'Formula One car speed panning',
    'Bahrain International Circuit Formula One night',
    'Formula One Singapore Grand Prix night race',
  ],
  cars: [
    'Formula One front wing detail',
    'Formula One rear wing detail',
    'Formula One sidepod detail',
    'Formula One nose cone detail',
    'Formula One halo cockpit',
    'Formula One suspension detail',
  ],
  circuits: [
    'Singapore Grand Prix night Marina Bay',
    'Bahrain International Circuit night race',
    'Las Vegas Grand Prix night Strip',
    'Formula One night race circuit floodlight',
    'Circuit de Monaco 2023',
    'Silverstone Circuit 2023',
    'Circuit de Spa-Francorchamps 2022',
    'Suzuka International Racing Course',
    'Autodromo Nazionale di Monza',
    'Marina Bay Street Circuit',
    'Monaco Grand Prix Monte Carlo 2019',
    'Formula One Monaco harbour swimming pool corner',
    'Monte Carlo street circuit Grand Prix',
    'Bahrain International Circuit floodlights night',
    'Yas Marina Circuit night',
  ],
  pitlane: [
    'Formula One pit stop tyre change',
    'Formula One pit crew garage',
    'Formula One pit lane night',
    'Formula One garage mechanics',
    'pit stop Formula 1 2019',
    'Formula One pit stop 2022',
    'Formula One mechanics wing change',
    'Formula One car lifting jack pit',
  ],
  drivers: [
    'Formula One driver helmet portrait',
    'racing driver helmet visor',
    'Formula One driver 2023 portrait',
    'Formula One driver racing suit',
    'Formula One driver parc ferme 2022',
    'racing driver cockpit helmet',
    'Formula One world champion driver',
    'Formula One driver grid portrait',
    'Lewis Hamilton 2019 Mercedes',
    'Max Verstappen 2017 Red Bull',
    'Ayrton Senna McLaren 1991',
    'Michael Schumacher 2003 Ferrari',
    'Charles Leclerc 2019 Ferrari',
    'Fernando Alonso 2018 McLaren',
    'Lando Norris 2019 McLaren',
    'Sebastian Vettel helmet visor',
  ],
  details: [
    'Formula One tyre Pirelli',
    'Formula One steering wheel',
    'carbon fibre weave texture',
    'racing car brake disc carbon',
    'carbon fibre bodywork motorsport',
    'Formula One brake caliper disc',
    'racing slick tyre tread',
  ],
  gallery: [
    'Formula One 2022 race action overtaking',
    'Formula One Monaco Grand Prix 2023 race',
    'Formula One Spa Francorchamps race 2022',
    'Formula One Suzuka race',
    'Formula One qualifying lap',
    'Formula One start grid lights',
  ],
  backgrounds: [
    'race track paddock grandstand',
    'pit lane empty circuit',
    'racetrack aerial view motorsport',
    'motorsport circuit sunset grandstand',
    'Formula One paddock building',
    'Circuit of the Americas grandstand',
    'Hockenheimring circuit view',
    'racetrack pit building',
  ],
};

async function searchMode() {
  await mkdir(OUT, { recursive: true });
  const out = {};
  const existing = path.join(OUT, 'candidates.json');
  if (existsSync(existing)) {
    try { Object.assign(out, JSON.parse(await readFile(existing, 'utf8'))); } catch { /* fresh */ }
  }
  for (const [cat, queries] of Object.entries(SEARCH_PLAN)) {
    const seen = new Map((out[cat] || []).map((c) => [c.pageid, c]));
    for (const q of queries) {
      try {
        const res = await commonsSearch(q);
        for (const c of res) if (!seen.has(c.pageid) && plausible(c)) seen.set(c.pageid, c);
      } catch (e) {
        console.error(`search failed [${q}]: ${e.message}`);
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    out[cat] = [...seen.values()];
    console.log(`${cat}: ${out[cat].length} candidates`);
  }
  await writeFile(path.join(OUT, 'candidates.json'), JSON.stringify(out, null, 2));
  console.log('-> scripts/out/candidates.json');
}

/* ------------------------------------------------------------- download */
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

async function downloadMode() {
  const picks = JSON.parse(await readFile(path.join(OUT, 'picks.json'), 'utf8')); // {cat: [pageid,...]}
  const candidates = JSON.parse(await readFile(path.join(OUT, 'candidates.json'), 'utf8'));
  const sharp = (await import('sharp')).default;

  // Pageids may live in any category pool; index globally, `cat` only sets the folder.
  const global = new Map();
  for (const list of Object.values(candidates)) for (const c of list) if (!global.has(c.pageid)) global.set(c.pageid, c);

  const manifest = { images: {}, attribution: [] };
  const failed = [];
  // Historic runs named files by success order; delete only those orphans.
  // Keeping already-fetched files is what lets repeated runs converge under the
  // Commons rate limit instead of re-downloading all fifty picks every time.
  const expected = new Set();
  for (const [cat, ids] of Object.entries(picks)) {
    ids.forEach((id, idx) => {
      const c = global.get(id);
      if (!c) return;
      const base = `${String(idx).padStart(2, '0')}-${safeName(c.title)}`;
      expected.add(`${cat}/${base}.jpg`);
      expected.add(`${cat}/${base}.webp`);
    });
  }
  try {
    const entries = await (await import('node:fs/promises')).readdir(path.join(PUB, 'images'), {
      recursive: true,
      withFileTypes: true,
    });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const dir = entry.parentPath || entry.path;
      if (expected.has(`${path.basename(dir)}/${entry.name}`)) continue;
      await rm(path.join(dir, entry.name), { force: true }).catch(() => {});
    }
  } catch {
    /* folder does not exist yet */
  }

  for (const [cat, ids] of Object.entries(picks)) {
    const dir = path.join(PUB, 'images', cat);
    await mkdir(dir, { recursive: true });
    // Deterministic index = position in picks.json, stable across re-runs.
    for (let idx = 0; idx < ids.length; idx++) {
      const c = global.get(ids[idx]);
      if (!c) { console.error(`!! ${cat}[${idx}]: pageid ${ids[idx]} not found`); failed.push(`${cat}[${idx}]`); continue; }
      const base = `${String(idx).padStart(2, '0')}-${safeName(c.title)}`;
      const jpgPath = path.join(dir, `${base}.jpg`);
      const webpPath = path.join(dir, `${base}.webp`);
      try {
        if (!existsSync(jpgPath)) {
          try {
            await download(c.thumburl || c.url, jpgPath);
          } catch (e) {
            // Thumbed derivatives are throttled hardest; the original file
            // path is far more likely to be served, and usually cached.
            if (e.code !== 'E429' || !c.url || c.url === c.thumburl) throw e;
            console.warn(`  thumb throttled, fetching the original instead: ${base}`);
            await download(c.url, jpgPath, 4);
          }
        }
        let buf = await readFile(jpgPath);
        if (!(buf[0] === 0xff && buf[1] === 0xd8)) {
          // PNG / TIFF sources: transcode so every asset shares one format.
          const tmp = `${jpgPath}.src`;
          await writeFile(tmp, buf);
          await sharp(tmp).jpeg({ quality: 92 }).toFile(jpgPath);
          await rm(tmp, { force: true });
          buf = await readFile(jpgPath);
        }
        const meta = await sharp(buf).metadata();
        if (!meta.width || meta.width < 1000) throw new Error(`too small ${meta.width}`);
        if (!existsSync(webpPath)) await sharp(buf).webp({ quality: 82, effort: 4 }).toFile(webpPath);
        const wmeta = await sharp(webpPath).metadata();
        const rel = (f) => 'assets/images/' + cat + '/' + path.basename(f);
        manifest.images[`${cat}-${idx}`] = {
          cat,
          webp: rel(webpPath),
          jpg: rel(jpgPath),
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
        manifest.attribution.push({
          file: rel(webpPath), title: c.title.replace(/^File:/, ''), author: c.artist || 'Unknown',
          license: c.license, licenseUrl: c.licenseUrl, source: c.descurl,
        });
        console.log(`ok  ${cat}/${base}  ${meta.width}x${meta.height}  ${c.license}`);
      } catch (e) {
        console.error(`FAIL ${cat}/${base}: ${e.message}`);
        failed.push(`${cat}[${idx}]`);
        try { await (await import('node:fs/promises')).rm(jpgPath, { force: true }); } catch { /* ignore */ }
      }
      await new Promise((r) => setTimeout(r, 600)); // be kind to the thumb CDN
    }
  }
  await mkdir(path.join(PUB), { recursive: true });
  await writeFile(path.join(PUB, 'manifest.json'), JSON.stringify(manifest, null, 2));
  await writeFile(path.join(OUT, 'attribution.json'), JSON.stringify(manifest.attribution, null, 2));
  console.log(`\nmanifest: ${Object.keys(manifest.images).length} images -> public/assets/manifest.json`);
  if (failed.length) console.log('FAILED picks (rerun to retry):', failed.join(', '));
}

/* ------------------------------------------------- Poly Haven HDRI/CTEX */
async function polyhavenMode() {
  await mkdir(path.join(PUB, 'environments'), { recursive: true });
  await mkdir(path.join(PUB, 'textures'), { recursive: true });
  const wantedHdri = ['dikhololo_night', 'satara_night', 'studio_small_09', 'moonless_golf', 'kloofendal_48d_partly_cloudy_puresky'];
  const wantedTex = ['metal_plate', 'streaky_metal', 'rough_concrete_bricks', 'aerial_beach_01'];
  const results = [];

  for (const id of wantedHdri) {
    try {
      const files = await getJson(`https://api.polyhaven.com/files/${id}`);
      if (!files) { console.error(`hdri ${id}: 404`); continue; }
      const url = files.hdri?.['1k']?.hdr?.url || files.hdri?.['2k']?.hdr?.url;
      if (!url) { console.error(`hdri ${id}: no 1k/2k (${Object.keys(files).join(',')})`); continue; }
      const dest = path.join(PUB, 'environments', `${id}.hdr`);
      if (!existsSync(dest)) await download(url, dest);
      const s = await stat(dest);
      results.push({ id, type: 'hdri', file: `assets/environments/${id}.hdr`, bytes: s.size, source: `https://polyhaven.com/a/${id}`, license: 'CC0' });
      console.log(`ok hdri ${id} ${(s.size / 1e6).toFixed(1)}MB`);
    } catch (e) { console.error(`FAIL hdri ${id}: ${e.message}`); }
    await new Promise((r) => setTimeout(r, 300));
  }

  for (const id of wantedTex) {
    try {
      const files = await getJson(`https://api.polyhaven.com/files/${id}`);
      if (!files) { console.error(`tex ${id}: 404`); continue; }
      const diff = files.diff?.['2k']?.jpg?.url || files.diff?.['1k']?.jpg?.url;
      const nor = files.nor?.['2k']?.jpg?.url || files.nor?.['1k']?.jpg?.url;
      const rec = { id, type: 'texture', source: `https://polyhaven.com/a/${id}`, license: 'CC0', files: {} };
      for (const [kind, u] of [['diff', diff], ['nor', nor]]) {
        if (!u) continue;
        const dest = path.join(PUB, 'textures', `${id}-${kind}.jpg`);
        if (!existsSync(dest)) await download(u, dest);
        rec.files[kind] = `assets/textures/${id}-${kind}.jpg`;
      }
      results.push(rec);
      console.log(`ok tex ${id}`);
    } catch (e) { console.error(`FAIL tex ${id}: ${e.message}`); }
    await new Promise((r) => setTimeout(r, 300));
  }
  await writeFile(path.join(PUB, 'environments', 'polyhaven.json'), JSON.stringify(results, null, 2));
}

/* -------------------------------------------- verified specs from wiki */
const CIRCUIT_PAGES = {
  monaco: 'Circuit de Monaco',
  silverstone: 'Silverstone Circuit',
  spa: 'Circuit de Spa-Francorchamps',
  suzuka: 'Suzuka International Racing Course',
  monza: 'Autodromo Nazionale di Monza',
  singapore: 'Marina Bay Street Circuit',
};

const DRIVER_PAGES = {
  hamilton: 'Lewis Hamilton',
  verstappen: 'Max Verstappen',
  alonso: 'Fernando Alonso',
  leclerc: 'Charles Leclerc',
  norris: 'Lando Norris',
  senna: 'Ayrton Senna',
  schumacher: 'Michael Schumacher',
};

// Modern driver infoboxes delegate to {{F1stat|CODE|field}} — expand via API.
const F1STAT_CODES = { hamilton: 'HAM', verstappen: 'VER', alonso: 'ALO', leclerc: 'LEC', norris: 'NOR' };

async function expandTemplate(text) {
  const url = `https://en.wikipedia.org/w/api.php?action=expandtemplates&format=json&prop=wikitext&text=${encodeURIComponent(text)}`;
  const d = await getJson(url);
  return d?.expandtemplates?.wikitext ?? null;
}

async function wikiWikitext(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=parse&format=json&prop=wikitext&redirects=1&page=${encodeURIComponent(title)}`;
  const d = await getJson(url);
  if (!d?.parse) throw new Error(d?.error?.info || 'parse failed');
  return d.parse.wikitext['*'] || '';
}

function grab(wt, keys) {
  for (const k of keys) {
    const re = new RegExp(`^\\s*\\|\\s*${k}\\s*=\\s*(.+)$`, 'im');
    const m = wt.match(re);
    if (m) {
      let v = m[1];
      v = v.split('{{')[0]; // cut at inline citation/template
      v = v.replace(/<[^>]*>/g, '').replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, '$2').trim();
      v = v.replace(/\(+$/, '').trim(); // trailing "(" from cut templates
      if (v && !/^(image|yes|no)$/i.test(v)) return v;
    }
  }
  return null;
}

async function specsMode() {
  const out = { circuits: {}, fetched: new Date().toISOString(), source: 'English Wikipedia article wikitext (infobox)' };
  for (const [key, page] of Object.entries(CIRCUIT_PAGES)) {
    try {
      const wt = await wikiWikitext(page);
      const fields = wt.split('\n').filter((l) => /^\s*\|/.test(l) && /(length|corner|radius|turn)/i.test(l)).slice(0, 6);
      out.circuits[key] = {
        page,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.replace(/ /g, '_'))}`,
        length: grab(wt, ['length_km', 'length', 'lap_length']),
        corners: grab(wt, ['turns', 'corners', 'corner_count', 'number_of_corners']),
        record: grab(wt, ['record_lap', 'record_time', 'lap_record']),
        debugFields: fields.map((f) => f.trim().slice(0, 90)),
      };
      console.log(key, JSON.stringify(out.circuits[key]));
    } catch (e) { console.error(`FAIL ${key}: ${e.message}`); }
    await new Promise((r) => setTimeout(r, 400));
  }

  out.drivers = {};
  for (const [key, page] of Object.entries(DRIVER_PAGES)) {
    try {
      const wt = await wikiWikitext(page);
      const d = {
        page,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.replace(/ /g, '_'))}`,
        wins: grab(wt, ['wins']),
        poles: grab(wt, ['poles']),
        podiums: grab(wt, ['podiums']),
        points: grab(wt, ['points']),
        races: grab(wt, ['races']),
        titles: grab(wt, ['championships']),
        team2026: grab(wt, ['2026 Team', '2026 team']),
        firstWin: grab(wt, ['first_win']),
        lastWin: grab(wt, ['last_win']),
      };
      const code = F1STAT_CODES[key];
      if (code) {
        for (const f of ['wins', 'poles', 'podiums', 'careerpoints', 'entries', 'starts']) {
          const v = await expandTemplate(`{{F1stat|${code}|${f}}}`).catch(() => null);
          if (v && /^\d/.test(v)) d[f === 'careerpoints' ? 'points' : f === 'entries' ? 'entries' : f] = v.replace(/\[\[|\]\]/g, '');
        }
        await new Promise((r) => setTimeout(r, 350));
      }
      out.drivers[key] = d;
      console.log(key, JSON.stringify(d));
    } catch (e) { console.error(`FAIL driver ${key}: ${e.message}`); }
    await new Promise((r) => setTimeout(r, 400));
  }
  await mkdir(OUT, { recursive: true });
  await writeFile(path.join(OUT, 'circuit-specs.json'), JSON.stringify(out, null, 2));
  console.log('-> scripts/out/circuit-specs.json');
}

/* ------------------------------------------------------------------ run */
if (mode === 'search') await searchMode();
else if (mode === 'download') await downloadMode();
else if (mode === 'polyhaven') await polyhavenMode();
else if (mode === 'specs') await specsMode();
else if (mode === 'list') {
  const candidates = JSON.parse(await readFile(path.join(OUT, 'candidates.json'), 'utf8'));
  for (const [cat, list] of Object.entries(candidates)) {
    console.log(`\n=== ${cat} (${list.length}) ===`);
    for (const c of list) {
      console.log(`${c.pageid}\t${c.width}x${c.height}\t${c.license.padEnd(16)}\t${c.title.replace(/^File:/, '').slice(0, 95)}`);
    }
  }
}
else console.error('unknown mode:', mode);
