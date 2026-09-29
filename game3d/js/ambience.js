// Ambience per place, under the music: a looping bed (audio/amb/) plus one-shots scattered at random times
// (audio/sfx/), through a duck stage into the shell's 'ambience' bus (ui.js audioBus: the settings volume). Voices duck
// it like the music (duck(on), called by ui.js next to its music duck); a kotodama dips it (sfx.js onDip).
// ambience.update(game, dt) runs every frame and works out what should be heard from the game's state, so the
// places don't have to call it:
//   train   the carriage bed follows the train's speed; as the doors open the platform bed comes in
//   gate    the lobby murmur, and card readers beeping now and then at the gates
//   lift    during the ride between the lobby and the office (the player is hidden in the car)
//   office  air conditioning, typing somewhere, a printer, a phone ringing across the floor; quieter after work
// Beds loop as overlapping copies with an equal-power crossfade, so the seam never shows (MP3 padding included).
import { ctx, running, bus, load, isMuted, onDip } from './sfx.js';

const BEDS = { train: 'bed_train', station: 'bed_station', gate: 'bed_lobby', office: 'bed_office', lift: 'bed_lift' };
// one-shots per scene: file, gain, seconds between (random in range), a stereo spread
const EVENTS = {
  gate: [
    { f: 'beep', g: 0.3, every: [5, 12], pan: 0.6 },
    { f: 'beep', g: 0.22, every: [9, 20], pan: 0.8, twice: true },
  ],
  office: [
    { f: 'typing', g: 1, every: [8, 20], pan: 0.7 },
    { f: 'phone_far', g: 1, every: [50, 110], pan: 0.8, day: true },
    { f: 'printer', g: 1, every: [45, 95], pan: 0.6, day: true },
  ],
};
const XF = 3; // bed self-crossfade (s)
const FADE = 2.5; // scene change (s)

// the duck stage: every bed and one-shot goes through it
let duckG = null,
  duckN = 0,
  dipUntil = 0;
const DUCK = 0.55;
function out() {
  if (!duckG) {
    const c = ctx();
    duckG = c.createGain();
    duckG.connect(bus('ambience'));
  }
  return duckG;
}
function ramp(v, secs) {
  const g = out(),
    t = g.context.currentTime;
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(g.gain.value, t);
  g.gain.linearRampToValueAtTime(v, t + secs);
}
// voices: on / off calls nest (every on needs an off)
export function duck(on) {
  duckN = Math.max(0, duckN + (on ? 1 : -1));
  if (!running() || performance.now() < dipUntil) return;
  ramp(duckN ? DUCK : 1, duckN ? 0.15 : 0.6);
}
// a short dip to `level`: in over a s, held, back over r s
onDip((level, a, hold, r) => {
  if (!running()) return;
  const g = out(),
    t = g.context.currentTime,
    back = duckN ? DUCK : 1;
  dipUntil = performance.now() + (a + hold + r) * 1000;
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(g.gain.value, t);
  g.gain.linearRampToValueAtTime(Math.min(back, level), t + a);
  g.gain.setValueAtTime(Math.min(back, level), t + a + hold);
  g.gain.linearRampToValueAtTime(back, t + a + hold + r);
  setTimeout(
    () => {
      if (performance.now() >= dipUntil - 20) ramp(duckN ? DUCK : 1, 0.3);
    },
    (a + hold + r) * 1000 + 30,
  );
});

const beds = {}; // name -> { g (gain), want, cur, srcs, timer }
let nextAt = {},
  trainV0 = 0;
const url = (f) => new URL(`../audio/amb/${f}.mp3?v=${encodeURIComponent(window.BUILD || '')}`, import.meta.url).href;
const ambBufs = {};
function bedBuf(f) {
  const c = ctx();
  if (!ambBufs[f])
    ambBufs[f] = fetch(url(f))
      .then((r) => r.arrayBuffer())
      .then((a) => new Promise((ok, no) => c.decodeAudioData(a, ok, no)))
      .then((b) => (ambBufs[f] = b))
      .catch(() => (ambBufs[f] = null));
  return ambBufs[f];
}

