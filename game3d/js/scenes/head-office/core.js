// The head office atrium's back wall (scenes/head-office.js), square to the camera so the lift ride is filmed
// straight on: the feature wall behind the reception desk, pale stone the atrium's full height with AMAKAWA in
// steel letters, 受付 RECEPTION and a light slot along its top, the receptionist's office door in its east end;
// the stair door in the next bay; and the bank of four lifts, brushed steel doors in steel frames with a floor plate
// over each, the B2 car the west one. Behind the wall the rooms one storey high: the service room (closed, a cap
// over it), the office (head-office/office-room.js), the stair and the shafts.
// The feature wall is its own set of meshes: it fades while Eric is in the office behind it (head-office.js).
// The B2 car's doorway, jambs and the stone over it are one named mesh, cut down with the wall while Eric rides
// (places/lift-cut.js), with its cap; the rest of the wall is marked to stay.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, rbox } from '../../props.js';
import { lightPool } from '../../places/life.js';
import { GF, AH, LU, LN, FW, BACK, BU, OFFICE, OFFICE_DOOR, STAIR_U, LIFTS, T, OUT, CZ } from './frame.js';
import { kit, C } from './kit.js';
import { signMesh } from './signs.js';

const DOOR_H = 1.72; // the office door's opening
const LIFT_H = 1.45, // the lift doorways (the B2 car's as places/lift.js builds its landing)
  STAIR_H = 1.55;

// the feature wall: stone, the office door's opening, the light slot, and its signs; returns its meshes (for the fade)
export function featureWall(g) {
  const k = kit();
  const [d0, d1] = OFFICE_DOOR;
  k.B(C.stone, 0.18, d0, 0, AH, FW, BACK);
  k.B(C.stone, d0, d1, DOOR_H, AH, FW, BACK);
  k.B(C.stone, d1, BU[4], 0, AH, FW, BACK);
  // shadow joints across the stone every course, a little proud of it so they read from the camera
  for (const y of [0.9, 1.8, 2.7, 3.6])
    for (const [a, b] of [
      [0.2, d0],
      [d1, BU[4]],
    ])
      k.flat(C.bank, a, b, y - 0.012, y + 0.012, FW - 0.008, FW);
  // the office door: a dark frame round the opening and a stone sill
  k.B(C.trim, d0 - 0.06, d0, 0, DOOR_H + 0.06, FW - 0.03, BACK);
  k.B(C.trim, d1, d1 + 0.06, 0, DOOR_H + 0.06, FW - 0.03, BACK);
  k.B(C.trim, d0, d1, DOOR_H, DOOR_H + 0.06, FW - 0.03, FW + 0.05);
  // the light slot along its top, washing the stone
  k.glow(0.3, BU[4] - 0.12, AH - 0.2, AH - 0.14, FW - 0.02, FW);
  const meshes = k.build(g);
  const signs = signMesh('ho:featureSigns', [
    ['amakawa', 3.9, 3.2, 3.1, -(FW - 0.006)],
    ['reception', 2.1, 3.2, 2.35, -(FW - 0.006)],
  ]);
  g.add(signs);
  for (const m of meshes) m.name = 'ho:featureWall';
  return { meshes, signs };
}

