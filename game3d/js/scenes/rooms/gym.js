// The gym's corner inside its main door (gym; docs/game/places.md "Gym corner"), the south end of the hall as far as
// the green divider net, looked into from the south over the cut-down front wall. In its own frame: x east, z
// toward the camera, the origin the middle of the hall's south wall, inside (the main door's middle).
//
//   the entrance: the glass doors in the south wall, a strip of grey tiles inside them where outdoor shoes come off,
//   a shoe locker either side, a crate of green indoor slippers
//   the desk: the attendant's counter east of the entrance, its return along the tiles; the booking terminal, the
//   printer and a desk fan on it, the booking sheets, a bell; the attendant's chair behind; an AED box and the club
//   board on the east wall
//   the hall: a maple floor with the badminton courts' lines in green and the basketball court's in red, the walls'
//   wooden wainscot and the high windows over it; down the west side two long benches; the equipment store in the
//   south-west corner, its sliding door pushed open on the ball carts, the mats and the net posts; the winter
//   meeting corner north-east: folding chairs in two rows facing a whiteboard on wheels, more chairs on a trolley
//   the divider net across the hall, a basketball goal on the far wall over it
import * as THREE from 'three';
import { Kit } from '../dorms/kit.js';
import { shell, plankFloor, roomLights, roomNav } from './shell.js';
import { terminal, printer, deskFan, pinboard } from './machines.js';

const C = {
  maple: '#c4a882',
  seam: '#b39673',
  tiles: '#8d9196',
  wall: '#d9d6cc',
  wainscot: '#a9875a',
  green: '#3f8f6a',
  red: '#b5463c',
  line: '#e9ece6',
  counter: '#d8d9d5',
  counterFront: '#6f8d9a',
  locker: '#b7bcc2',
  slot: '#3e434d',
  bench: '#b48c58',
  steel: '#8b919b',
  net: '#2f6b4b',
  sky: '#cfe2ec',
};
// the room inside its walls; the walls' height, the front wall's, their thickness
export const R = { x0: -9.4, x1: 9.4, z0: -11.8, z1: 0, h: 2.1, near: 0.26, t: 0.18 };
export const DOOR = [-0.85, 0.85]; // the main doors in the south wall
const TILES = [-2.5, 2.5, -1.4, 0]; // the entrance's tiles
export const COUNTER = { x0: 3.4, x1: 6.9, z: -2.3, d: 0.5, h: 0.5 }; // the desk's run along x; its front faces north
export const STORE = { x0: R.x0, x1: -6.4, z0: -3.1, door: [-8.7, -7.0] }; // the equipment store's walls and door
const NET_Z = -10.6;
export const BENCHES = [-4.6, -8.2].map((z) => [R.x0 + 0.42, z]); // their middles; seats along z, facing east
const BENCH_LEN = 2.2;
export const BOARD = [R.x1 - 0.02, 0.62, -4.2]; // the club board on the east wall, facing west ([x, y, z])
export const MEETING = { x0: 3.8, x1: 7.8, rows: [-7.6, -8.5], board: [5.8, -9.9] };

