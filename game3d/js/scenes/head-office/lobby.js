// The head office atrium's floor and furniture (scenes/head-office.js), in the tower's frame, all on the facade's
// bay grid: the pale marble floor's joints on the bay lines; the court's dark granite walk carried in through the
// door to the reception desk, a cross walk east at the first bay line and on north to the granite apron in front of
// the lifts; the yellow guide line from the door to the desk's visitor spot. The reception desk: black and sleek
// (Jørgen, reviews/lobby-plan-1: "Desk should be black. and sleek."), straight ahead of the door, open at its east
// end so the receptionist's office door behind it can be reached; Kuro's screen and label printer on it. Two
// seating islands south of the cross walk, a stone planter with a small tree in a ring of slate-blue benches; a
// model of the island under a steel vitrine west of the door; the floor directory on a pylon by the walk to the
// lifts; a bench by the apron; plants in the corners and at the desk's closed end; the umbrella stand by the door.
// The atrium's side walls get a pale stone lining. Light: Kuro's warm light over the desk, cool pools elsewhere.
import * as THREE from 'three';
import { plant } from '../../props.js';
import { lightPool } from '../../places/life.js';
import { keyaki, LEAF } from '../outdoor/planting.js';
import { AH, LU, LN, FW, BU, DOOR_U, DOOR_W, OFFICE_DOOR, at } from './frame.js';
import { kit, C } from './kit.js';
import { signMesh } from './signs.js';

// the reception desk's middle (u, n); Kuro stands 0.65 behind it, a visitor 0.8 in front (receptionFront)
export const RECEPTION = [DOOR_U, 5.6];
const DESK = [1.2, 5.2, 5.3, 5.9]; // u0, u1, n0, n1
// the walks, granite bands 1.6 wide: in from the door to the desk, east at the first bay line (n 3.2), north up
// the bank's middle bay line to the apron in front of the lifts
const WALK_W = DOOR_W;
const J1 = 3.2,
  J2 = BU[7];
const APRON = [BU[5] - 0.1, LU - 0.06, 6.0, LN];
// the seating islands (u, n), their half width over the benches
const ISLANDS = [
  ['lobby_island_w', 5.3, 1.45],
  ['lobby_island_e', 11.7, 1.45],
];
const IH = 0.88;
const MODEL = [0.9, 2.1, 1.3, 2.1],
  PYLON = [8.55, 9.45, 4.8, 4.92],
  BENCH = [12.92, 13.36, 4.2, 5.6],
  UMBRELLA = [DOOR_U + 1.15, 0.5];

