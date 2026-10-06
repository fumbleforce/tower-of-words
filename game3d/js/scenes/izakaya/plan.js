import { BUILDINGS } from '../island-layout.js';
import { Nav } from '../../movement/navigation.js';
const [x0, z0, x1, z1] = BUILDINGS.find((b) => b.id === 'izakaya').rect;
export const R = {
  x0: -(x1 - x0) / 2 + 0.16,
  x1: (x1 - x0) / 2 - 0.16,
  z0: z0 - z1 + 0.16,
  z1: 0,
  h: 2.4,
  near: 0.2,
  t: 0.14,
};
export const DOOR = { edge: [0, 0.16], in: [0, -0.55], out: [0, -0.45] };
export const TABLE = { x: 0, z: -2.05, w: 1.65, d: 1.15, top: 0.64 };
export const SEATS = {
  party_seat: { x: -0.45, z: -1.31, top: 0.36, ry: Math.PI, out: [-0.52, -0.6] },
  party_mori: { x: -0.45, z: -2.79, top: 0.36, ry: 0, out: [-0.52, -3.5] },
  party_mio: { x: 0.45, z: -1.31, top: 0.36, ry: Math.PI, out: [0.52, -0.6] },
  party_kenji: { x: -1.16, z: -2.05, top: 0.36, ry: Math.PI / 2, out: [-1.36, -2.7] },
  party_emi: { x: 0.45, z: -2.79, top: 0.36, ry: 0, out: [0.52, -3.5] },
};
export const SPOTS = {
  izakaya_in: DOOR.in,
  party_group: [0, -2.05],
  party_food: [0, -2.05],
  party_mori: SEATS.party_mori.out,
  party_mio: SEATS.party_mio.out,
  party_kenji: SEATS.party_kenji.out,
  party_emi: SEATS.party_emi.out,
  service_counter: [1.23, -3.52],
};
export function izakayaNav() {
  const nav = new Nav(R.x0 + 0.03, R.x1 - 0.03, R.z0 + 0.03, -0.03, 0.04);
  nav.block(-0.88, 0.88, -2.63, -1.47);
  for (const s of Object.values(SEATS)) nav.block(s.x - 0.23, s.x + 0.23, s.z - 0.23, s.z + 0.23);
  nav.block(R.x0, R.x1, R.z0, -3.88);
  nav.block(1.42, R.x1, -0.72, -0.05);
  return nav;
}
