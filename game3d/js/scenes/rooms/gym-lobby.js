// The gym's lobby furniture (scenes/rooms/gym.js builds the room; gym-plan.js has the plan): the entrance's tiles,
// step, shoe lockers and slipper rack; the reception counter with its machines, the staff side's chair, back counter,
// printer and key box; the waiting benches, the umbrella stand, the drinks machine and the plant. Each laid into the room's Kit, each
// blocking its footprint on the walk grid.
import * as THREE from 'three';
import { terminal, printer } from './machines.js';
import { C, R, DOOR, TILES, GLASS_Z, COUNTER, BACK, FRONT, TERM_Z } from './gym-plan.js';

// the entrance: the tiles inside the doors, the step up to the lobby floor at their edge; a mat; the shoe lockers
// either side facing in, cubbies with a few pairs of shoes; the slipper rack on the step; the lobby's floor
export function entrance(kit, nav) {
  const [tx0, tx1, tz0] = TILES;
  kit.box(C.tiles, tx1 - tx0, 0.006, -tz0, 0, 0, tz0 / 2, {
    surf: 'tile',
    cast: false,
  });
  kit.box(C.lobby, R.x1 - R.x0, 0.008, tz0 - GLASS_Z, 0, 0, (tz0 + GLASS_Z) / 2, { surf: 'tile', cast: false });
  kit.box(C.lobby, tx0 - R.x0, 0.008, -tz0, (R.x0 + tx0) / 2, 0, tz0 / 2, {
    surf: 'tile',
    cast: false,
  });
  kit.box(C.lobby, R.x1 - tx1, 0.008, -tz0, (R.x1 + tx1) / 2, 0, tz0 / 2, {
    surf: 'tile',
    cast: false,
  });
  kit.box('#6b6f74', tx1 - tx0, 0.035, 0.06, 0, 0, tz0, { cast: false }); // the step's nosing
  kit.box('#4d5a63', 1.5, 0.014, 0.7, 0, 0.004, -0.5, {
    surf: 'carpet',
    cast: false,
  });
  // the glass doors' frames standing in the gap of the front wall, open
  for (const x of DOOR) kit.box(C.frame, 0.06, 0.26, 0.08, x, 0, R.z1 + 0.09);
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
  // the slipper rack on the step, west of the way in: two shelves of green slippers, two pairs set out on the step
  const sx = -1.75,
    sz = tz0 - 0.3;
  kit.box(C.steel, 1.1, 0.03, 0.3, sx, 0.03, sz, { surf: 'metal' });
  kit.box(C.steel, 1.1, 0.03, 0.3, sx, 0.2, sz, { surf: 'metal' });
  for (const dx of [-0.53, 0.53]) kit.box(C.steel, 0.03, 0.36, 0.3, sx + dx, 0.03, sz, { surf: 'metal' });
  for (const y of [0.06, 0.23])
    for (let i = 0; i < 8; i++) kit.box(C.green, 0.1, 0.03, 0.22, sx - 0.44 + i * 0.125, y, sz + (i % 2) * 0.02);
  for (const x of [0.75, 1.05]) kit.box(C.green, 0.1, 0.03, 0.22, x, 0.03, tz0 - 0.2);
  nav.block(sx - 0.6, sx + 0.6, sz - 0.2, sz + 0.2);
  return { lockers: [tx0 + 0.45, -0.6] };
}

