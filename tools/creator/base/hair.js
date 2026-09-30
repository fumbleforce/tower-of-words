// Hair styles for the base bodies, built from locks (creator-base-6: "Hair and clothes need more character, like
// the original ones, and fit the anime theme. New ones are too plain, simple.").
//
// A style is a scalp cap shrink-wrapped round the base's head plus many locks laid over it, like the originals'
// faceted clumps: each lock starts at a root on the head, runs over the head's surface, may hang below it, and
// ends in a point. Its cross-section is a low ridge (two faces on top, two below), so flat shading gives every lock a
// light and a dark side. Fringe locks stop above the eyes (measured from the base's eye box). Hanging locks keep
// clear of the shoulders and chest. Everything rides the Head bone. Colours are baked into vertex colours: the main
// colour, a darker underside, and an optional second colour on the inner locks and tips (like Mio's teal).
//
//   const g = hairGeometry(base.d, 'twintails', { main: '#1f2a44', accent: '#1fb5c0' });
import * as THREE from 'three';
import { BONES } from '../recipe.js';

const HEAD = BONES.indexOf('Head');
const R = Math.PI / 180;
const lerp = (a, b, t) => a + (b - a) * t;
const range = (a, b, n) => Array.from({ length: n }, (_, i) => (n === 1 ? (a + b) / 2 : lerp(a, b, i / (n - 1))));

// ---------- styles ----------
// Angles in degrees: t from the crown (0) down, p round the head (0 = the face, + towards the character's left).
// A lock: t0,p0 root; t1,p1 where it leaves the head (or its tip if it doesn't hang); w half width; lift off the
// head; hang: length below the head; flare: how far a hanging lock leans out; curl: tip turned in (+) or out (-);
// out: a spike standing off the head this far; accent: an inner lock in the second colour; fringe: stops above the eyes.
// a steady wobble per lock, so neighbours differ in length and lift (no randomness: the same style every time)
const jitter = (i, k = 1) => Math.sin(i * 12.9898 * k + 78.233) * 0.5;
const fringe = (n, spread, len, w, opts = {}) => range(-spread, spread, n).map((p, i) => ({
  t0: 12, p0: p * 0.5 + (opts.sweep || 0) * 0.5, t1: 200, p1: p + (opts.sweep || 0) + jitter(i) * 6, w: w * (1 + jitter(i, 2) * 0.3), lift: 0.016, fringe: true,
  short: i % 2 ? len * 0.35 : 0, between: Math.abs(p) < spread / (n - 1) * 0.6,
}));
const sides = (ps, t1, hang, w, extra = {}) => ps.map((p, i) => ({ t0: 30, p0: p * 0.85, t1, p1: p, w, lift: 0.02, hang: hang * (1 + jitter(i) * 0.2), flare: 0.014, curl: 0.012, ...extra }));
const back = (ps, t1, hang, w, extra = {}) => ps.map((p, i) => ({ t0: 16, p0: p, t1: t1 + jitter(i) * 8, p1: p + jitter(i, 3) * 10, w: w * (1 + jitter(i, 2) * 0.25),
  lift: 0.024 * (1 + jitter(i, 5) * 0.6), hang: hang * (1 + jitter(i) * 0.3), flare: 0.012, ...extra }));
const crown = (n, t1, lift, w) => range(0, 360 - 360 / n, n).map((p, i) => ({ t0: 2, p0: p + 20, t1: t1 + jitter(i) * 10, p1: p + 36, w, lift: lift * (1 + jitter(i, 4) * 0.5) }));

