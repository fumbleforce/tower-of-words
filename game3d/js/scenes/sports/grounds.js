// The sports ground's paving and planting (sports/plan.js), in the island frame:
//   the north street's top and the sports lane: the lane's brick between pale borders, the turn between them in
//   herringbone closed on its outer sides (plaza/east-lane.js corner), the north street's verge and avenue down its
//   west side and its lamps as the east lane lays them; the sports lane's south verge (a kerb, ground cover and a low
//   hedge, no trees, so nothing stands between Eric and the camera), its lamps behind the kerb, east of the gym's
//   corner (the corner and gym_link are office-quarter/link.js's); r3's door walk as the east lane lays it
//   the walks: the pool walk and the courts walk in the coast walk's pale slabs on the island grid (east-coast/walk.js),
//   kerbed, with the gate walk off the courts walk; the gym's apron in mid-grey slabs
//   along the pool walk: gravel against the gym's wall, ground cover and lamps along the pool's fence
//   along the courts walk: a clipped hedge in front of the pool's and the courts' fences, two paved bays with a bench
//   on its south side looking over at the pool, the dorm quarter's hedge south of it with its orchard behind; trees
//   between the pool and the courts
//   the lawns: a wood of cherries, maples and a pine in the corner between the lane, the pool walk and the courts
//   walk; zelkovas and cherries east of the north street up to the orchard; pines and maples north of the gym
//   finger signs at the lane's corner (Gym 体育館, Pool プール) and at the courts walk's start (Onsen 温泉)
import { GRANITE } from '../outdoor/paving.js';
import { laneField, verge } from '../outdoor/lane.js';
import { hedge, pine, keyaki, sakura, maple, gravel, bed } from '../outdoor/planting.js';
import { lamps, bench, fingerSign } from '../outdoor/furniture.js';
import { belt } from '../dorm-court/cluster-yards.js';
import { corner, walk, avenueTrees } from '../plaza/east-lane.js';
import { LANE as PLAZA_LANE } from '../plaza/plan.js';
import * as LAYOUT from '../island-layout.js';
import { LINK_E } from '../office-quarter/plan.js';
import * as P from './plan.js';
import { arrivalGardens } from './arrival-gardens.js';
import { BED_FLUSH } from '../outdoor/walk-edges.js';
import { PROTECTED_EDGES } from '../outdoor/protected-edges.js';
import { fence } from '../../kit/street/fence.js';

const PLAZA = LAYOUT.CHUNKS.plaza.at;
const ORIGIN = [PLAZA_LANE.e[0] + PLAZA[0], PLAZA_LANE.e[2] + PLAZA[1]]; // the lane's brick runs on from the plaza's
const SLABS = {
  pattern: 'grid',
  module: [0.6, 0.6],
  tones: GRANITE.pale,
  origin: [0, 0],
};
const { LANE, NS, BACK, POOL_WALK: PW, COURTS_WALK: CW, GATE_WALK: GW, DECK, GYM, ORCHARD: ORC } = P;
const CE = CW[1] - 2; // the courts walk is laid to the onsen path's foot (the east coast lays the path)

function* paving(pv) {
  laneField(pv, [NS[0], NS[1], LANE[3], BACK[2]], {
    along: 'z',
    origin: ORIGIN,
  });
  corner(pv, [NS[0], NS[1], LANE[2], LANE[3]], 'ne');
  laneField(pv, [LINK_E, NS[0], LANE[2], LANE[3]], { origin: ORIGIN });
  yield;
  walk(pv, [P.R3_SPUR[0], P.R3_SPUR[1], P.R3_SPUR[2], P.R3_SPUR[3]], true);
  pv.field(P.APRON, {
    pattern: 'grid',
    module: [0.6, 0.6],
    tones: GRANITE.mid,
    origin: [P.GX, 0],
  });
  pv.field([PW[0], PW[1], PW[2], LANE[2]], SLABS);
  pv.field([PW[1], CE, CW[2], CW[3]], SLABS);
  pv.field([GW[0], GW[1], GW[2], CW[2]], SLABS);
  for (const b of P.BAYS) pv.field(b, { ...SLABS, tones: GRANITE.mid });
  yield;
}

