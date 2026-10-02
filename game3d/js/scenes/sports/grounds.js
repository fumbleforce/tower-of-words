// The sports ground's paving and planting (sports/plan.js), in the island frame:
//   the north street's top and the sports lane: the lane's brick between pale borders, the turn between them in
//   herringbone closed on its outer sides (plaza/east-lane.js corner), the north street's verge and avenue down its
//   west side and its lamps as the east lane lays them; the sports lane's south verge (a kerb, ground cover and a low
//   hedge, no trees, so nothing stands between Eric and the camera), its lamps behind the kerb, east of the gym's
//   corner (the corner and gym_link are office-quarter/link.js's); r3's door walk as the east lane lays it
//   the walks: the pool walk and the courts walk in the coast walk's pale slabs on the island grid (east-coast/walk.js),
//   kerbed, with the gate walk and the residence walk across the courts walk; the gym's apron in mid-grey slabs
//   along the pool walk: gravel against the gym's wall, ground cover and lamps along the pool's fence
//   along the courts walk: a clipped hedge in front of the pool's and the courts' fences, two paved bays with a bench
//   on its south side looking over at the pool, a hedge and the residence's planting south of it, the north
//   residence's door; trees between the pool and the courts
//   the lawns: a wood of cherries, maples and a pine in the corner between the lane, the pool walk and the courts
//   walk; zelkovas and cherries east of the north street up to the residence; pines and maples north of the gym
//   finger signs at the lane's corner (Gym 体育館, Pool プール) and at the courts walk's start (Onsen 温泉)
import * as THREE from 'three';
import { GRANITE } from '../outdoor/paving.js';
import { laneField, verge } from '../outdoor/lane.js';
import { kerb, kerbRect } from '../outdoor/edges.js';
import { hedge, pine, keyaki, sakura, maple, gravel, bed } from '../outdoor/planting.js';
import { lamps, bench, fingerSign } from '../outdoor/furniture.js';
import { drift } from '../forecourt/gardens.js';
import { belt } from '../dorm-court/cluster-yards.js';
import { corner, walk, avenueTrees } from '../plaza/east-lane.js';
import { LANE as PLAZA_LANE } from '../plaza/plan.js';
import * as LAYOUT from '../island-layout.js';
import { LINK_E } from '../office-quarter/plan.js';
import * as P from './plan.js';

const PLAZA = LAYOUT.CHUNKS.plaza.at;
const ORIGIN = [PLAZA_LANE.e[0] + PLAZA[0], PLAZA_LANE.e[2] + PLAZA[1]]; // the lane's brick runs on from the plaza's
const SLABS = {
  pattern: 'grid',
  module: [0.6, 0.6],
  tones: GRANITE.pale,
  origin: [0, 0],
};
const { LANE, NS, BACK, POOL_WALK: PW, COURTS_WALK: CW, GATE_WALK: GW, RES_WALK: RW, DECK, GYM, RESIDENCE: RES } = P;
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
  pv.field([RW[0], RW[1], CW[3], RW[3]], SLABS);
  for (const b of P.BAYS) pv.field(b, { ...SLABS, tones: GRANITE.mid });
  yield;
}

function* kerbs(p) {
  // the north street's east side, open for r3's door walk; the turn's outer sides; the lane's north side east of the
  // gym's corner, open for the gym's apron and the pool walk
  kerb(p, [NS[1], LANE[3]], [NS[1], BACK[2]], {
    off: 0.08,
    gaps: [[P.R3_SPUR[2], P.R3_SPUR[3]]],
  });
  kerb(p, [NS[1], LANE[2]], [NS[1], LANE[3]], { off: 0.08 });
  kerb(p, [LINK_E, LANE[2]], [NS[1], LANE[2]], {
    off: -0.08,
    gaps: [
      [P.APRON[0], P.APRON[1]],
      [PW[0], PW[1]],
    ],
  });
  // the walks: the pool walk's sides and end, the courts walk's sides (open for the bays and the two short walks),
  // the short walks' sides
  kerb(p, [PW[0], PW[2]], [PW[0], LANE[2]], { off: -0.08 });
  kerb(p, [PW[1], PW[2]], [PW[1], LANE[2]], {
    off: 0.08,
    gaps: [[CW[2], CW[3]]],
  });
  kerb(p, [PW[0], PW[2]], [PW[1], PW[2]], { off: -0.08 });
  kerb(p, [PW[1], CW[2]], [CE, CW[2]], { off: -0.08, gaps: [[GW[0], GW[1]]] });
  kerb(p, [PW[1], CW[3]], [CE, CW[3]], {
    off: 0.08,
    gaps: [[RW[0], RW[1]], ...P.BAYS.map((b) => [b[0], b[1]])],
  });
  for (const r of [GW, RW]) kerbRect(p, r, { sides: 'we' });
  for (const b of P.BAYS) kerbRect(p, b, { sides: 'wes' });
  yield;
}

