// The clinic's ground floor in block_e1 (places/clinic.js; the plan is clinic/plan.js): a pale waiting room with a
// glass front, the reception counter and its files, two waiting benches, the pharmacy's window, the examination
// bay behind a half-drawn curtain, a children's corner and plants. The furniture is boxes in one Kit (dorms/kit.js),
// so the room costs a few dozen draw calls; the signs and posters are clinic/details.js.
import * as THREE from 'three';
import { Kit } from '../dorms/kit.js';
import { shell, roomLights } from '../rooms/shell.js';
import { waitingBench } from '../rooms/waiting-bench.js';
import { door, plant } from '../../props.js';
import { clinicDetails } from './details.js';
import {
  R,
  DOOR,
  BAY,
  BED,
  SEAT,
  STOOL,
  TROLLEY,
  SINK,
  PHARMACY,
  COUNTER,
  WATER,
  TABLE,
  SANITISER,
  BENCHES,
  SPOTS,
  clinicNav,
} from './plan.js';

const WALL = '#e3e7e3',
  FLOOR = '#d2dbd6',
  SEAM = '#bcc8c3',
  STEEL = '#97a2a6',
  TEAL = '#5f8f86',
  TOP = '#e2e4dc',
  CURTAIN = '#b7d2c6',
  CURTAIN_DARK = '#a3c2b5';
const WINDOWS = [
  [R.x0 + 0.5, -1.0],
  [1.0, R.x1 - 0.5],
];

// the floor: a pale sheet with seams, a mat inside the door
function floor(k) {
  const cx = (R.x0 + R.x1) / 2,
    d = -R.z0;
  k.box(FLOOR, R.x1 - R.x0, 0.1, d, cx, -0.1, R.z0 / 2, { surf: 'tile' });
  for (let x = R.x0 + 0.8; x < R.x1; x += 0.8) k.box(SEAM, 0.01, 0.003, d, x, 0, R.z0 / 2, { cast: false });
  for (let z = -0.8; z > R.z0; z -= 0.8) k.box(SEAM, R.x1 - R.x0, 0.003, 0.01, cx, 0, z, { cast: false });
  k.box('#486665', 1.4, 0.014, 0.64, 0, 0.004, -0.4, { surf: 'carpet', cast: false });
  k.box('#3f5a59', 1.44, 0.008, 0.68, 0, 0.002, -0.4, { cast: false }); // its rubber edge
}

// the glass front, shown with the room's own walls in the close follow view (rooms/enclosure.js): frosted to the
// waist like the clinic's old front, clear above, slim mullions; the glass doors' frames
function glassFront(root) {
  const g = new Kit();
  for (const [a, b] of WINDOWS) {
    const n = Math.ceil((b - a) / 1.1);
    for (let i = 0; i <= n; i++)
      g.box('#5f7a78', 0.045, 1.7, 0.1, a + ((b - a) * i) / n, R.near, 0.025, { surf: 'frame', cast: false });
    for (const y of [R.near, 0.76, 1.88])
      g.box('#5f7a78', b - a, 0.04, 0.1, (a + b) / 2, y, 0.025, { surf: 'frame', cast: false });
    g.box('#e6ecea', b - a, 0.54, 0.02, (a + b) / 2, R.near + 0.02, 0.05, { surf: 'glass', cast: false });
    g.box('#c6ddd6', b - a, 1.1, 0.02, (a + b) / 2, 0.78, 0.05, { surf: 'glass', cast: false });
  }
  for (const x of [-DOOR.w / 2, 0, DOOR.w / 2])
    g.box('#5f7a78', 0.05, 1.95, 0.1, x, 0, 0.03, { surf: 'frame', cast: false });
  g.box('#5f7a78', DOOR.w + 0.05, 0.06, 0.1, 0, 1.92, 0.03, { surf: 'frame', cast: false });
  const front = new THREE.Group();
  front.name = 'clinic-glass-front';
  g.flush(front);
  front.traverse((o) => {
    if (o.isMesh) o.userData.noBatch = true;
  });
  root.getObjectByName('follow-interior').add(front);
}

