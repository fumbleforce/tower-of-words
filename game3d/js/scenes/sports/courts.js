// The sports ground's fences and the tennis courts (docs/game/island.md, "Sports and baths"), in the island frame,
// shared by the two chunks that show them: the east coast (east-coast/walk.js, the onsen path along the courts'
// east side) and the sports chunk (scenes/sports.js, the courts walk along their south side).
//   meshFence(p, a, b, { h, gaps })   a steel fence from a to b (axis-aligned): posts about every 2, a top and a
//                                     middle rail, a dark see-through mesh; gaps [from, to] along it left open
//   courts(p, signs)                  the two hard courts, their lines and nets, the fence round them and the gate
//                                     in its south side, standing open, with テニスコート on a board by its walk,
//                                     facing west along the courts walk (signs: a shop-signs.js signSet); by the west
//                                     court's net the players' bench, the ball basket and the score display
//                                     (court-plan.js: the west court is walked)
import * as THREE from 'three';
import { STEEL, bench } from '../outdoor/furniture.js';
import { COURTS, L, W, CXS, CZ, GATE_X, BENCH, BENCH_LEN, BASKET, DISPLAY } from './court-plan.js';

export const COURTS_GATE = { x: GATE_X, w: 1.4 }; // between its posts, in the south fence
const MESH = '#3a4148';

// the segments of lo..hi left after cutting the gaps out
const spans = (lo, hi, gaps) => {
  const out = [];
  let v = lo;
  for (const [g0, g1] of [...gaps].sort((a, b) => a[0] - b[0])) {
    if (g0 - v > 0.05) out.push([v, g0]);
    v = Math.max(v, g1);
  }
  if (hi - v > 0.05) out.push([v, hi]);
  return out;
};

export function meshFence(p, a, b, { h = 2.4, gaps = [] } = {}) {
  const alongX = a[1] === b[1],
    [lo, hi] = alongX ? [Math.min(a[0], b[0]), Math.max(a[0], b[0])] : [Math.min(a[1], b[1]), Math.max(a[1], b[1])];
  const at = (v) => (alongX ? [v, a[1]] : [a[0], v]);
  for (const [s0, s1] of spans(lo, hi, gaps)) {
    const len = s1 - s0,
      n = Math.max(1, Math.round(len / 2));
    for (let i = 0; i <= n; i++) {
      const [px, pz] = at(s0 + (len * i) / n);
      p.box(STEEL.mid, 0.07, h, 0.07, px, 0, pz);
    }
    const [mx, mz] = at((s0 + s1) / 2);
    for (const y of [h - 0.05, 1.2]) p.box(STEEL.mid, alongX ? len : 0.05, 0.05, alongX ? 0.05 : len, mx, y, mz);
    const mesh = new THREE.PlaneGeometry(len, h - 0.1);
    if (!alongX) mesh.rotateY(Math.PI / 2);
    p.geo(MESH, mesh.translate(mx, h / 2, mz), {
      alpha: new Array(4).fill(0.32),
      opts: { transparent: true, depthWrite: false, side: THREE.DoubleSide },
    });
  }
}

// a gate in a mesh fence along x, standing open: two leaves of mesh in steel frames, each swung in on its hinge at
// its gatepost to lie along z, into the court; the chain hanging loose off one post
function gate(p, x, z, w, h) {
  const lw = w / 2;
  for (const s of [-1, 1]) {
    const hx = x + s * (w / 2 - 0.02), // the hinge, just inside its post
      cz = z - lw / 2;
    p.box(STEEL.dark, 0.05, 0.05, lw - 0.04, hx, h - 0.25, cz);
    p.box(STEEL.dark, 0.05, 0.05, lw - 0.04, hx, 0.06, cz);
    p.box(STEEL.dark, 0.05, h - 0.25, 0.05, hx, 0.06, z - 0.04);
    p.box(STEEL.dark, 0.05, h - 0.25, 0.05, hx, 0.06, z - lw + 0.04);
    p.geo(
      MESH,
      new THREE.PlaneGeometry(lw - 0.1, h - 0.4).rotateY(Math.PI / 2).translate(hx, (h - 0.2) / 2 + 0.03, cz),
      {
        alpha: new Array(4).fill(0.32),
        opts: { transparent: true, depthWrite: false, side: THREE.DoubleSide },
      },
    );
  }
  for (const s of [-1, 1]) p.box(STEEL.dark, 0.09, h + 0.1, 0.09, x + (s * w) / 2 + s * 0.05, 0, z); // the gateposts
  p.box('#8a8f96', 0.04, 0.5, 0.04, x - w / 2 - 0.08, 0.6, z + 0.05); // the chain, hanging off the west post
  p.box('#8a8f96', 0.1, 0.12, 0.06, x - w / 2 - 0.08, 0.5, z + 0.07); // its lock
}

