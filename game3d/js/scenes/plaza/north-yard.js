// The canteen's service side for the back lane (plaza/north-lane.js, plan plaza/north-plan.js): the loading yard at
// the lane's west end against the canteen's west face, and the apron along its back. Backdrop, nothing walkable.
//   the yard: mid-grey slabs inside a soldier course, kerbed, a clipped hedge round its lawn sides and a cherry at
//   the corner; the roller shutter in the canteen's west face with roll cages of crates beside it, a pallet stack,
//   a platform cart, a slatted bin store with the sorted bins; a walk leaves its north edge for m6's door
//   the apron: the kitchen door under a hood with a lamp, high kitchen windows, an extract duct up to a cowl over
//   the roof, two condensers, a linear drain along the lane; the upper floor's windows, some lit after work
// The cameras look north, so the canteen's back face itself is seen only on the island map's slant; what stands on
// the ground is what counts.
import * as THREE from 'three';
import { GRANITE } from '../outdoor/paving.js';
import { LANE_BORDER as BW } from '../outdoor/lane.js';
import { kerb, kerbRect } from '../outdoor/edges.js';
import { sakura, keyaki, maple, ginkgo, hedge, bed, cluster } from '../outdoor/planting.js';
import { lamps, bins, STEEL } from '../outdoor/furniture.js';
import { BLOCK } from '../outdoor/block.js';
import { TOWN } from '../town.js';
import { tree, walk } from './east-lane.js';
import * as N from './north-plan.js';

const { BACK, APRON, YARD, M6_WALK, CANTEEN } = N;
const edge = (pv, rect, module) => pv.field(rect, { pattern: 'grid', module, tones: GRANITE.edge, h: 0.007 });
const CRATES = ['#5f7d8f', '#6e8468'];

// the yard's and the apron's paving, and m6's walk
export function yardGround(pv) {
  const [x0, x1, z0, z1] = YARD,
    origin = [x0, z0];
  pv.field([x0 + BW, x1 - BW, z0 + BW, z1 - BW], { pattern: 'grid', module: [0.9, 0.9], tones: GRANITE.mid, origin });
  edge(pv, [x0, x0 + BW, z0, z1], [BW, 0.15]);
  edge(pv, [x0 + BW, x1, z1 - BW, z1], [0.15, BW]);
  edge(pv, [x0 + BW, x1, z0, z0 + BW], [0.15, BW]); // across m6's walk too: its threshold
  edge(pv, [x1 - BW, x1, z0 + BW, z1 - BW], [BW, 0.15]); // along the lane's mouth and the canteen's wall
  pv.field([APRON[0], APRON[1], APRON[2], APRON[3]], {
    pattern: 'grid',
    module: [0.6, 0.6],
    tones: GRANITE.mid,
    origin,
  });
  walk(pv, M6_WALK, false);
}

// a crate cage on its wheels: k crates stacked, mesh sides
function cage(q, x, z, k) {
  q.box(STEEL.pale, 0.62, 0.05, 0.62, x, 0.08, z);
  for (let i = 0; i < k; i++) q.box(CRATES[i % 2], 0.56, 0.3, 0.56, x, 0.14 + i * 0.32, z);
  for (const dx of [-0.3, 0.3]) q.box(STEEL.pale, 0.03, 1.15, 0.6, x + dx, 0.08, z, { cast: false });
}
// a platform cart: a flat deck on four small wheels, a U handle standing up at one end, turned by ry
function trolley(q, x, z, ry) {
  const g = (color, w, h, d, dx, y, dz) =>
    q.geo(
      color,
      new THREE.BoxGeometry(w, h, d)
        .translate(dx, y + h / 2, dz)
        .rotateY(ry)
        .translate(x, 0, z),
      {
        cast: false,
      },
    );
  g('#5f7d8f', 0.6, 0.05, 0.9, 0, 0.1, 0);
  for (const sx of [-0.24, 0.24]) for (const sz of [-0.36, 0.36]) g(STEEL.dark, 0.04, 0.1, 0.1, sx, 0, sz);
  for (const sx of [-0.27, 0.27]) g(STEEL.pale, 0.035, 0.85, 0.035, sx, 0.15, -0.43);
  g(STEEL.pale, 0.58, 0.035, 0.035, 0, 0.98, -0.43);
}

