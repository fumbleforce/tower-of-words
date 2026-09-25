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
  // Mio = candidate A (proto2/voice-mio/mio-a.mp3), chosen 2026-09-25: the voice-design clip, cloned for every line.
  mio: clone(path.join(ROOT, 'tools/voice-refs/mio-a.wav'), 'ミオ。……べつに、ゲームしてるだけ。話しかけてもいいけど、つまんないよ。あ、そのお菓子、ちょっとちょうだい。'),
  ishibashi: clone(path.join(ROOT, 'tools/voice-refs/ishibashi-ref12.wav'), '止まって。IDカード、見せて。…はい、次の人。ここは毎朝、何百人も通るんだ。顔はだいたい覚えてる。知らない顔は、止める。それが俺の仕事だ。'),
  goro: clone(path.join(ROOT, 'tools/voice-refs/goro-ref12.wav'), 'おや、いい天気だね。今日もトマトがよく育っているよ。このトマトはね、毎朝水をやって、話しかけてるんだ。大丈夫だよ、って。そうすると、よく育つんだよ。'),
  jun: clone(path.join(ROOT, 'tools/voice-refs/jun-ref12.wav'), 'いらっしゃい。今日はゆっくりしていって。この店は、静かなのがいいところだ。話したいなら聞くし、話したくないなら、何も聞かない。何を飲む？'),
  aoi: clone(path.join(ROOT, 'tools/voice-refs/aoi-ref12.wav'), 'あ、おはよう！　今日もがんばろうね！あたし、アオイ！インターンなんだけど、毎日ちょっと失敗しちゃうの。でも、明日はきっと大丈夫！たぶん！'),
  yuzuki: mm('Japanese_GracefulMaiden'),
  secretary: mm('Japanese_DependableWoman'),
  player: { kind: 'design', desc: 'A calm, neutral Japanese-speaking young man around thirty, clear and friendly, even and unhurried, a slight foreign softness.', refText: 'はじめまして。今日からここで働きます。', lufs: -23 },
};

// Pitch guard for female voices: regenerate lines that drift into a male register.
const FEMALE = new Set(['mio', 'emi', 'rei', 'aoi', 'yuzuki', 'kaori', 'secretary', 'announcer']);
const PY = path.join(process.env.HOME, 'ai/sd/venv/bin/python');
export function pitch(file) {
  try { return JSON.parse(execFileSync(PY, [path.join(ROOT, 'tools/f0.py'), file]).toString().trim().split('\n').pop()); } catch { return {}; }
}
export const pitchOk = (r, ch) => r.median == null || (ch === 'mio'
  // Mio: only catch clear drift into a male register.
  ? r.median >= 190 && (r.low160 ?? 0) <= 0.10
  : r.median >= 185 && (r.low160 ?? 0) <= 0.25);
const RETRY_STYLE = {};
// How far a take is from passing the guard (0 = passes); used to keep the best of several failed takes.
const miss = r => r.median == null ? 0 : Math.max(0, 190 - r.median) / 190 + Math.max(0, (r.low160 ?? 0) - 0.10);
// ONLY=mio node tools/slice_voices.mjs voices just that character.
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
const FLAGS = path.join(ROOT, 'tools/voice-flags.txt');

function normalize(src, dst, lufs = -18) {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-af', `loudnorm=I=${lufs}:TP=-2:LRA=11`, '-ar', '44100', '-ac', '1', '-b:a', '96k', dst]);
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
const walk = o => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if (o.say) { lines.push([o.say, plain(o.jp)]); if (o.alt?.jp) lines.push([o.say, plain(o.alt.jp)]); } Object.values(o).forEach(walk); } };
walk(SCENES);
// Player lines: the Japanese of every choice option the player can pick (not actions in brackets, not English-shown choices).
const walkP = o => { if (Array.isArray(o)) o.forEach(walkP); else if (o && typeof o === 'object') { if (o.choose && o.choose.show !== 'en') for (const op of o.choose.options) { if (!op.jp) continue; const t = plain(op.jp); if (!t.startsWith('（')) lines.push(['player', t]); if (op.alt?.jp) lines.push(['player', plain(op.alt.jp)]); } Object.values(o).forEach(walkP); } };
walkP(SCENES);

const manifest = {};
// A filtered run (ONLY=...) still lists every line already on disk.
for (const [ch, text] of lines) manifest[fnv(`${ch}|${text}`)] = 1;
// Rewritten after every clip, so an interrupted run still leaves a manifest that lists every file on disk.
const writeManifest = () => fs.writeFileSync(path.join(OUT, 'index.js'), `export const VOICE = ${JSON.stringify(Object.fromEntries(Object.keys(manifest).filter(k => fs.existsSync(path.join(OUT, `${k}.mp3`))).map(k => [k, 1])))};\n`);
let active = 0; const waiters = [];
const limit = async fn => { while (active >= 8) await new Promise(r => waiters.push(r)); active++; try { return await fn(); } finally { active--; waiters.shift()?.(); } };
const jobs = lines.filter(([ch]) => !ONLY || ONLY.has(ch)).map(([ch, text]) => limit(async () => {
  const key = fnv(`${ch}|${text}`);
  const dst = path.join(OUT, `${key}.mp3`);
  manifest[key] = 1;
  if (fs.existsSync(dst)) return;
  const v = VOICES[ch];
  const raw = path.join(RAW, key);
  let f, best = null;
  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      if (v.kind === 'minimax') f = await run('minimax/speech-2.6-hd', { text, voice_id: v.voice, language_boost: 'Japanese', sample_rate: 44100, ...v.extra, ...(attempt ? { speed: 1 - attempt * 0.02 } : {}) }, raw + (attempt ? `-r${attempt}` : '') + '.mp3', { force: attempt > 0 });
      else {
        const ref = v.kind === 'clone' ? v.ref : await designRef(ch, v);
        f = await run('qwen/qwen3-tts', { mode: 'voice_clone', text, language: 'Japanese', reference_audio: ref, reference_text: v.refText, ...(ch !== 'mio' && attempt && FEMALE.has(ch) ? { style_instruction: 'same timbre and register as the reference voice' } : {}) }, raw + (attempt ? `-r${attempt}` : '') + '.wav', { force: attempt > 0 });
      }
      f = Array.isArray(f) ? f[0] : f;
      if (!FEMALE.has(ch)) break;
      const r = pitch(f);
      if (!best || miss(r) < miss(best.r)) best = { f, r };
      if (pitchOk(r, ch)) break;
      console.log('pitch retry', ch, text.slice(0, 16), JSON.stringify(r));
      if (attempt === 3) { f = best.f; fs.appendFileSync(FLAGS, `${key}\t${ch}\t${best.r.median}\t${best.r.low160}\t${text}\n`); }
    }
    normalize(f, dst, v.lufs || -18);
    console.log('ok', ch, text.slice(0, 20));
    writeManifest();
  } catch (e) { delete manifest[key]; console.log('FAIL', ch, text.slice(0, 20), e.message.slice(0, 160)); }
}));
// Design references first (sequential), then everything in parallel.
for (const [ch, v] of Object.entries(VOICES)) if (v.kind === 'design') await designRef(ch, v);
await Promise.all(jobs);
writeManifest();
console.log('lines', lines.length, 'voiced', Object.keys(manifest).length, 'spent', spent());
