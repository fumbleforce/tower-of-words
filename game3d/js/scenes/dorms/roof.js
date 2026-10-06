// The roof of Eric's block (docs/game/places.md, Eric's dorm building), up the stairs past 4F and 5F: the long flat
// roof over the flats and the corridors, grey-green waterproofing in bays with a low parapet all round, and on the
// return the stair house Eric comes out of, its steel door under a bulkhead light, an aerial on top. The water tank
// on its stand by the stair house; air-conditioner units along the back parapet; a pair of washing poles with
// someone's towels and sheets left out; polystyrene boxes of tomato plants tied to chopsticks along the front; at the
// west end two folding chairs and a crate, with a coffee can for an ashtray; and the rest (more()). Over the back
// parapet the next block, two storeys taller, its end wall with a few lit windows; past the front edge the block's
// face drops away into the dark. The sento's chimney is cut at the deck, as the corridor floors cut it.
import * as THREE from 'three';
import { lightPool } from '../../places/life.js';
import { BACK, T, CORR, RETURN, STAIR, OUT, STOREY, WEST_END, C } from './layout.js';
import { Kit } from './kit.js';
import * as PL from '../dorm-court/plan.js';

const DECK = '#7a8580',
  JOINT = '#6a746f',
  PARAPET = '#9a9ea3',
  CAP = '#b3b8bd',
  STEEL = '#7f868f',
  W0 = WEST_END - T, // the roof's outer edges
  Z0 = BACK - T,
  Z1 = CORR[1] + 0.1,
  SH = { x0: RETURN, x1: STAIR.east + T, z0: STAIR.back - T, z1: STAIR.half[1] + 0.1, h: 1.25 }, // the stair house
  TANK = [4.3, -1.75], // the water tank, on its stand
  DOOR_Z = 1.45; // the middle of its door, on its west face
export const ROOF = { x0: W0, x1: RETURN, z0: Z0, z1: Z1, door: [RETURN, DOOR_Z] };

// kit and root are the roof's own (placed at its x by the caller); nav takes the roof's own coordinates
export function roof(kit, root, nav) {
  deck(kit);
  const door = stairHouse(kit, root);
  plant(kit, root, nav);
  more(kit, root, nav);
  around(kit);
  nav.block(RETURN - 0.04, STAIR.east + 1, Z0 - 1, Z1 + 1); // the stair house and the return
  nav.block(TANK[0] - 0.6, TANK[0] + 0.62, TANK[1] - 0.5, TANK[1] + 0.5); // the water tank
  return {
    door, // the stair house door's leaf: rotation.y below 0 swings it out onto the roof
    out: [RETURN - 0.45, DOOR_Z], // just out of the door
    in: [RETURN + 0.25, DOOR_Z], // just inside it
    light: new THREE.Vector3(RETURN - 0.25, 1.3, DOOR_Z), // the bulkhead light's place
    washing: { at: [-4.75, -1.0], spot: [-2.55, -0.55] }, // from the end of the lines, clear of the sheets
    planters: { at: [-7.9, 1.55], spot: [-7.9, 0.95] },
    bench: [-9.3, -1.25], // the nook: two chairs and a crate at the west end
    units: [2.2, -2.2], // the nook: past the end of the air-conditioner units along the back
  };
}

