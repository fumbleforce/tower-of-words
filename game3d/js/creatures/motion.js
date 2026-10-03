// One bird's body: flying along a curve and landing, and the small things it does on a surface (pecking, walking,
// hopping, turning, cawing, bobbing on the water). The groups in birds.js decide where it goes; this moves it there.
// A bird's state: p (position in the place's frame), yaw, pitch (+ nose down), roll, flap, fold, mode
//   off   not here (not drawn)
//   rest  on a surface: on = { kind, i } (a perches.js list and index), or on the water
//   fly   along a curve from p0 through c to p1; lands at the end if `land`, else goes off
//   soar  circling (gulls), steered by its group
import * as THREE from 'three';

// how each kind flies and how close it lets a person come (metres, before the place's people scale)
export const HABITS = {
  pigeon: {
    hz: 7,
    amp: 0.95,
    speed: 6.5,
    scare: 2.0,
    walk: 0.32,
    spread: 0.85,
  },
  sparrow: { hz: 13, amp: 1.0, speed: 6.5, scare: 1.6, hop: true, spread: 0.6 },
  crow: {
    hz: 3.6,
    amp: 0.75,
    speed: 6,
    scare: 2.6,
    walk: 0.4,
    caw: true,
    spread: 1,
  },
  gull: { hz: 2.6, amp: 0.6, speed: 5, scare: 2.8, walk: 0.35, spread: 1.4 },
};

const ease = (k) => k * k * (3 - 2 * k);
const _v = new THREE.Vector3(),
  _d = new THREE.Vector3();
const angle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export function newBird(i) {
  return {
    i,
    mode: 'off',
    p: new THREE.Vector3(),
    yaw: Math.random() * 6.28,
    pitch: 0,
    roll: 0,
    flap: 0,
    fold: 1,
    size: 0.92 + Math.random() * 0.16,
    phase: Math.random() * 6.28,
    on: null,
    act: null,
    wait: Math.random() * 2,
    fly: {
      p0: new THREE.Vector3(),
      c: new THREE.Vector3(),
      p1: new THREE.Vector3(),
      u: 0,
      T: 1,
      land: null,
    },
    soar: null,
    delay: 0,
    order: null,
  };
}

// set it down on a surface at once (entering a place, or a bird nobody sees arriving)
export function setDown(b, x, y, z, on) {
  b.mode = 'rest';
  b.p.set(x, y, z);
  b.on = on;
  b.fold = 1;
  b.flap = 0;
  b.pitch = 0;
  b.roll = 0;
  b.act = null;
  b.wait = Math.random() * 1.5;
}

// fly from where it is to p1; land = the surface it lands on (null: it flies on out of the place and goes off)
export function flyTo(b, p1, land, habit, K) {
  const f = b.fly;
  f.p0.copy(b.p);
  f.p1.copy(p1);
  const dist = f.p0.distanceTo(f.p1);
  f.c.lerpVectors(f.p0, f.p1, land ? 0.45 : 0.3);
  f.c.y = Math.max(f.p0.y, f.p1.y) + THREE.MathUtils.clamp(dist * 0.22, 0.5 * K, 3.5 * K);
  f.u = 0;
  f.T = 0.35 + dist / (habit.speed * K);
  f.land = land;
  b.mode = 'fly';
  b.on = null;
  b.act = null;
}
// a bird off the place comes in to land at p1: it starts high and away, out of sight
export function flyIn(b, p1, land, habit, K) {
  const a = Math.random() * 6.28;
  b.p.set(p1.x + Math.cos(a) * 18 * K, p1.y + 9 * K, p1.z + Math.sin(a) * 18 * K);
  b.yaw = Math.atan2(p1.x - b.p.x, p1.z - b.p.z);
  b.fold = 0;
  flyTo(b, p1, land, habit, K);
}
// up and away from a point (a person coming close, or the group leaving)
export function flyAway(b, from, habit, K) {
  _d.set(b.p.x - from.x, 0, b.p.z - from.z);
  if (_d.lengthSq() < 1e-4) _d.set(Math.random() - 0.5, 0, Math.random() - 0.5);
  _d.normalize().applyAxisAngle(THREE.Object3D.DEFAULT_UP, (Math.random() - 0.5) * 0.9);
  _v.copy(b.p).addScaledVector(_d, 24 * K);
  _v.y += 11 * K;
  flyTo(b, _v, null, habit, K);
}

function turnTo(b, yaw, k) {
  b.yaw += angle(yaw - b.yaw) * Math.min(1, k);
}

