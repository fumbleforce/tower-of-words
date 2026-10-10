// The service yard north of the court (forecourt/plan.js SERVICE), between the tower and its lower wing: where
// deliveries come in and the rubbish goes out. A closed steel gate with a STAFF ONLY sign across its mouth on the
// court's edge, so it doesn't read as a way for him; inside, two roll cages of boxes by the wing's wall and a
// delivery bike, a step and a lit plate at the tower's service door (scenes/head-office/tower.js), and across the
// far end the roofed refuse store with its mesh doors, which closes the yard. Its collection doors, and the windows
// in the tower's wall along the yard, are forecourt/north.js's.
import { bollard, STEEL } from '../outdoor/furniture.js';
import { sign, bikeRow } from './details.js';
import * as P from './plan.js';

const [X0, X1, ZN, ZS] = P.SERVICE; // ZS: the court's north edge (the mouth); ZN: the tower's north face line
const CARD = ['#a8987f', '#9d8d75', '#b2a48c'];

// a roll cage (kago dai-sha): a steel frame on castors, three mesh sides, boxes stacked in it
function rollCage(p, x, z, seed) {
  const [w, d, h] = [0.62, 0.48, 1.05];
  for (const [dx, dz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    p.box(STEEL.mid, 0.03, h, 0.03, x + (dx * w) / 2, 0.06, z + (dz * d) / 2);
    p.box('#2c3038', 0.06, 0.06, 0.06, x + (dx * w) / 2, 0, z + (dz * d) / 2); // castors
  }
  p.box(STEEL.mid, w, 0.03, d, x, 0.08, z);
  for (let y = 0.3; y < h; y += 0.25) {
    p.box(STEEL.pale, w, 0.015, 0.015, x, y, z - d / 2);
    p.box(STEEL.pale, 0.015, 0.015, d, x - w / 2, y, z);
    p.box(STEEL.pale, 0.015, 0.015, d, x + w / 2, y, z);
  }
  let y = 0.11;
  for (let i = 0; i < 3 + (seed % 2); i++) {
    const bh = 0.2 + ((seed + i) % 3) * 0.06;
    p.box(CARD[(seed + i) % 3], w - 0.08 - (i % 2) * 0.08, bh, d - 0.08, x + (i % 2) * 0.03, y, z);
    y += bh + 0.005;
  }
}

// the closed gate: two leaves of vertical steel bars between posts, on a track in the paving
function gate(root, p) {
  const z = ZS - 0.3,
    h = 0.95;
  for (const x of [X0 + 0.12, X1 - 0.12]) p.box(STEEL.dark, 0.1, h + 0.1, 0.1, x, 0, z);
  p.box('#6d737c', X1 - X0, 0.01, 0.08, (X0 + X1) / 2, 0, z, { cast: false }); // the track
  for (const y of [0.1, h - 0.06]) p.box(STEEL.dark, X1 - X0 - 0.3, 0.05, 0.05, (X0 + X1) / 2, y, z);
  for (let x = X0 + 0.3; x < X1 - 0.25; x += 0.14) p.box(STEEL.mid, 0.022, h - 0.12, 0.022, x, 0.1, z);
  const s = sign('STAFF ONLY', 1.0, 0.2);
  s.position.set((X0 + X1) / 2, h - 0.28, z + 0.04);
  root.add(s);
}

// the refuse store across the far end: a block back and sides, a flat roof on them, mesh doors along the front; the
// store stops short of the tower's service door, and its back wall runs on to the tower's corner
function refuseStore(p) {
  const [z0, z1] = [ZN + 0.1, ZN + 1.5],
    [a, b] = [X0, X1 - 1.15],
    h = 1.3;
  p.box('#8b8d90', X1 - a - 0.05, h, 0.16, (a + X1) / 2, 0, z0 + 0.08, { surf: 'concrete' });
  for (const x of [a + 0.13, b - 0.08]) p.box('#8b8d90', 0.16, h, z1 - z0, x, 0, (z0 + z1) / 2, { surf: 'concrete' });
  p.box('#6f747b', b - a + 0.1, 0.08, z1 - z0 + 0.25, (a + b) / 2, h, (z0 + z1) / 2 + 0.1);
  p.box('#b0b1b0', X1 - b, 0.06, 0.22, (b + X1) / 2, h, z0 + 0.08); // the wall's coping past the store
  const frame = '#3f5a4c',
    net = '#5f7f69';
  p.box(frame, b - a - 0.3, 0.05, 0.05, (a + b) / 2, h - 0.08, z1);
  for (let x = a + 0.25; x < b - 0.15; x += 0.09) p.box(net, 0.018, h - 0.2, 0.018, x, 0.06, z1);
  for (const x of [a + 0.25, (a + b) / 2, b - 0.16]) p.box(frame, 0.05, h - 0.1, 0.05, x, 0, z1);
}

export function serviceYard(root, p) {
  gate(root, p);
  refuseStore(p);
  rollCage(p, X0 + 0.55, ZS - 2.4, 1);
  rollCage(p, X0 + 0.55, ZS - 3.1, 2);
  const bike = bikeRow(1, { seed: 4 });
  bike.rotation.y = Math.PI / 2;
  bike.position.set(X0 + 0.45, 0, ZS - 5.2);
  root.add(bike);
  // at the tower's service door: a concrete step, a bollard either side against the carts
  const dz = ZN + 1.2; // the door's middle (tower.js)
  p.box('#9a9c9e', 0.4, 0.08, 1.5, X1 - 0.2, 0, dz, { surf: 'concrete' });
  for (const z of [dz - 0.85, dz + 0.85]) bollard(p, X1 - 0.5, z);
}
