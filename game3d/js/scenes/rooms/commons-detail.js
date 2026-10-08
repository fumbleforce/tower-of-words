// Fixtures and residents' belongings stay against the walls or on existing furniture.
// The table's working end and the art-session seats remain clear.
const C = { frame: '#626f78', trim: '#bac7c7', pale: '#e8eeee', steel: '#8b919b' };

export const COMMONS_WINDOWS = [-2.6, -0.9, 0.8];

export function commonsWindows(kit, R) {
  for (const x of COMMONS_WINDOWS) {
    const z = R.z0 - 0.03;
    kit.box('#c5dce5', 1.16, 0.46, 0.025, x, 0.87, z - 0.11, {
      opts: { emissive: '#bad4df', emissiveIntensity: 0.65 },
      cast: false,
    });
    for (const side of [-1, 1]) {
      kit.box(C.frame, 0.04, 0.52, 0.15, x + side * 0.59, 0.84, z, { surf: 'frame' });
      kit.box(C.pale, 1.24, 0.035, 0.16, x, side < 0 ? 0.83 : 1.35, z, { surf: 'plaster' });
    }
    kit.box(C.frame, 0.026, 0.48, 0.1, x, 0.87, z + 0.01, { surf: 'frame' });
    kit.box(C.frame, 1.16, 0.025, 0.09, x, 1.12, z + 0.01, { surf: 'frame' });
    kit.box(C.pale, 1.28, 0.045, 0.27, x, 0.8, z + 0.05, { surf: 'stone' });
    kit.box('#526571', 0.018, 0.07, 0.025, x + 0.08, 0.96, z + 0.07);
    // Rolled blinds leave the full opening visible.
    kit.cyl('#adb5af', 0.034, 0.034, 1.18, x, 1.36 - 0.59, z + 0.075, { rz: Math.PI / 2, surf: 'fabric' });
    kit.box(C.frame, 0.008, 0.23, 0.008, x + 0.55, 1.13, z + 0.08);
    // A glimpse of the back walk and planting through each actual opening.
    kit.box('#8ba394', 1.13, 0.05, 0.03, x, 0.87, z - 0.08, { surf: 'foliage', cast: false });
  }
}

export function commonsDetails(kit, R, nav) {
  // Staggered board ends break the long floor strips without raising the walking surface.
  for (let row = 0, z = R.z0 + 0.12; z < R.z1; row++, z += 0.24)
    for (let x = R.x0 + 0.45 + (row % 3) * 0.65; x < R.x1; x += 1.95)
      kit.box('#a7aea6', 0.009, 0.003, 0.225, x, 0.001, z, { cast: false });
  wallFinish(kit, R);
  kitchenFixtures(kit, R);
  livingDetails(kit, R);
  supplies(kit, R, nav);
}

function wallFinish(kit, R) {
  // A washable lower wall, skirting and a slim cap wrap the room.
  for (const x of [R.x0 + 0.015, R.x1 - 0.015]) {
    kit.box('#c4d1cd', 0.025, 0.58, -R.z0, x, 0.035, R.z0 / 2, { surf: 'plaster' });
    kit.box(C.trim, 0.045, 0.035, -R.z0, x, 0.61, R.z0 / 2, { surf: 'frame' });
    kit.box(C.frame, 0.025, 0.065, -R.z0, x, 0.005, R.z0 / 2, { surf: 'frame' });
  }
  kit.box('#c4d1cd', 8, 0.58, 0.025, 0, 0.035, R.z0 + 0.015, { surf: 'plaster' });
  kit.box(C.trim, 8, 0.035, 0.035, 0, 0.61, R.z0 + 0.025, { surf: 'frame' });
  kit.box(C.frame, 8, 0.065, 0.025, 0, 0.005, R.z0 + 0.02, { surf: 'frame' });
  // Two shallow felt panels soften the TV corner without covering its screen.
  for (const z of [-3.87, -2.72]) {
    kit.box('#547773', 0.055, 0.55, 0.4, R.x0 + 0.03, 0.79, z, { surf: 'fabric' });
    for (let i = 0; i < 4; i++)
      kit.box('#6f8e87', 0.005, 0.49, 0.018, R.x0 + 0.061, 0.82, z - 0.14 + i * 0.09, { surf: 'fabric' });
  }
  // Visible electrical fittings sit above furniture; there are no dangling wires in a walk lane.
  for (const z of [-3.3, -1.9]) {
    kit.box(C.pale, 0.018, 0.11, 0.12, R.x1 - 0.035, 0.66, z, { surf: 'plastic' });
    for (const dz of [-0.025, 0.025]) kit.box(C.frame, 0.003, 0.026, 0.007, R.x1 - 0.024, 0.7, z + dz);
  }
}

