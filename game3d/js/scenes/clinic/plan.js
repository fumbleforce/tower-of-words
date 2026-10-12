// The clinic's ground floor (places/clinic.js), inside block_e1's footprint on the east lane, its (0, 0) the
// glass door at the head of the cross walk (island-layout.js east_cross). x east, z toward the lane, as in every
// interior; the camera looks in from the lane over the cut-down front wall.
//   west: the examination bay behind its curtain (the bed along the back wall, a stool, a trolley, a sink)
//   back, middle: the pharmacy's little room with its window (薬)
//   east: the reception counter with the nurse behind it, the waiting benches in front of it
//   front, west: a children's corner (a mat, soft blocks, picture books)
import { BUILDINGS, PATHS } from '../island-layout.js';
import { roomNav } from '../rooms/shell.js';

const footprint = BUILDINGS.find((b) => b.id === 'block_e1').rect,
  cross = PATHS.find((p) => p.id === 'east_cross').rect;
export const ISLAND_DOOR = [(cross[0] + cross[2]) / 2, footprint[3]];
export const R = {
  x0: +(footprint[0] - ISLAND_DOOR[0] + 0.14).toFixed(2),
  x1: +(footprint[2] - ISLAND_DOOR[0] - 0.14).toFixed(2),
  z0: +(footprint[1] - ISLAND_DOOR[1] + 0.14).toFixed(2),
  z1: 0,
  h: 2.4,
  near: 0.2,
  t: 0.14,
};
export const DOOR = { edge: [0, 0.12], in: [0, -0.95], out: [0, -0.6], w: 1.2 };
// the examination bay: from the west wall to the curtain's corner
export const BAY = { x1: -1.7, z1: -4.35 };
// the examination bed along the back wall, its head to the west; Eric sits on its front edge facing the room
export const BED = { x: -3.35, z: -6.33, len: 1.32, w: 0.52, top: 0.42 };
export const SEAT = { x: -3.2, z: -6.16, top: 0.44, ry: 0, out: [-3.2, -5.42] };
export const STOOL = [-2.2, -5.15];
export const TROLLEY = [-4.33, -5.28];
export const SINK = [-2.2, R.z0];
// the pharmacy's little room in the middle of the back wall, its window on its front
export const PHARMACY = { x0: -1.25, x1: 0.55, z: -5.75, hatch: [-0.72, 0.02] };
// the reception counter, the nurse behind it, and where a visitor stands in front of it
export const COUNTER = { x0: 1.1, x1: R.x1, z: -4.55, d: 0.4, top: 0.7 };
export const WATER = [4.5, -3.92]; // the water dispenser at the counter's east end
export const NURSE = [2.55, -5.2];
export const NURSE_BED = [-2.72, -5.62]; // beside the bed, between it and the stool, after a fall
export const SPOTS = {
  clinic_in: DOOR.in,
  reception: [2.55, -3.9],
  pharmacy: [-0.35, -5.05],
  exam_bed: SEAT.out,
  waiting: [2.6, -1.4],
};
// waiting benches: [x, z, facing (0 faces the lane), length]
export const BENCHES = [
  [4.32, -2.25, -Math.PI / 2, 2.3],
  [2.3, -2.55, Math.PI, 2.0],
  [2.3, -1.3, Math.PI, 2.0],
];
export const TABLE = [-1.15, -2.3]; // a low round table of magazines between the benches and the children's corner
export const SANITISER = [-0.9, -0.42]; // the hand-sanitiser stand inside the door
export const BLOCKS = [
  [R.x0, -2.62, R.z0, -5.98], // the bed
  [TROLLEY[0] - 0.3, TROLLEY[0] + 0.3, TROLLEY[1] - 0.24, TROLLEY[1] + 0.24],
  [STOOL[0] - 0.22, STOOL[0] + 0.22, STOOL[1] - 0.22, STOOL[1] + 0.22],
  [SINK[0] - 0.4, SINK[0] + 0.4, R.z0, R.z0 + 0.42],
  [PHARMACY.x0, PHARMACY.x1, R.z0, PHARMACY.z + 0.06],
  [COUNTER.x0, COUNTER.x1, COUNTER.z - COUNTER.d / 2, COUNTER.z + COUNTER.d / 2],
  [1.25, 3.85, R.z0, R.z0 + 0.45], // the files behind the counter
  [3.95, R.x1, -3.55, -0.95], // the bench along the east wall
  [1.15, 3.45, -2.9, -2.2], // the benches facing the counter
  [1.15, 3.45, -1.65, -0.95],
  [TABLE[0] - 0.36, TABLE[0] + 0.36, TABLE[1] - 0.36, TABLE[1] + 0.36],
  [SANITISER[0] - 0.14, SANITISER[0] + 0.14, SANITISER[1] - 0.14, SANITISER[1] + 0.14],
  [R.x0, -3.9, -3.25, -2.3], // the picture books and the soft blocks
  [WATER[0] - 0.25, R.x1, WATER[1] - 0.22, WATER[1] + 0.22],
  [0.8, 1.12, -0.48, -0.14], // the umbrella stand by the door
  [R.x1 - 0.5, R.x1, -0.75, 0], // the plant by the door's east window
  [R.x0, R.x0 + 0.5, -0.75, 0], // and the one by its west window
  [-1.68, -1.27, -6.25, -5.7], // the plant between the curtain and the pharmacy
];
export function clinicNav() {
  const nav = roomNav(R, 0.06);
  for (const b of BLOCKS) nav.block(...b);
  return nav;
}
