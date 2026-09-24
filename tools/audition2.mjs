// Voice audition round 2: per character, MiniMax at 44.1 kHz and Qwen3 designed voices, reading an in-character line.
import { run, spent } from './rep.mjs';
import fs from 'node:fs';
const OUT = 'proto2/audition/r2/';
const mm = (voice, text, extra = {}) => ['minimax/speech-2.6-hd', { text, voice_id: voice, language_boost: 'Japanese', sample_rate: 44100, bitrate: 128000, ...extra }];
const qw = (desc, text) => ['qwen/qwen3-tts', { mode: 'voice_design', text, language: 'Japanese', voice_description: desc }];
const ROLES = {
  mio: ['え、もう終わったの？…ちょっと待って、どうやったの？', [
    ['MiniMax Decisive Princess', mm('Japanese_DecisivePrincess', null)],
    ['Designed: dry, low-key', qw('A Japanese woman in her mid twenties with a low-key, dry, slightly sarcastic voice. Natural, relaxed, not cute.', null)],
    ['Designed: husky, teasing', qw('A Japanese woman in her mid twenties with a slightly husky, teasing voice, speaking casually to a friend.', null)],
  ]],
  sayaka: ['いいよいいよ、今日は適当でいいから。お昼、一緒に行く？', [
    ['MiniMax Calm Lady (quieter)', mm('Japanese_CalmLady', null, { volume: 0.55 })],
    ['MiniMax Dependable Woman', mm('Japanese_DependableWoman', null)],
    ['Designed: relaxed, warm', qw('A Japanese woman in her early thirties, a laid-back team leader. Warm, relaxed, confident, a little lazy-sounding, speaking casually.', null)],
  ]],
  hana: ['ねえねえ、ちょっとだけ話を聞かせて！社内報の記事なんだけど。', [
    ['MiniMax Graceful Maiden', mm('Japanese_GracefulMaiden', null)],
    ['Designed: bright reporter', qw('A Japanese woman around twenty-five, bright, curious and energetic, quick speech, friendly. Clearly a female voice.', null)],
    ['Designed: warm, lively', qw('A young Japanese woman with a warm, lively, clear voice, cheerful but not childish.', null)],
  ]],
  rei: ['へえ、新人なのにずいぶん速いのね。負けないから。', [
    ['MiniMax Cold Queen (44.1 kHz)', mm('Japanese_ColdQueen', null)],
    ['Designed: crisp, confident', qw('A Japanese woman in her early twenties, crisp and confident, a little haughty, competitive, clear articulation.', null)],
    ['Designed: cool, controlled', qw('A young Japanese woman with a cool, controlled, elegant voice, speaking with a slight challenge in her tone.', null)],
  ]],
  daigo: ['おう、新人！今日は俺がおごるから、飲もうぜ！', [
    ['MiniMax Generous Izakaya Owner', mm('Japanese_GenerousIzakayaOwner', null)],
    ['MiniMax Optimistic Youth', mm('Japanese_OptimisticYouth', null)],
    ['Designed: big, friendly', qw('A big, friendly Japanese man in his late twenties, loud, cheerful and rough around the edges, a factory worker.', null)],
  ]],
  tomi: ['はい、いらっしゃい！今日のカレー、おいしいよ。大盛りにする？', [
    ['MiniMax Dependable Woman', mm('Japanese_DependableWoman', null)],
    ['Designed: warm, motherly', qw('A Japanese woman in her late fifties who runs a cafeteria. Warm, motherly, slightly raspy, cheerful, clearly middle-aged.', null)],
    ['Designed: brisk, kind', qw('An older Japanese woman around sixty, brisk and kind, the voice of a busy canteen auntie.', null)],
  ]],
  guard: ['止まって。IDカード、見せて。…はい、次の人。', [
    ['MiniMax Dominant Man', mm('Japanese_DominantMan', null)],
    ['Designed: stern guard', qw('A stern, authoritative Japanese man in his fifties, a security guard. Deep, firm, bored but commanding.', null)],
    ['Designed: gruff, flat', qw('A gruff middle-aged Japanese man with a deep, flat, no-nonsense voice.', null)],
  ]],
};
const manifest = {};
const jobs = [];
for (const [role, [line, cands]] of Object.entries(ROLES)) {
  manifest[role] = { line, cands: [] };
  cands.forEach(([label, [model, input]], i) => {
    input.text = line;
    const file = `${role}-${i + 1}.mp3`;
    manifest[role].cands.push({ label, file });
    jobs.push(run(model, input, OUT + file).then(() => console.log('ok', file), e => { console.log('FAIL', file, e.message.slice(0, 160)); manifest[role].cands = manifest[role].cands.filter(c => c.file !== file); }));
  });
}
await Promise.all(jobs);
fs.writeFileSync(OUT + 'manifest.json', JSON.stringify(manifest, null, 1));
console.log('spent', spent());