// by the west court's net, along the west fence: the players' bench facing the court; the ball basket, a wire
// basket of yellow balls on legs with a handle; the score display on its post facing the court, two digit windows
// and a row of buttons under them
function courtside(p) {
  bench(p, BENCH[0], BENCH[1], Math.PI / 2, { len: BENCH_LEN });
  const [bx, bz] = BASKET;
  for (const [dx, dz] of [
    [-0.2, -0.2],
    [0.2, -0.2],
    [-0.2, 0.2],
    [0.2, 0.2],
  ])
    p.box(STEEL.mid, 0.025, 0.55, 0.025, bx + dx, 0, bz + dz, { cast: false });
  p.box(STEEL.dark, 0.44, 0.3, 0.44, bx, 0.55, bz);
  p.box('#3a3f46', 0.4, 0.02, 0.4, bx, 0.84, bz, { cast: false });
  for (let i = 0; i < 9; i++)
    p.geo(
      '#d9e04a',
      new THREE.IcosahedronGeometry(0.05, 0).translate(
        bx - 0.12 + (i % 3) * 0.12,
        0.88,
        bz - 0.12 + Math.floor(i / 3) * 0.12,
      ),
      { cast: false },
    );
  p.box(STEEL.mid, 0.03, 0.4, 0.03, bx, 0.85, bz - 0.22);
  p.box(STEEL.mid, 0.03, 0.4, 0.03, bx, 0.85, bz + 0.22);
  p.box(STEEL.mid, 0.03, 0.03, 0.47, bx, 1.24, bz);
  const [dx, dz] = DISPLAY;
  p.box(STEEL.dark, 0.08, 1.0, 0.08, dx, 0, dz);
  p.box('#2b3a40', 0.12, 0.42, 0.7, dx, 1.0, dz);
  for (const s of [-1, 1]) {
    p.box('#f2f2ee', 0.02, 0.2, 0.24, dx + 0.065, 1.16, dz + s * 0.16, { cast: false });
    p.box('#2f3640', 0.022, 0.14, 0.06, dx + 0.068, 1.19, dz + s * 0.16 - 0.04, { cast: false });
    p.box('#2f3640', 0.022, 0.14, 0.06, dx + 0.068, 1.19, dz + s * 0.16 + 0.05, { cast: false });
  }
  for (let i = 0; i < 4; i++)
    p.box(i < 2 ? '#c9473f' : '#3e7bb8', 0.03, 0.05, 0.08, dx + 0.07, 1.04, dz - 0.21 + i * 0.14, { cast: false });
}

export function courts(p, signs) {
  const [x0, x1, z0, z1] = COURTS,
    cz = CZ;
  p.box('#5f7d74', x1 - x0, 0.03, z1 - z0, (x0 + x1) / 2, 0, cz);
  for (const cx of CXS) {
    p.box('#3f6a78', W + 0.4, 0.035, L + 0.4, cx, 0, cz);
    const line = (w, d, x, z) => p.box('#e6e8e4', w, 0.04, d, x, 0, z);
    for (const s of [-1, 1]) {
      line(W, 0.06, cx, cz + (s * L) / 2); // base lines
      line(0.06, L, cx + (s * W) / 2, cz); // doubles side lines
      line(0.06, L, cx + s * W * 0.375, cz); // singles side lines
      line(W * 0.75, 0.06, cx, cz + s * 4.2); // service lines
    }
    line(0.06, 8.4, cx, cz); // the centre service line
    // the net: a post at each side, a dark band and its white top
    for (const s of [-1, 1]) p.box(STEEL.dark, 0.08, 0.72, 0.08, cx + s * (W / 2 + 0.3), 0, cz);
    p.box('#2c3136', W + 0.6, 0.5, 0.02, cx, 0.12, cz);
    p.box('#e6e8e4', W + 0.6, 0.05, 0.04, cx, 0.62, cz);
  }
  // the fence, the gate in its south side on the gate walk's axis
  const H = 2.4,
    g = COURTS_GATE;
  meshFence(p, [x0, z0], [x1, z0], { h: H });
  meshFence(p, [x0, z1], [x1, z1], { h: H, gaps: [[g.x - g.w / 2 - 0.1, g.x + g.w / 2 + 0.1]] });
  meshFence(p, [x0, z0], [x0, z1], { h: H });
  meshFence(p, [x1, z0], [x1, z1], { h: H });
  gate(p, g.x, z1, g.w, 2.0);
  courtside(p);
  // the name on a board on two posts just east of the gate's walk, facing west along the courts walk
  const sx = g.x + 1.3,
    sz = z1 + 1.0;
  p.box('#2b3a40', 0.04, 0.48, 1.74, sx + 0.03, 1.21, sz);
  for (const s of [-1, 1]) p.box(STEEL.dark, 0.06, 1.2, 0.06, sx + 0.06, 0, sz + s * 0.8);
  signs.board('テニスコート', 'TENNIS COURTS', '#2f5d57', 1.7, 0.44, [sx, 1.45, sz], -Math.PI / 2);
}
