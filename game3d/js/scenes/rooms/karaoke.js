// The karaoke box (karaoke; docs/game/places.md "Karaoke box"), south row bays 13 and 14 of the shop street: the front
// desk downstairs, and one booth upstairs (karaoke_booth), each looked into from the south over a cut-down front
// wall. Each in its own frame: x east, z toward the camera, the origin its door's middle, inside.
//
//   downstairs: in from the arcade through the glass door; the front desk along the east wall with the staff's
//   terminal, the baskets of microphones and the price board over it; the drinks bar along the north wall; the song
//   catalogues on a stand, a bench to wait on, posters of the new songs; the stairs up at the north-west corner
//   the booth: its door in the east wall from the corridor at the top of the stairs; the screen on the north wall
//   over a low cabinet with the speakers; padded benches along the west and east walls round a low table, the song
//   selector in its cradle on the table, two microphones in their basket, a tambourine, the menu; a small mirror
//   ball; coloured light
import * as THREE from 'three';
import { Kit } from '../dorms/kit.js';
import { shell, roomLights, roomNav } from './shell.js';
import { terminal, songTerminal } from './machines.js';

const C = {
  floor: '#4a4258',
  floorSeam: '#433b50',
  wall: '#d9d3e2',
  wallBooth: '#4a3f5c',
  accent: '#d9487e',
  teal: '#3fa3a8',
  counter: '#e8e4ec',
  counterFront: '#5b4a78',
  bench: '#7a2f52',
  steel: '#8b919b',
  dark: '#2a2630',
};

// ---------- downstairs ----------
export const DESK_R = { x0: -3.6, x1: 3.6, z0: -4.4, z1: 0, h: 1.5, near: 0.26, t: 0.14 };
const DD = [-0.55, 0.55]; // the glass door from the arcade
export const STAIRS = { x0: DESK_R.x0, x1: DESK_R.x0 + 1.1, z0: DESK_R.z0, z1: DESK_R.z0 + 2.0 };

function carpet(kit, R, color, seam) {
  kit.box(color, R.x1 - R.x0, 0.1, R.z1 - R.z0, (R.x0 + R.x1) / 2, -0.1, (R.z0 + R.z1) / 2, {
    surf: 'carpet',
    cast: false,
  });
  for (let x = R.x0 + 0.6; x < R.x1; x += 0.6)
    kit.box(seam, 0.01, 0.002, R.z1 - R.z0, x, 0, (R.z0 + R.z1) / 2, { cast: false });
}

