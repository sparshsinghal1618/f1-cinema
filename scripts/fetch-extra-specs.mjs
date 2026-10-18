import { readFile, writeFile } from 'node:fs/promises';

const UA = 'F1-site-builder/1.0 (educational project; contact: local)';
const OUT = new URL('./out/circuit-specs.json', import.meta.url);

async function wikitext(title) {
  const url = 'https://en.wikipedia.org/w/api.php?action=parse&format=json&prop=wikitext&redirects=1&page=' + encodeURIComponent(title);
  for (let i = 0; i < 5; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (r.ok) {
      const j = await r.json();
      if (j.parse) return j.parse.wikitext['*'];
      throw new Error('no parse for ' + title);
    }
    if (r.status === 429) { await new Promise(s => setTimeout(s, 4000 * (i + 1))); continue; }
    throw new Error('HTTP ' + r.status + ' for ' + title);
  }
  throw new Error('gave up on ' + title);
}

function grab(wt, keys) {
  for (const k of keys) {
    const m = wt.match(new RegExp('^\\s*\\|\\s*' + k + '\\s*=\\s*(.+)$', 'im'));
    if (!m) continue;
    let v = m[1]
      .replace(/<ref[\s\S]*?(<\/ref>|\/>)/gi, '')
      .split('{{cite')[0]
      .replace(/<[^>]*>/g, '')
      .replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, '$2')
      .trim()
      .replace(/\(+$/, '');
    if (v && !/^(image|yes|no|none)$/i.test(v)) return v;
  }
  return null;
}

const pages = {
  cota: 'Circuit of the Americas',
  yas: 'Yas Marina Circuit',
};

const out = JSON.parse(await readFile(OUT, 'utf8'));
for (const [k, p] of Object.entries(pages)) {
  try {
    const w = await wikitext(p);
    out.circuits[k] = {
      page: p,
      url: 'https://en.wikipedia.org/wiki/' + p.replace(/ /g, '_'),
      length: grab(w, ['length_km', 'length']),
      corners: grab(w, ['turns', 'corners']),
      record: grab(w, ['record_lap', 'record_time', 'lap_record']),
    };
    console.log(k, JSON.stringify(out.circuits[k]));
  } catch (e) {
    console.error('FAIL', k, e.message);
  }
  await new Promise(s => setTimeout(s, 700));
}
out.fetchedExtra = new Date().toISOString();
await writeFile(OUT, JSON.stringify(out, null, 2));
console.log('saved');