// one frame of a flying bird
function flying(b, dt, habit) {
  const f = b.fly;
  f.u = Math.min(1, f.u + dt / f.T);
  const u = f.u,
    w = 1 - u;
  // position on the curve and its direction
  b.p
    .set(0, 0, 0)
    .addScaledVector(f.p0, w * w)
    .addScaledVector(f.c, 2 * w * u)
    .addScaledVector(f.p1, u * u);
  _v.subVectors(f.c, f.p0)
    .multiplyScalar(2 * w)
    .addScaledVector(_d.subVectors(f.p1, f.c), 2 * u);
  const flat = Math.hypot(_v.x, _v.z);
  const yaw0 = b.yaw;
  if (flat > 1e-3) turnTo(b, Math.atan2(_v.x, _v.z), dt * 10);
  b.roll +=
    (THREE.MathUtils.clamp((-angle(b.yaw - yaw0) / Math.max(dt, 1e-3)) * 0.12, -0.5, 0.5) - b.roll) *
    Math.min(1, dt * 6);
  const landing = f.land && u > 0.8;
  const climb = Math.atan2(_v.y, flat);
  b.pitch += ((landing ? -0.5 : -climb * 0.55) - b.pitch) * Math.min(1, dt * 8);
  b.fold = Math.max(0, b.fold - dt * 6);
  // wing beats; big birds glide when going down
  const glide = climb < -0.15 && habit.hz < 5 ? 0.25 : 1;
  b.phase += dt * habit.hz * 6.283 * (landing ? 1.4 : 1);
  b.flap = habit.amp * glide * Math.sin(b.phase) + 0.15;
  if (u >= 1) {
    if (f.land) {
      b.mode = 'rest';
      b.on = f.land;
      b.p.copy(f.p1);
      b.wait = 0.4 + Math.random();
      b.act = { type: 'settle', t: 0, T: 0.35 };
    } else b.mode = 'off';
  }
}

// one frame of a bird on a surface
function resting(b, dt, habit, W) {
  b.roll *= 0.8;
  const a = b.act;
  if (!a) {
    b.flap += (0 - b.flap) * Math.min(1, dt * 10);
    b.pitch += (0 - b.pitch) * Math.min(1, dt * 8);
    b.fold = Math.min(1, b.fold + dt * 4);
    if (b.on?.kind === 'water') b.p.y = b.on.y + 0.025 * Math.sin(W.t * 1.7 + b.i);
    b.wait -= dt;
    if (b.wait <= 0) b.act = choose(b, habit, W);
    return;
  }
  a.t += dt;
  const k = Math.min(1, a.t / a.T);
  switch (a.type) {
    case 'settle': // wings folding after a landing
      b.fold = ease(k);
      b.flap = 0.4 * (1 - k);
      b.pitch = -0.4 * (1 - k);
      break;
    case 'peck':
      b.pitch = 0.65 * Math.sin(Math.PI * k);
      break;
    case 'turn':
      b.yaw = a.from + a.by * ease(k);
      break;
    case 'walk': {
      b.p.lerpVectors(a.from, a.to, k);
      b.pitch = 0.12 * Math.abs(Math.sin(k * Math.PI * a.steps)); // the head bobbing with each step
      break;
    }
    case 'hop':
      b.p.lerpVectors(a.from, a.to, k);
      b.p.y += 0.05 * W.K * Math.sin(Math.PI * k);
      b.pitch = -0.15 * Math.sin(Math.PI * k);
      break;
    case 'caw':
      b.pitch = -0.3 * Math.abs(Math.sin(k * Math.PI * 3));
      b.fold = 1 - 0.25 * Math.abs(Math.sin(k * Math.PI * 3));
      break;
    case 'shake': // a quick flutter of the wings, as birds settle their feathers
      b.fold = 1 - 0.55 * Math.sin(Math.PI * k);
      b.flap = 0.25 * Math.sin(k * 40);
      break;
  }
  if (k >= 1) {
    b.act = null;
    b.wait = a.next ?? 0.3 + Math.random() * (habit.hop ? 0.8 : 1.8);
  }
}

// what a resting bird does next
function choose(b, habit, W) {
  const r = Math.random();
  const ground = b.on?.kind === 'ground';
  if (habit.caw && r < 0.12) {
    W.sound('caw', b.p);
    return { type: 'caw', t: 0, T: 0.9 };
  }
  if (ground && r < 0.55) {
    // a step or a hop to a spot nearby that is still on the paving
    const len = (habit.hop ? 0.08 + Math.random() * 0.14 : 0.12 + Math.random() * 0.3) * W.K;
    const yaw = b.yaw + (Math.random() - 0.5) * 2.2;
    const to = new THREE.Vector3(b.p.x + Math.sin(yaw) * len, b.p.y, b.p.z + Math.cos(yaw) * len);
    if (W.nav.free(to.x, to.z, 0.05) && to.distanceTo(b.home || to) < (habit.spread + 0.6) * W.K) {
      b.yaw = yaw;
      if (habit.hop)
        return {
          type: 'hop',
          t: 0,
          T: 0.16,
          from: b.p.clone(),
          to,
          next: Math.random() < 0.5 ? 0.05 : undefined,
        };
      return {
        type: 'walk',
        t: 0,
        T: len / (habit.walk * W.K),
        from: b.p.clone(),
        to,
        steps: Math.ceil(len / (0.07 * W.K)),
      };
    }
  }
  if (ground && r < 0.8)
    return {
      type: 'peck',
      t: 0,
      T: 0.32,
      next: Math.random() < 0.4 ? 0.08 : undefined,
    };
  if (r < 0.93 || b.on?.kind === 'water')
    return {
      type: 'turn',
      t: 0,
      T: 0.3,
      from: b.yaw,
      by: (Math.random() - 0.5) * 2.4,
    };
  return { type: 'shake', t: 0, T: 0.4 };
}

// one frame of any bird; soaring birds are moved by their group
export function stepBird(b, dt, habit, W) {
  if (b.delay > 0) {
    b.delay -= dt;
    if (b.delay <= 0 && b.order) {
      const o = b.order;
      b.order = null;
      o(b);
    }
  }
  if (b.mode === 'fly') flying(b, dt, habit);
  else if (b.mode === 'rest') resting(b, dt, habit, W);
}
