// Kotodama's sound: small synthesised notes for every tap, snap, flight and score tick (Web Audio, so
// they are instant and offline), plus the game's own recorded sfx for the kotodama tone and the
// machines (game3d/audio/sfx). Muting is shared with the other minigames (common/sound.js).

import { muted, setMuted } from '../common/sound.js';

let ctx = null;
let master = null;
const buffers = {};
const SFX = new URL('../../audio/sfx/', import.meta.url);

export { muted, setMuted };

/** Starts audio on the first tap (browsers need a gesture) and loads the sfx files. */
export function unlock() {
  if (ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(ctx.destination);
  for (const name of ['kotodama', 'vending', 'kettle_pour', 'ok', 'nope', 'chime', 'bond']) {
    fetch(new URL(`${name}.mp3`, SFX))
      .then(r => r.arrayBuffer())
      .then(b => ctx.decodeAudioData(b))
      .then(buf => (buffers[name] = buf))
      .catch(() => {});
  }
}

const live = () => ctx && !muted();

/** One recorded sfx, optionally only its first `len` seconds with a short fade. */
export function sample(name, { vol = 0.8, len = 0, rate = 1, delay = 0 } = {}) {
  if (!live() || !buffers[name]) return;
  const src = ctx.createBufferSource();
  src.buffer = buffers[name];
  src.playbackRate.value = rate;
  const g = ctx.createGain();
  const t = ctx.currentTime + delay;
  g.gain.setValueAtTime(vol, t);
  if (len) g.gain.setTargetAtTime(0, t + len - 0.12, 0.05);
  src.connect(g).connect(master);
  src.start(t, 0, len || undefined);
}

/** A plucked note: freq in Hz, shape of the oscillator, length and loudness. */
export function note(freq, { type = 'triangle', len = 0.18, vol = 0.25, delay = 0, slide = 0 } = {}) {
  if (!live()) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + len);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + len + 0.02);
}

/** Filtered noise: whooshes and thuds. */
export function noise({ len = 0.3, vol = 0.2, from = 800, to = 3000, q = 1.2, delay = 0, type = 'bandpass' } = {}) {
  if (!live()) return;
  const t = ctx.currentTime + delay;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * len), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + len);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + len * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

// A pentatonic scale in D, so any run of notes sounds right.
const SCALE = [293.66, 329.63, 369.99, 440, 493.88];
export const scale = i => SCALE[((i % 5) + 5) % 5] * 2 ** Math.floor(i / 5);

export const sfx = {
  tap: kind => note(kind === 'item' ? 660 : kind === 'machine' ? 330 : 523, { len: 0.09, vol: 0.18 }),
  particle: p => {
    const f = { o: 587, ni: 784, to: 698, nimo: 880 }[p] || 600;
    note(f, { type: 'square', len: 0.06, vol: 0.07 });
    note(f * 1.5, { len: 0.12, vol: 0.12, delay: 0.04 });
  },
  undo: () => note(392, { len: 0.1, vol: 0.12, slide: 0.7 }),
  blocked: () => note(196, { type: 'sawtooth', len: 0.12, vol: 0.06 }),
  fire: () => {
    sample('kotodama', { vol: 0.55, len: 1.6 });
    note(73.4, { type: 'sine', len: 1.2, vol: 0.35 });
    note(146.8, { type: 'sine', len: 0.9, vol: 0.12, delay: 0.05 });
  },
  dispense: machine => (machine === 'pot' ? sample('kettle_pour', { vol: 0.5, len: 0.9 }) : sample('vending', { vol: 0.55, len: 0.9 })),
  whoosh: (delay = 0) => noise({ len: 0.35, vol: 0.12, from: 500, to: 2600, delay }),
  land: (delay = 0) => {
    noise({ len: 0.12, vol: 0.25, from: 900, to: 200, q: 0.8, delay, type: 'lowpass' });
    note(180, { type: 'sine', len: 0.12, vol: 0.2, delay, slide: 0.6 });
  },
  serve: (i, delay = 0) => {
    note(scale(5 + i * 2), { len: 0.25, vol: 0.2, delay });
    note(scale(7 + i * 2), { type: 'sine', len: 0.35, vol: 0.14, delay: delay + 0.06 });
  },
  spare: (delay = 0) => note(233, { type: 'triangle', len: 0.25, vol: 0.15, delay, slide: 0.85 }),
  wrong: () => {
    note(220, { type: 'triangle', len: 0.22, vol: 0.18 });
    note(185, { type: 'triangle', len: 0.3, vol: 0.18, delay: 0.14 });
  },
  boing: (delay = 0) => note(200, { type: 'sine', len: 0.4, vol: 0.25, delay, slide: 2.4 }),
  count: i => note(scale(8 + Math.min(i, 14)), { type: 'square', len: 0.05, vol: 0.05 }),
  combo: n => [0, 1, 2, 3].forEach(i => note(scale(5 + n + i * 2), { len: 0.3, vol: 0.16, delay: i * 0.07 })),
  heart: () => {
    note(110, { type: 'sine', len: 0.5, vol: 0.35, slide: 0.5 });
    noise({ len: 0.25, vol: 0.18, from: 300, to: 80, type: 'lowpass' });
  },
  ask: () => note(988, { type: 'sine', len: 0.12, vol: 0.08 }),
  shift: () => [0, 2, 4, 7].forEach((s, i) => note(scale(5 + s), { len: 0.4, vol: 0.16, delay: i * 0.11 })),
  pick: () => sample('bond', { vol: 0.5 }),
  wait: () => [4, 2, 0].forEach((s, i) => note(scale(5 + s), { type: 'sine', len: 0.5, vol: 0.14, delay: i * 0.15 })),
};
