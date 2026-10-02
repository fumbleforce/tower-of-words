// Where the ambient crowd stands and sits (crowd/index.js): the place's benches (scenes/outdoor/furniture.js bench()
// records each one's seat), open paving for pairs talking, and a line at a shut door. All of it off the walking
// lines, away from the story's things and from where Eric comes in, so a scene keeps its room.
import * as THREE from 'three';
import { clearAt } from './paths.js';
import { standPose, benchSit } from './motion.js';

const SEAT_TOP = 0.34; // a bench's slats (scenes/outdoor/furniture.js)

// distance from (x, z) to the segment a-b
function segDist(x, z, [ax, az], [bx, bz]) {
  const dx = bx - ax,
    dz = bz - az,
    L = dx * dx + dz * dz || 1e-6,
    t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L));
  return Math.hypot(x - (ax + dx * t), z - (az + dz * t));
}
const lineDist = (x, z, line) => {
  let d = 1e9;
  for (let i = 1; i < line.length; i++) d = Math.min(d, segDist(x, z, line[i - 1], line[i]));
  return d;
};

export function stillSpots(game, place, g, data, ends, lines) {
  const K = place.charScale || 1,
    local = (v) => place.space.worldToLocal(v);
  // what must stay clear: the things the story uses, the spots it names, where Eric comes in, the ends
  const keep = [];
  const V = new THREE.Vector3();
  for (const [id, t] of Object.entries(place.things || {})) {
    if (id === 'mio' || !t || !t.anchor) continue;
    try {
      const a = local(t.anchor(V.set(0, 0, 0)));
      keep.push([a.x, a.z]);
      const s = t.spot?.();
      if (s) keep.push(s);
    } catch {
      // a thing whose anchor needs the place entered: its spot is enough
    }
  }
  for (const s of Object.values(place.spots || {})) if (Array.isArray(s) && typeof s[0] === 'number') keep.push(s);
  const start = place.start || [0, 0];
  const paths = [...lines, ...keep.map((k) => [start, k])];
  const far = (x, z, r) => keep.every(([kx, kz]) => Math.hypot(kx - x, kz - z) >= r);
  const farEnds = (x, z, r) => Object.values(ends).every((e) => Math.hypot(e.at[0] - x, e.at[1] - z) >= r);
  const offLines = (x, z, r) => paths.every((l) => lineDist(x, z, l) >= r);

  // the benches, two seats each (one on a short one)
  const seats = [];
  const M = new THREE.Matrix4();
  place.space.updateMatrixWorld(true);
  const toSpace = new THREE.Matrix4().copy(place.space.matrixWorld).invert();
  place.space.traverse((o) => {
    for (const b of o.userData.seats || []) {
      M.multiplyMatrices(toSpace, o.matrixWorld);
      const c = Math.cos(b.facing),
        s = Math.sin(b.facing);
      const us = b.len >= 1.3 ? [-b.len * 0.22, b.len * 0.22] : [0];
      for (const u of us) {
        const p = new THREE.Vector3(b.x + u * c - 0.02 * s, SEAT_TOP, b.z - u * s - 0.02 * c).applyMatrix4(M);
        const f = new THREE.Vector3(b.x + u * c + s, SEAT_TOP, b.z - u * s + c).applyMatrix4(M);
        const yaw = Math.atan2(f.x - p.x, f.z - p.z);
        // a bench out where nobody walks (behind a hedge, on the backdrop) has no free floor in front of it
        const reach = [0.55, 0.9, 1.3, 1.8].some(
          (d) => clearAt(g, p.x + Math.sin(yaw) * d * K, p.z + Math.cos(yaw) * d * K) >= 0.15,
        );
        if (!reach) continue;
        if (!far(p.x, p.z, 3 * K) || !farEnds(p.x, p.z, 2.5 * K)) continue;
        if (Math.hypot(p.x - start[0], p.z - start[1]) < 3.5 * K) continue;
        seats.push({ x: p.x, z: p.z, yaw, y: p.y });
      }
    }
  });

  // open paving for two people talking: wide, off every walking line, away from the story's things
  const chats = [];
  const need = Math.max(0, ...Object.values(data.periods).map((p) => p.chat || 0));
  // the best spots first; where a place has no wide paving, narrower ones just off the lines
  for (const [wide, keepOff, gap] of [
    [1.1, 1.35, 3.5],
    [0.75, 1.0, 2.6],
  ]) {
    if (chats.length >= need) break;
    for (let x = g.x0 + 1; x < place.nav.x1 - 1; x += 1.3)
      for (let z = g.z0 + 1; z < place.nav.z1 - 1; z += 1.3) {
        if (clearAt(g, x, z) < wide * K) continue;
        if (!far(x, z, gap * K) || !farEnds(x, z, 4 * K) || !offLines(x, z, keepOff * K)) continue;
        if (Math.hypot(x - start[0], z - start[1]) < 4 * K) continue;
        if (chats.some((c) => Math.hypot(c.x - x, c.z - z) < 3)) continue;
        chats.push({ x, z, a: ((x * 7.1 + z * 3.3) % 3.14) + 0.2 });
      }
  }

  // a line at a shut door, along the shopfront (not out across the street)
  const queues = {};
  for (const sp of Object.values(data.periods))
    if (sp.queue && !queues[sp.queue[0]]) {
      const t = place.things[sp.queue[0]],
        s = t && t.spot?.();
      if (!s) continue;
      const a = local(t.anchor(V.set(0, 0, 0)));
      let dx = s[0] - a.x,
        dz = s[1] - a.z;
      const l = Math.hypot(dx, dz) || 1;
      dx /= l;
      dz /= l;
      const side =
        clearAt(g, s[0] - dz * 1.5, s[1] + dx * 1.5) >= clearAt(g, s[0] + dz * 1.5, s[1] - dx * 1.5) ? 1 : -1;
      const line = [];
      for (let i = 0; i < 5; i++) {
        const x = s[0] - dz * side * i * 0.62 * K,
          z = s[1] + dx * side * i * 0.62 * K;
        if (clearAt(g, x, z) < 0.3) break;
        line.push({ x, z, face: [a.x, a.z] });
      }
      queues[sp.queue[0]] = line;
    }
  return { seats, chats, queues };
}

