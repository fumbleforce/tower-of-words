// Lists every overheard line in the story files with its audio key, for tools/voices.py.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const { heardKey } = await import(pathToFileURL(path.join(root, 'tools/heardkey.mjs')).href);
const FEMALE = new Set(['mio', 'aoi', 'emi', 'kuro', 'kanae', 'sales2', 'rei', 'gatev', 'ann', 'yui']);
const out = [];
function walk(list) {
  for (const s of list || []) {
    if (!s || typeof s !== 'object') continue;
    if (s.say && s.overheard && s.text) out.push({ key: s.voice || heardKey(s.text), text: s.text, f: FEMALE.has(s.say), who: s.say });
    for (const k of ['then', 'else', 'ride', 'arrive', 'walk']) if (s[k]) walk(s[k]);
  }
}
for (const n of ['train', 'gate', 'office', 'transitions']) {
  const f = path.join(root, 'story', n + '.js'); if (!fs.existsSync(f)) continue;
  const st = (await import(pathToFileURL(f).href)).default;
  if (n === 'transitions') for (const v of Object.values(st)) { walk(v.walk); walk(v.ride); walk(v.arrive); }
  else for (const nodes of Object.values(st.nodes || {})) walk(nodes);
}
console.log(JSON.stringify(out));
