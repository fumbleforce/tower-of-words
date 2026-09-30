// The fountain plaza's planting and edges (scenes/plaza.js), with the outdoor kit (scenes/outdoor/), from the plan
// (plaza/plan.js):
//   the ring bed round the circle, opened only for the two lanes and the canteen link: a kerbed band of ground
//   cover outside the dark border ring with a clipped hedge at its back, a ring of cherries at an even pitch (two
//   maples flanking the link), and drifts of cosmos and grasses along the south arc
//   the lanes' verges, both sides of each lane: a kerb, a bed of ground cover with a low hedge and the zelkova
//   avenue set back on the grass, as on the forecourt's lane
//   the terrace's edges: a seat-height wall along its south line, open where the link starts; planted beds at its
//   two ends
//   the lawns beyond: groups of mixed trees with shrubs on low mounds
import * as THREE from 'three';
import { rng } from '../outdoor/parts.js';
import { lowWall, KERB } from '../outdoor/edges.js';
import { verge } from '../outdoor/lane.js';
import { arcBox } from '../outdoor/round.js';
import { keyaki, sakura, maple, ginkgo, pine, cluster, grass, bed, mound, LEAF } from '../outdoor/planting.js';
import * as P from './plan.js';

const { F, R, BAND, ARCS, LANE, LINK, AVENUE, TERRACE, TERRACE_S, polar, rad } = P;
// cosmos, the autumn flower of every Japanese park: pink, white and a deep rose
const COSMOS = ['#d59aae', '#ece6e3', '#b86f8e', '#dcb3c6'];

// the tree ring: a tree every 22.5° round the ring bed, none in the three openings (east, west, north), symmetric
// about the canteen's axis. The benches stand in front of four of them (plaza/furniture.js), two each side of the
// link, with a lamp between each pair; maples flank the link, cherries everywhere else.
const PITCH = 22.5;
const TREE_DEG = Array.from({ length: 16 }, (_, i) => i * PITCH).filter((d) => d % 90 !== 0 || d === 90);
export const BENCH_ANGLES = [rad(202.5), rad(225), rad(315), rad(337.5)];
export const RING_LAMPS = [rad(213.75), rad(326.25)];
const MAPLES = [247.5, 292.5];

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
  for (const arc of Object.values(ARCS)) ringArc(p, arc);
  const mid = R + BAND * 0.42;
  TREE_DEG.forEach((d, i) => {
    const [x, z] = polar(rad(d), mid);
    if (MAPLES.includes(d)) maple(p, x, z, 1.15, i + 3);
    else sakura(p, x, z, 0.95 + (i % 3) * 0.05, i + 11);
  });
  // along the south arc, facing the plaza: drifts of cosmos and grass tufts between the cherries, in front of the
  // hedge
  const q = rng(31);
  for (let d = PITCH / 2; d < 180; d += PITCH)
    for (const k of [-1, 0, 1]) {
      const [x, z] = polar(rad(d + k * 3.2), R + 0.45);
      if (k === 0 && Math.round(d) % 2) grass(p, x, z, { seed: Math.round(d), h: 0.45 });
      else cosmos(p, x, z, Math.round(d * 10 + k + q() * 5));
    }
}

// both sides of both lanes, from the edge of the view in to just short of the ring bed, the same on each side
function verges(p) {
  const { w, e } = LANE;
  const stop = R + BAND + 0.9;
  const west = AVENUE.map((d) => F[0] - d),
    east = AVENUE.map((d) => F[0] + d);
  verge(p, [-44, w[2]], [F[0] - stop, w[2]], 'n', { trees: west, seed: 3 });
  verge(p, [-44, w[3]], [F[0] - stop, w[3]], 's', { trees: west, seed: 4 });
  verge(p, [F[0] + stop, e[2]], [44, e[2]], 'n', { trees: east, seed: 5 });
  verge(p, [F[0] + stop, e[3]], [44, e[3]], 's', { trees: east, seed: 6 });
}

// the terrace's south line: a seat-height wall along all of it, open only where the link starts; a planted bed at
// each end
function terraceEdges(p) {
  lowWall(p, [TERRACE[0], TERRACE_S], [TERRACE[1], TERRACE_S], { off: -0.11, gaps: [[LINK[0], LINK[1]]] });
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
  '-16.8 -7.6 2.4 1.8 | k -0.9 0.2 1.2, g 1.0 -0.5 1.05, m 0.2 1.0 0.9',
  '-15.2 -11.0 1.6 1.2 | s 0 0 1.0, p 1.0 0.5 0.85',
  '-21.5 7.6 2.4 1.6 | s 0 0 1.1, m 1.3 0.5 0.9',
  '15.2 -11.5 2.4 1.8 | k -0.9 0 1.2, g 1.0 0.6 1.0, s 0.3 -1.0 1.0',
  '17.6 6.4 2.2 1.4 | g -0.6 0 1.1, m 0.9 0.4 0.95, k 0.3 -0.8 1.1',
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
