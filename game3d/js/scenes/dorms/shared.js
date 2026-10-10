// The shared room at the west end of a corridor floor (docs/game/places.md, Eric's dorm building): a flat's width,
// one room from the corridor wall to the back window, cut open at the ceiling like the flats. On 2F the floor's
// kitchen (a counter with a sink and two rings under a hood, a tall fridge full of named boxes, a shelf of baskets,
// one per flat, with the microwave, a table with two stools, the sorted bins), on 3F the laundry (three washers, a coin
// dryer on its stand, a sink, a folding table, a plastic chair and the lost property box). Its door from the corridor
// stands open, its kitchen window beside it lit; the front above the cut-low wall fades while he is inside.
import * as THREE from 'three';
import { tileFloor, textTexture, plane } from '../../props.js';
import { lightPool } from '../../places/life.js';
import { X0, X1, BACK, NEAR, H, LOW, T, PITCH, WIN, DOOR, SHARED_K, C } from './layout.js';
import { Kit } from './kit.js';
import { plates } from './plates.js';

const XA = SHARED_K * PITCH + X0, // the room's inner faces
  XB = SHARED_K * PITCH + X1,
  DC = SHARED_K * PITCH + (DOOR[0] + DOOR[1]) / 2, // its door's middle
  WALL = '#9da2aa',
  STEEL = '#b4b9bf',
  WHITE = '#e3e4e1',
  TOP = 0.5; // worktop height
export const SHARED = { x0: XA, x1: XB, door: DC };

