import { Nav } from '../../movement/navigation.js';
export const R = { x0: -2.08, x1: 2.08, z0: -4.34, z1: 0, h: 2.4, near: 0.2, t: 0.14 };
export const DOOR = { edge: [0, 0.12], in: [0, -0.58], out: [0, -0.42] };
export const SEAT = { x: 1.48, z: -0.98, top: 0.36, ry: 0, out: [0.86, -0.98] };
export const SPOTS = { bakery_in: DOOR.in, bread_rack: [-1.03, -1.42], checkout: [0.55, -2.6], window: SEAT.out };
export const COUNTER = { x: 0.55, z: -2.97, top: 0.72 };
export const CLERK = [0.55, -3.39];
export const BREADS = {
  curry_bread: { name: 'Curry bread', price: 180 },
  butter_roll: { name: 'Butter roll', price: 120 },
};
export { bakeryOpen } from '../../gameplay/shop-hours.js';
export function bakeryNav() {
  const n = new Nav(R.x0 + 0.04, R.x1 - 0.04, R.z0 + 0.04, -0.04, 0.04);
  n.block(-2.08, -1.22, -2.62, -0.65);
  n.block(-2.08, 2.08, -4.34, -2.77);
  n.block(1.12, 1.84, -1.23, -0.74);
  n.block(0.94, 2.08, -0.73, 0);
  return n;
}