// the roof's surface in bays between joints, the parapet round it, a drain at each end of the back
function deck(kit) {
  const cx = (W0 + RETURN) / 2,
    len = RETURN - W0;
  kit.box(DECK, len, 0.2, Z1 - Z0, cx, -0.2, (Z0 + Z1) / 2, { surf: 'concrete', cast: false });
  for (let x = W0 + 1.6; x < RETURN - 0.2; x += 1.6)
    kit.box(JOINT, 0.03, 0.004, Z1 - Z0 - 0.2, x, 0, (Z0 + Z1) / 2, { cast: false });
  kit.box(JOINT, len - 0.2, 0.004, 0.03, cx, 0, (Z0 + Z1) / 2 - 0.2, { cast: false });
  // the parapet: back, front and the west end; on the east the stair house and the return
  kit.boxes(
    PARAPET,
    [
      [len, 0.42, 0.12, cx, -0.02, Z0 + 0.06],
      [len, 0.42, 0.12, cx, -0.02, Z1 - 0.06],
      [0.12, 0.42, Z1 - Z0, W0 + 0.06, -0.02, (Z0 + Z1) / 2],
    ],
    { surf: 'concrete' },
  );
  kit.boxes(
    CAP,
    [
      [len + 0.02, 0.035, 0.16, cx, 0.4, Z0 + 0.06],
      [len + 0.02, 0.035, 0.16, cx, 0.4, Z1 - 0.06],
      [0.16, 0.035, Z1 - Z0, W0 + 0.06, 0.4, (Z0 + Z1) / 2],
    ],
    { cast: false },
  );
  for (const x of [W0 + 0.4, 2.0]) kit.cyl('#4f545b', 0.06, 0.06, 0.012, x, 0.0, Z0 + 0.22, { seg: 10, cast: false });
  // the slab's edge over the court, and under it the block's face dropping away into the dark, each floor's
  // corridor parapet a shade lighter
  kit.box('#5b6068', len, 0.22, 0.03, cx, -0.25, Z1 + 0.01, { cast: false });
  for (let f = 1; f <= 3; f++) {
    const y = -f * STOREY;
    kit.box('#3c424b', len, 0.36, 0.1, cx, y - 0.03, Z1 - 0.05, { cast: false });
    kit.box('#23272e', len, STOREY - 0.42, 0.02, cx, y + 0.36, Z1 - 0.8, { cast: false });
  }
}