// the shell: floor, walls cut at the ceiling, the back window with its blind, the front wall full height with the
// open door and the lit kitchen window, the sign over the door
function shell(kit, root, nav, sign) {
  root.add(tileFloor(XA, XB, BACK, NEAR, 0.3, { color: '#8e959e', seam: '#7f868f', seamW: 0.01, y: -0.045 }));
  const d = NEAR + T - (BACK - T),
    zc = (NEAR + T + BACK - T) / 2;
  kit.boxes(
    WALL,
    [
      [T, H, d, XA - T / 2, 0, zc],
      [T, H, d, XB + T / 2, 0, zc],
    ],
    { surf: 'plaster' },
  );
  const [a, b, y0, y1] = WIN,
    ox = (XA + XB) / 2,
    z = BACK - T / 2;
  kit.boxes(
    WALL,
    [
      [XB - XA, y0, T, ox, 0, z],
      [XB - XA, H - y1, T, ox, y1, z],
      [a - X0, y1 - y0, T, ox + (X0 + a) / 2, y0, z],
      [X1 - b, y1 - y0, T, ox + (X1 + b) / 2, y0, z],
    ],
    { surf: 'plaster' },
  );
  kit.box('#3d4a5c', b - a, y1 - y0, 0.02, ox + (a + b) / 2, y0, z, { cast: false });
  kit.boxes(C.alu, [
    [b - a + 0.06, 0.04, 0.12, ox + (a + b) / 2, y0 - 0.04, z],
    [b - a + 0.06, 0.04, 0.12, ox + (a + b) / 2, y1, z],
  ]);
  // a roller blind, half down
  kit.box('#d9d6cc', b - a + 0.04, (y1 - y0) / 2, 0.015, ox + (a + b) / 2, y0 + (y1 - y0) / 2, BACK + 0.03, {
    surf: 'fabric',
    cast: false,
  });
  // the front wall: up to the cut-low height for good, with its cap; above that, as the corridor sees it, full height
  // with the facade's skin, the window and the sign, its own group (`tall`): it fades out while he is inside the room,
  // as his own flat's front does, so the room shows over the low wall (places/dorm-floors.js)
  const zf = NEAR + T / 2,
    d0 = DC - 0.3,
    d1 = DC + 0.3,
    w0 = DC - 0.77,
    w1 = DC - 0.47,
    tk = new Kit();
  kit.boxes(
    C.facade,
    [
      [d0 - (XA - T), LOW, T, (XA - T + d0) / 2, 0, zf],
      [XB + T - d1, LOW, T, (d1 + XB + T) / 2, 0, zf],
    ],
    { surf: 'plaster' },
  );
  kit.boxes(C.wallTop, [
    [d0 - (XA - T), 0.03, T - 0.004, (XA - T + d0) / 2, LOW, zf],
    [XB + T - d1, 0.03, T - 0.004, (d1 + XB + T) / 2, LOW, zf],
  ]);
  kit.boxes(C.frame, [
    [0.04, LOW, T + 0.03, d0 - 0.02, 0, zf],
    [0.04, LOW, T + 0.03, d1 + 0.02, 0, zf],
  ]);
  tk.boxes(
    C.facade,
    [
      [w0 - (XA - T), H - LOW, T, (XA - T + w0) / 2, LOW, zf],
      [d0 - w1, H - LOW, T, (w1 + d0) / 2, LOW, zf],
      [XB + T - d1, H - LOW, T, (d1 + XB + T) / 2, LOW, zf],
      [w1 - w0, 0.54 - LOW, T, (w0 + w1) / 2, LOW, zf],
      [w1 - w0, H - 0.9, T, (w0 + w1) / 2, 0.9, zf],
      [d1 - d0, H - 1.3, T, DC, 1.3, zf],
    ],
    { surf: 'plaster' },
  );
  tk.box(C.wallTop, XB - XA + 2 * T + 0.02, 0.035, T + 0.03, (XA + XB) / 2, H, zf, { cast: false });
  tk.boxes(C.frame, [
    [0.04, 1.3 - LOW, T + 0.03, d0 - 0.02, LOW, zf],
    [0.04, 1.3 - LOW, T + 0.03, d1 + 0.02, LOW, zf],
    [0.68, 0.05, T + 0.03, DC, 1.28, zf],
  ]);
  for (const s of [-1, 1])
    kit.box(C.wallTop, T + 0.02, 0.035, d, s < 0 ? XA - T / 2 : XB + T / 2, H, zc, { cast: false });
  // the window beside the door, frosted and lit, behind its grille
  tk.box('#f0dcb4', w1 - w0, 0.36, 0.01, (w0 + w1) / 2, 0.54, NEAR + T + 0.012, {
    cast: false,
    opts: { emissive: '#ffe2b8', emissiveIntensity: 0.55 },
  });
  const bars = [];
  for (let i = 0; i < 5; i++) bars.push([0.012, 0.42, 0.012, w0 + 0.01 + i * 0.07, 0.51, NEAR + T + 0.04]);
  tk.boxes(C.alu, bars, { cast: false });
  const tall = tk.flush(new THREE.Group());
  tall.add(plates([[sign, DC, 1.43, NEAR + T + 0.017, 0.3, 0.12]]));
  // its own materials: fading it fades nothing else; and out of the draw-call pass, which a fade would undo
  tall.traverse((o) => o.isMesh && ((o.material = o.material.clone()), (o.userData.noBatch = true)));
  root.add(tall);
  // walls and the front, but for the door
  nav.block(XA - 0.3, XA + 0.02, BACK, NEAR + T);
  nav.block(XB - 0.02, XB + 0.3, BACK, NEAR + T);
  nav.block(XA - 0.3, XB + 0.3, BACK - 0.3, BACK + 0.02);
  nav.block(XA - 0.3, d0, NEAR - 0.02, NEAR + T + 0.02);
  nav.block(d1, XB + 0.3, NEAR - 0.02, NEAR + T + 0.02);
  root.add(lightPool((XA + XB) / 2, -0.9, 1.2, { color: '#eef3ff', k: 0.2, sz: 1.5 }));
  return tall;
}

// a small printed card on a wall, facing +z or along x (`side`: on the west wall, facing +x)
function card(root, draw, w, h, x, y, z, side = false) {
  const p = plane(w, h, textTexture(draw, 192, Math.round((192 * h) / w)));
  p.position.set(x, y, z);
  if (side) p.rotation.y = Math.PI / 2;
  root.add(p);
}