// the reception: the counter along z, its front facing east into the lobby, its top running a little over; on it
// the booking terminal facing the lobby, the desk fan, a tray of booking sheets, a bell and a pen stand; behind it
// the attendant's chair; along the west wall the back counter with the printer, a cabinet of binders under the key
// box; 受付 RECEPTION over the staff side, on the glass wall
export function reception(kit, nav, signs) {
  const { x, d, h, z0, z1 } = COUNTER,
    len = z1 - z0,
    mz = (z0 + z1) / 2;
  kit.box(C.counterFront, d, h - 0.04, len, x, 0, mz, { surf: 'laminate' });
  kit.box(C.counter, d + 0.1, 0.04, len + 0.06, x + 0.03, h - 0.04, mz, {
    surf: 'laminate',
  });
  kit.box('#e9ece6', 0.004, 0.05, len, FRONT + 0.002, h - 0.16, mz, {
    cast: false,
  }); // a pale band along its front
  nav.block(x - d / 2 - 0.06, FRONT + 0.1, z0 - 0.06, z1 + 0.06);
  nav.block(x - d / 2 - 0.06, FRONT + 0.1, z1, R.z1); // the bit between its end and the front wall
  const term = terminal(kit, x + 0.05, h, TERM_Z, Math.PI / 2);
  const fan = [x - 0.02, h + 0.5, -0.85];
  kit.box(C.slot, 0.2, 0.04, 0.26, x + 0.02, h, -1.45); // the sheets' tray
  kit.box('#f4f2ec', 0.16, 0.02, 0.21, x + 0.02, h + 0.03, -1.45, {
    surf: 'paper',
  });
  kit.cyl('#c9c4b6', 0.04, 0.05, 0.03, x + 0.12, h, -1.85, {
    seg: 12,
    surf: 'metal',
  }); // the bell
  kit.cyl('#d9b24a', 0.008, 0.008, 0.03, x + 0.12, h + 0.03, -1.85, { seg: 6 });
  kit.cyl(C.slot, 0.03, 0.03, 0.08, x - 0.1, h, -3.2, { seg: 8 }); // the pen stand
  for (const dz of [-0.01, 0.01])
    kit.box(C.blue, 0.008, 0.07, 0.008, x - 0.1, h + 0.06, -3.2 + dz, {
      rx: dz * 8,
    });
  // behind: the chair
  const chx = x - 0.85,
    chz = -1.3;
  kit.box('#3a4254', 0.3, 0.05, 0.32, chx, 0.24, chz, { surf: 'fabric' });
  kit.box('#3a4254', 0.05, 0.3, 0.32, chx - 0.16, 0.29, chz, {
    surf: 'fabric',
  });
  kit.cyl(C.steel, 0.02, 0.02, 0.22, chx, 0.02, chz, { seg: 6, surf: 'metal' });
  kit.box(C.slot, 0.34, 0.03, 0.34, chx, 0, chz);
  nav.block(chx - 0.25, chx + 0.22, chz - 0.22, chz + 0.22);
  // the back counter along the west wall: cabinet doors, the printer on it, binders at its south end
  const bw = BACK.x1 - BACK.x0,
    bx = (BACK.x0 + BACK.x1) / 2,
    bl = BACK.z1 - BACK.z0;
  kit.box('#8e949e', bw, h - 0.04, bl, bx, 0, (BACK.z0 + BACK.z1) / 2, {
    surf: 'drawerfront',
  });
  kit.box(C.counter, bw + 0.04, 0.04, bl + 0.04, bx, h - 0.04, (BACK.z0 + BACK.z1) / 2, { surf: 'laminate' });
  nav.block(R.x0, BACK.x1 + 0.08, BACK.z0 - 0.06, BACK.z1 + 0.06);
  const prn = printer(kit, bx - 0.05, h, -2.75, Math.PI / 2);
  for (let i = 0; i < 6; i++) kit.box([C.blue, C.steel, C.red][i % 3], 0.2, 0.22, 0.05, bx, h, -0.8 - i * 0.07);
  // the key box on the wall over it: a grey steel box, its door open a crack on rows of hooks and tags
  kit.box(C.locker, 0.06, 0.4, 0.5, R.x0 + 0.03, 1.0, -1.55, { surf: 'metal' });
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 4; c++)
      kit.box(
        ['#e8c34a', C.blue, C.red][(r + c) % 3],
        0.015,
        0.05,
        0.04,
        R.x0 + 0.07,
        1.06 + r * 0.11,
        -1.73 + c * 0.12,
      );
  signs.board('受付', 'RECEPTION', '#4f6f8a', 1.3, 0.34, [-7.1, 1.78, GLASS_Z + 0.06], 0);
  // and a plate standing on the counter's north end, facing the doors
  kit.box(C.slot, 0.5, 0.03, 0.08, x + 0.02, h, z0 + 0.12);
  signs.board('受付', 'RECEPTION', '#4f6f8a', 0.5, 0.17, [x + 0.02, h + 0.115, z0 + 0.12], 0);
  return { terminal: term, printer: prn, fan };
}

