import * as THREE from 'three';
import { CAMPUS_DETAILS, PRINT_FOUNDATIONS, PRINT_SERVICE_PAD, SERVICE_PAD_TOP } from './landscape-plan.js';
import { pt } from './plan.js';

// Paper deliveries and returns share a dry, supported service edge on w3's south wall.
// All pieces stay outside the existing door path and the level entrance apron.
export function campusServiceFront(parts) {
  const box = (color, w, h, d, x, y, z, o = {}) => {
    const p = pt([x, z]);
    parts.box(color, w, h, d, p[0], y, p[1], o);
  };
  for (const [x, z, x1, z1] of PRINT_FOUNDATIONS) {
    box('#91948a', x1 - x, 0.018, z1 - z, (x + x1) / 2, 0.005, (z + z1) / 2, {
      cast: false,
      surf: 'soil',
    });
    for (let xx = x + 0.16; xx < x1 - 0.08; xx += 0.37)
      box('#acaea3', 0.12, 0.008, 0.09, xx, 0.025, z + 0.16, { cast: false });
  }
  box('#89938f', 9.5, 0.24, 0.11, -29.25, 0, -41.36, { surf: 'concrete' });
  // A service hatch belongs to the wall, with visible frame, hinge and small latch.
  box('#777e79', 1.02, 1.23, 0.055, -32.35, 0.28, -41.315);
  box('#58655f', 0.86, 1.08, 0.04, -32.35, 0.35, -41.27);
  box('#bac0b7', 0.055, 0.15, 0.04, -31.99, 0.77, -41.23);
  for (const y of [0.47, 1.17]) box('#939b91', 0.045, 0.12, 0.065, -32.78, y, -41.235);
  // Under-window air grille with a recessed dark core and horizontal slats.
  box('#576661', 0.88, 0.38, 0.09, -30.7, 1.55, -41.3);
  for (let i = 0; i < 5; i++) box('#abb1a7', 0.81, 0.025, 0.08, -30.7, 1.58 + i * 0.065, -41.23);

  const [px, pz, px1, pz1] = PRINT_SERVICE_PAD;
  box('#9b9f92', px1 - px, SERVICE_PAD_TOP + 0.04, pz1 - pz, (px + px1) / 2, -0.04, (pz + pz1) / 2, {
    cast: false,
    surf: 'concrete',
  });
  const raisedBox = (color, w, h, d, x, y, z, o) => box(color, w, h, d, x, y + SERVICE_PAD_TOP, z, o);
  const [x, z, w, d] = CAMPUS_DETAILS.printStore;
  raisedBox('#838b84', w + 0.28, 0.085, d + 0.25, x, 0, z, { surf: 'concrete' });
  raisedBox('#596a68', w, 0.08, d, x, 0.1, z);
  for (const xx of [x - w / 2 + 0.05, x + w / 2 - 0.05])
    for (const zz of [z - d / 2 + 0.05, z + d / 2 - 0.05]) raisedBox('#596a68', 0.06, 1.41, 0.06, xx, 0.08, zz);
  raisedBox('#6b7b77', w + 0.24, 0.07, d + 0.2, x, 1.49, z, { surf: 'roof' });
  // Closed metal back and side rails shelter a visible stack of wrapped white stock.
  raisedBox('#8e9b92', w, 0.89, 0.04, x, 0.3, z - d / 2);
  for (const zz of [z - d / 2, z + d / 2])
    for (const y of [0.39, 0.92]) raisedBox('#77867f', w, 0.035, 0.035, x, y, zz);
  for (const xx of [x - w / 2, x + w / 2])
    for (let i = 0; i < 4; i++) raisedBox('#8f9a91', 0.025, 0.84, 0.025, xx, 0.32, z - d / 2 + (i * d) / 3);
  for (let layer = 0; layer < 3; layer++)
    for (let col = 0; col < 3; col++) {
      const xx = x - 0.7 + col * 0.62,
        yy = 0.19 + layer * 0.23;
      raisedBox(layer === 2 && col === 2 ? '#c2b49b' : '#d6d8c9', 0.57, 0.2, 0.52, xx, yy, z, {
        surf: layer === 2 && col === 2 ? 'wood' : null,
      });
      raisedBox('#f0eddb', 0.025, 0.204, 0.526, xx - 0.13, yy, z, { cast: false });
      raisedBox('#a4ae99', 0.14, 0.08, 0.008, xx + 0.12, yy + 0.06, z + 0.266, {
        cast: false,
      });
    }
  const [cx, cz, cw, cd] = CAMPUS_DETAILS.returnCart;
  for (const xx of [cx - cw * 0.35, cx + cw * 0.35])
    for (const zz of [cz - cd * 0.34, cz + cd * 0.34]) {
      const p = pt([xx, zz]);
      const wheel = new THREE.CylinderGeometry(0.075, 0.075, 0.06, 8)
        .rotateZ(Math.PI / 2)
        .translate(p[0], 0.077 + SERVICE_PAD_TOP, p[1]);
      parts.geo('#3f4848', wheel);
    }
  raisedBox('#68746c', cw, 0.075, cd, cx, 0.14, cz);
  for (const xx of [cx - cw * 0.4, cx + cw * 0.4]) raisedBox('#66766f', 0.04, 0.69, 0.04, xx, 0.16, cz - cd * 0.42);
  raisedBox('#54635d', cw * 0.8, 0.05, 0.05, cx, 0.82, cz - cd * 0.42);
  // Flattened cartons waiting for collection: varied sizes and a tied bundle.
  for (let i = 0; i < 5; i++)
    raisedBox(
      i % 2 ? '#9e8e6d' : '#b2a487',
      cw - 0.13 - (i % 2) * 0.12,
      0.055,
      cd - 0.13,
      cx + (i % 2) * 0.035,
      0.22 + i * 0.06,
      cz,
      { surf: 'wood' },
    );
  raisedBox('#d2cab3', 0.026, 0.31, cd - 0.09, cx, 0.21, cz, { cast: false });
  // Slot drain between the stock shelter and foundation, with no unsupported cover.
  box('#46534e', 3.6, 0.016, 0.18, -28.1, 0.025, -40.88, { cast: false });
  for (let i = 0; i < 24; i++)
    box('#8d9790', 0.065, 0.015, 0.17, -29.82 + i * 0.15, 0.04, -40.88, {
      cast: false,
    });
}
