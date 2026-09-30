// Hair styles for the base bodies, sculpted like the originals' hair.
//
// Jørgen on creator-base-7: "The hairs are kinda creepy looking rather than the cute artisan feel of [Mio] and eric."
// Mio's and Eric's hair is a few big, soft masses: a rounded volume well off the skull, a fringe of a few broad
// pointed locks, and big faceted clumps round the sides and back. So a style here is a shell (a low-poly dome that
// stands well off the head) plus a handful of broad clumps laid over it. A clump is wide and thick, runs over the
// shell in few long segments (big facets, like the originals), may hang below the head, and ends in a point; its
// cross-section is a ridge, so flat shading gives it a light and a dark side. Tails are chunky faceted cones, buns
// big faceted balls. Fringe clumps stop above the eyes (from the base's eye box); hanging clumps keep clear of the
// body. Everything rides the Head bone. Colours are vertex colours: the main colour, a darker underside, and an
// optional second colour on the inner locks and tips (like Mio's teal).
//
//   const g = hairGeometry(base.d, 'twintails', { main: '#1f2a44', accent: '#1fb5c0' });
import * as THREE from 'three';
import { BONES } from '../recipe.js';

const HEAD = BONES.indexOf('Head');
const R = Math.PI / 180;
const lerp = (a, b, t) => a + (b - a) * t;
const range = (a, b, n) => Array.from({ length: n }, (_, i) => (n === 1 ? (a + b) / 2 : lerp(a, b, i / (n - 1))));
// a steady wobble per clump, so neighbours differ a little (no randomness: the same style every time)
const jitter = (i, k = 1) => Math.sin(i * 12.9898 * k + 78.233) * 0.5;

// ---------- styles ----------
// Angles in degrees: t from the crown (0) down, p round the head (0 = the face, + towards the character's left).
// A clump: t0,p0 root; t1,p1 where it leaves the head (or its tip if it doesn't hang); w half width; lift off the
// shell; hang: length below the head; flare: how far a hanging clump leans out; curl: tip turned in (+) or out (-);
// out: a spike standing off the head this far; accent: in the second colour; fringe: stops above the eyes.
// the fringe: a few broad locks fanning out a little, in uneven lengths (the middle one a bit longer)
const FRINGE_SHORT = [0.03, 0.0, 0.018, 0.006, 0.026, 0.012];
const fringe = (n, spread, w, opts = {}) => range(-spread, spread, n).map((p, i) => ({
  t0: 10, p0: p * 0.35 + (opts.sweep || 0) * 0.4, t1: 200, p1: p * 1.12 + (opts.sweep || 0) + jitter(i) * 4, w: w * (1 + jitter(i, 2) * 0.18),
  lift: 0.014, fringe: true, short: FRINGE_SHORT[(i + (opts.shift || 0)) % FRINGE_SHORT.length] + (opts.short || 0),
}));
const sides = (ps, t1, hang, w, extra = {}) => ps.map((p) => ({ t0: 34, p0: p * 0.8, t1, p1: p, w, lift: 0.014, hang, flare: 0.012, curl: 0.01, ...extra }));
const back = (ps, t1, hang, w, extra = {}) => ps.map((p, i) => ({ t0: 22, p0: p, t1: t1 + jitter(i) * 6, p1: p + jitter(i, 3) * 6, w: w * (1 + jitter(i, 2) * 0.15),
  lift: 0.014, hang: hang * (1 + jitter(i) * 0.2), flare: 0.012, ...extra }));
const crown = (n, t1, w, turn = 30) => range(0, 360 - 360 / n, n).map((p, i) => ({ t0: 3, p0: p, t1: t1 + jitter(i) * 6, p1: p + turn, w, lift: 0.012 }));

