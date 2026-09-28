// Sound effects: every effect is a small pre-levelled file in audio/sfx/ (made by tools/feel/: interface and magic
// sounds are synthesised offline as one soft mallet family, world sounds are local Stable Audio takes). Files are
// levelled to their in-game loudness (audio/sfx/levels.json), so they all play at gain 1 apart from a little random
// spread. They go through the shell's 'sfx' bus (ui.js audioBus: settings volumes and mute live there).
// Before a file has loaded, a kind simply doesn't sound; all of them are preloaded on the first tap.
import { audioBus, isMuted } from './ui.js';

let C = null;
const bufs = {};          // file -> AudioBuffer | Promise
const live = {};          // kind -> gain node of the last play (so it can be cut short)
const lastAt = {};        // kind -> time of the last play (cooldowns)
// audio can only start after a tap or a key; until then nothing here creates the context
let unlocked = false;
for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, () => { unlocked = true; }, { capture: true, once: true });

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
};
// 'door' means different doors in different places; until the places name them, pick by place
const DOOR_BY_PLACE = { train: 'traindoor', gate: 'glassdoor' };
let placeName = '';
export function setPlace(name) { placeName = name || ''; }

export function ctx() {
  if (!unlocked && !C) return null;
  if (!C) { const b = audioBus('sfx'); C = b ? b.context : null; if (C) preloadAll(); }
  return C;
}
// the context if audio is unlocked and running (never creates one before a tap)
export function running() { const c = unlocked ? ctx() : null; return c && c.state === 'running' ? c : null; }
export function bus(name = 'sfx') { return audioBus(name); }
export { isMuted };

const url = (f) => new URL(`../audio/sfx/${f}.mp3?v=${encodeURIComponent(window.BUILD || '')}`, import.meta.url).href;
export function load(f) {
  if (!bufs[f]) {
    bufs[f] = fetch(url(f)).then((r) => { if (!r.ok) throw new Error(f); return r.arrayBuffer(); })
      .then((a) => new Promise((ok, no) => C.decodeAudioData(a, ok, no)))
      .then((b) => (bufs[f] = b)).catch(() => (bufs[f] = null));
  }
  return bufs[f];
}
function preloadAll() { const all = new Set(Object.values(K).flatMap((k) => k.f)); for (const f of all) load(f); }

// Play a kind. opts: { gain (linear, default 1), rate, at (seconds from now), pan (-1..1) }.
// Returns { stop(ms) } (a no-op if nothing played).
export function sfx(kind, opts = {}) {
  const none = { stop() {} };
  if (isMuted()) return none;
  const c = ctx(); if (!c) return none;
  if (kind === 'door' && DOOR_BY_PLACE[placeName]) kind = DOOR_BY_PLACE[placeName];
  const k = K[kind]; if (!k) { return none; }
  const now = c.currentTime;
  if (k.gap && lastAt[kind] && now - lastAt[kind] < k.gap) return none;
  lastAt[kind] = now;
  const f = k.f[Math.floor(Math.random() * k.f.length)];
  const b = bufs[f];
  if (!b || b instanceof Promise) { load(f); return none; }
  const src = c.createBufferSource(); src.buffer = b;
  const spread = (r) => (r ? (Math.random() * 2 - 1) * r : 0);
  src.playbackRate.value = (opts.rate || 1) * (1 + spread(k.rate));
  const g = c.createGain(); g.gain.value = (opts.gain ?? 1) * Math.pow(10, spread(k.db) / 20);
  let node = src.connect(g);
  if (opts.pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, opts.pan)); node = node.connect(p); }
  node.connect(audioBus('sfx'));
  const at = now + (opts.at || 0);
  src.start(at);
  live[kind] = g;
  if (kind === 'kotodama') { for (const f of dipHooks) f(0.25, 0.08, 1.4, 1.2); }   // the world goes quiet while the word takes hold
  const stop = (ms = 40) => { const t = c.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + ms / 1000); try { src.stop(t + ms / 1000 + 0.02); } catch { /* */ } };
  return { stop };
}
// cut a kind short (the door chime stops mid-note when a kotodama freezes the doors)
export function stopSfx(kind, ms = 40) { const g = live[kind]; if (!g || !C) return; delete live[kind]; const t = C.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + ms / 1000); }

// ---------- dips ----------
// Things that should go quiet for a moment (ambience, and music if the shell registers it) register here.
const dipHooks = new Set();
export function onDip(fn) { dipHooks.add(fn); }
