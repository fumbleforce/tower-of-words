// The room's furniture: the desk and its lamp in the back-left corner, the bed along the left wall, the oshiire
// closet in the back-right corner, a folding table on a rug with his dinner from the konbini, and his boxes from
// home stacked along the right wall, one of them open. Each returns where its thing is and blocks the nav grid.
import * as THREE from 'three';
import { X0, X1, BACK, PART, H, C } from './layout.js';

const BOX = '#b09474',
  BOX_IN = '#9c805f',
  TAPE = '#c9b48c';

export function desk(kit, nav) {
  // a grey steel desk against the left wall, a drawer pedestal, the lamp switched on over a closed laptop
  const x0 = X0 + 0.02,
    x1 = -0.62,
    z0 = BACK + 0.06,
    z1 = -1.98,
    top = 0.43,
    cx = (x0 + x1) / 2,
    cz = (z0 + z1) / 2;
  kit.box('#a4a8ae', x1 - x0, 0.03, z1 - z0, cx, top - 0.03, cz, {
    r: 0.006,
    surf: 'laminate',
  });
  kit.boxes(
    '#848a93',
    [
      [x1 - x0 - 0.04, top - 0.04, 0.22, cx, 0, z0 + 0.13],
      [0.03, top - 0.03, 0.03, x1 - 0.03, 0, z1 - 0.03],
      [x1 - x0 - 0.06, 0.03, 0.03, cx, 0.05, z1 - 0.03],
    ],
    { surf: 'metal' },
  );
  kit.boxes('#c9cdd2', [
    [0.012, 0.012, 0.1, x1 - 0.015, 0.33, z0 + 0.13],
    [0.012, 0.012, 0.1, x1 - 0.015, 0.18, z0 + 0.13],
  ]);
  // laptop, closed; the company handbook and forms from today; a mug
  kit.box('#3a3f48', 0.2, 0.018, 0.26, cx + 0.02, top, cz + 0.07, {
    r: 0.006,
    surf: 'plastic',
  });
  kit.box('#f2f0ea', 0.15, 0.02, 0.2, cx - 0.02, top, cz - 0.19, {
    ry: 0.2,
    surf: 'paper',
  });
  kit.box('#4a6490', 0.13, 0.025, 0.18, cx, top + 0.02, cz - 0.19, {
    ry: -0.1,
    surf: 'binder',
  });
  kit.cyl('#e9e6df', 0.03, 0.028, 0.07, x1 - 0.08, top, cz + 0.28, {
    surf: 'ceramic',
  });
  // the lamp: a round foot in the back corner, a post, an arm reaching out over the desk, the shade hanging from it
  const lx = x0 + 0.07,
    lz = z0 + 0.07,
    ex = cx + 0.04,
    ez = cz - 0.02,
    py = top + 0.34,
    len = Math.hypot(ex - lx, ez - lz);
  kit.cyl('#2f343c', 0.05, 0.055, 0.02, lx, top, lz, { seg: 14 });
  kit.cyl('#2f343c', 0.011, 0.011, py - top, lx, top, lz, { seg: 6 });
  kit.box('#2f343c', len, 0.018, 0.018, (lx + ex) / 2, py - 0.01, (lz + ez) / 2, {
    ry: Math.atan2(-(ez - lz), ex - lx),
  });
  kit.cyl('#2f343c', 0.028, 0.075, 0.09, ex, py - 0.1, ez, { seg: 14 });
  kit.cyl('#fff1d6', 0.07, 0.07, 0.004, ex, py - 0.104, ez, {
    seg: 14,
    cast: false,
    opts: { emissive: '#ffd9a0', emissiveIntensity: 2.2 },
  });
  // a wall shelf over the desk, nearly empty: a few books, a small plant from the office
  const sy = 0.92;
  kit.box('#c3c6ca', 0.17, 0.025, 0.62, X0 + 0.085, sy, cz, { r: 0.005, surf: 'laminate' });
  kit.boxes('#8b919b', [
    [0.1, 0.06, 0.015, X0 + 0.05, sy - 0.06, cz - 0.26],
    [0.1, 0.06, 0.015, X0 + 0.05, sy - 0.06, cz + 0.26],
  ]);
  kit.box('#4a6490', 0.12, 0.17, 0.03, X0 + 0.08, sy + 0.025, cz - 0.22, { surf: 'binder' });
  kit.box('#c96a5a', 0.11, 0.15, 0.025, X0 + 0.08, sy + 0.025, cz - 0.19, { surf: 'binder' });
  kit.box('#e9e6df', 0.11, 0.16, 0.03, X0 + 0.08, sy + 0.025, cz - 0.155, { rx: 0.25, surf: 'binder' });
  kit.cyl('#b3aea5', 0.035, 0.028, 0.06, X0 + 0.08, sy + 0.025, cz + 0.16, { seg: 10, surf: 'ceramic' });
  kit.cyl('#577650', 0.01, 0.045, 0.08, X0 + 0.08, sy + 0.085, cz + 0.16, { seg: 7 });
  // the chair, pulled out, facing the desk
  const chair = { x: -0.44, z: cz - 0.02 };
  kit.boxes(
    '#6f747c',
    [
      [0.025, 0.24, 0.025, chair.x - 0.1, 0, chair.z - 0.1],
      [0.025, 0.24, 0.025, chair.x + 0.1, 0, chair.z - 0.1],
      [0.025, 0.24, 0.025, chair.x - 0.1, 0, chair.z + 0.1],
      [0.025, 0.24, 0.025, chair.x + 0.1, 0, chair.z + 0.1],
      [0.025, 0.28, 0.025, chair.x + 0.11, 0.24, chair.z - 0.1],
      [0.025, 0.28, 0.025, chair.x + 0.11, 0.24, chair.z + 0.1],
    ],
    { surf: 'metal' },
  );
  kit.box('#2f3a5c', 0.24, 0.04, 0.24, chair.x, 0.24, chair.z, {
    r: 0.012,
    surf: 'fabric',
  });
  kit.box('#2f3a5c', 0.03, 0.13, 0.23, chair.x + 0.115, 0.38, chair.z, {
    r: 0.012,
    surf: 'fabric',
  });
  nav.block(X0, x1 + 0.02, z0 - 0.1, z1);
  nav.block(chair.x - 0.13, chair.x + 0.13, chair.z - 0.13, chair.z + 0.13);
  // where the lamp's light comes from
  return {
    lamp: new THREE.Vector3(ex, py - 0.14, ez),
    desk: { x: ex, z: ez, top },
  };
}

