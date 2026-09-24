// Voice every `say` line in game/data/script.js with the cast's chosen voices, loudness-normalised.
// Output: game/audio/voice/<key>.mp3 and game/audio/voice/index.js (key = fnv(char|text)).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { run, spent } from './rep.mjs';
import { SCENES } from '../game/data/script.js';

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
const walk = o => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if (o.say) lines.push([o.say, plain(o.jp)]); Object.values(o).forEach(walk); } };
walk(SCENES);

const manifest = {};
const jobs = lines.map(async ([ch, text]) => {
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
});
// Design references first (sequential), then everything in parallel.
for (const [ch, v] of Object.entries(VOICES)) if (v.kind === 'design') await designRef(ch, v);
await Promise.all(jobs);
fs.writeFileSync(path.join(OUT, 'index.js'), `export const VOICE = ${JSON.stringify(manifest)};\n`);
console.log('lines', lines.length, 'voiced', Object.keys(manifest).length, 'spent', spent());
