// The receptionist's office behind the feature wall (scenes/head-office.js; Jørgen, on the atrium: "there should be
// a door on the right side to a receptioner's office, that the player could in theory visit, so the reception desk
// is not completely closed off"). One storey, open to the camera like every cut room: a slate carpet, a desk against
// the north wall with its screen and a chair pulled up, shelves of binders and boxes along the west wall, a coat
// hook by the door with Kuro's coat and an umbrella on it, a low cabinet with the kettle and two mugs, a plant, a
// wall clock. Its door stands open into the room. A cool light pool on the carpet, no lamp of its own.
import { lightPool } from '../../places/life.js';
import { plant, clock } from '../../props.js';
import { OFFICE, OFFICE_DOOR, BACK, at } from './frame.js';
import { kit, C } from './kit.js';

// the room's floor inside its walls [u0, u1, n0, n1], and the furniture as walk-grid rectangles in (u, n)
const [U0, U1, N0, N1] = [OFFICE[0] + 0.06, OFFICE[1], BACK, OFFICE[3]];
export const ROOM = [U0, U1, N0, N1];
export const ROOM_FURNITURE = [
  [U0, U0 + 0.36, N0 + 0.2, N0 + 1.25], // shelves
  [U0 + 0.5, U0 + 1.85, N1 - 0.55, N1], // desk
  [U0 + 0.95, U0 + 1.4, N1 - 0.98, N1 - 0.55], // chair
  [U1 - 0.95, U1 - 0.2, N1 - 0.4, N1], // cabinet
  [U1 - 0.2, U1, N1 - 0.65, N1], // coat hook
];

