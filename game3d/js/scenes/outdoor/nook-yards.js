// The nook kits for the backs of things (outdoor/nooks.js lays them out and says what each holds): a building's
// back yard, a back alley, a staff gate, a bench bay's bins, a smoking corner, a jetty's end. Each lays its props in
// the nook's frame through T (outdoor/nooks.js tools): u across, v ahead of Eric as he looks in.
import * as THREE from 'three';
import { bench as seat, bins, STEEL } from './furniture.js';
import { mound, LEAF } from './planting.js';
import { rng } from './parts.js';
import { RED } from './nook-kits.js';

// a building's back: crates of empties, the air conditioners' outdoor units, buckets, pots, a hose reel and a bike,
// along the back (v = back) and down one side (side: 1 right, -1 left)
export function yard(T, { back = 1.2, side = 1, seed = 5, bike = true }) {
  const r = rng(seed);
  // the outdoor units against the back, their fans toward Eric
  for (const u of [-0.55, 0.4]) {
    T.box('#d6d8d4', 0.78, 0.56, 0.3, u, 0, back + 0.15);
    T.geo(
      '#3a3f47',
      new THREE.CylinderGeometry(0.19, 0.19, 0.02, 12).rotateX(Math.PI / 2).translate(u - 0.08, 0.3, back - 0.005),
    );
    T.box('#9aa0a8', 0.6, 0.04, 0.24, u, 0, back + 0.15, { cast: false });
  }
  T.block([-1.0, 0.85, back - 0.05, back + 0.35]);
  // crates of empties, stacked, down the side
  const su = side * 1.05;
  for (let i = 0; i < 3; i++) {
    const v = back - 0.35 - i * 0.42,
      tiers = 1 + Math.floor(r() * 3);
    for (let k = 0; k < tiers; k++) {
      const col = r() < 0.5 ? '#d9b43a' : RED;
      T.box(col, 0.42, 0.28, 0.34, su, k * 0.28, v, { turn: (r() - 0.5) * 0.12 });
      for (let b = 0; b < 4; b++)
        T.box('#5c3b28', 0.06, 0.08, 0.06, su - 0.12 + b * 0.08, k * 0.28 + 0.28, v + ((b % 2) - 0.5) * 0.14, {
          cast: false,
        });
    }
  }
  T.block([su - 0.27, su + 0.27, back - 1.4, back - 0.15]);
  // buckets and pots on the other side, a hose reel
  const ou = -side * 1.0;
  T.cyl('#3f6f9e', 0.15, 0.12, 0.3, ou, 0, back - 0.35, 10);
  T.cyl('#e0e2e0', 0.13, 0.11, 0.26, ou + side * 0.3, 0, back - 0.4, 10);
  T.cyl('#8d6a52', 0.17, 0.13, 0.26, ou, 0, back - 0.8, 8);
  mound(T.p, ...T.P(ou, back - 0.8), 0.2, LEAF.fresh, { y: 0.24 });
  T.geo('#4f8a4a', new THREE.TorusGeometry(0.17, 0.05, 6, 14).translate(ou, 0.42, back - 1.22));
  T.box(STEEL.dark, 0.05, 0.4, 0.05, ou, 0, back - 1.22);
  T.block([Math.min(ou, ou + side * 0.3) - 0.25, Math.max(ou, ou + side * 0.3) + 0.25, back - 1.45, back - 0.15]);
  if (bike) bicycle(T, side * 0.45, back - 1.75, side);
}
// a back alley's clutter along the wall at v = back, from u = -len / 2 to len / 2
export function alley(T, { back = 0.9, len = 3.6, seed = 8 }) {
  const r = rng(seed),
    u0 = -len / 2;
  // the outdoor unit, its fan toward Eric, on a low stand
  T.box('#d6d8d4', 0.78, 0.56, 0.3, u0 + 0.45, 0.06, back - 0.17);
  T.box(STEEL.dark, 0.7, 0.06, 0.26, u0 + 0.45, 0, back - 0.17);
  T.geo(
    '#3a3f47',
    new THREE.CylinderGeometry(0.19, 0.19, 0.02, 12).rotateX(Math.PI / 2).translate(u0 + 0.37, 0.36, back - 0.33),
  );
  // crates of empties, two stacks
  for (const [u, n] of [
    [u0 + 1.15, 3],
    [u0 + 1.6, 2],
  ])
    for (let k = 0; k < n; k++) {
      T.box(r() < 0.5 ? '#d9b43a' : RED, 0.42, 0.28, 0.34, u, k * 0.28, back - 0.19, { turn: (r() - 0.5) * 0.14 });
      for (let b = 0; b < 4; b++)
        T.box('#5c3b28', 0.06, 0.08, 0.06, u - 0.12 + b * 0.08, k * 0.28 + 0.28, back - 0.19, { cast: false });
    }
  // buckets, a pot with a shrub
  T.cyl('#3f6f9e', 0.15, 0.12, 0.3, u0 + 2.1, 0, back - 0.2, 10);
  T.cyl('#8d6a52', 0.17, 0.13, 0.26, u0 + 2.45, 0, back - 0.2, 8);
  mound(T.p, ...T.P(u0 + 2.45, back - 0.2), 0.2, LEAF.fresh, { y: 0.24 });
  T.block([u0 + 0.05, u0 + 2.7, back - 0.45, back]);
  // a bike along the wall, past the pot
  bikeAlong(T, u0 + 3.2, back - 0.25);
}
// a bike parked along u (beside a wall), at (u, v)
function bikeAlong(T, u, v) {
  const col = '#4f8a4a';
  for (const du of [-0.48, 0.48])
    T.geo('#2a2d31', new THREE.TorusGeometry(0.3, 0.025, 5, 16).translate(u + du, 0.31, v));
  const rod = (a, b) => {
    const A = new THREE.Vector3(...a),
      B = new THREE.Vector3(...b),
      L = A.distanceTo(B);
    const g = new THREE.CylinderGeometry(0.018, 0.018, L, 5).translate(0, L / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize()));
    T.geo(col, g.translate(...a));
  };
  rod([u - 0.48, 0.31, v], [u - 0.05, 0.62, v]);
  rod([u + 0.48, 0.31, v], [u + 0.36, 0.75, v]);
  rod([u - 0.05, 0.62, v], [u + 0.33, 0.72, v]);
  rod([u - 0.02, 0.31, v], [u - 0.05, 0.62, v]);
  rod([u - 0.02, 0.31, v], [u + 0.33, 0.72, v]);
  rod([u - 0.48, 0.31, v], [u - 0.02, 0.31, v]);
  T.box('#2a2d31', 0.2, 0.04, 0.1, u - 0.12, 0.7, v);
  T.box('#2a2d31', 0.03, 0.03, 0.42, u + 0.36, 0.9, v);
  T.box('#9aa0aa', 0.22, 0.16, 0.26, u + 0.6, 0.72, v);
  T.block([u - 0.85, u + 0.85, v - 0.22, v + 0.22]);
}

