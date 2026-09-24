// Scan existing voice files of female characters with the pitch guard; delete failures so slice_voices regenerates them.
// Usage: node tools/voice_scan.mjs [--delete-char mio]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const { SCENES: D1, SPELLS } = await import('../game/data/script.js');
const days = await Promise.all([2, 3, 4, 5].map(d => import(`../content/day${d}.js`)));
const fnv = s => { let x = 0x811c9dc5; for (const c of s) { x ^= c.codePointAt(0); x = Math.imul(x, 0x01000193) >>> 0; } return x.toString(16).padStart(8, '0'); };
const plain = s => s.replace(/\{([^}|]+)(?:\|[^}]*)?\}/g, '$1');
const FEMALE = new Set(['mio', 'emi', 'rei', 'aoi', 'yuzuki', 'kaori', 'secretary', 'announcer']);
const lines = new Map();
const walk = o => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if (o.say && FEMALE.has(o.say)) { const t = plain(o.jp); lines.set(fnv(`${o.say}|${t}`), [o.say, t]); } Object.values(o).forEach(walk); } };
walk([D1, SPELLS, ...days.map(d => d.SCENES)]);
const del = process.argv.includes('--delete-char') ? process.argv[process.argv.indexOf('--delete-char') + 1] : null;
const OUT = path.join(ROOT, 'game/audio/voice');
if (del) { let n = 0; for (const [k, [ch]] of lines) if (ch === del && fs.existsSync(`${OUT}/${k}.mp3`)) { fs.unlinkSync(`${OUT}/${k}.mp3`); n++; } console.log('deleted', n, del); process.exit(0); }
const files = [...lines.keys()].filter(k => fs.existsSync(`${OUT}/${k}.mp3`)).map(k => `${OUT}/${k}.mp3`);
const out = execFileSync(path.join(process.env.HOME, 'ai/sd/venv/bin/python'), [path.join(ROOT, 'tools/f0.py'), ...files], { maxBuffer: 1 << 26 }).toString().trim().split('\n').map(l => JSON.parse(l));
const { pitchOk } = { pitchOk: (r, ch) => r.median == null || (ch === 'mio' ? r.median >= 190 && r.median <= 255 && (r.voiced < 40 || (r.range_st ?? 0) <= 14) : r.median >= 185 && (r.low160 ?? 0) <= 0.25) };
const bad = out.filter(r => !pitchOk(r, lines.get(path.basename(r.file, '.mp3'))[0]));
for (const r of bad) { const k = path.basename(r.file, '.mp3'); console.log('FAIL', lines.get(k)[0], r.median, r.low160, lines.get(k)[1]); fs.unlinkSync(r.file); }
console.log('scanned', out.length, 'failed', bad.length);
