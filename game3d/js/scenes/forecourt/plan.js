// The forecourt's plan (scenes/forecourt.js): every zone as a rectangle [x0, x1, z0, z1] on the town's grid, x east
// and z south, from the station and the head office as the island layout places them. The court's and the lane's
// builders (forecourt/court.js, forecourt/lane.js) and the walk grid all read these, so the kerbs, beds and
// lamps line up with each other and with the buildings.
//
//   the main walk: one designed path from the station door to the head office door, 2.4 wide, in three legs: north
//   out of the station door to the court's axis, east along the axis, north to the head office door
//   the court: pale stone round the walk, from the station's west face to its east edge (LE)
//   the bike court: south of the court, east of the station, behind a hedge
//   the lane: east from the court's north-east corner along the tower's south face, an avenue on to the plaza
import { STATION, DOOR_X } from '../station-exterior.js';
import { T, at, DOOR_U } from '../head-office/frame.js';
import { BUILDINGS, toLocal } from '../island-layout.js';
import { CROSS, STREET_W } from './cross-plan.js';
import { doorAt } from '../outdoor/block-face.js';
export { CROSS, STREET_W };

export { STATION, DOOR_X };
export const X0 = STATION.x0, // the station's west face: the court's west edge
  SE = STATION.x1, // its east face
  ZN = STATION.zN, // its north face: the court's south edge
  HZ = T.o[1], // the tower's south face: the court's north edge
  HO_X = at(DOOR_U, 0)[0], // the head office door
  // the court's east edge, where the old lobby's east wall stood (u 9.9): pinned there on its own, so the wider
  // atrium (head-office/frame.js LU) moves neither the court, the lane nor the garden
  LE = at(9.9, 0)[0],
  TE = T.o[0] + T.W, // the tower's east face
  TN = T.o[1] - T.D; // its north face

export const COURT = [X0, LE, HZ, ZN];
// the main walk: its axis, width and border; the three legs' outer rectangles
export const AZ = -0.3,
  WW = 2.4,
  BW = 0.3;
const h = WW / 2;
export const LEG = {
  a: [DOOR_X - h, DOOR_X + h, AZ - h, ZN], // out of the station door
  b: [DOOR_X - h, HO_X + h, AZ - h, AZ + h], // along the axis
  c: [HO_X - h, HO_X + h, HZ, AZ - h], // up to the head office door
};
// the court's pale fields round the walk
export const FIELDS = [
  [X0, LEG.a[0], HZ, ZN], // west of the walk
  [LEG.a[0], LEG.c[0], HZ, LEG.b[2]], // north of it, west of the door leg
  [LEG.c[1], LE, HZ, ZN], // east of it
  [LEG.a[1], LEG.c[1], LEG.b[3], ZN], // south of it, east of the station door
];
export const SERVICE = [5.95, T.o[0], TN, HZ]; // the service way north between the wing and the tower, to
// the tower's service door near its north-west corner; it ends on the tower's north face line
export const BIKES = [SE, HO_X + 1.95, ZN, 10.6];
export const GARDEN = [BIKES[1], LE, ZN, 10.6]; // the raised garden east of the bike court
// The north edge (forecourt/north.js), seen beyond the court's bed: two streets as wide as the lane, and the wing
// on its plot between them. The shed street leaves the court at its north-west corner, through a mouth west of the
// north bed, and runs north along the platform shed; the cross street turns east off it behind the wing and the
// tower and ends at office_e1's door (its west face, on the street's axis). The wing and office_e1 come from the
// island layout.
const box = (id) => {
  const [x0, z0, x1, z1] = BUILDINGS.find((b) => b.id === id).rect;
  const [a, c] = [toLocal('forecourt', x0, z0), toLocal('forecourt', x1, z1)].map((p) => p.map((v) => +v.toFixed(2)));
  return [a[0], c[0], a[1], c[1]];
};
export const WING = box('head_office_wing'),
  E1 = box('office_e1');
