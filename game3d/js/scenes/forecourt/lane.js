// The lane from the forecourt to the fountain plaza (scenes/forecourt.js), built as a street with the outdoor kit
// (scenes/outdoor/): brick in running bond between pale soldier borders, a planted strip on each side with a
// zelkova every 4 (an avenue once the tower ends), lamps on the south strip at every other tree, benches in bays
// cut into the south hedge, the sorted bins by one of them, a finger sign to the plaza and the dorms, and a pair
// of gateposts where head office's grounds end. The lane runs on out of view past them. Past the strips: a garden
// either side (forecourt/gardens.js), the south one reached by a gravel way through a gap in the hedge.
import { Parts } from '../outdoor/parts.js';
import { paver, GRANITE } from '../outdoor/paving.js';
import { BED_FLUSH } from '../outdoor/walk-edges.js';
import { keyaki, hedge, bed } from '../outdoor/planting.js';
import { lamps, bench, bins, fingerSign } from '../outdoor/furniture.js';
import { buildGardens, drift } from './gardens.js';
import { BAYS, BAY_X } from './ground.js';
import * as P from './plan.js';

const { LANE, STRIP_S: S, STRIP_N: N, LANE_TREES, TE, LE, GATE_X, PATH_X, GARDEN_PATH: GP } = P;
const WAY = [GP[0], GP[1]]; // the way into the south garden, through the verge

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
  // the bench bays: pale stone cut into the south strip, walkable (forecourt/ground.js BAYS)
  for (const r of BAYS) pv.field(r, { pattern: 'grid', module: [0.5, 0.45], tones: GRANITE.pale });
  pv.build(root);
}

// the south verge: a planted bed along the lane (ground cover, a low hedge at its back, cut open for the bench
// bays and the gravel way into the garden), then the avenue's own bed behind the hedge, its trees far enough back
// that they never hide Eric on the lane. The lane's own edge is the ground's kerb (forecourt/ground.js); the beds
// lie flush with the lawn behind it.
const FB = S[2] + 1.1, // the front bed's back edge
  AV = FB + 1.0; // the avenue's line
function strips(p, block) {
  const gaps = [...BAYS.map((r) => [r[0], r[1]]), WAY].sort((a, b) => a[0] - b[0]);
  const runs = gaps.map((g, i) => [i ? gaps[i - 1][1] : S[0], g[0]]).concat([[gaps.at(-1)[1], S[1]]]);
  for (const [x0, x1] of runs) {
    bed(p, [x0 + 0.1, x1 - 0.1, S[2] + 0.12, FB - 0.12], { y: BED_FLUSH });
    hedge(p, [x0 + 0.15, FB - 0.36], [x1 - 0.15, FB - 0.36], { w: 0.4, h: 0.42, seed: Math.round(x0) });
  }
  for (const r of BAYS) bed(p, [r[0], r[1], r[3], FB - 0.12], { y: BED_FLUSH, cover: false });
  // north strip, past the tower's east face
  bed(p, [N[0] + 0.15, N[1], N[2] + 0.12, N[3] - 0.12], { y: BED_FLUSH });
  hedge(p, [N[0] + 0.3, N[2] + 0.38], [N[1], N[2] + 0.38], { w: 0.4, h: 0.42, seed: 9 });
  // the avenue: one species, one pitch; on the south verge from the court on, on the north strip once the tower
  // ends. On the south the trees stand in one long bed behind the hedge (the verge's back half, flush with the
  // lawn), underplanted with ground cover and, between each two trees, a group that changes from gap to gap
  // (azaleas of mixed sizes, grasses, a single dome, or ground cover alone); the gravel way crosses one gap.
  const zs = AV,
    zn = (N[2] + N[3]) / 2 - 0.05;
  // the avenue's bed: a drift of planting (forecourt/gardens.js) from the hedge back to a line that steps in and out
  // from tree to tree, so the lawn and the garden behind meet it along a planted edge, not a kerb; the gravel way
  // crosses the gap with the way in, which stays at the strip's depth
  const cuts = [S[0], ...LANE_TREES, S[1]];
  for (let i = 0; i + 1 < cuts.length; i++) {
    const [a, b] = [cuts[i], cuts[i + 1]];
    const way = a < PATH_X && b > PATH_X;
    const deep = way ? 0 : [0.2, 1.1, -0.35, 0.7, 1.5, -0.2, 0.5, 0.9][i % 8];
    drift(p, [a, b, FB + 0.05, S[3] - 0.16 + deep], { seed: i + 40, skip: way ? [WAY] : [] });
  }
  LANE_TREES.forEach((x, i) => {
    keyaki(p, x, zs, 1.0 + (i % 3) * 0.04, i + 21);
    if (x > TE + 1) keyaki(p, x, zn, 1.0 + ((i + 1) % 3) * 0.04, i + 41);
  });
  // benches in the bays, facing the lane; the bins beside the first
  for (const x of BAY_X) {
    bench(p, x, S[2] + 0.55, Math.PI, { len: 1.6 });
    block(x - 0.85, x + 0.85, S[2] + 0.3, S[2] + 0.9);
  }
  bins(p, BAY_X[0] + 0.75, S[2] + 0.55, Math.PI);
}

// the lamps stand in the south strip at every other gap between trees: pitch 8, on the lane's edge
function lights(set, p) {
  const pts = [];
  for (let i = 0; i + 1 < LANE_TREES.length; i += 2) {
    const x = (LANE_TREES[i] + LANE_TREES[i + 1]) / 2;
    // the one by the way into the garden stands beside its opening
    const at = Math.abs(x - PATH_X) < 1.2 ? WAY[0] - 0.45 : x;
    if (!BAY_X.some((b) => Math.abs(b - x) < 1.2)) pts.push([at, S[2] + 0.35]);
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

export function buildLane(root, nav, set, planting = null) {
  const block = (x0, x1, z0, z1) => nav.block(x0, x1, z0, z1);
  paving(root);
  const p = new Parts({ planting });
  strips(p, block);
  lights(set, p);
  gate(root, p, set);
  buildGardens(p, set, block);
  p.build(root);
}
