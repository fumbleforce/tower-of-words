// Writes audio/manifest.json: every voice clip the game plays, generated from the story files, so a rewrite
// only needs this script and the TTS run again. Entry: { key, speaker, text (Japanese or English, {id}
// resolved), lang, overheard, words: [[wordId, surface]] for known-word spans, clear: [surface] }.
// Keys: eric-<word> for Eric's phrases and commands, ln-<hash> for spoken lines, oh-<hash> for overheard lines.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const { WORDS } = await import(pathToFileURL(path.join(root, 'js/lang.js')).href);
const { heardKey, lineKey } = await import(pathToFileURL(path.join(root, 'tools/heardkey.mjs')).href);
const out = new Map();
const PHONE = new Set();
const resolve = (t) => t.replace(/\{(\w+)\}/g, (_, id) => (WORDS[id] ? WORDS[id].ja : id));
const jaRe = /[぀-ヿ一-龯]/;
function add(who, text, s = {}) {
  if (!who || !/^\w+$/.test(who) || !text) return;
  if (/text$/.test(who) || PHONE.has(who)) return;   // chat messages on a phone (miotext, phone: true speakers): read, not spoken
  const spoken = resolve(text);
  const lang = s.overheard || (jaRe.test(spoken) && !/[a-zA-Z]{3,}/.test(spoken.replace(/\([^)]*\)/g, ''))) ? 'ja' : 'en';
  const key = s.voice || (s.overheard ? heardKey(text) : lineKey(who, text));
  const words = [];
  for (const [id, w] of Object.entries(WORDS)) for (const ja of [w.ja, ...(w.alias || [])]) if (spoken.includes(ja) && !words.some(([, x]) => x.includes(ja))) words.push([id, ja]);
  const clear = (s.clear || []).map((c) => (typeof c === 'string' ? c : c.ja));
  // spoken text: drop the English glosses a line may carry in brackets
  out.set(key, { key, speaker: who, text: spoken.replace(/\s*\([^)]*\)/g, ''), lang, overheard: !!s.overheard, words, clear, ...(s.emo ? { emo: s.emo } : {}), ...(s.slow || s.emo === 'slow' ? { slow: true } : {}) });
}
function walk(list) {
  for (const s of list || []) {
    if (typeof s === 'string') { const i = s.indexOf(': '); if (!s.startsWith('>') && i > 0 && /^\w+$/.test(s.slice(0, i))) add(s.slice(0, i), s.slice(i + 2)); continue; }
    if (!s || typeof s !== 'object') continue;
    if (s.say && s.text) add(s.say, s.text, s);
    if (s.offer && s.line) { const i = s.line.indexOf(': '); if (i > 0) add(s.line.slice(0, i), s.line.slice(i + 2), s); }
    for (const k of ['then', 'else']) if (s[k]) walk(s[k]);
    if (s.choice) for (const o of s.choice) if (o.say) walk(o.say);
  }
}
// each word Mio teaches, said slowly on its own in her voice: the shell plays audio/word-<id>.mp3 when the player taps
// the word to hear it again
for (const [id, w] of Object.entries(WORDS)) if (w.voice) out.set('word-' + id, { key: 'word-' + id, speaker: 'mio', text: w.ja + '。', lang: 'ja', overheard: false, words: [[id, w.ja]], clear: [], emo: 'slow', slow: true });
for (const [id, w] of Object.entries(WORDS)) if (w.voice) out.set(w.voice, { key: w.voice, speaker: 'eric', text: w.ja + '。', lang: 'ja', overheard: false, words: [], clear: [] });
for (const n of ['train', 'gate', 'office', 'transitions']) {
  const f = path.join(root, 'story', n + '.js'); if (!fs.existsSync(f)) continue;
  const st = (await import(pathToFileURL(f).href + '?' + Date.now())).default;
  for (const [id, sp] of Object.entries(st.speakers || {})) if (sp && sp.phone) PHONE.add(id);
  if (n === 'transitions') for (const v of Object.values(st)) { walk(v.walk); walk(v.ride); walk(v.arrive); }
  else for (const nodes of Object.values(st.nodes || {})) walk(nodes);
}
const list = [...out.values()];
// --check: don't write; exit 1 if any line has no clip in audio/ or carries escape leftovers
if (process.argv.includes('--check')) {
  const bad = [];
  for (const o of list) {
    if (!fs.existsSync(path.join(root, 'audio', o.key + '.mp3'))) bad.push(`NO CLIP ${o.key} ${o.speaker}: ${o.text}`);
    if (/[\\]|\\[nt"']|&quot;|&amp;/.test(o.text)) bad.push(`ESCAPE ${o.key} ${o.speaker}: ${o.text}`);
  }
  console.log(bad.length ? bad.join('\n') : `voices ok: ${list.length} lines, all with clips, no escapes`);
  process.exit(bad.length ? 1 : 0);
}
fs.writeFileSync(path.join(root, 'audio/manifest.json'), JSON.stringify(list, null, 1));
const by = {}; for (const o of list) by[o.speaker] = (by[o.speaker] || 0) + 1;
console.log(list.length, 'clips', JSON.stringify(by), 'overheard', list.filter((x) => x.overheard).length, 'en', list.filter((x) => x.lang === 'en').length);