function kitchenFixtures(kit, R) {
  const z = R.z0 + 0.25;
  // Small pale backsplash tiles and their joints above the working surface.
  kit.box('#d8e4df', 2.24, 0.47, 0.035, 2.3, 0.46, R.z0 + 0.035, { surf: 'tile' });
  for (let i = 0; i < 10; i++) kit.box('#b5c5bf', 0.008, 0.47, 0.004, 1.2 + i * 0.24, 0.46, R.z0 + 0.055);
  for (const y of [0.62, 0.79]) kit.box('#b5c5bf', 2.24, 0.008, 0.004, 2.3, y, R.z0 + 0.055);
  for (const x of [1.47, 2.01, 2.55, 3.09]) {
    kit.box('#aebdb8', 0.51, 0.34, 0.018, x, 0.04, z + 0.258, { surf: 'laminate' });
    kit.box(C.steel, 0.16, 0.014, 0.03, x, 0.325, z + 0.277, { surf: 'metal' });
    kit.box('#e0e6df', 0.52, 0.27, 0.015, x, 0.98, z + 0.058, { surf: 'laminate' });
    kit.box(C.steel, 0.12, 0.012, 0.025, x, 1.01, z + 0.075, { surf: 'metal' });
  }
  kit.box('#697b80', 0.36, 0.012, 0.23, 1.7, 0.435, z, { surf: 'metal' });
  kit.box('#94adb5', 0.29, 0.003, 0.16, 1.7, 0.449, z, { surf: 'metal' });
  kit.box(C.steel, 0.018, 0.018, 0.13, 1.7, 0.603, z - 0.13, { surf: 'metal' });
  kit.box('#a3c9bc', 0.06, 0.12, 0.055, 1.34, 0.432, z - 0.06, { surf: 'plastic' });
  kit.box(C.pale, 0.055, 0.016, 0.02, 1.35, 0.554, z - 0.06);
  // A draining rack beside the sink, with two upright plates.
  kit.box(C.steel, 0.22, 0.018, 0.31, 1.98, 0.434, z, { surf: 'metal' });
  for (const x of [1.93, 2.02])
    kit.cyl(C.pale, 0.08, 0.08, 0.016, x, 0.51 - 0.008, z, { rz: Math.PI / 2, surf: 'ceramic' });
  // Kettle: a lid, short spout, open side handle and separate power base.
  const kx = 3.15,
    kz = z - 0.06;
  kit.cyl(C.frame, 0.085, 0.085, 0.018, kx, 0.427, kz, { surf: 'plastic' });
  kit.cyl(C.frame, 0.057, 0.062, 0.015, kx, 0.59, kz, { surf: 'plastic' });
  kit.box(C.frame, 0.025, 0.12, 0.025, kx + 0.115, 0.455, kz, { r: 0.005 });
  for (const y of [0.455, 0.56]) kit.box(C.frame, 0.055, 0.018, 0.025, kx + 0.09, y, kz);
  kit.box(C.pale, 0.075, 0.045, 0.046, kx - 0.085, 0.535, kz, { rz: -0.45 });
  // Rice cooker: domed lid, carry handle and front control.
  const rx = 2.2,
    rz = z - 0.05;
  kit.cyl('#bcc7c8', 0.092, 0.113, 0.035, rx, 0.57, rz, { surf: 'plastic' });
  kit.box(C.frame, 0.09, 0.023, 0.024, rx, 0.611, rz, { r: 0.005 });
  kit.box(C.frame, 0.082, 0.04, 0.012, rx, 0.48, rz + 0.12, { surf: 'plastic' });
  kit.box('#9eb3ac', 0.044, 0.021, 0.002, rx - 0.012, 0.49, rz + 0.127);
  kit.box('#ca7460', 0.012, 0.012, 0.003, rx + 0.027, 0.496, rz + 0.128);
  // Cabinet towel, hob controls, fridge seam and compressor vent.
  kit.box(C.steel, 0.24, 0.016, 0.03, 1.47, 0.29, z + 0.3, { surf: 'metal' });
  kit.box('#628f99', 0.17, 0.19, 0.022, 1.47, 0.13, z + 0.318, { surf: 'fabric' });
  for (const x of [2.46, 2.61, 2.79, 2.94]) kit.box(C.frame, 0.033, 0.018, 0.04, x, 0.432, z + 0.2);
  kit.box('#a6b4b4', 0.51, 0.012, 0.004, 0.87, 0.5, z + 0.322);
  for (let i = 0; i < 5; i++) kit.box(C.frame, 0.4, 0.007, 0.005, 0.87, 0.04 + i * 0.015, z + 0.324);
}

