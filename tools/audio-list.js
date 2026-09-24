// Lists every clip the app can play: { key, text, voice }. Keys must match clipKey() in app.js.
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const fnv = s => { let h = 0x811c9dc5; for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };
const norm = s => s.replace(/\s+/g, '');
const parseEx = ex => { const m = /^(.+?)\s*[(（]\s*([^)）]+)\s*[)）]\s*(.*)$/.exec(ex || ''); return m ? m[2].trim() : null; };
const LOW = ['ゲームマスター', 'ゲートキーパー', '門番', '番人', '主', '司令官'];
const voiceFor = sp => sp === 'リン' ? 'f' : LOW.includes(sp) ? 'g' : 'm';
const out = new Map();
const add = (text, voice = 'f') => { if (!text) return; const t = norm(text); const key = fnv(voice + '|' + t); out.set(key, { key, text: t, voice }); };
const w = {};
for (const f of fs.readdirSync(path.join(root, 'data')).filter(f => /^floor\d+\.js$/.test(f)).sort()) vm.runInNewContext(fs.readFileSync(path.join(root, 'data', f), 'utf8'), { window: w });
const KANA = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ';
for (const f of w.FLOORS) {
  (f.kana || []).forEach(k => add(k.k));
  (f.confuse || []).flat().forEach(c => add(c));
  (f.vocab || []).forEach(v => add(v.kana || v.ja));
  (f.kanji || []).forEach(k => add(parseEx(k.ex) || k.c));
  (f.grammar || []).forEach(g => g.examples.forEach(e => add(e.ja)));
  f.boss.lines.forEach(l => add(l.ja, voiceFor(l.sp)));
}
[...KANA].forEach(c => { add(c); add(String.fromCharCode(c.charCodeAt(0) + 0x60)); });
add('こんにちは、ハンター。');
process.stdout.write(JSON.stringify([...out.values()]));
