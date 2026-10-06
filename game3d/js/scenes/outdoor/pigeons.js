// A small flock of pigeons on the ground (the plaza's, by the fountain): they peck, bob their heads as they walk,
// turn, make small hops, and fly off when Eric comes close (a flutter up and away out of the view), then come back
// a while after he has moved off and land where they were. Cheap: one instanced mesh per part (bodies, heads, tails,
// a wing each side) for the whole flock, so the flock is six draw calls whatever its size, and each frame only rewrites their
// matrices. The wing flutter is a short noise burst made in Web Audio (no file).
//   const flock = pigeons(root, [x, z], { n: 5, seed })
//   flock.update(dt, t, eric)   eric: his position in the same frame as root (a Vector3 or { x, z })
//   flock.state()               for checks: [{ state, x, y, z }]
import * as THREE from 'three';
import { updateInstanceBounds } from '../../perf/instance-bounds.js';
import { running, bus, isMuted } from '../../sfx.js';

const SCARE = 2.1, // Eric this close: they fly
  BACK = 5.5, // and come back once he is this far from where they were, after AWAY seconds
  AWAY = [9, 15],
  ROAM = 1.05, // how far they wander from home
  SIZE = 1.2; // the parts below are a small pigeon's; the plaza's read better a little bigger

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

// the parts, each in the pigeon's frame: x to its left, y up, z forward (its nose on +z)
function parts() {
  const body = new THREE.DodecahedronGeometry(0.1, 0).scale(0.8, 0.74, 1.35).rotateX(-0.32).translate(0, 0.115, 0);
  const head = new THREE.DodecahedronGeometry(0.052, 0).scale(0.9, 1, 1.05);
  const beak = new THREE.BoxGeometry(0.018, 0.016, 0.045).translate(0, -0.008, 0.055);
  const tail = new THREE.BoxGeometry(0.075, 0.016, 0.12).rotateX(0.35).translate(0, 0.085, -0.15);
  // a wing hinged on the body's side: it runs back from the shoulder and out to the side (+x for the left); the
  // right one is its own mirrored mesh, since a mirrored instance matrix turns its faces inside out
  const wing = (s) => new THREE.BoxGeometry(0.17, 0.012, 0.15).translate(0.085 * s, 0, -0.04);
  return { body, head, beak, tail, wingL: wing(1), wingR: wing(-1) };
}