// by a staff gate at v = back: a bike against one side (bike: -1 Eric's left, 1 his right), and on the other a pot
// and an umbrella stand
export function gate(T, { back = 1.2, half = 1.2, bike = -1 }) {
  const pu = -bike * (half - 0.25);
  bicycle(T, bike * (half - 0.25), back - 0.8, bike);
  T.cyl('#6c7079', 0.19, 0.15, 0.27, pu, 0, back - 0.3, 8);
  mound(T.p, ...T.P(pu, back - 0.3), 0.24, LEAF.fresh, { y: 0.27 });
  T.cyl('#8d939b', 0.11, 0.11, 0.45, pu, 0, back - 0.75, 8);
  for (const [d, col] of [
    [-0.04, '#3f4652'],
    [0.05, RED],
    [0.0, '#e0e2e0'],
  ])
    T.cyl(col, 0.015, 0.015, 0.85, pu + d, 0.08, back - 0.75 + d, 5);
  T.block([pu - 0.25, pu + 0.25, back - 0.95, back - 0.05]);
}

// the sorted bins and a potted plant either side of a bay's bench
export function binsKit(T, { back = 0.6, half = 1.0, bins: withBins = true }) {
  if (withBins) {
    const [x, z] = T.P(half, back);
    bins(T.p, x, z, T.a + Math.PI);
    T.block([half - 0.42, half + 0.42, back - 0.2, back + 0.2]);
  }
  T.cyl('#6c7079', 0.18, 0.14, 0.26, -half, 0, back, 8);
  mound(T.p, ...T.P(-half, back), 0.22, LEAF.fresh, { y: 0.26 });
  T.block([-half - 0.22, -half + 0.22, back - 0.22, back + 0.22]);
}

// a plain bicycle standing along v, leaning on its stand
function bicycle(T, u, v, side) {
  const col = '#3f6f9e';
  for (const dv of [-0.48, 0.48])
    T.geo('#2a2d31', new THREE.TorusGeometry(0.3, 0.025, 5, 16).rotateY(Math.PI / 2).translate(u, 0.31, v + dv));
  const rod = (a, b, rr = 0.018) => {
    const A = new THREE.Vector3(...a),
      B = new THREE.Vector3(...b),
      L = A.distanceTo(B);
    const g = new THREE.CylinderGeometry(rr, rr, L, 5).translate(0, L / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize()));
    T.geo(col, g.translate(...a));
  };
  rod([u, 0.31, v - 0.48], [u, 0.62, v - 0.05]);
  rod([u, 0.31, v + 0.48], [u, 0.75, v + 0.36]);
  rod([u, 0.62, v - 0.05], [u, 0.72, v + 0.33]);
  rod([u, 0.31, v - 0.02], [u, 0.62, v - 0.05]);
  rod([u, 0.31, v - 0.02], [u, 0.72, v + 0.33]);
  rod([u, 0.31, v - 0.48], [u, 0.31, v - 0.02]);
  T.box('#2a2d31', 0.1, 0.04, 0.2, u, 0.7, v - 0.12); // the saddle
  T.box('#2a2d31', 0.42, 0.03, 0.03, u, 0.9, v + 0.36); // the bars
  T.box('#9aa0aa', 0.26, 0.16, 0.22, u, 0.72, v + 0.6); // the basket
  T.block([u - 0.2, u + 0.2, v - 0.85, v + 0.85]);
  void side;
}