function bed(name) {
  if (beds[name]) return beds[name];
  const c = ctx();
  const g = c.createGain();
  g.gain.value = 0;
  g.connect(out());
  const b = (beds[name] = { g, want: 0, level: 0, srcs: [], timer: 0, running: false });
  return b;
}
async function run(name) {
  const b = bed(name);
  if (b.running) return;
  b.running = true;
  const buf = await bedBuf(BEDS[name]);
  if (!buf || !b.running) {
    b.running = false;
    return;
  }
  const c = ctx();
  const curve = (up) => {
    const n = 64,
      a = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = i / (n - 1);
      a[i] = up ? Math.sin((x * Math.PI) / 2) : Math.cos((x * Math.PI) / 2);
    }
    return a;
  };
  const play = (at, fadeIn) => {
    if (!b.running) return;
    const s = c.createBufferSource(),
      sg = c.createGain();
    s.buffer = buf;
    s.connect(sg);
    sg.connect(b.g);
    const end = at + buf.duration;
    if (fadeIn) {
      sg.gain.setValueAtTime(0, at);
      sg.gain.setValueCurveAtTime(curve(true), at, XF);
    } else sg.gain.setValueAtTime(1, at);
    sg.gain.setValueCurveAtTime(curve(false), end - XF, XF);
    // start a little into the file on the first copy, so two places never start on the same bar of noise
    s.start(at, fadeIn ? 0 : Math.random() * Math.max(0, buf.duration - XF * 2 - 1));
    s.stop(end + 0.05);
    b.srcs.push(s);
    if (b.srcs.length > 3) b.srcs.shift();
    const next = end - XF;
    b.timer = setTimeout(() => play(next, true), Math.max(0, (next - c.currentTime - 1) * 1000));
  };
  play(c.currentTime + 0.05, false);
}
function stop(name) {
  const b = beds[name];
  if (!b || !b.running) return;
  b.running = false;
  clearTimeout(b.timer);
  const t = ctx().currentTime;
  for (const s of b.srcs) {
    try {
      s.stop(t + 0.1);
    } catch {
      /* */
    }
  }
  b.srcs = [];
}
// ease each bed's gain toward what it should be; beds at zero for a while are stopped
function mix(dt, wants) {
  const c = ctx();
  const t = c.currentTime;
  for (const name of Object.keys(BEDS)) {
    const want = wants[name] || 0,
      b = beds[name];
    if (!want && !b) continue;
    const bb = bed(name);
    if (want > 0 && !bb.running) run(name);
    const rate = dt / FADE;
    bb.level += Math.max(-rate, Math.min(rate, want - bb.level));
    bb.g.gain.setTargetAtTime(bb.level, t, 0.05);
    if (bb.level <= 0.001 && want === 0) {
      bb.idle = (bb.idle || 0) + dt;
      if (bb.idle > 1) stop(name);
    } else bb.idle = 0;
  }
}

// What should be heard now. Reads the game's state only.
function scene(game) {
  const p = game.place;
  if (!p) return {};
  const name = p.name;
  const hidden = game.player && !game.player.root.visible;
  if (hidden && document.body.classList.contains('trip') && game.liftFloor) return { lift: 1 };
  if (name === 'train') {
    const st = p._st || {};
    if (st.v > trainV0) trainV0 = st.v;
    const speed = st.arrived ? 0 : st.v === undefined ? 1 : Math.max(0, Math.min(1, st.v / Math.max(1e-3, trainV0)));
    const doors = Math.max(0, Math.min(1, st.door || 0));
    // stopped with the doors open: the car goes to a low idle hum and the platform air comes in
    return { train: 0.3 + 0.7 * speed, station: doors * (st.arrived ? 1 : 0.4) };
  }
  if (name === 'gate') return { gate: 1 };
  if (name === 'forecourt') return { station: 0.6 };
  if (name === 'office') return { office: game.sim && game.sim.period === 'evening' ? 0.7 : 1 };
  return {};
}

function events(game, dt) {
  const p = game.place;
  if (!p || (game.busy && document.body.classList.contains('trip'))) return;
  const list = EVENTS[p.name];
  if (!list) return;
  const now = performance.now() / 1000,
    evening = game.sim && game.sim.period === 'evening';
  list.forEach((e, i) => {
    const key = p.name + i;
    if (nextAt[key] === undefined) {
      nextAt[key] = now + e.every[0] * (0.3 + Math.random() * 0.7);
      return;
    }
    if (now < nextAt[key]) return;
    nextAt[key] = now + e.every[0] + Math.random() * (e.every[1] - e.every[0]);
    if (e.day && evening) return;
    const pan = (Math.random() * 2 - 1) * (e.pan || 0);
    playAmb(e.f, e.g * (evening ? 0.6 : 1), pan);
    if (e.twice) playAmb(e.f, e.g * 0.9, pan, 0.18);
  });
  void dt;
}
// a one-shot on the ambience bus (so it ducks with the beds)
async function playAmb(f, gain, pan = 0, at = 0) {
  const c = ctx();
  const b = await load(f);
  if (!b) return;
  const s = c.createBufferSource();
  s.buffer = b;
  s.playbackRate.value = 0.97 + Math.random() * 0.06;
  const g = c.createGain();
  g.gain.value = gain;
  let n = s.connect(g);
  if (c.createStereoPanner) {
    const pn = c.createStereoPanner();
    pn.pan.value = pan;
    n = n.connect(pn);
  }
  n.connect(out());
  s.start(c.currentTime + at);
}

export function update(game, dt) {
  if (isMuted() || !game || !game.place) return;
  // nothing starts before the first tap unlocks audio (sfx.ctx() is created by then)
  if (!running()) return;
  mix(dt, scene(game));
  events(game, dt);
}
