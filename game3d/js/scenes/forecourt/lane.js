// The lane from the forecourt to the fountain plaza (scenes/forecourt.js), built as a street with the outdoor kit
// (scenes/outdoor/): brick in running bond between pale soldier borders, a planted strip on each side with a
// zelkova every 4 (an avenue once the tower ends), lamps on the south strip at every other tree, benches in bays
// cut into the south hedge, the sorted bins by one of them, a finger sign to the plaza and the dorms, and a pair
// of gateposts where head office's grounds end. The lane runs on out of view past them. Past the strips: lawns
// with groves of mixed trees on low mounds instead of rows.
import * as THREE from 'three';
import { Parts, rng } from '../outdoor/parts.js';
import { paver, GRANITE } from '../outdoor/paving.js';
import { kerb } from '../outdoor/edges.js';
import { keyaki, sakura, maple, ginkgo, pine, cluster, hedge, grass, bed } from '../outdoor/planting.js';
import { lamps, bench, bins, fingerSign } from '../outdoor/furniture.js';
import * as P from './plan.js';

const { LANE, STRIP_S: S, STRIP_N: N, LANE_TREES, TE, LE, GATE_X } = P;
const BAYS = [LANE_TREES[1] + 2, LANE_TREES[4] + 2]; // benches in the hedge between trees 2 and 3, 5 and 6

function paving(root) {
  const pv = paver();
  const brick = { pattern: 'bond', module: [0.5, 0.25], tones: GRANITE.brick, vary: 0.08, origin: [LE, LANE[2]] };
  const [z0, z1] = [LANE[2] + 0.25, LANE[3] - 0.25];
  pv.field([LANE[0], GATE_X - 0.3, z0, z1], brick);
  pv.field([GATE_X + 0.3, LANE[1], z0, z1], brick);
  pv.border(LANE, { w: 0.25, sides: 'ns' });
  // where the grounds end: a band of pale stone across the lane between the gateposts
  pv.field([GATE_X - 0.3, GATE_X + 0.3, z0, z1], { pattern: 'grid', module: [0.6, 0.3], tones: GRANITE.edge });
  // the bench bays: pale stone cut into the south strip
  for (const x of BAYS)
    pv.field([x - 1.0, x + 1.0, S[2], S[2] + 0.9], { pattern: 'grid', module: [0.5, 0.45], tones: GRANITE.pale });
  pv.build(root);
}

// the south verge: a planted bed along the lane (ground cover, a low hedge at its back, cut open for the bench
// bays), then grass with the avenue's trees far enough back that they never hide Eric on the lane
const FB = S[2] + 1.1; // the front bed's back edge
function strips(p, block) {
  const gaps = BAYS.map((x) => [x - 1.0, x + 1.0]);
  kerb(p, [S[0], S[2]], [S[1], S[2]], { off: 0.08, gaps });
  kerb(p, [S[0], FB], [S[1], FB], { off: -0.08 });
  for (const [x0, x1] of [
    [S[0], BAYS[0] - 1],
    [BAYS[0] + 1, BAYS[1] - 1],
    [BAYS[1] + 1, S[1]],
  ]) {
    bed(p, [x0 + 0.1, x1 - 0.1, S[2] + 0.12, FB - 0.12], { y: 0.06 });
    hedge(p, [x0 + 0.15, FB - 0.36], [x1 - 0.15, FB - 0.36], { w: 0.4, h: 0.42, seed: Math.round(x0) });
  }
  for (const x of BAYS) bed(p, [x - 1, x + 1, S[2] + 0.9, FB - 0.12], { y: 0.06, cover: false });
  block(S[0], S[1], S[2] + 0.05, S[3]);
  // north strip, past the tower's east face
  kerb(p, [N[0], N[3]], [N[1], N[3]], { off: -0.08 });
  kerb(p, [N[0], N[2]], [N[1], N[2]], { off: 0.08 });
  kerb(p, [N[0], N[2]], [N[0], N[3]], { off: 0.08 });
  bed(p, [N[0] + 0.15, N[1], N[2] + 0.12, N[3] - 0.12], { y: 0.06 });
  hedge(p, [N[0] + 0.3, N[2] + 0.38], [N[1], N[2] + 0.38], { w: 0.4, h: 0.42, seed: 9 });
  block(N[0], N[1], N[2], N[3] - 0.05);
  // the avenue: one species, one pitch; on the south verge from the court on, on the north strip once the tower
  // ends. Each south tree stands in a ring of mulch in the grass.
  const zs = FB + 1.0,
    zn = (N[2] + N[3]) / 2 - 0.05;
  LANE_TREES.forEach((x, i) => {
    keyaki(p, x, zs, 1.0 + (i % 3) * 0.04, i + 21);
    p.geo('#57504a', new THREE.CylinderGeometry(0.55, 0.6, 0.03, 12).translate(x, 0.0, zs), {
      cast: false,
      surf: 'soil',
    });
    if (x > TE + 1) keyaki(p, x, zn, 1.0 + ((i + 1) % 3) * 0.04, i + 41);
  });
  // benches in the bays, facing the lane; the bins beside the first
  for (const x of BAYS) bench(p, x, S[2] + 0.55, Math.PI, { len: 1.6 });
  bins(p, BAYS[0] + 0.75, S[2] + 0.55, Math.PI);
}