export const HAIR = {
  short: {
    label: 'Messy short', cap: [58, 100, 138], volume: 0.034,
    clumps: () => [
      ...crown(5, 62, 0.08),
      ...back(range(125, 235, 4), 136, 0, 0.075, { curl: -0.022 }),
      ...sides([-84, 84], 116, 0, 0.06, { curl: -0.01 }),
      ...sides([-112, 112], 124, 0, 0.065, { curl: -0.018 }),
      ...fringe(4, 44, 0.07, { sweep: 10 }),
    ],
  },
  spiky: {
    label: 'Spiky', cap: [56, 100, 138], volume: 0.03,
    clumps: () => [
      ...range(40, 320, 8).map((p, i) => ({ t0: 30 + (i % 2) * 22, p0: p, w: 0.08, out: 0.08 + (i % 3) * 0.02, lean: 0.55 + jitter(i, 3) * 0.4 })),
      ...[-24, 24].map((p) => ({ t0: 14, p0: p, w: 0.085, out: 0.09, lean: 0.9 })),
      ...back(range(130, 230, 3), 134, 0, 0.075, { curl: -0.03 }),
      ...sides([-86, 86], 114, 0, 0.058, { curl: -0.022 }),
      ...fringe(4, 46, 0.072, { sweep: -8, shift: 1 }),
    ],
  },
  long: {
    label: 'Long straight', cap: [56, 104, 138], volume: 0.032,
    clumps: () => [
      ...crown(5, 64, 0.08),
      ...back(range(122, 238, 5), 130, 0.3, 0.08, { flare: 0.02, taper: 0.55 }),
      ...back(range(140, 220, 2), 126, 0.26, 0.065, { lift: 0.004, accent: true, taper: 0.55 }),
      ...sides([-70, 70], 106, 0.18, 0.05, { accent: true, taper: 0.5 }),
      ...sides([-96, 96], 112, 0.24, 0.065, { taper: 0.55 }),
      ...fringe(5, 52, 0.06),
    ],
  },
  bob: {
    label: 'Bob', cap: [58, 104, 138], volume: 0.036,
    clumps: () => [
      ...crown(6, 66, 0.078),
      ...back(range(115, 245, 5), 132, 0.05, 0.08, { curl: 0.03, flare: 0.024 }),
      ...sides([-74, 74], 108, 0.07, 0.056, { curl: 0.03, flare: 0.02 }),
      ...sides([-98, 98], 112, 0.075, 0.064, { curl: 0.03, flare: 0.024 }),
      ...fringe(5, 52, 0.06),
    ],
  },
  twintails: {
    label: 'Twin tails', cap: [58, 102, 138], volume: 0.032,
    clumps: () => [
      ...crown(6, 64, 0.078),
      ...back(range(125, 235, 4), 134, 0, 0.075, { curl: 0.02 }),
      ...sides([-72, 72], 106, 0.12, 0.05, { accent: true }),
      ...fringe(5, 50, 0.06, { shift: 2 }),
    ],
    tails: [{ t: 52, p: 106 }, { t: 52, p: -106 }], tailHang: 0.4, tailWidth: 0.058,
  },
  ponytail: {
    label: 'High ponytail', cap: [58, 102, 138], volume: 0.028,
    clumps: () => [
      ...crown(6, 66, 0.078, 0),
      ...back(range(125, 235, 4), 128, 0, 0.075, { curl: 0.015 }),
      ...sides([-74, 74], 106, 0.13, 0.048, { accent: true }),
      ...fringe(4, 46, 0.068, { sweep: 14, shift: 3 }),
    ],
    tails: [{ t: 66, p: 180 }], tailHang: 0.42, tailWidth: 0.064,
  },
  buns: {
    label: 'Buns', cap: [58, 102, 138], volume: 0.032,
    clumps: () => [
      ...crown(6, 64, 0.078),
      ...back(range(125, 235, 4), 134, 0, 0.075, { curl: 0.02 }),
      ...sides([-72, 72], 106, 0.1, 0.05, { accent: true }),
      ...fringe(5, 50, 0.06, { shift: 2 }),
    ],
    buns: [{ t: 32, p: 70 }, { t: 32, p: -70 }], bunSize: 0.108,
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

// points along a path, evenly by length, n of them (few, so a clump has big facets like the originals)
function resample(pts, n) {
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const L = len[len.length - 1];
  if (L < 1e-6) return [pts[0]];
  return range(0, L, n).map((s) => {
    let i = 1; while (i < len.length - 1 && len[i] < s) i++;
    const f = (s - len[i - 1]) / Math.max(1e-9, len[i] - len[i - 1]);
    return pts[i - 1].clone().lerp(pts[i], Math.min(1, Math.max(0, f)));
  });
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
  const surfCache = new Map();
  const surf = (t, p) => {
    const key = Math.round(t * 2) + ',' + Math.round(p * 2);
    if (!surfCache.has(key)) surfCache.set(key, farthest(C, dir(t, p), head));
    return surfCache.get(key);
  };
  // the shell: the skull plus the style's volume, a little fuller over the crown and back, like the originals
  // (a rounded crown and a fuller back, so the hair has the originals' soft volume over the skull)
  const shellR = (t, p) => surf(t, p) + S.volume * (1 + 0.45 * Math.cos(Math.min(t, 90) * R) + 0.3 * Math.sin(Math.min(t, 90) * R) * (Math.cos(p * R) < 0 ? 1 : 0.3));
  const onShell = (t, p, lift) => C.clone().addScaledVector(dir(t, p), shellR(t, p) + lift);
  // the eyes: fringe clumps stop above them
  const eyeTop = d.face.eye.c[1] + d.face.eye.h[1] * 1.15;
  // the body round a height: hanging clumps stay this far out from the spine
  const axis = new THREE.Vector3(C.x, 0, C.z - 0.02);
  const bodyReach = (p) => {
    const o = new THREE.Vector3(axis.x, p.y, axis.z), h = new THREE.Vector3(p.x - o.x, 0, p.z - o.z);
    if (h.lengthSq() < 1e-8 || p.y > box.min.y + 0.02) return 0;
    return farthest(o, h.normalize(), body);
  };
  const clear = (q, margin) => {
    const reach = bodyReach(q), r = Math.hypot(q.x - axis.x, q.z - axis.z);
    if (reach && r < reach + margin) { const h = new THREE.Vector3(q.x - axis.x, 0, q.z - axis.z).normalize(); q.x = axis.x + h.x * (reach + margin); q.z = axis.z + h.z * (reach + margin); }
    return q;
  };
  const { out, tri, quad } = builder();

  // the shell: a low-poly dome over the scalp down to the hairline, in the hair's own colour
  const [front, side, backLine] = S.cap, nLon = 14, nLat = 5;
  const hairline = (p) => {
    const a = Math.abs(Math.atan2(Math.sin(p * R), Math.cos(p * R))) / R;
    return a < 40 ? front : a < 110 ? lerp(front, side, Math.min(1, (a - 40) / 40)) : lerp(side, backLine, (a - 110) / 70);
  };
  const grid = range(0, 360 - 360 / nLon, nLon).map((p) => range(0, hairline(p), nLat + 1).map((t) => onShell(t, p, 0)));
  for (let i = 0; i < nLon; i++) for (let j = 0; j < nLat; j++) {
    const A = grid[i], B2 = grid[(i + 1) % nLon], tone = shade(main, lerp(0.95, 0.8, j / nLat));
    if (j === 0) tri(A[0], A[1], B2[1], tone);
    else quad(A[j], A[j + 1], B2[j + 1], B2[j], tone);
  }

  // one clump from a path: a thick ridge, widest a third of the way, narrowing to a point
  const clumpFrom = (path, w, { accent: inner = false, flat = 0.5, taper = 0.3, segments = 4, hug = true } = {}) => {
    const pts = resample(path, segments + 1), n = pts.length;
    if (n < 2) return;
    const sections = pts.map((p, i) => {
      const u = i / (n - 1);
      const T = pts[Math.min(n - 1, i + 1)].clone().sub(pts[Math.max(0, i - 1)]).normalize();
      const onHead = p.y > box.min.y + 0.03;
      const radial = onHead ? p.clone().sub(C) : new THREE.Vector3(p.x - C.x, 0, p.z - C.z);
      const N0 = radial.normalize(), Sd = new THREE.Vector3().crossVectors(T, N0).normalize(), N = new THREE.Vector3().crossVectors(Sd, T).normalize();
      const width = w * (u < 0.3 ? lerp(0.85, 1, u / 0.3) : u < taper ? 1 : Math.pow((1 - u) / (1 - taper), 0.9));
      // the edges bend in round the head, so a broad clump lies on the shell instead of standing off it
      const bend = hug && onHead ? width * width / (2 * p.distanceTo(C)) : 0;
      return {
        L: p.clone().addScaledVector(Sd, -width).addScaledVector(N, -bend), Rr: p.clone().addScaledVector(Sd, width).addScaledVector(N, -bend),
        top: p.clone().addScaledVector(N, width * flat), low: p.clone().addScaledVector(N, -width * 0.3 - bend), u,
      };
    });
    // the root sinks into the shell so it grows out of it
    for (let i = 0; i + 1 < n; i++) {
      const a = sections[i], b = sections[i + 1], u = (a.u + b.u) / 2;
      const tone = lerp(0.94, 1.05, Math.min(1, u * 1.5));
      const topColour = inner && accent && u > 0.4 ? shade(accent, tone) : shade(main, tone);
      const under = accent && (inner || u > 0.75) ? shade(accent, 0.72) : shade(main, 0.72);
      quad(a.L, a.top, b.top, b.L, topColour);
      quad(a.top, a.Rr, b.Rr, b.top, topColour);
      quad(a.Rr, a.low, b.low, b.Rr, under);
      quad(a.low, a.L, b.L, b.low, under);
    }
    const r0 = sections[0];   // close the root
    tri(r0.L, r0.low, r0.top, shade(main, 0.8)); tri(r0.top, r0.low, r0.Rr, shade(main, 0.8));
  };

  const clump = (K) => {
    if (K.out) {   // a spike: a broad clump that lies on the shell, then sweeps off it, back and out (lean > 0: up)
      const n = dir(K.t0 + 14, K.p0), along = dir(K.t0 + 40, K.p0).sub(dir(K.t0, K.p0)).normalize();
      const root = onShell(K.t0, K.p0, -0.01), mid = onShell(K.t0 + 14, K.p0, 0.012);
      const tip = mid.clone().addScaledVector(along, K.out * 0.45).addScaledVector(n, K.out * 0.8).add(new THREE.Vector3(0, K.lean * K.out * 0.6, 0));
      return clumpFrom([root, mid, mid.clone().lerp(tip, 0.5).addScaledVector(n, K.out * 0.08), tip], K.w, { accent: K.accent, flat: 0.55, taper: 0.35, segments: 3 });
    }
    // over the head: from the root down to t1 (fringe clumps stop above the eyes)
    const pts = [], steps = 16;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps, t = lerp(K.t0, Math.min(K.t1, 150), u), p = lerp(K.p0, K.p1, u);
      const q = onShell(t, p, (K.lift || 0) * Math.sin(Math.PI * Math.min(1, 0.15 + u)) - (i === 0 ? 0.01 : 0));
      if (K.fringe) {
        const limit = eyeTop + (K.short || 0);
        if (q.y < limit && q.z > 0) {   // stop at the line above the eyes, with the tip
          const prev = pts[pts.length - 1];
          if (prev) pts.push(prev.clone().lerp(q, Math.min(1, (prev.y - limit) / Math.max(1e-5, prev.y - q.y))));
          break;
        }
      }
      if (!K.fringe && t > 60 && q.y < box.min.y + 0.035) { pts.push(q); break; }   // leaves the head at the jaw
      pts.push(q);
    }
    if (K.hang) {   // straight down from where it left the head, leaning out a little, clear of the body, tip curled
      const start = pts[pts.length - 1], outDir = new THREE.Vector3(start.x - C.x, 0, start.z - C.z).normalize();
      for (let i = 1; i <= 6; i++) {
        const u = i / 6, q = start.clone();
        q.y -= K.hang * u;
        q.addScaledVector(outDir, (K.flare || 0) * Math.sin(u * Math.PI / 2) - (K.curl || 0) * u * u * u);
        pts.push(clear(q, 0.02));
      }
    } else if (K.curl) {   // a short clump's tip flicks in or out
      const last = pts[pts.length - 1], prev = pts[pts.length - 2];
      pts.push(last.clone().add(last.clone().sub(prev).normalize().multiplyScalar(0.03)).addScaledVector(new THREE.Vector3(last.x - C.x, 0, last.z - C.z).normalize(), -K.curl));
    }
    const long = K.hang > 0.1;
    clumpFrom(pts, K.w, { accent: K.accent, taper: K.taper || (long ? 0.5 : 0.3), segments: long ? 5 : K.fringe ? 3 : 4 });
  };
  for (const K of S.clumps()) clump(K);

  // tails: a band where they're tied and a chunky faceted cone hanging from it, with a smaller clump beside it
  for (const T of S.tails || []) {
    const n = dir(T.t, T.p), tie = onShell(T.t, T.p, 0), outH = new THREE.Vector3(n.x, 0, n.z).normalize();
    const band = colours.band ? new THREE.Color(colours.band) : shade(main, 0.35);
    const ring = range(0, 300, 6).map((a) => {
      const q = new THREE.Quaternion().setFromAxisAngle(n, a * R), sideV = new THREE.Vector3(0, 1, 0).projectOnPlane(n).normalize().applyQuaternion(q);
      return [tie.clone().addScaledVector(sideV, 0.03), tie.clone().addScaledVector(sideV, 0.03).addScaledVector(n, 0.026)];
    });
    for (let k = 0; k < 6; k++) quad(ring[k][0], ring[k][1], ring[(k + 1) % 6][1], ring[(k + 1) % 6][0], band);
    const tail = (offset, hang, width, inner) => {
      const start = tie.clone().addScaledVector(n, 0.03).add(offset);
      const path = range(0, 1, 7).map((u) => {
        const q = start.clone().addScaledVector(outH, 0.075 * Math.sin(u * Math.PI * 0.75) + offset.length() * u);
        q.y -= hang * (0.25 * u + 0.75 * u * u);
        return clear(q, width * 0.9 + 0.01);
      });
      conePath(path, width, inner);
    };
    tail(new THREE.Vector3(), S.tailHang, S.tailWidth, false);
    tail(new THREE.Vector3().crossVectors(outH, new THREE.Vector3(0, 1, 0)).multiplyScalar(0.022).addScaledVector(outH, 0.012), S.tailHang * 0.78, S.tailWidth * 0.62, true);
  }

  // a chunky cone along a path: six-sided rings, bulging just below the tie and narrowing to a point
  function conePath(path, width, inner) {
    const pts = resample(path, 6), n = pts.length, sidesN = 6;
    const profile = [0.62, 1, 0.95, 0.78, 0.5, 0];
    const rings = pts.map((p, i) => {
      const T = pts[Math.min(n - 1, i + 1)].clone().sub(pts[Math.max(0, i - 1)]).normalize();
      const a = new THREE.Vector3(0, 0, 1).projectOnPlane(T).normalize(), b = new THREE.Vector3().crossVectors(T, a);
      return range(0, 360 - 360 / sidesN, sidesN).map((deg, k) => p.clone().addScaledVector(a, Math.cos((deg + i * 12) * R) * width * profile[i] * (1 + (k % 2) * 0.1)).addScaledVector(b, Math.sin((deg + i * 12) * R) * width * profile[i] * 0.85));
    });
    for (let i = 0; i + 1 < n; i++) for (let k = 0; k < sidesN; k++) {
      const u = (i + 0.5) / (n - 1), tone = lerp(0.9, 1.05, (Math.sin(k * 1.7) + 1) / 2);
      const colour = accent && (inner ? u > 0.35 : u > 0.72) ? shade(accent, tone) : shade(main, tone);
      quad(rings[i][k], rings[i + 1][k], rings[i + 1][(k + 1) % sidesN], rings[i][(k + 1) % sidesN], colour);
    }
  }

  // buns: a big faceted ball of hair on the head, like Mio's
  for (const Bn of S.buns || []) {
    const r = S.bunSize, centre = onShell(Bn.t, Bn.p, r * 0.55);
    const ico = new THREE.IcosahedronGeometry(r, 1), p = ico.attributes.position;
    const bump = (q) => 1 + 0.06 * Math.sin(q.x * 91 + q.y * 57 + q.z * 33);
    const v = (i) => { const q = new THREE.Vector3().fromBufferAttribute(p, i); return q.multiply(new THREE.Vector3(1, 0.92, 1)).multiplyScalar(bump(q)).add(centre); };   // the same corner gets the same bump on every face, so no cracks
    for (let i = 0; i < p.count; i += 3) {
      const a = v(i), b = v(i + 1), c = v(i + 2), up = a.clone().add(b).add(c).divideScalar(3).sub(centre).normalize().y;
      tri(a, b, c, shade(main, lerp(0.8, 1.02, (up + 1) / 2)));
    }
    ico.dispose();
  }
  return out;
}
