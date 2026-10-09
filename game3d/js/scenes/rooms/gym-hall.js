// The gym's sports hall (scenes/rooms/gym.js lays the lobby; gym-plan.js has the plan): the court's lines and the red
// boundary, the hall's walls (the wainscot, the high windows, the goal, the clock), the equipment store, the
// benches by the windows and the cart of volleyballs, the winter meeting corner. Each laid into the room's Kit, each
// blocking its footprint on the walk grid.
import * as THREE from 'three';
import { gymWindows, ballCart, equipmentShelf, gymMats } from './gym-fixtures.js';
import { C, R, GLASS_Z, BLOCK, STORE, BENCHES, BENCH_LEN, COURT, MEETING } from './gym-plan.js';

// the lines on the hall's floor: the badminton court across the north part in green, its net up; the red boundary
// round the hall
export function courtLines(kit, nav) {
  const line = (color, w, d, x, z) => kit.box(color, w, 0.004, d, x, 0.001, z, { cast: false });
  const { x: bx, z: bz, L, W } = COURT;
  for (const s of [-1, 1]) {
    line(C.green, 0.04, W, bx + (s * L) / 2, bz);
    line(C.green, L, 0.04, bx, bz + (s * W) / 2);
    line(C.green, L, 0.04, bx, bz + s * (W / 2 - 0.3));
    line(C.green, 0.04, W, bx + s * 1.3, bz);
    line(C.green, 0.04, W, bx + s * (L / 2 - 0.5), bz);
  }
  line(C.green, L / 2 - 1.3, 0.04, bx - (L / 4 + 0.65), bz);
  line(C.green, L / 2 - 1.3, 0.04, bx + (L / 4 + 0.65), bz);
  // its net up across the middle on two posts in weighted feet, as the last club left it
  const pz = W / 2 + 0.12;
  for (const s of [-1, 1]) {
    kit.cyl('#3e434d', 0.12, 0.14, 0.06, bx, 0, bz + s * pz, { seg: 12, surf: 'metal' });
    kit.cyl(C.steel, 0.025, 0.025, 1.04, bx, 0.06, bz + s * pz, { seg: 8, surf: 'metal' });
  }
  kit.add('#2c3136', new THREE.PlaneGeometry(W + 0.24, 0.5).rotateY(Math.PI / 2).translate(bx, 0.8, bz), {
    cast: false,
    opts: { transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false },
  });
  kit.box('#e9ece6', 0.02, 0.04, W + 0.24, bx, 1.03, bz, { cast: false });
  nav.block(bx - 0.12, bx + 0.12, bz - pz - 0.16, bz + pz + 0.16);
  // a shuttlecock or two on the floor
  for (const [sx, sz] of [
    [bx + 1.9, bz + 0.9],
    [bx - 2.6, bz - 0.8],
  ])
    kit.cyl('#f2f2ee', 0.04, 0.015, 0.06, sx, 0, sz, { seg: 8, rz: 1.2, cast: false });
  // the red boundary, 0.35 in from the hall's walls and round the changing block
  const i = 0.35,
    x0 = R.x0 + i,
    x1 = R.x1 - i,
    zn = R.z0 + i,
    zs = GLASS_Z - i,
    bx0 = BLOCK.x0 - i,
    bzn = BLOCK.z0 - i;
  line(C.red, 0.05, zs - zn, x0, (zs + zn) / 2);
  line(C.red, x1 - x0, 0.05, (x0 + x1) / 2, zn);
  line(C.red, 0.05, bzn - zn, x1, (bzn + zn) / 2);
  line(C.red, x1 - bx0, 0.05, (bx0 + x1) / 2, bzn);
  line(C.red, 0.05, zs - bzn, bx0, (zs + bzn) / 2);
  line(C.red, bx0 - x0, 0.05, (x0 + bx0) / 2, zs);
}

// The hall's wainscot and rail, high frosted windows on the west, north and east walls,
// the lobby's plain walls, and the basketball goal and clock on the north wall.
export function hallWalls(kit) {
  const { x0, x1, z0 } = R,
    wh = 0.8,
    hz = GLASS_Z; // the hall's south edge
  kit.box(C.wainscot, x1 - x0, wh, 0.03, 0, 0, z0 + 0.015, { surf: 'laminate' });
  kit.box(C.wainscot, 0.03, wh, hz - z0, x0 + 0.015, 0, (z0 + hz) / 2, { surf: 'laminate' });
  kit.box(C.wainscot, 0.03, wh, BLOCK.z0 - z0, x1 - 0.015, 0, (z0 + BLOCK.z0) / 2, { surf: 'laminate' });
  kit.box('#7a5f3c', x1 - x0, 0.04, 0.05, 0, wh, z0 + 0.025);
  kit.box('#7a5f3c', 0.05, 0.04, hz - z0, x0 + 0.025, wh, (z0 + hz) / 2);
  kit.box('#7a5f3c', 0.05, 0.04, BLOCK.z0 - z0, x1 - 0.025, wh, (z0 + BLOCK.z0) / 2);
  gymWindows(kit);
  // the goal over the court's middle: a white backboard with its red square, the orange ring, on a bracket
  const gx = COURT.x;
  kit.box('#f2f2ee', 1.1, 0.66, 0.04, gx, 1.35, z0 + 0.45, { surf: 'plastic' });
  kit.box(C.red, 0.4, 0.3, 0.005, gx, 1.42, z0 + 0.475);
  kit.add('#d8743a', new THREE.TorusGeometry(0.15, 0.015, 6, 16).rotateX(Math.PI / 2).translate(gx, 1.4, z0 + 0.66));
  kit.box(C.steel, 0.08, 0.08, 0.45, gx, 1.65, z0 + 0.22, { surf: 'metal' });
  // the clock on the north wall, over the meeting corner
  const cx = MEETING.board[0];
  kit.add(
    '#2f3640',
    new THREE.CylinderGeometry(0.2, 0.2, 0.04, 20).rotateX(Math.PI / 2).translate(cx, 1.75, z0 + 0.03),
  );
  kit.add(
    '#f2f2ee',
    new THREE.CylinderGeometry(0.17, 0.17, 0.02, 20).rotateX(Math.PI / 2).translate(cx, 1.75, z0 + 0.05),
  );
  kit.box('#2f3640', 0.015, 0.12, 0.01, cx, 1.75, z0 + 0.065, { rz: 0.5 });
  kit.box('#2f3640', 0.015, 0.09, 0.01, cx, 1.75, z0 + 0.065, { rz: -1.9 });
}

