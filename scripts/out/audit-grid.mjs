// Finds `display: grid` rules that never declare `grid-template-columns`.
// Such a grid falls back to a single `auto` track, which sizes to the widest
// item's max-content width and can overflow a narrow viewport.
import { readFileSync } from 'node:fs';

const files = ['src/styles/base.css', 'src/styles/components.css', 'src/styles/sections.css'];

for (const file of files) {
  let css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const hits = [];
  let i = 0;
  let mediaDepth = 0;
  let mediaQuery = '';
  let selectorStart = 0;
  let selector = '';
  while (i < css.length) {
    const ch = css[i];
    if (ch === '@' && /@media/.test(css.slice(i, i + 6))) {
      // capture the @media prelude up to its '{'
      const brace = css.indexOf('{', i);
      mediaQuery = css.slice(i, brace).trim();
      mediaDepth++;
      i = brace + 1;
      selectorStart = i;
      continue;
    }
    if (ch === '{') {
      selector = css.slice(selectorStart, i).trim().replace(/\s+/g, ' ');
      const close = css.indexOf('}', i);
      const body = css.slice(i + 1, close);
      if (/display\s*:\s*grid/.test(body) && !/grid-template/.test(body)) {
        hits.push({ media: mediaDepth > 0 ? mediaQuery : '(base)', selector });
      }
      i = close + 1;
      selectorStart = i;
      continue;
    }
    if (ch === '}') {
      if (mediaDepth > 0) mediaDepth--;
      i++;
      selectorStart = i;
      continue;
    }
    i++;
  }
  console.log(`\n== ${file}`);
  for (const h of hits) console.log(`  ${h.media}  ->  ${h.selector.slice(0, 90)}`);
  if (!hits.length) console.log('  (none)');
}
