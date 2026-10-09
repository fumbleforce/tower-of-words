// The song's clock: beats, bars and the moments the picture lands on, measured from the approved opening theme
// (art/approved/music/opening.mp3; librosa beat grid and Demucs stems from tools/opening/analyze_song.py,
// art/opening/audio/analysis.json). The game plays the first 70 s with a fade from 66 s (audio/music/opening.mp3).
// The song is a steady 150 BPM: a beat every 0.4 s, a bar every 1.6 s, the first beat at 0.418 s.

export const END = 70; // the picture is black and the music silent here
export const FADE_AUDIO = 66; // the file's own fade starts here

const B0 = 0.418;
export const BEAT = 0.4;
export const BAR = 1.6;
// beat k of the song (k may be fractional: 0.5 is the off-beat)
export const beat = (k) => B0 + k * BEAT;
// the bar line n (downbeats sit on beats 0, 4, 8 ...; the chorus slam at 38.82 is bar 24)
export const bar = (n) => beat(n * 4);

// Measured moments (onset peaks on the instrumental stem)
export const HIT = {
  intro: 6.01, // the full band comes in
  verse: 12.82, // first verse line under way, the drums thin out
  stop: 37.85, // the band drops out; the singer alone ("はじめ...")
  chorus: 38.82, // the band slams back in
  post: 61.23, // after the chorus: the held note
  logo: 64.43, // the interlude riff starts: the title lands
};

// The lyric lines that the picture follows (vocal stem, Whisper line timings)
export const LYRIC = [
  { t: [12.56, 16.42], jp: '朝のモノレール 窓の外', en: 'The morning monorail, out of the window' },
  { t: [18.67, 22.8], jp: '知らない街が 光ってる', en: 'a town I do not know is shining' },
  { t: [24.73, 29.49], jp: 'ポケットに IDカード', en: 'an ID card in my pocket' },
  { t: [31.49, 35.64], jp: '今日からここで 働くよ', en: 'from today, I work here' },
  { t: [37.64, 41.86], jp: 'はじめまして 新しい街', en: 'nice to meet you, new town' },
  { t: [44.12, 48.62], jp: '言葉が僕の 魔法になる', en: 'words become my magic' },
  { t: [50.4, 54.54], jp: '小さな「手伝って」で', en: 'with one small "help me"' },
  { t: [56.8, 60.6], jp: '世界が少し 動き出す', en: 'the world starts to move' },
];

// 0..1 across [a, b], clamped
export const seg = (t, a, b) => (t <= a ? 0 : t >= b ? 1 : (t - a) / (b - a));
// time since the last beat, in beats (0..1), for pulses
export function beatPhase(t) {
  const k = (t - B0) / BEAT;
  return k - Math.floor(k);
}
// a pulse that peaks on each beat and dies over `len` seconds
export function pulse(t, len = 0.18) {
  const since = beatPhase(t) * BEAT;
  return Math.exp(-since / len);
}
// drawings change on twos: time stepped to 12 frames a second, as TV anime animates its cels
export const onTwos = (t) => Math.floor(t * 12) / 12;
