// What shows of the security room (scenes/lobby.js) through the station's cut (scenes/station-exterior.js): the
// room's own floor with its dark stone bands, the gate line (glass runs on posts, the two card readers with their
// blue pads, the scanner arch with its light strips, glass flaps and head-count screen), the guard's desk with his
// monitor, phone, plant and chair and Tama's bowl beside it, the visitor counter with its book and the lost-property
// shelf, the drinks machine, the two benches, the welcome stand, the cleaning cart, the ten plants where the room has
// them, the mats at both doors and the warm light the wall lamps and the windows throw on the floor. Everything is
// where lobby.js puts it, in the room's own frame and colours, so walking out of the room and looking back shows the
// same room. The walls round it are the station's (the cut). Nothing here moves.
import * as THREE from 'three';
import { PAL, rbox, emissive, bench, plant, tileFloor } from '../props.js';
import { pools } from './outdoor/parts.js';

export const ROOM = { X: 6.3, Z: 4.5, BZ: -0.55 }; // the room's half width and depth, the barrier line (lobby.js)

// cx, cz: the room's middle in the forecourt's frame
export function hall(root, cx, cz) {
  const { X, Z, BZ } = ROOM;
  const g = new THREE.Group();
  g.position.set(cx, 0, cz);
  root.add(g);
  const add = (...m) => g.add(...m);

  // the floor: the room's large tiles with the stone bands (the aisle from the entrance to the gate, the lines
  // along the barrier's front and back)
  add(
    tileFloor(-X + 0.09, X - 0.09, -Z + 0.09, Z - 0.09, 1.25, {
      bands: [
        ['z', -1.25, 0.28],
        ['z', 1.25, 0.28],
        ['x', -2.45, 0.28],
        ['x', 2.7, 0.28],
        ['z', -0.35, 0.06],
        ['z', 0.35, 0.06],
      ],
    }),
  );
  // mats inside the entrance and at the exit
  add(rbox(2.2, 0.012, 1.2, '#3c4658', { z: Z - 0.75, r: 0.004, cast: false }));
  add(rbox(1.9, 0.012, 1.0, '#3c4658', { x: -1, z: -Z + 0.6, r: 0.004, cast: false }));

  // the gate line: glass runs on posts either side, the card readers, the scanner arch between them
  for (const [a, b] of [
    [-X + 0.35, -1.2],
    [3.25, X - 0.35],
  ]) {
    const n = Math.max(1, Math.round((b - a) / 1.3));
    for (let i = 0; i <= n; i++) add(rbox(0.1, 0.62, 0.1, '#6b717c', { x: a + ((b - a) * i) / n, z: BZ, r: 0.02 }));
    add(rbox(b - a, 0.04, 0.08, '#7c828d', { x: (a + b) / 2, y: 0.58, z: BZ, r: 0.015 }));
    add(rbox(b - a, 0.46, 0.03, '#a9bccb', { x: (a + b) / 2, y: 0.08, z: BZ, r: 0.005, cast: false }));
    add(rbox(b - a, 0.02, 0.03, '#d6e2ea', { x: (a + b) / 2, y: 0.55, z: BZ + 0.012, r: 0.005, cast: false }));
  }
  const blue = emissive('#9fd4ff', '#6ab8ff', 1.5);
  for (const x of [-0.93, 0.93]) {
    add(rbox(0.22, 0.86, 0.34, '#2c313b', { x, z: BZ, r: 0.04 }));
    add(rbox(0.16, 0.02, 0.2, null, { x, y: 0.86, z: BZ, r: 0.006, m: blue, cast: false })); // the IC pad
    add(rbox(0.05, 0.04, 0.02, '#58c07a', { x, y: 0.62, z: BZ + 0.18, r: 0.006, cast: false })); // the green arrow
  }
  const W = 1.4,
    H = 1.57;
  for (const s of [-1, 1]) {
    add(rbox(0.17, H, 0.32, '#8b919c', { x: s * (W / 2), z: BZ, r: 0.03 }));
    add(rbox(0.03, H * 0.62, 0.05, null, { x: s * (W / 2 - 0.1), y: H * 0.22, z: BZ, r: 0.012, m: blue, cast: false }));
    add(rbox(0.5, 0.03, 0.04, '#9aa0aa', { x: s * 0.33, y: 0.66, z: BZ, r: 0.01 })); // the glass flaps' edges
    add(rbox(0.5, 0.42, 0.03, '#b7c8d4', { x: s * 0.33, y: 0.24, z: BZ, r: 0.01, cast: false }));
  }
  add(rbox(W + 0.17, 0.22, 0.36, '#7d838e', { y: H, z: BZ, r: 0.04 }));
  add(rbox(0.5, 0.04, 0.05, null, { y: H - 0.05, z: BZ + 0.16, r: 0.015, m: blue, cast: false }));
  add(rbox(0.3, 0.16, 0.05, '#23262c', { x: 0.44, y: H + 0.24, z: BZ + 0.02, r: 0.01 })); // the head count

  // the guard's desk in the barrier line: monitor on its foot facing him, a phone, a small plant; his chair behind
  add(rbox(1.9, 0.52, 0.62, '#8c929c', { x: 2.2, z: BZ, r: 0.03 }));
  add(rbox(1.96, 0.05, 0.68, '#c9ccd0', { x: 2.2, y: 0.52, z: BZ, r: 0.02 }));
  add(rbox(1.9, 0.06, 0.01, '#5b7ea8', { x: 2.2, y: 0.25, z: BZ + 0.315, r: 0.004, cast: false }));
  add(rbox(0.08, 0.1, 0.06, '#2c313b', { x: 2.4, y: 0.57, z: BZ + 0.05, r: 0.01 }));
  add(rbox(0.5, 0.3, 0.04, PAL.monitor, { x: 2.4, y: 0.66, z: BZ + 0.05, r: 0.015 }));
  add(rbox(0.2, 0.05, 0.14, '#2c313b', { x: 1.75, y: 0.57, z: BZ + 0.1, r: 0.01 }));
  add(rbox(0.28, 0.02, 0.2, PAL.paper, { x: 2.95, y: 0.57, z: BZ + 0.12, r: 0.004, cast: false }));
  const dp = plant({ size: 0.5, seed: 4 });
  dp.position.set(2.92, 0.55, BZ - 0.12);
  add(dp);
  add(rbox(0.46, 0.08, 0.44, '#2c3242', { x: 2.35, y: 0.36, z: BZ - 0.62, r: 0.04 }));
  add(rbox(0.46, 0.46, 0.08, '#2c3242', { x: 2.35, y: 0.42, z: BZ - 0.86, r: 0.04 }));
  add(rbox(0.06, 0.36, 0.06, '#3a3f48', { x: 2.35, z: BZ - 0.62, r: 0.02 }));
  add(rbox(0.18, 0.04, 0.18, '#b9bdc3', { x: 3.2, y: 0.0, z: BZ + 0.56, r: 0.02, cast: false })); // Tama's bowl

  // the visitor counter, its book, monitor and plant; the lost-property shelf beside it with a few things on it
  add(rbox(1.9, 0.52, 0.5, '#8c929c', { x: -4.2, z: 0.75, r: 0.03 }));
  add(rbox(1.96, 0.05, 0.56, '#c9ccd0', { x: -4.2, y: 0.52, z: 0.75, r: 0.02 }));
  add(rbox(1.9, 0.06, 0.01, '#5b7ea8', { x: -4.2, y: 0.25, z: 1.005, r: 0.004, cast: false }));
  add(rbox(0.34, 0.03, 0.24, PAL.paper, { x: -3.75, y: 0.57, z: 0.83, r: 0.005 }));
  add(rbox(0.3, 0.2, 0.03, PAL.monitor, { x: -4.7, y: 0.58, z: 0.67, r: 0.01 }));
  const cp = plant({ size: 0.45, seed: 11 });
  cp.position.set(-5.0, 0.57, 0.8);
  add(cp);
  add(rbox(0.5, 0.95, 0.34, '#8a909a', { x: -5.7, z: 0.55, r: 0.02 }));
  for (const y of [0.3, 0.62]) add(rbox(0.44, 0.03, 0.3, '#a3a9b2', { x: -5.7, y, z: 0.57, r: 0.005 }));
  for (const [x, y, w, h, c] of [
    [-5.82, 0.33, 0.14, 0.2, '#3f7d68'],
    [-5.6, 0.33, 0.12, 0.1, '#a2433f'],
    [-5.75, 0.65, 0.26, 0.08, '#d9b64a'],
  ])
    add(rbox(w, h, 0.14, c, { x, y, z: 0.57, r: 0.02 }));

  // the drinks machine on the east wall, its lit front facing into the room
  add(rbox(0.6, 1.25, 0.8, '#4a4f59', { x: 5.45, z: 3.0, r: 0.03 }));
  const warm = emissive('#f1d8b8', '#e8b27a', 0.7);
  add(rbox(0.02, 0.5, 0.6, null, { x: 5.14, y: 0.62, z: 3.0, r: 0.01, m: warm, cast: false }));
  add(rbox(0.04, 0.2, 0.2, '#1c1d20', { x: 5.14, y: 0.2, z: 3.0, r: 0.02 }));
  add(rbox(0.3, 0.4, 0.3, '#5b616b', { x: 5.45, z: 2.25, r: 0.04 })); // its bin

  // the benches either side of the aisle, a bag on the right one
  for (const [x, z] of [
    [-3.9, 2.55],
    [3.95, 1.3],
  ]) {
    const b = bench(2.1);
    b.position.set(x, 0, z);
    add(b);
  }
  add(rbox(0.22, 0.17, 0.1, '#5a5f6b', { x: 4.55, y: 0.29, z: 1.3, r: 0.03 }));
  // the welcome stand facing the entrance, and the cleaning cart parked by the right bench
  add(rbox(0.05, 0.62, 0.05, '#5b626d', { x: -1.9, z: 2.6, r: 0.01 }));
  add(rbox(0.3, 0.03, 0.3, '#5b626d', { x: -1.9, z: 2.6, r: 0.01 }));
  add(rbox(0.54, 0.04, 0.37, '#23262c', { x: -1.9, y: 0.6, z: 2.62, r: 0.01 }));
  add(rbox(0.9, 0.06, 0.45, '#5b6474', { x: 3.95, y: 0.06, z: 2.8, r: 0.02 }));
  add(rbox(0.06, 0.62, 0.4, '#5b6474', { x: 3.53, z: 2.8, r: 0.02 }));
  add(rbox(0.34, 0.4, 0.34, '#4a505b', { x: 3.77, y: 0.12, z: 2.8, r: 0.12, seg: 3 }));
  add(rbox(0.3, 0.3, 0.3, '#e0b83a', { x: 4.17, y: 0.12, z: 2.8, r: 0.1, seg: 3 }));

  // the plants where the room has them: along the back wall, by the barrier's ends, either side of the entrance
  // and in the front corners
  [
    [-5.7, -3.9],
    [-2.95, -3.95],
    [2.95, -3.95],
    [5.7, -3.9],
    [-5.75, -1.6],
    [5.75, -1.6],
    [-1.95, 3.95],
    [1.95, 3.95],
    [-5.8, 4.0],
    [5.8, 4.0],
  ].forEach(([x, z], i) => {
    const pl = plant({ size: 1.1, seed: i + 2 });
    pl.position.set(x, 0, z);
    add(pl);
  });

  // warm light on the floor: under the four lamps on the back wall, below each window, at the entrance
  const lit = [
    ...[-5.3, -2.9, 2.9, 5.3].map((x) => [x, -Z + 0.45, 1.0]),
    ...[-3.4, -0.4, 2.0].flatMap((z) => [
      [-(X - 0.45), z, 0.9],
      [X - 0.45, z, 0.9],
    ]),
    [0, Z - 0.4, 1.2],
  ];
  add(pools(lit, 0.85, { k: 0.26, y: 0.012 }));
  return g;
}