export const HAIR = {
  short: {
    label: 'Messy short', cap: [64, 100, 140], volume: 0.026,
    locks: () => [
      ...crown(6, 50, 0.03, 0.07),
      ...back(range(115, 245, 6), 138, 0, 0.06, { curl: -0.02 }),
      ...sides([-80, -100, 80, 100], 112, 0, 0.045),
      ...fringe(6, 56, 0.018, 0.042, { sweep: 8 }),
      { t0: 6, p0: 14, w: 0.01, ahoge: 0.08 },
    ],
  },
  spiky: {
    label: 'Spiky', cap: [62, 100, 140], volume: 0.024,
    locks: () => [
      ...range(0, 330, 12).map((p, i) => ({ t0: 12 + (i % 3) * 16, p0: p + jitter(i) * 10, w: 0.05, out: 0.1 + (i % 2) * 0.04, lean: -0.2 + jitter(i, 3) * 0.4 })),
      ...back(range(120, 240, 5), 136, 0, 0.06, { curl: -0.03 }),
      ...sides([-82, 82], 110, 0, 0.045),
      ...fringe(5, 52, 0.018, 0.05, { sweep: -10 }),
    ],
  },
  long: {
    label: 'Long straight', cap: [60, 104, 140], volume: 0.024,
    locks: () => [
      ...crown(7, 58, 0.024, 0.07),
      ...back(range(108, 252, 8), 130, 0.3, 0.07),
      ...back(range(125, 235, 4), 126, 0.25, 0.06, { lift: 0.004, accent: true }),
      ...sides([-68, 68], 106, 0.2, 0.042, { accent: true }),
      ...sides([-88, 88], 110, 0.25, 0.05),
      ...fringe(7, 58, 0.018, 0.036),
      { t0: 5, p0: -10, w: 0.009, ahoge: 0.065 },
    ],
  },
  bob: {
    label: 'Bob', cap: [62, 104, 140], volume: 0.026,
    locks: () => [
      ...crown(7, 62, 0.026, 0.07),
      ...back(range(104, 256, 8), 132, 0.05, 0.065, { curl: 0.035, flare: 0.024 }),
      ...sides([-72, -90, 72, 90], 110, 0.07, 0.048, { curl: 0.035, flare: 0.022 }),
      ...fringe(7, 56, 0.018, 0.038),
    ],
  },
  twintails: {
    label: 'Twin tails', cap: [62, 102, 140], volume: 0.024,
    locks: () => [
      ...crown(7, 60, 0.022, 0.07),
      ...back(range(112, 248, 6), 134, 0, 0.06, { curl: 0.02 }),
      ...sides([-70, 70], 106, 0.13, 0.04, { accent: true }),
      ...fringe(6, 54, 0.018, 0.04),
    ],
    tails: [{ t: 50, p: 108 }, { t: 50, p: -108 }], tailHang: 0.46,
  },
  ponytail: {
    label: 'High ponytail', cap: [62, 102, 140], volume: 0.022,
    locks: () => [
      ...crown(7, 62, 0.02, 0.07),
      ...back(range(112, 248, 6), 132, 0, 0.06, { curl: 0.02, lift: 0.012 }),
      ...sides([-72, 72], 106, 0.15, 0.036, { accent: true }),
      ...fringe(6, 54, 0.018, 0.04, { sweep: 14 }),
      { t0: 6, p0: 0, w: 0.009, ahoge: 0.065 },
    ],
    tails: [{ t: 64, p: 180 }], tailHang: 0.46,
  },
  buns: {
    label: 'Buns', cap: [62, 102, 140], volume: 0.024,
    locks: () => [
      ...crown(7, 60, 0.022, 0.07),
      ...back(range(112, 248, 6), 134, 0, 0.06, { curl: 0.02 }),
      ...sides([-70, 70], 106, 0.11, 0.04, { accent: true }),
      ...fringe(6, 54, 0.018, 0.04),
    ],
    buns: [{ t: 34, p: 64 }, { t: 34, p: -64 }],
  },
};

// ---------- geometry helpers ----------

// farthest hit of a ray from `o` along `dir` against triangles (flat array of 9 per triangle)
export function farthest(o, dir, tris) {
  let best = 0;
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), h = new THREE.Vector3(), s = new THREE.Vector3(), q = new THREE.Vector3();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let t = 0; t < tris.length; t += 9) {
    a.fromArray(tris, t); b.fromArray(tris, t + 3); c.fromArray(tris, t + 6);
    e1.subVectors(b, a); e2.subVectors(c, a); h.crossVectors(dir, e2);
    const det = e1.dot(h);
    if (Math.abs(det) < 1e-12) continue;
    s.subVectors(o, a);
    const u = s.dot(h) / det; if (u < -1e-6 || u > 1 + 1e-6) continue;
    q.crossVectors(s, e1);
    const v = dir.dot(q) / det; if (v < -1e-6 || u + v > 1 + 1e-6) continue;
    const dist = e2.dot(q) / det;
    if (dist > best) best = dist;
  }
  return best;
}

