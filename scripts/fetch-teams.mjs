// Fetch the 2026 Formula One grid for the site's teams section.
//
// The season article's entrants table supplies the team, constructor, chassis,
// power unit and race drivers. Each team's own article supplies the descriptive
// infobox values (base, principal, championships, first entry, race and win
// counts), read from the rendered HTML so nested templates do not matter.
//
// Output: scripts/out/teams.json, verbatim. src/data/teams.ts is authored from it.

import { writeFile } from 'node:fs/promises';

const API = 'https://en.wikipedia.org/w/api.php';
const UA = { 'User-Agent': 'F1-site-builder/1.0 (educational project; contact: local)' };
const OUT = new URL('./out/teams.json', import.meta.url);
const SEASON = '2026 Formula One World Championship';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function api(params) {
  const query = new URLSearchParams({ format: 'json', redirects: '1', ...params });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(`${API}?${query}`, { headers: UA });
    if (response.ok) return response.json();
    if (response.status === 429) {
      await sleep(4000 * (attempt + 1));
      continue;
    }
    throw new Error(`HTTP ${response.status}`);
  }
  throw new Error('rate limited');
}

async function pageField(page, prop) {
  const json = await api({ action: 'parse', prop, page });
  if (!json.parse?.[prop]) throw new Error(`no ${prop} for ${page}`);
  return prop === 'wikitext' ? json.parse.wikitext['*'] : json.parse.text['*'];
}

const stripRefs = (value) => value.replace(/<ref[\s\S]*?(<\/ref>|\/>)/gi, '');
const unlink = (value) => value.replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, '$2');
const linkTargets = (value) => [...value.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]);

function clean(value) {
  return unlink(stripRefs(value))
    .replace(/\{\{nowrap\|/gi, '')
    .replace(/\{\{flagg?\|[^}]*\}\}/gi, '')
    .replace(/\{\{flagicon[^}]*\}\}/gi, '')
    .replace(/\}\}/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/'''/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// `| attr="x" | content` — drop the attribute prefix from a wiki table cell.
const ATTRS = /^[^|\[\]{}<>]*=[^|\[\]{}<>]*\|/;
const cellContent = (raw) => {
  const match = raw.match(ATTRS);
  return match ? raw.slice(match[0].length) : raw;
};

function parseEntrants(source) {
  const lines = source.split('\n');
  const start = lines.findIndex((line) => /rowspan="2"\|Entrant/.test(line));
  let end = lines.length;
  for (let i = start; i < lines.length; i += 1) {
    if (/^\|\}/.test(lines[i])) {
      end = i;
      break;
    }
  }

  const rows = [];
  let row = null;
  for (const line of lines.slice(start, end)) {
    if (/^\|-/.test(line)) {
      row = { cells: [], constructor: null };
      rows.push(row);
      continue;
    }
    if (!row) continue;
    if (/^!/.test(line)) {
      row.constructor ??= line.replace(/^!\s*/, '');
      continue;
    }
    if (/^\|/.test(line)) row.cells.push(line.replace(/^\|\s*/, ''));
  }

  const splitList = (raw) =>
    stripRefs(raw)
      .split(/<br\s*\/?>/i)
      .map((chunk) => clean(chunk))
      .filter(Boolean);

  const teams = [];
  for (const candidate of rows) {
    if (candidate.cells.length < 6 || !candidate.constructor) continue;
    const [entrant, chassis, power, numbers, drivers, rounds] = candidate.cells.map(cellContent);
    const targets = linkTargets(candidate.constructor);
    if (!targets.length) continue;
    const firstLink = candidate.constructor.match(/\[\[([^\]|]*)(?:\|([^\]]*))?\]\]/);
    teams.push({
      entrant: clean(entrant),
      short: clean(firstLink ? firstLink[2] || firstLink[1] : candidate.constructor),
      constructor: clean(cellContent(candidate.constructor)),
      teamPage: targets[0].replace(/_/g, ' '),
      chassis: clean(chassis),
      powerUnit: clean(power),
      numbers: clean(numbers),
      drivers: splitList(drivers),
      rounds: splitList(rounds),
    });
  }
  return teams;
}

const decode = (value) =>
  value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&rsquo;/g, "'")
    .replace(/&ndash;/g, '-')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

const htmlText = (value) =>
  decode(
    value
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<span class="geo[\s\S]*?<\/span>/gi, ' ')
      .replace(/<[^>]*>/g, ' '),
  )
    .replace(/[\uFEFF\u200B]/g, '')
    .replace(/\[\s*\d+\s*\]/g, '')
    .replace(/\s+([,.;])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

function infoboxRows(html) {
  const start = html.search(/<table\b[^>]*class="[^"]*infobox/i);
  if (start < 0) return [];
  const tag = /<table\b[^>]*>|<\/table>/gi;
  tag.lastIndex = start;
  let depth = 0;
  let end = html.length;
  for (let match = tag.exec(html); match; match = tag.exec(html)) {
    if (match[0][1] === '/') {
      depth -= 1;
      if (depth === 0) {
        end = match.index;
        break;
      }
    } else {
      depth += 1;
    }
  }

  const rows = [];
  for (const chunk of html.slice(start, end).split(/<tr\b[^>]*>/i).slice(1)) {
    const head = chunk.match(/<th\b[^>]*>([\s\S]*?)<\/th>/i);
    if (!head) continue;
    const cells = [...chunk.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => htmlText(m[1]));
    const label = htmlText(head[1]);
    const value = cells.filter(Boolean).join(' / ');
    if (label && value) rows.push([label, value]);
  }
  return rows;
}

function pick(rows, ...keywords) {
  for (const keyword of keywords) {
    const found = rows.find(([label]) => label.toLowerCase().includes(keyword));
    if (found) return found[1];
  }
  return null;
}

const teams = parseEntrants(await pageField(SEASON, 'wikitext'));

for (const team of teams) {
  const source = `https://en.wikipedia.org/wiki/${team.teamPage.replace(/ /g, '_')}`;
  try {
    const rows = infoboxRows(await pageField(team.teamPage, 'text'));
    team.fields = {
      base: pick(rows, 'base', 'headquarters'),
      principal: pick(rows, 'principal', 'team director'),
      constructorsTitles: pick(rows, "constructors' champ", 'constructors champ'),
      driversTitles: pick(rows, "drivers' champ", 'drivers champ'),
      firstEntry: pick(rows, 'first entry', 'debut'),
      races: pick(rows, 'races entered', 'races'),
      wins: pick(rows, 'wins'),
      poles: pick(rows, 'poles'),
      engines: pick(rows, 'engines', 'power unit'),
      source,
    };
  } catch (error) {
    team.fields = { error: error.message, source };
  }
  const f = team.fields;
  console.log(
    [
      team.short,
      `base=${f.base ?? '-'}`,
      `pl=${f.principal ?? '-'}`,
      `cc=${f.constructorsTitles ?? '-'}`,
      `dc=${f.driversTitles ?? '-'}`,
      `first=${f.firstEntry ?? '-'}`,
    ].join(' | '),
  );
  await sleep(700);
}

await writeFile(OUT, `${JSON.stringify({ fetched: new Date().toISOString(), season: SEASON, teams }, null, 2)}\n`);
console.log(`teams=${teams.length} -> scripts/out/teams.json`);