export function furniture(g, root) {
  const k = kit();
  floor(k);
  desk(k, g);
  for (const [, u, n] of ISLANDS) island(k, u, n);
  model(k);
  // the side walls' pale stone lining, the atrium's full height
  k.B(C.bank, 0.18, 0.24, 0, AH, 0.16, FW);
  k.B(C.bank, LU - 0.06, LU, 0, AH, 0.16, LN);
  // the directory pylon: slate, a steel cap, the board on its south face (signs)
  const [p0, p1, q0, q1] = PYLON;
  k.B(C.trim, p0, p1, 0, 1.6, q0, q1);
  k.gloss(C.steel, p0 - 0.02, p1 + 0.02, 1.6, 1.64, q0 - 0.02, q1 + 0.02);
  k.gloss(C.steel, p0 + 0.06, p1 - 0.06, 0, 0.05, q0 - 0.08, q1 + 0.08);
  // the bench by the lift apron, along the east wall, facing west: a stone plinth, a slate cushion
  const [b0, b1, c0, c1] = BENCH;
  k.B(C.stone, b0 + 0.04, b1, 0, 0.26, c0, c1);
  k.B(C.slate, b0, b1, 0.26, 0.34, c0 + 0.02, c1 - 0.02);
  // the umbrella stand inside the door, three umbrellas in it
  const [su, sn] = UMBRELLA;
  k.cyl(C.steelDark, su, sn, 0.12, 0.13, 0, 0.42, {}, 12);
  for (const [i, color] of ['#2f3440', '#5b6f86', '#7a6570'].entries()) {
    const a = i * 2.1,
      g2 = new THREE.CylinderGeometry(0.018, 0.035, 0.78, 6);
    g2.rotateX(Math.cos(i * 1.3) * 0.12).rotateZ(Math.sin(i * 1.7) * 0.12);
    k.p.geo(color, g2.translate(su + Math.cos(a) * 0.05, 0.42 + 0.0, -sn + Math.sin(a) * 0.05), { cast: false });
  }
  k.build(g);
  // plants: the corners by the glass, the desk's closed west end, the bench's end, the south-west corner
  for (const [u, n, s, seed] of [
    [0.62, 0.62, 1.15, 3],
    [LU - 0.6, 0.62, 1.15, 5],
    [0.72, 5.6, 1.3, 7],
    [LU - 0.42, 3.75, 0.9, 9],
  ]) {
    const pl = plant({ size: s, seed, pot: C.stone });
    pl.position.set(u, 0, -n);
    g.add(pl);
  }
  // Kuro's label printer at the desk's west end, beside her screen: a squat grey case, a strip of white label out
  // of its front slot, the roll's window on top; the marker hangs over it (places/forecourt.js label_printer)
  const printer = new THREE.Object3D();
  printer.position.set(PRINTER[0], 0.76, -PRINTER[1]);
  g.add(printer);
  // the directory board
  g.add(signMesh('ho:lobbySigns', [['directory', 0.82, (p0 + p1) / 2, 1.12, -(q0 - 0.006)]]));
  // light: Kuro's warm pool and light over the desk, cool pools on the walk and round the islands (no lamps:
  // the atrium's daylight and the light slots light it)
  const [kx, kz] = at(RECEPTION[0], RECEPTION[1] - 0.3);
  root.add(lightPool(kx, kz, 1.4, { k: 0.24, sx: 2.0 }));
  const light = new THREE.PointLight('#ffe2bf', 2.2, 4.6, 1.6);
  light.position.set(kx, 2.3, kz + 0.9);
  root.add(light);
  for (const [, u, n] of ISLANDS) root.add(lightPool(...at(u, n), 1.3, { k: 0.12, color: '#f3f1ea' }));
  return { printer };
}

// the floor: the joints on the bay lines, the walks, the apron, the door mat and the guide line
function floor(k) {
  const f = k.flat;
  for (const u of BU) if (u > 0.3 && u < LU - 0.3) f(C.joint, u - 0.012, u + 0.012, 0.012, 0.0135, 0.16, LN);
  for (const n of [1.6, 3.2, 4.8, 6.4]) f(C.joint, 0.24, LU - 0.06, 0.012, 0.0135, n - 0.012, n + 0.012);
  const y0 = 0.012,
    y1 = 0.02,
    h = WALK_W / 2;
  f(C.granite, DOOR_U - h, DOOR_U + h, y0, y1, 0.16, DESK[2] - 0.55); // in from the door
  f(C.granite, DOOR_U + h, J2 + h, y0, y1, J1 - h, J1 + h); // east at the first junction
  f(C.granite, J2 - h, J2 + h, y0, y1, J1 + h, APRON[2]); // north to the apron
  f(C.granite, ...APRON.slice(0, 2), y0, y1, ...APRON.slice(2));
  // the pale soldier course along both edges of the walks, as the court's
  for (const [u0, u1, n0, n1] of [
    [DOOR_U - h, DOOR_U - h + 0.08, 0.16, DESK[2] - 0.55],
    [DOOR_U + h - 0.08, DOOR_U + h, 0.16, J1 - h],
    [DOOR_U + h - 0.08, DOOR_U + h, J1 + h, DESK[2] - 0.55],
    [DOOR_U + h, J2 - h + 0.08, J1 + h - 0.08, J1 + h],
    [DOOR_U + h, J2 + h, J1 - h, J1 - h + 0.08],
    [J2 - h, J2 - h + 0.08, J1 + h, APRON[2]],
    [J2 + h - 0.08, J2 + h, J1 - h, APRON[2]],
  ])
    f('#a9a8a3', u0, u1, y1, y1 + 0.002, n0, n1);
  // the recessed mat inside the door, and the guide line from it to the visitor spot, ending in a square of dots
  f(C.trim, DOOR_U - 0.7, DOOR_U + 0.7, y1, y1 + 0.003, 0.2, 1.2);
  const gn = RECEPTION[1] - 0.8 - 0.3;
  f(C.tactile, DOOR_U - 0.15, DOOR_U + 0.15, y1, y1 + 0.005, 1.2, gn);
  f(C.tactile, DOOR_U - 0.3, DOOR_U + 0.3, y1, y1 + 0.005, gn, gn + 0.6);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      const u = DOOR_U - 0.225 + i * 0.15,
        n = gn + 0.075 + j * 0.15;
      f(C.tactile, u - 0.03, u + 0.03, y1 + 0.005, y1 + 0.011, n - 0.03, n + 0.03);
    }
}

