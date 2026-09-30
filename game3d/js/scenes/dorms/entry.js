// The entry strip: the kitchenette on the left (sink, one ring, the small fridge under the counter, a hood with its
// light), the unit bath on the right behind its door, and the genkan by the front door with the shoe cupboard and
// his shoes. The room's sliding door stands open in its track.
import * as THREE from 'three';
import { wall } from '../../props.js';
import { X0, X1, PART, NEAR, LOW, BATH_X, COUNTER_X, DOORWAY, GENKAN_Z, C } from './layout.js';

export function kitchenette(kit, nav) {
  const x0 = X0 + 0.01,
    x1 = COUNTER_X,
    z0 = PART + 0.06,
    z1 = NEAR - 0.02,
    top = 0.5,
    cx = (x0 + x1) / 2;
  // the cupboard, the steel top with its sink and ring, the fridge door with a handle
  kit.box('#c9ccd0', x1 - x0, top - 0.03, z1 - z0, cx, 0, (z0 + z1) / 2, {
    r: 0.008,
    surf: 'laminate',
  });
  kit.box('#9aa0a8', x1 - x0 + 0.02, 0.03, z1 - z0, cx, top - 0.03, (z0 + z1) / 2, { r: 0.005, surf: 'metal' });
  kit.box('#6b717a', 0.22, 0.012, 0.28, cx + 0.01, top - 0.004, z0 + 0.24, {
    r: 0.02,
    cast: false,
    surf: 'metal',
  });
  kit.box('#2c3038', 0.22, 0.014, 0.22, cx + 0.01, top, z0 + 0.6, {
    r: 0.01,
    cast: false,
  });
  kit.box('#e4e5e3', 0.012, 0.3, 0.3, x1 + 0.006, 0.04, z1 - 0.2, {
    surf: 'plastic',
  });
  kit.boxes('#c9cdd2', [
    [0.018, 0.1, 0.018, x1 + 0.02, 0.18, z1 - 0.34],
    [0.012, 0.012, 0.28, x1 + 0.008, 0.4, (z0 + z1) / 2 - 0.2],
  ]);
  kit.box('#e9ebed', 0.012, 0.13, 0.13, x1 + 0.006, 0.08, z0 + 0.22, {
    cast: false,
  });
  const ring = new THREE.TorusGeometry(0.055, 0.01, 4, 16)
    .rotateX(-Math.PI / 2)
    .translate(cx + 0.01, top + 0.016, z0 + 0.6);
  kit.add('#6a6f78', ring, { cast: false });
  // the tap; the kettle and one mug; a dish rack with a plate
  kit.box('#c9cdd2', 0.02, 0.12, 0.02, x0 + 0.05, top, z0 + 0.24, {
    surf: 'metal',
  });
  kit.box('#c9cdd2', 0.09, 0.02, 0.02, x0 + 0.095, top + 0.11, z0 + 0.24, {
    surf: 'metal',
  });
  kit.cyl('#d8d9d6', 0.045, 0.055, 0.12, cx + 0.02, top, z1 - 0.12, {
    seg: 12,
    surf: 'plastic',
  });
  kit.cyl('#4a5b78', 0.028, 0.026, 0.065, cx - 0.06, top, z1 - 0.28, {
    surf: 'ceramic',
  });
  kit.box('#b8bcc2', 0.2, 0.06, 0.12, cx, top, z0 + 0.4, { cast: false });
  kit.box('#e9e6df', 0.012, 0.14, 0.12, cx + 0.02, top + 0.02, z0 + 0.4, {
    rz: 0.2,
    surf: 'ceramic',
  });
  // the range hood over the ring, and the strip light under it
  kit.box('#c9ccd0', 0.2, 0.06, 0.3, x0 + 0.1, 1.02, z0 + 0.6, {
    r: 0.01,
    surf: 'metal',
  });
  kit.box('#fff4e0', 0.1, 0.008, 0.2, x0 + 0.1, 1.015, z0 + 0.6, {
    cast: false,
    opts: { emissive: '#ffe6c0', emissiveIntensity: 1.6 },
  });
  nav.block(X0, x1 + 0.03, z0, NEAR);
  return new THREE.Vector3(x0 + 0.14, 0.9, z0 + 0.6);
}