// the stair house on the return: walls, its flat roof and parapet, the aerial, the door and its light
function stairHouse(kit, root) {
  const { x0, x1, z0, z1, h } = SH,
    cx = (x0 + x1) / 2,
    cz = (z0 + z1) / 2;
  // the walls round the door's opening (0.6 wide, 1.26 high), the roof slab and its cap
  const d0 = DOOR_Z - 0.3,
    d1 = DOOR_Z + 0.3;
  kit.boxes(
    PARAPET,
    [
      [T, h, d0 - z0, x0 + T / 2, 0, (z0 + d0) / 2],
      [T, h, z1 - d1, x0 + T / 2, 0, (d1 + z1) / 2],
      [T, h - 1.3, d1 - d0, x0 + T / 2, 1.3, DOOR_Z],
      [x1 - x0, h, T, cx, 0, z0 + T / 2],
      [x1 - x0, h, T, cx, 0, z1 - T / 2],
      [T, h, z1 - z0, x1 - T / 2, 0, cz],
    ],
    { surf: 'plaster' },
  );
  kit.box('#6f7975', x1 - x0 + 0.1, 0.12, z1 - z0 + 0.1, cx, h, cz, { surf: 'concrete' });
  kit.boxes(
    PARAPET,
    [
      [x1 - x0 + 0.1, 0.1, 0.07, cx, h + 0.12, z0 - 0.015],
      [x1 - x0 + 0.1, 0.1, 0.07, cx, h + 0.12, z1 + 0.015],
      [0.07, 0.1, z1 - z0 + 0.1, x0 - 0.015, h + 0.12, cz],
      [0.07, 0.1, z1 - z0 + 0.1, x1 + 0.015, h + 0.12, cz],
    ],
    { surf: 'concrete' },
  );
  kit.box('#8d939b', 0.3, 0.2, 0.3, cx + 0.3, h + 0.12, z1 - 1.0, { r: 0.02 }); // a vent hood
  kit.boxes(C.frame, [
    [T + 0.03, 1.3, 0.04, x0 + T / 2, 0, d0 - 0.02],
    [T + 0.03, 1.3, 0.04, x0 + T / 2, 0, d1 + 0.02],
    [T + 0.03, 0.05, d1 - d0 + 0.08, x0 + T / 2, 1.28, DOOR_Z],
  ]);
  // a sign by the door: the roof's opening hours
  kit.box('#f4f3ee', 0.01, 0.16, 0.22, x0 - 0.006, 0.86, d0 - 0.25, { cast: false });
  kit.box('#3f6f9e', 0.012, 0.04, 0.22, x0 - 0.008, 0.98, d0 - 0.25, { cast: false });
  // the aerial on its mast, and the lightning rod
  kit.box(STEEL, 0.03, 1.1, 0.03, x1 - 0.4, h + 0.12, z0 + 0.5, { cast: false });
  for (let i = 0; i < 5; i++)
    kit.box(STEEL, 0.5 - i * 0.07, 0.015, 0.015, x1 - 0.4, h + 0.75 + i * 0.08, z0 + 0.5, { cast: false });
  kit.box(STEEL, 0.02, 0.7, 0.02, x0 + 0.3, h + 0.12, z1 - 0.3, { cast: false });
  // the bulkhead light over the door, lit
  kit.box('#eef2f8', 0.06, 0.08, 0.16, x0 - 0.04, 1.38, DOOR_Z, {
    r: 0.02,
    cast: false,
    opts: { emissive: '#dfe7f5', emissiveIntensity: 1.1 },
  });
  root.add(lightPool(x0 - 0.6, DOOR_Z, 0.9, { color: '#dfe7f5', k: 0.2 }));
  // the door: hinged on its north edge, swinging out onto the roof
  const leaf = new Kit();
  leaf.box(C.steel, 0.03, 1.26, 0.56, 0, 0.01, 0.28, { surf: 'door' });
  leaf.box('#c9cdd2', 0.04, 0.025, 0.1, -0.03, 0.62, 0.48, { r: 0.008, cast: false });
  const door = leaf.flush(new THREE.Group());
  door.position.set(x0 + 0.02, 0, d0 + 0.02);
  root.add(door);
  // the water tank on its steel stand, on the main roof west of the stair house, its ladder on the side
  const tx = TANK[0],
    tz = TANK[1];
  kit.box(STEEL, 1.1, 0.25, 0.9, tx, 0, tz, { cast: false });
  kit.box('#b9c3c8', 1.0, 0.8, 0.8, tx, 0.25, tz, { r: 0.02, surf: 'plastic' });
  for (let i = 1; i < 4; i++) kit.box('#a3adb3', 1.01, 0.012, 0.81, tx, 0.25 + i * 0.2, tz, { cast: false });
  kit.box('#b9c3c8', 0.2, 0.06, 0.2, tx + 0.2, 1.05, tz, { cast: false });
  for (let i = 0; i < 5; i++) kit.box(STEEL, 0.02, 0.02, 0.3, tx + 0.52, 0.2 + i * 0.2, tz, { cast: false });
  kit.boxes(STEEL, [
    [0.02, 1.05, 0.02, tx + 0.52, 0, tz - 0.15],
    [0.02, 1.05, 0.02, tx + 0.52, 0, tz + 0.15],
  ]);
  kit.box('#8d939b', 0.05, 0.05, RETURN - (tx + 0.5), (tx + 0.5 + RETURN) / 2, 0, tz + 0.3, { ry: Math.PI / 2 }); // its pipe
  // the return's roof round them, its parapet on the east, the front and the back
  const re = RETURN + 3.5,
    rs = 6.65,
    rc = (RETURN + re) / 2;
  kit.box(DECK, re - RETURN, 0.2, rs - Z0, rc, -0.2, (Z0 + rs) / 2, { surf: 'concrete', cast: false });
  kit.boxes(
    PARAPET,
    [
      [re - RETURN, 0.42, 0.12, rc, -0.02, rs - 0.06],
      [re - RETURN, 0.42, 0.12, rc, -0.02, Z0 + 0.06],
      [0.12, 0.42, rs - Z0, re - 0.06, -0.02, (Z0 + rs) / 2],
      [0.12, 0.42, rs - Z1, RETURN + 0.06, -0.02, (Z1 + rs) / 2],
    ],
    { surf: 'concrete' },
  );
  kit.boxes(
    CAP,
    [
      [re - RETURN + 0.02, 0.035, 0.16, rc, 0.4, rs - 0.06],
      [re - RETURN + 0.02, 0.035, 0.16, rc, 0.4, Z0 + 0.06],
      [0.16, 0.035, rs - Z0, re - 0.06, 0.4, (Z0 + rs) / 2],
      [0.16, 0.035, rs - Z1, RETURN + 0.06, 0.4, (Z1 + rs) / 2],
    ],
    { cast: false },
  );
  return door;
}

