// Writes audio/manifest.json: every voice clip the game plays, with its speaker and Japanese text.
// Eric's phrases and commands come from js/lang.js; overheard lines come from the story files.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const { WORDS } = await import(pathToFileURL(path.join(root, 'js/lang.js')).href);
const out = [];
for (const [id, w] of Object.entries(WORDS)) if (w.voice) out.push({ key: w.voice, speaker: 'eric', text: w.ja + '。' });
const heard = JSON.parse(execFileSync('node', [path.join(root, 'tools/heard-lines.mjs')], { encoding: 'utf8' }));
for (const h of heard) out.push({ key: h.key, speaker: h.who, text: h.text });
fs.writeFileSync(path.join(root, 'audio/manifest.json'), JSON.stringify(out, null, 1));
const by = {}; for (const o of out) by[o.speaker] = (by[o.speaker] || 0) + 1;
console.log(out.length, 'clips', JSON.stringify(by));
