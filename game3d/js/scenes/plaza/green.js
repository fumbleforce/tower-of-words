// The fountain plaza's planting and edges (scenes/plaza.js), with the outdoor kit (scenes/outdoor/), from the plan
// (plaza/plan.js):
//   the ring bed round the circle's north half: a kerbed band of ground cover outside the dark border ring with a
//   clipped hedge at its back, and a ring of cherries at an even pitch (two maples at the terrace's ends)
//   the corner gardens either side of the plaza's open south edge, between the circle and the lane's turns: ground
//   cover with drifts of cosmos, grasses and shrub mounds under more of the ring's cherries, kept low so the plaza
//   stays open to the lane
//   the lane's verges: on the outside of the U a kerb, a bed of ground cover with a low hedge (opened for two bench
//   bays facing the plaza) and the zelkova avenue set back on the grass, as on the forecourt's lane
//   the terrace's edges: a seat-height wall along its south line, planted beds at its two ends
//   the lawns beyond: groups of mixed trees with shrubs on low mounds
import * as THREE from 'three';
import { rng } from '../outdoor/parts.js';
import { kerb, lowWall, KERB } from '../outdoor/edges.js';
import { arcBox } from '../outdoor/round.js';
import { keyaki, sakura, maple, ginkgo, pine, cluster, hedge, grass, bed, mound, LEAF } from '../outdoor/planting.js';
import * as P from './plan.js';

const { F, R, BAND, ARCS, LANE, AVENUE, BAYS, TERRACE, TERRACE_S, polar, rad } = P;
// cosmos, the autumn flower of every Japanese park: pink, white and a deep rose
const COSMOS = ['#d59aae', '#ece6e3', '#b86f8e', '#dcb3c6'];

// the tree ring: angles (radians) for the cherries, and the ones that stand behind the benches (plaza/furniture.js)
export const BENCH_ANGLES = [rad(191), rad(216), rad(316), rad(333)];
export const RING_LAMPS = [rad(203.5), rad(324.5)];
const TREE_ANGLES = [
  (ARCS.sw[0] + ARCS.sw[1]) / 2 + 0.03,
  rad(179),
  ...BENCH_ANGLES.slice(0, 2),
  rad(228),
  ...BENCH_ANGLES.slice(2),
  rad(8),
  rad(22),
  rad(35),
];

// cosmos: a low mound of leaves with small flowers dotted over its top
function cosmos(p, x, z, seed) {
  const q = rng(seed + 5);
  mound(p, x, z, 0.32, LEAF.fresh, { squash: 0.7 });
  for (let i = 0; i < 9; i++) {
    const a = q() * Math.PI * 2,
      d = q() * 0.26;
    const g = new THREE.IcosahedronGeometry(0.045, 0).translate(
      x + Math.cos(a) * d,
      0.26 + q() * 0.08,
      z + Math.sin(a) * d * 0.8,
    );
    p.geo(COSMOS[Math.floor(q() * COSMOS.length)], g, { cast: false });
  }
}

// the ring bed over one arc [a0, a1]: kerbs both sides and at the ends, soil, ground cover, a clipped hedge along
// its back
function ringArc(p, [a0, a1]) {
  const r0 = R,
    r1 = R + BAND;
  arcBox(p, LEAF.mulch, F, r0, r1, a0, a1, { y: -0.02, h: 0.07, surf: 'soil' });
  arcBox(p, LEAF.cover, F, r0 + 0.2, r1 - 0.2, a0 + 0.2 / r1, a1 - 0.2 / r1, { y: 0.03, h: 0.07, surf: null });
  arcBox(p, KERB.body, F, r0, r0 + 0.16, a0, a1, { y: -0.04, h: 0.16 });
  arcBox(p, KERB.top, F, r0 + 0.01, r0 + 0.15, a0, a1, { y: 0.12, h: 0.02 });
  arcBox(p, KERB.body, F, r1 - 0.16, r1, a0, a1, { y: -0.04, h: 0.16 });
  arcBox(p, KERB.top, F, r1 - 0.15, r1 - 0.01, a0, a1, { y: 0.12, h: 0.02 });
  for (const a of [a0, a1]) {
    const [x, z] = polar(a, (r0 + r1) / 2);
    p.box(KERB.body, BAND, 0.16, 0.16, x, -0.04, z, { ry: -a });
    p.box(KERB.top, BAND - 0.02, 0.02, 0.14, x, 0.12, z, { ry: -a });
  }
  const pad = 0.5 / r1;
  arcBox(p, LEAF.deep, F, r1 - 0.62, r1 - 0.2, a0 + pad, a1 - pad, { y: 0.05, h: 0.46, cast: true, surf: null });
  arcBox(p, LEAF.mid, F, r1 - 0.6, r1 - 0.22, a0 + pad, a1 - pad, { y: 0.51, h: 0.04, cast: false, surf: null });
}