export function bed(kit, nav) {
  // a single bed along the left wall, head to the back: a white steel frame, the duvet thrown back, his work bag
  const x0 = X0 + 0.02,
    x1 = -0.43,
    z0 = -1.9,
    z1 = -0.62,
    cx = (x0 + x1) / 2,
    w = x1 - x0;
  kit.boxes(
    '#c3c6ca',
    [
      [w, 0.12, z1 - z0, cx, 0.06, (z0 + z1) / 2],
      [w, 0.44, 0.04, cx, 0, z0 + 0.02],
      [w, 0.26, 0.04, cx, 0, z1 - 0.02],
      [0.04, 0.06, 0.04, x0 + 0.02, 0, z1 - 0.02],
      [0.04, 0.06, 0.04, x1 - 0.02, 0, z1 - 0.02],
    ],
    { surf: 'metal' },
  );
  kit.box('#e4e4df', w - 0.03, 0.08, z1 - z0 - 0.09, cx, 0.17, (z0 + z1) / 2, {
    r: 0.025,
    seg: 2,
    surf: 'fabric',
  });
  kit.box('#eceef1', 0.34, 0.07, 0.17, cx, 0.25, z0 + 0.15, {
    r: 0.03,
    seg: 2,
    surf: 'fabric',
  });
  // the duvet: pulled up over the foot, its top turned back in a fold, a corner hanging over the side
  const fold = z0 + 0.46;
  kit.box(C.navy, w + 0.02, 0.06, z1 - fold - 0.02, cx, 0.24, (fold + z1) / 2, {
    r: 0.028,
    seg: 2,
    surf: 'fabric',
  });
  kit.box('#8d9bb8', w + 0.03, 0.05, 0.16, cx + 0.005, 0.28, fold + 0.06, {
    r: 0.024,
    seg: 2,
    surf: 'fabric',
    rx: 0.08,
  });
  kit.box(C.navy, 0.04, 0.14, 0.5, x1 + 0.01, 0.13, (fold + z1) / 2 + 0.1, {
    r: 0.015,
    surf: 'fabric',
  });
  // his work bag, dropped on the bed
  kit.box('#2c3038', 0.3, 0.07, 0.2, cx + 0.03, 0.3, z1 - 0.34, {
    r: 0.02,
    ry: 0.35,
    surf: 'fabric',
  });
  kit.box('#2c3038', 0.012, 0.05, 0.14, cx - 0.04, 0.37, z1 - 0.37, { ry: 0.35, surf: 'fabric' });
  nav.block(X0, x1 + 0.02, z0, z1 + 0.02);
  return { x: cx, z: (z0 + z1) / 2 };
}