export function kitchen(kit, root, nav) {
  const front = shell(kit, root, nav, 'KITCHEN');
  // the counter along the west wall: cupboards, the steel top, the sink, two rings, the hood, the splashback
  const c0 = XA,
    c1 = XA + 0.42,
    z0 = -2.15,
    z1 = -0.55,
    cx = (c0 + c1) / 2;
  kit.box('#c9ccd0', c1 - c0, TOP - 0.03, z1 - z0, cx, 0, (z0 + z1) / 2, { r: 0.008, surf: 'laminate' });
  kit.box('#9aa0a8', c1 - c0 + 0.02, 0.03, z1 - z0, cx, TOP - 0.03, (z0 + z1) / 2, { r: 0.005, surf: 'metal' });
  kit.box('#6b717a', 0.26, 0.012, 0.34, cx + 0.01, TOP - 0.004, z0 + 0.3, { r: 0.02, cast: false, surf: 'metal' });
  kit.box(STEEL, 0.02, 0.14, 0.02, c0 + 0.05, TOP, z0 + 0.3, { surf: 'metal' });
  for (const z of [-1.25, -0.88]) {
    kit.box('#2c3038', 0.24, 0.014, 0.24, cx + 0.01, TOP, z, { r: 0.01, cast: false });
    kit.add(
      '#6a6f78',
      new THREE.TorusGeometry(0.06, 0.01, 4, 16).rotateX(-Math.PI / 2).translate(cx + 0.01, TOP + 0.016, z),
      {
        cast: false,
      },
    );
  }
  // a big pot on one ring, the kettle, the rice cooker, the dish rack with bowls
  kit.cyl('#9aa0a8', 0.085, 0.085, 0.11, cx + 0.01, TOP + 0.015, -1.25, { surf: 'metal' });
  kit.cyl('#d8d9d6', 0.045, 0.055, 0.12, cx, TOP, -0.7, { surf: 'plastic' });
  kit.box(WHITE, 0.2, 0.15, 0.2, cx, TOP, -1.62, { r: 0.05, seg: 2, surf: 'plastic' });
  kit.box('#b8bcc2', 0.24, 0.06, 0.18, cx, TOP, z0 + 0.62, { cast: false });
  for (const dz of [-0.05, 0.03])
    kit.cyl('#e9e6df', 0.045, 0.035, 0.04, cx, TOP + 0.04, z0 + 0.62 + dz, { surf: 'ceramic' });
  kit.box(STEEL, 0.012, 0.5, z1 - z0, XA + 0.006, TOP, (z0 + z1) / 2, { surf: 'metal', cast: false });
  kit.box('#c9ccd0', 0.26, 0.12, 0.62, c0 + 0.14, 1.0, -1.07, { r: 0.012, surf: 'metal' });
  kit.box('#fff4e0', 0.14, 0.008, 0.5, c0 + 0.14, 0.985, -1.07, {
    cast: false,
    opts: { emissive: '#ffe6c0', emissiveIntensity: 1.4 },
  });
  nav.block(c0, c1 + 0.03, z0, z1);
  // the tall fridge in the back corner, its door hung with name magnets
  const fz = -2.45;
  kit.box('#d7dadc', 0.44, 1.12, 0.42, c0 + 0.23, 0, fz, { r: 0.02, surf: 'plastic' });
  kit.box('#bfc3c6', 0.006, 0.01, 0.4, c1 + 0.03, 0.72, fz, { cast: false });
  kit.box('#a9adb1', 0.012, 0.2, 0.02, c1 + 0.035, 0.45, fz + 0.16, { cast: false });
  ['#d9473c', '#3f6f9e', '#e0b33b', '#4f8a4a'].forEach((col, i) =>
    kit.box(col, 0.008, 0.035, 0.05, c1 + 0.032, 0.95 - (i % 2) * 0.12, fz - 0.12 + i * 0.07, { cast: false }),
  );
  card(root, note('Please write your room number on your food.'), 0.16, 0.12, c1 + 0.04, 0.8, fz - 0.06, true);
  nav.block(c0, c1 + 0.05, BACK, fz + 0.23);
  // along the east wall: the shelf of plastic baskets, one per flat, the microwave and the toaster on top
  const sx = XB - 0.2;
  // its steel frame open to the room: the back, the two ends, four shelves
  kit.boxes(
    '#c3c6ca',
    [
      [0.02, 0.9, 0.9, XB - 0.01, 0, -2.2],
      [0.38, 0.9, 0.02, sx, 0, -2.64],
      [0.38, 0.9, 0.02, sx, 0, -1.76],
      ...[0, 0.3, 0.6, 0.88].map((y) => [0.38, 0.02, 0.9, sx, y, -2.2]),
    ],
    { surf: 'metal' },
  );
  const tones = ['#7f9cc0', '#b8453d', '#e0b33b', '#6f8f6a', '#c9cdd2', '#3f6f9e'];
  for (let r = 0; r < 3; r++)
    for (let i = 0; i < 2; i++)
      kit.box(tones[(r * 2 + i) % tones.length], 0.32, 0.2, 0.4, sx - 0.03, 0.02 + r * 0.3, -2.42 + i * 0.44, {
        r: 0.01,
        surf: 'plastic',
      });
  kit.box(WHITE, 0.32, 0.18, 0.42, sx, 0.9, -2.4, { r: 0.015, surf: 'plastic' });
  kit.box('#2c3038', 0.004, 0.11, 0.24, sx - 0.162, 0.93, -2.43, { cast: false });
  kit.box('#c9cdd2', 0.26, 0.12, 0.2, sx, 0.9, -1.98, { r: 0.02, surf: 'metal' });
  nav.block(sx - 0.2, XB, -2.7, -1.72);
  // the whiteboard over it: the rubbish days and someone's rice-cooker rota
  kit.box('#c9cdd2', 0.02, 0.4, 0.6, XB - 0.012, 0.95, -1.15, { cast: false });
  card(root, rota, 0.56, 0.36, XB - 0.025, 1.15, -1.15);
  root.children.at(-1).rotation.y = -Math.PI / 2;
  // the table along the east wall under the whiteboard, two stools on its open side, a tray of soy sauce and salt,
  // someone's mug; the way through to the shelf stays clear between the stools and the counter
  const tx = XB - 0.3,
    tz = -1.05;
  kit.box('#c3c6ca', 0.58, 0.03, 0.9, tx, 0.38, tz, { r: 0.008, surf: 'laminate' });
  for (const [dx, dz] of [
    [-0.25, -0.4],
    [0.25, -0.4],
    [-0.25, 0.4],
    [0.25, 0.4],
  ])
    kit.box('#848a93', 0.03, 0.38, 0.03, tx + dx, 0, tz + dz, { surf: 'metal' });
  for (const dz of [-0.22, 0.24]) {
    kit.cyl('#5f6b7d', 0.11, 0.11, 0.04, tx - 0.45, 0.24, tz + dz, { seg: 10, surf: 'plastic' });
    kit.cyl('#848a93', 0.02, 0.03, 0.24, tx - 0.45, 0, tz + dz, { seg: 6 });
  }
  kit.box('#b8bcc2', 0.1, 0.012, 0.16, tx + 0.12, 0.41, tz - 0.25, { cast: false });
  kit.cyl('#3a2a24', 0.02, 0.02, 0.07, tx + 0.12, 0.42, tz - 0.29, { seg: 6 });
  kit.cyl(WHITE, 0.018, 0.018, 0.06, tx + 0.12, 0.42, tz - 0.22, { seg: 6 });
  kit.cyl('#b8453d', 0.03, 0.028, 0.06, tx - 0.1, 0.41, tz + 0.18, { surf: 'ceramic' });
  nav.block(tx - 0.58, XB, tz - 0.47, tz + 0.47);
  // the sorted bins inside the door
  [
    ['#3f6f9e', -0.25],
    ['#4f8a4a', 0.0],
    ['#8d939b', 0.25],
  ].forEach(([col, dz]) => kit.box(col, 0.2, 0.32, 0.2, XB - 0.15, 0, 0.45 + dz, { r: 0.02, surf: 'plastic' }));
  nav.block(XB - 0.3, XB, 0.15, 0.75);
  return { at: [tx, tz], spot: [tx - 0.85, tz + 0.15], nook: [XB - 0.75, -1.85], front };
}

