// The office street's paving and planting west of the gym's corner (office-quarter/plan.js; the corner is link.js),
// in the island frame:
//   the street: the lane's brick between pale borders, running on west past the bollards to the works street; its
//   north side kerbed, open for the forecourts and the two walks north, low beds between them; its south side a
//   verge (a kerb, ground cover and a low hedge, no trees, so nothing stands between Eric and the camera), with
//   post lamps behind it, two bench bays looking over the street at the offices, and crossings at the side streets
//   the side streets' mouths: the quarter street's walked a few steps south to the bank's door, the shed street's
//   laid a little way with bollards across (both go on south, not walked yet), and the harbour walk's (the harbour's)
//   the lawns: belts of trees between and behind the blocks north of the street, and set back from the verge south
//   of it, where the camera looks over them; a small wood on the quarter park
//   a finger sign at the street's west end, pointing on west to the harbour and back east to the gym and the pool
import { laneField, verge } from '../outdoor/lane.js';
import { GRANITE } from '../outdoor/paving.js';
import { kerb } from '../outdoor/edges.js';
import { keyaki, sakura, maple, pine, ginkgo, hedge, bed } from '../outdoor/planting.js';
import { lamps, bench, bollard, fingerSign } from '../outdoor/furniture.js';
import { belt, shrubBed } from '../dorm-court/cluster-yards.js';
import { walk, tree } from '../plaza/east-lane.js';
import { ORIGIN, PAVE_W } from './link.js';
import { worksStreet } from '../works/grounds.js';
import * as P from './plan.js';
import { OFFICE_BELTS } from './planting-plan.js';

const { STREET: S, QUARTER: Q, SHED, HARBOUR_WALK: HW, FOODS_WALK: FW, CON_WALK: CW } = P;
const V = 1.1, // a verge's depth
  WORKS = [-50, -47], // the works street's mouth on the north side (the works chunk's, works/plan.js)
  W0 = WORKS[0];
const SLABS = { pattern: 'grid', module: [0.6, 0.6], tones: GRANITE.mid };

// the north side's openings along the street: the forecourts, the two walks, the works street
const NORTH_OPEN = [...P.FORECOURTS.map((f) => [f.rect[0], f.rect[1]]), [FW[0], FW[1]], [CW[0], CW[1]], WORKS].sort(
  (a, b) => a[0] - b[0],
);
const SOUTH_CROSS = [
  [HW[0], HW[1]],
  [SHED[0], SHED[1]],
  [Q[0], Q[1]],
];

const inside = ([a, b], [x0, x1]) => a >= x0 && b <= x1;

// the street between x0 and x1 (office-quarter/plan.js; the sports ground lays its east end too, scenes/sports.js):
// its brick; its north kerb, open for the forecourts and the walks, and beds in the stretches between; its south
// verge, open at the side streets' mouths and the bench bays, the benches in them and the lamps behind it
export function* streetSteps(pv, p, lights, [x0, x1]) {
  laneField(pv, [x0, x1, S[2], S[3]], { origin: ORIGIN });
  const bays = P.BAYS.filter((r) => inside(r, [x0, x1]));
  for (const [a, b] of bays) pv.field([a, b, S[3], S[3] + V], { ...SLABS, origin: [a, S[3]] });
  yield;
  const open = NORTH_OPEN.filter(([a, b]) => b > x0 && a < x1);
  kerb(p, [x0, S[2]], [x1, S[2]], { off: -0.08, gaps: open });
  let x = x0;
  for (const [a, b] of [...open, [x1, x1]]) {
    if (a - x > 1.2) shrubBed(p, [x + 0.15, a - 0.15, S[2] - 1.0, S[2] - 0.12], 'nwe', 81 + Math.round(x));
    x = Math.max(x, b);
  }
  const v0 = Math.max(x0, HW[0] - 1.5);
  verge(p, [v0, S[3]], [x1, S[3]], 's', {
    crossings: SOUTH_CROSS.filter((r) => inside(r, [v0, x1])),
    bays,
    seed: 83,
  });
  for (const [a, b] of bays) bench(p, (a + b) / 2, S[3] + V - 0.4, Math.PI, { len: 1.5 });
  const pts = P.LAMPS.filter(([lx]) => lx > x0 && lx < x1);
  lamps(lights, p, pts, { pool: 1.2, poolShift: [0, -0.6] }); // the pools on the street, not the lawn behind
  yield;
}

function* paving(pv) {
  laneField(pv, [Q[0], Q[1], S[3], P.QUARTER_END + 1.6], { along: 'z', origin: ORIGIN });
  laneField(pv, [SHED[0], SHED[1], S[3], -48.8], { along: 'z', origin: ORIGIN });
  worksStreet(pv, null, [S[2] - 3, S[2]]); // the works' asphalt (works/grounds.js)
  walk(pv, [HW[0], HW[1], S[3], S[3] + 3], false);
  yield;
  // the bank's apron between its east face and the quarter street
  const bank = P.block('b_h').rect;
  pv.field([bank[1], Q[0], bank[2], bank[3]], { ...SLABS, origin: [bank[1], bank[2]] });
}

function* edges(p, signRoot) {
  // the side streets' mouths: kerbs down their open sides past the verge
  const mouth = (r, z1, sides) => {
    if (sides.includes('w')) kerb(p, [r[0], S[3] + V], [r[0], z1], { off: -0.08 });
    if (sides.includes('e')) kerb(p, [r[1], S[3] + V], [r[1], z1], { off: 0.08 });
  };
  mouth(Q, P.QUARTER_END + 1.6, 'e');
  mouth(SHED, -48.8, 'we');
  // bollards across the two mouths
  for (const { a, b } of P.BOLLARDS) {
    for (const [x, z] of [a, b]) bollard(p, x, z);
  }
  fingerSign(signRoot, p, ...P.SIGNS.west, P.WEST_BOARDS);
  // a bed between the bank's north face and the verge, its hedge along the face
  const bank = P.block('b_h').rect;
  bed(p, [bank[0], bank[1], S[3] + V + 0.1, bank[2] - 0.05], { y: 0.04 });
  hedge(p, [bank[0] + 0.3, bank[2] - 0.45], [bank[1] - 0.3, bank[2] - 0.45], {
    w: 0.45,
    h: 0.5,
    seed: 85,
  });
  yield;
}

// the lawns' trees: belts between and behind the blocks north of the street, set back south of it; a few standing
// free either side of the foods walk. [x0, x1]: only the belts that reach into it (the harbour lays the west end's)
export function* planting(p, [x0, x1] = [-Infinity, Infinity]) {
  const kinds = { keyaki, sakura, maple, pine, ginkgo };
  for (const [r, names, seed] of OFFICE_BELTS)
    if (seed !== 119 && r[1] > x0 && r[0] < x1)
      yield* belt(
        p,
        r,
        names.map((name) => kinds[name]),
        { seed, pitch: 3.3 },
      );
  for (const [kind, x, z, s, seed] of [
    [sakura, -22.4, -61.2, 0.95, 121],
    [maple, -17.2, -60.4, 0.9, 122],
  ])
    if (x > x0 && x < x1) tree(p, kind, x, z, s, seed);
}

// c: cells (dorm-court/cells.js); lights: a lightSet; signRoot: the group the finger sign's boards go in
export function* groundsSteps(c, lights, signRoot) {
  yield* streetSteps(c.paver, c.parts, lights, [W0, PAVE_W]);
  yield* paving(c.paver);
  yield* edges(c.parts, signRoot);
  yield* planting(c.parts);
}