// the reception: a long counter with a pale top and a raised front lip, a screen, forms, a bell and a pump bottle;
// the files behind it, a staff door, the water dispenser at its end
function reception(k, root) {
  const { x0, x1, z, d, top } = COUNTER,
    cx = (x0 + x1) / 2,
    w = x1 - x0;
  k.box('#6f8f8a', w, top - 0.05, d, cx, 0, z, { surf: 'laminate' });
  k.box(TOP, w + 0.04, 0.05, d + 0.06, cx, top - 0.05, z, { surf: 'laminate', r: 0.015 });
  k.box('#7fa09a', w, 0.06, 0.06, cx, top, z + d / 2 - 0.02, { surf: 'laminate', r: 0.01 }); // the lip
  k.box('#4f6e69', w, 0.06, 0.02, cx, 0.06, z + d / 2 + 0.005, { surf: 'plastic' }); // a kick strip
  // the screen and keyboard on the staff side, a tray of forms and a pen on a cord on the visitors' side
  k.box('#33414a', 0.4, 0.26, 0.03, 1.75, top + 0.1, z - 0.1, { surf: 'plastic', ry: 0.45 });
  k.box('#33414a', 0.05, 0.1, 0.05, 1.75, top, z - 0.12, { surf: 'metal' });
  k.box('#5d6c74', 0.34, 0.015, 0.12, 1.85, top, z + 0.0, { surf: 'plastic', ry: 0.3 });
  k.box('#c9d3d6', 0.3, 0.03, 0.22, 3.05, top, z + 0.06, { surf: 'plastic', r: 0.01 });
  for (let i = 0; i < 4; i++)
    k.box('#f4f4ef', 0.26, 0.006, 0.19, 3.05, top + 0.012 + i * 0.006, z + 0.06, { surf: 'paper' });
  k.box('#e8ebe4', 0.024, 0.024, 0.14, 3.32, top, z + 0.08, { surf: 'plastic', ry: 0.4 });
  k.cyl('#c0c6c8', 0.045, 0.05, 0.02, 3.6, top, z + 0.07, { surf: 'metal' }); // the bell
  k.box('#c0c6c8', 0.02, 0.025, 0.02, 3.6, top + 0.02, z + 0.07, { surf: 'metal' });
  k.cyl('#e9eee9', 0.035, 0.035, 0.13, 1.45, top, z + 0.08, { surf: 'plastic' }); // the pump bottle
  k.box('#7fa3a0', 0.02, 0.05, 0.02, 1.45, top + 0.13, z + 0.08, { surf: 'plastic' });
  // the files behind it: a low cabinet of binders along the back wall
  k.box('#8a9a98', 2.6, 1.0, 0.4, 2.55, 0, R.z0 + 0.22, { surf: 'laminate' });
  k.box(TOP, 2.64, 0.04, 0.44, 2.55, 1.0, R.z0 + 0.22, { surf: 'laminate' });
  const spines = ['#4a6490', '#7a9c8c', '#c9a75f', '#9a6f6a', '#5e7f9a', '#d9dcd8'];
  for (const [y, n] of [
    [0.08, 15],
    [0.53, 13],
  ])
    for (let i = 0; i < n; i++)
      k.box(spines[(i * 7 + n) % spines.length], 0.13, 0.36, 0.3, 1.38 + i * 0.165, y, R.z0 + 0.24, { surf: 'binder' });
  for (const y of [0.48, 0.93]) k.box('#7d8e8c', 2.56, 0.03, 0.36, 2.55, y - 0.03, R.z0 + 0.24, { surf: 'laminate' });
  const staff = door(0.78, 1.55);
  staff.position.set(4.32, 0.8, R.z0 + 0.04);
  root.add(staff);
  // the water dispenser and its cups
  k.box('#dfe4e2', 0.36, 0.95, 0.34, WATER[0], 0, WATER[1], { surf: 'plastic', r: 0.03 });
  k.cyl('#a9cdd8', 0.13, 0.13, 0.36, WATER[0], 0.95, WATER[1], { surf: 'glass' });
  k.box('#5e6e74', 0.2, 0.05, 0.04, WATER[0] - 0.16, 0.62, WATER[1], { surf: 'plastic', ry: Math.PI / 2 });
  k.cyl('#f1f2ee', 0.035, 0.035, 0.2, WATER[0] - 0.2, 0.75, WATER[1] - 0.12, { surf: 'paper' });
}

