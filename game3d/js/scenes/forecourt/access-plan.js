// Island-frame staff boundary shared by the world and map. Public paths end on either side.
import { BUILDINGS } from '../island-layout.js';
const station = BUILDINGS.find((b) => b.id === 'station').rect;
const wing = BUILDINGS.find((b) => b.id === 'head_office_wing').rect;
const z = -7.55;
export const STAFF_GATE = [
  [station[0], z],
  [station[0] + 3, z],
];
export const STAFF_FENCE = [
  [STAFF_GATE[1], [wing[0] + 0.08, z]],
  [STAFF_GATE[0], [station[0], station[1] + 0.1]],
];
