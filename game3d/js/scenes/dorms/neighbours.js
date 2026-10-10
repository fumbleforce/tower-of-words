// The flats either side of Eric's, cut open at the same height so the floor reads as a row of rooms: the same plan
// a flat's width apart, each lived in differently. The one on the right is home (the kotatsu, the TV on, washing
// on the rack, its kitchen window lit on the corridor); the one on the left is out (dark, bed made, suits on a
// rail). The next two, at the frame's edges, are simpler: one with a desk lamp on, one dark. No light of their own
// except the pools on their floors, so Eric's lit room stays the brightest thing in the frame. Most colours are
// the flat's own, so the kit merges them into the meshes it already has.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { lightPool } from '../../places/life.js';
import { X0, X1, BACK, PART, NEAR, H, LOW, T, PITCH, WIN, DOORWAY, C } from './layout.js';

export const SPAN = 2; // flats opened on each side; the building beyond them is cut solid

const WALL = '#8a8f98', // the neighbours' walls: a shade darker than Eric's
  BED = '#c9ccd0',
  SHEET = '#e4e4df',
  PILLOW = '#eceef1',
  STEEL = '#c9cdd2',
  DARK = '#2c3038';

// one flat's shell: tatami, the entry strip's floor, the walls between flats with their cut caps, the partition,
// the back wall round its window
export function shell(kit, ox) {
  const x0 = ox + X0,
    x1 = ox + X1,
    ux = (X1 - X0) / 1.5,
    vz = (PART - BACK) / 2;
  // six mats, the same layout as Eric's
  [
    [0, 1, 0, 0.5],
    [1, 1.5, 0, 1],
    [0, 0.5, 0.5, 1.5],
    [0.5, 1, 0.5, 1.5],
    [1, 1.5, 1, 2],
    [0, 1, 1.5, 2],
  ].forEach(([u0, u1, v0, v1], i) => {
    const a = x0 + u0 * ux,
      b = x0 + u1 * ux,
      c = BACK + v0 * vz,
      d = BACK + v1 * vz,
      w = b - a - 0.008,
      dd = d - c - 0.008;
    kit.box(C.tatami[i % 3], w, 0.03, dd, (a + b) / 2, -0.03, (c + d) / 2, { r: 0.006, surf: 'fabric', cast: false });
    const along = w > dd;
    for (const s of [-1, 1])
      kit.box(
        C.heri,
        along ? w : 0.03,
        0.032,
        along ? 0.03 : dd,
        (a + b) / 2 + (along ? 0 : s * (w / 2 - 0.015)),
        -0.03,
        (c + d) / 2 + (along ? s * (dd / 2 - 0.015) : 0),
        { surf: 'fabric', cast: false },
      );
  });
  kit.box(C.plank, x1 - x0, 0.03, NEAR - PART, ox, -0.03, (PART + NEAR) / 2, { surf: 'laminate', cast: false });
  // the partition with its doorway, cut low like Eric's
  kit.boxes(
    WALL,
    [
      [DOORWAY[0] - X0, LOW, 0.08, ox + (X0 + DOORWAY[0]) / 2, 0, PART],
      [X1 - DOORWAY[1], LOW, 0.08, ox + (X1 + DOORWAY[1]) / 2, 0, PART],
    ],
    { surf: 'plaster' },
  );
  // the back wall round the window, its glass the dusk outside
  const [a, b, y0, y1] = WIN,
    z = BACK - T / 2;
  kit.boxes(
    WALL,
    [
      [X1 - X0, y0, T, ox, 0, z],
      [X1 - X0, H - y1, T, ox, y1, z],
      [a - X0, y1 - y0, T, ox + (X0 + a) / 2, y0, z],
      [X1 - b, y1 - y0, T, ox + (X1 + b) / 2, y0, z],
    ],
    { surf: 'plaster' },
  );
  kit.box('#3d4a5c', b - a, y1 - y0, 0.02, ox + (a + b) / 2, y0, z, { cast: false });
  kit.boxes(C.alu, [
    [b - a + 0.06, 0.04, 0.12, ox + (a + b) / 2, y0 - 0.04, z],
    [b - a + 0.06, 0.04, 0.12, ox + (a + b) / 2, y1, z],
    [0.035, y1 - y0, 0.1, ox + (a + b) / 2 + 0.02, y0, z],
  ]);
  // the front wall behind the corridor facade, full height
  kit.box(C.cut, X1 - X0, H, T, ox, 0, NEAR + T / 2, { cast: false });
  // the kitchenette and the unit bath, mostly behind the front wall: their tops
  kit.box('#9aa0a8', 0.35, 0.5, NEAR - PART - 0.08, ox + X0 + 0.18, 0, (PART + NEAR) / 2 + 0.04, { surf: 'metal' });
  kit.box('#e3e3de', 0.62, LOW, NEAR - PART - 0.06, ox + X1 - 0.33, 0, (PART + NEAR) / 2 + 0.03, { surf: 'ceramic' });
}