export function laundry(kit, root, nav) {
  const front = shell(kit, root, nav, 'LAUNDRY');
  // three top-loading washers along the west wall, lids shut, a coin box on each; the middle one taped up
  for (const [i, z] of [-2.35, -1.85, -1.35].entries()) {
    const x = XA + 0.24;
    kit.box(WHITE, 0.42, 0.56, 0.44, x, 0, z, { r: 0.03, seg: 2, surf: 'plastic' });
    kit.box('#cfd2d4', 0.36, 0.015, 0.38, x, 0.56, z, { r: 0.01, cast: false });
    kit.box('#8d939b', 0.08, 0.1, 0.38, x - 0.17, 0.56, z, { r: 0.01 });
    kit.box('#59bf7a', 0.012, 0.012, 0.03, x - 0.12, 0.62, z + 0.1, {
      cast: false,
      opts: { emissive: '#59ff8a', emissiveIntensity: i === 1 ? 0 : 1.2 },
    });
    kit.box('#5a6270', 0.1, 0.08, 0.1, x + 0.14, 0.56, z - 0.12, { r: 0.01 });
  }
  kit.box('#d8c79a', 0.3, 0.004, 0.06, XA + 0.24, 0.575, -1.85, { ry: 0.6, cast: false });
  card(root, note('Broken. Reported.'), 0.12, 0.09, XA + 0.24, 0.585, -1.75);
  root.children.at(-1).rotation.x = -Math.PI / 2;
  nav.block(XA, XA + 0.5, -2.65, -1.08);
  // the coin dryer on its stand against the back wall, its round window dark, a 100-yen slot
  const dx = XB - 0.6;
  kit.boxes('#848a93', [
    [0.04, 0.5, 0.04, dx - 0.2, 0, BACK + 0.06],
    [0.04, 0.5, 0.04, dx + 0.2, 0, BACK + 0.06],
    [0.04, 0.5, 0.04, dx - 0.2, 0, BACK + 0.4],
    [0.04, 0.5, 0.04, dx + 0.2, 0, BACK + 0.4],
  ]);
  kit.box(WHITE, 0.46, 0.46, 0.44, dx, 0.5, BACK + 0.23, { r: 0.02, surf: 'plastic' });
  kit.add(
    '#2f3540',
    new THREE.CylinderGeometry(0.13, 0.13, 0.02, 16).rotateX(Math.PI / 2).translate(dx - 0.04, 0.72, BACK + 0.455),
    {
      cast: false,
    },
  );
  kit.box('#5a6270', 0.06, 0.12, 0.02, dx + 0.17, 0.78, BACK + 0.455, { cast: false });
  nav.block(dx - 0.3, dx + 0.3, BACK, BACK + 0.55);
  // the sink beside it, the shelf of powders and softener, and the lost property box under it
  const kx = XB - 0.18;
  kit.box('#c9ccd0', 0.32, TOP - 0.03, 0.42, kx, 0, BACK + 0.25, { r: 0.008, surf: 'laminate' });
  kit.box('#9aa0a8', 0.34, 0.03, 0.44, kx, TOP - 0.03, BACK + 0.25, { surf: 'metal' });
  kit.box('#6b717a', 0.2, 0.012, 0.26, kx, TOP - 0.004, BACK + 0.25, { r: 0.02, cast: false });
  kit.box('#c3c6ca', 0.3, 0.02, 0.6, kx + 0.02, 0.95, -1.95, { cast: false });
  ['#3f6f9e', '#e0e2e0', '#7fb0c9', '#e0b33b', '#e0e2e0'].forEach((col, i) =>
    kit.box(col, 0.1, 0.16 + (i % 2) * 0.05, 0.08, kx + 0.04, 0.97, -2.17 + i * 0.1, { r: 0.015, surf: 'plastic' }),
  );
  kit.box('#b09474', 0.3, 0.22, 0.3, kx, 0, -1.55, { r: 0.008, surf: 'card' });
  kit.box('#9c805f', 0.26, 0.02, 0.26, kx, 0.22, -1.55, { cast: false });
  kit.box('#c96a5a', 0.1, 0.03, 0.05, kx - 0.02, 0.23, -1.6, { r: 0.01, ry: 0.4 }); // a sock on top
  kit.box('#e9e4d6', 0.09, 0.03, 0.06, kx + 0.06, 0.24, -1.5, { r: 0.01, ry: -0.3 }); // a hand towel
  card(root, note('Lost property'), 0.16, 0.06, kx, 0.15, -1.395);
  nav.block(kx - 0.2, XB, BACK, -1.35);
  // the folding table against the east wall with a basket and a folded stack; a plastic chair to wait in, inside
  // the door on the west
  const tx = XB - 0.27,
    tz = -0.8;
  kit.box('#c3c6ca', 0.48, 0.03, 0.8, tx, 0.42, tz, { r: 0.008, surf: 'laminate' });
  for (const [ax, az] of [
    [-0.2, -0.36],
    [0.2, -0.36],
    [-0.2, 0.36],
    [0.2, 0.36],
  ])
    kit.box('#848a93', 0.03, 0.42, 0.03, tx + ax, 0, tz + az, { surf: 'metal' });
  kit.box('#7fb0c9', 0.3, 0.16, 0.24, tx - 0.02, 0.45, tz - 0.18, { r: 0.03, surf: 'plastic' });
  kit.boxes('#e9e6df', [
    [0.26, 0.03, 0.2, tx + 0.02, 0.45, tz + 0.2],
    [0.24, 0.03, 0.18, tx + 0.02, 0.48, tz + 0.21],
  ]);
  kit.box('#a9bcd6', 0.24, 0.03, 0.18, tx + 0.02, 0.51, tz + 0.2, { r: 0.01, surf: 'fabric' });
  nav.block(tx - 0.27, XB, tz - 0.42, tz + 0.42);
  const cx = XA + 0.24;
  kit.box('#5f6b7d', 0.3, 0.03, 0.3, cx, 0.26, 0.25, { r: 0.02, surf: 'plastic' });
  kit.box('#5f6b7d', 0.03, 0.3, 0.3, cx - 0.14, 0.28, 0.25, { r: 0.02, surf: 'plastic' });
  kit.boxes('#848a93', [
    [0.025, 0.26, 0.025, cx - 0.13, 0, 0.12],
    [0.025, 0.26, 0.025, cx + 0.13, 0, 0.12],
    [0.025, 0.26, 0.025, cx - 0.13, 0, 0.38],
    [0.025, 0.26, 0.025, cx + 0.13, 0, 0.38],
  ]);
  nav.block(XA, XA + 0.45, 0.05, 0.45);
  card(root, note('Machines until 22:00, please'), 0.2, 0.08, XA + 0.3, 0.95, BACK + 0.012);
  return { at: [XA + 0.24, -1.85], spot: [XA + 0.75, -1.5], nook: [kx - 0.45, -1.55], front };
}