// Base positions with separate ear pieces (Mio's) folded in towards where they join the head, so hair covers them.
export function tuckedEars(d, amount = 0.8) {
  const pos = Float32Array.from(d.pos);
  for (const sign of [-1, 1]) {
    const corners = [];
    for (let t = 0; t < d.T; t++) if (d.pieces[t] === 'ear' && Math.sign(d.pos[t * 9]) === sign) corners.push(t * 3, t * 3 + 1, t * 3 + 2);
    if (!corners.length) continue;
    const inner = [...corners].sort((a, b) => Math.abs(d.pos[a * 3]) - Math.abs(d.pos[b * 3])).slice(0, Math.max(3, corners.length / 5));
    const root = [0, 1, 2].map((a) => inner.reduce((sum, i) => sum + d.pos[i * 3 + a], 0) / inner.length);
    for (const i of corners) for (let a = 0; a < 3; a++) pos[i * 3 + a] = root[a] + (d.pos[i * 3 + a] - root[a]) * (1 - amount);
  }
  return pos;
}

// A mesh builder: triangles with one colour per triangle and Head-bone weights.
function builder() {
  const out = { pos: [], normal: [], si: [], sw: [], col: [] };
  const tri = (a, b, c, colour) => {
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
    for (const v of [a, b, c]) { out.pos.push(v.x, v.y, v.z); out.normal.push(n.x, n.y, n.z); out.si.push(HEAD, 0, 0, 0); out.sw.push(1, 0, 0, 0); out.col.push(colour.r, colour.g, colour.b); }
  };
  return { out, tri, quad: (a, b, c, e, colour) => { tri(a, b, c, colour); tri(a, c, e, colour); } };
}

// ---------- the style ----------