// the wall between two flats at x, and its cut cap
export function party(kit, x) {
  kit.box(WALL, T, H, NEAR + T - (BACK - T), x, 0, (NEAR + T + BACK - T) / 2, { surf: 'plaster' });
  kit.box(C.wallTop, T + 0.01, 0.03, NEAR + T - (BACK - T) + 0.01, x, H, (NEAR + T + BACK - T) / 2, { cast: false });
}

function bed(kit, x0, x1, z0, z1, duvet, { made = false } = {}) {
  const cx = (x0 + x1) / 2,
    w = x1 - x0;
  kit.box(BED, w, 0.2, z1 - z0, cx, 0, (z0 + z1) / 2, { r: 0.01, surf: 'laminate' });
  kit.box(SHEET, w - 0.03, 0.07, z1 - z0 - 0.06, cx, 0.2, (z0 + z1) / 2, { r: 0.02, surf: 'fabric' });
  kit.box(PILLOW, w - 0.14, 0.06, 0.15, cx, 0.27, z0 + 0.13, { r: 0.03, seg: 2, surf: 'fabric' });
  if (made) kit.box(duvet, w + 0.02, 0.06, z1 - z0 - 0.3, cx, 0.25, (z0 + z1) / 2 + 0.13, { r: 0.02, surf: 'fabric' });
  else {
    kit.box(duvet, w + 0.03, 0.08, (z1 - z0) * 0.45, cx + 0.02, 0.26, z1 - (z1 - z0) * 0.25, {
      r: 0.03,
      seg: 2,
      ry: 0.12,
      surf: 'fabric',
    });
    kit.box(duvet, w * 0.7, 0.06, (z1 - z0) * 0.3, cx - 0.04, 0.27, (z0 + z1) / 2 - 0.1, {
      r: 0.03,
      seg: 2,
      ry: -0.3,
      surf: 'fabric',
    });
  }
}

function curtains(kit, ox, closed, color) {
  const [a, b] = WIN,
    zi = BACK + 0.07;
  kit.box(STEEL, b - a + 0.5, 0.025, 0.04, ox + (a + b) / 2, 1.29, zi, { cast: false });
  if (closed) {
    for (let i = 0; i < 9; i++)
      kit.box(i % 2 ? color : '#98a3b8', 0.1, 0.84, 0.03, ox + a - 0.1 + i * 0.105, 0.45, zi + (i % 2) * 0.02, {
        r: 0.01,
        surf: 'fabric',
      });
  } else
    for (const [x, d] of [
      [a - 0.18, 1],
      [b + 0.18, -1],
    ])
      for (let i = 0; i < 3; i++)
        kit.box(color, 0.06, 0.84, 0.035, ox + x + d * i * 0.055, 0.45, zi + (i % 2) * 0.02, {
          r: 0.012,
          surf: 'fabric',
        });
}