function* planting(p, lights, signRoot) {
  // the north street's verge and avenue down its west side (as the east lane plants it), its lamps on its east edge
  const toI = (z) => z + PLAZA[1];
  verge(p, [NS[0], LANE[3]], [NS[0], BACK[2]], 'w', {
    trees: avenueTrees().map(toI),
    seed: 21,
  });
  lamps(lights, p, P.STREET_LAMPS, { pool: 1.4 });
  // the sports lane's south verge east of the gym's corner, its lamps behind the kerb
  verge(p, [LINK_E, LANE[3]], [NS[0], LANE[3]], 's', { seed: 23 });
  lamps(lights, p, P.LAMPS, { pool: 1.4 });
  yield;
  // along the pool walk: gravel against the gym's wall, ground cover along the pool's fence
  gravel(p, [GYM[1], PW[0] - 0.08, GYM[2], LANE[2] - 0.08]);
  bed(p, [PW[1] + 0.08, DECK[0], DECK[2], CW[2] - 0.08], { y: 0.04 });
  // along the courts walk: the hedge before the fences, the benches in their bays, the residence's side
  hedge(p, [PW[1] + 0.5, CW[2] - 0.55], [GW[0] - 0.3, CW[2] - 0.55], {
    w: 0.5,
    h: 0.55,
    seed: 31,
  });
  hedge(p, [GW[1] + 1.0, CW[2] - 0.55], [CE - 0.3, CW[2] - 0.55], {
    w: 0.5,
    h: 0.55,
    seed: 32,
  });
  for (const b of P.BAYS) bench(p, (b[0] + b[1]) / 2, b[3] - 0.45, Math.PI, { len: 1.5 });
  hedge(p, [RES[0] + 0.3, CW[3] + 0.5], [RW[0] - 0.3, CW[3] + 0.5], {
    w: 0.5,
    h: 0.6,
    seed: 33,
  });
  hedge(p, [RW[1] + 0.3, CW[3] + 0.5], [CE - 0.3, CW[3] + 0.5], {
    w: 0.5,
    h: 0.6,
    seed: 34,
  });
  drift(p, [RES[0] + 0.2, RW[0] - 0.4, CW[3] + 1.0, RES[2] - 0.1], {
    back: 's',
    seed: 35,
  });
  drift(p, [RW[1] + 0.4, RES[1] - 0.2, CW[3] + 1.0, RES[2] - 0.1], {
    back: 's',
    seed: 36,
  });
  yield;
  // trees between the pool and the courts, in a bed
  bed(p, [DECK[1] + 0.3, 77.7, DECK[2] + 0.5, DECK[3] - 0.3], { y: 0.03 });
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
  });
  yield* belt(p, [NS[1] + 2.4, RES[0] - 0.8, CW[3] + 1.4, LANE[2] - 0.6], [keyaki, sakura], { seed: 49, pitch: 3.2 });
  yield* belt(p, [GYM[0] + 1, GYM[1] - 3.2, PW[2] + 1, GYM[2] - 2.4], [pine, maple, keyaki], { seed: 53, pitch: 3.4 });
  // the finger signs
  fingerSign(signRoot, p, ...P.SIGNS.corner, [
    { text: 'Gym', sub: '体育館', dir: -1 },
    { text: 'Pool', sub: 'プール', dir: -1 },
  ]);
  fingerSign(signRoot, p, ...P.SIGNS.courts, [{ text: 'Onsen', sub: '温泉', dir: 1 }]);
  yield;
}

// the north residence's door on its north face, across the courts walk from the courts' gate: a panel of its wall
// round a glazed pair under a canopy; its name on a low wall by its walk (signs: a signSet)
function residenceDoor(p, signs, lights) {
  const x = P.DOOR_X,
    f = RES[2] - 0.02;
  p.box('#72787f', 3.2, 2.9, 0.08, x, 0, f - 0.02, { surf: 'concrete' });
  p.box('#3f4650', 1.9, 2.15, 0.06, x, 0.08, f - 0.07);
  p.box('#8c9dad', 1.7, 2.0, 0.04, x, 0.12, f - 0.1);
  p.box('#3f4650', 0.05, 2.0, 0.06, x, 0.12, f - 0.12);
  p.box('#8f9092', 2.4, 0.08, 0.7, x, 0, f - 0.4, { surf: 'concrete' });
  p.box('#a3a9b3', 2.8, 0.12, 1.2, x, 2.4, f - 0.62);
  p.box('#3f4650', 2.8, 0.1, 0.06, x, 2.34, f - 1.2);
  // its name on a low wall in the planting by its walk, facing west along the courts walk
  const nx = RW[1] + 0.45,
    nz = (CW[3] + RES[2]) / 2;
  p.box('#8f9092', 0.24, 0.85, 1.7, nx, 0, nz, { surf: 'concrete' });
  signs.board('きたレジデンス', 'NORTH RESIDENCE', '#46505c', 1.6, 0.4, [nx - 0.13, 0.5, nz], -Math.PI / 2);
  lights.glowParts.push(...[-0.9, 0.9].map((dx) => lightBox(x + dx, 2.36, f - 0.6)));
  lights.lit.push([x, f - 1.0, 1.2]);
}
const lightBox = (x, y, z) => new THREE.BoxGeometry(0.26, 0.04, 0.26).translate(x, y, z);

export function* groundsSteps(c, lights, signs, signRoot) {
  yield* paving(c.paver);
  yield* kerbs(c.parts);
  yield* planting(c.parts, lights, signRoot);
  residenceDoor(c.parts, signs, lights);
}
