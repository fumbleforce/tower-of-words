import { COUNTER, R, TABLES } from './plan.js';

// Fixtures belong to service or dining: vented hatch, washable splash wall, tray stops and table supplies.
export function canteenDetail(kit) {
  const steel = '#8c9b99',
    dark = '#415753';
  for (let x = -6.25; x < 0.8; x += 0.26) kit.box(dark, 0.12, 0.032, 0.025, x, 1.985, R.z0 + 0.61, { surf: 'metal' });
  for (let x = -6.4; x < 0.8; x += 0.4) kit.box('#acb9ac', 0.006, 0.6, 0.01, x, 0.92, R.z0 + 0.105, { cast: false });
  for (const y of [1.1, 1.3, 1.5]) kit.box('#acb9ac', 7.2, 0.006, 0.01, -2.8, y, R.z0 + 0.108, { cast: false });
  for (const x of [-8.45, -4.1, 0.4, 3.05])
    kit.box(steel, 0.025, 0.035, 0.24, x, 0.6, COUNTER.z + 0.57, { surf: 'metal' });
  for (let i = 0; i < 5; i++) {
    const x = COUNTER.x - 3.3 + i * 1.2;
    kit.box(steel, 0.8, 0.025, 0.032, x, 0.703, COUNTER.z - 0.24, { surf: 'metal' });
    kit.box(steel, 0.8, 0.025, 0.032, x, 0.703, COUNTER.z + 0.24, { surf: 'metal' });
    for (let j = 0; j < 7; j++) {
      const px = x - 0.23 + (j % 4) * 0.14,
        pz = COUNTER.z - 0.12 + Math.floor(j / 4) * 0.19;
      kit.box(i % 2 ? '#719255' : '#bc9053', 0.07, 0.025 + (j % 2) * 0.015, 0.07, px, 0.716, pz, { ry: j * 0.55 });
    }
    // Upright cover sits on the staff side of each hot-food well, with its own handle.
    kit.box(steel, 0.7, 0.38, 0.016, x, 0.69, COUNTER.z - 0.27, { surf: 'metal', rx: -0.1 });
    kit.box(dark, 0.17, 0.025, 0.045, x, 0.99, COUNTER.z - 0.28, { surf: 'plastic' });
  }
  // The shared and end tables have reachable supplies, with room left for trays and elbows.
  for (const i of [0, 2, 7]) {
    const { x: tx, z } = TABLES[i],
      x = tx + 1.07;
    kit.box('#668881', 0.34, 0.026, 0.26, x, 0.602, z, { surf: 'plastic' });
    for (const dz of [-0.115, 0.115]) kit.box('#53766d', 0.34, 0.055, 0.012, x, 0.61, z + dz, { surf: 'plastic' });
    for (let layer = 0; layer < 5; layer++)
      kit.box('#eee9dd', 0.14, 0.004, 0.11, x - 0.07, 0.63 + layer * 0.005, z + 0.05, { surf: 'paper', cast: false });
    kit.cyl('#eee6ce', 0.034, 0.03, 0.095, x + 0.08, 0.629, z - 0.055, { surf: 'ceramic' });
    kit.cyl('#53696a', 0.036, 0.036, 0.016, x + 0.08, 0.724, z - 0.055, { surf: 'metal' });
    kit.cyl('#835c41', 0.027, 0.033, 0.09, x - 0.055, 0.629, z - 0.075, { surf: 'glass' });
    kit.cyl('#a74332', 0.029, 0.029, 0.024, x - 0.055, 0.719, z - 0.075, { surf: 'plastic' });
  }
  // Small edge repairs and wipe marks distinguish maintained tables without coating them in noise.
  TABLES.forEach(({ x, z }, i) => {
    for (let mark = 0; mark < 2; mark++)
      kit.box('#b0a48c', 0.16 + mark * 0.09, 0.001, 0.008, x - 0.6 + mark * 0.32, 0.601, z + (i % 2 ? 0.23 : -0.26), {
        ry: 0.05 + i * 0.015,
        cast: false,
      });
    if (i === 0 || i === 5) kit.box('#cfbea0', 0.21, 0.003, 0.018, x + 0.55, 0.6, z + 0.39, { cast: false });
  });
  // Actual storage panels under the hot wells: hinges, pull handles and a kick plate.
  for (let x = -7.5; x < 2.8; x += 1.2) {
    kit.box('#426d69', 0.018, 0.46, 0.009, x, 0.08, COUNTER.z + COUNTER.d / 2 + 0.006, { cast: false });
    kit.box('#a2b4ad', 0.12, 0.025, 0.035, x + 0.17, 0.44, COUNTER.z + COUNTER.d / 2 + 0.023, { surf: 'metal' });
  }
  kit.box('#526760', COUNTER.w, 0.075, 0.012, COUNTER.x, 0.035, COUNTER.z + COUNTER.d / 2 + 0.009, { surf: 'metal' });
  for (const i of [1, 3, 5, 7]) {
    const t = TABLES[i],
      x = t.x + 0.3,
      z = t.z;
    kit.box('#a8b9b3', 0.15, 0.07, 0.12, x, 0.6, z, { surf: 'plastic' });
    for (let j = 0; j < 4; j++) kit.box('#d6bd8d', 0.007, 0.17, 0.007, x - 0.04 + j * 0.025, 0.65, z, { ry: 0.1 });
    kit.cyl('#795744', 0.035, 0.032, 0.075, x + 0.16, 0.6, z, { surf: 'ceramic' });
    kit.cyl('#d4dad0', 0.037, 0.037, 0.018, x + 0.16, 0.675, z, { surf: 'metal' });
  }
}