// right, home: the kotatsu with dinner on it, the TV on against the left wall, washing on a rack by the window
export function home(kit, root, ox) {
  bed(kit, ox + 0.5, ox + 1.02, BACK + 0.08, -1.2, '#5f7a74');
  curtains(kit, ox, true, '#7d8aa0');
  // the TV on its low stand in the corner, turned toward the kotatsu, the screen lit
  const ry = -0.5,
    tx = ox + X0 + 0.33,
    tz = -1.85,
    nx = Math.cos(ry),
    nz = -Math.sin(ry);
  kit.box('#3a3f48', 0.28, 0.28, 0.78, tx, 0, tz, { r: 0.01, ry, surf: 'laminate' });
  kit.box('#1f2228', 0.05, 0.4, 0.66, tx - 0.01 * nx, 0.3, tz - 0.01 * nz, { r: 0.008, ry });
  kit.box('#a9c6ee', 0.006, 0.34, 0.6, tx + 0.018 * nx, 0.33, tz + 0.018 * nz, {
    ry,
    cast: false,
    opts: { emissive: '#8fb6ea', emissiveIntensity: 0.9 },
  });
  // the kotatsu: its quilt, the board, a cup noodle, a bowl of mikan, the remote; a cushion on each side
  const kx = ox - 0.12,
    kz = -1.35;
  kit.box('#7a8aa6', 0.66, 0.2, 0.66, kx, 0, kz, { r: 0.05, seg: 2, surf: 'fabric' });
  kit.box('#d6d3cb', 0.56, 0.025, 0.56, kx, 0.2, kz, { r: 0.006, surf: 'laminate' });
  kit.cyl('#eef0f0', 0.04, 0.032, 0.08, kx - 0.1, 0.225, kz + 0.08, { surf: 'plastic' });
  kit.cyl('#c96a5a', 0.042, 0.042, 0.006, kx - 0.1, 0.305, kz + 0.08, { cast: false });
  kit.cyl('#e9e6df', 0.08, 0.06, 0.04, kx + 0.1, 0.225, kz - 0.08, { surf: 'ceramic' });
  for (const [dx, dz, dy] of [
    [-0.03, 0, 0],
    [0.03, 0.02, 0],
    [0, -0.03, 0],
    [0, 0, 0.04],
  ])
    kit.cyl('#e38a3a', 0.03, 0.03, 0.045, kx + 0.1 + dx, 0.255 + dy, kz - 0.08 + dz, { seg: 8, cast: false });
  kit.box(DARK, 0.04, 0.02, 0.12, kx + 0.14, 0.225, kz + 0.14, { ry: 0.4, cast: false });
  kit.box(C.cushion, 0.36, 0.05, 0.36, kx - 0.46, 0, kz + 0.1, { r: 0.03, seg: 2, surf: 'fabric' });
  kit.box('#566078', 0.34, 0.05, 0.34, kx + 0.05, 0, kz + 0.52, { r: 0.03, seg: 2, surf: 'fabric' });
  // the drying rack in front of the window: two shirts, a towel, socks
  const rz = BACK + 0.4,
    r0 = ox - 0.35,
    r1 = ox + 0.45;
  kit.boxes(STEEL, [
    [0.02, 1.05, 0.02, r0, 0, rz],
    [0.02, 1.05, 0.02, r1, 0, rz],
    [r1 - r0, 0.02, 0.02, (r0 + r1) / 2, 1.04, rz],
    [0.02, 0.02, 0.3, r0, 0, rz],
    [0.02, 0.02, 0.3, r1, 0, rz],
  ]);
  kit.box('#a9bcd6', 0.24, 0.36, 0.02, r0 + 0.2, 0.67, rz, { surf: 'fabric' });
  kit.box('#e9e6df', 0.24, 0.38, 0.02, r0 + 0.47, 0.65, rz, { surf: 'fabric' });
  kit.box('#c96a5a', 0.12, 0.5, 0.02, r0 + 0.74, 0.53, rz, { surf: 'fabric' });
  // the ceiling light's pool, warm, and the TV's cool glow on the floor in front of it
  root.add(lightPool(ox, -1.4, 1.05, { k: 0.2 }));
  root.add(lightPool(ox - 0.42, -1.62, 0.45, { color: '#9cc0ff', k: 0.16 }));
}

