// Render the benchmark lines with the game's current Replicate voices (same settings as tools/slice_voices.mjs, one take, no retries).
import fs from 'node:fs';
import { run, spent } from '/home/jorgen/repo/japanese/tools/rep.mjs';
const L = JSON.parse(fs.readFileSync('/home/jorgen/ai/tts-bench/lines.json'));
const O = '/home/jorgen/ai/tts-bench/out/replicate'; fs.mkdirSync(O, { recursive: true });
const MM = { announcer: ['Japanese_KindLady', {}], emi: ['Japanese_CalmLady', { volume: 0.55 }], rei: ['Japanese_ColdQueen', {}] };
const CL = { mio: ['/home/jorgen/repo/japanese/tools/voice-refs/mio-a.wav', 'ミオ。……べつに、ゲームしてるだけ。話しかけてもいいけど、つまんないよ。あ、そのお菓子、ちょっとちょうだい。'],
  ishibashi: ['/home/jorgen/repo/japanese/tools/voice-refs/ishibashi-ref12.wav', '止まって。IDカード、見せて。…はい、次の人。ここは毎朝、何百人も通るんだ。顔はだいたい覚えてる。知らない顔は、止める。それが俺の仕事だ。'] };
const jobs = [];
for (const [ch, lines] of Object.entries(L)) lines.forEach((text, i) => jobs.push((async () => {
  const t = Date.now();
  let f;
  if (MM[ch]) f = await run('minimax/speech-2.6-hd', { text, voice_id: MM[ch][0], language_boost: 'Japanese', sample_rate: 44100, ...MM[ch][1] }, `${O}/${ch}-${i}.mp3`);
  else f = await run('qwen/qwen3-tts', { mode: 'voice_clone', text, language: 'Japanese', reference_audio: CL[ch][0], reference_text: CL[ch][1] }, `${O}/${ch}-${i}.wav`);
  console.log(JSON.stringify({ ch, i, f, s: (Date.now() - t) / 1000 }));
})()));
await Promise.all(jobs);
console.log('spent', spent());