// the pharmacy's little room: a partition with a window and a ledge, shelves of boxes seen through it
function pharmacy(k) {
  const { x0, x1, z, hatch } = PHARMACY,
    t = 0.1,
    [h0, h1] = hatch,
    [y0, y1] = [0.78, 1.45];
  k.box('#d9e0db', h0 - x0, R.h, t, (x0 + h0) / 2, 0, z, { surf: 'plaster' });
  k.box('#d9e0db', x1 - h1, R.h, t, (h1 + x1) / 2, 0, z, { surf: 'plaster' });
  k.box('#d9e0db', h1 - h0, y0, t, (h0 + h1) / 2, 0, z, { surf: 'plaster' });
  k.box('#d9e0db', h1 - h0, R.h - y1, t, (h0 + h1) / 2, y1, z, { surf: 'plaster' });
  for (const x of [x0, x1]) k.box('#d9e0db', t, R.h, z - R.z0, x, 0, (z + R.z0) / 2, { surf: 'plaster' });
  // the window's frame, its ledge and a small tray on it
  for (const x of [h0, h1]) k.box('#5f7a76', 0.04, y1 - y0, 0.13, x, y0, z, { surf: 'frame' });
  k.box('#5f7a76', h1 - h0 + 0.04, 0.04, 0.13, (h0 + h1) / 2, y1 - 0.02, z, { surf: 'frame' });
  k.box(TOP, h1 - h0 + 0.16, 0.035, 0.26, (h0 + h1) / 2, y0 - 0.035, z + 0.06, { surf: 'laminate' });
  k.box('#9fb6c2', 0.22, 0.02, 0.14, (h0 + h1) / 2 + 0.12, y0, z + 0.1, { surf: 'plastic' });
  // inside: shelves of boxes, white bags waiting on the counter
  for (const y of [0.7, 1.1, 1.5]) {
    k.box('#b9c4c2', x1 - x0 - 0.2, 0.03, 0.32, (x0 + x1) / 2, y, R.z0 + 0.2, { surf: 'metal' });
    for (let i = 0; i < 9; i++)
      k.box(
        ['#e7ebe6', '#bcd3e0', '#e9dfc6', '#d6e5d2'][(i + y * 10) % 4],
        0.13,
        0.16 + (i % 3) * 0.03,
        0.2,
        x0 + 0.2 + i * 0.17,
        y + 0.03,
        R.z0 + 0.2,
        { surf: 'card' },
      );
  }
  k.box(TOP, x1 - x0 - 0.2, 0.04, 0.4, (x0 + x1) / 2, 0.74, z - 0.3, { surf: 'laminate' });
  for (const x of [-0.6, -0.4]) k.box('#f2f2ee', 0.12, 0.18, 0.06, x, 0.78, z - 0.3, { surf: 'paper' });
}