export function buildGym() {
  const root = new THREE.Group(),
    scene = new THREE.Scene();
  scene.background = new THREE.Color('#262a30');
  scene.add(root);
  const kit = new Kit();
  const nav = roomNav(R);
  shell(root, R, { holes: { s: [[DOOR[0], DOOR[1], 0, R.near]] }, color: C.wall });
  plankFloor(kit, R, { color: C.maple, seam: C.seam, w: 0.2, along: 'z' });
  courtLines(kit, nav);
  walls(kit);
  const entry = entrance(kit, nav);
  const desk = counter(kit, nav);
  store(kit, nav);
  benches(kit, nav);
  meeting(kit, nav);
  net(kit);
  const board = pinboard(kit, BOARD[0], BOARD[1], BOARD[2], -Math.PI / 2, 1.3, 0.62);
  nav.block(R.x1 - 0.2, R.x1, -5.0, -3.4); // the board's ledge and the AED box under it
  kit.flush(root);
  const sun = roomLights(
    scene,
    root,
    {
      sky: '#eef2f6',
      ground: '#7d6a52',
      k: 1.05,
      key: { color: '#fff4e2', k: 1.0, at: [-5, 16, 8] },
      lamps: [-6, 0, 6].flatMap((x) =>
        [-3.4, -8.0].map((z) => ({ at: [x, 1.9, z], color: '#fff3df', k: 0.9, reach: 4.2 })),
      ),
    },
    R,
  );
  return {
    root,
    scene,
    sun,
    nav,
    bounds: R,
    // the doors: where he stands inside them (edge), and where he walks in to (in)
    door: { edge: [0, 0.35], in: [0, -2.0], out: [0, -0.9] },
    terminal: desk.terminal,
    printer: desk.printer,
    fan: desk.fan,
    board,
    spots: {
      gym_desk: [4.6, COUNTER.z - COUNTER.d / 2 - 0.55],
      gym_benches: [R.x0 + 1.3, -6.4],
      gym_meeting: [MEETING.x0 - 0.7, -8.0],
      gym_court: [-1.0, -5.3],
      gym_store: [STORE.door[0] + 0.85, STORE.z0 + 1.1],
      gym_lockers: entry.lockers,
    },
    seats: BENCHES.map(([x, z]) => ({ x: x + 0.02, z, top: 0.24, ry: Math.PI / 2 })),
    camera: { elev: 52, fov: 24 },
  };
}

// the lines on the floor: a badminton court across the middle in green, its net up; the basketball court's in red
function courtLines(kit, nav) {
  const line = (color, w, d, x, z) => kit.box(color, w, 0.004, d, x, 0.001, z, { cast: false });
  const bx = 0,
    bz = -6.6,
    W = 4.0,
    L = 8.9; // badminton, 6.1 by 13.4 m
  for (const s of [-1, 1]) {
    line(C.green, W, 0.04, bx, bz + (s * L) / 2);
    line(C.green, 0.04, L, bx + (s * W) / 2, bz);
    line(C.green, 0.04, L, bx + s * (W / 2 - 0.3), bz);
    line(C.green, W, 0.04, bx, bz + s * 1.3);
    line(C.green, W, 0.04, bx, bz + s * (L / 2 - 0.5));
  }
  line(C.green, 0.04, L / 2 - 1.3, bx, bz - (L / 4 + 0.65));
  line(C.green, 0.04, L / 2 - 1.3, bx, bz + (L / 4 + 0.65));
  // its net up across the middle on two posts in weighted feet, as the last club left it
  for (const s of [-1, 1]) {
    kit.cyl('#3e434d', 0.12, 0.14, 0.06, bx + s * (W / 2 + 0.2), 0, bz, { seg: 12, surf: 'metal' });
    kit.cyl(C.steel, 0.025, 0.025, 1.04, bx + s * (W / 2 + 0.2), 0.06, bz, { seg: 8, surf: 'metal' });
  }
  kit.add('#2c3136', new THREE.PlaneGeometry(W + 0.4, 0.5).translate(bx, 0.8, bz), {
    cast: false,
    opts: { transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false },
  });
  kit.box('#e9ece6', W + 0.4, 0.04, 0.02, bx, 1.03, bz, { cast: false });
  nav.block(bx - W / 2 - 0.36, bx + W / 2 + 0.36, bz - 0.12, bz + 0.12);
  // a shuttlecock or two on the floor
  for (const [sx, sz] of [
    [1.3, bz + 1.9],
    [-0.8, bz - 2.6],
  ])
    kit.cyl('#f2f2ee', 0.04, 0.015, 0.06, sx, 0, sz, { seg: 8, rz: 1.2, cast: false });
  // the basketball court's sidelines and its three-point arc's ends near the net, in red
  for (const s of [-1, 1]) line(C.red, 0.05, 9.0, s * 8.6, -6.1);
  line(C.red, 17.2, 0.05, 0, -1.6);
}