export function hairGeometry(d, id, colours = {}) {
  const S = HAIR[id];
  if (!S) throw new Error('No hair style ' + id);
  const main = new THREE.Color(colours.main || '#3a2a22'), accent = colours.accent ? new THREE.Color(colours.accent) : null;
  const shade = (c, f) => c.clone().multiplyScalar(f);
  const source = tuckedEars(d);
  const head = [], body = [];
  for (let t = 0; t < d.T; t++) {
    const list = d.pieces[t] === 'head' || d.pieces[t] === 'ear' ? head : d.pieces[t] === 'body' ? body : null;
    if (list) for (let k = 0; k < 9; k++) list.push(source[t * 9 + k]);
  }
  const box = new THREE.Box3().setFromArray(head);
  const C = box.getCenter(new THREE.Vector3());
  const dir = (t, p) => new THREE.Vector3(Math.sin(t * R) * Math.sin(p * R), Math.cos(t * R), Math.sin(t * R) * Math.cos(p * R));
  const surf = (t, p) => farthest(C, dir(t, p), head);
  const onHead = (t, p, lift) => C.clone().addScaledVector(dir(t, p), surf(t, p) + S.volume + lift);
  // the eyes: fringe locks stop above them
  const eyeTop = d.face.eye.c[1] + d.face.eye.h[1] * 1.05, eyeMid = d.face.eye.c[1] + d.face.eye.h[1] * 0.35;
  // the body round a height: hanging locks stay this far out from the spine
  const axis = new THREE.Vector3(C.x, 0, C.z - 0.02);
  const bodyReach = (p) => {
    const o = new THREE.Vector3(axis.x, p.y, axis.z), h = new THREE.Vector3(p.x - o.x, 0, p.z - o.z);
    if (h.lengthSq() < 1e-8 || p.y > box.min.y + 0.02) return 0;
    return farthest(o, h.normalize(), body);
  };
  const { out, tri, quad } = builder();

  // the cap: a shrink-wrapped shell over the scalp, a little darker, so gaps between locks read as depth
  const [front, side, backLine] = S.cap, nLon = 24, nLat = 8;
  const hairline = (p) => {
    const a = Math.abs(Math.atan2(Math.sin(p * R), Math.cos(p * R))) / R;
    return a < 40 ? front : a < 110 ? lerp(front, side, Math.min(1, (a - 40) / 40)) : lerp(side, backLine, (a - 110) / 70);
  };
  const capColour = shade(main, 0.78);
  const grid = range(0, 360 - 360 / nLon, nLon).map((p) => range(0, hairline(p), nLat + 1).map((t) => onHead(t, p, -0.004)));
  for (let i = 0; i < nLon; i++) for (let j = 0; j < nLat; j++) {
    const A = grid[i], B2 = grid[(i + 1) % nLon];
    if (j === 0) tri(A[0], A[1], B2[1], capColour);
    else quad(A[j], A[j + 1], B2[j + 1], B2[j], capColour);
  }

  // one lock from a path of points: a ridge that narrows to a point
  const lockFrom = (pts, w, { accent: inner = false, flat = 0.42, taper = 0.3 } = {}) => {
    const n = pts.length, len = [0];
    for (let i = 1; i < n; i++) len.push(len[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const L = len[n - 1] || 1;
    const sections = pts.map((p, i) => {
      const u = len[i] / L;
      const T = pts[Math.min(n - 1, i + 1)].clone().sub(pts[Math.max(0, i - 1)]).normalize();
      const radial = p.y > box.min.y + 0.03 ? p.clone().sub(C) : new THREE.Vector3(p.x - C.x, 0, p.z - C.z);
      const N0 = radial.normalize(), Sd = new THREE.Vector3().crossVectors(T, N0).normalize(), N = new THREE.Vector3().crossVectors(Sd, T).normalize();
      // full width from a third of the way, then narrowing to the point (long locks stay wide for longer)
      const width = w * (u < 0.3 ? lerp(0.8, 1, u / 0.3) : u < taper ? 1 : Math.pow((1 - u) / (1 - taper), 0.85));
      return { L: p.clone().addScaledVector(Sd, -width), Rr: p.clone().addScaledVector(Sd, width), top: p.clone().addScaledVector(N, width * flat), low: p.clone().addScaledVector(N, -width * 0.25), u };
    });
    for (let i = 0; i + 1 < n; i++) {
      const a = sections[i], b = sections[i + 1], u = (a.u + b.u) / 2;
      const tone = lerp(0.9, 1.06, Math.min(1, u * 1.6));
      const topColour = inner && accent && u > 0.45 ? shade(accent, tone) : shade(main, tone);
      const under = accent && (inner || u > 0.7) ? shade(accent, 0.7) : shade(main, 0.62);
      quad(a.L, a.top, b.top, b.L, topColour);
      quad(a.top, a.Rr, b.Rr, b.top, topColour);
      quad(a.Rr, a.low, b.low, b.Rr, under);
      quad(a.low, a.L, b.L, b.low, under);
    }
  };

  const lock = (K) => {
    if (K.ahoge) {   // a thin lock standing up off the crown, curling forward
      const root = onHead(K.t0, K.p0, 0.01), up = new THREE.Vector3(0, 1, 0), fwd = dir(90, K.p0).setY(0).normalize();
      const pts = range(0, 1, 6).map((u) => root.clone().addScaledVector(up, K.ahoge * Math.sin(u * 2.1)).addScaledVector(fwd, K.ahoge * 0.9 * (1 - Math.cos(u * 2.4))));
      return lockFrom(pts, K.w, { flat: 0.9 });
    }
    if (K.out) {   // a spike: from the scalp outwards, leaning down (lean < 0) or up
      const root = onHead(K.t0, K.p0, 0), n = dir(K.t0, K.p0), tip = root.clone().addScaledVector(n, K.out).add(new THREE.Vector3(0, K.lean * K.out * 0.5, 0));
      const mid = root.clone().lerp(tip, 0.5).addScaledVector(n, K.out * 0.08);
      return lockFrom([onHead(K.t0 - 6, K.p0, -0.006), root, mid, tip], K.w, { accent: K.accent, flat: 0.7 });
    }
    // over the head: from the root down to t1 (fringe locks stop above the eyes)
    const pts = [];
    const steps = 8;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps, t = lerp(K.t0, Math.min(K.t1, 150), u), p = lerp(K.p0, K.p1, u);
      const q = onHead(t, p, (K.lift || 0) * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, u * 1.2))));
      if (K.fringe) {
        const limit = (K.between ? eyeMid : eyeTop) + (K.short || 0);
        if (q.y < limit && q.z > 0) {   // stop at the line above the eyes, with the tip
          const prev = pts[pts.length - 1];
          if (prev) pts.push(prev.clone().lerp(q, Math.min(1, (prev.y - limit) / Math.max(1e-5, prev.y - q.y))));
          break;
        }
      }
      if (!K.fringe && t > 60 && q.y < box.min.y + 0.035) { pts.push(q); break; }   // leaves the head at the jaw
      pts.push(q);
    }
    // hanging: straight down from where it left the head, leaning out a little, clear of the body, tip curled
    if (K.hang) {
      const start = pts[pts.length - 1], outDir = new THREE.Vector3(start.x - C.x, 0, start.z - C.z).normalize(), n = 5;
      for (let i = 1; i <= n; i++) {
        const u = i / n, q = start.clone();
        q.y -= K.hang * u;
        q.addScaledVector(outDir, (K.flare || 0) * Math.sin(u * Math.PI / 2) - (K.curl || 0) * u * u * u);
        const reach = bodyReach(q), r = Math.hypot(q.x - axis.x, q.z - axis.z);
        if (reach && r < reach + 0.02) { const h = new THREE.Vector3(q.x - axis.x, 0, q.z - axis.z).normalize(); q.x = axis.x + h.x * (reach + 0.02); q.z = axis.z + h.z * (reach + 0.02); }
        pts.push(q);
      }
    } else if (K.curl) {   // a short lock's tip flicks in or out
      const last = pts[pts.length - 1], prev = pts[pts.length - 2];
      pts.push(last.clone().add(last.clone().sub(prev).multiplyScalar(0.6)).addScaledVector(new THREE.Vector3(last.x - C.x, 0, last.z - C.z).normalize(), -K.curl));
    }
    if (pts.length >= 2) lockFrom(pts, K.w, { accent: K.accent, taper: K.hang > 0.1 ? 0.65 : 0.3 });
  };
  for (const K of S.locks()) lock(K);

  // tails: a band where they're tied and a bundle of long locks hanging from it
  for (const T of S.tails || []) {
    const n = dir(T.t, T.p), tie = onHead(T.t, T.p, 0.01), outH = new THREE.Vector3(n.x, 0, n.z).normalize();
    const band = colours.band ? new THREE.Color(colours.band) : shade(main, 0.35);
    const ring = range(0, 300, 6).map((a) => {
      const q = new THREE.Quaternion().setFromAxisAngle(n, a * R), side = new THREE.Vector3(0, 1, 0).projectOnPlane(n).normalize().applyQuaternion(q);
      return [tie.clone().addScaledVector(side, 0.024), tie.clone().addScaledVector(side, 0.024).addScaledVector(n, 0.022)];
    });
    for (let k = 0; k < 6; k++) quad(ring[k][0], ring[k][1], ring[(k + 1) % 6][1], ring[(k + 1) % 6][0], band);
    const bundle = [[0, 0, 0.056, false], [0.026, -0.016, 0.044, true], [-0.026, -0.014, 0.044, false], [0.006, 0.026, 0.04, true]];
    for (const [dx, dz, w, inner] of bundle) {
      const side = new THREE.Vector3().crossVectors(outH, new THREE.Vector3(0, 1, 0));
      const start = tie.clone().addScaledVector(n, 0.03).addScaledVector(side, dx).addScaledVector(outH, dz);
      const pts = range(0, 1, 8).map((u) => {
        const q = start.clone().addScaledVector(outH, 0.06 * Math.sin(u * Math.PI * 0.7) + dz * u).addScaledVector(side, dx * u * 1.5);
        q.y -= S.tailHang * (0.9 + (inner ? -0.1 : 0)) * u * u * 0.65 + S.tailHang * 0.35 * u;
        const reach = bodyReach(q), r = Math.hypot(q.x - axis.x, q.z - axis.z);
        if (reach && r < reach + 0.025) { const h = new THREE.Vector3(q.x - axis.x, 0, q.z - axis.z).normalize(); q.x = axis.x + h.x * (reach + 0.025); q.z = axis.z + h.z * (reach + 0.025); }
        return q;
      });
      lockFrom(pts, w, { accent: inner, taper: 0.55 });
    }
  }

  // buns: a faceted ball of hair on the head with a few locks wrapped round it
  for (const Bn of S.buns || []) {
    const n = dir(Bn.t, Bn.p), centre = onHead(Bn.t, Bn.p, 0.08), r = 0.068;
    const ico = new THREE.IcosahedronGeometry(r, 1), p = ico.attributes.position;
    const v = (i) => new THREE.Vector3().fromBufferAttribute(p, i).multiplyScalar(1 + 0.08 * Math.sin(i * 12.9898)).add(centre);
    for (let i = 0; i < p.count; i += 3) tri(v(i), v(i + 1), v(i + 2), shade(main, 0.96));
    ico.dispose();
    for (let k = 0; k < 5; k++) {
      const a = k * 72 * R, axisA = n.clone(), side = new THREE.Vector3(0, 1, 0).projectOnPlane(axisA).normalize().applyAxisAngle(axisA, a);
      const pts = range(0, 1, 6).map((u) => centre.clone().addScaledVector(side, (r + 0.008) * Math.cos(u * 2)).addScaledVector(new THREE.Vector3().crossVectors(axisA, side), (r + 0.008) * Math.sin(u * 2)).addScaledVector(axisA, 0.02 * u));
      lockFrom(pts, 0.024, { accent: false, flat: 0.5 });
    }
  }
  return out;
}