// the lobby's east side: a waiting bench along the east wall facing in, a drinks machine, a potted plant by the
// reception, a shoe-cleaning mat at the step
export function lobby(kit, nav) {
  const bx = R.x1 - 0.3,
    bz = -1.5,
    bl = 2.0;
  kit.box(C.blue, 0.36, 0.06, bl, bx, 0.2, bz, { r: 0.02, surf: 'fabric' });
  kit.box(C.blue, 0.06, 0.32, bl, bx + 0.17, 0.26, bz, {
    r: 0.02,
    surf: 'fabric',
  });
  for (const s of [-1, 1])
    kit.box(C.steel, 0.3, 0.2, 0.04, bx, 0, bz + s * (bl / 2 - 0.15), {
      surf: 'metal',
    });
  nav.block(bx - 0.25, R.x1, bz - bl / 2 - 0.05, bz + bl / 2 + 0.05);
  // a second bench across the lobby facing the doors, and the umbrella stand inside them
  const sx = 5.7,
    sz = -2.4,
    sl = 2.0;
  kit.box(C.blue, sl, 0.06, 0.36, sx, 0.2, sz, { r: 0.02, surf: 'fabric' });
  kit.box(C.blue, sl, 0.32, 0.06, sx, 0.26, sz - 0.17, {
    r: 0.02,
    surf: 'fabric',
  });
  for (const s of [-1, 1])
    kit.box(C.steel, 0.04, 0.2, 0.3, sx + s * (sl / 2 - 0.15), 0, sz, {
      surf: 'metal',
    });
  nav.block(sx - sl / 2 - 0.05, sx + sl / 2 + 0.05, sz - 0.25, sz + 0.25);
  const ux = 3.3,
    uz = -0.35;
  kit.cyl(C.steel, 0.13, 0.13, 0.36, ux, 0, uz, { seg: 10, surf: 'metal' });
  for (const [dx, dz, col] of [
    [-0.04, 0.03, '#2f3640'],
    [0.05, -0.02, C.blue],
    [0.0, 0.06, C.red],
  ])
    kit.cyl(col, 0.012, 0.012, 0.62, ux + dx, 0.05, uz + dz, {
      seg: 6,
      rx: dx * 2,
      rz: -dz * 2,
    });
  nav.block(ux - 0.18, ux + 0.18, uz - 0.18, uz + 0.18);
  // the drinks machine: white, a dark window of bottles, the coin panel
  const vx = R.x1 - 0.32,
    vz = -3.5;
  kit.box('#e9e6de', 0.6, 1.45, 0.75, vx, 0, vz, { r: 0.02, surf: 'plastic' });
  kit.box(C.dark, 0.02, 0.62, 0.6, vx - 0.3, 0.7, vz);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 5; c++)
      kit.box(
        [C.blue, '#d8743a', C.green, '#e8c34a', C.red][(r * 2 + c) % 5],
        0.03,
        0.13,
        0.07,
        vx - 0.31,
        0.76 + r * 0.19,
        vz - 0.24 + c * 0.12,
      );
  kit.box(C.slot, 0.02, 0.3, 0.12, vx - 0.31, 0.32, vz + 0.18);
  kit.box(C.slot, 0.02, 0.1, 0.4, vx - 0.31, 0.06, vz - 0.05);
  nav.block(vx - 0.38, R.x1, vz - 0.42, vz + 0.42);
  // the plant in a white pot, beside the reception's front
  const px = FRONT + 0.4,
    pz = -0.45;
  kit.cyl('#e9e6de', 0.16, 0.12, 0.3, px, 0, pz, { seg: 12, surf: 'plastic' });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    kit.add(
      '#3f6f3f',
      new THREE.ConeGeometry(0.09, 0.5, 5).translate(0, 0.25, 0).rotateX(0.35).rotateY(a).translate(px, 0.3, pz),
    );
  }
  nav.block(px - 0.22, px + 0.22, pz - 0.22, pz + 0.22);
  return { seats: [sx, sz + 0.7] };
}