export function officeRoom(g, root) {
  const k = kit();
  k.flat('#5b6573', U0, U1, 0.012, 0.018, N0, N1); // carpet
  // the desk against the north wall: a pale top on two pedestals, its screen, keyboard, papers and a phone
  const dU = U0 + 0.5,
    dN = N1 - 0.55;
  k.B('#c9ccd0', dU, dU + 1.35, 0.6, 0.65, dN, N1 - 0.02);
  for (const u of [dU + 0.03, dU + 1.0]) k.B('#8f959e', u, u + 0.32, 0, 0.6, dN + 0.04, N1 - 0.04);
  k.B(C.trim, dU + 0.45, dU + 0.95, 0.68, 0.98, N1 - 0.2, N1 - 0.16); // the screen
  k.B(C.trim, dU + 0.66, dU + 0.74, 0.65, 0.7, N1 - 0.22, N1 - 0.12);
  k.flat('#3e434d', dU + 0.46, dU + 0.94, 0.65, 0.665, dN + 0.08, dN + 0.22); // keyboard
  k.flat(C.paper, dU + 0.08, dU + 0.36, 0.65, 0.662, dN + 0.06, dN + 0.28);
  k.flat('#3e434d', dU + 1.05, dU + 1.25, 0.65, 0.69, dN + 0.08, dN + 0.24); // phone
  // the chair, pulled up, facing the desk: seat, back, post, base
  const cU = U0 + 1.17,
    cN = N1 - 0.77;
  k.B(C.slateDark, cU - 0.2, cU + 0.2, 0.36, 0.44, cN - 0.2, cN + 0.18);
  k.B(C.slateDark, cU - 0.19, cU + 0.19, 0.44, 0.88, cN - 0.24, cN - 0.18);
  k.B(C.steelDark, cU - 0.03, cU + 0.03, 0.06, 0.36, cN - 0.03, cN + 0.03);
  k.B(C.steelDark, cU - 0.22, cU + 0.22, 0.02, 0.06, cN - 0.03, cN + 0.03);
  k.B(C.steelDark, cU - 0.03, cU + 0.03, 0.02, 0.06, cN - 0.22, cN + 0.22);
  // shelves along the west wall: a steel frame, four boards, binders and boxes
  const sN0 = N0 + 0.2,
    sN1 = N0 + 1.25;
  for (const n of [sN0, sN1 - 0.03]) k.B(C.steelDark, U0, U0 + 0.34, 0, 1.6, n, n + 0.03);
  const tones = ['#4f6178', '#c24a4a', '#e9ecf0', '#6f8f6a', '#2c3138', '#d8b24a', '#7a8796'];
  for (let i = 0; i < 4; i++) {
    const y = 0.1 + i * 0.42;
    k.B('#b9bdc2', U0, U0 + 0.34, y, y + 0.025, sN0, sN1);
    let n = sN0 + 0.05;
    for (let j = 0; n < sN1 - 0.12; j++) {
      const w = (i + j) % 4 === 3 ? 0.24 : 0.07,
        h = w > 0.1 ? 0.16 : 0.28 - ((i * 5 + j) % 3) * 0.03;
      k.B(tones[(i * 3 + j) % tones.length], U0 + 0.04, U0 + 0.3, y + 0.025, y + 0.025 + h, n, n + w);
      n += w + (j % 5 === 4 ? 0.1 : 0.012);
    }
  }
  // the low cabinet by the coat hook: the kettle, two mugs, a tea tin
  k.B('#d2d4d6', U1 - 0.95, U1 - 0.2, 0, 0.55, N1 - 0.4, N1);
  k.flat('#9aa0aa', U1 - 0.93, U1 - 0.22, 0.25, 0.27, N1 - 0.41, N1 - 0.39);
  k.cyl('#e9ecf0', U1 - 0.78, N1 - 0.2, 0.08, 0.07, 0.55, 0.75, { cast: false }, 10);
  k.B(C.trim, U1 - 0.72, U1 - 0.69, 0.66, 0.72, N1 - 0.21, N1 - 0.19, { cast: false });
  k.cyl('#4f6178', U1 - 0.55, N1 - 0.15, 0.035, 0.035, 0.55, 0.64, { cast: false }, 8);
  k.cyl('#e9ecf0', U1 - 0.45, N1 - 0.26, 0.035, 0.035, 0.55, 0.64, { cast: false }, 8);
  k.cyl('#6f8f6a', U1 - 0.33, N1 - 0.12, 0.045, 0.045, 0.55, 0.7, { cast: false }, 8);
  // the coat hook on the east wall: a steel rail with three pegs, Kuro's long navy coat and a folded umbrella
  k.B(C.steelDark, U1 - 0.04, U1, 1.48, 1.52, N1 - 0.62, N1 - 0.06);
  for (const n of [N1 - 0.52, N1 - 0.34, N1 - 0.16])
    k.B(C.steel, U1 - 0.12, U1 - 0.04, 1.44, 1.48, n - 0.015, n + 0.015);
  k.B('#2f3a4d', U1 - 0.2, U1 - 0.06, 0.62, 1.46, N1 - 0.62, N1 - 0.36);
  k.B('#2f3a4d', U1 - 0.22, U1 - 0.06, 0.55, 0.75, N1 - 0.6, N1 - 0.38);
  k.B('#283245', U1 - 0.16, U1 - 0.06, 1.36, 1.46, N1 - 0.57, N1 - 0.41); // the collar
  k.cyl('#7a6570', U1 - 0.1, N1 - 0.16, 0.02, 0.035, 0.6, 1.42, { cast: false }, 6);
  // the door, standing open into the room against the east wall
  const [, d1] = OFFICE_DOOR;
  k.B(C.trim, d1 - 0.05, d1, 0.01, 1.7, N0, N0 + 0.8);
  k.gloss(C.steel, d1 - 0.08, d1 - 0.05, 0.85, 0.89, N0 + 0.62, N0 + 0.7);
  k.build(g);
  // a plant in the south-west corner and a clock over the desk
  const pl = plant({ size: 0.7, seed: 4 });
  pl.position.set(U0 + 0.55, 0, -(N0 + 0.3));
  g.add(pl);
  const ck = clock();
  ck.scale.setScalar(0.7);
  ck.position.set(dU + 0.7, 1.55, -(N1 - 0.005));
  g.add(ck);
  const [x, z] = at((U0 + U1) / 2, (N0 + N1) / 2);
  root.add(lightPool(x, z, 1.0, { k: 0.14, sx: 1.4, color: '#f3f1ea', y: 0.024 }));
}