function ring(p) {
  ringArc(p, ARCS.nw);
  ringArc(p, ARCS.ne);
  cornerGarden(p, -1, LANE.wl[1], LANE.w[3], LANE.s[2], 31);
  cornerGarden(p, 1, LANE.el[0], LANE.e[3], LANE.s[2], 37);
  const mid = R + BAND * 0.42;
  TREE_ANGLES.forEach((a, i) => {
    const [x, z] = polar(a, mid);
    // two maples at the terrace's ends for the autumn colour, cherries everywhere else
    if (i === 4 || i === 5) maple(p, x, z, 1.15, i + 3);
    else sakura(p, x, z, 0.95 + (i % 3) * 0.05, i + 11);
  });
}

// The corner gardens: the ground between the circle and the lane where it turns, one each side of the plaza's
// open south edge (side -1 west, 1 east), from the link's south edge z0 to the lane's north edge z1, and from the
// circle to the lane's inner edge xLane. Ground cover planted low (cosmos, grasses, shrub mounds) round the ring's
// cherries, with a kerb on the circle's edge and along the lane.
function cornerGarden(p, side, xLane, z0, z1, seed) {
  const rr = R + 0.1;
  const angle = (z) => {
    const a = Math.asin((z - F[1]) / rr);
    return side < 0 ? Math.PI - a : a;
  };
  const [a0, a1] = [angle(z1), angle(z0)];
  const arc = Array.from({ length: 25 }, (_, i) => polar(a0 + ((a1 - a0) * i) / 24, rr));
  const outline = [...arc, [xLane, z0], [xLane, z1]];
  const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)));
  const flat = (y) => new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(0, y, 0);
  p.geo(LEAF.cover, flat(0.05), { cast: false, surf: 'soil' });
  const inner = Math.min(a0, a1),
    outer = Math.max(a0, a1);
  arcBox(p, KERB.body, F, R, R + 0.16, inner, outer, { y: -0.04, h: 0.16 });
  arcBox(p, KERB.top, F, R + 0.01, R + 0.15, inner, outer, { y: 0.12, h: 0.02 });
  const xArc = (z) => polar(angle(z), rr)[0];
  kerb(p, [xLane, z0], [xLane, z1], { off: -side * 0.08 });
  kerb(p, [Math.min(xLane, xArc(z1)), z1], [Math.max(xLane, xArc(z1)), z1], { off: -0.08 });
  kerb(p, [Math.min(xLane, xArc(z0)), z0], [Math.max(xLane, xArc(z0)), z0], { off: 0.08 });
  // drifts of cosmos, grass tufts and shrub mounds, clear of the trees and the kerbs
  const q = rng(seed);
  const xs = [Math.min(xLane, xArc(z0), xArc(z1)), Math.max(xLane, xArc(z0), xArc(z1))];
  const trees = TREE_ANGLES.map((a) => polar(a, R + BAND * 0.42));
  let placed = 0;
  for (let k = 0; k < 200 && placed < 18; k++) {
    const x = xs[0] + q() * (xs[1] - xs[0]),
      z = z0 + q() * (z1 - z0);
    if (Math.hypot(x - F[0], z - F[1]) < R + 0.5 || Math.abs(x - xLane) < 0.45 || z < z0 + 0.45 || z > z1 - 0.45)
      continue;
    if (trees.some(([tx, tz]) => Math.hypot(tx - x, tz - z) < 0.9)) continue;
    const kind = placed % 5;
    if (kind === 4) grass(p, x, z, { seed: seed + k, h: 0.5 });
    else if (kind === 3) mound(p, x, z, 0.32, [LEAF.mid, LEAF.fresh, LEAF.deep][k % 3], { y: 0.05 });
    else cosmos(p, x, z, seed + k);
    placed++;
  }
}

