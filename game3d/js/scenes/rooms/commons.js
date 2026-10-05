// The dorm common room (dorm_commons; docs/game/places.md "Dorm common room"), the ground floor of dorm_gallery on
// the inner court, looked into from the south over the cut-down front wall with its glazed door. In its own frame: x
// east, z toward the camera, the origin the glazed door's middle, inside.
//
//   west: the lounge, a sofa and a low table facing the TV on the west wall, a bookshelf beside it
//   middle: the long shared table, chairs round it, art materials set out at its east end (a paper stack, jars of
//   brushes, paint tubes, a cutting mat), a drying rack of wire shelves against the north wall with sheets on it
//   east: the shared kitchen along the north wall (fridge with names on the food, sink, two hobs, kettle, rice
//   cooker), the printer on a low cabinet by the east wall, the rules and the notices on a board over it
//   windows high in the north wall onto the back walk; ceiling lights
import * as THREE from 'three';
import { Kit } from '../dorms/kit.js';
import { shell, plankFloor, roomLights, roomNav } from './shell.js';
import { printer, pinboard } from './machines.js';

const C = {
  floor: '#b9a184',
  seam: '#a88f71',
  wall: '#e4dfd3',
  sofa: '#5d7d8c',
  wood: '#9c7b55',
  top: '#d8cdb8',
  chair: '#6b8f7a',
  steel: '#8b919b',
  counter: '#c9c6bd',
  fridge: '#e6e6e1',
  sky: '#cfe2ec',
};
export const R = { x0: -4.0, x1: 4.0, z0: -4.7, z1: 0, h: 1.5, near: 0.26, t: 0.14 };
export const DOOR = [-0.6, 0.6];
export const TABLE = { x: 0.4, z: -2.5, w: 2.6, d: 1.0, h: 0.4 };
export const RACK = { x: -0.4, z: R.z0 + 0.25, w: 1.0 };
export const PRINTER = [R.x1 - 0.32, 0.36, -1.9];
export const BOARD = [R.x1 - 0.02, 0.62, -2.9];