// left, out: dark, the bed made, the desk under the window with the monitor off, suits on a rail, a guitar case
export function out(kit, ox) {
  bed(kit, ox + X0 + 0.02, ox + X0 + 0.52, BACK + 0.08, -1.2, '#6c6f86', { made: true });
  curtains(kit, ox, false, '#5e6d87');
  kit.box('#a4a8ae', 0.9, 0.03, 0.42, ox + 0.15, 0.4, BACK + 0.27, { r: 0.006, surf: 'laminate' });
  kit.boxes('#848a93', [
    [0.03, 0.4, 0.38, ox - 0.28, 0, BACK + 0.27],
    [0.03, 0.4, 0.38, ox + 0.58, 0, BACK + 0.27],
  ]);
  kit.box('#2a2d33', 0.46, 0.28, 0.025, ox + 0.15, 0.5, BACK + 0.14, { r: 0.006 });
  kit.box('#2a2d33', 0.04, 0.08, 0.04, ox + 0.15, 0.43, BACK + 0.16);
  kit.box('#e05a4a', 0.012, 0.012, 0.004, ox + 0.36, 0.51, BACK + 0.155, {
    cast: false,
    opts: { emissive: '#ff4a3a', emissiveIntensity: 1.2 },
  });
  kit.box('#2f3a5c', 0.3, 0.05, 0.3, ox + 0.15, 0.24, BACK + 0.72, { r: 0.02, surf: 'fabric' });
  kit.box('#2f3a5c', 0.3, 0.36, 0.04, ox + 0.15, 0.29, BACK + 0.88, { r: 0.02, surf: 'fabric' });
  // the clothes rail along the right wall: two suits, a shirt
  const rx = ox + X1 - 0.22;
  kit.boxes(STEEL, [
    [0.02, 1.2, 0.02, rx, 0, -1.7],
    [0.02, 1.2, 0.02, rx, 0, -0.65],
    [0.02, 0.02, 1.07, rx, 1.19, -1.175],
  ]);
  for (const [z, col] of [
    [-1.5, DARK],
    [-1.3, '#3a4152'],
    [-1.1, '#6a7892'],
  ])
    kit.box(col, 0.3, 0.62, 0.05, rx, 0.55, z, { surf: 'fabric' });
  kit.box('#2a2e35', 0.34, 0.12, 0.95, ox + X1 - 0.12, 0, -2.0, { r: 0.05, seg: 2, rz: 1.25 });
  kit.box('#4a6490', 0.36, 0.5, 0.2, ox - 0.3, 0, -0.35, { r: 0.03, surf: 'plastic' });
}

// the flats at the frame's edges: a desk lamp on in one, the other dark
export function edge(kit, root, ox, lit) {
  const s = lit ? 1 : -1;
  bed(kit, ox - s * 0.75 - 0.25, ox - s * 0.75 + 0.25, BACK + 0.08, -1.2, lit ? '#6a7892' : '#5f7a74', {
    made: !lit,
  });
  curtains(kit, ox, lit, lit ? '#7d8aa0' : '#5e6d87');
  const dx = ox + s * 0.72;
  kit.box('#a4a8ae', 0.5, 0.03, 0.9, dx, 0.4, -2.1, { r: 0.006, surf: 'laminate' });
  kit.box('#848a93', 0.46, 0.4, 0.2, dx, 0, -2.45, { surf: 'metal' });
  kit.box('#b09474', 0.4, 0.3, 0.34, dx, 0, -0.5, { r: 0.01, surf: 'card' });
  kit.box('#b09474', 0.34, 0.24, 0.3, dx + 0.02, 0.3, -0.52, { r: 0.01, ry: 0.2, surf: 'card' });
  if (lit) {
    kit.box('#fff4e0', 0.12, 0.08, 0.12, dx, 0.7, -2.3, {
      r: 0.03,
      cast: false,
      opts: { emissive: '#ffe6c0', emissiveIntensity: 1.6 },
    });
    root.add(lightPool(dx, -2.1, 0.5, { y: 0.44, k: 0.3 }));
    root.add(lightPool(dx - 0.3, -1.8, 0.8, { k: 0.12 }));
  }
}

// the dark over a flat: a black veil just under the cut, so a flat with its lights off reads as dark and a lit one
// stays dimmer than Eric's. The caps stand above it, clean. One mesh per shade.
export function veils(root, shades) {
  for (const [opacity, xs] of shades) {
    const g = mergeGeometries(
      xs.map((ox) =>
        new THREE.PlaneGeometry(X1 - X0, NEAR - BACK).rotateX(-Math.PI / 2).translate(ox, H - 0.004, (BACK + NEAR) / 2),
      ),
    );
    const m = new THREE.Mesh(
      g,
      new THREE.MeshBasicMaterial({ color: '#05070c', transparent: true, opacity, depthWrite: false }),
    );
    m.renderOrder = 2;
    m.userData.noAO = true;
    root.add(m);
  }
}

export function neighbours(kit, root) {
  for (let k = 1; k <= SPAN; k++) {
    party(kit, X1 + T / 2 + k * PITCH);
    party(kit, X0 - T / 2 - k * PITCH);
  }
  for (const k of [-SPAN, -1, 1, SPAN]) shell(kit, k * PITCH);
  home(kit, root, PITCH);
  out(kit, -PITCH);
  edge(kit, root, -SPAN * PITCH, true);
  edge(kit, root, SPAN * PITCH, false);
  veils(root, [
    [0.28, [PITCH, -SPAN * PITCH]],
    [0.55, [-PITCH, SPAN * PITCH]],
  ]);
}