// the examination bay: the bed along the back wall (a paper sheet, a pillow, a folded blanket, a basket for clothes at
// its head), a stool on castors, a trolley, a sink; the curtain on its rail, gathered at the open side and half drawn
// across the other
function examBay(k) {
  const { x, z, len, w, top } = BED,
    fy = top - 0.07;
  for (const dx of [-len / 2 + 0.06, len / 2 - 0.06])
    for (const dz of [-w / 2 + 0.06, w / 2 - 0.06])
      k.box(STEEL, 0.045, fy, 0.045, x + dx, 0, z + dz, { surf: 'metal' });
  k.box('#8c989c', len, 0.04, w, x, fy - 0.04, z, { surf: 'metal' });
  k.box('#7fa3a0', len, 0.07, w, x, fy, z, { surf: 'fabric', r: 0.03 });
  k.box('#f1f2ec', len - 0.32, 0.006, w - 0.14, x + 0.1, top, z, { surf: 'paper' });
  k.box('#f3f3ef', 0.26, 0.07, w - 0.12, x - len / 2 + 0.17, top - 0.01, z, { surf: 'fabric', r: 0.03 });
  k.box('#9db8c6', 0.3, 0.06, w - 0.1, x + len / 2 - 0.2, top - 0.01, z, { surf: 'fabric', r: 0.02 });
  k.box('#8fb4c9', 0.4, 0.2, 0.28, x - len / 2 - 0.38, 0, z - 0.06, { surf: 'plastic', r: 0.02 }); // the basket
  // the stool: a round seat on a post, five feet
  const [sx, sz] = STOOL;
  k.cyl('#3f4a52', 0.17, 0.17, 0.06, sx, 0.33, sz, { surf: 'fabric', seg: 16 });
  k.cyl(STEEL, 0.02, 0.025, 0.3, sx, 0.03, sz, { surf: 'metal' });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    k.box('#4d5960', 0.17, 0.025, 0.03, sx + Math.sin(a) * 0.08, 0.03, sz + Math.cos(a) * 0.08, {
      surf: 'metal',
      ry: a + Math.PI / 2,
    });
  }
  // the trolley: two steel shelves; a kidney dish, gloves, a bottle and a blood pressure cuff
  const [tx, tz] = TROLLEY;
  for (const dx of [-0.24, 0.24])
    for (const dz of [-0.17, 0.17]) k.box(STEEL, 0.03, 0.66, 0.03, tx + dx, 0.03, tz + dz, { surf: 'metal' });
  for (const y of [0.24, 0.66]) k.box('#c9d0d0', 0.52, 0.025, 0.38, tx, y, tz, { surf: 'metal' });
  k.box('#b9c2c4', 0.2, 0.03, 0.11, tx - 0.1, 0.685, tz + 0.05, { surf: 'metal', r: 0.02 });
  k.box('#dfe6ee', 0.18, 0.07, 0.1, tx + 0.12, 0.685, tz - 0.08, { surf: 'card' });
  k.box('#7da3c8', 0.182, 0.02, 0.102, tx + 0.12, 0.72, tz - 0.08, { surf: 'card' });
  k.cyl('#e8ebe6', 0.03, 0.03, 0.12, tx + 0.16, 0.685, tz + 0.09, { surf: 'plastic' });
  k.box('#3d4b5c', 0.16, 0.05, 0.12, tx - 0.08, 0.265, tz, { surf: 'fabric', r: 0.02 });
  // the sink on the back wall, a towel dispenser and a soap pump over it
  const [kx] = SINK;
  k.box('#c7d0cc', 0.62, 0.62, 0.4, kx, 0, R.z0 + 0.2, { surf: 'laminate' });
  k.box('#eef0ee', 0.66, 0.06, 0.44, kx, 0.62, R.z0 + 0.22, { surf: 'ceramic' });
  k.box('#b9c2c4', 0.03, 0.14, 0.03, kx, 0.68, R.z0 + 0.06, { surf: 'metal' });
  k.box('#b9c2c4', 0.03, 0.03, 0.12, kx, 0.79, R.z0 + 0.11, { surf: 'metal' });
  k.box('#e8ebe8', 0.3, 0.32, 0.1, kx - 0.1, 1.05, R.z0 + 0.05, { surf: 'plastic', r: 0.02 });
  k.box('#e8ebe8', 0.08, 0.16, 0.07, kx + 0.2, 1.0, R.z0 + 0.04, { surf: 'plastic', r: 0.015 });
  // the rail along the bay's open side and down its side to the back wall
  const ry = 2.1;
  k.box(STEEL, BAY.x1 - R.x0, 0.03, 0.03, (R.x0 + BAY.x1) / 2, ry, BAY.z1, { surf: 'metal' });
  k.box(STEEL, 0.03, 0.03, BAY.z1 - R.z0, BAY.x1, ry, (R.z0 + BAY.z1) / 2, { surf: 'metal' });
  for (const x of [R.x0 + 0.6, BAY.x1]) k.box(STEEL, 0.02, R.h - ry, 0.02, x, ry, BAY.z1, { surf: 'metal' });
  // the curtain: folds hanging from the rail, gathered at the west end of the open side, drawn halfway along the
  // side from the back wall
  const folds = (from, to, at, axis, step) => {
    for (let u = from, i = 0; u < to - 0.01; u += step, i++) {
      const c = i % 2 ? CURTAIN_DARK : CURTAIN,
        off = i % 2 ? 0.035 : -0.035;
      if (axis === 'x') k.box(c, step + 0.01, 1.82, 0.03, u + step / 2, 0.25, at + off, { surf: 'fabric' });
      else k.box(c, 0.03, 1.82, step + 0.01, at + off, 0.25, u + step / 2, { surf: 'fabric' });
    }
  };
  folds(R.x0, R.x0 + 0.5, BAY.z1, 'x', 0.07);
  folds(R.z0, -5.55, BAY.x1, 'z', 0.12);
  folds(-5.55, -5.25, BAY.x1, 'z', 0.06);
  for (let x = R.x0 + 0.05; x < R.x0 + 0.5; x += 0.07)
    k.box(STEEL, 0.02, 0.04, 0.02, x, 2.07, BAY.z1, { surf: 'metal' });
}