// a smoking corner: frosted screens round three sides, a standing ashtray in the middle, a bench on one side, the
// sign on the back screen
export function smokers(T, { back = 1.5, half = 1.2, seed = 6 }) {
  const pane = '#c9d1d6',
    post = STEEL.mid;
  for (const u of [-half, -half / 3, half / 3, half]) T.box(post, 0.05, 1.7, 0.05, u, 0, back);
  T.box(pane, 2 * half, 1.35, 0.03, 0, 0.25, back, { cast: false });
  for (const s of [-1, 1]) {
    T.box(post, 0.05, 1.7, 0.05, s * half, 0, back - 0.8);
    T.box(pane, 0.03, 1.35, 0.8, s * half, 0.25, back - 0.4, { cast: false });
  }
  T.block([-half - 0.1, half + 0.1, back - 0.05, back + 0.1]);
  for (const s of [-1, 1]) T.block([s * half - 0.08, s * half + 0.08, back - 0.85, back]);
  T.card('きつえんじょ', 'Smoking area', 0.6, 0.26, 0, 1.25, back - 0.02);
  T.cyl('#9aa0a8', 0.17, 0.17, 0.82, 0.2, 0, back - 0.6, 10);
  T.cyl('#3a3f47', 0.18, 0.18, 0.04, 0.2, 0.82, back - 0.6, 10);
  T.block([0.0, 0.4, back - 0.8, back - 0.4]);
  const [x, z] = T.P(-half + 0.35, back - 0.55);
  seat(T.p, x, z, T.a + Math.PI / 2, { len: 1.0, back: false });
  T.block([-half, -half + 0.6, back - 1.1, back - 0.05]);
  void seed;
}

// a jetty's end: bollards at the corners of the edge (v = edge), a life ring on its post, a coil of rope, a bucket,
// a folding stool, a fish crate
export function pier(T, { edge = 1.4, span = 1.3, seed = 7 }) {
  for (const u of [-span, span]) {
    T.cyl('#2f3338', 0.13, 0.16, 0.32, u, 0, edge - 0.25, 10);
    T.cyl('#2f3338', 0.2, 0.2, 0.06, u, 0.32, edge - 0.25, 10);
    T.block([u - 0.22, u + 0.22, edge - 0.47, edge - 0.03]);
  }
  // the life ring on its post
  T.box(STEEL.dark, 0.06, 1.1, 0.06, span + 0.1, 0, edge - 1.1);
  T.geo('#e8e5df', new THREE.TorusGeometry(0.24, 0.06, 6, 16).translate(span + 0.1, 0.78, edge - 1.06));
  for (let i = 0; i < 4; i++)
    T.geo(
      RED,
      new THREE.TorusGeometry(0.24, 0.062, 6, 3, Math.PI / 4)
        .rotateZ((i * Math.PI) / 2 + 0.2)
        .translate(span + 0.1, 0.78, edge - 1.06),
    );
  T.block([span - 0.05, span + 0.25, edge - 1.25, edge - 0.95]);
  // the coil, the bucket, the stool, the crate
  T.geo('#c9b98f', new THREE.TorusGeometry(0.22, 0.05, 5, 14).rotateX(Math.PI / 2).translate(-0.45, 0.05, edge - 0.45));
  T.geo(
    '#c9b98f',
    new THREE.TorusGeometry(0.15, 0.045, 5, 12).rotateX(Math.PI / 2).translate(-0.45, 0.13, edge - 0.45),
  );
  T.cyl('#e0b33b', 0.14, 0.11, 0.28, 0.3, 0, edge - 0.5, 10);
  T.box('#3f6f9e', 0.3, 0.04, 0.3, -span + 0.3, 0.42, edge - 1.1);
  for (const d of [-0.11, 0.11]) T.box(STEEL.mid, 0.03, 0.42, 0.03, -span + 0.3 + d, 0, edge - 1.1);
  T.box('#6f8fa8', 0.55, 0.26, 0.38, -span + 0.4, 0, edge - 1.65);
  T.block([-0.75, -0.15, edge - 0.75, edge - 0.15]); // the coil
  T.block([0.12, 0.48, edge - 0.68, edge - 0.32]); // the bucket
  T.block([-span + 0.1, -span + 0.5, edge - 1.3, edge - 0.9]); // the stool
  T.block([-span + 0.08, -span + 0.72, edge - 1.88, edge - 1.42]); // the crate
  void seed;
}
