// Sound effects: every effect is a small pre-levelled file in audio/sfx/ (made by tools/feel/: interface and magic
// sounds are synthesised offline as one soft mallet family, world sounds are local Stable Audio takes). Files are
// levelled to their in-game loudness (audio/sfx/levels.json), so they all play at gain 1 apart from a little random
// spread. They go through the shared 'sfx' bus (audio/core.js audioBus: settings volumes and mute live there).
// Before a file has loaded, a kind simply doesn't sound; all of them are preloaded on the first tap.
import { audioBus, isMuted } from './audio/core.js';

let C = null;
const bufs = {}; // file -> AudioBuffer | Promise
const live = {}; // kind -> gain node of the last play (so it can be cut short)
const lastAt = {}; // kind -> time of the last play (cooldowns)
// audio can only start after a tap or a key; until then nothing here creates the context
let unlocked = false;
for (const ev of ['pointerdown', 'keydown', 'touchstart'])
  window.addEventListener(
    ev,
    () => {
      unlocked = true;
    },
    { capture: true, once: true },
  );

// kind -> files (variants), random spread in playback rate and gain (dB), minimum gap between plays (s)
const K = {
  tap: { f: ['tap'], rate: 0.04, db: 1, gap: 0.03 },
  open: { f: ['open'], rate: 0.02, gap: 0.05 },
  ok: { f: ['ok'] },
  no: { f: ['no'], gap: 0.15 },
  nope: { f: ['nope'], rate: 0.03, gap: 0.12 },
  word: { f: ['word'] },
  command: { f: ['command'] },
  bond: { f: ['bond'] },
  chime: { f: ['chime'] },
  lift: { f: ['lift'], gap: 0.3 },
  beep: { f: ['beep'], gap: 0.08 },
  kotodama: { f: ['kotodama'] },
  clack: { f: ['clack-1', 'clack-2', 'clack-3'], rate: 0.05, db: 2, gap: 0.08 },
  // world
  door: { f: ['door'], rate: 0.03, gap: 0.2 },
  traindoor: { f: ['train_doors'], gap: 0.3 },
  glassdoor: { f: ['glass_doors'], gap: 0.3 },
  liftdoor: { f: ['lift_doors'], gap: 0.3 },
  doorslow: { f: ['doorslow'] },
  brake: { f: ['brake'], gap: 1 },
  flap: { f: ['flap_open'], gap: 0.3 },
  copier: { f: ['copier_run'], gap: 0.5 },
  kettle: { f: ['kettle_pour'], gap: 0.5 },
  vending: { f: ['vending'], gap: 0.3 },
  // the dorm courtyard's bath (places/dorm-bath.js): a man humming inside, and another finishing his tune
  bath_first: { f: ['bath_first'] },
  bath_answer: { f: ['bath_answer'] },
  // the train passengers (train/discoveries.js; tools/feel/pluck.py): a phone buzzing (Mio's too), a bag's zip, and
  // someone's guitar practice from a phone speaker or a lifted headphone
  buzz: { f: ['buzz'], gap: 0.5 },
  zip: { f: ['zip'], gap: 0.5 },
  guitar: { f: ['guitar_practice'] },
};

export function ctx() {
  if (!unlocked && !C) return null;
  if (!C) {
    const b = audioBus('sfx');
    C = b ? b.context : null;
    if (C) preloadAll();
  }
  return C;
}
// the context if audio is unlocked and running (never creates one before a tap)
export function running() {
  const c = unlocked ? ctx() : null;
  return c && c.state === 'running' ? c : null;
}
export function bus(name = 'sfx') {
  return audioBus(name);
}
export { isMuted };

const url = (f) => new URL(`../audio/sfx/${f}.mp3?v=${encodeURIComponent(window.BUILD || '')}`, import.meta.url).href;
export function load(f) {
  if (!bufs[f]) {
    bufs[f] = fetch(url(f))
      .then((r) => {
        if (!r.ok) throw new Error(f);
        return r.arrayBuffer();
      })
      .then((a) => new Promise((ok, no) => C.decodeAudioData(a, ok, no)))
      .then((b) => (bufs[f] = b))
      .catch(() => (bufs[f] = null));
  }
  return bufs[f];
}
function preloadAll() {
  const all = new Set(Object.values(K).flatMap((k) => k.f));
  for (const f of all) load(f);
}

