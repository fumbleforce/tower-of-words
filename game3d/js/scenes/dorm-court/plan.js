// The dorm courtyard's plan (scenes/dorm-court.js): every zone as a rectangle [x0, x1, z0, z1], x east (into the
// frame's depth: the camera looks at the blocks) and z toward the camera. The court's builder (dorm-court/court.js),
// the fittings (dorm-court/fittings.js) and the walk grid all read these, so the kerbs, beds, lamps and the bike
// shelter line up with each other and with the buildings.
//
//   the walk: one path, 1.6 wide, in from the lane off the plaza (the west edge) along the court's axis to the bike
//   shelter, with two legs north off it: up to the hall doors between two low beds, and up to the sento's door
//   the aprons: pale stone between the walk and the fronts (the laundry, the hall, the sento) and south of the walk
//   the bike shelter: on the east side against the block's return, its aisle on the court (tall things on the
//   south side would stand between the camera and Eric, so the south side keeps to beds, benches and bollards)
//   the south bed: a raised bed with a low wall along the whole front, a cherry over the bench, the street beyond
export const HALL = [-1.1, 2.5], // the entrance hall: x range
  FRONT_Z = -1.2, // its glass front (cut low), with the doors
  BACK_Z = -2.9, // its back wall (full height): mailboxes and the passage
  DOOR_X = 0.5,
  PASS_X = 1.75, // the passage toward the rooms
  BLOCK_Z = BACK_Z - 1.4, // the block's south face above and behind the hall
  NEAR = 2.5, // how far toward the camera Eric can walk
  WEST = -5.2,
  EAST = 5.4;

// the fronts along the back of the court
export const LAUNDRY = { x0: -5.9, x1: -1.2, z: -1.9 };
export const SENTO = { x0: 2.9, z: -1.5 };
export const RETURN_X = 5.9; // the block's return: its west face, on the court's east side
export const RETURN_Z = 1.0; // its front

// the walk: its axis, width and soldier border
export const AZ = 0.5,
  WW = 1.6,
  BW = 0.2;
const h = WW / 2;
export const WALK = [-15, 4.3, AZ - h, AZ + h]; // along the axis, from the lane to the shelter's aisle
export const DOOR_LEG = [DOOR_X - h, DOOR_X + h, FRONT_Z + 0.09, AZ - h]; // up to the hall doors
export const SENTO_LEG = [3.2, 4.3, SENTO.z, AZ - h]; // up to the sento's door
// the raised beds either side of the door leg, in front of the hall's low glass front
export const DOOR_BEDS = [
  [HALL[0] - 0.05, DOOR_LEG[0] - 0.05, FRONT_Z + 0.1, FRONT_Z + 0.85],
  [DOOR_LEG[1] + 0.05, HALL[1] - 0.25, FRONT_Z + 0.1, FRONT_Z + 0.85],
];
// the bike shelter: posts on the return's wall, bikes nose-out to the aisle
export const SHELTER = [4.3, RETURN_X - 0.05, -1.3, 0.95];
// south-east: a bay of the south bed, and the garbage point beside it by the street
export const SE_BED = [2.0, 4.1, 1.85, 2.7];
export const GARBAGE = [4.4, 5.6, 1.75, 2.55];
// the south bed along the front, and the street pavement past it
export const SOUTH_BED = [-15, 11, 2.7, 3.95];
export const STREET = [-15, 11, 3.95, 6.0];
// the west bed: north of the lane, west of the laundry, up to the block
export const WEST_BED = [-15, LAUNDRY.x0 - 0.1, BLOCK_Z + 0.05, WALK[2] - 0.05];
// the bench beside the cherry, facing the court, and the sign stone by the hall
export const BENCH = [-2.4, 2.2];
export const STONE = [2.72, -0.68];
// the lamps: tall ones on the north side of the walk (so they never stand between the camera and Eric), at the
// lane and by the drinks machines; the east side has the shelter's light and the sento's door. Low bollard lights
// along the south bed's wall.
export const LAMPS = [
  [-6.8, AZ - h - 0.35],
  [-3.9, AZ - h - 0.35],
];
export const BOLLARDS = [
  [-6.7, 2.55],
  [-3.5, 2.55],
  [1.5, 2.55],
];
export const inRect = (x, z, [x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1;