function* planting(p, lights, signRoot) {
  // the north street's verge and avenue down its west side (as the east lane plants it), its lamps on its east edge
  const toI = (z) => z + PLAZA[1];
  verge(p, [NS[0], LANE[3]], [NS[0], BACK[2]], 'w', {
    trees: avenueTrees().map(toI),
    seed: 21,
    ground: true,
  });
  lamps(lights, p, P.STREET_LAMPS, { pool: 1.4 });
  // the sports lane's south verge east of the gym's corner, its lamps behind the kerb
  verge(p, [LINK_E, LANE[3]], [NS[0], LANE[3]], 's', { seed: 23, ground: true });
  lamps(lights, p, P.LAMPS, { pool: 1.4 });
  yield;
  // along the pool walk: gravel against the gym's wall, ground cover along the pool's fence
  gravel(p, [GYM[1], PW[0] - 0.16, GYM[2], LANE[2] - 0.16]);
  bed(p, [PW[1] + 0.16, DECK[0], DECK[2], CW[2] - 0.16], { y: BED_FLUSH });
  // along the courts walk: the hedge before the fences, the benches in their bays, the quarter's hedge
  // (open at the courtside nook, plan.js COURTSIDE)
  for (const [a, b, seed] of [
    [PW[1] + 0.5, P.COURTSIDE[0] - 0.1, 31],
    [P.COURTSIDE[1] + 0.1, GW[0] - 0.3, 37],
  ])
    hedge(p, [a, CW[2] - 0.55], [b, CW[2] - 0.55], { w: 0.5, h: 0.55, seed });
  hedge(p, [GW[1] + 1.0, CW[2] - 0.55], [CE - 0.3, CW[2] - 0.55], {
    w: 0.5,
    h: 0.55,
    seed: 32,
  });
  for (const b of P.BAYS) bench(p, (b[0] + b[1]) / 2, b[3] - 0.45, Math.PI, { len: 1.5 });
  // the dorm quarter's hedge along the walk's south side, its orchard behind it (dorm-quarter/gardens.js)
  hedge(p, [ORC[0] + 0.3, CW[3] + 0.5], [CE - 0.3, CW[3] + 0.5], {
    w: 0.5,
    h: 0.6,
    seed: 33,
  });
  yield;
  // trees between the pool and the courts, in a bed
  bed(p, [DECK[1] + 0.3, 77.7, DECK[2] + 0.5, DECK[3] - 0.3], { y: BED_FLUSH });
  for (const [kind, z, s, seed] of [
    [pine, -64.5, 0.95, 41],
    [maple, -71, 0.9, 42],
    [keyaki, -78, 1.0, 43],
    [pine, -84.5, 0.9, 44],
  ])
    kind(p, (DECK[1] + 78) / 2, z, s, seed);
  // the lawns: the corner between the lane, the pool walk and the courts walk; east of the north street; north of
  // the gym, a few steps off the pool walk
  yield* belt(p, [PW[1] + 1.6, NS[0] - 1.4, CW[3] + 1.4, LANE[2] - 1.0], [sakura, maple, pine], {
    seed: 45,
    pitch: 3.0,
    soil: false,
    under: 0,
  });
  // (on the lawn, no soil under them: a plot of soil reads as a raised step in the grass)
  yield* belt(p, [NS[1] + 2.4, ORC[0] - 0.8, CW[3] + 1.4, LANE[2] - 0.6], [keyaki, sakura], {
    seed: 49,
    pitch: 3.2,
    soil: false,
  });
  // Keep the grove's living trunks behind the staff fence while retaining each tree's species and seed.
  const fenceX = PROTECTED_EDGES.sports[1][0][0];
  const groveTrees = [pine, maple, keyaki].map(
    (kind) => (parts, x, z, scale, seed) => kind(parts, Math.abs(x - fenceX) < 0.75 ? fenceX - 1 : x, z, scale, seed),
  );
  yield* belt(p, [GYM[0] + 1, GYM[1] - 3.2, PW[2] + 1, GYM[2] - 2.4], groveTrees, {
    seed: 53,
    pitch: 3.4,
    soil: false,
  });
  // past the pool walk's end: a low hedge across the lawn north of it, and trees up to the wood north of the pavilion
  // (bands-plan.js, the lawn belt), so the view north from its door ends in trees, not open grass
  hedge(p, [PW[0] - 1.2, PW[2] - 0.7], [P.PAVILION[0] - 0.3, PW[2] - 0.7], { w: 0.5, h: 0.55, seed: 57 });
  yield* belt(p, [PW[0] - 8, PW[0] - 0.6, P.PAVILION[2] - 1.2, PW[2] - 1.4], [pine, maple, keyaki], {
    seed: 59,
    pitch: 3.2,
    soil: false,
  });
  // the finger signs
  fingerSign(signRoot, p, ...P.SIGNS.corner, [
    { text: 'Gym', sub: '体育館', dir: -1 },
    { text: 'Pool', sub: 'プール', dir: -1 },
  ]);
  fingerSign(signRoot, p, ...P.SIGNS.courts, [{ text: 'Onsen', sub: '温泉', dir: 1 }]);
  yield;
}

export function* groundsSteps(c, lights, signs, signRoot) {
  yield* paving(c.paver);
  for (const [from, to] of PROTECTED_EDGES.sports) fence(c.parts, { from, to, variant: 'service', seed: 552 });
  yield* planting(c.parts, lights, signRoot);
  arrivalGardens(c.parts);
  yield;
}