export const SHED_ST = [X0, X0 + STREET_W, CROSS[2] - 4, HZ]; // it runs on north past the junction, out of view
export const JUNCTION = [SHED_ST[0], SHED_ST[1], CROSS[2], CROSS[3]];
// a few steps up the shed street he can walk, to the chained bollards that close it; they stand far enough in that
// the court's trees never hide them from the camera
export const BARRIER_Z = HZ - 3.3;
// the shed street he walks, its full width, from the court to a step past the bollards (where the campus trip starts)
export const SHED_WALK = [SHED_ST[0], SHED_ST[1], BARRIER_Z - 1.2, HZ];
export const WING_PLOT = [SHED_ST[1], SERVICE[0], CROSS[3], HZ];
// the wing's staff door (its west face's middle bay, past the chains) and its path from the shed street, 1.6 wide;
// the staff bike shelter on the lawn behind the wing, its paved floor and the path to it (forecourt/north.js). All
// walkable from the campus (campus/plan.js WALKS); the shelter's bikes stand in SHELTER_BIKES.
export const WING_DOOR = doorAt(WING, 'w', (WING[2] + WING[3]) / 2);
export const STAFF_PATH = [SHED_ST[1], WING[0], WING_DOOR.at - 0.8, WING_DOOR.at + 0.8];
export const SHELTER = [WING[0] + 0.6, WING[1] - 0.6, WING[2] - 1.7, WING[2] - 0.4];
export const SHELTER_PATH = [SHED_ST[1], SHELTER[0] - 0.1, SHELTER[2], SHELTER[3]];
export const SHELTER_FLOOR = [SHELTER_PATH[0], SHELTER[1], SHELTER[2], SHELTER[3]];
export const SHELTER_BIKES = [SHELTER[0] - 0.05, SHELTER[1] + 0.05, SHELTER[2], SHELTER[3]];
export const NORTH_BED = [SHED_ST[1] + 0.3, 5.5, HZ + 0.05, HZ + 1.15]; // the raised bed along the court's north edge
// the lane, and the planted strips either side of it (the north one starts past the tower)
export const LANE = [LE, 52, HZ, HZ + 3];
export const LANE_Z = (LANE[2] + LANE[3]) / 2;
export const STRIP_S = [LE, 52, LANE[3], LANE[3] + 3.2],
  STRIP_N = [TE, 52, HZ - 1.2, HZ];
export const LANE_WALK = 35; // where the walk grid ends (the plaza trip starts before it)
export const GATE_X = 35.6; // the gateposts at the edge of head office's grounds
// the planted rhythm along the lane: trees every 4, the first 2 past the court
export const LANE_TREES = [];
for (let x = LE + 2.05; x < 52; x += 4) LANE_TREES.push(x);
// the garden south of the lane (forecourt/gardens.js): stepping stones from a gap in the lane's hedge, between the
// first two avenue trees, to a raked gravel court with a bench and a stone lantern; he can walk both
export const PATH_X = LANE_TREES[0] + 2.2;
export const GARDEN_PATH = [PATH_X - 0.4, PATH_X + 0.4, STRIP_S[2], STRIP_S[3] + 1.0];
export const GARDEN_COURT = [PATH_X - 1.3, PATH_X + 2.1, STRIP_S[3] + 1.0, STRIP_S[3] + 3.0];
// its bench, on the court's north side looking south into the garden (seat top 0.34, as the outdoor kit's bench)
export const GARDEN_BENCH = { x: GARDEN_COURT[1] - 1.0, z: GARDEN_COURT[2] + 0.45, len: 1.5, top: 0.34 };
export const inRect = (x, z, [x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1;

// the forecourt's nook (outdoor/nooks.js): the recess in front of the staff gate between the court's north bed and
// head office's corner, a bike against the bed's end, a pot and an umbrella stand by the corner (the recess is court
// already, so it adds no walk)
export const NOOKS = [
  { id: 'forecourt_staff_gate', kit: 'gate', at: [7.4, -2.6], face: Math.PI, back: 1.3, half: 1.25, bike: 1 },
];

// Shared pedestrian seam with the campus; both scenes use the forecourt coordinate frame.
export const CAMPUS_EXIT = {
  edge: [(SHED_ST[0] + SHED_ST[1]) / 2, BARRIER_Z + 0.5],
  lane: [(SHED_ST[0] + SHED_ST[1]) / 2, BARRIER_Z + 1.7],
  in: [(SHED_ST[0] + SHED_ST[1]) / 2, BARRIER_Z + 3],
  zone: [SHED_WALK[0], SHED_WALK[1], BARRIER_Z - 1, BARRIER_Z + 1.9],
};
