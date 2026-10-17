// The ground-floor flats' gardens of the dorm quarter's blocks (the plan is dorm-quarter/plan.js GARDENS), in the
// island frame: a clipped hedge round each run (the villas' a low wall), a low timber fence between flats, a gate onto
// the lawn, and by each flat's door a patio of pale slabs with a chair or pots on it, or washing on a line on the lawn.
import * as THREE from 'three';
import { hedge, mound, LEAF } from '../outdoor/planting.js';
import { STEEL } from '../outdoor/furniture.js';
import { lowWall } from '../outdoor/edges.js';
import { hash2 } from '../outdoor/parts.js';

const PATIO = ['#c9c4ba', '#bdb8ae'];
// a garden chair, its back away from the way it faces
function chair(p, x, z, ry) {
  const c = Math.cos(ry),
    s = Math.sin(ry);
  const put = (w, h, d, u, y, v) =>
    p.box('#e4e1d8', w, h, d, x + u * c + v * s, y, z - u * s + v * c, { ry, cast: false });
  put(0.4, 0.04, 0.38, 0, 0.3, 0);
  put(0.4, 0.34, 0.04, 0, 0.32, -0.19);
  for (const u of [-0.17, 0.17]) for (const v of [-0.16, 0.16]) put(0.03, 0.3, 0.03, u, 0, v);
}
// a washing line on two T-posts from a to b, a few things pegged out on it
function washing(p, a, b, seed) {
  for (const [x, z] of [a, b]) {
    p.box(STEEL.pale, 0.04, 1.05, 0.04, x, 0, z, { cast: false });
    p.box(
      STEEL.pale,
      Math.abs(b[0] - a[0]) > 0.01 ? 0.04 : 0.5,
      0.03,
      Math.abs(b[0] - a[0]) > 0.01 ? 0.5 : 0.04,
      x,
      1.03,
      z,
      {
        cast: false,
      },
    );
  }
  const alongX = Math.abs(b[0] - a[0]) > 0.01,
    L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  for (const o of [-0.18, 0.18]) {
    const [ox, oz] = alongX ? [0, o] : [o, 0];
    p.box(STEEL.pale, alongX ? L : 0.01, 0.01, alongX ? 0.01 : L, (a[0] + b[0]) / 2 + ox, 1.0, (a[1] + b[1]) / 2 + oz, {
      cast: false,
    });
  }
  const CLOTH = ['#d9dcd8', '#8fa2b4', '#c56f5b', '#e8d9a8', '#7f9c8a'];
  for (let n = 0; n < 4; n++) {
    const t = 0.18 + n * 0.21,
      o = n % 2 ? 0.18 : -0.18,
      h = 0.28 + hash2(n, seed, 3) * 0.2,
      wd = 0.18 + hash2(seed, n, 5) * 0.14;
    const x = a[0] + (b[0] - a[0]) * t + (alongX ? 0 : o),
      z = a[1] + (b[1] - a[1]) * t + (alongX ? o : 0);
    p.box(CLOTH[(seed + n) % 5], alongX ? wd : 0.015, h, alongX ? 0.015 : wd, x, 1.0 - h, z, { cast: false });
  }
}

// a low timber fence from a to b: posts about every 0.6, two rails
function fence(p, a, b) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]),
    alongX = Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]),
    n = Math.max(1, Math.round(L / 0.6));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    p.box('#7a654f', 0.07, 0.6, 0.07, a[0] + (b[0] - a[0]) * t, 0, a[1] + (b[1] - a[1]) * t, { surf: 'wood' });
  }
  for (const y of [0.22, 0.5])
    p.box('#9a846c', alongX ? L : 0.04, 0.06, alongX ? 0.04 : L, (a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2, {
      surf: 'wood',
    });
}

// a run of ground-floor gardens: a hedge round its outer sides, low fences between flats, a gap for a gate in each
// flat's outer hedge; a few things in them
export function gardens(p, { rect, open, walled }, far, seed) {
  const [x0, x1, z0, z1] = rect;
  const alongX = open === 's' || open === 'n';
  const L = alongX ? x1 - x0 : z1 - z0,
    flats = Math.max(1, Math.round(L / 2.4)),
    fw = L / flats;
  const at = (t, o) => (alongX ? [x0 + t, open === 's' ? z1 - o : z0 + o] : [open === 'e' ? x1 - o : x0 + o, z0 + t]);
  const H = walled ? null : { w: 0.4, h: 0.62 };
  // the outer side, a gate gap in each flat's
  for (let i = 0; i < flats; i++) {
    const t0 = fw * i,
      t1 = fw * (i + 1),
      g = (t0 + t1) / 2;
    for (const [a, b] of [
      [t0 + 0.05, g - 0.35],
      [g + 0.35, t1 - 0.05],
    ]) {
      if (walled) lowWall(p, at(a, 0.12), at(b, 0.12), { h: 0.75, w: 0.22 });
      else hedge(p, at(a, 0.2), at(b, 0.2), { ...H, seed: seed + i * 2 });
    }
    // between flats, a low timber fence (or the wall) back to the building
    if (i) {
      const depth = alongX ? z1 - z0 : x1 - x0;
      if (walled) lowWall(p, at(t0, 0.25), at(t0, depth - 0.05), { h: 0.75, w: 0.18 });
      else fence(p, at(t0, 0.4), at(t0, depth - 0.1));
    }
    if (far) continue;
    // a patio of pale slabs outside each flat's door, a chair or a pot on it, or the washing out on the lawn
    const depth = alongX ? z1 - z0 : x1 - x0,
      pw = fw - 0.5,
      [px, pz] = at(g, depth - 0.55);
    p.box(PATIO[i % 2], alongX ? pw : 1.0, 0.03, alongX ? 1.0 : pw, px, 0, pz, { cast: false });
    const k = hash2(i, seed, 7);
    const face = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 }[open];
    if (k < 0.35) {
      const [cx, cz] = at(g - 0.45, depth - 0.6);
      chair(p, cx, cz, face + 0.3);
      const [tx, tz] = at(g + 0.2, depth - 0.6);
      p.geo('#9a6f55', new THREE.CylinderGeometry(0.15, 0.11, 0.28, 8).translate(tx, 0.17, tz), { cast: false });
      mound(p, tx, tz, 0.18, LEAF.fresh, { y: 0.32 });
    } else if (k < 0.65) {
      for (const [dt, r] of [
        [-0.5, 0.18],
        [0.45, 0.14],
      ]) {
        const [cx, cz] = at(g + dt, depth - 0.45);
        p.geo('#9a6f55', new THREE.CylinderGeometry(r, r * 0.75, r * 1.8, 8).translate(cx, r * 0.9, cz), {
          cast: false,
        });
        mound(p, cx, cz, r * 1.25, [LEAF.fresh, LEAF.mid][(i + Math.round(dt)) % 2], { y: r * 1.8 });
      }
    } else washing(p, at(g - 0.6, depth * 0.45), at(g + 0.6, depth * 0.45), i);
  }
  // the outer side's end returns to the building, so the run is closed
  const depth = alongX ? z1 - z0 : x1 - x0;
  for (const t of [0.02, L - 0.02]) {
    if (walled) lowWall(p, at(t, 0.12), at(t, depth - 0.05), { h: 0.75, w: 0.22 });
    else hedge(p, at(t, 0.2), at(t, depth - 0.1), { ...H, seed: seed + 50 });
  }
}