// the children's corner: a mat of soft tiles, a few soft blocks, a low shelf of picture books
function kidsCorner(k) {
  const tiles = ['#a9cfb0', '#e8c9a4', '#a9c4de', '#e6b8b4'];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      k.box(tiles[(i + j * 2) % 4], 0.5, 0.025, 0.5, -3.9 + i * 0.5, 0, -2.85 + j * 0.5, {
        surf: 'fabric',
        cast: false,
      });
  for (const [x, z, c, s] of [
    [-4.05, -2.95, '#e2a95e', 0.15],
    [-3.85, -2.75, '#6f9fcf', 0.13],
    [-3.98, -2.78, '#d9706a', 0.12],
  ])
    k.box(c, s, s, s, x, x === -3.98 ? 0.15 : 0.025, z, { surf: 'fabric', r: 0.02, ry: x });
  k.box('#c9b48f', 0.3, 0.46, 0.9, R.x0 + 0.16, 0, -2.8, { surf: 'laminate' });
  k.box('#b39d78', 0.32, 0.03, 0.92, R.x0 + 0.16, 0.22, -2.8, { surf: 'laminate' });
  const books = ['#d9706a', '#6f9fcf', '#e2c26a', '#7fb08a', '#b98fc4', '#f0a87a'];
  for (const [y, n] of [
    [0.25, 6],
    [0.03, 5],
  ])
    for (let i = 0; i < n; i++)
      k.box(books[(i + n) % books.length], 0.2, 0.17 + (i % 2) * 0.02, 0.035, R.x0 + 0.17, y, -3.15 + i * 0.13, {
        surf: 'card',
        ry: 0.08 * (i % 3),
      });
}