export function closet(kit, nav) {
  // the oshiire in the back-right corner: sliding fusuma below, the small top cupboard above; the left door is
  // pushed back a hand's width and the folded company futon shows inside
  const x0 = 0.4,
    x1 = X1,
    z0 = BACK,
    z1 = BACK + 0.46,
    cx = (x0 + x1) / 2,
    w = x1 - x0,
    f = z1 + 0.012;
  kit.box('#7f858e', w, H, z1 - z0, cx, 0, (z0 + z1) / 2, { surf: 'plaster', cast: false });
  kit.box(C.wallTop, w + 0.01, 0.035, z1 - z0 + 0.03, cx, H, (z0 + z1) / 2, { cast: false });
  kit.box('#2a2e35', w - 0.06, 1.08, 0.02, cx, 0.04, z1 - 0.004, {
    cast: false,
  });
  kit.box('#5b616b', w, 0.04, 0.03, cx, 0, f, {});
  kit.box('#5b616b', w, 0.04, 0.03, cx, 1.13, f, {});
  kit.box('#5b616b', w, 0.03, 0.03, cx, H - 0.03, f, {});
  kit.boxes('#5b616b', [
    [0.03, H, 0.03, x0 + 0.015, 0, f],
    [0.03, H, 0.03, x1 - 0.015, 0, f],
  ]);
  const pw = (w - 0.06) / 2;
  // the futon inside, seen through the gap: white and navy layers
  kit.boxes('#e4e4df', [[0.2, 0.1, 0.3, x0 + 0.14, 0.52, z0 + 0.25]]);
  kit.boxes(C.navy, [[0.2, 0.1, 0.3, x0 + 0.14, 0.62, z0 + 0.25]]);
  const doors = [
    [x0 + 0.03 + pw / 2 + 0.09, 0.04, 1.09, f + 0.02], // pushed right, behind its neighbour
    [x1 - 0.03 - pw / 2, 0.04, 1.09, f],
    [x0 + 0.03 + pw / 2, 1.17, H - 0.03 - 1.17, f],
    [x1 - 0.03 - pw / 2, 1.17, H - 0.03 - 1.17, f + 0.012],
  ];
  for (const [x, y, h, z] of doors) {
    kit.box('#d4d1c8', pw, h, 0.02, x, y, z, { surf: 'paper' });
    kit.box('#7a7f88', pw, 0.012, 0.024, x, y + h - 0.012, z, { cast: false });
    kit.box('#7a7f88', 0.012, h, 0.024, x - pw / 2 + 0.006, y, z, {
      cast: false,
    });
  }
  for (const [x, y, z] of [
    [doors[0][0] - pw / 2 + 0.06, 0.55, doors[0][3]],
    [doors[1][0] + pw / 2 - 0.06, 0.55, doors[1][3]],
  ])
    kit.cyl('#3a3f48', 0.022, 0.022, 0.01, x, y, z + 0.011, {
      rx: Math.PI / 2,
      seg: 10,
      cast: false,
    });
  nav.block(x0 - 0.02, X1, BACK, z1 + 0.02);
}

export function dinner(kit, nav) {
  // a rug and a folding table between the closet and the boxes; on it the konbini bag and his bento; a cushion
  kit.box('#566078', 0.98, 0.012, 0.74, 0.46, 0, -1.62, {
    surf: 'carpet',
    cast: false,
  });
  kit.box('#434b60', 0.9, 0.013, 0.66, 0.46, 0, -1.62, {
    surf: 'carpet',
    cast: false,
  });
  const tx = 0.55,
    tz = -1.64,
    ty = 0.2;
  kit.box('#d6d3cb', 0.44, 0.025, 0.32, tx, ty - 0.025, tz, {
    r: 0.012,
    surf: 'laminate',
  });
  for (const sx of [-1, 1])
    kit.box('#8e9199', 0.02, ty - 0.03, 0.26, tx + sx * 0.18, 0.01, tz, {
      surf: 'metal',
      cast: false,
    });
  kit.box('#2a2d33', 0.16, 0.035, 0.12, tx - 0.06, ty, tz + 0.03, {
    r: 0.01,
    ry: 0.15,
  });
  kit.box('#c8d4d6', 0.165, 0.012, 0.125, tx - 0.06, ty + 0.035, tz + 0.03, {
    r: 0.005,
    ry: 0.15,
  });
  kit.cyl('#7fa37c', 0.026, 0.026, 0.14, tx + 0.12, ty, tz - 0.07, { seg: 10 });
  kit.box('#eef0f0', 0.16, 0.12, 0.08, tx + 0.1, ty, tz + 0.07, {
    r: 0.03,
    seg: 2,
    ry: -0.4,
    surf: 'plastic',
  });
  kit.box(C.cushion, 0.26, 0.045, 0.26, 0.2, 0.012, -1.6, {
    r: 0.02,
    seg: 2,
    ry: 0.2,
    surf: 'fabric',
  });
  nav.block(tx - 0.22, tx + 0.22, tz - 0.16, tz + 0.16);
}