export function buildCommons() {
  const root = new THREE.Group(),
    scene = new THREE.Scene();
  scene.background = new THREE.Color('#262a30');
  scene.add(root);
  const kit = new Kit();
  const nav = roomNav(R);
  shell(root, R, { holes: { s: [[DOOR[0], DOOR[1], 0, R.near]] }, color: C.wall });
  plankFloor(kit, R, { color: C.floor, seam: C.seam, w: 0.24, along: 'x' });
  windows(kit);
  const sofa = lounge(kit, nav);
  const table = work(kit, nav);
  const rack = dryingRack(kit, nav);
  kitchen(kit, nav);
  // the printer on a low cabinet by the east wall, the notice board over it
  const [px, py, pz] = PRINTER;
  kit.box('#8e949e', 0.5, py, 0.7, px, 0, pz, { surf: 'drawerfront' });
  const prn = printer(kit, px, py, pz, -Math.PI / 2);
  kit.box('#f4f2ec', 0.2, 0.05, 0.28, px, py, pz - 0.28, { surf: 'paper' });
  nav.block(px - 0.32, R.x1, pz - 0.4, pz + 0.4);
  const board = pinboard(kit, BOARD[0], BOARD[1], BOARD[2], -Math.PI / 2, 0.9, 0.5);
  // the glazed door, open against the front wall's inside; a mat
  kit.box('#5d6470', 0.04, 0.26, 0.04, DOOR[0], 0, R.z1 + 0.07);
  kit.box('#5d6470', 0.04, 0.26, 0.04, DOOR[1], 0, R.z1 + 0.07);
  kit.box('#4d5a63', 1.0, 0.012, 0.5, 0, 0.003, -0.35, { surf: 'carpet', cast: false });
  kit.flush(root);
  const sun = roomLights(
    scene,
    root,
    {
      sky: '#f1eee6',
      ground: '#6d5f50',
      k: 0.95,
      key: { color: '#fff1dc', k: 0.95, at: [-3, 12, 7] },
      lamps: [
        { at: [-2.4, 1.4, -2.2], color: '#ffe0b8', k: 1.0, reach: 3.0, pool: 1.0 },
        { at: [0.6, 1.4, -2.4], color: '#ffe8cc', k: 1.1, reach: 3.2, pool: 1.1 },
        { at: [2.8, 1.4, -3.4], color: '#fff3df', k: 0.8, reach: 2.6 },
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
    printer: prn,
    table,
    rack,
    board,
    spots: {
      commons_table: [TABLE.x + TABLE.w / 2 - 0.4, TABLE.z + TABLE.d / 2 + 0.55],
      commons_sofa: [sofa.front[0], sofa.front[1]],
      commons_kitchen: [2.4, R.z0 + 1.05],
      commons_rack: [RACK.x, RACK.z + 0.75],
      commons_books: [R.x0 + 0.75, -0.9],
      commons_fridge: [3.0, R.z0 + 1.0],
    },
    seats: [sofa.seat],
    camera: { elev: 54, fov: 24 },
  };
}

// high windows in the north wall onto the back walk, sky beyond
function windows(kit) {
  for (const x of [-2.6, -0.9, 0.8]) {
    kit.box('#5d6470', 1.2, 0.5, 0.04, x, 0.85, R.z0 + 0.02, { surf: 'frame' });
    kit.box(C.sky, 1.1, 0.42, 0.045, x, 0.89, R.z0 + 0.02, { opts: { emissive: C.sky, emissiveIntensity: 0.5 } });
  }
}

// the lounge: the TV on a low cabinet against the west wall, the sofa facing it across a low table with a remote and
// two mugs on it, a rug; the bookshelf beside the TV, towards the door
function lounge(kit, nav) {
  const tx = R.x0 + 0.22,
    tz = -3.3;
  kit.box('#4a4e5b', 0.4, 0.26, 1.1, tx, 0, tz, { surf: 'laminate' });
  kit.box('#22252b', 0.04, 0.42, 0.8, tx - 0.05, 0.3, tz, { surf: 'monitor' });
  kit.box('#38404f', 0.01, 0.38, 0.76, tx - 0.02, 0.32, tz, { opts: { emissive: '#2c3c55', emissiveIntensity: 0.4 } });
  nav.block(R.x0, tx + 0.22, tz - 0.6, tz + 0.6);
  kit.box('#8c6d64', 1.3, 0.008, 1.4, -2.6, 0.003, tz, { surf: 'carpet', cast: false });
  kit.box(C.wood, 0.5, 0.18, 0.8, -2.75, 0, tz, { surf: 'laminate' });
  kit.box('#e8e6df', 0.08, 0.06, 0.08, -2.7, 0.18, tz - 0.2, { surf: 'ceramic' });
  kit.box('#c9473f', 0.08, 0.06, 0.08, -2.82, 0.18, tz + 0.15, { surf: 'ceramic' });
  kit.box('#2f333b', 0.06, 0.02, 0.14, -2.65, 0.18, tz + 0.05);
  nav.block(-3.05, -2.45, tz - 0.45, tz + 0.45);
  const sx = -1.75;
  kit.box(C.sofa, 0.5, 0.2, 1.5, sx, 0, tz, { r: 0.04, surf: 'fabric' });
  kit.box(C.sofa, 0.16, 0.4, 1.5, sx + 0.25, 0, tz, { r: 0.04, surf: 'fabric' });
  for (const s of [-1, 1]) kit.box(C.sofa, 0.5, 0.3, 0.14, sx, 0, tz + s * 0.75, { r: 0.04, surf: 'fabric' });
  kit.box('#e0c35a', 0.1, 0.18, 0.2, sx + 0.12, 0.2, tz - 0.45, { r: 0.03, surf: 'fabric', rz: -0.3 });
  nav.block(sx - 0.28, sx + 0.36, tz - 0.85, tz + 0.85);
  // the bookshelf, nearer the door, its back to the west wall
  const bz = -1.3;
  const bx = R.x0 + 0.16;
  kit.box(C.wood, 0.04, 0.9, 1.0, bx - 0.13, 0, bz, { surf: 'laminate' }); // its back
  for (const s of [-1, 1]) kit.box(C.wood, 0.3, 0.9, 0.04, bx, 0, bz + s * 0.48, { surf: 'laminate' });
  for (const y of [0, 0.3, 0.6, 0.88]) kit.box(C.wood, 0.3, 0.03, 1.0, bx, y, bz, { surf: 'laminate' });
  const spines = ['#4a6490', '#b5463c', '#6a7a8c', '#3f8f6a', '#d9b24a', '#8a6f4e', '#e8e6df'];
  for (let r = 0; r < 3; r++)
    for (let i = 0; i < 9; i++)
      if ((i + r) % 5)
        kit.box(
          spines[(i * 3 + r) % spines.length],
          0.2,
          0.2 + ((i * 7 + r) % 3) * 0.02,
          0.07,
          R.x0 + 0.2,
          0.03 + r * 0.3,
          bz - 0.4 + i * 0.1,
        );
  nav.block(R.x0, R.x0 + 0.36, bz - 0.55, bz + 0.55);
  return { seat: { x: sx - 0.04, z: tz, top: 0.2, ry: -Math.PI / 2 }, front: [sx - 0.65, tz + 0.2] };
}

// the long shared table, chairs round it; at its east end the art club's materials: a paper stack, a cutting mat
// with a craft knife, jars of brushes, paint tubes, a palette
function work(kit, nav) {
  const { x, z, w, d, h } = TABLE;
  kit.box(C.top, w, 0.04, d, x, h - 0.04, z, { surf: 'laminate' });
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      kit.box(C.steel, 0.04, h - 0.04, 0.04, x + sx * (w / 2 - 0.1), 0, z + sz * (d / 2 - 0.1), { surf: 'metal' });
  nav.block(x - w / 2 - 0.05, x + w / 2 + 0.05, z - d / 2 - 0.05, z + d / 2 + 0.05);
  const chair = (cx, cz, ry) => {
    kit.box(C.chair, 0.28, 0.03, 0.28, cx, 0.22, cz, { ry, surf: 'plastic' });
    kit.box(C.chair, 0.28, 0.24, 0.03, cx - Math.sin(ry) * 0.13, 0.25, cz - Math.cos(ry) * 0.13, {
      ry,
      surf: 'plastic',
    });
    for (const [a, b] of [
      [-0.11, -0.11],
      [0.11, -0.11],
      [-0.11, 0.11],
      [0.11, 0.11],
    ])
      kit.box(C.steel, 0.02, 0.22, 0.02, cx + a, 0, cz + b, { surf: 'metal' });
    nav.block(cx - 0.17, cx + 0.17, cz - 0.17, cz + 0.17);
  };
  for (const u of [-0.8, 0.1]) {
    chair(x + u, z - d / 2 - 0.25, 0);
    chair(x + u, z + d / 2 + 0.25, Math.PI);
  }
  chair(x - w / 2 - 0.28, z, Math.PI / 2);
  // the art materials at the east end
  const ax = x + w / 2 - 0.55,
    y = h;
  kit.box('#3f6a4f', 0.6, 0.006, 0.45, ax, y, z, { surf: 'plastic' });
  for (let i = 0; i < 4; i++)
    kit.box('#f4f2ec', 0.42, 0.006, 0.3, ax - 0.05 + i * 0.01, y + 0.006 + i * 0.006, z - 0.02 + i * 0.008, {
      ry: i * 0.04,
      surf: 'paper',
    });
  for (const [jx, jz, n] of [
    [ax + 0.42, z - 0.28, 4],
    [ax + 0.42, z + 0.05, 3],
  ]) {
    kit.cyl('#cfdce0', 0.05, 0.05, 0.12, jx, y, jz, { seg: 10, surf: 'ceramic' });
    for (let i = 0; i < n; i++)
      kit.box(['#8a6f4e', '#c9a46e', '#3e434d'][i % 3], 0.012, 0.22, 0.012, jx - 0.02 + i * 0.013, y + 0.05, jz, {
        rz: (i - 1.5) * 0.12,
      });
  }
  for (let i = 0; i < 6; i++)
    kit.box(
      ['#c9473f', '#3e7bb8', '#e0c35a', '#3f8f6a', '#e8e6df', '#8a4f9a'][i],
      0.04,
      0.03,
      0.12,
      ax - 0.3 + i * 0.06,
      y,
      z + 0.32,
      { ry: (i % 3) * 0.2 },
    );
  kit.box('#f2f2ee', 0.24, 0.01, 0.16, ax + 0.1, y, z + 0.33, { ry: -0.2, surf: 'plastic' });
  return [ax, y + 0.4, z];
}

// the drying rack against the north wall: a steel frame of wire shelves, sheets laid out flat on them, one hung
// by pegs from the top rail
function dryingRack(kit, nav) {
  const { x, z, w } = RACK,
    d = 0.4;
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      kit.box(C.steel, 0.025, 1.0, 0.025, x + sx * (w / 2), 0, z + sz * (d / 2), { surf: 'metal' });
  const sheets = ['#f4f2ec', '#f2e6c8', '#e8eef4', '#f4f2ec'];
  for (let i = 0; i < 6; i++) {
    const y = 0.14 + i * 0.14;
    kit.box('#b8bec7', w, 0.008, d, x, y, z, { surf: 'metal', cast: false });
    if (i % 2 === 0 || i === 3)
      kit.box(sheets[i % sheets.length], w * 0.7, 0.004, d * 0.8, x - 0.05 + (i % 2) * 0.1, y + 0.008, z);
  }
  kit.box('#e8eef4', 0.5, 0.36, 0.004, x - 0.15, 0.62, z + d / 2 + 0.02, { surf: 'paper' });
  kit.box('#5d8fb0', 0.3, 0.16, 0.002, x - 0.1, 0.7, z + d / 2 + 0.024);
  kit.box('#e0c35a', 0.12, 0.12, 0.002, x - 0.28, 0.64, z + d / 2 + 0.024);
  for (const s of [-1, 1]) kit.box('#d9b24a', 0.015, 0.04, 0.02, x - 0.15 + s * 0.2, 0.96, z + d / 2 + 0.02);
  nav.block(x - w / 2 - 0.05, x + w / 2 + 0.05, R.z0, z + d / 2 + 0.06);
  return [x, 1.25, z];
}

// the shared kitchen along the north wall's east end: the fridge with names on the food boxes inside its glass
// shelf door, a counter with the sink, two hobs, the kettle and the rice cooker, a wall cupboard over it
function kitchen(kit, nav) {
  const z = R.z0 + 0.25,
    x0 = 1.2,
    x1 = R.x1;
  kit.box(C.counter, 2.2, 0.4, 0.5, x0 + 1.1, 0, z, { surf: 'laminate' });
  kit.box('#b3b0a8', 2.24, 0.03, 0.54, x0 + 1.1, 0.4, z, { surf: 'stone' });
  kit.box('#9aa0aa', 0.5, 0.02, 0.34, x0 + 0.5, 0.415, z, { surf: 'metal' });
  kit.cyl('#9aa0aa', 0.012, 0.012, 0.2, x0 + 0.5, 0.42, z - 0.18, { seg: 6, surf: 'metal' });
  for (const hx of [x0 + 1.3, x0 + 1.65]) kit.cyl('#2f333b', 0.12, 0.12, 0.012, hx, 0.43, z, { seg: 16 });
  kit.cyl('#e8e6df', 0.07, 0.08, 0.16, x0 + 1.95, 0.43, z - 0.06, { seg: 12, surf: 'plastic' });
  kit.cyl('#f2f2ee', 0.11, 0.12, 0.14, x0 + 1.0, 0.43, z - 0.05, { seg: 14, surf: 'plastic' });
  kit.box('#c9c6bd', 2.2, 0.32, 0.3, x0 + 1.1, 0.95, z - 0.1, { surf: 'laminate' });
  nav.block(x0 - 0.05, x1, R.z0, z + 0.3);
  // the fridge at the counter's west end, against the drying rack's side
  const fx = x0 - 0.33;
  kit.box(C.fridge, 0.56, 1.05, 0.56, fx, 0, z + 0.04, { r: 0.02, surf: 'plastic' });
  kit.box('#c9c6bd', 0.02, 0.24, 0.02, fx + 0.22, 0.6, z + 0.33);
  for (let i = 0; i < 5; i++)
    kit.box(
      ['#f6e7a8', '#cfe3f0', '#f4cfc8'][i % 3],
      0.07,
      0.07,
      0.004,
      fx - 0.18 + (i % 3) * 0.12,
      0.75 + Math.floor(i / 3) * 0.12,
      z + 0.322,
      { rz: (i - 2) * 0.1 },
    );
  nav.block(fx - 0.3, fx + 0.3, R.z0, z + 0.34);
}
