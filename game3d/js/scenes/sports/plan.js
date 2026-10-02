// The sports ground's plan (scenes/sports.js): the walkable ground from the top of the north street to the gym's
// door, the pool pavilion's door and the onsen path (docs/game/island.md, "Sports and baths"), from the layout's
// paths (scenes/island-sports.js, island-east.js). Everything is laid out in the island frame (x east, z south) and
// moved into the chunk's own by pt() and rect(); the chunk is not turned, its origin is where the pool walk meets
// the courts walk.
//
//   the north street's top: from just north of the back lane, where Eric comes in from the east lane and leaves for
//   it, up to the sports lane, with the short walk to r3's door
//   the sports lane: west from the north street along the gym's south side to the gym's corner, where it stops for
//   now (it goes on to the office street later); the gym's apron in front of its door
//   the pool walk: north from the sports lane between the gym and the pool's fence to the shower pavilion's door
//   the courts walk: east from the pool walk along the pool's and the courts' fences, behind the north residence, to
//   the onsen path's foot (the east coast chunk's), with the short walks to the courts' gate and the residence's
//   door on one axis across it
import * as LAYOUT from '../island-layout.js';
import * as E from '../plaza/east-plan.js';

export const CHUNK = 'sports';
const AT = LAYOUT.CHUNKS[CHUNK].at;
// the island frame to the chunk's: a point, a rect [x0, x1, z0, z1]
export const pt = ([x, z]) => [x - AT[0], z - AT[1]];
export const rect = ([x0, x1, z0, z1]) => [x0 - AT[0], x1 - AT[0], z0 - AT[1], z1 - AT[1]];
export const inRect = (x, z, [x0, x1, z0, z1], m = 0) => x > x0 + m && x < x1 - m && z > z0 + m && z < z1 - m;
const mid = (a, b) => (a + b) / 2;
const box = ([x0, z0, x1, z1]) => [x0, x1, z0, z1];
const path = (id) => box(LAYOUT.PATHS.find((p) => p.id === id).rect);
const building = (id) => box(LAYOUT.BUILDINGS.find((b) => b.id === id).rect);
// the plaza's frame (plaza/east-plan.js) to the island's
const PLAZA = LAYOUT.CHUNKS.plaza.at;
const fromPlaza = ([x, z]) => [x + PLAZA[0], z + PLAZA[1]];

export const LANE = path('sports_lane');
export const NS = path('north_street');
export const BACK = path('back_lane');
export const POOL_WALK = path('pool_walk');
export const COURTS_WALK = path('courts_walk');
export const GATE_WALK = path('courts_gate_walk');
export const RES_WALK = path('residence_walk');
export const DECK = path('pool_deck');
export const GYM = building('gym');
export const PAVILION = building('pool_hall');
export const RESIDENCE = building('housing_n');
export const R3 = building('r3');
export const GX = mid(GYM[0], GYM[1]); // the gym's door axis
export const DOOR_X = mid(GATE_WALK[0], GATE_WALK[1]); // the courts' gate and the residence's door
export const PAV_DOOR_Z = POOL_WALK[2] + 1.2; // the pavilion's door, on its west face at the pool walk's end
const R3_Z = mid(R3[2], R3[3]);
export const R3_SPUR = [NS[1], R3[0], R3_Z - 0.75, R3_Z + 0.75];
export const LANE_END = GYM[0] - 1; // the lane is walked from here east
export const NORTH_END = BACK[2] - 4; // the north street is walked from here north
export const APRON = [GX - 2.4, GX + 2.4, GYM[3], LANE[2]]; // in front of the gym's door

// the walkable rects, in the island frame
const I_WALKS = [
  [NS[0], NS[1], LANE[3] - 0.1, NORTH_END],
  [R3_SPUR[0] - 0.1, R3_SPUR[1] - 0.15, R3_SPUR[2], R3_SPUR[3]],
  [LANE_END, LANE[1], LANE[2], LANE[3]],
  [APRON[0], APRON[1], APRON[2] + 0.15, APRON[3] + 0.1],
  [POOL_WALK[0], POOL_WALK[1], POOL_WALK[2], LANE[2] + 0.1],
  [POOL_WALK[1] - 0.1, COURTS_WALK[1] - 2.2, COURTS_WALK[2], COURTS_WALK[3]],
  [GATE_WALK[0], GATE_WALK[1], GATE_WALK[2] + 0.3, GATE_WALK[3] + 0.1],
  [RES_WALK[0], RES_WALK[1], RES_WALK[2] - 0.1, RES_WALK[3] - 0.15],
];
export const WALKS = I_WALKS.map(rect);