// what people have put up here: the washing, the planters, the chairs, the units along the back
function plant(kit, root, nav) {
  // the air-conditioner units along the back parapet, on their blocks
  for (let i = 0; i < 4; i++) {
    const x = -1.4 + i * 0.85;
    kit.box('#8d939b', 0.66, 0.06, 0.3, x, 0, Z0 + 0.45, { cast: false });
    kit.box('#c9cbc8', 0.62, 0.42, 0.26, x, 0.06, Z0 + 0.45, { r: 0.015, surf: 'metal' });
    kit.cyl('#8d9197', 0.15, 0.15, 0.02, x - 0.1, 0.27, Z0 + 0.585, { seg: 14, rx: Math.PI / 2, cast: false });
  }
  nav.block(-1.9, 1.75, Z0, Z0 + 0.7);
  // the washing: two T-poles a pair, lines between, a sheet, two towels, a shirt on a hanger
  for (const [x0, x1] of [[-6.5, -3.0]]) {
    for (const x of [x0, x1]) {
      kit.box(STEEL, 0.05, 1.15, 0.05, x, 0, -1.0, { surf: 'metal' });
      kit.box(STEEL, 0.04, 0.04, 0.7, x, 1.12, -1.0, { cast: false });
      kit.cyl('#8d939b', 0.12, 0.14, 0.12, x, 0, -1.0, { seg: 8 });
      nav.block(x - 0.15, x + 0.15, -1.15, -0.85);
    }
    for (const dz of [-0.3, 0.3])
      kit.box('#c9cdd2', x1 - x0, 0.008, 0.008, (x0 + x1) / 2, 1.13, -1.0 + dz, { cast: false });
    const hang = [
      ['#e4e4df', 1.0, 0.8, -5.6, -1.3],
      ['#a9bcd6', 0.4, 0.55, -4.4, -1.3],
      ['#c96a5a', 0.35, 0.5, -3.7, -0.7],
      ['#e9e6df', 0.45, 0.5, -5.9, -0.7],
    ];
    for (const [col, w, h, x, z] of hang) kit.box(col, w, h, 0.02, x, 1.13 - h, z, { surf: 'fabric' });
    nav.block(x0, x1, -1.4, -0.6);
  }
  // the planters along the front: polystyrene boxes, tomato plants tied to chopsticks, a red one or two, a can
  for (let i = 0; i < 3; i++) {
    const x = -8.6 + i * 0.62;
    kit.box('#eceeee', 0.55, 0.22, 0.32, x, 0, Z1 - 0.32, { r: 0.01, surf: 'plastic' });
    kit.box('#5b4a3c', 0.5, 0.02, 0.27, x, 0.2, Z1 - 0.32, { cast: false });
    for (const dx of [-0.13, 0.13]) {
      kit.box('#d8c79a', 0.012, 0.55, 0.012, x + dx, 0.2, Z1 - 0.32, { cast: false });
      kit.add('#4d6b47', new THREE.IcosahedronGeometry(0.12, 0).scale(1, 1.6, 1).translate(x + dx, 0.45, Z1 - 0.32));
    }
    kit.add('#c94a3c', new THREE.IcosahedronGeometry(0.035, 0).translate(x + 0.1, 0.4, Z1 - 0.25), { cast: false });
  }
  kit.cyl('#4a8a9e', 0.07, 0.08, 0.16, -9.1, 0, Z1 - 0.3, { surf: 'plastic' });
  kit.box('#4a8a9e', 0.18, 0.02, 0.02, -9.0, 0.15, Z1 - 0.3, { rz: 0.5, cast: false });
  nav.block(-9.25, -7.0, Z1 - 0.55, Z1);
  // the west end: two folding chairs and an upturned crate between them, a coffee can on it
  const bx = -9.3,
    bz = -1.25;
  for (const [dx, ry] of [
    [-0.45, 0.5],
    [0.45, -0.4],
  ]) {
    kit.box('#3f6f9e', 0.32, 0.03, 0.3, bx + dx, 0.26, bz, { ry, surf: 'fabric' });
    kit.box('#3f6f9e', 0.32, 0.3, 0.03, bx + dx - Math.sin(ry) * 0.15, 0.3, bz - Math.cos(ry) * 0.15, {
      ry,
      surf: 'fabric',
    });
    kit.box('#5d636c', 0.3, 0.26, 0.26, bx + dx, 0, bz, { ry, cast: false });
  }
  kit.box('#4a6490', 0.32, 0.22, 0.24, bx, 0, bz + 0.05, { r: 0.01, surf: 'plastic' });
  kit.cyl('#c9a54a', 0.03, 0.03, 0.08, bx + 0.05, 0.22, bz + 0.05, { seg: 8, cast: false });
  nav.block(bx - 0.75, bx + 0.75, bz - 0.3, bz + 0.3);
  root.add(lightPool(bx, bz, 0.8, { color: '#ffd7a0', k: 0.06 }));
}