// the equipment store in the north-west corner of the hall: its two walls, cut down like the room's front wall
// wherever they stand between the camera and the hall (the B2 office's low inner walls), the sliding door in its
// south wall pushed open; inside, a cart of basketballs, a cart of volleyballs, blue mats stacked, the badminton net
// posts and a shelf of bibs
export function store(kit, nav) {
  const { x0, x1, z0, z1, door } = STORE,
    h = 0.62,
    t = 0.1;
  kit.box(C.wall, t, h, z1 - z0, x1, 0, (z0 + z1) / 2, { surf: 'plaster' });
  kit.box(C.wall, door[0] - x0, h, t, (x0 + door[0]) / 2, 0, z1, { surf: 'plaster' });
  kit.box(C.wall, x1 - door[1], h, t, (door[1] + x1) / 2, 0, z1, { surf: 'plaster' });
  kit.box(
    '#8e949e',
    door[1] - door[0] + 0.1,
    h - 0.02,
    0.04,
    (door[0] + door[1]) / 2 + (door[1] - door[0]) * 0.55,
    0,
    z1 - 0.08,
    { surf: 'door' },
  );
  nav.block(x0, door[0], z1 - t, z1 + t);
  nav.block(door[1], x1 + t, z1 - t, z1 + t);
  nav.block(x1 - t, x1 + t + 0.02, z0, z1);
  ballCart(kit, -8.75, -11.4, '#d8743a', 14);
  ballCart(kit, -7.95, -11.4, '#ece9df', 11);
  gymMats(kit);
  for (let i = 0; i < 3; i++) kit.box(C.steel, 1.2, 0.05, 0.05, -7.5, 0, -12.75 + i * 0.09, { surf: 'metal' });
  equipmentShelf(kit);
  nav.block(-9.1, -7.6, -11.75, -11.05); // the carts
  nav.block(R.x0, -8.4, -12.9, -11.8); // the mats
  nav.block(-8.15, -6.85, -12.95, -12.5); // the posts
  nav.block(-7.1, x1, -12.4, -11.4); // the shelf
}

// two long benches down the hall's west wall by the windows, facing the hall: a boarded seat on two steel frames;
// a cart of volleyballs left inside the doors
export function benches(kit, nav) {
  for (const [x, z] of BENCHES) {
    kit.box(C.bench, 0.3, 0.04, BENCH_LEN, x, 0.2, z, { surf: 'laminate' });
    for (const s of [-1, 1]) {
      kit.box(C.steel, 0.24, 0.2, 0.03, x, 0, z + s * (BENCH_LEN / 2 - 0.2), { surf: 'metal' });
      kit.box(C.steel, 0.03, 0.02, 0.03, x, 0.1, z + s * (BENCH_LEN / 2 - 0.2));
    }
    nav.block(R.x0, x + 0.2, z - BENCH_LEN / 2 - 0.05, z + BENCH_LEN / 2 + 0.05);
  }
  const cx = -3.4,
    cz = -6.1;
  ballCart(kit, cx, cz, '#ece9df', 9);
  nav.block(cx - 0.3, cx + 0.3, cz - 0.3, cz + 0.3);
}

// the winter meeting corner: folding chairs in two rows facing a whiteboard on wheels by the north wall, notes from
// the last meeting on it; a trolley of folded chairs against the east wall
export function meeting(kit, nav) {
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
  const tx = R.x1 - 0.35,
    tz = -9.6;
  kit.box(C.steel, 0.4, 0.05, 1.0, tx, 0.05, tz, { surf: 'metal' });
  for (let i = 0; i < 8; i++)
    kit.box('#4f7f9a', 0.3, 0.6, 0.03, tx, 0.1, tz - 0.4 + i * 0.1, { surf: 'plastic', rx: 0.08 });
  nav.block(tx - 0.25, R.x1, tz - 0.55, tz + 0.55);
}