export function boxes(kit, nav) {
  // his boxes, sent ahead from home: two taped and stacked, one open with the flaps up and books inside,
  // a small one by the doorway
  const bx = 0.8;
  const taped = [
    [0.44, 0.3, 0.38, bx + 0.02, 0, -1.02, 0.03],
    [0.38, 0.26, 0.32, bx, 0.3, -1.04, -0.12],
    [0.3, 0.2, 0.26, bx + 0.08, 0, -0.33, 0.25],
  ];
  for (const [w, h, d, x, y, z, ry] of taped) {
    kit.box(BOX, w, h, d, x, y, z, { r: 0.006, ry, surf: 'card' });
    kit.box(TAPE, 0.07, 0.004, d + 0.004, x, y + h, z, { ry });
    kit.box('#f0eee8', 0.1, 0.06, 0.004, x - 0.08, y + h * 0.4, z + (d / 2) * Math.cos(ry) + 0.003, { ry });
  }
  // the open one: four walls, flaps folded out, the top of a pile of books and a sweater
  const ox = 0.76,
    oz = -0.64,
    ow = 0.42,
    od = 0.34,
    oh = 0.28;
  kit.boxes(
    BOX,
    [
      [ow, oh, 0.012, ox, 0, oz - od / 2],
      [ow, oh, 0.012, ox, 0, oz + od / 2],
      [0.012, oh, od, ox - ow / 2, 0, oz],
      [0.012, oh, od, ox + ow / 2, 0, oz],
    ],
    { surf: 'card' },
  );
  kit.box(BOX_IN, ow - 0.02, 0.01, od - 0.02, ox, 0.01, oz, { surf: 'card' });
  kit.box(BOX, ow, 0.01, 0.16, ox, oh - 0.03, oz + od / 2 + 0.07, {
    rx: -0.9,
    surf: 'card',
  });
  kit.box(BOX_IN, ow, 0.01, 0.16, ox, oh - 0.03, oz - od / 2 - 0.07, {
    rx: 0.9,
    surf: 'card',
  });
  kit.box(BOX, 0.16, 0.01, od, ox - ow / 2 - 0.07, oh - 0.03, oz, {
    rz: 0.9,
    surf: 'card',
  });
  kit.box('#4a6490', 0.26, 0.05, 0.19, ox + 0.04, oh - 0.12, oz - 0.04, {
    ry: 0.1,
  });
  kit.box('#e9e6df', 0.24, 0.035, 0.17, ox + 0.05, oh - 0.07, oz - 0.03, {
    ry: -0.15,
  });
  kit.box('#7a8aa6', 0.2, 0.06, 0.16, ox - 0.09, oh - 0.1, oz + 0.07, {
    r: 0.02,
    surf: 'fabric',
  });
  nav.block(0.56, X1, -1.25, PART);
  return { x: 0.8, z: -0.9 };
}

// on the walls: a company calendar over the bed, the light switch by the doorway, his coat on a hook over the boxes
export function walls(kit) {
  // a hook rail on the wall, his coat on one hook, an empty hanger on the next
  const hz = -0.3;
  kit.box('#c3c6ca', 0.02, 0.04, 0.5, X1 - 0.01, 1.1, hz, { cast: false });
  kit.boxes('#9aa0aa', [
    [0.05, 0.015, 0.015, X1 - 0.035, 1.1, hz - 0.15],
    [0.05, 0.015, 0.015, X1 - 0.035, 1.1, hz + 0.05],
  ]);
  kit.box('#6f7785', 0.06, 0.42, 0.2, X1 - 0.05, 0.68, hz - 0.15, {
    r: 0.025,
    seg: 2,
    surf: 'fabric',
  });
  kit.box('#6f7785', 0.05, 0.1, 0.12, X1 - 0.05, 1.0, hz - 0.15, {
    r: 0.02,
    surf: 'fabric',
  });
  kit.box('#9aa0aa', 0.008, 0.008, 0.2, X1 - 0.06, 1.03, hz + 0.05, {
    rx: 0.25,
    cast: false,
  });
  kit.box('#f2f0ea', 0.008, 0.3, 0.22, X0 + 0.004, 0.62, -1.28, {
    surf: 'paper',
    cast: false,
  });
  kit.box('#4a6490', 0.009, 0.06, 0.22, X0 + 0.005, 0.86, -1.28, {
    cast: false,
  });
  kit.box('#d8d8d2', 0.012, 0.09, 0.06, X1 - 0.006, 0.62, -0.12, {
    cast: false,
  });
  kit.box('#d8d8d2', 0.06, 0.07, 0.012, -0.8, 0.2, BACK + 0.006, {
    cast: false,
  });
}