// Play a kind. opts: { gain (linear, default 1), rate, at (seconds from now), pan (-1..1), offset (seconds into the
// file) }. Returns { stop(ms), gain, panner } (gain and panner are the live nodes, for a sound that moves; a no-op
// { stop } if nothing played).
export function sfx(kind, opts = {}) {
  const none = { stop() {} };
  if (isMuted()) return none;
  const c = ctx();
  if (!c) return none;
  const k = K[kind];
  if (!k) {
    return none;
  }
  const now = c.currentTime;
  if (k.gap && lastAt[kind] && now - lastAt[kind] < k.gap) return none;
  lastAt[kind] = now;
  const f = k.f[Math.floor(Math.random() * k.f.length)];
  const b = bufs[f];
  if (!b || b instanceof Promise) {
    load(f);
    return none;
  }
  const src = c.createBufferSource();
  src.buffer = b;
  const spread = (r) => (r ? (Math.random() * 2 - 1) * r : 0);
  src.playbackRate.value = (opts.rate || 1) * (1 + spread(k.rate));
  const g = c.createGain();
  g.gain.value = (opts.gain ?? 1) * Math.pow(10, spread(k.db) / 20);
  let node = src.connect(g),
    p = null;
  if (opts.pan !== undefined && c.createStereoPanner) {
    p = c.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, opts.pan));
    node = node.connect(p);
  }
  node.connect(audioBus('sfx'));
  const at = now + (opts.at || 0);
  src.start(at, opts.offset || 0);
  live[kind] = g;
  if (kind === 'kotodama') {
    for (const f of dipHooks) f(0.25, 0.08, 1.4, 1.2);
  } // the world goes quiet while the word takes hold
  const stop = (ms = 40) => {
    const t = c.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(0, t + ms / 1000);
    try {
      src.stop(t + ms / 1000 + 0.02);
    } catch {
      /* */
    }
  };
  return { stop, gain: g, panner: p };
}
// how long a kind's (first) file lasts, in seconds, once it has loaded; 0 before that
export function duration(kind) {
  const b = K[kind] && bufs[K[kind].f[0]];
  return b && !(b instanceof Promise) ? b.duration : 0;
}
// cut a kind short (the door chime stops mid-note when a kotodama freezes the doors)
export function stopSfx(kind, ms = 40) {
  const g = live[kind];
  if (!g || !C) return;
  delete live[kind];
  const t = C.currentTime;
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(g.gain.value, t);
  g.gain.linearRampToValueAtTime(0, t + ms / 1000);
}

// ---------- dips ----------
// Things that should go quiet for a moment (ambience, and music if the shell registers it) register here.
const dipHooks = new Set();
export function onDip(fn) {
  dipHooks.add(fn);
}

// ---------- the motor hum ----------
// A door motor straining against doors that won't move (day 2's held train doors): two low saws through a lowpass,
// with a slow wobble, made here rather than from a file. Returns { stop(ms) }; nothing sounds while muted or locked.
export function hum({ gain = 0.05, f = 98 } = {}) {
  const none = { stop() {} };
  if (isMuted()) return none;
  const c = running();
  if (!c) return none;
  const g = c.createGain(),
    lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 420;
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(gain, c.currentTime + 0.25);
  const oscs = [f, f * 1.5, 7].map((hz, i) => {
    const o = c.createOscillator();
    o.type = i < 2 ? 'sawtooth' : 'sine';
    o.frequency.value = hz;
    return o;
  });
  const wob = c.createGain();
  wob.gain.value = 3; // the wobble: a few hertz either way
  oscs[2].connect(wob);
  wob.connect(oscs[0].frequency);
  oscs[0].connect(lp);
  oscs[1].connect(lp);
  lp.connect(g);
  g.connect(audioBus('sfx'));
  for (const o of oscs) o.start();
  return {
    stop(ms = 200) {
      const t = c.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + ms / 1000);
      for (const o of oscs) o.stop(t + ms / 1000 + 0.05);
    },
  };
}

// ---------- a purr ----------
// A stray cat being petted (creatures/pet.js): soft low noise pulsing about 25 times a second, in breaths, the breath
// in quieter than the breath out. Made here rather than from a file, like hum(). pan: -1..1.
export function purr({ gain = 0.5, secs = 2.6, pan = 0 } = {}) {
  if (isMuted()) return;
  const c = running();
  if (!c) return;
  const n = Math.ceil(c.sampleRate * secs),
    buf = c.createBuffer(1, n, c.sampleRate),
    d = buf.getChannelData(0),
    rate = 23 + Math.random() * 4,
    breath = 0.9 + Math.random() * 0.3;
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / c.sampleRate;
    lp += (Math.random() * 2 - 1 - lp) * 0.08; // brown-ish noise
    const pulse = Math.pow(0.5 + 0.5 * Math.sin(2 * Math.PI * rate * t), 3),
      ph = (t / breath) % 2, // breath in (0..1), out (1..2)
      env = Math.sin(Math.PI * (ph % 1)) ** 0.6 * Math.min(1, t / 0.15, (secs - t) / 0.3);
    d[i] = lp * pulse * (ph < 1 ? 0.55 : 1) * env;
  }
  let peak = 1e-6;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]));
  for (let i = 0; i < n; i++) d[i] *= 0.8 / peak;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 380;
  const g = c.createGain();
  g.gain.value = gain;
  let node = src.connect(f).connect(g);
  if (c.createStereoPanner) {
    const p = c.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    node = node.connect(p);
  }
  node.connect(audioBus('sfx'));
  src.start();
}