export function bath(kit, root, nav) {
  // the unit bath: one moulded ivory pod with the tub at the back, a basin, the toilet by the front wall. Its door
  // is shut, cut low with the wall; a little frosted panel in it
  const z0 = PART + 0.05,
    z1 = NEAR,
    o = { color: C.wall, top: C.wallTop };
  root.add(wall('z', z0, z1, BATH_X, LOW, 0.08, { ...o, holes: [[0.3, 0.78, 0, 1]] }));
  kit.boxes(C.frame, [
    [0.1, LOW, 0.035, BATH_X, 0, 0.3],
    [0.1, LOW, 0.035, BATH_X, 0, 0.78],
  ]);
  kit.box('#d9dadc', 0.04, LOW - 0.02, 0.44, BATH_X, 0, 0.54, {
    r: 0.006,
    surf: 'plastic',
  });
  kit.box('#b9c6ce', 0.046, 0.14, 0.22, BATH_X, 0.2, 0.54, { cast: false });
  kit.box('#c9cdd2', 0.07, 0.025, 0.025, BATH_X - 0.035, LOW - 0.12, 0.72, {
    r: 0.008,
    cast: false,
  });
  const bx = (BATH_X + X1) / 2;
  kit.box('#e3e3de', X1 - BATH_X - 0.04, 0.012, z1 - z0 - 0.02, bx, 0.003, (z0 + z1) / 2, {
    cast: false,
    surf: 'plastic',
  });
  kit.box('#e3e3de', X1 - BATH_X - 0.08, 0.3, 0.42, bx + 0.01, 0, z0 + 0.25, {
    r: 0.03,
    seg: 2,
    surf: 'ceramic',
  });
  kit.box('#9fb6c6', X1 - BATH_X - 0.2, 0.02, 0.32, bx + 0.01, 0.28, z0 + 0.25, { r: 0.02, cast: false });
  kit.box('#e3e3de', 0.14, 0.05, 0.12, X1 - 0.09, 0.32, z0 + 0.58, {
    r: 0.02,
    surf: 'ceramic',
  });
  kit.box('#c9cdd2', 0.012, 0.16, 0.014, X1 - 0.02, 0.32, z0 + 0.58, {
    cast: false,
  });
  kit.box('#eceef1', 0.16, 0.2, 0.22, X1 - 0.12, 0, z1 - 0.26, {
    r: 0.05,
    seg: 2,
    surf: 'ceramic',
  });
  kit.box('#eceef1', 0.07, 0.3, 0.2, X1 - 0.04, 0, z1 - 0.26, {
    r: 0.02,
    surf: 'ceramic',
  });
  kit.box('#d9dadc', 0.17, 0.02, 0.2, X1 - 0.12, 0.2, z1 - 0.26, {
    r: 0.02,
    cast: false,
  });
  nav.block(BATH_X - 0.06, X1, z0, NEAR);
}

export function genkan(kit, nav) {
  // the shoe cupboard beside the door, his work shoes left on the tiles, slippers at the step
  const sx0 = 0.17,
    sx1 = BATH_X - 0.05,
    sz0 = GENKAN_Z + 0.04,
    sz1 = NEAR - 0.01;
  kit.box('#c3c6ca', sx1 - sx0, 0.36, sz1 - sz0, (sx0 + sx1) / 2, -0.045, (sz0 + sz1) / 2, {
    r: 0.008,
    surf: 'laminate',
  });
  kit.box('#8b919b', 0.008, 0.3, 0.012, sx0 - 0.002, 0.0, (sz0 + sz1) / 2, {
    cast: false,
  });
  kit.box('#b0b4b9', sx1 - sx0 + 0.01, 0.015, sz1 - sz0 + 0.01, (sx0 + sx1) / 2, 0.31, (sz0 + sz1) / 2, {
    cast: false,
  });
  const shoe = (x, z, ry) => {
    kit.box('#1f2228', 0.07, 0.05, 0.16, x, -0.045, z, {
      r: 0.025,
      seg: 2,
      ry,
      surf: 'plastic',
    });
    kit.box('#1f2228', 0.068, 0.04, 0.07, x + Math.sin(ry) * 0.04, 0.0, z + Math.cos(ry) * 0.04, { r: 0.02, ry });
  };
  shoe(-0.24, 0.66, 0.5);
  shoe(-0.12, 0.7, -0.3);
  // company slippers, still paired, on the floor at the step
  kit.box('#6a7892', 0.075, 0.02, 0.15, -0.36, 0, GENKAN_Z - 0.12, {
    r: 0.02,
    surf: 'fabric',
  });
  kit.box('#6a7892', 0.075, 0.02, 0.15, -0.27, 0, GENKAN_Z - 0.12, {
    r: 0.02,
    surf: 'fabric',
  });
  nav.block(sx0 - 0.02, BATH_X, sz0, NEAR);
}

// the room's sliding door: a frosted glass door pushed open along the wall, cut low with it
export function slidingDoor(kit) {
  const x1 = X1 - 0.01,
    x0 = x1 - 0.66,
    z = PART - 0.055;
  kit.box('#6f757f', x1 - x0, LOW - 0.02, 0.03, (x0 + x1) / 2, 0, z, {
    surf: 'paint',
  });
  kit.box('#b9c6ce', x1 - x0 - 0.1, LOW - 0.12, 0.034, (x0 + x1) / 2, 0.06, z, {
    cast: false,
  });
  kit.box(C.frame, DOORWAY[1] - DOORWAY[0], 0.008, 0.06, (DOORWAY[0] + DOORWAY[1]) / 2, 0, PART, { cast: false });
}
