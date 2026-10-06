// The doors along Eric's corridor: a flat's front door as the corridor sees it (frame, steel leaf, mail slot, the
// kitchen window beside it behind its grille, lit where someone's home, the meter box, what's left at the door),
// the numbers over the doors, Eric's own front at full height for the walk along the corridor, and the floor's
// notice board on the corridor wall by the stairs.
import * as THREE from 'three';
import { Kit } from './kit.js';
import { plates } from './plates.js';
import { textTexture, plane } from '../../props.js';
import { X0, X1, NEAR, H, FRONT_LOW, T, DOOR, CORRIDOR, C } from './layout.js';

// the flats' numbers along a floor, by their place from Eric's (k), counted from the stairs: no 4
export const FLATS = [2, 1, 0, -1, -2, -3];
export const number = (floor, k) => `${floor}0${[1, 2, 3, 5, 6, 7][2 - k]}`;
export const DOOR_C = (DOOR[0] + DOOR[1]) / 2;
// what is at each door on 2F (and 3F, places/dorms/upper.js): its kitchen window lit where someone's home, and what
// they've left outside
export const DOORS_2F = {
  2: {},
  1: { lit: true, at: ['umbrella', 'sandals'] }, // 202: home, the TV on
  '-1': { at: ['pot', 'parcel'] }, // 205: out
  '-2': { lit: true }, // 206: the desk lamp
  '-3': { at: ['crate'] }, // 207
};

// the corridor light on the wall beside a door at c
export function corridorLight(kit, c, zf) {
  kit.box('#eef2f8', 0.14, 0.08, 0.06, c + 0.36, 1.36, zf + 0.03, {
    r: 0.02,
    cast: false,
    opts: { emissive: '#dfe7f5', emissiveIntensity: 0.9 },
  });
}

// Eric's front seen from the corridor: the wall full height over the cut-low one, his door shut, its fittings like
// the neighbours' (dark: he isn't home) and its number. His door's leaf is its own group, hinged on its left edge
// (userData.leaf): going in (places/dorms.js) it swings out onto the corridor, he steps through, and the tall front
// fades out to the cut-low one the room is seen through.
export function tallFront() {
  const kit = new Kit(),
    zf = NEAR + T,
    [d0, d1] = DOOR,
    z = NEAR + T / 2;
  kit.box(C.facade, d0 - (X0 - T), H - FRONT_LOW, T, (X0 - T + d0) / 2, FRONT_LOW, z, { surf: 'plaster' });
  kit.box(C.facade, X1 + T - d1, H - FRONT_LOW, T, (d1 + X1 + T) / 2, FRONT_LOW, z, { surf: 'plaster' });
  kit.box(C.facade, d1 - d0, H - 1.3, T, DOOR_C, 1.3, z, { surf: 'plaster' });
  kit.box(C.wallTop, X1 - X0 + 2 * T, 0.035, T + 0.03, 0, H, z, { cast: false });
  const leafKit = new Kit();
  neighbourDoor(kit, DOOR_C, zf, {}, leafKit);
  corridorLight(kit, DOOR_C, zf);
  const g = kit.flush(new THREE.Group());
  g.add(plates([['203', DOOR_C, 1.43, zf + 0.017, 0.24, 0.12]]));
  const hinge = new THREE.Group(),
    hx = DOOR_C - 0.28,
    hz = zf + 0.025;
  hinge.position.set(hx, 0, hz);
  hinge.add(leafKit.flush(new THREE.Group()).translateX(-hx).translateZ(-hz));
  g.add(hinge);
  g.userData.leaf = hinge;
  return g;
}

// a flat's front door at c: its frame and steel leaf (into `leaf`, Eric's own swings open), the kitchen window beside
// it behind its grille, the meter box, and what's left at the door (`at`: umbrella, sandals, pot, parcel, crate,
// cans, chime, boots)
export function neighbourDoor(kit, c, zf, { lit = false, at = [] } = {}, leaf = kit) {
  const z = zf + 0.02;
  kit.boxes(C.frame, [
    [0.04, 1.3, 0.05, c - 0.3, 0, z],
    [0.04, 1.3, 0.05, c + 0.3, 0, z],
    [0.64, 0.05, 0.05, c, 1.28, z],
  ]);
  leaf.box(C.steel, 0.56, 1.26, 0.03, c, 0.01, z + 0.005, { surf: 'door' });
  leaf.box('#c9cdd2', 0.1, 0.025, 0.04, c + 0.2, 0.62, z + 0.03, {
    r: 0.008,
    cast: false,
  });
  leaf.box('#2f333b', 0.16, 0.035, 0.01, c, 0.82, z + 0.022, { cast: false });
  // the kitchen window beside the door, frosted, behind a grille; lit where someone's home
  const wx = c - 0.62;
  kit.box(lit ? '#f0dcb4' : '#aeb8c0', 0.3, 0.36, 0.01, wx, 0.72, zf + 0.017, {
    // out of the facade's skin
    cast: false,
    opts: lit ? { emissive: '#ffcf8a', emissiveIntensity: 0.55 } : {},
  });
  const bars = [[0.36, 0.02, 0.02, wx, 0.7, zf + 0.04]];
  for (let i = 0; i < 5; i++) bars.push([0.012, 0.42, 0.012, wx - 0.14 + i * 0.07, 0.69, zf + 0.045]);
  bars.push([0.36, 0.02, 0.02, wx, 1.1, zf + 0.04]);
  kit.boxes(C.alu, bars, { cast: false });
  // the meter box
  kit.box('#b4b8bc', 0.15, 0.22, 0.06, c + 0.52, 0.9, zf + 0.03, {
    r: 0.01,
    cast: false,
  });
  for (const a of at) LEFT[a](kit, c, zf);
}