export function buildYard(q, { glass, lit }, lights, shade) {
  const [x0, x1, z0, z1] = YARD;
  // kerbs on the lawn sides, open for m6's walk; a hedge round them outside; a cherry at the corner
  kerb(q, [x0, z0], [x0, z1], { off: 0.08 });
  kerb(q, [x0, z1], [x1, z1], { off: -0.08 });
  kerb(q, [x0, z0], [x1, z0], { off: 0.08, gaps: [[M6_WALK[0], M6_WALK[1]]] });
  for (const [x, o] of [
    [M6_WALK[0], -0.08],
    [M6_WALK[1], 0.08],
  ])
    kerb(q, [x, M6_WALK[2]], [x, z0], { off: o });
  hedge(q, [x0 - 0.45, z0 + 0.2], [x0 - 0.45, z1 + 0.45], { w: 0.5, h: 0.75, seed: 34 });
  hedge(q, [x0 - 0.2, z1 + 0.45], [x1 - 0.3, z1 + 0.45], { w: 0.5, h: 0.75, seed: 38 });
  // and on the lawn west of it, toward office_e1 and m6: a cherry at the corner, a group of three on a kerbed bed
  tree(q, sakura, x0 - 2.2, z1 + 1.6, 1.0, 35);
  shade.tree(x0 - 2.2, z1 + 1.6, 1.0);
  const g = [x0 - 5.2, x0 - 1.6, z0 + 1.0, z0 + 4.2];
  kerbRect(q, g);
  bed(q, [g[0] + 0.1, g[1] - 0.1, g[2] + 0.1, g[3] - 0.1], { y: 0.06 });
  for (const [kind, dx, dz, s, seed] of [
    [keyaki, 1.0, 1.0, 1.1, 36],
    [maple, 2.6, 2.3, 0.9, 37],
    [ginkgo, 2.9, 0.7, 0.95, 38],
  ]) {
    kind(q, g[0] + dx, g[2] + dz, s, seed);
    shade.tree(g[0] + dx, g[2] + dz, s);
  }
  cluster(q, g[0] + 0.7, g[3] - 0.6, { n: 3, r: 0.32, seed: 39 });
  // the roller shutter in the canteen's west face: a steel frame, slats, a hood box, a pale lip
  const W = CANTEEN[0],
    [s0, s1] = [z1 - 4.2, z1 - 1.0],
    sm = (s0 + s1) / 2,
    sw = s1 - s0;
  q.box(STEEL.dark, 0.08, 2.5, sw + 0.24, W - 0.04, 0, sm);
  q.box('#a4a9ae', 0.06, 2.3, sw, W - 0.08, 0, sm);
  for (let y = 0.2; y < 2.3; y += 0.18) q.box('#8e949a', 0.03, 0.025, sw, W - 0.11, y, sm, { cast: false });
  q.box(STEEL.mid, 0.3, 0.32, sw + 0.3, W - 0.15, 2.32, sm);
  q.box(BLOCK.plinth, 0.5, 0.04, sw + 0.4, W - 0.25, 0, sm, { cast: false });
  // a bracket light on the wall over it, its pool on the yard
  q.box(STEEL.dark, 0.06, 0.4, 0.1, W - 0.03, 2.5, sm);
  q.box(STEEL.dark, 0.7, 0.06, 0.06, W - 0.35, 2.68, sm); // its arm
  q.box(STEEL.pale, 0.45, 0.14, 0.55, W - 0.6, 2.82, sm);
  lights.glowParts.push(new THREE.BoxGeometry(0.38, 0.06, 0.48).translate(W - 0.6, 2.77, sm));
  lights.lit.push([W - 1.4, sm, 2.0]);
  // waiting for the morning's delivery: three cages of crates along the wall, a pallet stack, a platform cart
  cage(q, W - 0.8, s0 - 1.0, 3);
  cage(q, W - 0.8, s0 - 1.75, 2);
  cage(q, W - 1.55, s0 - 1.0, 3);
  // the loading box painted on the slabs in front of the shutter: a yellow outline with bars across it
  const PAINT = '#c9ad45',
    [bx0, bx1, bz0, bz1] = [W - 3.0, W - 0.4, s0 + 0.1, s1 - 0.1];
  for (const [w, d, x, z] of [
    [bx1 - bx0, 0.08, (bx0 + bx1) / 2, bz0],
    [bx1 - bx0, 0.08, (bx0 + bx1) / 2, bz1],
    [0.08, bz1 - bz0, bx0, (bz0 + bz1) / 2],
  ])
    q.box(PAINT, w, 0.012, d, x, 0.0, z, { cast: false });
  for (let z = bz0 + 0.45; z < bz1 - 0.2; z += 0.6)
    q.box(PAINT, bx1 - bx0 - 0.5, 0.012, 0.12, (bx0 + bx1) / 2 - 0.25, 0.0, z, { cast: false });
  // empty crates stacked by the south hedge, back from the morning's round
  for (const [dx, k] of [
    [2.2, 4],
    [2.85, 3],
    [2.5, 2],
  ])
    for (let i = 0; i < k; i++)
      q.box(CRATES[(i + k) % 2], 0.56, 0.3, 0.56, x0 + dx, i * 0.31, z1 - 0.55 - (k === 2 ? 0.62 : 0), { cast: false });
  for (let i = 0; i < 4; i++) q.box(i % 2 ? '#9a9c9c' : '#8e9191', 1.1, 0.13, 1.1, x0 + 1.2, i * 0.14, z1 - 1.2);
  q.box('#b9bec4', 1.0, 0.5, 1.0, x0 + 1.2, 0.56, z1 - 1.2, { cast: false }); // shrink-wrapped boxes on top
  trolley(q, x0 + 4.4, z0 + 1.5, 0.4);
  // the bin store on the yard's west side: two big bins behind a slatted screen, the sorted pair by it
  const bz = (z0 + z1) / 2 - 0.6;
  // wheeled bins: a body, a lid lapping over it with a handle bar, two wheels at the back
  for (const [dz, body, lid] of [
    [-0.45, '#5d7896', '#4a6079'],
    [0.45, '#6e8468', '#58694f'],
  ]) {
    const z = bz + dz;
    q.box(body, 0.66, 0.92, 0.7, x0 + 0.75, 0.06, z);
    q.box(lid, 0.74, 0.06, 0.78, x0 + 0.77, 0.98, z);
    q.box(STEEL.dark, 0.05, 0.05, 0.6, x0 + 0.38, 0.9, z, { cast: false });
    for (const w of [-0.25, 0.25]) q.box(STEEL.dark, 0.14, 0.14, 0.06, x0 + 0.42, 0, z + w, { cast: false });
  }
  for (const s of [-1, 1]) q.box('#8f8a82', 1.0, 1.2, 0.05, x0 + 0.85, 0, bz + s * 1.0);
  for (let i = 0; i < 8; i++) q.box('#8f8a82', 0.04, 1.2, 0.08, x0 + 1.35, 0, bz - 0.85 + i * 0.243, { cast: false });
  bins(q, x0 + 0.55, bz + 1.6, Math.PI / 2);

  // the apron along the canteen's back (its north face)
  const [cx0, cx1, zb] = [CANTEEN[0], CANTEEN[1], CANTEEN[2]],
    fh = 2.1,
    H = fh * 2;
  const n = (o) => zb - o; // a depth out from the wall
  // the kitchen door: steel, under a hood, a plate beside it, a lamp over it, a cart parked by it
  const dx = cx0 + 4.6;
  q.box(STEEL.dark, 1.2, 2.15, 0.08, dx, 0, n(0.04));
  q.box('#7d848c', 1.0, 2.0, 0.05, dx, 0.05, n(0.09));
  q.box(STEEL.pale, 0.05, 0.05, 0.12, dx + 0.32, 1.0, n(0.15), { cast: false }); // the handle
  q.box(BLOCK.canopy, 1.7, 0.08, 0.8, dx, 2.3, n(0.4));
  q.box(BLOCK.plate, 0.3, 0.22, 0.03, dx + 0.85, 1.3, n(0.02), { cast: false });
  lamps(lights, q, [[dx, n(0.6)]], { kind: 'lantern', y: 2.38, pool: 1.2 });
  q.box(BLOCK.plinth, 1.6, 0.1, 0.5, dx, 0, n(0.25), { cast: false }); // the step
  trolley(q, dx - 1.3, n(0.45), Math.PI + 0.3);
  // the kitchen's high windows, lit after work, and an extract duct up the wall to a cowl over the roof
  for (let i = 0; i < 4; i++) {
    const x = cx0 + 6.8 + i * 1.6;
    q.box(STEEL.pale, 1.2, 0.7, 0.05, x, 1.3, n(0.025));
    glass.box(BLOCK.glassLow, 1.06, 0.56, 0.04, x, 1.37, n(0.04));
    lit.box(BLOCK.lit, 1.06, 0.56, 0.02, x, 1.37, n(0.065), { cast: false });
  }
  // (it bends over the parapet and runs on over the roof to the cowl, so from the south it reads as roof plant)
  const ux = cx0 + 14.2;
  q.box('#a9aeb3', 0.6, H + 0.45 - 0.9, 0.5, ux, 0.9, n(0.35));
  q.box('#a9aeb3', 0.6, 0.5, 0.3, ux, 0.9, n(0.12));
  q.box('#a9aeb3', 0.6, 0.5, 2.1, ux, H + 0.45, n(-0.6));
  q.box('#a9aeb3', 0.6, 0.5, 0.6, ux, H + 0.6, n(-1.35));
  q.box('#9aa0a6', 0.9, 0.12, 0.9, ux, H + 1.1, n(-1.35));
  for (const y of [1.6, 2.8]) q.box(STEEL.dark, 0.7, 0.06, 0.55, ux, y, n(0.3), { cast: false });
  // two condensers on the apron at the east end
  for (const x of [cx1 - 2.4, cx1 - 1.3]) {
    q.box('#b4b8bb', 0.85, 0.62, 0.32, x, 0.06, n(0.3));
    q.geo(
      '#5b616b',
      new THREE.CylinderGeometry(0.22, 0.22, 0.02, 12).rotateX(Math.PI / 2).translate(x, 0.37, n(0.47)),
      {
        cast: false,
      },
    );
  }
  // a linear drain where the apron meets the lane: a dark channel under a steel grate
  q.box('#3c4046', cx1 - cx0, 0.012, 0.16, (cx0 + cx1) / 2, 0.004, APRON[2] + 0.1, { cast: false });
  for (let x = cx0 + 0.1; x < cx1; x += 0.25)
    q.box('#5b616b', 0.04, 0.016, 0.14, x, 0.004, APRON[2] + 0.1, { cast: false });
  // upstairs: a window in every bay but over the duct, some lit after work
  const bays = Math.round((cx1 - cx0) / 2.3),
    bw = (cx1 - cx0) / bays;
  for (let i = 0; i < bays; i++) {
    const x = cx0 + bw * (i + 0.5);
    if (Math.abs(x - ux) < 0.9) continue;
    glass.box(BLOCK.glass, bw - 0.6, 0.95, 0.04, x, fh + 0.5, n(0.02));
    q.box(TOWN.band, bw - 0.5, 0.07, 0.14, x, fh + 0.43, n(0.06), { cast: false });
    if (i % 3 !== 1) lit.box(BLOCK.lit, bw - 0.6, 0.95, 0.02, x, fh + 0.5, n(0.045), { cast: false });
  }
  // manhole covers down the lane's middle
  const mz = (BACK[2] + BACK[3]) / 2;
  for (const x of [BACK[0] + 6, BACK[0] + 21, BACK[0] + 36])
    q.geo('#5a5e64', new THREE.CylinderGeometry(0.34, 0.34, 0.02, 16).translate(x, 0.01, mz), { cast: false });
}