// the walls' wainscot of boards to 0.8 and its rail, the high windows over it on the east and west walls (sky
// beyond), the clock on the far wall
function walls(kit) {
  const { x0, x1, z0, z1 } = R,
    wh = 0.8;
  kit.box(C.wainscot, x1 - x0, wh, 0.03, 0, 0, z0 + 0.015, { surf: 'laminate' });
  for (const x of [x0 + 0.015, x1 - 0.015])
    kit.box(C.wainscot, 0.03, wh, z1 - z0, x, 0, (z0 + z1) / 2, { surf: 'laminate' });
  kit.box('#7a5f3c', x1 - x0, 0.04, 0.05, 0, wh, z0 + 0.025);
  for (const x of [x0 + 0.025, x1 - 0.025]) kit.box('#7a5f3c', 0.05, 0.04, z1 - z0, x, wh, (z0 + z1) / 2);
  for (const x of [x0 + 0.02, x1 - 0.02])
    for (let z = z0 + 0.9; z < z1 - 1.2; z += 1.7) {
      kit.box('#5d6470', 0.04, 0.62, 1.26, x, 1.32, z + 0.63, { surf: 'frame' });
      kit.box(C.sky, 0.045, 0.54, 1.18, x, 1.36, z + 0.63, { opts: { emissive: C.sky, emissiveIntensity: 0.55 } });
    }
  // the clock over the net, on the far wall
  kit.add(
    '#2f3640',
    new THREE.CylinderGeometry(0.2, 0.2, 0.04, 20).rotateX(Math.PI / 2).translate(-3.2, 1.75, z0 + 0.03),
  );
  kit.add(
    '#f2f2ee',
    new THREE.CylinderGeometry(0.17, 0.17, 0.02, 20).rotateX(Math.PI / 2).translate(-3.2, 1.75, z0 + 0.05),
  );
  kit.box('#2f3640', 0.015, 0.12, 0.01, -3.2, 1.75, z0 + 0.065, { rz: 0.5 });
  kit.box('#2f3640', 0.015, 0.09, 0.01, -3.2, 1.75, z0 + 0.065, { rz: -1.9 });
}

// the entrance: the tiles inside the doors, a step up to the maple at their edge; a mat; the shoe lockers either side
// facing in, cubbies with a few pairs of shoes; a crate of green slippers
function entrance(kit, nav) {
  const [tx0, tx1, tz0] = TILES;
  kit.box(C.tiles, tx1 - tx0, 0.012, -tz0, 0, 0, tz0 / 2, { surf: 'tile', cast: false });
  kit.box('#6b6f74', tx1 - tx0, 0.02, 0.06, 0, 0, tz0, { cast: false });
  kit.box('#4d5a63', 1.5, 0.014, 0.7, 0, 0.004, -0.5, { surf: 'carpet', cast: false });
  // the glass doors' frames standing in the gap of the front wall, open
  for (const x of DOOR) kit.box('#3f4650', 0.06, 0.26, 0.08, x, 0, R.z1 + 0.09);
  const shoes = ['#2f3640', '#e8e6df', '#b5463c', '#4b6a8f', '#6b5a46'];
  for (const [x, f] of [
    [tx0 - 0.2, 1],
    [tx1 + 0.2, -1],
  ]) {
    kit.box(C.locker, 0.36, 0.86, 1.3, x, 0, -0.75, { r: 0.01, surf: 'metal' });
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++) {
        const y = 0.08 + r * 0.2,
          z = -1.3 + c * 0.32 + 0.11;
        kit.box(C.slot, 0.01, 0.15, 0.26, x + f * 0.18, y, z, { cast: false });
        if ((r * 4 + c) % 3 === 0) kit.box(shoes[(r + c) % shoes.length], 0.02, 0.06, 0.2, x + f * 0.17, y + 0.01, z);
      }
    nav.block(x - 0.22, x + 0.22, -1.45, -0.05);
  }
  const sx = tx0 + 0.55,
    sz = tz0 - 0.4;
  kit.box('#3f6a78', 0.5, 0.16, 0.34, sx, 0, sz, { surf: 'plastic' });
  for (let i = 0; i < 4; i++) kit.box(C.green, 0.1, 0.03, 0.22, sx - 0.16 + i * 0.1, 0.16, sz + (i % 2) * 0.02);
  nav.block(sx - 0.3, sx + 0.3, sz - 0.22, sz + 0.22);
  return { lockers: [tx0 + 0.45, -0.6] };
}