// what people leave at their doors, by the door at c
const LEFT = {
  umbrella: (kit, c, zf) => kit.cyl('#3d4d6b', 0.012, 0.035, 0.62, c + 0.36, 0, zf + 0.08, { rz: -0.12, seg: 6 }),
  sandals: (kit, c, zf) => {
    for (const dx of [-0.05, 0.05])
      kit.box('#3d4d6b', 0.06, 0.025, 0.14, c - 0.2 + dx, 0, zf + 0.14, { r: 0.01, ry: 0.1 });
  },
  pot: (kit, c, zf) => {
    kit.cyl('#b3aea5', 0.07, 0.055, 0.12, c - 0.38, 0, zf + 0.12, { seg: 10 });
    kit.cyl('#4d6b47', 0.02, 0.09, 0.16, c - 0.38, 0.12, zf + 0.12, { seg: 7 });
  },
  // a parcel left at the door, its slip on top
  parcel: (kit, c, zf) => {
    kit.box('#b09474', 0.26, 0.16, 0.2, c + 0.1, 0, zf + 0.16, { r: 0.008, ry: 0.15, surf: 'card' });
    kit.box('#f2f0ea', 0.1, 0.004, 0.07, c + 0.12, 0.16, zf + 0.16, { ry: 0.15, cast: false });
  },
  // a plastic crate of empty bottles waiting for collection day
  crate: (kit, c, zf) => {
    kit.box('#4a6490', 0.3, 0.17, 0.2, c - 0.36, 0, zf + 0.13, { r: 0.01, surf: 'plastic' });
    for (let i = 0; i < 4; i++)
      kit.cyl(i % 2 ? '#6f8f6a' : '#8a6a4e', 0.025, 0.025, 0.16, c - 0.47 + i * 0.075, 0.08, zf + 0.13, { seg: 6 });
  },
  // a clear bag of cans, tied off
  cans: (kit, c, zf) =>
    kit.box('#cfd6dc', 0.24, 0.2, 0.18, c - 0.38, 0, zf + 0.13, { r: 0.06, seg: 2, surf: 'plastic' }),
  // a glass wind chime from the door's light, its paper strip
  chime: (kit, c, zf) => {
    kit.cyl('#9fc6d8', 0.035, 0.04, 0.045, c + 0.36, 1.18, zf + 0.06, { seg: 8, cast: false });
    kit.box('#e9e1cf', 0.035, 0.14, 0.004, c + 0.36, 1.02, zf + 0.06, { cast: false });
  },
  // work boots, toes to the wall
  boots: (kit, c, zf) => {
    for (const dx of [-0.05, 0.05]) kit.box('#3a3f48', 0.07, 0.11, 0.15, c + 0.2 + dx, 0, zf + 0.13, { r: 0.015 });
  },
};

// the floor's notice board on the corridor wall at x, between the last door and the stairs: an aluminium frame
// round a grey board with the floor's notices pinned up on it (one texture)
export function noticeBoard(kit, root, x) {
  const zf = NEAR + T,
    W = 0.66,
    Hb = 0.46,
    y = 0.62;
  kit.box(C.alu, W + 0.04, Hb + 0.04, 0.025, x, y - 0.02, zf + 0.012, { cast: false });
  const board = plane(W, Hb, textTexture(notices, 330, 230));
  board.position.set(x, y + Hb / 2, zf + 0.027);
  root.add(board);
  return { at: [x, zf], spot: [x + 0.55, zf + CORRIDOR / 2], y: y + Hb }; // read from beside it, not in front
}
function notices(g, w, h) {
  g.fillStyle = '#9ea4ab';
  g.fillRect(0, 0, w, h);
  // [x, y, w, h, paper, the heading band's colour]
  const papers = [
    [12, 14, 104, 140, '#f4f3ee', '#3f6f9e'],
    [124, 10, 92, 76, '#f1e6b8', null],
    [226, 18, 92, 120, '#f4f3ee', '#4f8a4a'],
    [128, 96, 88, 118, '#dbe6f0', null],
    [24, 164, 92, 56, '#f2dcdc', null],
    [232, 148, 84, 70, '#f4f3ee', '#d9473c'],
  ];
  for (const [x, y, pw, ph, paper, band] of papers) {
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillRect(x + 2, y + 3, pw, ph);
    g.fillStyle = paper;
    g.fillRect(x, y, pw, ph);
    if (band) {
      g.fillStyle = band;
      g.fillRect(x, y, pw, 16);
    }
    g.fillStyle = '#7d838c';
    for (let ly = y + (band ? 26 : 12); ly < y + ph - 8; ly += 10) g.fillRect(x + 8, ly, pw - 16 - ((ly * 7) % 23), 3);
    g.fillStyle = '#c9473c';
    g.beginPath();
    g.arc(x + pw / 2, y + 5, 3.5, 0, 7);
    g.fill();
  }
  // the rubbish days as a row of boxes on the green one, a red stamp on the last
  g.strokeStyle = '#4f8a4a';
  g.lineWidth = 1.5;
  for (let i = 0; i < 5; i++) g.strokeRect(234 + i * 16, 60, 16, 16);
  g.strokeStyle = '#d9473c';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(290, 196, 10, 0, 7);
  g.stroke();
}