// a verge along a straight lane edge from a to b ([x, z], axis-aligned), on `side` ('n', 's', 'e', 'w': away from
// the lane): a kerb on the lane's edge, a bed of ground cover 1.1 deep with a low hedge at its back and a kerb
// behind it, gaps in the kerb and hedge for bench bays ([from, to] along the edge), and the avenue's trees, each in
// a ring of mulch, 2.1 from the edge at the given positions along it
function verge(p, a, b, side, { bays = [], trees = [], seed = 1 } = {}) {
  const alongX = Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]);
  const sgn = side === 's' || side === 'e' ? 1 : -1;
  const at = (t, o) => (alongX ? [t, a[1] + sgn * o] : [a[0] + sgn * o, t]);
  const [t0, t1] = alongX ? [Math.min(a[0], b[0]), Math.max(a[0], b[0])] : [Math.min(a[1], b[1]), Math.max(a[1], b[1])];
  const line = (o) => [at(t0, o), at(t1, o)];
  kerb(p, ...line(0), { off: sgn * 0.08, gaps: bays });
  kerb(p, ...line(1.1), { off: -sgn * 0.08 });
  const cuts = [t0, ...bays.flat(), t1];
  for (let i = 0; i + 1 < cuts.length; i += 2) {
    const [s0, s1] = [cuts[i], cuts[i + 1]];
    if (s1 - s0 < 0.4) continue;
    const [p0, p1] = [at(s0 + 0.1, 0.12), at(s1 - 0.1, 1.1 - 0.12)];
    bed(p, [Math.min(p0[0], p1[0]), Math.max(p0[0], p1[0]), Math.min(p0[1], p1[1]), Math.max(p0[1], p1[1])], {
      y: 0.06,
    });
    hedge(p, at(s0 + 0.15, 1.1 - 0.36), at(s1 - 0.15, 1.1 - 0.36), {
      w: 0.4,
      h: 0.42,
      seed: seed + i,
    });
  }
  for (const [s0, s1] of bays) {
    const [p0, p1] = [at(s0, 0.9), at(s1, 1.1 - 0.12)];
    bed(p, [Math.min(p0[0], p1[0]), Math.max(p0[0], p1[0]), Math.min(p0[1], p1[1]), Math.max(p0[1], p1[1])], {
      y: 0.06,
      cover: false,
    });
  }
  trees.forEach((t, i) => {
    const [x, z] = at(t, 2.1);
    keyaki(p, x, z, 1.0 + ((i + seed) % 3) * 0.04, seed * 7 + i);
    p.geo(LEAF.mulch, new THREE.CylinderGeometry(0.55, 0.6, 0.03, 12).translate(x, 0.0, z), {
      cast: false,
      surf: 'soil',
    });
  });
}

function verges(p) {
  const { w, wl, s, el, e } = LANE;
  // along the plaza, south of the lane: the bays face the plaza's open corners
  verge(p, [s[0], s[3]], [s[1], s[3]], 's', { bays: BAYS.map((x) => [x - 1, x + 1]), trees: AVENUE, seed: 2 });
  // round the outside of the west turn and on west; round the east turn and on east
  verge(p, [wl[0], w[3]], [wl[0], s[3] + 1.1], 'w', { trees: [4.6], seed: 3 });
  verge(p, [-44, w[3]], [wl[0] - 1.1, w[3]], 's', { trees: [-24.2], seed: 4 });
  verge(p, [el[1], e[3]], [el[1], s[3] + 1.1], 'e', { trees: [2.2], seed: 5 });
  verge(p, [el[1] + 1.1, e[3]], [44, e[3]], 's', { trees: [22.2], seed: 6 });
  // the north side of the lanes in and out, as far as the ring bed
  verge(p, [-44, w[2]], [F[0] - R - BAND - 0.9, w[2]], 'n', { trees: [-24.2], seed: 7 });
  verge(p, [F[0] + R + BAND + 0.9, e[2]], [44, e[2]], 'n', { trees: [22.2], seed: 8 });
}

