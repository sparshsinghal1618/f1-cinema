// Register one illustrative Commons photograph per Formula One era as the
// `history` image category, so scripts/fetch-missing.mjs can download it.
//
// Complements acquire-assets.mjs: it only adds the history picks and leaves the
// existing picks/candidates untouched. Search results are filtered to bitmaps
// with a permissive licence and a usable resolution.

import { readFile, writeFile } from 'node:fs/promises';

const PICKS = new URL('./out/picks.json', import.meta.url);
const CANDIDATES = new URL('./out/candidates.json', import.meta.url);
const REPORT = new URL('./out/history-picks.json', import.meta.url);
const API = 'https://commons.wikimedia.org/w/api.php';
const UA = { 'User-Agent': 'F1-SiteBuilder/1.0 (offline demo project; contact: local)' };
const MAX_WIDTH = 2560;

const ERAS = [
  { era: '1950-1959', query: 'Alfa Romeo 158' },
  { era: '1959-1962', query: 'Cooper Climax Formula One' },
  { era: '1963-1967', query: 'Lotus 25 Jim Clark' },
  { era: '1968-1972', query: 'Lotus 49 Formula One' },
  { era: '1973-1979', query: 'Lotus 79' },
  { era: '1977-1988', query: 'Renault turbo Formula One' },
  { era: '1988-1993', query: 'Ayrton Senna McLaren' },
  { era: '1994-1999', query: 'Michael Schumacher Benetton' },
  { era: '2000-2005', query: 'Ferrari F2002' },
  { era: '2006-2013', query: 'Red Bull Racing Sebastian Vettel' },
  { era: '2014-2021', query: 'Mercedes Formula One Lewis Hamilton' },
  { era: '2022-2026', query: 'Red Bull RB18' },
];

const ALLOWED = /^(CC0|Public domain|CC BY(-SA)? (2\.0|2\.5|3\.0|4\.0))/;
const SKIP = /logo|wordmark|map|diagram|chart|circuit|flag|trophy|helmet|autograph|signature/i;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson(url, attempt = 0) {
  const response = await fetch(url, { headers: UA });
  if (response.status === 429 && attempt < 5) {
    await sleep(4000 * (attempt + 1));
    return getJson(url, attempt + 1);
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function strip(value) {
  return (value ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function search(term) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: term,
    gsrnamespace: '6',
    gsrlimit: '14',
    prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata',
    iiurlwidth: String(2560),
  });
  const data = await getJson(`https://commons.wikimedia.org/w/api.php?${params}`);
  const pages = Object.values(data?.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info) continue;
    if (!/^image\/(jpeg|png)$/.test(info.mime ?? '')) continue;
    if ((info.width ?? 0) < 1400 || (info.height ?? 0) < 900) continue;
    const title = page.title.replace(/^File:/, '');
    if (SKIP.test(title)) continue;
    const license = strip(info.extmetadata?.LicenseShortName?.value);
    if (!ALLOWED.test(license)) continue;
    return {
      pageid: page.pageid,
      title: page.title,
      width: info.width,
      height: info.height,
      mime: info.mime,
      thumburl: info.thumburl ?? info.url,
      url: info.url,
      descurl: info.descriptionurl,
      license,
      licenseUrl: info.extmetadata?.LicenseUrl?.value,
      artist: strip(info.extmetadata?.Artist?.value) || 'Unknown',
      query: term,
    };
  }
  return null;
}

const candidates = JSON.parse(await readFile(new URL('./out/candidates.json', import.meta.url), 'utf8'));
const picks = JSON.parse(await readFile(new URL('./out/picks.json', import.meta.url), 'utf8'));
candidates.history = [];
picks.history = [];

const report = [];
for (const [index, era] of ERAS.entries()) {
  const found = await search(era.query);
  if (!found) {
    console.log(`${index}:${era.era}:0`);
    report.push({ ...era, pageid: 0 });
  } else {
    candidates.history.push(found);
    picks.history.push(found.pageid);
    console.log(`${index}:${era.era}:${found.pageid}`);
    report.push({ ...era, pageid: found.pageid, title: found.title, license: found.license, width: found.width });
  }
  await sleep(1200);
}

await writeFile(new URL('./out/candidates.json', import.meta.url), `${JSON.stringify(candidates, null, 2)}\n`);
await writeFile(new URL('./out/picks.json', import.meta.url), `${JSON.stringify(picks, null, 2)}\n`);
await writeFile(new URL('./out/history-picks.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(`registered ${picks.history.length}/${ERAS.length}`);
