// A cat that moves like one (Jørgen, 2026-10-03: "Has the cat been animated yet or is it still just sliding
// around?"): Tama and the island's cats, on the rigged body in cat-rig.js.
//   makeCat(coat, { mode }) -> rig: { root, head, feet, mode, set(mode), update(dt), look }
// Modes (poses): 'sleep' (curled up, head on her paws, tail round her), 'sit', 'stand', 'eat' (head down in a bowl),
// 'wash' (sitting, a front paw up to her face). Changing mode eases into the new pose.
// Walking needs nothing from whoever moves her: update() measures how far her root really went (and how far it
// turned) and steps the legs by that distance, in a cat's walk (left hind, left front, right hind, right front, a
// quarter of a cycle apart), each paw planted while it is down (movement/gait.js `walking` says when she walks, the
// same way it does for everyone). Turning on the spot she takes small steps round. Moving, she stands up and her tail
// goes up; stopping, she sits down after a moment (rig.after, 'sit' by default).
// Over every pose: breathing, a swaying tail, an ear flicking now and then, blinking while awake, and the head looking
// about (or at rig.look, an angle off straight ahead, when it is set).
import * as THREE from 'three';
import { catBody, REST, L1, L2, TAIL } from './cat-rig.js';
import { walking } from '../movement/gait.js';
import { walkRig } from '../movement/scripted.js';

const DUTY = 0.62, // the part of a cycle each paw is down
  SWEEP = 0.1, // how far a planted paw travels back under her (cat units)
  CYCLE = SWEEP / DUTY, // the ground she covers per cycle
  LIFT = 0.032,
  TURN_STEP = 0.09, // stepping round on the spot: cat units of stepping per radian turned
  OFFS = { hl: 0, fl: 0.25, hr: 0.5, fr: 0.75 },
  KEYS = [
    ...'hy hz hp hr hyw cp cy cr np ny nr el er eyes'.split(' '),
    ...['fl', 'fr', 'hl', 'hr'].flatMap((k) => [k + '1', k + '2', k + 's']),
    ...Array.from({ length: TAIL }, (_, i) => ['t' + i + 'p', 't' + i + 'y']).flat(),
  ];

const zero = () => Object.fromEntries(KEYS.map((k) => [k, 0]));
const tail = (o, ps, ys) => ps.forEach((p, i) => ((o['t' + i + 'p'] = p), (o['t' + i + 'y'] = ys[i] || 0)));
const legs = (o, k, a1, a2, s = 0) => ((o[k + '1'] = a1), (o[k + '2'] = a2), (o[k + 's'] = s));
const HY = REST.hips[1];

// the poses, before the idle movement over them
const POSES = {
  stand: () => {
    const o = zero();
    o.hy = HY;
    o.np = -0.05;
    tail(o, [0.55, 0.35, 0.15, -0.15, -0.35], [0, 0.05, 0.1, 0.1, 0.1]);
    return o;
  },
  sit: () => {
    const o = zero();
    o.hy = 0.062;
    o.hp = -0.75; // the chest up
    o.cp = -0.1;
    o.np = -0.05;
    legs(o, 'fl', 0.02, 0, 0.05);
    legs(o, 'fr', 0.02, 0, -0.05);
    legs(o, 'hl', -1.45, 2.9, 0.3);
    legs(o, 'hr', -1.45, 2.9, -0.3);
    tail(o, [0.72, 0, 0, 0, 0.05], [0.5, 0.6, 0.6, 0.55, 0.5]);
    return o;
  },
  sleep: () => {
    const o = zero();
    o.hy = 0.066;
    o.hyw = -0.85;
    o.cy = 1.5; // curled round to her right
    o.cp = 0.06;
    o.ny = 1.1;
    o.np = 0.5;
    o.nr = 0.35;
    o.eyes = 1;
    legs(o, 'fl', -1.35, 0.9, 0.1);
    legs(o, 'fr', -1.3, 0.9, -0.05);
    legs(o, 'hl', -1.35, 2.7, 0.2);
    legs(o, 'hr', -1.35, 2.7, -0.2);
    tail(o, [-0.9, 0.9, 0, 0, 0], [0, 0.9, 0.85, 0.85, 0.8]);
    return o;
  },
  eat: () => {
    const o = POSES.stand();
    o.hy = 0.13;
    o.hp = 0.12;
    o.cp = 0.1;
    o.np = 0.85;
    legs(o, 'fl', ...reach(0.035, -0.072, -1));
    legs(o, 'fr', ...reach(0.03, -0.072, -1));
    legs(o, 'hl', ...reach(-0.01, -0.1, 1));
    legs(o, 'hr', ...reach(-0.01, -0.1, 1));
    tail(o, [-0.2, 0.25, 0.25, 0.1, 0], [0.2, 0.25, 0.25, 0.2, 0.2]);
    return o;
  },
  wash: () => {
    const o = POSES.sit();
    o.np = 0.5;
    o.nr = 0.25;
    o.ny = 0.2;
    legs(o, 'fl', -2.2, -1.4, -0.25);
    return o;
  },
};