// the furniture, in the island frame: post lamps on the lane's south verge every 8, on the pool walk's east edge and
// on the courts walk's south side, all off the walks; the north street's own lamps on its east edge (the east lane's,
// plaza/east-plan.js), which stand on it; benches in two bays on the courts walk's south side, looking over it at the
// pool; finger signs at the lane's corner and at the courts walk's start
export const LAMPS = [
  ...[41, 53, 64].map((x) => [x, LANE[3] + 0.45]),
  ...[-56, -66, -76, -86].map((z) => [POOL_WALK[1] + 0.4, z]),
  ...[67, 81, 97].map((x) => [x, COURTS_WALK[3] + 0.45]),
];
export const STREET_LAMPS = E.STREET_LAMPS.map(fromPlaza).filter(([, z]) => z < BACK[2] + 1);
export const BAYS = [64, 71].map((x) => [x - 1.1, x + 1.1, COURTS_WALK[3], COURTS_WALK[3] + 1.4]); // a bench in each, facing north
export const SIGNS = {
  corner: [NS[1] - 0.3, LANE[2] - 0.45], // the lane's corner with the north street, pointing west to the gym and pool
  courts: [COURTS_WALK[0] + 0.7, COURTS_WALK[3] + 0.45], // the courts walk's start, pointing east to the onsen
};
const post = ([x, z], r = 0.16) => [x - r, x + r, z - r, z + r];
export const FURNITURE = STREET_LAMPS.map((p) => post(p)).map(rect);

// the shut doors: the gym's on its south face, the pool pavilion's on its west face (local), and where Eric stands to
// try each (step)
export const DOORS = [
  { id: 'gym', local: pt([GX, GYM[3]]), step: pt([GX - 0.35, GYM[3] + 1.0]) },
  { id: 'pool', local: pt([PAVILION[0], PAV_DOOR_Z]), step: pt([PAVILION[0] - 1.0, PAV_DOOR_Z + 0.3]) },
];

// the ways out ({ edge, lane, zone, in } as the east lane's EXITS): south down the north street to the east lane;
// east along the courts walk to the onsen path's foot, to the east coast (in: where he walks to, back from there)
const NSX = mid(NS[0], NS[1]),
  CZ = mid(COURTS_WALK[2], COURTS_WALK[3]),
  CE = COURTS_WALK[1] - 2.2;
export const EXITS = {
  east_lane: {
    edge: pt([NSX, NORTH_END - 0.2]),
    lane: pt([NSX, NORTH_END - 1.6]),
    zone: rect([NS[0] - 0.5, NS[1] + 0.5, NORTH_END - 2.2, NORTH_END + 1]),
  },
  east_coast: {
    edge: pt([CE - 0.2, CZ]),
    lane: pt([CE - 1.6, CZ]),
    zone: rect([CE - 2.2, CE + 1, COURTS_WALK[2] - 0.5, COURTS_WALK[3] + 0.5]),
    in: pt([CE - 3.6, CZ]),
  },
};
// where Eric comes in from the east lane (and from anywhere a trip doesn't say): up the north street, walking north
export const IN = pt([NSX, NORTH_END - 3.6]);
export const ARRIVE_EDGE = EXITS.east_lane.edge;
// the walks' bounds, for the nav grid and the camera
export const BOUNDS = (() => {
  const b = [Infinity, -Infinity, Infinity, -Infinity];
  for (const [x0, x1, z0, z1] of WALKS) {
    b[0] = Math.min(b[0], x0);
    b[1] = Math.max(b[1], x1);
    b[2] = Math.min(b[2], z0);
    b[3] = Math.max(b[3], z1);
  }
  return b;
})();

// where the camera turns (places/sports.js), in the chunk's frame: it looks a little east of north over the lane,
// the north street and the pool walk, so the gym's front faces it; at the pool walk's north end, past the gym, it
// turns north-east so the pavilion's door faces it ([z from, z to] it eases over); along the courts walk it looks
// east from a little north of the walk, steeply, so the north residence south of the walk doesn't hide Eric ([x
// from, x to] it eases over, north of [z from, z to], which only the courts walk and its two short walks are)
export const TURNS = {
  pavilion: { z: [pt([0, GYM[2] - 1])[1], pt([0, GYM[2] - 6])[1]] },
  courts: {
    x: [pt([POOL_WALK[1] + 1.5, 0])[0], pt([POOL_WALK[1] + 5, 0])[0]],
    z: [pt([0, RES_WALK[3] + 1])[1], pt([0, RES_WALK[3] - 1])[1]],
  },
};
