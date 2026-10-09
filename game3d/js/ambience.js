// Ambience per place, under the music: a looping bed (audio/amb/) plus one-shots scattered at random times
// (audio/sfx/), through a duck stage into the shell's 'ambience' bus (ui.js audioBus: the settings volume). Voices duck
// it like the music (duck(on), called by ui.js next to its music duck); a kotodama dips it (sfx.js onDip).
// ambience.update(game, dt) runs every frame and works out what should be heard from the game's state, so the
// places don't have to call it:
//   train   the carriage bed follows the train's speed; as the doors open the platform bed comes in
//   gate    the lobby murmur, and card readers beeping now and then at the gates
//   lift    during the ride between the lobby and the office (the player is hidden in the car)
//   office  air conditioning, typing somewhere, a printer, a phone ringing across the floor; quieter after work
//   outdoors  sparrows and a light wind by day, crickets after work (and the forecourt keeps the station's air);
//           a flock of pigeons scattering near Eric is heard (creatureCall)
// Beds loop as overlapping copies with an equal-power crossfade, so the seam never shows (MP3 padding included).
// All gain automation goes through audio/automation.js, and update() catches and logs: no audio error can stop the
// frame loop (#273).
import { ctx, running, bus, load, isMuted, onDip, titleQuiet } from './sfx.js';
import { scheduleCopy, rampTo, dipTo, guard } from './audio/automation.js';

const BEDS = {
  train: 'bed_train',
  station: 'bed_station',
  gate: 'bed_lobby',
  office: 'bed_office',
  lift: 'bed_lift',
  birds: 'bed_birds',
  insects: 'bed_insects',
};
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
  const g = out();
  rampTo(g.gain, g.context.currentTime, v, secs);
}
// voices: on / off calls nest (every on needs an off)
export function duck(on) {
  duckN = Math.max(0, duckN + (on ? 1 : -1));
  if (!running() || performance.now() < dipUntil) return;
  guard('ambience duck', () => ramp(duckN ? DUCK : 1, duckN ? 0.15 : 0.6));
}
// a short dip to `level`: in over a s, held, back over r s
onDip((level, a, hold, r) => {
  if (!running()) return;
  const ok = guard('ambience dip', () => {
    const g = out();
    return dipTo(g.gain, g.context.currentTime, level, a, hold, r, duckN ? DUCK : 1);
  });
  if (!ok) return;
  dipUntil = performance.now() + (a + hold + r) * 1000;
  setTimeout(
    () => {
      if (performance.now() >= dipUntil - 20) guard('ambience dip end', () => ramp(duckN ? DUCK : 1, 0.3));
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
  // each copy fades out over its last XF s while the next fades in; a timer that fires late starts the next copy
  // now instead (scheduleCopy keeps its fades from overlapping)
  const play = (at, fadeIn) => {
    if (!b.running) return;
    // start a little into the file on the first copy, so two places never start on the same bar of noise
    const offset = fadeIn ? 0 : Math.random() * Math.max(0, buf.duration - XF * 2 - 1);
    const s = c.createBufferSource(),
      sg = c.createGain();
    s.buffer = buf;
    s.connect(sg);
    sg.connect(b.g);
    const t = scheduleCopy(sg.gain, { now: c.currentTime, at, dur: buf.duration, offset, xf: XF, fadeIn });
    if (!t) return;
    s.start(t.at, offset);
    s.stop(t.end + 0.05);
    b.srcs.push(s);
    if (b.srcs.length > 3) b.srcs.shift();
    const next = t.outAt;
    b.timer = setTimeout(
      () => guard('ambience bed', () => play(next, true)),
      Math.max(0, (next - c.currentTime - 1) * 1000),
    );
  };
  guard('ambience bed', () => play(c.currentTime + 0.05, false));
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
    if (titleQuiet()) return {}; // no rattle under the title (menu.js)
    const st = p._st || {};
    if (st.v > trainV0) trainV0 = st.v;
    const speed = st.arrived ? 0 : st.v === undefined ? 1 : Math.max(0, Math.min(1, st.v / Math.max(1e-3, trainV0)));
    const doors = Math.max(0, Math.min(1, st.door || 0));
    // stopped with the doors open: the car goes to a low idle hum and the platform air comes in
    return { train: 0.3 + 0.7 * speed, station: doors * (st.arrived ? 1 : 0.4) };
  }
  if (name === 'gate') return { gate: 1 };
  // outdoors, where there are birds and animals (js/creatures/): sparrows and wind by day, crickets after work
  if (p.creatures) {
    const outside = p.creatures.evening() ? { insects: 1 } : { birds: 1 };
    return name === 'forecourt' ? { station: 0.6, ...outside } : outside;
  }
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

// a bird's call or a flock's wings, from js/creatures/ (world.js sound): gain 0 to 1 by distance, pan by where it is
// on screen; each kind no more than once in a while, so a scattering flock is one sound
const CALLS = { flap: { f: ['wings_flap'], gap: 1.5 } };
const callAt = {};
export function creatureCall(name, gain, pan) {
  const c = CALLS[name],
    now = performance.now() / 1000;
  if (!c || isMuted() || !running() || now - (callAt[name] || 0) < c.gap) return;
  callAt[name] = now;
  playAmb(c.f[Math.floor(Math.random() * c.f.length)], gain, pan);
}

export function update(game, dt) {
  if (isMuted() || !game || !game.place) return;
  // nothing starts before the first tap unlocks audio (sfx.ctx() is created by then)
  if (!running()) return;
  guard('ambience update', () => {
    mix(dt, scene(game));
    events(game, dt);
  });
}
