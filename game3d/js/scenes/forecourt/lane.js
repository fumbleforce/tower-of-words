// The lane from the forecourt to the fountain plaza (scenes/forecourt.js), built as a street with the outdoor kit
// (scenes/outdoor/): brick in running bond between pale soldier borders, a planted strip on each side with a
// zelkova every 4 (an avenue once the tower ends), lamps on the south strip at every other tree, benches in bays
// cut into the south hedge, the sorted bins by one of them, a finger sign to the plaza and the dorms, and a pair
// of gateposts where head office's grounds end. The lane runs on out of view past them. Past the strips: a garden
// either side, a lawn framed by raised borders (gardens() below).
import { Parts } from '../outdoor/parts.js';
import { paver, GRANITE } from '../outdoor/paving.js';
import { kerb, kerbRect, wallRect } from '../outdoor/edges.js';
import { keyaki, sakura, maple, pine, ginkgo, cluster, mound, hedge, grass, bed, LEAF } from '../outdoor/planting.js';
import { lamps, bench, bins, fingerSign } from '../outdoor/furniture.js';
import * as P from './plan.js';

const { LANE, STRIP_S: S, STRIP_N: N, LANE_TREES, TE, LE, GATE_X } = P;
const BAYS = [LANE_TREES[1] + 2, LANE_TREES[4] + 2]; // benches in the hedge between trees 2 and 3, 5 and 6

function paving(root) {
  const pv = paver();
  const brick = { pattern: 'bond', module: [0.5, 0.25], tones: GRANITE.brick, vary: 0.08, origin: [LE, LANE[2]] };
  const [z0, z1] = [LANE[2] + 0.25, LANE[3] - 0.25];
  pv.field([LANE[0] + 0.25, GATE_X - 0.3, z0, z1], brick);
  pv.field([GATE_X + 0.3, LANE[1], z0, z1], brick);
  pv.border(LANE, { w: 0.25, sides: 'ns' });
  pv.border([LANE[0], LANE[0] + 0.25, z0, z1], { w: 0.25, sides: 'w' }); // where it leaves the court
  // where the grounds end: a band of pale stone across the lane between the gateposts
  pv.field([GATE_X - 0.3, GATE_X + 0.3, z0, z1], { pattern: 'grid', module: [0.6, 0.3], tones: GRANITE.edge });
  // the bench bays: pale stone cut into the south strip
  for (const x of BAYS)
    pv.field([x - 1.0, x + 1.0, S[2], S[2] + 0.9], { pattern: 'grid', module: [0.5, 0.45], tones: GRANITE.pale });
  pv.build(root);
}

// the south verge: a planted bed along the lane (ground cover, a low hedge at its back, cut open for the bench
// bays), then the avenue's own bed behind the hedge, its trees far enough back that they never hide Eric on the lane
const FB = S[2] + 1.1, // the front bed's back edge
  AV = FB + 1.0; // the avenue's line
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
  // ends. On the south the trees stand in one long bed behind the hedge (the verge's back half, kerbed on the lawn
  // side), underplanted with ground cover and a pair of clipped azaleas between each two trees.
  const zs = AV,
    zn = (N[2] + N[3]) / 2 - 0.05;
  kerb(p, [S[0], S[3]], [S[1], S[3]], { off: -0.08 });
  bed(p, [S[0] + 0.1, S[1], FB + 0.05, S[3] - 0.16], { y: 0.06 });
  LANE_TREES.forEach((x, i) => {
    keyaki(p, x, zs, 1.0 + (i % 3) * 0.04, i + 21);
    if (x > TE + 1) keyaki(p, x, zn, 1.0 + ((i + 1) % 3) * 0.04, i + 41);
    if (i + 1 < LANE_TREES.length)
      for (const d of [-0.55, 0.55]) mound(p, x + 2 + d, zs + 0.1, 0.36, d < 0 ? LEAF.mid : LEAF.fresh, { y: 0.06 });
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

// The gardens either side of the lane, inside head office's grounds (from the court or the tower to the
// gateposts), in bands along it: behind the avenue a strip of lawn, then a raised border (a low stone wall on the
// lawn side, ground cover, shrubs in drifts, a clipped hedge along the back) with a flowering tree at every other
// avenue tree's x, closed at the east end by a short border with a clipped pine in line with the gateposts. Behind
// the borders a belt of taller trees in two staggered rows closes the view; it runs on past the gateposts to the
// plaza, like the avenue.
const GARDENS = [
  { x0: LE, lawn: S[3], border: [S[3] + 2.2, S[3] + 4.2], belt: [S[3] + 5.6, S[3] + 7.1], side: 1 },
  { x0: TE, lawn: N[2], border: [N[2] - 4.2, N[2] - 2.2], belt: [N[2] - 5.6, N[2] - 7.1], side: -1 },
];
function gardens(p) {
  const x1 = GATE_X - 0.3;
  GARDENS.forEach(({ x0, lawn, border: [b0, b1], side }, gi) => {
    const front = side > 0 ? b0 : b1; // the border's lawn side
    wallRect(p, [x0, x1, b0, b1], { sides: side > 0 ? 'n' : 's', h: 0.32 });
    kerbRect(p, [x0, x1, b0, b1], { sides: side > 0 ? 's' : 'n' });
    bed(p, [x0 + 0.1, x1 - 0.1, b0 + 0.2, b1 - 0.2], { y: 0.26 });
    const back = side > 0 ? b1 - 0.45 : b0 + 0.45;
    hedge(p, [x0 + 0.3, back], [x1 - 1.4, back], { w: 0.5, h: 0.75, y: 0.26, seed: gi + 30 });
    const mid = (b0 + b1) / 2 - side * 0.1;
    LANE_TREES.filter((x, i) => i % 2 === 0 && x > x0 + 1 && x < x1 - 2).forEach((x, i) => {
      (i % 2 ? maple : sakura)(p, x, mid, i % 2 ? 1.1 : 1.05, gi * 5 + i);
      cluster(p, x + 2, front + side * 0.55, { n: 4, r: 0.34, spread: 0.5, seed: gi * 5 + i, y: 0.26 });
      grass(p, x - 1.4, front + side * 0.4, { seed: gi + i });
    });
    // the east end: a border across from the lawn's edge to the back border, a clipped pine at its middle
    const e = [x1 - 1.6, x1, Math.min(lawn, front), Math.max(lawn, front)];
    kerbRect(p, e, { sides: 'w' });
    bed(p, [e[0] + 0.16, e[1] - 0.05, e[2] + 0.05, e[3] - 0.05], { y: 0.08 });
    pine(p, x1 - 0.8, (e[2] + e[3]) / 2, 1.0, gi + 7);
    cluster(p, x1 - 0.8, e[2] + (side > 0 ? 0.7 : e[3] - e[2] - 0.7), { n: 3, r: 0.3, seed: gi + 11, y: 0.08 });
  });
  GARDENS.forEach(({ x0, belt }, gi) => {
    let i = 0;
    for (let x = x0 + 1.2; x < 52; x += 2.0, i++) {
      const kind = [keyaki, ginkgo, keyaki, sakura][(i + gi) % 4];
      kind(p, x, belt[i % 2], 1.15 + ((i * 7) % 3) * 0.08, gi * 31 + i);
    }
  });
}

export function buildLane(root, nav, set) {
  const block = (x0, x1, z0, z1) => nav.block(x0, x1, z0, z1);
  paving(root);
  const p = new Parts();
  strips(p, block);
  lights(set, p);
  gate(root, p, set);
  gardens(p);
  p.build(root);
}