// the attendant's desk: the counter along x, its front facing the hall, a low return along the tiles; on it the
// booking terminal, the desk fan and the printer, the booking sheets in a tray and a bell; behind it the chair and a
// low cabinet; the AED in its white box on the east wall
function counter(kit, nav) {
  const { x0, x1, z, d, h } = COUNTER;
  const cz = z;
  kit.box(C.counterFront, x1 - x0, h - 0.04, d, (x0 + x1) / 2, 0, cz, { surf: 'laminate' });
  kit.box(C.counter, x1 - x0 + 0.06, 0.04, d + 0.08, (x0 + x1) / 2, h - 0.04, cz, { surf: 'laminate' });
  kit.box(C.counterFront, d, h - 0.04, 1.4, x0 + d / 2, 0, cz + 0.95, { surf: 'laminate' });
  kit.box(C.counter, d + 0.08, 0.04, 1.46, x0 + d / 2, h - 0.04, cz + 0.95, { surf: 'laminate' });
  nav.block(x0 - 0.08, x1 + 0.08, cz - d / 2 - 0.06, cz + d / 2 + 0.06);
  nav.block(x0 - 0.08, x0 + d + 0.08, cz, cz + 1.7);
  nav.block(x0 + d, R.x1, cz + d / 2, R.z1); // behind the counter: the attendant's side
  const top = h;
  const term = terminal(kit, x0 + 0.85, top, cz - 0.02, Math.PI);
  const fan = deskFan(kit, x0 + 1.75, top, cz + 0.05, Math.PI + 0.35);
  const prn = printer(kit, x1 - 0.5, top, cz, Math.PI);
  kit.box('#3e434d', 0.26, 0.04, 0.2, x0 + 2.45, top, cz - 0.08, { surf: 'plastic' });
  kit.box('#f4f2ec', 0.21, 0.02, 0.16, x0 + 2.45, top + 0.03, cz - 0.08, { surf: 'paper' });
  kit.cyl('#c9c4b6', 0.04, 0.05, 0.03, x0 + 2.85, top, cz - 0.12, { seg: 12, surf: 'metal' });
  kit.cyl('#d9b24a', 0.008, 0.008, 0.03, x0 + 2.85, top + 0.03, cz - 0.12, { seg: 6 });
  // behind it: the chair, a low cabinet along the front wall with binders on it
  const chx = x0 + 1.4,
    chz = cz + 0.75;
  kit.box('#3a4254', 0.32, 0.05, 0.3, chx, 0.24, chz, { surf: 'fabric' });
  kit.box('#3a4254', 0.32, 0.3, 0.05, chx, 0.29, chz + 0.16, { surf: 'fabric' });
  kit.cyl(C.steel, 0.02, 0.02, 0.22, chx, 0.02, chz, { seg: 6, surf: 'metal' });
  kit.box('#2f333b', 0.34, 0.03, 0.34, chx, 0, chz, { surf: 'plastic' });
  kit.box('#8e949e', 2.0, 0.4, 0.34, x1 - 1.0, 0, R.z1 - 0.26, { surf: 'drawerfront' });
  for (let i = 0; i < 6; i++)
    kit.box(['#4a6490', '#6a7a8c', '#b5463c'][i % 3], 0.05, 0.22, 0.2, x1 - 1.8 + i * 0.07, 0.4, R.z1 - 0.26);
  // the AED box under the club board
  kit.box('#f2f2ee', 0.04, 0.34, 0.3, R.x1 - 0.03, 0.42, -3.75, { surf: 'plastic' });
  kit.box('#c9473f', 0.045, 0.08, 0.3, R.x1 - 0.035, 0.68, -3.75);
  kit.box('#3f8f6a', 0.046, 0.06, 0.06, R.x1 - 0.036, 0.52, -3.75, {
    opts: { emissive: '#3f8f6a', emissiveIntensity: 0.6 },
  });
  return { terminal: term, printer: prn, fan };
}