export function buildKaraokeDesk() {
  const R = DESK_R;
  const root = new THREE.Group(),
    scene = new THREE.Scene();
  scene.background = new THREE.Color('#1f1c26');
  scene.add(root);
  const kit = new Kit();
  const nav = roomNav(R);
  shell(root, R, { holes: { s: [[DD[0], DD[1], 0, R.near]] }, color: C.wall });
  carpet(kit, R, C.floor, C.floorSeam);
  // the front desk along the east wall, its front to the west: the staff's terminal, baskets of microphones, a bell,
  // the price board on the wall behind
  const dx = R.x1 - 0.85,
    dz0 = -3.3,
    dz1 = -1.0;
  kit.box(C.counterFront, 0.5, 0.46, dz1 - dz0, dx, 0, (dz0 + dz1) / 2, { surf: 'laminate' });
  kit.box(C.counter, 0.58, 0.04, dz1 - dz0 + 0.06, dx, 0.46, (dz0 + dz1) / 2, { surf: 'laminate' });
  kit.box(C.accent, 0.012, 0.05, dz1 - dz0, dx - 0.255, 0.36, (dz0 + dz1) / 2);
  nav.block(dx - 0.32, R.x1, dz0 - 0.05, dz1 + 0.05);
  const term = terminal(kit, dx + 0.05, 0.5, -2.7, -Math.PI / 2);
  for (const [bz, n] of [
    [-1.95, 2],
    [-1.5, 2],
  ]) {
    kit.box('#2f3640', 0.24, 0.07, 0.18, dx - 0.05, 0.5, bz, { surf: 'plastic' });
    for (let i = 0; i < n; i++) mic(kit, dx - 0.1 + i * 0.1, 0.57, bz, 0.4);
  }
  kit.cyl('#c9c4b6', 0.035, 0.045, 0.025, dx - 0.12, 0.5, -1.2, { seg: 12, surf: 'metal' });
  priceBoard(kit, R.x1 - 0.02, 0.7, -2.15);
  // the drinks bar along the north wall: a counter with three machines, glasses stacked, an ice bin
  const bz = R.z0 + 0.25;
  kit.box('#d8d3dc', 2.2, 0.42, 0.5, 0.7, 0, bz, { surf: 'laminate' });
  kit.box('#b3aebb', 2.24, 0.03, 0.54, 0.7, 0.42, bz, { surf: 'stone' });
  for (const [mx, col] of [
    [-0.1, '#c9473f'],
    [0.5, '#3fa3a8'],
    [1.1, '#e0c35a'],
  ]) {
    kit.box('#e6e6e1', 0.42, 0.55, 0.36, mx, 0.45, bz - 0.04, { r: 0.02, surf: 'plastic' });
    kit.box(col, 0.36, 0.16, 0.01, mx, 0.78, bz + 0.145, { opts: { emissive: col, emissiveIntensity: 0.35 } });
    kit.box('#2f3640', 0.24, 0.02, 0.12, mx, 0.5, bz + 0.12);
  }
  for (let i = 0; i < 4; i++)
    kit.cyl('#cfe3f0', 0.04, 0.035, 0.1, 1.55 + (i % 2) * 0.09, 0.45 + Math.floor(i / 2) * 0.1, bz + 0.02, {
      seg: 10,
      surf: 'ceramic',
    });
  nav.block(-0.45, 1.85, R.z0, bz + 0.3);
  // the catalogue stand and the waiting bench along the west wall, by the door; posters on the walls
  kit.box(C.dark, 0.4, 0.5, 0.32, -2.9, 0, -0.9, { surf: 'laminate' });
  for (let i = 0; i < 4; i++)
    kit.box(['#d9487e', '#3fa3a8', '#e0c35a', '#e8e6df'][i], 0.26, 0.04, 0.2, -2.9, 0.5 + i * 0.04, -0.9, {
      ry: i * 0.1,
      surf: 'card',
    });
  nav.block(-3.15, -2.65, -1.12, -0.68);
  kit.box(C.bench, 0.36, 0.22, 1.2, R.x0 + 0.2, 0, -2.0, { r: 0.03, surf: 'fabric' });
  nav.block(R.x0, R.x0 + 0.42, -2.65, -1.35);
  posters(kit, R);
  // the stairs up in the north-west corner: a flight rising toward the north wall behind a rail, a sign
  const S = STAIRS;
  for (let i = 0; i < 7; i++)
    kit.box(
      i % 2 ? '#4a4258' : '#544a64',
      S.x1 - S.x0,
      0.12 * (i + 1),
      0.28,
      (S.x0 + S.x1) / 2,
      0,
      S.z1 - 0.14 - i * 0.28,
      { surf: 'carpet' },
    );
  kit.box(C.steel, 0.04, 0.04, 2.0, S.x1 + 0.03, 0.55, S.z1 - 1.0, { rx: -0.42, surf: 'metal' });
  for (const z of [S.z1 - 0.05, S.z0 + 0.5])
    kit.box(C.steel, 0.03, 0.5 + (S.z1 - z) * 0.42, 0.03, S.x1 + 0.03, 0, z, { surf: 'metal' });
  kit.box(C.accent, 0.5, 0.18, 0.02, (S.x0 + S.x1) / 2, 1.2, R.z0 + 0.02, {
    opts: { emissive: C.accent, emissiveIntensity: 0.5 },
  });
  nav.block(S.x0, S.x1 + 0.1, S.z0, S.z1 - 0.5);
  kit.box('#4d4458', 1.0, 0.012, 0.5, 0, 0.003, -0.35, { surf: 'carpet', cast: false });
  kit.flush(root);
  const sun = roomLights(
    scene,
    root,
    {
      sky: '#ece6f2',
      ground: '#40364e',
      k: 0.9,
      key: { color: '#fff0e8', k: 0.85, at: [-2, 12, 7] },
      lamps: [
        { at: [1.8, 1.35, -2.2], color: '#ffe6f0', k: 1.0, reach: 3.0, pool: 1.0 },
        { at: [-1.4, 1.35, -2.2], color: '#e8f2ff', k: 0.9, reach: 3.0, pool: 0.9 },
        { at: [0.6, 1.3, -3.9], color: '#fff3df', k: 0.7, reach: 2.2 },
      ],
    },
    R,
  );
  return {
    root,
    scene,
    sun,
    nav,
    bounds: R,
    door: { edge: [0, 0.3], in: [0, -1.0], out: [0, -0.55] },
    // the stairs: where he steps onto the bottom tread (edge) from the floor in front of it (foot)
    stairs: {
      foot: [(S.x0 + S.x1) / 2, S.z1 + 0.45],
      edge: [(S.x0 + S.x1) / 2, S.z1 - 0.3],
      at: [(S.x0 + S.x1) / 2, 1.0, S.z1 - 0.6],
    },
    terminal: term,
    desk: [dx - 0.65, -2.15],
    spots: { karaoke_desk: [dx - 0.65, -2.15], karaoke_drinks: [0.7, bz + 0.75], karaoke_bench: [R.x0 + 0.75, -2.0] },
    seats: [{ x: R.x0 + 0.24, z: -2.0, top: 0.22, ry: Math.PI / 2 }],
    camera: { elev: 54, fov: 24 },
  };
}