// round the roof: the next block's wall over the back parapet, two storeys taller, with its lit windows; the dark
// drop past the other edges; the sento's chimney in front of the return
function around(kit) {
  const x0 = -6.0, // dorm_1e's end, west; it runs on past the frame east
    x1 = 14,
    top = 2 * STOREY + 0.2,
    face = OUT + 0.003;
  kit.box(C.concrete, x1 - x0, top + 10, 0.3, (x0 + x1) / 2, -10, OUT - 0.15, { surf: 'concrete', cast: false });
  kit.box('#b3b8bd', x1 - x0 + 0.02, 0.05, 0.36, (x0 + x1) / 2, top, OUT - 0.15, { cast: false });
  const seams = [];
  for (let x = x0 + 1.5; x < x1; x += 1.5) seams.push([0.018, top + 10, 0.01, x, -10, face]);
  for (let y = 0.4; y < top; y += STOREY) seams.push([x1 - x0, 0.03, 0.012, (x0 + x1) / 2, y, face]);
  kit.boxes('#80847f', seams, { cast: false });
  // its small windows: stairwell and bathroom lights, some on
  const wins = [
    [-4.2, 0.6, true],
    [-1.1, 0.6, false],
    [2.3, 0.6, true],
    [-2.6, 0.6 + STOREY, false],
    [0.8, 0.6 + STOREY, true],
    [4.1, 0.6 + STOREY, false],
  ];
  for (const [x, y, lit] of wins) {
    kit.box(lit ? '#f6e6c8' : '#3d4a5c', 0.4, 0.35, 0.02, x, y, face, {
      cast: false,
      opts: lit ? { emissive: '#ffd89c', emissiveIntensity: 0.9 } : {},
    });
    kit.box(C.alu, 0.46, 0.035, 0.05, x, y - 0.035, face + 0.01, { cast: false });
  }
  kit.box('#6c7073', 0.07, top + 10, 0.07, 6.1, -10, OUT + 0.05, { cast: false });
  // the dark below past the edges
  kit.box('#22262d', 60, 0.02, 30, -2, -7.0, 0, { cast: false });
  // the sento's chimney from the court, cut at the deck as the corridor floors cut it (it would stand in front of
  // him at the stair house door)
  const cx = PL.EAST + 0.4 - 0.8 - PL.DORMS.x,
    cz = PL.SENTO.z - 2.0 - PL.DORMS.z;
  kit.box('#8c8e91', 0.4, 6.8, 0.4, cx, -7, cz, { surf: 'concrete' });
  kit.box('#31363e', 0.41, 0.02, 0.41, cx, -0.2, cz, { cast: false });
}