export function pigeons(root, home, { n = 5, seed = 7 } = {}) {
  const R = rng(seed);
  const g = parts();
  const mk = (geo, color, count) => {
    const m = new THREE.InstancedMesh(
      geo,
      new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true }),
      count,
    );
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.castShadow = false;
    m.receiveShadow = false;
    m.name = 'pigeons'; // named: the static merge (scenes/merge-static.js) leaves it alone
    root.add(m);
    return m;
  };
  const bodies = mk(g.body, '#ffffff', n),
    heads = mk(g.head, '#ffffff', n),
    beaks = mk(g.beak, '#3c3f47', n),
    tails = mk(g.tail, '#565c69', n),
    wings = [mk(g.wingL, '#ffffff', n), mk(g.wingR, '#ffffff', n)];
  const greys = ['#747a86', '#686e7a', '#80858f', '#6f7480', '#878b94'],
    heady = ['#4a505d', '#434b59', '#515764'],
    wingy = ['#636a76', '#5b616d', '#6d737e'];
  const c = new THREE.Color();
  const birds = [];
  for (let i = 0; i < n; i++) {
    bodies.setColorAt(i, c.set(greys[i % greys.length]));
    heads.setColorAt(i, c.set(heady[i % heady.length]));
    for (const w of wings) w.setColorAt(i, c.set(wingy[i % wingy.length]));
    const a = R() * Math.PI * 2,
      r = Math.sqrt(R()) * ROAM * 0.8;
    const x = home[0] + Math.cos(a) * r,
      z = home[1] + Math.sin(a) * r;
    birds.push({
      x,
      z,
      y: 0,
      yaw: R() * Math.PI * 2,
      land: [x, z],
      state: 'idle',
      t: 0,
      dur: 0.3 + R() * 1.5,
      head: 0, // 0 up, 1 down (pecking)
      bob: 0,
      tilt: 0,
      flap: 0,
      spread: 0, // 0 folded, 1 open
      phase: R() * 10,
      vx: 0,
      vy: 0,
      vz: 0,
      target: null,
      turnTo: 0,
      delay: 0,
    });
  }
  for (const m of [bodies, heads, ...wings]) m.instanceColor.needsUpdate = true;

  let flockState = 'ground',
    awayFor = 0;
  const M = new THREE.Matrix4(),
    P = new THREE.Matrix4(),
    Q = new THREE.Quaternion(),
    E = new THREE.Euler(),
    V = new THREE.Vector3(),
    S = new THREE.Vector3(1, 1, 1),
    ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

  function pick(b) {
    const roll = R();
    b.t = 0;
    const far = Math.hypot(b.x - home[0], b.z - home[1]) > ROAM;
    if (far || roll < 0.3) {
      // walk a few steps, toward home when it has wandered
      const a = far ? Math.atan2(home[1] - b.z, home[0] - b.x) + (R() - 0.5) : R() * Math.PI * 2;
      const d = 0.25 + R() * 0.5;
      b.target = [b.x + Math.cos(a) * d, b.z + Math.sin(a) * d];
      b.state = 'walk';
      b.dur = 4;
    } else if (roll < 0.62) {
      b.state = 'peck';
      b.dur = 0.5 + R() * 1.1;
    } else if (roll < 0.75) {
      b.state = 'hop';
      b.dur = 0.34;
      b.turnTo = b.yaw + (R() - 0.5) * 1.2;
    } else if (roll < 0.9) {
      b.state = 'turn';
      b.dur = 0.35;
      b.from = b.yaw;
      b.turnTo = b.yaw + (R() < 0.5 ? -1 : 1) * (0.6 + R() * 1.4);
    } else {
      b.state = 'idle';
      b.dur = 0.5 + R() * 1.4;
    }
  }

  function flutter(pan) {
    if (isMuted()) return;
    const ctx = running();
    if (!ctx) return;
    const len = 0.9,
      rate = ctx.sampleRate;
    const buf = ctx.createBuffer(1, Math.floor(len * rate), rate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      const t = i / rate;
      // wing beats about 13 a second, fading as they climb away
      const beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * 2 * 13)), 3);
      d[i] = (Math.random() * 2 - 1) * beat * Math.exp(-t * 3.2);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1500;
    bp.Q.value = 0.7;
    const gn = ctx.createGain();
    gn.gain.value = 0.22;
    let node = src.connect(bp).connect(gn);
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      node = node.connect(p);
    }
    node.connect(bus('sfx'));
    src.start();
  }

  function scare(eric) {
    flockState = 'flying';
    for (const b of birds) {
      const a = Math.atan2(b.z - eric.z, b.x - eric.x) + (R() - 0.5) * 1.1;
      const sp = 2.6 + R() * 1.2;
      b.vx = Math.cos(a) * sp;
      b.vz = Math.sin(a) * sp;
      b.vy = 1.8 + R() * 0.8;
      b.state = 'flee';
      b.delay = R() * 0.25;
      b.t = 0;
      b.land = [b.x, b.z];
    }
    flutter(Math.max(-1, Math.min(1, (birds[0].x - eric.x) / 6)));
  }

  function comeBack() {
    flockState = 'landing';
    for (const b of birds) {
      // in from the far side of home, high up, gliding down onto where it took off from
      const a = R() * Math.PI - Math.PI; // from the north half (behind the fountain, away from the camera)
      const d = 11 + R() * 3;
      b.from = [b.land[0] + Math.cos(a) * d, 6 + R() * 2, b.land[1] + Math.sin(a) * d];
      b.x = b.from[0];
      b.y = b.from[1];
      b.z = b.from[2];
      b.yaw = Math.atan2(b.land[0] - b.x, b.land[1] - b.z);
      b.state = 'return';
      b.t = -R() * 0.8;
      b.dur = 2.4 + R() * 0.6;
    }
  }

  function step(b, dt, eric) {
    b.t += dt;
    const k = Math.min(1, b.t / b.dur);
    b.bob = 0;
    b.tilt = 0;
    switch (b.state) {
      case 'idle':
        b.head += (0 - b.head) * Math.min(1, dt * 10);
        b.tilt = Math.sin((b.t + b.phase) * 2.1) * 0.12;
        if (k >= 1) pick(b);
        break;
      case 'peck': {
        // quick jabs down and up
        const j = Math.max(0, Math.sin((b.t / 0.26) * Math.PI));
        b.head = j;
        if (k >= 1) pick(b);
        break;
      }
      case 'walk': {
        const dx = b.target[0] - b.x,
          dz = b.target[1] - b.z,
          L = Math.hypot(dx, dz);
        const want = Math.atan2(dx, dz);
        let dy = ((want - b.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        b.yaw += dy * Math.min(1, dt * 8);
        const sp = 0.34;
        if (L < 0.03 || k >= 1) pick(b);
        else {
          b.x += (dx / L) * Math.min(L, sp * dt);
          b.z += (dz / L) * Math.min(L, sp * dt);
        }
        // the head goes forward and back with every step (a pigeon's bob)
        b.bob = Math.sin(b.t * Math.PI * 2 * 3.2);
        b.head *= 0.8;
        break;
      }
      case 'hop': {
        b.y = Math.sin(k * Math.PI) * 0.09;
        const f = 0.5 * dt;
        b.x += Math.sin(b.yaw) * f;
        b.z += Math.cos(b.yaw) * f;
        b.yaw += (b.turnTo - b.yaw) * Math.min(1, dt * 10);
        b.spread = Math.sin(k * Math.PI) * 0.35;
        b.flap += dt * 30;
        if (k >= 1) {
          b.y = 0;
          b.spread = 0;
          pick(b);
        }
        break;
      }
      case 'turn':
        b.yaw = b.from + (b.turnTo - b.from) * (1 - (1 - k) * (1 - k));
        if (k >= 1) pick(b);
        break;
      case 'flee':
        if (b.t < b.delay) break;
        b.vy -= 0.4 * dt; // a steady climb, levelling off a little
        b.x += b.vx * dt;
        b.z += b.vz * dt;
        b.y += Math.max(0.6, b.vy) * dt;
        b.yaw = Math.atan2(b.vx, b.vz);
        b.spread = 1;
        b.flap += dt * 13 * Math.PI * 2;
        b.head = 0;
        if (b.t > 4) b.state = 'gone';
        break;
      case 'return': {
        if (b.t < 0) break;
        const u = k,
          e = 1 - (1 - u) * (1 - u);
        b.x = b.from[0] + (b.land[0] - b.from[0]) * e;
        b.z = b.from[2] + (b.land[1] - b.from[2]) * e;
        b.y = b.from[1] * (1 - u) * (1 - u);
        b.spread = 1;
        // beats while high, a glide in the middle, beats again to brake for the landing
        b.flap += dt * (u < 0.35 || u > 0.8 ? 12 : 2) * Math.PI * 2;
        if (u >= 1) {
          b.y = 0;
          b.spread = 0;
          b.state = 'idle';
          b.t = 0;
          b.dur = 0.4 + R();
        }
        break;
      }
    }
    if (eric && flockState === 'ground' && Math.hypot(b.x - eric.x, b.z - eric.z) < SCARE) scare(eric);
  }

  function write() {
    birds.forEach((b, i) => {
      if (b.state === 'gone' || (b.state === 'return' && b.t < 0) || (b.state === 'flee' && b.t < 0)) {
        for (const m of [bodies, heads, beaks, tails]) m.setMatrixAt(i, ZERO);
        for (const w of wings) w.setMatrixAt(i, ZERO);
        return;
      }
      const flying = b.state === 'flee' || b.state === 'return';
      // the bird: position, heading, and a nose-up pitch in flight
      E.set(flying ? -0.25 : 0, b.yaw, flying ? 0 : b.tilt * 0.2, 'YXZ');
      P.compose(V.set(b.x, b.y, b.z), Q.setFromEuler(E), S.setScalar(SIZE));
      bodies.setMatrixAt(i, P);
      tails.setMatrixAt(i, P);
      // the head: bobbing forward and back as it walks, down to the ground when it pecks
      const hz = 0.105 + b.bob * 0.028 + b.head * 0.07,
        hy = 0.215 - b.head * 0.17;
      E.set(b.head * 1.1, b.tilt, 0, 'YXZ');
      M.compose(V.set(0, hy, hz), Q.setFromEuler(E), S.set(1, 1, 1));
      M.premultiply(P);
      heads.setMatrixAt(i, M);
      beaks.setMatrixAt(i, M);
      // the wings: folded along the back, or out and beating
      const beat = Math.sin(b.flap) * 0.9 * b.spread;
      for (const side of [1, -1]) {
        const fold = 1 - b.spread;
        E.set(fold * 0.15, fold * side * 1.25, side * (beat + b.spread * 0.15) + fold * side * -0.3, 'XYZ');
        M.compose(V.set(side * 0.045, 0.15, 0.03), Q.setFromEuler(E), S.set(1, 1, 1));
        M.premultiply(P);
        wings[side > 0 ? 0 : 1].setMatrixAt(i, M);
      }
    });
    for (const m of [bodies, heads, beaks, tails, ...wings]) m.visible = updateInstanceBounds(m);
  }
  write();

  return {
    update(dt, t, eric) {
      dt = Math.min(dt, 0.1);
      for (const b of birds) step(b, dt, eric);
      if (flockState === 'flying' && birds.every((b) => b.state === 'gone')) {
        flockState = 'away';
        awayFor = AWAY[0] + R() * (AWAY[1] - AWAY[0]);
      } else if (flockState === 'away') {
        awayFor -= dt;
        if (awayFor <= 0 && (!eric || Math.hypot(home[0] - eric.x, home[1] - eric.z) > BACK)) comeBack();
      } else if (flockState === 'landing' && birds.every((b) => b.state !== 'return')) flockState = 'ground';
      write();
    },
    state: () => ({ flock: flockState, birds: birds.map((b) => ({ state: b.state, x: b.x, y: b.y, z: b.z })) }),
    // for checks: skip the wait before they come back
    hurry() {
      awayFor = 0;
    },
  };
}
