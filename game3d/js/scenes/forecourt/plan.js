// The forecourt's plan (scenes/forecourt.js): every zone as a rectangle [x0, x1, z0, z1] on the town's grid, x east
// and z south, from the station and the head office as the island layout places them. The court's and the lane's
// builders (forecourt/court.js, forecourt/lane.js) and the walk grid all read these, so the kerbs, beds and
// lamps line up with each other and with the buildings.
//
//   the main walk: one designed path from the station door to the head office door, 2.4 wide, in three legs: north
//   out of the station door to the court's axis, east along the axis, north to the head office door
//   the court: pale stone round the walk, from the station's west face to the lobby's east wall
//   the bike court: south of the court, east of the station, behind a hedge
//   the lane: east from the court's north-east corner along the tower's south face, an avenue on to the plaza
import { STATION, DOOR_X } from '../station-exterior.js';
import { T, at, DOOR_U, LU } from '../head-office/frame.js';

export { STATION, DOOR_X };
export const X0 = STATION.x0, // the station's west face: the court's west edge
  SE = STATION.x1, // its east face
  ZN = STATION.zN, // its north face: the court's south edge
  HZ = T.o[1], // the tower's south face: the court's north edge
  HO_X = at(DOOR_U, 0)[0], // the head office door
  LE = at(LU, 0)[0], // the lobby's east wall: the court's east edge
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
export const NORTH_BED = [X0 + 0.3, 5.5, HZ + 0.05, HZ + 1.15]; // the raised bed along the court's north edge
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
export const inRect = (x, z, [x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1;
