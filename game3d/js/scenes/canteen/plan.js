// Ground floor inside the existing plaza canteen footprint. The kitchen stays behind the service line.
import { CANTEEN, DOOR_X } from '../plaza/plan.js';
const centre = (CANTEEN[0] + CANTEEN[2]) / 2;
export const R = {
  x0: CANTEEN[0] - centre + 0.18,
  x1: CANTEEN[2] - centre - 0.18,
  z0: CANTEEN[1] - CANTEEN[3] + 0.18,
  z1: 0,
  h: 2.2,
  near: 0.22,
  t: 0.14,
};
export const DOOR = {
  x: DOOR_X - centre,
  edge: [DOOR_X - centre, 0.16],
  in: [DOOR_X - centre, -0.8],
  out: [DOOR_X - centre, -0.5],
};
export const PLAZA_DOOR = { edge: [DOOR_X, CANTEEN[3] + 0.34], out: [DOOR_X, CANTEEN[3] + 1.05] };
export const TABLES = [-8.5, -4.6, -0.7, 7.2].flatMap((x) => [-4.25, -1.65].map((z) => ({ x, z })));
export const COUNTER = { x: -2.7, z: -7.05, w: 11.8, d: 0.85, h: 0.65 };
export const SPOTS = { meal_counter: [-2.7, -5.85], water: [9.5, -5.35], tray_return: [-10.4, -1.3] };
// Two accessible end chairs; the approach is beside the table, never through its top or another chair.
export const SEATS = {
  canteen_seat_w: { x: 1.05, z: -1.65, top: 0.34, ry: -Math.PI / 2, out: [1.75, -1.65] },
  canteen_seat_e: { x: 5.45, z: -1.65, top: 0.34, ry: Math.PI / 2, out: [4.75, -1.65] },
};
