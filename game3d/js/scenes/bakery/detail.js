import * as THREE from 'three';

const C = { trim: '#637575', pale: '#d5d7c9', dark: '#3e4e53', wood: '#bdad8c' };
const metal = { surf: 'metal' },
  wood = { surf: 'laminate' };

export function bakeryDetail(k, R) {
  // All fittings remain on the existing furniture or against the shell.
  for (const x of [R.x0 + 0.024, R.x1 - 0.024]) {
    k.box(C.trim, 0.045, 0.1, 4.34, x, 0, -2.17, metal);
    k.box('#a4b2ab', 0.045, 0.055, 4.34, x, 2.25, -2.17, wood);
  }
  k.box(C.trim, 4.16, 0.1, 0.045, 0, 0, R.z0 + 0.024, metal);
  // Washable tile behind the worktop, with small joints rather than a blank wall.
  k.box('#c4d3cb', 3.9, 0.56, 0.028, 0, 0.74, -4.315, { surf: 'tile' });
  for (let x = -1.8; x < 1.9; x += 0.3) k.box('#a4b2ab', 0.008, 0.56, 0.005, x, 0.74, -4.298);
  for (const y of [0.93, 1.12]) k.box('#a4b2ab', 3.9, 0.008, 0.005, 0, y, -4.298);
  k.box(C.trim, 3.9, 0.025, 0.035, 0, 1.3, -4.315, metal);
  // Oven casing, glazed door trim, controls and low ventilation slots.
  for (const x of [-1.845, -0.755]) k.box(C.trim, 0.035, 0.44, 0.035, x, 0.135, -3.805, metal);
  for (const y of [0.135, 0.56]) k.box(C.trim, 1.12, 0.025, 0.035, -1.3, y, -3.805, metal);
  k.box('#708987', 0.78, 0.018, 0.007, -1.3, 0.47, -3.797, { surf: 'glass' });
  k.box(C.dark, 1.13, 0.067, 0.028, -1.3, 0.605, -3.815, metal);
  for (const x of [-1.69, -1.47])
    k.add(
      C.pale,
      new THREE.CylinderGeometry(0.023, 0.023, 0.024, 12).rotateX(Math.PI / 2).translate(x, 0.638, -3.789),
      metal,
    );
  k.box('#abc8bb', 0.2, 0.034, 0.01, -1.04, 0.623, -3.794, { surf: 'glass' });
  for (let x = -1.77; x < -0.8; x += 0.085) k.box(C.dark, 0.038, 0.032, 0.01, x, 0.073, -3.823, metal);
  for (const x of [-0.34, 0.31, 0.96, 1.61]) {
    k.box('#9caea7', 0.625, 0.53, 0.022, x, 0.09, -3.823, metal);
    k.box(C.dark, 0.21, 0.019, 0.038, x, 0.54, -3.801, metal);
  }
  // Cooling-tray rims meet their existing stacked bases.
  for (let n = 0; n < 4; n++) {
    const y = 0.773 + n * 0.055;
    for (const x of [-1.54, -0.96]) k.box(C.trim, 0.018, 0.018, 0.33, x, y, -4.04, metal);
    for (const z of [-4.2, -3.88]) k.box(C.trim, 0.58, 0.018, 0.018, -1.25, y, z, metal);
  }
  // A compact extraction grille above the oven, with a conduit reaching the wall crown.
  k.box(C.trim, 0.84, 0.3, 0.1, -1.27, 1.53, -4.29, metal);
  for (let y = 1.575; y < 1.81; y += 0.045) k.box(C.dark, 0.7, 0.017, 0.012, -1.27, y, -4.234, metal);
  k.box(C.trim, 0.13, 0.57, 0.085, -1.27, 1.83, -4.298, metal);
  // Reserved shelves have brackets; boxes have folded lids and front label cards.
  for (const y of [1.39, 1.78]) {
    for (const x of [-0.04, 1.1]) {
      k.box(C.trim, 0.034, 0.17, 0.035, x, y - 0.17, -4.323, metal);
      k.box(C.trim, 0.034, 0.025, 0.3, x, y - 0.025, -4.17, metal);
    }
    for (const x of [0.13, 0.55, 0.97]) {
      k.box('#c6b998', 0.288, 0.02, 0.212, x, y + 0.245, -4.12, { surf: 'card' });
      k.box('#f2eee0', 0.115, 0.065, 0.006, x, y + 0.11, -4.017, { surf: 'card' });
      k.box('#8b9b8b', 0.03, 0.07, 0.008, x + 0.065, y + 0.16, -4.015, { surf: 'card' });
    }
  }
  for (const x of [1.1, 1.55]) {
    k.box('#c6b998', 0.31, 0.025, 0.25, x, 1.22, -4.09, { surf: 'fabric' });
    k.box('#f2eee0', 0.19, 0.13, 0.007, x, 0.93, -3.952, { surf: 'card' });
  }
  // A board and rolling pin sit in the open part of the preparation worktop.
  k.box(C.wood, 0.48, 0.018, 0.34, -0.32, 0.74, -4.05, wood);
  k.add(
    '#a9906c',
    new THREE.CylinderGeometry(0.033, 0.033, 0.28, 12).rotateZ(Math.PI / 2).translate(-0.32, 0.791, -4.04),
    wood,
  );
  for (const x of [-0.5, -0.14])
    k.add(
      C.wood,
      new THREE.CylinderGeometry(0.014, 0.014, 0.095, 10).rotateZ(Math.PI / 2).translate(x, 0.791, -4.04),
      wood,
    );
  // Front counter panels, a toe strip and a small stack of folded bags beside the till.
  k.box(C.dark, 2.28, 0.07, 0.022, 0.85, 0.015, -2.801, metal);
  for (const x of [0.09, 0.85, 1.61]) k.box('#6d9087', 0.73, 0.51, 0.018, x, 0.1, -2.802, wood);
  for (let n = 0; n < 5; n++) {
    k.box('#e2d3b5', 0.24, 0.009, 0.22, 1.18, 0.725 + n * 0.01, -2.99, { surf: 'card' });
    k.box('#c6b998', 0.23, 0.004, 0.035, 1.18, 0.734 + n * 0.01, -3.07, { surf: 'card' });
  }
  // Shallow bread pans support the existing bread at exactly its authored height.
  for (const y of [0.692, 1.092]) {
    for (const z of [-1.42, -2.12]) {
      k.box('#a9bbb8', 0.68, 0.028, 0.39, -1.63, y, z, metal);
      for (const x of [-1.965, -1.295]) k.box(C.trim, 0.012, 0.022, 0.39, x, y + 0.028, z, metal);
      for (const dz of [-0.19, 0.19]) k.box(C.trim, 0.68, 0.022, 0.012, -1.63, y + 0.028, z + dz, metal);
    }
  }
  for (const z of [-2.52, -0.78]) k.box(C.trim, 0.035, 0.36, 0.035, -1.27, 0.69, z, metal);
  k.box(C.dark, 0.025, 0.07, 1.9, -1.242, 0.02, -1.65, metal);
  for (const z of [-2.11, -1.2]) {
    k.box('#6d9087', 0.018, 0.47, 0.86, -1.242, 0.12, z, wood);
    k.box(C.pale, 0.032, 0.025, 0.16, -1.22, 0.5, z, metal);
  }
  // The window ledge is carried by its end legs and a wall rail below the top.
  for (const x of [1.02, 2]) k.box(C.trim, 0.038, 0.65, 0.038, x, 0, -0.66, metal);
  k.box(C.trim, 1.04, 0.045, 0.045, 1.51, 0.58, -0.07, metal);
}