// the lamps stand in the south strip at every other gap between trees: pitch 8, on the lane's edge
function lights(set, p) {
  const pts = [];
  for (let i = 0; i + 1 < LANE_TREES.length; i += 2) {
    const x = (LANE_TREES[i] + LANE_TREES[i + 1]) / 2;
    if (!BAYS.some((b) => Math.abs(b - x) < 1.2)) pts.push([x, S[2] + 0.35]);
  }
  lamps(set, p, pts, { kind: 'post', poolShift: [0, -0.7] });
}

// the gateposts where head office's grounds end, in the strips either side of the lane, each with a lantern, and a
// band of pale stone across the lane between them; the finger sign to the plaza and the dorms a few steps before
function gate(root, p, set) {
  const zs = [N[3] - 0.45, S[2] + 0.45];
  for (const z of zs) {
    p.box('#8b8d90', 0.5, 1.25, 0.5, GATE_X, 0, z, { surf: 'concrete' });
    p.box('#b0b1b0', 0.62, 0.1, 0.62, GATE_X, 1.25, z, { surf: 'concrete' });
  }
  lamps(
    set,
    p,
    zs.map((z) => [GATE_X, z]),
    { kind: 'lantern', y: 1.35, pool: 0.8, poolShift: [0, 0] },
  );
  fingerSign(root, p, GATE_X - 5.1, S[2] + 0.35, [
    { text: 'Fountain Plaza', sub: '噴水広場', dir: 1 },
    { text: 'Dorms', sub: '社員寮', dir: 1 },
  ]);
}

// groves on the lawns: mixed trees in groups of three to five on low grassy mounds, shrubs at their feet
function groves(p) {
  const mound = (x, z, rx, rz, h = 0.22) => {
    const g = new THREE.SphereGeometry(1, 24, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    p.geo('#5f6d58', g.scale(rx, h, rz).translate(x, -0.04, z), { cast: false });
  };
  const trees = { k: keyaki, s: sakura, m: maple, g: ginkgo, p: pine };
  const groups = [
    // [x, z, mound rx, rz, trees: [kind, dx, dz, size]]
    [
      23.6,
      4.4,
      2.6,
      1.8,
      [
        ['s', -0.9, 0.2, 1.1],
        ['m', 1.0, -0.4, 0.95],
        ['k', 0.4, 1.3, 1.1],
      ],
    ],
    [
      31.8,
      5.6,
      3.0,
      2.0,
      [
        ['k', -1.2, 0.0, 1.2],
        ['k', 0.9, 0.9, 1.1],
        ['g', 1.6, -0.9, 1.0],
        ['m', -0.2, -1.0, 0.9],
      ],
    ],
    [
      40.5,
      3.8,
      2.4,
      1.6,
      [
        ['s', 0.0, 0.0, 1.15],
        ['p', 1.4, 0.6, 0.95],
      ],
    ],
    [
      31.5,
      -8.2,
      3.2,
      2.2,
      [
        ['k', -1.0, 0.2, 1.25],
        ['s', 1.2, -0.3, 1.05],
        ['g', 0.2, -1.4, 1.1],
        ['m', 1.6, 1.1, 0.9],
      ],
    ],
    [
      41.0,
      -7.4,
      2.6,
      1.8,
      [
        ['k', 0.0, 0.0, 1.2],
        ['m', -1.5, 0.8, 0.95],
        ['g', 1.3, -0.6, 1.05],
      ],
    ],
    [
      27.4,
      -11.8,
      2.2,
      1.5,
      [
        ['g', -0.6, 0.0, 1.1],
        ['g', 0.8, 0.4, 1.0],
      ],
    ],
  ];
  groups.forEach(([x, z, rx, rz, list], gi) => {
    mound(x, z, rx, rz);
    list.forEach(([k, dx, dz, s], i) => trees[k](p, x + dx, z + dz, s, gi * 7 + i));
    const r = rng(gi + 3);
    for (let i = 0; i < 2; i++)
      cluster(p, x + (r() - 0.5) * rx * 1.4, z + rz * (0.45 + r() * 0.3), { n: 3, r: 0.3, seed: gi + i, y: 0.12 });
    grass(p, x - rx * 0.6, z + rz * 0.5, { seed: gi });
  });
}

export function buildLane(root, nav, set) {
  const block = (x0, x1, z0, z1) => nav.block(x0, x1, z0, z1);
  paving(root);
  const p = new Parts();
  strips(p, block);
  lights(set, p);
  gate(root, p, set);
  groves(p);
  p.build(root);
}