// the equipment store in the south-west corner: its two walls, cut down like the room's front wall wherever they
// stand between the camera and the hall (the B2 office's low inner walls), the sliding door pushed open along the
// north one; inside, a cart of basketballs, a cart of volleyballs, blue mats stacked, the badminton net posts and a
// shelf
function store(kit, nav) {
  const { x0, x1, z0, door } = STORE,
    h = 0.62,
    t = 0.1;
  kit.box(C.wall, t, h, -z0, x1, 0, z0 / 2, { surf: 'plaster' });
  kit.box(C.wall, door[0] - x0, h, t, (x0 + door[0]) / 2, 0, z0, { surf: 'plaster' });
  kit.box(C.wall, x1 - door[1], h, t, (door[1] + x1) / 2, 0, z0, { surf: 'plaster' });
  kit.box(
    '#8e949e',
    door[1] - door[0] + 0.1,
    h - 0.02,
    0.04,
    (door[0] + door[1]) / 2 + (door[1] - door[0]) * 0.55,
    0,
    z0 - 0.08,
    { surf: 'door' },
  );
  kit.box('#2f333b', 0.02, 0.006, door[1] - door[0], (door[0] + door[1]) / 2, 0, z0, {
    cast: false,
    rz: 0,
    ry: Math.PI / 2,
  });
  nav.block(x0, door[0], z0 - t, z0 + t); // its north wall either side of the door
  nav.block(door[1], x1 + t, z0 - t, z0 + t);
  nav.block(x1 - t, x1 + t + 0.02, z0, 0); // its east wall
  // inside: the carts, the mats, the posts, a shelf
  const cart = (cx, cz, ball, n) => {
    kit.box(C.steel, 0.5, 0.04, 0.5, cx, 0.05, cz, { surf: 'metal' });
    for (const [dx, dz] of [
      [-0.24, -0.24],
      [0.24, -0.24],
      [-0.24, 0.24],
      [0.24, 0.24],
    ])
      kit.box(C.steel, 0.025, 0.55, 0.025, cx + dx, 0.05, cz + dz, { surf: 'metal' });
    for (let i = 0; i < n; i++)
      kit.add(
        ball,
        new THREE.IcosahedronGeometry(0.1, 1).translate(
          cx - 0.13 + (i % 3) * 0.13,
          0.19 + Math.floor(i / 9) * 0.16,
          cz - 0.13 + (Math.floor(i / 3) % 3) * 0.13,
        ),
      );
  };
  cart(-8.6, -2.3, '#d8743a', 14);
  cart(-7.8, -2.3, '#ece9df', 11);
  for (let i = 0; i < 5; i++)
    kit.box(i % 2 ? '#3e6aa8' : '#365f98', 1.0, 0.08, 0.7, -8.75, i * 0.08, -1.0, { surf: 'fabric' });
  for (let i = 0; i < 3; i++) kit.box(C.steel, 0.05, 0.05, 1.2, -7.4 + i * 0.09, 0, -0.75, { surf: 'metal' });
  kit.box('#8e949e', 0.3, 0.5, 0.9, -6.75, 0, -0.9, { surf: 'metal' });
  for (let i = 0; i < 3; i++)
    kit.box(['#e8c34a', '#3f8f6a', '#b5463c'][i], 0.22, 0.06, 0.24, -6.75, 0.5, -1.15 + i * 0.26, {
      surf: 'fabric',
    });
  nav.block(-9.1, -7.45, -2.65, -1.95); // the carts
  nav.block(R.x0, -8.2, -1.4, -0.6); // the mats
  nav.block(-7.5, -7.15, -1.4, -0.1); // the posts
  nav.block(-6.95, x1, -1.4, -0.4); // the shelf
}

// two long benches down the west wall, facing the hall: a boarded seat on two steel frames
function benches(kit, nav) {
  for (const [x, z] of BENCHES) {
    kit.box(C.bench, 0.3, 0.04, BENCH_LEN, x, 0.2, z, { surf: 'laminate' });
    for (const s of [-1, 1]) {
      kit.box(C.steel, 0.24, 0.2, 0.03, x, 0, z + s * (BENCH_LEN / 2 - 0.2), { surf: 'metal' });
      kit.box(C.steel, 0.03, 0.02, 0.03, x, 0.1, z + s * (BENCH_LEN / 2 - 0.2));
    }
    nav.block(R.x0, x + 0.2, z - BENCH_LEN / 2 - 0.05, z + BENCH_LEN / 2 + 0.05);
  }
}