function livingDetails(kit, R) {
  // The sofa's end carries a folded throw, clear of Kenji's middle seat and remote action.
  kit.box('#b1c6c4', 0.35, 0.025, 0.19, -1.79, 0.31, -4.03, { surf: 'fabric' });
  for (let i = 0; i < 4; i++) kit.box('#668b91', 0.35, 0.003, 0.016, -1.79, 0.336, -4.1 + i * 0.04, { surf: 'fabric' });
  // Residents' board games and albums fill the existing bookcase's spare spaces.
  for (const [y, z, color] of [
    [0.035, -1.67, '#698c91'],
    [0.335, -1.26, '#ad6965'],
    [0.635, -1.36, '#627aa1'],
  ]) {
    kit.box(color, 0.23, 0.07, 0.085, R.x0 + 0.2, y, z, { surf: 'card' });
    kit.box(C.pale, 0.002, 0.018, 0.05, R.x0 + 0.317, y + 0.026, z);
  }
  // A small pair of potted cuttings sits on the sill above the TV.
  for (const [x, height] of [
    [-2.97, 0.1],
    [-2.72, 0.14],
  ]) {
    kit.cyl('#839ba2', 0.065, 0.048, 0.09, x, 0.845, R.z0 + 0.13, { surf: 'ceramic' });
    kit.cyl('#4e7867', 0.003, 0.004, height, x, 0.93, R.z0 + 0.13, { seg: 5 });
    for (const side of [-1, 1])
      kit.box('#638c70', 0.07, 0.018, 0.035, x + side * 0.025, 0.94 + height * 0.5, R.z0 + 0.13, { rz: side * 0.45 });
  }
}

function supplies(kit, R, nav) {
  // A shallow supply cupboard in the unused south-east corner, outside the entrance and printer approach.
  const x = R.x1 - 0.24,
    z = -0.52;
  kit.box('#718c8a', 0.42, 0.65, 0.62, x, 0, z, { surf: 'laminate' });
  for (const y of [0.04, 0.26, 0.48]) {
    kit.box('#d1dcd6', 0.022, 0.18, 0.54, x - 0.222, y, z, { surf: 'drawerfront' });
    kit.box(C.frame, 0.02, 0.025, 0.16, x - 0.244, y + 0.1, z, { surf: 'metal' });
  }
  // A tray holds spare sheets without taking table working space.
  kit.box(C.frame, 0.32, 0.055, 0.32, x, 0.65, z - 0.08, { surf: 'plastic' });
  for (const dz of [-0.12, 0, 0.12]) kit.box('#e9e8da', 0.22, 0.025, 0.08, x, 0.706, z + dz - 0.08, { surf: 'paper' });
  nav.block(R.x1 - 0.5, R.x1, z - 0.34, z + 0.34);
  // Vertical dividers give the drying rack a place for blank boards below its shelves.
  for (let i = 0; i < 4; i++)
    kit.box(['#b2c4ca', '#e7e6da'][i % 2], 0.025, 0.09, 0.29, -0.69 + i * 0.16, 0.02, R.z0 + 0.25, { surf: 'card' });
}
