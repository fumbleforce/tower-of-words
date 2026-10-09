// The fallen bicycle in the forecourt's bike court (docs/game/places.md, forecourt): the bike lying in the aisle and
// its neighbour in the rack, built here rather than in the static rows (scenes/forecourt/court.js LOOSE_BIKES) so
// they can move. The `bicycle` hook: `lift` stands the fallen one up and wheels it into its place; `tip`: the bell
// rings as he lets go, the neighbour slowly tips over into the aisle and he turns to look; `second` stands that one up.
//   state: 'fallen' (one down, as in the morning), 'lifted' (both up, the neighbour about to go), 'tipped' (the
//   neighbour down), 'upright' (both in the rack)
import * as THREE from 'three';
import { rowBike, slotYaw, FALLEN } from '../scenes/forecourt/details.js';
import { rbox } from '../props.js';
import { mergeStatic } from '../scenes/merge-static.js';
import { SE } from '../scenes/forecourt/plan.js';
import { LOOSE_BIKES } from '../scenes/forecourt/court.js';
import { glide } from '../move.js';
import { running, bus, isMuted, sfx } from '../sfx.js';
import { flags } from '../narrative/state.js';
import { sim } from '../sim.js';
import { hold, lean } from './eric-hold.js';

// the story's flags for how far it got (story/forecourt.js fallen_bicycle): a place built later that evening, or
// after Continue in another place, starts from them
const TIPPED = 'evening_bike_tipped',
  UPRIGHT = 'evening_bikes_upright';
const ease = (k) => k * k * (3 - 2 * k);
const STAND = -0.09; // leaning a little on its stand (bicycle() leans every parked bike the same)

export function fallenBikes(game, root, nav, { rackLight } = {}) {
  const { row, step, fallen, leaning } = LOOSE_BIKES;
  const frame = new THREE.Group(); // the row's own frame: places along x, the aisle toward -z
  frame.rotation.y = row.turn;
  frame.position.set(row.x, 0, row.z);
  // the draw-call pass (perf/batch.js) merges them with the parked bikes while they stand still, and lets a bike go back
  // to drawing itself the moment it moves; the one lying in the aisle is outlined, so it always draws itself
  root.add(frame);
  const make = (i) => {
    const holder = new THREE.Group(),
      bike = rowBike(i, row.seed);
    bike.rotation.set(0, 0, 0);
    // One mesh per material like the bikes in the static rows (they merge with the scene), so each moving bike draws
    // about 6 times instead of 20, twice over with its shadow; the front wheel stays apart (named) to turn.
    if (bike.userData.front) bike.userData.front.name = 'evening:bike-wheel';
    mergeStatic(bike);
    holder.add(bike);
    frame.add(holder);
    return { i, holder, bike, wheel: bike.userData.front };
  };
  const bikes = { fallen: make(fallen), leaning: make(leaning) };
  bikes.fallen.holder.name = 'evening:bike-first';
  bikes.leaning.holder.name = 'evening:bike-second';
  // A station-wall light reaches the rack, which otherwise sits wholly in the building's shadow.
  root.add(rbox(0.14, 0.2, 0.66, '#46505d', { x: SE + 0.08, y: 2.35, z: 6.4 }));
  const diffuser = rbox(0.02, 0.11, 0.52, '#e2e8eb', { x: SE + 0.16, y: 2.35, z: 6.4 });
  diffuser.material = diffuser.material.clone();
  root.add(diffuser);
  const light = rackLight ? rackLight(root) : new THREE.PointLight('#dae4ee', 0, 8, 2);
  light.position.set(SE + 0.55, 2.3, 6.4);
  root.add(light);
  const upright = (i) => ({ x: i * step, z: 0, y: 0, yaw: slotYaw(i, row.seed), roll: STAND });
  const lying = (i) => ({ x: i * step + FALLEN.dx, z: FALLEN.z, y: FALLEN.y, yaw: FALLEN.yaw, roll: FALLEN.roll });
  const put = (b, p) => {
    b.holder.position.set(p.x, 0, p.z);
    b.holder.rotation.y = p.yaw;
    b.bike.position.y = p.y;
    b.bike.rotation.x = p.roll;
  };
  const mix = (a, b, k) => Object.fromEntries(Object.keys(a).map((n) => [n, a[n] + (b[n] - a[n]) * k]));
  const world = (x, z) => {
    frame.updateMatrixWorld(true);
    const v = frame.localToWorld(new THREE.Vector3(x, 0, z));
    return [v.x, v.z];
  };
  let state = 'fallen';
  const down = () => (state === 'fallen' ? bikes.fallen : state === 'tipped' ? bikes.leaning : null);
  const downAt = () => {
    const b = down() || bikes.leaning;
    const p = lying(b.i);
    return world(p.x, p.z);
  };
  // where he stands to lift it: in the aisle beside it, facing it
  const liftSpot = () => {
    const p = lying((down() || bikes.leaning).i);
    return world(p.x, p.z - 0.75);
  };
  function set(s) {
    state = s;
    const lit = flags.going_home && sim.period === 'evening';
    light.intensity = lit ? 14 : 0;
    diffuser.material.emissive.set(lit ? '#b8c8d8' : '#000000');
    if (bikes.fallen.wheel) bikes.fallen.wheel.rotation.z = s === 'fallen' ? 0 : -3.2;
    if (bikes.leaning.wheel) bikes.leaning.wheel.rotation.z = s === 'upright' ? -3.2 : 0;
    put(bikes.fallen, s === 'fallen' ? lying(fallen) : upright(fallen)); // 'lifted' and 'upright' look the same
    put(bikes.leaning, s === 'tipped' ? lying(leaning) : upright(leaning));
    nav.unblock('fallenBike');
    if (down()) {
      const [x, z] = downAt();
      nav.blockTagged('fallenBike', x - 0.25, x + 0.25, z - 0.5, z + 0.5);
    }
  }
  set(flags[UPRIGHT] ? 'upright' : flags[TIPPED] ? 'tipped' : 'fallen');

  // he bends, takes the handlebar and stands it up, wheels it into its place (a step with it) and lets go
  async function standUp(b) {
    const eric = game.player;
    game.walker.faceTo(...world(lying(b.i).x, lying(b.i).z));
    hold(eric, 'reach', true);
    await lean(game, 0.9, 0.45);
    const from = lying(b.i),
      mid = { ...upright(b.i), x: from.x, z: from.z, roll: 0 },
      to = upright(b.i);
    const rise = lean(game, 0.25, 0.9);
    await game.tween(0.95, (k) => put(b, mix(from, mid, ease(k))));
    await rise;
    const p = eric.root.position,
      [rx, rz] = world(to.x, to.z),
      d = Math.hypot(rx - p.x, rz - p.z),
      walk = glide(game, eric.root, [p.x + ((rx - p.x) / d) * 0.35, p.z + ((rz - p.z) / d) * 0.35], 0.5);
    await game.tween(0.9, (k) => {
      const e = ease(k);
      put(b, mix(mid, { ...to, roll: 0 }, e));
      if (b.wheel) b.wheel.rotation.z = -e * 3.2; // the front wheel turns as it rolls
    });
    await walk;
    game.walker.faceTo(rx, rz);
    await game.tween(0.25, (k) => put(b, mix({ ...to, roll: 0 }, to, k)));
    sfx('clack');
    hold(eric, 'reach', false);
    await lean(game, 0, 0.35);
  }
  // the neighbour: a wobble on its stand, a slow lean, then over into the aisle with a clatter
  async function tipOver(b) {
    const from = upright(b.i),
      to = lying(b.i),
      lean1 = { ...from, roll: 0.14 };
    await game.tween(0.8, (k) => put(b, mix(from, lean1, ease(k))));
    await game.wait(250);
    await game.tween(0.75, (k) => {
      const fall = k * k; // it speeds up as it goes over
      put(b, { ...mix(lean1, to, fall), x: from.x + (to.x - from.x) * ease(k), z: from.z + (to.z - from.z) * ease(k) });
    });
    clatter();
    await game.tween(0.25, (k) => put(b, { ...to, roll: to.roll - Math.sin(Math.PI * k) * 0.08 }));
  }

  const hooks = {
    bicycle: async ({ state: step }) => {
      if (step === 'lift') {
        if (state !== 'fallen') return;
        await standUp(bikes.fallen);
        set('lifted');
      } else if (step === 'tip') {
        if (state === 'lifted') {
          ring();
          await game.wait(450);
          const [x, z] = world(lying(leaning).x, lying(leaning).z);
          game.walker.faceTo(x, z); // he looks round at it as it goes
          await tipOver(bikes.leaning);
          await game.wait(400);
        }
        set('tipped');
      } else if (step === 'second') {
        if (state === 'tipped') await standUp(bikes.leaning);
        set('upright');
      }
    },
  };
  return {
    anchor: (v) => {
      const [x, z] = downAt();
      return v.set(x, 0.55, z);
    },
    spot: liftSpot,
    face: downAt,
    obj: frame,
    outline: () => down()?.holder, // only the one lying there
    enabled: () => !!down(),
    hooks,
    snapshot: () => state,
    restore: (s) => set(s || state),
    sync: () => set(flags[UPRIGHT] ? 'upright' : flags[TIPPED] ? 'tipped' : 'fallen'),
  };
}

