import { readFile } from 'node:fs/promises';

const picks = JSON.parse(await readFile(new URL('./out/picks.json', import.meta.url), 'utf8'));
const cand = JSON.parse(await readFile(new URL('./out/candidates.json', import.meta.url), 'utf8'));

const byId = new Map();
const walk = (o) => {
  if (Array.isArray(o)) return o.forEach(walk);
  if (o && typeof o === 'object') {
    if (o.pageid && o.title) byId.set(o.pageid, o);
    Object.values(o).forEach(walk);
  }
};
walk(cand);

for (const [cat, ids] of Object.entries(picks)) {
  console.log('\n## ' + cat);
  ids.forEach((id, i) => {
    const c = byId.get(id);
    console.log(
      '  ' + (cat + '-' + i).padEnd(14) + String(id).padEnd(11) + (c ? `${c.title}  [${c.license}]  ${c.width}x${c.height}` : 'NOT FOUND'),
    );
  });
}