// the back wall east of the feature wall: the stair bay and the lift bank; the caps over the back rooms; the closed
// lift doors; the B2 car's doorway (named, for the lift's cut). root: the place's root (world frame), g: the tower's
export function core(root, g) {
  const k = kit();
  const X = LIFTS[0];
  // the openings along the wall: [u0, u1, height]; the B2 car's piece is its own mesh (below)
  const holes = [[STAIR_U - 0.44, STAIR_U + 0.44, STAIR_H], ...LIFTS.slice(1).map((u) => [u - 0.6, u + 0.6, LIFT_H])];
  const b2 = [X - 0.8, X + 0.8];
  let u = BU[4];
  for (const [a, b, h] of [...holes, [...b2, null]].sort((p, q) => p[0] - q[0])) {
    k.B(C.bank, u, a, 0, AH, LN, BACK);
    if (h) k.B(C.bank, a, b, h, AH, LN, BACK);
    u = b;
  }
  k.B(C.bank, u, LU, 0, AH, LN, BACK);
  // the closed lifts: two brushed steel leaves in each, a steel frame proud of the wall, a call button
  for (const L of LIFTS.slice(1)) {
    k.gloss(C.steel, L - 0.6, L - 0.005, 0.01, LIFT_H, LN + 0.06, LN + 0.1);
    k.gloss(C.steel, L + 0.005, L + 0.6, 0.01, LIFT_H, LN + 0.06, LN + 0.1);
    frame(k, L - 0.6, L + 0.6, LIFT_H);
    k.gloss(C.steelDark, L + 0.68, L + 0.74, 0.62, 0.78, LN - 0.025, LN);
  }
  // the stair door: a dark leaf with a narrow window, in a frame
  k.B(C.trim, STAIR_U - 0.42, STAIR_U + 0.42, 0.01, STAIR_H - 0.02, LN + 0.05, LN + 0.09);
  k.B('#9fb1c2', STAIR_U - 0.08, STAIR_U + 0.08, 0.85, 1.3, LN + 0.04, LN + 0.05);
  k.gloss(C.steel, STAIR_U + 0.26, STAIR_U + 0.34, 0.7, 0.74, LN + 0.01, LN + 0.05);
  frame(k, STAIR_U - 0.44, STAIR_U + 0.44, STAIR_H);
  // the back rooms behind the wall, one storey: walls between them, the north wall's inside, a cap over the
  // service room (closed); the office is open to the camera (office-room.js), the stair and shafts under the wall
  const N1 = T.D - 0.18;
  k.B(C.cap, 0.18, OFFICE[0] - 0.06, GF - 0.012, GF, BACK, N1, { cast: false });
  for (const [a, b] of [
    [OFFICE[0] - 0.06, OFFICE[0] + 0.06],
    [OFFICE[1], OFFICE[1] + 0.12],
  ]) {
    k.B(C.bank, a, b, 0, GF, BACK, N1);
    k.B(C.cap, a - 0.004, b + 0.004, GF, GF + 0.012, BACK, N1, { cast: false });
  }
  for (const m of k.build(g)) m.userData.liftKeep = true;
  // the plates over the doors (cut away with the wall while he rides: they reach over the B2 car's doorway)
  const y = LIFT_H + 0.32;
  g.add(
    signMesh('ho:bankSigns', [
      ...LIFTS.map((L, i) => ['lift' + i, 1.15, L, y, -(LN - 0.012)]),
      ['stairs', 1.05, STAIR_U, y, -(LN - 0.012)],
    ]),
  );
  // the B2 car's doorway: jambs, lintel and the stone over it to the atrium's top, in one mesh (named: never
  // merged), and its cap; both cut down with the wall while Eric rides
  const z = (n) => -n;
  const pieces = [
    [b2[0], X - 0.62, 0],
    [X + 0.62, b2[1], 0],
    [X - 0.62, X + 0.62, LIFT_H],
  ].map(([a, b, y0]) =>
    new THREE.BoxGeometry(b - a, AH - y0, BACK - LN).translate((a + b) / 2, (y0 + AH) / 2, z((LN + BACK) / 2)),
  );
  const doorway = new THREE.Mesh(mergeGeometries(pieces), mat(C.bank));
  doorway.name = 'ho:liftWall';
  doorway.castShadow = doorway.receiveShadow = true;
  g.add(doorway);
  // a pool of cool light in front of the lifts
  root.add(lightPool(OUT[0] + 2.2, CZ + 1.0, 1.6, { k: 0.2, sx: 2.2, color: '#f3f1ea' }));
  return { doorway };
}

// a brushed steel frame round an opening u0..u1, h high, standing proud of the wall's face
function frame(k, u0, u1, h) {
  k.gloss(C.steelDark, u0 - 0.07, u0, 0, h + 0.07, LN - 0.03, LN + 0.06);
  k.gloss(C.steelDark, u1, u1 + 0.07, 0, h + 0.07, LN - 0.03, LN + 0.06);
  k.gloss(C.steelDark, u0, u1, h, h + 0.07, LN - 0.03, LN + 0.06);
  k.B(C.steelDark, u0 - 0.02, u1 + 0.02, 0, 0.014, LN - 0.1, LN + 0.06, { cast: false }); // the sill
}

// the lift's landing doors, in the B2 car's doorway (they open with the car's)
export function liftLanding(root) {
  const group = new THREE.Group();
  group.position.set(OUT[0], 0, CZ + 0.1);
  root.add(group);
  const steel = mat(C.steel, { roughness: 0.35, metalness: 0.3 });
  // its steel frame, the sill and the call button (they go down with the wall while he rides)
  const dark = mat(C.steelDark, { roughness: 0.35, metalness: 0.3 });
  // (inside the lift's cut box: no more than 1.5 cm proud of the wall's face, places/lift-cut.js)
  group.add(rbox(1.38, 0.07, 0.07, C.steelDark, { y: LIFT_H, z: -0.03, seg: 1, m: dark }));
  for (const s of [-1, 1])
    group.add(rbox(0.07, LIFT_H, 0.07, C.steelDark, { x: s * 0.655, z: -0.03, seg: 1, m: dark }));
  group.add(rbox(1.28, 0.012, 0.24, C.steelDark, { y: 0.003, seg: 1, r: 0.003 }));
  group.add(rbox(0.06, 0.16, 0.025, C.steelDark, { x: 0.88, y: 0.62, z: -0.01, seg: 1, m: dark }));
  const leaves = [-1, 1].map((s) => {
    const leaf = rbox(0.6, 1.36, 0.045, C.steel, { x: s * 0.31, z: -0.03, seg: 1, m: steel });
    group.add(leaf);
    return leaf;
  });
  const landing = { leaves, k: 0, want: 0 };
  landing.update = (dt) => {
    landing.k += (landing.want - landing.k) * Math.min(1, dt * 5);
    for (let i = 0; i < 2; i++) leaves[i].position.x = (i ? 1 : -1) * (0.31 + 0.6 * landing.k);
  };
  return landing;
}