// the winter meeting corner: folding chairs in two rows facing a whiteboard on wheels, notes from the last meeting on
// it; a trolley of folded chairs against the east wall
function meeting(kit, nav) {
  const { x0, x1, rows, board } = MEETING;
  for (const z of rows)
    for (let x = x0 + 0.3; x < x1; x += 0.8) {
      kit.box('#4f7f9a', 0.3, 0.025, 0.28, x, 0.24, z, { surf: 'plastic' });
      kit.box('#4f7f9a', 0.3, 0.22, 0.025, x, 0.3, z + 0.14, { surf: 'plastic' });
      for (const dx of [-0.13, 0.13]) {
        kit.box(C.steel, 0.02, 0.26, 0.02, x + dx, 0, z - 0.12, { surf: 'metal' });
        kit.box(C.steel, 0.02, 0.5, 0.02, x + dx, 0, z + 0.15, { surf: 'metal' });
      }
    }
  nav.block(x0, x1 + 0.1, rows[1] - 0.25, rows[0] + 0.25);
  const [bx, bz] = board;
  kit.box('#f4f4f0', 1.2, 0.7, 0.03, bx, 0.45, bz, { surf: 'paint' });
  kit.box('#8b919b', 1.26, 0.04, 0.06, bx, 0.43, bz, { surf: 'metal' });
  for (const s of [-1, 1]) {
    kit.box(C.steel, 0.03, 1.18, 0.03, bx + s * 0.62, 0, bz, { surf: 'metal' });
    kit.box(C.steel, 0.03, 0.03, 0.4, bx + s * 0.62, 0.03, bz, { surf: 'metal' });
  }
  for (let i = 0; i < 4; i++)
    kit.box(
      ['#3e6aa8', '#3e6aa8', '#c9473f', '#3e6aa8'][i],
      0.5 - i * 0.08,
      0.02,
      0.004,
      bx - 0.25 + (i % 2) * 0.08,
      1.0 - i * 0.12,
      bz + 0.02,
    );
  nav.block(bx - 0.7, bx + 0.7, bz - 0.25, bz + 0.25);
  // the trolley of folded chairs
  const tx = R.x1 - 0.35,
    tz = -6.6;
  kit.box(C.steel, 0.4, 0.05, 1.0, tx, 0.05, tz, { surf: 'metal' });
  for (let i = 0; i < 8; i++)
    kit.box('#4f7f9a', 0.3, 0.6, 0.03, tx, 0.1, tz - 0.4 + i * 0.1, { surf: 'plastic', rx: 0.08 });
  nav.block(tx - 0.25, R.x1, tz - 0.55, tz + 0.55);
}

// the divider net across the hall, hung from a rail, weighted at the floor; the basketball goal on the far wall over it
function net(kit) {
  const { x0, x1, z0 } = R;
  kit.box(C.steel, x1 - x0, 0.04, 0.04, 0, 1.95, NET_Z, { surf: 'metal' });
  kit.add(C.net, new THREE.PlaneGeometry(x1 - x0, 1.9).translate(0, 0.98, NET_Z), {
    cast: false,
    opts: { transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false },
  });
  kit.box('#24493a', x1 - x0, 0.06, 0.05, 0, 0, NET_Z, { cast: false });
  // the goal: a white backboard with its red square, the orange ring, on a bracket off the wall
  kit.box('#f2f2ee', 1.1, 0.66, 0.04, 0, 1.45, z0 + 0.45, { surf: 'plastic' });
  kit.box(C.red, 0.4, 0.3, 0.005, 0, 1.52, z0 + 0.475);
  kit.add('#d8743a', new THREE.TorusGeometry(0.15, 0.015, 6, 16).rotateX(Math.PI / 2).translate(0, 1.5, z0 + 0.66));
  kit.box(C.steel, 0.08, 0.08, 0.45, 0, 1.75, z0 + 0.22, { surf: 'metal' });
}
