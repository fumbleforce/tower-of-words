// Voice every `say` line in game/data/script.js with the cast's chosen voices, loudness-normalised.
// Output: game/audio/voice/<key>.mp3 and game/audio/voice/index.js (key = fnv(char|text)).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { run, spent } from './rep.mjs';
import { SCENES as DAY1, SPELLS } from '../game/data/script.js';
import { SCENES as D2 } from '../content/day2.js';
import { SCENES as D3 } from '../content/day3.js';
import { SCENES as D4 } from '../content/day4.js';
import { SCENES as D5 } from '../content/day5.js';
const SCENES = { ...DAY1, ...D2, ...D3, ...D4, ...D5, __spells: SPELLS };

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'game/audio/voice');
const RAW = path.join(ROOT, 'art/voice-raw');
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(RAW, { recursive: true });

export const fnv = s => { let x = 0x811c9dc5; for (const c of s) { x ^= c.codePointAt(0); x = Math.imul(x, 0x01000193) >>> 0; } return x.toString(16).padStart(8, '0'); };
export const plain = s => s.replace(/\{([^}|]+)(?:\|[^}]*)?\}/g, '$1');

const R2 = path.join(ROOT, 'proto2/audition/r2');
const mm = (voice, extra = {}) => ({ kind: 'minimax', voice, extra });
const clone = (ref, refText) => ({ kind: 'clone', ref, refText });
const VOICES = {
  announcer: mm('Japanese_KindLady'),
  emi: mm('Japanese_CalmLady', { volume: 0.55 }),
  rei: mm('Japanese_ColdQueen'),
  kaori: mm('Japanese_DependableWoman'),
  mio: clone(path.join(R2, 'mio-3.mp3'), 'え、もう終わったの？…ちょっと待って、どうやったの？'),
  ishibashi: clone(path.join(R2, 'guard-3.mp3'), '止まって。IDカード、見せて。…はい、次の人。'),
  goro: { kind: 'design', desc: 'A gentle Japanese man in his sixties, warm and slightly raspy, kind grandfatherly tone, relaxed pace.', refText: 'おや、いい天気だね。今日もトマトがよく育っているよ。' },
  jun: { kind: 'design', desc: 'A calm Japanese man around forty, low soft voice, dry and understated, a quiet bartender.', refText: 'いらっしゃい。今日はゆっくりしていって。' },
  aoi: { kind: 'design', desc: 'A bright, energetic young Japanese woman around twenty-two, quick and cheerful, a little clumsy, clearly female.', refText: 'あ、おはよう！　今日もがんばろうね！' },
  yuzuki: mm('Japanese_GracefulMaiden'),
  secretary: mm('Japanese_DependableWoman'),
};

function normalize(src, dst) {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-af', 'loudnorm=I=-18:TP=-2:LRA=11', '-ar', '44100', '-ac', '1', '-b:a', '96k', dst]);
}
async function designRef(ch, v) {
  const p = path.join(RAW, `${ch}-ref`);
  const got = fs.readdirSync(RAW).find(f => f.startsWith(`${ch}-ref.`));
  if (got) return path.join(RAW, got);
  const f = await run('qwen/qwen3-tts', { mode: 'voice_design', text: v.refText, language: 'Japanese', voice_description: v.desc }, p + '.wav');
  return f;
}

const lines = [];
// Engine-generated lines: prices and change (kanji numbers must match game/main.js kanjiNum()).
const DIG = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
function kanjiNum(n) { let out = ''; for (const [v, u] of [[1000, '千'], [100, '百'], [10, '十']]) { const d = Math.floor(n / v); if (d) out += (d > 1 ? DIG[d] : '') + u; n %= v; } return out + (n ? DIG[n] : ''); }
const payLines = new Set(['足りないよ。', 'ちょうどね。ありがとう。']);
const walk2 = o => { if (Array.isArray(o)) o.forEach(walk2); else if (o && typeof o === 'object') { Object.values(o).forEach(walk2); } };
const menus = []; const findMenus = (steps) => { for (let i = 0; i < steps.length; i++) { const st = steps[i]; if (st && st.menu && !st.menu.noPay) { const pay = steps.slice(i + 1).find(x => x && x.pay); menus.push({ items: st.menu.items, wallet: pay?.pay.wallet || [] }); } } };
for (const sc of Object.values(SCENES)) if (Array.isArray(sc)) findMenus(sc);
for (const m of menus) for (const it of m.items) {
  payLines.add(`${kanjiNum(it.price)}円ね。`);
  const w = m.wallet, n = w.length;
  for (let mask = 1; mask < (1 << n); mask++) { let sum = 0; for (let b = 0; b < n; b++) if (mask & (1 << b)) sum += w[b]; if (sum > it.price) payLines.add(`はい、${kanjiNum(sum - it.price)}円のおつり。`); }
}
for (const t of payLines) lines.push(['kaori', t]);
const walk = o => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if (o.say) lines.push([o.say, plain(o.jp)]); Object.values(o).forEach(walk); } };
walk(SCENES);

const manifest = {};
let active = 0; const waiters = [];
const limit = async fn => { while (active >= 8) await new Promise(r => waiters.push(r)); active++; try { return await fn(); } finally { active--; waiters.shift()?.(); } };
const jobs = lines.map(([ch, text]) => limit(async () => {
  const key = fnv(`${ch}|${text}`);
  const dst = path.join(OUT, `${key}.mp3`);
  manifest[key] = 1;
  if (fs.existsSync(dst)) return;
  const v = VOICES[ch];
  const raw = path.join(RAW, key);
  let f;
  try {
    if (v.kind === 'minimax') f = await run('minimax/speech-2.6-hd', { text, voice_id: v.voice, language_boost: 'Japanese', sample_rate: 44100, ...v.extra }, raw + '.mp3');
    else {
      const ref = v.kind === 'clone' ? v.ref : await designRef(ch, v);
      f = await run('qwen/qwen3-tts', { mode: 'voice_clone', text, language: 'Japanese', reference_audio: ref, reference_text: v.refText }, raw + '.wav');
    }
    normalize(Array.isArray(f) ? f[0] : f, dst);
    console.log('ok', ch, text.slice(0, 20));
  } catch (e) { delete manifest[key]; console.log('FAIL', ch, text.slice(0, 20), e.message.slice(0, 160)); }
}));
// Design references first (sequential), then everything in parallel.
for (const [ch, v] of Object.entries(VOICES)) if (v.kind === 'design') await designRef(ch, v);
await Promise.all(jobs);
fs.writeFileSync(path.join(OUT, 'index.js'), `export const VOICE = ${JSON.stringify(manifest)};\n`);
console.log('lines', lines.length, 'voiced', Object.keys(manifest).length, 'spent', spent());
