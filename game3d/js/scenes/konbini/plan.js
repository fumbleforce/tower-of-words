import { Nav } from '../../movement/navigation.js';
export const R = { x0: -2.08, x1: 2.08, z0: -4.34, z1: 0, h: 2.4, near: 0.2, t: 0.14 };
export const DOOR = { edge: [0, 0.12], in: [0, -0.58], out: [0, -0.42] };
export const SEAT = { x: 1.48, z: -0.98, top: 0.36, ry: 0, out: [0.86, -0.98] };
export const SPOTS = { konbini_in: DOOR.in, fridge: [-0.3, -3.07], checkout: [-0.77, -1.42], window: SEAT.out };
export const COUNTER = { x: -1.18, z: -1.38, top: 0.64 };
export const CLERK = [-1.5, -1.43];
export const BASKET = [-1.11, 0.66, -1.34];
export function konbiniNav() {
  const n = new Nav(R.x0 + 0.04, R.x1 - 0.04, R.z0 + 0.04, -0.04, 0.04);
  n.block(-2.08, -0.96, -2.2, -0.64);
  n.block(-2.08, 2.08, -4.34, -3.49);
  n.block(1.17, 2.08, -3.45, -1.53);
  n.block(1.12, 1.84, -1.23, -0.74);
  n.block(0.94, 2.08, -0.73, 0);
  return n;
}