// the terrace's south line: a seat-height wall from each end to the circle's border; a planted bed at each end
function terraceEdges(p) {
  const cut = Math.sqrt(R * R - (TERRACE_S - F[1]) ** 2); // where the circle crosses the terrace's line
  lowWall(p, [TERRACE[0], TERRACE_S], [F[0] - cut + 0.1, TERRACE_S], { off: -0.11 });
  lowWall(p, [F[0] + cut - 0.1, TERRACE_S], [TERRACE[1], TERRACE_S], { off: -0.11 });
  for (const [x0, x1] of [
    [TERRACE[0] - 1.4, TERRACE[0]],
    [TERRACE[1], TERRACE[1] + 1.4],
  ]) {
    const rect = [x0, x1, TERRACE[2] + 0.2, TERRACE_S];
    for (const [a, b2] of [
      [
        [x0, rect[2]],
        [x0, rect[3]],
      ],
      [
        [x1, rect[2]],
        [x1, rect[3]],
      ],
    ])
      lowWall(p, a, b2, { h: 0.45, off: 0 });
    bed(p, [x0 + 0.1, x1 - 0.1, rect[2], rect[3] - 0.1], { y: 0.42 });
    const cx = (x0 + x1) / 2;
    cluster(p, cx, rect[3] - 0.8, { n: 4, r: 0.32, spread: 0.45, seed: Math.round(cx), y: 0.42 });
    pine(p, cx, rect[2] + 1.3, 0.85, Math.round(cx) + 2);
  }
}

// groups of mixed trees on low grassy mounds, shrubs at their feet, on the lawns clear of the buildings:
// 'x z rx rz | kind dx dz size, ...' (kinds: k zelkova, s cherry, m maple, g ginkgo, p pine)
const TREES = { k: keyaki, s: sakura, m: maple, g: ginkgo, p: pine };
const GROVES = [
  '-16.8 -7.0 2.4 1.8 | k -0.9 0.2 1.2, g 1.0 -0.5 1.05, m 0.2 1.0 0.9',
  '-15.2 -11.0 1.6 1.2 | s 0 0 1.0, p 1.0 0.5 0.85',
  '-24.5 7.0 2.4 1.6 | s 0 0 1.1, m 1.3 0.5 0.9',
  '15.2 -11.5 2.4 1.8 | k -0.9 0 1.2, g 1.0 0.6 1.0, s 0.3 -1.0 1.0',
  '22.5 4.5 2.6 1.8 | g -0.6 0 1.1, m 0.9 0.5 0.95, k 0.3 -1.0 1.1',
  '-12.5 12.8 2.2 1.0 | m -0.9 0 0.9, s 0.9 0.1 0.95',
  '12.5 12.8 2.2 1.0 | s -0.9 0 0.95, m 0.9 0.1 0.9',
].map((row) => {
  const [head, trees] = row.split('|');
  return [
    ...head.trim().split(/\s+/).map(Number),
    trees.split(',').map((t) => {
      const [k, ...n] = t.trim().split(/\s+/);
      return [k, ...n.map(Number)];
    }),
  ];
});
function groves(p) {
  GROVES.forEach(([x, z, rx, rz, list], gi) => {
    const g = new THREE.SphereGeometry(1, 24, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    p.geo('#5f6d58', g.scale(rx, 0.22, rz).translate(x, -0.04, z), { cast: false });
    list.forEach(([k, dx, dz, s], i) => TREES[k](p, x + dx, z + dz, s, gi * 7 + i));
    const r = rng(gi + 3);
    for (let i = 0; i < 2; i++)
      cluster(p, x + (r() - 0.5) * rx * 1.4, z + rz * (0.45 + r() * 0.3), { n: 3, r: 0.3, seed: gi + i, y: 0.1 });
    grass(p, x - rx * 0.6, z + rz * 0.5, { seed: gi });
  });
}

export function buildGreen(p) {
  ring(p);
  verges(p);
  terraceEdges(p);
  groves(p);
}
