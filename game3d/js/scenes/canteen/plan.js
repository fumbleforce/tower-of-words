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
export const COUNTER = { x: -2.7, z: -7.05, w: 11.8, d: 0.64, h: 0.65 };
export const SPOTS = { meal_counter: [-2.7, -5.85], water: [9.5, -5.35], tray_return: [-10.4, -1.3] };
// Two accessible end chairs; the approach is beside the table, never through its top or another chair.
export const SEATS = {
  canteen_seat_shared: { x: -9.35, z: -3.52, top: 0.34, ry: Math.PI, out: [-10.1, -3.52], existing: true },
  canteen_seat_w: { x: 1.05, z: -1.65, top: 0.34, ry: -Math.PI / 2, out: [1.75, -1.65] },
  canteen_seat_e: { x: 5.45, z: -1.65, top: 0.34, ry: Math.PI / 2, out: [4.75, -1.65] },
};

// Physical service-end work surface and the staff-only route around the counter.
export const SERVICE_END = { x: 3.525, z: -6.5, w: 1.35, d: 0.46, top: 0.683 };
export const STAFF_COUNTER_ROUTE = [
  [1.8, -7.76],
  [3.9, -7.76],
  [3.9, -7.095],
  [3.85, -7.095],
];

// Stop behind the actual service edge, close enough for the current body to set down its tray.
export function staffCounterRoute(radius) {
  const route = STAFF_COUNTER_ROUTE.map((at) => [...at]);
  route.at(-1)[1] = SERVICE_END.z - SERVICE_END.d / 2 - radius - 0.01;
  return route;
}