// two-bone leg reaching for a paw dz ahead of / dy below its hip (cat units, the body level); bend: +1 the joint
// behind (hind legs), -1 in front (front legs)
function reach(dz, dy, bend) {
  const d = Math.min(L1 + L2 - 1e-4, Math.max(Math.abs(L1 - L2) + 1e-3, Math.hypot(dz, dy)));
  const base = Math.atan2(-dz, -dy),
    a = Math.acos((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)),
    b = Math.acos((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2));
  return [base + bend * a, -bend * (Math.PI - b)];
}
// the walk at phase ph (0..1): the stand pose with the legs stepping, a little bob, the tail up
const FIXED = {}; // each pose, made once
function walkPose(ph, out) {
  Object.assign(out, (FIXED.stand ||= POSES.stand()));
  const bob = 0.005 * Math.cos(ph * 4 * Math.PI);
  out.hy = HY + bob;
  out.np = 0.05 + 0.03 * Math.cos(ph * 4 * Math.PI);
  tail(out, [1.15, 0.25, -0.1, -0.45, -0.6], [0, 0.04, 0.08, 0.12, 0.12]);
  for (const k of ['fl', 'fr', 'hl', 'hr']) {
    const u = (ph + OFFS[k]) % 1,
      front = k[0] === 'f';
    let z, y;
    if (u < DUTY) ((z = SWEEP * (0.5 - u / DUTY)), (y = 0));
    else {
      const v = (u - DUTY) / (1 - DUTY);
      z = SWEEP * (-0.5 + (1 - Math.cos(Math.PI * v)) / 2);
      y = LIFT * Math.sin(Math.PI * v);
    }
    const hipY = (front ? REST.front[1] : REST.hind[1]) + bob;
    const [a1, a2] = reach(z, -(hipY - 0.005 - y), front ? -1 : 1);
    legs(out, k, a1, a2, 0);
  }
  return out;
}