// a note printed on white card, a line or two
function note(text) {
  return (g, w, h) => {
    g.fillStyle = '#f4f3ee';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#2a2f3a';
    g.font = `600 ${Math.round(h * 0.2)}px sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const words = text.split(' '),
      lines = [''];
    for (const wd of words) {
      const l = lines.at(-1) ? lines.at(-1) + ' ' + wd : wd;
      if (g.measureText(l).width > w * 0.9) lines.push(wd);
      else lines[lines.length - 1] = l;
    }
    lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * h * 0.26));
  };
}

// the kitchen's whiteboard: the rubbish days in a grid, a few names in marker, a magnet or two
function rota(g, w, h) {
  g.fillStyle = '#f6f7f6';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = '#9aa0a8';
  g.lineWidth = 2;
  for (let i = 1; i < 7; i++) {
    g.beginPath();
    g.moveTo((w * i) / 7, h * 0.22);
    g.lineTo((w * i) / 7, h * 0.92);
    g.stroke();
  }
  g.fillStyle = '#2a2f3a';
  g.font = `700 ${Math.round(h * 0.09)}px sans-serif`;
  g.textAlign = 'center';
  ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].forEach((t, i) => g.fillText(t, (w * (i + 0.5)) / 7, h * 0.16));
  g.fillStyle = '#3f6f9e';
  g.font = `${Math.round(h * 0.1)}px sans-serif`;
  ['202', '', '206', '201', '', '205', ''].forEach((t, i) => g.fillText(t, (w * (i + 0.5)) / 7, h * 0.45));
  g.fillStyle = '#d9473c';
  g.beginPath();
  g.arc(w * 0.88, h * 0.75, h * 0.05, 0, 7);
  g.fill();
}