// Kuro's screen and printer on the desk (u, n)
const PRINTER = [2.25, 5.66];
// the reception desk: a long black body with rounded edges, a black stone top overhanging its front, a recessed
// steel plinth line, a raised ledge for visitors; on it her screen, the printer, papers and a small plant
function desk(k, g) {
  const [u0, u1, n0, n1] = DESK;
  k.round(C.black, u0, u1, 0.06, 0.82, n0 + 0.04, n1, 0.04, { opts: { roughness: 0.22, metalness: 0.15 } });
  k.gloss(C.steelDark, u0 + 0.04, u1 - 0.04, 0, 0.06, n0 + 0.1, n1 - 0.06);
  k.round(C.blackTop, u0 - 0.04, u1 + 0.04, 0.82, 0.86, n0 - 0.04, n0 + 0.3, 0.012, {
    opts: { roughness: 0.22, metalness: 0.15 },
  });
  k.round(C.blackTop, u0, u1, 0.6, 0.64, n0 + 0.3, n1 + 0.05, 0.01, { opts: { roughness: 0.22, metalness: 0.15 } });
  // a thin steel line along the front, under the ledge
  k.gloss(C.steel, u0 + 0.02, u1 - 0.02, 0.76, 0.775, n0 + 0.035, n0 + 0.045, false);
  // her screen (back to the visitor), the printer, papers, a phone
  k.B(C.trim, 2.45, 2.95, 0.66, 0.98, 5.72, 5.75);
  k.B(C.trim, 2.67, 2.73, 0.64, 0.68, 5.74, 5.84);
  const [pu, pn] = PRINTER;
  k.B('#5d636d', pu - 0.08, pu + 0.08, 0.64, 0.74, pn - 0.1, pn + 0.1);
  k.flat('#f2f2ee', pu - 0.05, pu + 0.05, 0.665, 0.669, pn - 0.18, pn - 0.1);
  k.flat('#3e434d', pu - 0.04, pu + 0.04, 0.74, 0.752, pn - 0.02, pn + 0.06);
  k.flat(C.paper, 3.55, 3.85, 0.64, 0.652, 5.62, 5.8);
  k.flat('#3e434d', 3.95, 4.15, 0.64, 0.68, 5.66, 5.8);
  const pl = plant({ size: 0.36, seed: 12, pot: C.stone });
  pl.position.set(4.7, 0.86, -5.42);
  g.add(pl);
}

// a seating island: a round stone planter with a small tree, four low slate-blue benches round it on the grid
function island(k, u, n) {
  k.cyl(C.stone, u, n, 0.46, 0.42, 0, 0.42, {}, 18);
  k.cyl(LEAF.mulch, u, n, 0.39, 0.39, 0.42, 0.44, { cast: false }, 18);
  keyaki(k.p, u, -n, 0.72, Math.round(u));
  const L = 0.95;
  for (const [du, dn, along] of [
    [0, -0.72, 'u'],
    [0, 0.72, 'u'],
    [-0.72, 0, 'n'],
    [0.72, 0, 'n'],
  ]) {
    const [a, b] = along === 'u' ? [L / 2, 0.16] : [0.16, L / 2];
    k.B(C.stone, u + du - a + 0.04, u + du + a - 0.04, 0, 0.24, n + dn - b + 0.03, n + dn + b - 0.03);
    k.B(C.slate, u + du - a, u + du + a, 0.24, 0.32, n + dn - b, n + dn + b);
  }
}

