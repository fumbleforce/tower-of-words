import { BUILDINGS } from '../island-layout.js';
const b = BUILDINGS.find((b) => b.id === 'w3').rect;
// Rotate the real east-facing door into the room's south cutaway; no footprint enlargement.
export const R = {
  x0: -(b[3] - b[1]) / 2 + 0.16,
  x1: (b[3] - b[1]) / 2 - 0.16,
  z0: -(b[2] - b[0]) + 0.16,
  z1: 0,
  h: 2.2,
  near: 0.22,
  t: 0.14,
};
export const DOOR = { edge: [0, 0.12], in: [0, -0.9], out: [0, -0.55] };
export const SEAT = { x: 1.22, z: -1.65, top: 0.34, ry: -Math.PI / 2, out: [0.5, -1.65] };
export const SPOTS = { directory: [-0.25, -3.1], proof: [0.45, -5.8], press: [-0.1, -7.25] };
