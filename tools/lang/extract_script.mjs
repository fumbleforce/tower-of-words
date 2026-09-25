// Dump every Japanese string in game/data/script.js as JSON lines for annotate.py.
// Usage: node tools/lang/extract_script.mjs > out.json
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const mod = await import(pathToFileURL(path.join(root, 'game/data/script.js')).href);
const out = [];
const hasJa = (s) => /[぀-ヿ一-鿿]/.test(s);

function walk(node, where, kind) {
  if (Array.isArray(node)) { node.forEach((n) => walk(n, where, kind)); return; }
  if (!node || typeof node !== 'object') return;
  const k = node.say ? 'say:' + node.say : node.msg ? 'msg' : node.options ? 'choice' : kind;
  if (typeof node.jp === 'string' && hasJa(node.jp)) out.push({ src: `script.js:${where}`, kind: k, markup: node.jp });
  if (Array.isArray(node.forms)) node.forms.forEach((f) => out.push({ src: `script.js:${where}`, kind: 'spell', markup: f[0], reading: f[1] }));
  for (const [key, v] of Object.entries(node)) {
    if (key === 'jp') continue;
    walk(v, where, key === 'options' ? 'option' : k);
  }
}
for (const [name, steps] of Object.entries(mod.SCENES)) walk(steps, name, 'line');
for (const [name, sp] of Object.entries(mod.SPELLS || {})) walk(sp, 'spell:' + name, 'line');
(mod.FLOORS || []).forEach((f) => out.push({ src: 'script.js:floors', kind: 'sign', markup: f.jp }));
for (const [id, c] of Object.entries(mod.CAST || {})) if (hasJa(c.name)) out.push({ src: 'script.js:cast', kind: 'name', markup: c.name });
process.stdout.write(JSON.stringify(out, null, 0));