export function buildClinic() {
  const scene = new THREE.Scene(),
    root = new THREE.Group(),
    k = new Kit();
  scene.background = new THREE.Color('#3e4d52');
  scene.add(root);
  shell(root, R, {
    entryDoor: true,
    holes: {
      s: [[-DOOR.w / 2, DOOR.w / 2, 0, R.near], ...WINDOWS.map(([a, b]) => [a, b, R.near, 1.88])],
    },
    color: WALL,
    top: '#71858a',
  });
  floor(k);
  glassFront(root);
  reception(k, root);
  pharmacy(k);
  examBay(k);
  kidsCorner(k);
  for (const [x, z, facing, len] of BENCHES)
    waitingBench(k, x, z, facing, { len, seat: TEAL, back: '#6e9a90', frame: '#6c7a7f', rail: '#6c7a7f' });
  // an umbrella stand by the door
  k.cyl('#7d8e93', 0.13, 0.12, 0.42, 0.96, 0, -0.31, { surf: 'metal', seg: 14 });
  k.box('#2f4f6e', 0.03, 0.6, 0.03, 0.92, 0.1, -0.33, { surf: 'fabric', rz: 0.1 });
  // a low round table of magazines, and a hand-sanitiser stand inside the door
  const [ax, az] = TABLE;
  k.cyl('#c9b48f', 0.32, 0.32, 0.04, ax, 0.3, az, { surf: 'laminate', seg: 20 });
  k.cyl('#6c7a7f', 0.03, 0.05, 0.3, ax, 0, az, { surf: 'metal' });
  k.cyl('#6c7a7f', 0.16, 0.16, 0.02, ax, 0, az, { surf: 'metal', seg: 16 });
  for (const [dx, dz, c, r] of [
    [-0.08, 0.04, '#c96a5a', 0.3],
    [0.1, -0.05, '#6f9fcf', -0.5],
    [0.02, 0.12, '#e8e4d8', 1.1],
  ])
    k.box(c, 0.2, 0.012, 0.27, ax + dx, 0.34, az + dz, { surf: 'paper', ry: r });
  const [hx, hz] = SANITISER;
  k.box('#dfe4e2', 0.2, 0.04, 0.2, hx, 0, hz, { surf: 'metal' });
  k.cyl('#9aa4a8', 0.025, 0.025, 0.86, hx, 0.04, hz, { surf: 'metal' });
  k.box('#dfe4e2', 0.18, 0.04, 0.16, hx, 0.88, hz, { surf: 'metal' });
  k.cyl('#e9eee9', 0.04, 0.04, 0.16, hx, 0.92, hz, { surf: 'plastic' });
  k.box('#7fa3a0', 0.03, 0.06, 0.03, hx, 1.08, hz, { surf: 'plastic' });
  clinicDetails(root, k, R);
  k.flush(root);
  for (const [x, z, size, seed] of [
    [R.x1 - 0.27, -0.36, 1.6, 4],
    [R.x0 + 0.27, -0.36, 1.45, 7],
    [-1.48, -5.98, 0.95, 2],
  ]) {
    const p = plant({ size, seed });
    p.position.set(x, 0, z);
    root.add(p);
  }
  const sun = roomLights(
    scene,
    root,
    {
      sky: '#eef3ef',
      ground: '#7d8984',
      k: 1.4,
      key: { color: '#f6f3e6', k: 1.15, at: [3, 11, 7] },
      lamps: [
        { at: [-3, 2.2, -5], color: '#f3f5ec', k: 0.8, reach: 5, pool: 1.2 },
        { at: [2.6, 2.2, -3], color: '#f3f5ec', k: 0.9, reach: 6, pool: 1.4 },
        { at: [0, 2.2, -2], color: '#f6f1e2', k: 0.6, reach: 5 },
      ],
    },
    R,
  );
  return { scene, root, sun, nav: clinicNav(), bounds: R, door: DOOR, seats: { exam_bed: SEAT }, spots: SPOTS };
}