function shuffle(list, R) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(R() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// put the period's sitters, talkers and queue in place. fresh: on entering (anywhere); otherwise only out of view
export function placeStill(pool, spots, counts, spec, R, { fresh, inView }) {
  const taken = (x, z) =>
    pool.some((b) => b.state !== 'off' && Math.hypot(b.r.root.position.x - x, b.r.root.position.z - z) < 0.5);
  const ok = (x, z) => !taken(x, z) && (fresh || !inView(x, z));
  const body = () => {
    const f = pool.filter((b) => b.state === 'off');
    return f.find((b) => b.kind !== 'sport' && R() < 0.7) || f.find((b) => b.kind !== 'sport') || f[0];
  };
  const still = (b, mode, extra = {}) => {
    Object.assign(b, {
      state: 'still',
      mode,
      t: 0,
      ph: R() * 10,
      phone: false,
      talker: false,
      ...extra,
    });
    b.r._walk = false;
    b.r.root.visible = true;
  };
  for (const s of shuffle(spots.seats, R).slice(0, counts.sit * 2)) {
    if (pool.filter((b) => b.mode === 'sit' && b.state === 'still').length >= counts.sit) break;
    if (!ok(s.x, s.z)) continue;
    const b = body();
    if (!b) return;
    benchSit(b.r, s.x, s.z, s.yaw, s.y);
    still(b, 'sit', { phone: R() < 0.4 });
  }
  let pairs = 0;
  for (const c of shuffle(spots.chats, R)) {
    if (pairs >= counts.chat) break;
    if (!ok(c.x, c.z)) continue;
    const a = body();
    if (!a) return;
    a.state = 'still';
    const b = body();
    if (!b) {
      a.state = 'off';
      return;
    }
    const K = a.r.root.scale.x / 1.15,
      d = 0.33 * K;
    const ax = Math.sin(c.a) * d,
      az = Math.cos(c.a) * d;
    for (const [p, sgn, talker] of [
      [a, 1, true],
      [b, -1, false],
    ]) {
      standPose(p.r);
      p.r.root.position.set(c.x + ax * sgn, 0, c.z + az * sgn);
      p.r.root.rotation.y = Math.atan2(-ax * sgn, -az * sgn);
      still(p, 'chat', { talker });
    }
    pairs++;
  }
  const q = spec.queue && spots.queues[spec.queue[0]];
  if (q)
    for (const s of q.slice(0, counts.queue)) {
      if (!ok(s.x, s.z)) continue;
      const b = body();
      if (!b) return;
      standPose(b.r);
      b.r.root.position.set(s.x, 0, s.z);
      b.r.root.rotation.y = Math.atan2(s.face[0] - s.x, s.face[1] - s.z);
      still(b, 'queue', { phone: R() < 0.5 });
    }
}