const rnd = (a, b) => a + Math.random() * (b - a);
const ang = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export function makeCat(coat = 'calico', { mode = 'sit' } = {}) {
  const { mesh, bones } = catBody(coat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const root = new THREE.Group();
  root.add(mesh);
  root.userData.noBatch = true; // she moves: the draw-call pass leaves her alone (perf/batch.js)
  const cur = POSES[mode](),
    walk = zero(),
    out = zero();
  let base = mode,
    t = Math.random() * 10,
    ph = 0,
    at = null,
    yaw0 = 0,
    from = null,
    moved = false,
    still = 0,
    flick = { t: rnd(2, 6), on: 0, ear: 0 },
    blink = { t: rnd(1, 4), on: 0 },
    look = { t: 0, at: 0, now: 0 };
  const rig = {
    root,
    mesh,
    bones,
    head: bones.head,
    feet: [bones.legs.fl[2], bones.legs.fr[2]], // the gait check's two (movement/gait-watch.js)
    selfGait: true, // stepGait / stopGait leave her alone: update() steps her by what she really moved
    after: 'sit',
    look: null,
    air: false, // in a hop: no steps
    get mode() {
      return base;
    },
    // a new pose, eased into (now: at once)
    set(m, { now = false } = {}) {
      if (!POSES[m]) return;
      base = m;
      moved = false; // what she was told wins over sitting down after a walk
      if (now) Object.assign(cur, POSES[m]());
    },
    update(dt) {
      if (dt <= 0) return;
      t += dt;
      // how far she really went, and turned, since last time (in her own body units); a jump is not a step
      const p = root.position,
        sc = root.scale.x || 1;
      let dist = 0,
        turn = 0;
      if (at && from === root.parent && !rig.air) {
        dist = Math.hypot(p.x - at.x, p.z - at.z) / sc;
        turn = Math.abs(ang(root.rotation.y - yaw0));
        if (dist > 0.6) dist = turn = 0;
      }
      (at ||= new THREE.Vector3()).copy(p);
      yaw0 = root.rotation.y;
      from = root.parent;
      // turning on the spot she steps round; walking, her steps are the ground's alone
      const step = dist + (dist / dt < 0.25 ? turn * TURN_STEP : 0);
      const g = walking(rig, step * sc, dt);
      ph = (ph + step / CYCLE) % 1;
      // up when she sets off; sits (rig.after) a moment after she stops
      if (g.on) ((moved = true), (still = 0), base !== 'stand' && (base = 'stand'));
      else if (moved && (still += dt) > 0.5) ((moved = false), (base = rig.after));
      if (!root.visible) return;
      const goal = (FIXED[base] ||= POSES[base]()),
        k = 1 - Math.exp(-dt * 5);
      for (const key of KEYS) cur[key] += (goal[key] - cur[key]) * k;
      if (g.amt > 1e-3) walkPose(ph, walk);
      for (const key of KEYS) out[key] = g.amt > 1e-3 ? cur[key] + (walk[key] - cur[key]) * g.amt : cur[key];
      idle(out, dt, g.amt);
      apply(out);
    },
  };
  // breathing, the tail, ears, blinking and the head, over the pose
  function idle(o, dt, amt) {
    const asleep = base === 'sleep',
      calm = 1 - amt;
    const br = Math.sin(t * (asleep ? 1.3 : 2.1)) * (asleep ? 0.022 : 0.012);
    bones.chest.scale.set(1 + br * 0.6, 1 + br, 1);
    bones.head.scale.set(1 / (1 + br * 0.6), 1 / (1 + br), 1);
    for (let i = 0; i < TAIL; i++)
      o['t' + i + 'y'] +=
        calm * (asleep ? 0.04 : 0.16) * Math.sin(t * (asleep ? 0.6 : 1.4) - i * 0.7) * (0.4 + i * 0.25);
    if (base === 'eat') o.np += calm * Math.max(0, Math.sin(t * 2.4)) * 0.12;
    if (base === 'wash') {
      const s = Math.sin(t * 3.2);
      o.fl2 += calm * 0.35 * s;
      o.np += calm * 0.12 * s;
    }
    // an ear flick now and then
    if ((flick.t -= dt) <= 0)
      ((flick.t = rnd(asleep ? 4 : 2, asleep ? 12 : 7)), (flick.on = 0.25), (flick.ear = Math.random() < 0.5 ? 0 : 1));
    if (flick.on > 0) {
      flick.on -= dt;
      o[flick.ear ? 'er' : 'el'] = Math.sin((1 - flick.on / 0.25) * Math.PI) * 0.7;
    }
    // blinking, awake
    if ((blink.t -= dt) <= 0) ((blink.t = rnd(2.5, 6)), (blink.on = 0.16));
    if (blink.on > 0 && !asleep)
      ((blink.on -= dt), (o.eyes = Math.max(o.eyes, Math.sin((1 - blink.on / 0.16) * Math.PI))));
    // the head: at rig.look, or a slow look about while awake and still
    if (rig.look !== null) look.at = THREE.MathUtils.clamp(rig.look, -1.1, 1.1);
    else if ((look.t -= dt) <= 0) ((look.t = rnd(2.5, 7)), (look.at = asleep || base === 'eat' ? 0 : rnd(-0.7, 0.7)));
    look.now += ((amt > 0.5 ? 0 : look.at) - look.now) * Math.min(1, dt * 3);
    o.ny += look.now;
  }
  function apply(o) {
    const B = bones;
    B.hips.position.set(0, o.hy, REST.hips[2] + o.hz);
    B.hips.rotation.set(o.hp, o.hyw, o.hr, 'YXZ');
    B.chest.rotation.set(o.cp, o.cy, o.cr, 'YXZ');
    B.head.rotation.set(o.np - o.hp - o.cp, o.ny, o.nr, 'YXZ'); // head pitch is against level ground
    B.ears[0].rotation.set(-o.el * 0.5, 0, -o.el);
    B.ears[1].rotation.set(-o.er * 0.5, 0, o.er);
    const sh = Math.max(0, Math.min(1, o.eyes));
    B.eyes.scale.set(1, Math.max(0.001, 1 - sh), 1);
    B.lids.scale.setScalar(sh > 0.6 ? 1 : 0.001);
    for (const k of ['fl', 'fr', 'hl', 'hr']) {
      const [up, lo] = B.legs[k],
        // the poses' leg angles are against level ground: the body's tilt taken out
        tilt = k[0] === 'f' ? o.hp + o.cp : o.hp;
      up.rotation.set(o[k + '1'] - tilt, 0, o[k + 's'], 'ZXY');
      lo.rotation.set(o[k + '2'], 0, 0);
    }
    for (let i = 0; i < TAIL; i++) B.tail[i].rotation.set(o['t' + i + 'p'], o['t' + i + 'y'], 0, 'XYZ'); // pitch over yaw: a tail lying down curls flat
  }
  rig.set(mode, { now: true });
  rig.update(1e-3);
  return rig;
}

// A cat's scripted walk: up on her feet first, then walkRig (routed, avoiding people), then the pose she ends in.
export async function catWalk(game, rig, to, { speed = 1.05, end = rig.after } = {}) {
  const was = rig.mode;
  if (was !== 'stand') {
    rig.set('stand');
    await game.wait(was === 'sleep' ? 700 : 450);
  }
  rig.after = end;
  await walkRig(game, rig, to, { speed });
}

// A hop up or down (onto a seat, off it, onto a lap): up on her feet, turned to where she lands, then an arc there.
// to: [x, z] in her parent's space, y: the height she lands at.
export async function catHop(game, rig, [x, z], y, { dur = 0.42, h = 0.12, end = null } = {}) {
  const r = rig.root,
    p0 = r.position.clone();
  if (rig.mode !== 'stand') {
    rig.set('stand');
    await game.wait(350);
  }
  const a = Math.atan2(x - p0.x, z - p0.z),
    y0 = r.rotation.y,
    turn = Math.atan2(Math.sin(a - y0), Math.cos(a - y0));
  if (Math.hypot(x - p0.x, z - p0.z) > 0.02) await game.tween(0.25, (k) => (r.rotation.y = y0 + turn * k));
  rig.air = true;
  await game.tween(dur, (k) => {
    r.position.set(p0.x + (x - p0.x) * k, p0.y + (y - p0.y) * k + h * Math.sin(Math.PI * k), p0.z + (z - p0.z) * k);
  });
  rig.air = false;
  if (end) rig.set(end);
}
