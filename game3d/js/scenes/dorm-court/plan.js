// The dorm courtyard's plan (scenes/dorm-court.js): every zone as a rectangle [x0, x1, z0, z1], x east (into the
// frame's depth: the camera looks at the blocks) and z toward the camera. The court's builder (dorm-court/court.js),
// the fittings (dorm-court/fittings.js) and the walk grid all read these, so the kerbs, beds, lamps and the bike
// shelter line up with each other and with the buildings.
//
// Two axes. North-south, the way in: the lane home (route_home, the plaza's brick lane) runs along the front as the
// street, and turns in through the gateway in the front bed, on the hall doors' axis: through the gate, across the
// walk and up the door leg to the doors, one straight line. East-west, the court's walk: from the garden at the west
// end, past the drinks machines, the laundry, the hall and the sento, to the bike shelter.
//   the walk: dark granite, 1.6 wide, with a pale border; legs north to the hall doors (between two low beds) and
//   to the sento door, and the gate link south to the street, as wide as the door leg and on its axis
//   the aprons: pale stone between the walk and the fronts, and between the walk and the front bed
//   the front bed: raised, with a low wall, along the whole front, opened only for the gate: a pier with a lantern
//   either side of the opening, a pine behind each; the court is closed on the west by the garden, walled the same
//   the street: the lane, 3 wide, grey brick between pale borders; a verge on its far side
//   the bike shelter: on the east side against the block's return, its roof out over the whole rack (tall things on
//   the south side would stand between the camera and Eric, so the south side keeps to beds, benches and bollards)
import { CHUNKS, PATHS } from '../island-layout.js';

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
export const STOREY = 1.75; // the block's floor-to-floor height
// the stair window on the return's west face (z range): along the flights, which start where the corridors end
export const STAIR_WINDOW = [-3.55, -1.5];

// the walk: its axis, width and soldier border
export const AZ = 0.5,
  WW = 1.6,
  BW = 0.2;
const h = WW / 2;
export const GARDEN_X = LAUNDRY.x0 - 0.1; // the garden's wall, in line with the laundry's west end
export const WALK = [GARDEN_X, 4.3, AZ - h, AZ + h]; // along the axis, from the garden to the shelter's aisle
export const DOOR_LEG = [DOOR_X - h, DOOR_X + h, FRONT_Z + 0.09, AZ - h]; // up to the hall doors
export const SENTO_LEG = [3.2, 4.3, SENTO.z, AZ - h]; // up to the sento's door
// the raised beds either side of the door leg, in front of the hall's low glass front
export const DOOR_BEDS = [
  [HALL[0] - 0.05, DOOR_LEG[0] - 0.05, FRONT_Z + 0.1, FRONT_Z + 0.85],
  [DOOR_LEG[1] + 0.05, HALL[1] - 0.25, FRONT_Z + 0.1, FRONT_Z + 0.85],
];
// the bike shelter: posts on the return's wall (and one past its corner), bikes nose-out to the aisle; the roof
// runs on past the return's front so it covers the rack as the camera sees it
export const SHELTER = [4.3, RETURN_X - 0.05, -1.3, 1.9];
export const RACK = [-1.0, 0.7]; // the rack's first and last places, north to south, well under the roof
// south-east: a bay of the front bed, and the garbage point beside it
export const SE_BED = [2.0, 4.1, 1.85, 2.7];
export const GARBAGE = [4.4, 5.6, 1.98, 2.62];
// the front bed, the street (the lane) past it, and the verge on the street's far side. The bed ends where the dorm
// row (dorm-court/cluster.js) leaves the street, south of the block's return: the row's north edge in this frame
export const ROW_X = PATHS.find((p) => p.id === 'dorm_row').rect[1] - CHUNKS.dorm_court.at[1];
export const SOUTH_BED = [GARDEN_X, ROW_X, 2.7, 3.8];
export const STREET = [-16, 16, 3.8, 6.8];
// the gate: the opening in the front bed on the door leg's axis, and the link paved through it
export const GATE = [DOOR_LEG[0] - 0.1, DOOR_LEG[1] + 0.1]; // the opening's x range
export const LINK = [DOOR_LEG[0], DOOR_LEG[1], AZ + h, STREET[2]];
export const PIERS = [GATE[0] - 0.25, GATE[1] + 0.25]; // the gate piers' x, in the bed's ends
// the garden: west of the laundry, from the block to the front bed, walled on the court side
export const GARDEN = [-16, GARDEN_X, BLOCK_Z + 0.05, SOUTH_BED[3]];
// the bench beside the cherry, facing the court, and the sign stone by the hall
export const BENCH = [-2.9, 2.2];
export const STONE = [2.72, -0.68];
// the lamps: tall ones on the north side of the walk (so they never stand between the camera and Eric), by the
// drinks machines and on the walk's axis in the garden, where the walk ends; the gate's lanterns, the shelter's
// light and the sento's door light the rest. Low bollard lights along the front bed's wall.
export const LAMPS = [
  [-3.9, AZ - h - 0.35],
  [GARDEN_X - 0.45, AZ],
];
export const BOLLARDS = [
  [-5.1, 2.55],
  [-1.3, 2.55],
];
// Eric's floor (the dorms scene) in the court's frame: where the dorms scene's origin sits (both chunks are turned
// the same way, so only shifted; from their places in the island layout) and the height of its floor, 2F
export const DORMS = {
  x: CHUNKS.dorms.at[1] - CHUNKS.dorm_court.at[1],
  z: CHUNKS.dorm_court.at[0] - CHUNKS.dorms.at[0],
  y: 2.45,
};
// the hall: the mailbox bank's middle on the back wall, and the manager's window beside the passage (x range)
export const MAIL_X = -0.22,
  MANAGER = [0.66, 1.16];
export const POOL_Y = 0.02; // light pools on the paving sit above its stones (0.006-0.008), or the two fight for depth
export const inRect = (x, z, [x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1;
