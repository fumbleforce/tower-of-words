import { BUILDINGS } from '../island-layout.js';
import { front } from '../harbour/plan.js';
import { roomNav } from '../rooms/shell.js';
const footprint = BUILDINGS.find((b) => b.id === 'ferry_terminal').rect;
export const ISLAND_DOOR = front('ferry_terminal').door;
export const R = {
  x0: footprint[0] - ISLAND_DOOR[0] + 0.14,
  x1: footprint[2] - ISLAND_DOOR[0] - 0.14,
  z0: footprint[1] - ISLAND_DOOR[1] + 0.14,
  z1: 0,
  h: 2.6,
  near: 0.2,
  t: 0.14,
};
export const DOOR = { edge: [0, 0.12], in: [0, -0.95], out: [0, -0.55] };
export const STAFF = [4.6, -6.62];
export const READER = { x: -5.7, z: -5.8, ry: 0, top: 0.34 };
export const TRAVELLER = { x: -5.7, z: -2.8, ry: Math.PI, top: 0.34 };
export const SEATS = {
  ferry_landing_seat: { x: 4.3, z: -2.1, ry: Math.PI, top: 0.34, out: [4.3, -2.95] },
  ferry_notice_seat: { x: 0.4, z: -5.05, ry: 0, top: 0.34, out: [0.4, -4.2] },
  ferry_window_seat: { x: -4.55, z: -2.8, ry: Math.PI, top: 0.34, out: [-4.55, -3.65] },
  ferry_quiet_seat: { x: -4.55, z: -5.8, ry: 0, top: 0.34, out: [-4.55, -4.95] },
};
export const SPOTS = {
  ferry_in: DOOR.in,
  ferry_counter: [4.6, -4.95],
  ferry_reader: [-5.7, -4.8],
  ferry_traveller: [-3.05, -3.7],
  ferry_luggage_corner: [-6.6, -3.8],
  ferry_notice_recess: [1.6, -6.65],
};
export const BAG_HOME = [-4.55, 0.34, -2.94];
export const BAG_FLOOR = [-6.35, 0.035, -3.1];
export const BLOCKS = [
  [-0.62, 1.12, -3.4, -2.6],
  [2.7, 6, -2.4, -1.75],
  [-1.4, 1.9, -5.4, -4.7],
  [6.6, 7.55, -3.7, -0.4],
  [-2.05, 1.95, -7.85, -7.1],
  [4.0, 6.52, R.z0, R.z0 + 0.38],
  [7.03, 7.54, -5.47, -4.99],
  [-6.8, -3.5, -6.15, -5.5],
  [-6.8, -3.5, -3.1, -2.45],
  [2.85, 6.65, -6.48, -5.62],
  [6.9, R.x1, -7.85, -5.9],
  [R.x0, -6.9, -5.8, -3.8],
  [0.85, 1.35, -0.75, -0.05],
  [-6.68, -6.02, -3.37, -2.82],
];
export function terminalNav() {
  const nav = roomNav(R, 0.08);
  for (const b of BLOCKS) nav.block(...b);
  return nav;
}
