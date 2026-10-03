import { audioBus, audioContext as ac, existingAudioContext } from './core.js';

let AMB = null;
import('../ambience.js').then((module) => {
  AMB = module;
});

// ---------- music ----------
// Lyria loops (audio/music/*.mp3), one per place. Each loop is played as overlapping copies with a 2 s crossfade
// so the seam never clicks; places crossfade over 2.5 s; voices duck the music while someone talks.
const MUSIC_VOL = 0.2,
  DUCK = 0.4;
const music = { name: null, bus: null, duck: null, bufs: {}, cur: null, timer: 0 };
async function musicBuf(name) {
  if (!music.bufs[name])
    music.bufs[name] = fetch(new URL(`../../audio/music/${name}.mp3?v=${window.BUILD || ''}`, import.meta.url))
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
    old.stopped = true;
    clearTimeout(old.timer);
    old.g.gain.cancelScheduledValues(t);
    old.g.gain.setValueAtTime(old.g.gain.value, t);
    old.g.gain.linearRampToValueAtTime(0, t + 2.5);
    for (const s of old.srcs) s.stop(t + 2.6);
    music.cur = null;
  }
  if (!name) return;
  let buf;
  try {
    buf = await musicBuf(name);
  } catch {
    return;
  }
  if (music.name !== name) return;
  const g = c.createGain();
  g.connect(music.bus);
  const track = { g, srcs: [], stopped: false, timer: 0 };
  music.cur = track;
  const X = 2,
    start = c.currentTime + 0.05;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(1, start + 2.5);
  const play = (at, fadeIn) => {
    if (track.stopped) return;
    const s = c.createBufferSource(),
      sg = c.createGain();
    s.buffer = buf;
    s.connect(sg);
    sg.connect(g);
    const end = at + buf.duration;
    sg.gain.setValueAtTime(fadeIn ? 0 : 1, at);
    if (fadeIn) sg.gain.linearRampToValueAtTime(1, at + X);
    sg.gain.setValueAtTime(1, end - X);
    sg.gain.linearRampToValueAtTime(0, end);
    s.start(at);
    s.stop(end + 0.05);
    track.srcs.push(s);
    if (track.srcs.length > 3) track.srcs.shift();
    const next = end - X;
    track.timer = setTimeout(() => play(next, true), Math.max(0, (next - c.currentTime - 1) * 1000));
  };
  play(start, false);
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