// the island model under a steel vitrine on a stone plinth: the sea, the island in greens and sand, the towers
function model(k) {
  const [u0, u1, n0, n1] = MODEL,
    top = 0.78;
  k.B(C.stone, u0 + 0.05, u1 - 0.05, 0, top, n0 + 0.05, n1 - 0.05);
  k.flat('#5f7f99', u0 + 0.08, u1 - 0.08, top, top + 0.02, n0 + 0.08, n1 - 0.08);
  for (const [a, b, c, d, color, h] of [
    [0.25, 0.85, 0.2, 0.62, '#7c9a68', 0.035],
    [0.42, 0.95, 0.35, 0.55, '#8faa74', 0.05],
    [0.2, 0.3, 0.3, 0.55, '#d8cfb2', 0.03],
    [0.55, 0.62, 0.4, 0.47, '#e9ecf0', 0.16],
    [0.66, 0.7, 0.38, 0.44, '#e9ecf0', 0.1],
    [0.48, 0.52, 0.44, 0.49, '#c9ccd0', 0.08],
  ])
    k.B(color, u0 + a, u0 + b, top + 0.02, top + 0.02 + h, n0 + c, n0 + d, { cast: false });
  k.flat(C.trim, u0 + 0.1, u1 - 0.1, top + 0.045, top + 0.055, n0 + 0.52, n0 + 0.535); // the monorail's line
  // the vitrine: four slim steel posts and a top rim, open to the eye
  const T = top + 0.42;
  for (const u of [u0 + 0.06, u1 - 0.09])
    for (const n of [n0 + 0.06, n1 - 0.09]) k.gloss(C.steel, u, u + 0.03, top, T, n, n + 0.03, false);
  for (const [a, b, c, d] of [
    [u0 + 0.06, u1 - 0.06, n0 + 0.06, n0 + 0.09],
    [u0 + 0.06, u1 - 0.06, n1 - 0.09, n1 - 0.06],
    [u0 + 0.06, u0 + 0.09, n0 + 0.06, n1 - 0.06],
    [u1 - 0.09, u1 - 0.06, n0 + 0.06, n1 - 0.06],
  ])
    k.gloss(C.steel, a, b, T, T + 0.03, c, d, false);
}

// the same pieces as walk-grid rectangles in (u, n), and the name stone outside
export const FURNITURE = [
  [DESK[0] - 0.05, DESK[1] + 0.05, DESK[2] - 0.05, DESK[3] + 0.05], // the desk
  [0.24, DESK[1] - 1.3, DESK[3], FW], // Kuro's side, behind the desk
  [0.38, 1.06, 5.28, 5.92], // the plant at the desk's west end
  ...ISLANDS.map(([, u, n]) => [u - IH, u + IH, n - IH, n + IH]),
  MODEL,
  [UMBRELLA[0] - 0.15, UMBRELLA[0] + 0.15, UMBRELLA[1] - 0.15, UMBRELLA[1] + 0.15],
  PYLON,
  BENCH,
  [0.35, 0.9, 0.35, 0.9],
  [LU - 0.88, LU - 0.32, 0.35, 0.9],
  [LU - 0.68, LU - 0.16, 3.5, 4.0],
  [DOOR_U + 3.65, DOOR_U + 5.05, -1.35, -1.05], // name stone (outside)
];
// the nooks (docs/game/places.md): where someone stands at each, facing it
export const NOOKS = {
  lobby_model: [(MODEL[0] + MODEL[1]) / 2, MODEL[3] + 0.45],
  lobby_island_w: [ISLANDS[0][1] + IH + 0.35, ISLANDS[0][2]],
  lobby_island_e: [ISLANDS[1][1] - IH - 0.35, ISLANDS[1][2]],
  lobby_lift_bench: [BENCH[0] - 0.4, (BENCH[2] + BENCH[3]) / 2],
  lobby_umbrella: [UMBRELLA[0] + 0.5, UMBRELLA[1] + 0.3],
};
// the office door: in front of it in the lobby, and inside the room
export const OFFICE_SPOTS = { reception_office_door: [(OFFICE_DOOR[0] + OFFICE_DOOR[1]) / 2, FW - 0.55] };
