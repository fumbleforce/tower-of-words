// Fittings stay on existing furniture or against the walls, outside dining approaches.
const C = {
  wood: '#8c7560',
  dark: '#344c4c',
  steel: '#a6b4ad',
  pale: '#ebe6d8',
};
function bottle(k, x, y, z, color, h = 0.24) {
  k.cyl(color, 0.04, 0.044, h * 0.7, x, y, z, { surf: 'glass' });
  k.cyl(color, 0.017, 0.038, h * 0.16, x, y + h * 0.7, z, { surf: 'glass' });
  k.cyl(C.dark, 0.018, 0.018, h * 0.14, x, y + h * 0.86, z, { surf: 'metal' });
  k.box(C.pale, 0.045, h * 0.28, 0.007, x, y + h * 0.2, z + 0.043, {
    surf: 'card',
  });
}
export function izakayaDetail(k, R) {
  const width = R.x1 - R.x0,
    back = R.z0;
  // Cupboard joinery and pulls below the existing worktop.
  k.box(C.dark, width, 0.07, 0.025, 0, 0.02, back + 0.43, { surf: 'metal' });
  for (let i = 0; i < 6; i++) {
    const x = R.x0 + ((i + 0.5) * width) / 6;
    k.box('#506d65', width / 6 - 0.025, 0.5, 0.022, x, 0.11, back + 0.432, {
      surf: 'laminate',
    });
    k.box(C.steel, 0.16, 0.018, 0.022, x, 0.55, back + 0.454, {
      surf: 'metal',
    });
  }
  k.box(C.wood, width, 0.028, 0.025, 0, 0.675, back + 0.449, { surf: 'frame' });
  // A real shallow wall recess with a tiled back and service shelf.
  k.box('#788985', 2.1, 0.66, 0.025, 0, 0.94, back - 0.125, { surf: 'tile' });
  for (let x = -0.9; x < 1; x += 0.3) k.box(C.steel, 0.008, 0.64, 0.008, x, 0.95, back - 0.108);
  for (const y of [1.1, 1.29, 1.48]) k.box(C.steel, 2.1, 0.008, 0.008, 0, y, back - 0.108);
  for (const x of [-1.055, 1.055]) k.box(C.dark, 0.045, 0.72, 0.26, x, 0.92, back + 0.015, { surf: 'metal' });
  k.box(C.dark, 2.14, 0.038, 0.27, 0, 1.59, back + 0.015, { surf: 'metal' });
  k.box(C.steel, 2.07, 0.027, 0.18, 0, 1.27, back + 0.01, { surf: 'metal' });
  for (const [i, x] of [-0.88, -0.71, -0.55, -0.16, 0.04, 0.67, 0.84].entries()) {
    if (i < 3) bottle(k, x, 1.297, back + 0.01, ['#52715f', '#737a62', '#516879'][i]);
    else {
      k.cyl(C.pale, 0.06, 0.044, 0.105, x, 1.297, back + 0.01, {
        surf: 'ceramic',
      });
      k.cyl(C.dark, 0.046, 0.046, 0.008, x, 1.395, back + 0.01);
    }
  }
  k.box(C.dark, 0.38, 0.018, 0.28, -1.46, 0.73, back + 0.23, {
    surf: 'laminate',
  });
  for (const x of [-1.58, -1.39]) bottle(k, x, 0.748, back + 0.23, '#53665b', 0.19);
  for (let n = 0; n < 3; n++)
    k.box(C.pale, 0.28, 0.023, 0.2, 1.46, 0.73 + n * 0.024, back + 0.22, {
      surf: 'fabric',
    });
  // Panel rails and battens, with all projections kept against the wall.
  for (const side of [-1, 1]) {
    const x = side < 0 ? R.x0 + 0.044 : R.x1 - 0.044;
    for (const y of [0.035, 0.56]) k.box(C.wood, 0.055, 0.035, -back, x, y, back / 2, { surf: 'frame' });
    for (let z = back + 0.35; z < -0.1; z += 0.48) k.box('#405550', 0.036, 0.47, 0.025, x, 0.085, z, { surf: 'frame' });
  }
  // Recessed west window, sliding frame, deep sill and rolled blind.
  const x = R.x0,
    z = -2.3;
  k.box('#91b0b7', 0.025, 0.68, 1.5, x - 0.12, 1, z, {
    surf: 'glass',
    cast: false,
  });
  for (const dz of [-0.77, 0, 0.77]) k.box(C.wood, 0.16, 0.76, 0.035, x - 0.03, 0.96, z + dz, { surf: 'frame' });
  for (const y of [0.96, 1.7]) k.box(C.wood, 0.16, 0.035, 1.58, x - 0.03, y, z, { surf: 'frame' });
  k.box(C.pale, 0.23, 0.045, 1.65, x + 0.015, 0.915, z, { surf: 'stone' });
  k.box(C.dark, 0.018, 0.1, 0.024, x + 0.061, 1.17, z + 0.065, {
    surf: 'metal',
  });
  k.box('#b7b7a2', 0.085, 0.11, 1.59, x + 0.035, 1.75, z, { surf: 'fabric' });
  k.box(C.dark, 0.013, 0.24, 0.012, x + 0.081, 1.49, z + 0.69);
  // East-wall cup and bottle rack above the clear aisle.
  for (const y of [1.38, 1.77]) {
    k.box(C.wood, 0.2, 0.045, 1.45, R.x1 - 0.1, y, -2.65, { surf: 'laminate' });
    for (const dz of [-0.57, 0.57]) {
      k.box(C.dark, 0.025, 0.16, 0.035, R.x1 - 0.0125, y - 0.16, -2.65 + dz, { surf: 'metal' });
      k.box(C.dark, 0.18, 0.025, 0.035, R.x1 - 0.09, y - 0.025, -2.65 + dz, { surf: 'metal' });
    }
  }
  for (let i = 0; i < 7; i++) {
    const z = -3.25 + i * 0.19;
    k.cyl(C.pale, 0.052, 0.043, 0.095, R.x1 - 0.1, 1.425, z, {
      surf: 'ceramic',
    });
    k.cyl(C.dark, 0.04, 0.04, 0.008, R.x1 - 0.1, 1.513, z);
    bottle(k, R.x1 - 0.1, 1.815, z, i % 2 ? '#5e7267' : '#697782', 0.22 + (i % 3) * 0.025);
  }
  // Hooks and a hung apron by the entry; umbrella handles above a drip tray.
  k.box(C.wood, 0.08, 0.085, 0.64, R.x0 + 0.04, 1.46, -0.62, {
    surf: 'frame',
  });
  for (const z of [-0.85, -0.62, -0.39]) {
    k.box(C.steel, 0.09, 0.02, 0.02, R.x0 + 0.095, 1.45, z, { surf: 'metal' });
    k.box(C.steel, 0.02, 0.045, 0.02, R.x0 + 0.135, 1.45, z, { surf: 'metal' });
  }
  k.box('#738d97', 0.027, 0.46, 0.28, R.x0 + 0.12, 0.91, -0.63, {
    surf: 'fabric',
  });
  for (const z of [-0.73, -0.53])
    k.box('#738d97', 0.02, 0.12, 0.024, R.x0 + 0.12, 1.37, z, {
      surf: 'fabric',
    });
  k.box(C.dark, 0.3, 0.025, 0.57, 1.62, 0.025, -0.39, { surf: 'metal' });
  for (const x of [1.48, 1.76]) k.box('#536768', 0.025, 0.52, 0.57, x, 0.05, -0.39, { surf: 'laminate' });
  for (const z of [-0.66, -0.12]) k.box('#536768', 0.3, 0.52, 0.025, 1.62, 0.05, z, { surf: 'laminate' });
  for (const [i, z] of [-0.57, -0.39, -0.21].entries()) {
    const y = 0.08 + i * 0.025;
    k.cyl(C.steel, 0.009, 0.009, 0.97, 1.62, y, z, { surf: 'metal' });
    k.cyl(['#566f7c', '#777469', '#466b63'][i], 0.025, 0.045, 0.5, 1.62, y + 0.32, z, { seg: 8, surf: 'fabric' });
    k.box(C.dark, 0.07, 0.022, 0.025, 1.648, y + 0.95, z, { surf: 'metal' });
    k.box(C.dark, 0.022, 0.055, 0.025, 1.675, y + 0.915, z, { surf: 'metal' });
  }
  // Staggered plank ends and table apron below the wrist animation.
  for (let x = R.x0 + 0.14, i = 0; x < R.x1; x += 0.28, i++)
    for (let z = back + 0.55 + (i % 3) * 0.41; z < 0; z += 1.3)
      k.box('#78604f', 0.26, 0.003, 0.007, x, 0.002, z, { cast: false });
  for (const z of [-1.53, -2.57]) k.box(C.wood, 1.5, 0.09, 0.04, 0, 0.48, z, { surf: 'laminate' });
}
