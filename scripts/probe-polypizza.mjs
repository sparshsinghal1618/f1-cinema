// Collect poly.pizza candidates for open-wheel race cars, then read each model page for tris + license.
const queries = ['formula 1', 'formula', 'f1', 'grand prix', 'open-wheel', 'race car', 'racing car'];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

function state(html) {
  const m = html.match(/window\.__SERVER_APP_STATE__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/);
  return m ? JSON.parse(m[1]) : null;
}

const seen = new Map();
for (const q of queries) {
  try {
    const r = await fetch('https://poly.pizza/search/' + encodeURIComponent(q), { headers: { 'User-Agent': UA } });
    if (!r.ok) continue;
    const s = state(await r.text());
    for (const it of s?.initialData?.result ?? []) {
      if (it.url && !seen.has(it.url)) seen.set(it.url, { title: it.title, q });
    }
  } catch {}
  await new Promise(res => setTimeout(res, 400));
}
console.log('candidates:', seen.size);

const rows = [];
for (const [url, meta] of seen) {
  try {
    const r = await fetch('https://poly.pizza' + url, { headers: { 'User-Agent': UA } });
    if (!r.ok) continue;
    const s = state(await r.text());
    const md = s?.initialData?.model;
    if (!md) continue;
    rows.push({
      id: md.PublicID,
      tris: md.Tris ?? 0,
      lic: md.Licence ?? '?',
      type: md.Type ?? '',
      title: (md.Title ?? '').slice(0, 52),
      by: md.Creator?.Username ?? '',
      glb: 'https://static.poly.pizza/' + md.ResourceID + '.glb.br',
      found: meta.q,
    });
  } catch {}
  await new Promise(res => setTimeout(res, 350));
}
rows.sort((a, b) => b.tris - a.tris);
for (const r of rows) console.log([r.id, String(r.tris).padStart(6), r.lic.padEnd(14), r.type.padEnd(5), r.title.padEnd(54), r.by, r.found].join(' | '));
console.log(JSON.stringify(rows, null, 1));
