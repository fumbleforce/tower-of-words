import { audioBus, audioContext as ac, existingAudioContext } from './core.js';

let AMB = null;
import('../ambience.js').then((module) => {
  AMB = module;
});

// ---------- music ----------
// Loops (audio/music/*.mp3), one per place, cut by tools/make_loop.py. Each file is the loop body with a second of
// itself wrapped around both ends, and audio/music/loops.json gives the body's start and end in seconds. One
// AudioBufferSourceNode loops that region sample-accurately, so there is no timer at the seam (a hidden tab can't
// delay it) and an MP3 decoder that keeps or drops the encoder delay still joins continuous audio. A track missing
// from loops.json loops the whole file. Places crossfade over 2.5 s; voices duck the music while someone talks.
const MUSIC_VOL = 0.2,
  DUCK = 0.4;
const music = { name: null, bus: null, duck: null, bufs: {}, cur: null };
const asset = (file) => new URL(`../../audio/music/${file}?v=${window.BUILD || ''}`, import.meta.url);
let loops = null;
function loopPoints() {
  loops ??= fetch(asset('loops.json'))
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}));
  return loops;
}
async function musicBuf(name) {
  if (!music.bufs[name])
    music.bufs[name] = fetch(asset(`${name}.mp3`))
      .then((r) => r.arrayBuffer())
      .then((b) => ac().decodeAudioData(b));
  return music.bufs[name];
}
export async function playMusic(name) {
  const c = ac();
  if (!c || name === music.name) return;
  music.name = name;
  if (!music.bus) {
    music.bus = c.createGain();
    music.duck = c.createGain();
    music.bus.gain.value = MUSIC_VOL;
    music.bus.connect(music.duck);
    music.duck.connect(audioBus('music'));
  }
  const t = c.currentTime;
  if (music.cur) {
    const old = music.cur;
    old.g.gain.cancelScheduledValues(t);
    old.g.gain.setValueAtTime(old.g.gain.value, t);
    old.g.gain.linearRampToValueAtTime(0, t + 2.5);
    old.src.stop(t + 2.6);
    music.cur = null;
  }
  if (!name) return;
  let buf, pts;
  try {
    [buf, pts] = await Promise.all([musicBuf(name), loopPoints()]);
  } catch {
    return;
  }
  if (music.name !== name) return;
  const g = c.createGain();
  g.connect(music.bus);
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const p = pts[name];
  if (p && p.end > p.start && p.end <= buf.duration) {
    src.loopStart = p.start;
    src.loopEnd = p.end;
  }
  src.connect(g);
  const start = c.currentTime + 0.05;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(1, start + 2.5);
  src.start(start, src.loopStart);
  music.cur = { g, src };
}
// voices duck the music
let duckN = 0;
function duckMusic(on) {
  AMB?.duck(on);
  const c = existingAudioContext();
  if (!c || !music.duck) return;
  duckN = Math.max(0, duckN + (on ? 1 : -1));
  const t = c.currentTime;
  music.duck.gain.cancelScheduledValues(t);
  music.duck.gain.setValueAtTime(music.duck.gain.value, t);
  music.duck.gain.linearRampToValueAtTime(duckN ? DUCK : 1, t + (duckN ? 0.15 : 0.6));
}
export function duckWhile(a) {
  duckMusic(true);
  let done = false;
  const off = () => {
    if (!done) {
      done = true;
      duckMusic(false);
    }
  };
  a.addEventListener('ended', off, { once: true });
  a.addEventListener('pause', off, { once: true });
  a.addEventListener('error', off, { once: true });
}