// a microphone lying in its basket (or on a table): a dark body, a silver grille ball
function mic(kit, x, y, z, ry = 0) {
  kit.add(
    '#2f3640',
    new THREE.CylinderGeometry(0.022, 0.016, 0.2, 8)
      .rotateZ(Math.PI / 2)
      .rotateY(ry)
      .translate(x, y, z),
    { surf: 'plastic' },
  );
  kit.add('#c9ccd1', new THREE.SphereGeometry(0.034, 8, 6).translate(0.11, 0, 0).rotateY(ry).translate(x, y, z), {
    surf: 'metal',
  });
}

// the price board: a dark panel, the times in rows, a pink band over them
function priceBoard(kit, x, y, z) {
  kit.box('#2a2630', 0.03, 0.55, 0.9, x, y, z, { surf: 'paint' });
  kit.box(C.accent, 0.035, 0.1, 0.9, x - 0.004, y + 0.45, z);
  for (let i = 0; i < 4; i++) {
    kit.box('#e8e6df', 0.035, 0.035, 0.42, x - 0.006, y + 0.33 - i * 0.09, z - 0.18);
    kit.box('#e0c35a', 0.035, 0.035, 0.18, x - 0.006, y + 0.33 - i * 0.09, z + 0.27);
  }
}

function posters(kit, R) {
  const cols = [
    ['#d9487e', '#f2d6e2'],
    ['#3fa3a8', '#d6eef0'],
    ['#e0c35a', '#2a2630'],
  ];
  for (const [i, x] of [-2.4, -1.5, 1.9].entries()) {
    const [a, b] = cols[i % cols.length];
    kit.box(a, 0.5, 0.7, 0.012, x, 0.55, R.z0 + 0.012, { surf: 'paper' });
    kit.box(b, 0.36, 0.24, 0.004, x, 0.95, R.z0 + 0.02);
    kit.box(b, 0.4, 0.04, 0.004, x, 0.68, R.z0 + 0.02);
  }
}

