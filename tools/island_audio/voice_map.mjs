// Which character and text each file in legacy/game/audio/voice/ belongs to, using the same keys as tools/slice_voices.mjs
// (key = fnv(char|text)). Prints JSON {key: [char, text]} for the lines that have a file on disk.
// Used by refs.py to build 8 to 15 s clone references for Emi, Rei and the player from the old game's lines.
import fs from 'node:fs';
import path from 'node:path';
import { SCENES as DAY1, SPELLS } from '../../legacy/game/data/script.js';
import { SCENES as D2 } from '../../legacy/content/day2.js';
import { SCENES as D3 } from '../../legacy/content/day3.js';
import { SCENES as D4 } from '../../legacy/content/day4.js';
import { SCENES as D5 } from '../../legacy/content/day5.js';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '../..');
const SCENES = { ...DAY1, ...D2, ...D3, ...D4, ...D5, __spells: SPELLS };
const fnv = s => { let x = 0x811c9dc5; for (const c of s) { x ^= c.codePointAt(0); x = Math.imul(x, 0x01000193) >>> 0; } return x.toString(16).padStart(8, '0'); };
const plain = s => s.replace(/\{([^}|]+)(?:\|[^}]*)?\}/g, '$1');

const lines = [];
const walk = o => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if (o.say && o.jp) { lines.push([o.say, plain(o.jp)]); if (o.alt?.jp) lines.push([o.say, plain(o.alt.jp)]); } Object.values(o).forEach(walk); } };
walk(SCENES);
const walkP = o => { if (Array.isArray(o)) o.forEach(walkP); else if (o && typeof o === 'object') { if (o.choose && o.choose.show !== 'en') for (const op of o.choose.options || []) { if (!op.jp) continue; const t = plain(op.jp); if (!t.startsWith('（')) lines.push(['player', t]); if (op.alt?.jp) lines.push(['player', plain(op.alt.jp)]); } Object.values(o).forEach(walkP); } };
walkP(SCENES);

const out = {};
for (const [ch, text] of lines) {
  const k = fnv(`${ch}|${text}`);
  if (fs.existsSync(path.join(ROOT, 'legacy/game/audio/voice', `${k}.mp3`))) out[k] = [ch, text];
}
console.log(JSON.stringify(out));