// a bicycle bell's two quick rings and a bike hitting the bricks, made here (no sound file for them)
function tone(c, out, t0, f, g, len) {
  const o = c.createOscillator(),
    a = c.createGain();
  o.frequency.value = f;
  a.gain.setValueAtTime(0, t0);
  a.gain.linearRampToValueAtTime(g, t0 + 0.004);
  a.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
  o.connect(a).connect(out);
  o.start(t0);
  o.stop(t0 + len + 0.05);
}
function ring() {
  const c = running();
  if (!c || isMuted()) return;
  const out = bus('sfx');
  for (const t of [0, 0.17])
    for (const [f, g] of [
      [2380, 0.07],
      [3520, 0.035],
      [5210, 0.015],
    ])
      tone(c, out, c.currentTime + t, f, g, 0.8);
}
function clatter() {
  const c = running();
  if (!c || isMuted()) return;
  const out = bus('sfx'),
    len = 0.35,
    buf = c.createBuffer(1, Math.ceil(c.sampleRate * len), c.sampleRate),
    d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp((-i / c.sampleRate) * 14);
  for (const [t, f, g] of [
    [0, 1400, 0.35],
    [0.08, 2600, 0.18],
  ]) {
    const s = c.createBufferSource(),
      bp = c.createBiquadFilter(),
      a = c.createGain();
    s.buffer = buf;
    bp.type = 'bandpass';
    bp.frequency.value = f;
    bp.Q.value = 1.2;
    a.gain.value = g;
    s.connect(bp).connect(a).connect(out);
    s.start(c.currentTime + t);
  }
  tone(c, out, c.currentTime + 0.02, 2380, 0.02, 0.4); // the bell catches the ground
}