// ---------- the booth ----------
export const BOOTH_R = { x0: -2.4, x1: 2.4, z0: -3.6, z1: 0, h: 1.4, near: 0.26, t: 0.14 };
const BD = [-2.1, -1.3]; // its door in the east wall (z range)

export function buildKaraokeBooth() {
  const R = BOOTH_R;
  const root = new THREE.Group(),
    scene = new THREE.Scene();
  scene.background = new THREE.Color('#17141d');
  scene.add(root);
  const kit = new Kit();
  const nav = roomNav(R);
  shell(root, R, { holes: { e: [[BD[0], BD[1], 0, 1.2]] }, color: C.wallBooth, top: '#5a4f6c' });
  carpet(kit, R, '#3a3446', '#332e3e');
  // the door from the corridor, open against the wall, the corridor's light beyond it
  kit.box('#3a3146', 0.04, 1.18, BD[1] - BD[0], R.x1 + 0.2, 0, (BD[0] + BD[1]) / 2 + 0.55, { ry: 0.9, surf: 'door' });
  kit.box('#f1e6c8', 0.6, 0.004, BD[1] - BD[0], R.x1 + 0.4, 0.002, (BD[0] + BD[1]) / 2, {
    opts: { emissive: '#f1e6c8', emissiveIntensity: 0.35 },
    cast: false,
  });
  // the screen on the north wall over the low cabinet with the speakers
  kit.box('#22202a', 2.0, 0.34, 0.4, 0, 0, R.z0 + 0.22, { surf: 'laminate' });
  for (const s of [-1, 1]) {
    kit.box('#1a1820', 0.3, 0.52, 0.3, s * 1.25, 0, R.z0 + 0.2, { surf: 'plastic' });
    kit.cyl('#3a3842', 0.09, 0.09, 0.01, s * 1.25, 0.32, R.z0 + 0.36, { seg: 14, rx: Math.PI / 2 });
  }
  kit.box('#111018', 1.7, 0.98, 0.05, 0, 0.42, R.z0 + 0.03, { surf: 'monitor' });
  const screen = [0, 0.91, R.z0 + 0.06];
  kit.box('#4b5fa8', 1.6, 0.9, 0.006, screen[0], 0.46, screen[2], {
    opts: { emissive: '#5b6fc0', emissiveIntensity: 0.7 },
  });
  kit.box('#e8e6df', 1.2, 0.05, 0.004, 0, 0.58, screen[2] + 0.005, {
    opts: { emissive: '#e8e6df', emissiveIntensity: 0.6 },
  });
  kit.box('#f2d6e2', 0.9, 0.05, 0.004, 0, 0.66, screen[2] + 0.005, {
    opts: { emissive: '#f2d6e2', emissiveIntensity: 0.6 },
  });
  nav.block(-1.45, 1.45, R.z0, R.z0 + 0.45);
  // the benches along the west and east walls, and along the front wall's inside
  const bench = (x0, x1, z0, z1) => {
    kit.box(C.bench, x1 - x0, 0.2, z1 - z0, (x0 + x1) / 2, 0, (z0 + z1) / 2, { r: 0.03, surf: 'fabric' });
    nav.block(x0, x1, z0, z1);
  };
  bench(R.x0, R.x0 + 0.5, R.z0 + 0.6, -0.1);
  kit.box('#6a2847', 0.14, 0.42, -0.1 - R.z0 - 0.6, R.x0 + 0.07, 0, (R.z0 + 0.6 - 0.1) / 2, {
    r: 0.03,
    surf: 'fabric',
  });
  bench(R.x1 - 0.5, R.x1, R.z0 + 0.6, BD[0] - 0.15);
  kit.box('#6a2847', 0.14, 0.42, BD[0] - 0.15 - R.z0 - 0.6, R.x1 - 0.07, 0, (R.z0 + 0.6 + BD[0] - 0.15) / 2, {
    r: 0.03,
    surf: 'fabric',
  });
  bench(R.x0 + 0.5, 0.7, -0.5, R.z1);
  // the low table: the selector in its cradle, the microphones in their basket, a tambourine, the menu, two glasses
  const tz = -1.9,
    tx = -0.5;
  kit.box('#2a2630', 1.4, 0.26, 0.8, tx, 0, tz, { surf: 'laminate' });
  kit.box('#3a3446', 1.44, 0.03, 0.84, tx, 0.26, tz, { surf: 'stone' });
  nav.block(tx - 0.75, tx + 0.75, tz - 0.45, tz + 0.45);
  const sel = songTerminal(kit, tx + 0.3, 0.29, tz + 0.12, 0);
  kit.box('#2f3640', 0.28, 0.06, 0.16, tx - 0.35, 0.29, tz - 0.15, { surf: 'plastic' });
  mic(kit, tx - 0.4, 0.37, tz - 0.18, 0.2);
  mic(kit, tx - 0.32, 0.37, tz - 0.11, -0.15);
  kit.add(
    '#d9b24a',
    new THREE.TorusGeometry(0.08, 0.02, 6, 14).rotateX(Math.PI / 2).translate(tx + 0.05, 0.31, tz - 0.22),
    { surf: 'plastic' },
  );
  kit.box('#f2d6e2', 0.22, 0.01, 0.3, tx - 0.05, 0.29, tz + 0.18, { ry: 0.25, surf: 'card' });
  for (const gx of [tx + 0.58, tx - 0.62])
    kit.cyl('#cfe3f0', 0.035, 0.03, 0.1, gx, 0.29, tz + 0.2, { seg: 10, surf: 'ceramic' });
  // the mirror ball
  kit.cyl(C.steel, 0.005, 0.005, 0.3, -0.5, 1.1, -1.9, { seg: 4 });
  kit.add('#c9ccd1', new THREE.IcosahedronGeometry(0.1, 1).translate(-0.5, 1.05, -1.9), { surf: 'metal' });
  kit.flush(root);
  const sun = roomLights(
    scene,
    root,
    {
      sky: '#b9a8d0',
      ground: '#3a3246',
      k: 1.0,
      key: { color: '#f5e8ff', k: 0.8, at: [-2, 10, 6] },
      lamps: [
        { at: [-1.5, 1.2, -1.2], color: '#ff7fb0', k: 1.0, reach: 2.6, pool: 0.8 },
        { at: [1.4, 1.2, -2.4], color: '#6fd6e0', k: 0.9, reach: 2.6, pool: 0.8 },
        { at: [0, 0.9, -3.1], color: '#8fa0ff', k: 0.8, reach: 2.0 },
      ],
    },
    R,
  );
  return {
    root,
    scene,
    sun,
    nav,
    bounds: R,
    // the door from the corridor: where he steps in (edge, in the doorway) and walks to (in)
    door: {
      edge: [R.x1 + 0.25, (BD[0] + BD[1]) / 2],
      in: [R.x1 - 0.95, (BD[0] + BD[1]) / 2 + 0.55],
      out: [R.x1 - 0.35, (BD[0] + BD[1]) / 2],
    },
    selector: sel,
    screen,
    table: [tx, tz],
    spots: {
      booth_in: [R.x1 - 0.95, (BD[0] + BD[1]) / 2 + 0.55],
      booth_table: [tx + 0.3, tz + 0.75],
      booth_screen: [0, R.z0 + 0.95],
    },
    seats: [
      { x: R.x0 + 0.26, z: -1.6, top: 0.2, ry: Math.PI / 2 },
      { x: R.x1 - 0.26, z: -2.6, top: 0.2, ry: -Math.PI / 2 },
    ],
    camera: { elev: 56, fov: 24 },
  };
}