// more of what's up here: a fence on the back and west parapets, a futon aired over the front one, two more
// planters and a pot with a small mandarin tree, the hose reel, a plank bench along the west end, the units' duct
function more(kit, root, nav) {
  const len = RETURN - W0,
    cx = (W0 + RETURN) / 2;
  // the fence: posts and bars on the parapet's cap, a rail along the top
  const bars = [];
  for (let x = W0 + 0.1; x < RETURN - 0.05; x += 0.16) bars.push([0.018, 0.5, 0.018, x, 0.43, Z0 + 0.06]);
  for (let z = Z0 + 0.2; z < Z1 - 0.05; z += 0.16) bars.push([0.018, 0.5, 0.018, W0 + 0.06, 0.43, z]);
  kit.boxes(STEEL, bars, { cast: false });
  kit.boxes(STEEL, [
    [len, 0.03, 0.04, cx, 0.92, Z0 + 0.06],
    [0.04, 0.03, Z1 - Z0, W0 + 0.06, 0.92, (Z0 + Z1) / 2],
  ]);
  // a futon aired over the front parapet: folded over the cap, hanging both sides
  const fx = -1.2,
    fz = Z1 - 0.06;
  kit.box('#e9e6df', 0.95, 0.06, 0.2, fx, 0.42, fz, { r: 0.03, seg: 2, surf: 'fabric' });
  kit.box('#e9e6df', 0.95, 0.4, 0.05, fx, 0.04, fz - 0.1, { r: 0.02, surf: 'fabric' });
  kit.box('#e9e6df', 0.95, 0.5, 0.05, fx, -0.08, fz + 0.1, { r: 0.02, surf: 'fabric' });
  kit.box('#4a6490', 0.95, 0.08, 0.052, fx, 0.3, fz - 0.1, { surf: 'fabric', cast: false });
  for (const dx of [-0.35, 0.35]) kit.box('#c96a5a', 0.04, 0.1, 0.26, fx + dx, 0.4, fz, { cast: false }); // its pegs
  nav.block(fx - 0.55, fx + 0.55, Z1 - 0.3, Z1);
  // two more planters, and a pot with a small mandarin tree, its fruit
  for (const x of [-6.7, -6.08]) {
    kit.box('#eceeee', 0.55, 0.22, 0.32, x, 0, Z1 - 0.32, { r: 0.01, surf: 'plastic' });
    kit.box('#5b4a3c', 0.5, 0.02, 0.27, x, 0.2, Z1 - 0.32, { cast: false });
    kit.add('#5f7f58', new THREE.IcosahedronGeometry(0.13, 0).scale(1.6, 0.7, 1).translate(x, 0.3, Z1 - 0.32));
  }
  const px = -5.35,
    pz = Z1 - 0.38;
  kit.cyl('#8a5f4e', 0.2, 0.15, 0.32, px, 0, pz, { seg: 10, surf: 'ceramic' });
  kit.box('#6b5240', 0.03, 0.4, 0.03, px, 0.3, pz, { cast: false });
  kit.add('#4d6b47', new THREE.IcosahedronGeometry(0.32, 1).scale(1, 0.85, 1).translate(px, 0.88, pz));
  for (const [dx, dy, dz] of [
    [0.2, 0.8, 0.15],
    [-0.18, 0.95, 0.12],
    [0.05, 1.05, 0.22],
  ])
    kit.add('#e8902f', new THREE.IcosahedronGeometry(0.04, 0).translate(px + dx, dy, pz + dz), { cast: false });
  nav.block(-7.0, px + 0.25, Z1 - 0.62, Z1);
  // the hose reel on the back parapet's foot, its hose to a tap
  kit.cyl('#3f7a5a', 0.16, 0.16, 0.1, -6.9, 0.12, Z0 + 0.25, { seg: 14, rx: Math.PI / 2 });
  kit.box('#8d939b', 0.04, 0.3, 0.04, -6.55, 0, Z0 + 0.16, { cast: false });
  nav.block(-7.15, -6.45, Z0, Z0 + 0.42);
  // a plank bench along the west parapet, on two blocks
  const bz = 0.55;
  kit.boxes('#8d939b', [
    [0.22, 0.24, 0.2, W0 + 0.3, 0, bz - 0.45],
    [0.22, 0.24, 0.2, W0 + 0.3, 0, bz + 0.45],
  ]);
  kit.box('#9a8a72', 0.3, 0.05, 1.2, W0 + 0.3, 0.24, bz, { surf: 'laminate' });
  nav.block(W0, W0 + 0.5, bz - 0.65, bz + 0.65);
  // each flat's vent stack through the roof, a capped pipe a flat, in a row down the middle; a roof hatch
  for (let k = -4; k <= 2; k++) {
    const x = k * 2.3 + 0.35;
    if (x > -5.2 && x < -2.3) continue; // under the washing
    kit.cyl('#8d939b', 0.05, 0.05, 0.3, x, 0, -0.35, { seg: 8 });
    kit.cyl('#a3a8ae', 0.12, 0.1, 0.06, x, 0.3, -0.35, { seg: 10 });
    nav.block(x - 0.12, x + 0.12, -0.47, -0.23);
  }
  kit.box('#8d939b', 0.7, 0.22, 0.7, 1.6, 0, 0.75, { r: 0.02 });
  kit.box('#a3a8ae', 0.74, 0.04, 0.74, 1.6, 0.22, 0.75, { r: 0.01 });
  kit.box(STEEL, 0.1, 0.03, 0.04, 1.6, 0.26, 1.08, { cast: false });
  nav.block(1.2, 2.0, 0.35, 1.15);
  // the units' duct along the foot of the back parapet, east to the stair house
  kit.box('#d9d6cc', RETURN - 1.5 - 0.05, 0.07, 0.09, (1.5 + RETURN) / 2, 0, Z0 + 0.18, { cast: false });
  root.add(lightPool(-6.2, Z1 - 0.7, 1.0, { color: '#dfe7f5', k: 0.06 }));
}
