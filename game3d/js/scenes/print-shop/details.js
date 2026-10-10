import * as THREE from 'three';
import { pinboard } from '../rooms/machines.js';
const metal = { surf: 'metal' },
  paper = { surf: 'card' };
const roller = (k, x, y, z, length, radius, color = '#344448') =>
  k.add(color, new THREE.CylinderGeometry(radius, radius, length, 12).rotateZ(Math.PI / 2).translate(x, y, z), metal);
export function copierDetails(k) {
  // Hinged document feeder over the glass, with two rubber feed rollers and adjustable paper guides.
  k.box('#d0d6cf', 0.72, 0.055, 0.3, -1.18, 0.79, -3.48, { r: 0.025, surf: 'plastic' });
  for (const z of [-3.47, -3.34]) roller(k, -1.13, 0.845, z, 0.51, 0.026);
  for (const x of [-1.37, -0.88]) k.box('#8caaa2', 0.022, 0.035, 0.3, x, 0.81, -3.3, metal);
  for (const z of [-3.47, -3.0]) {
    k.box('#8caaa2', 0.012, 0.23, 0.012, -0.647, 0.14, z, metal);
    k.box('#869791', 0.032, 0.036, 0.34, -0.629, 0.37, z + 0.2, { r: 0.008, surf: 'plastic' });
  }
  for (const y of [0.13, 0.36]) k.box('#869791', 0.008, 0.006, 0.73, -0.65, y, -3.2, metal);
  k.box('#263c42', 0.02, 0.085, 0.48, -0.65, 0.51, -3.14, metal);
  for (const z of [-3.39, -2.88]) k.box('#40585c', 0.28, 0.045, 0.025, -0.51, 0.48, z, metal);
  // Readable status screen and tactile Start/Cancel keys on the angled control island.
  k.box('#263c42', 0.26, 0.012, 0.155, -0.57, 0.718, -2.96, { r: 0.006 });
  k.box('#a9cbc1', 0.13, 0.004, 0.095, -0.625, 0.732, -2.97, {
    opts: { emissive: '#628c7a', emissiveIntensity: 0.24 },
  });
  for (const z of [-2.99, -2.95]) k.box('#426869', 0.095, 0.003, 0.007, -0.625, 0.737, z);
  k.cyl('#709b7e', 0.022, 0.022, 0.012, -0.48, 0.73, -2.98);
  k.cyl('#b5625d', 0.016, 0.016, 0.01, -0.48, 0.73, -2.91);
  for (let i = 0; i < 5; i++) k.box('#869791', 0.008, 0.024, 0.12, -0.65, 0.19 + i * 0.031, -3.51);
}
export function pressDetails(k) {
  // Roller covers, bearing ends, front control strip and the stock delivery guides.
  for (const x of [-0.62, 0.5]) {
    roller(k, x, 0.91, -8.16, 0.68, 0.1, '#b9c3b9');
    for (const dx of [-0.39, 0.39]) {
      k.box('#8caaa2', 0.065, 0.5, 0.82, x + dx, 0.6, -8.4, { r: 0.024, ...metal });
      roller(k, x + dx, 0.92, -8.16, 0.075, 0.13, '#40585c');
    }
    for (let i = 0; i < 4; i++) k.box('#263c42', 0.43, 0.015, 0.01, x, 0.32 + i * 0.055, -7.824);
  }
  k.box('#263c42', 0.72, 0.09, 0.025, -0.47, 0.55, -7.81);
  k.box('#a9cbc1', 0.21, 0.053, 0.008, -0.65, 0.568, -7.79);
  for (let i = 0; i < 3; i++)
    k.box(['#709b7e', '#d5b559', '#b5625d'][i], 0.043, 0.043, 0.01, -0.39 + i * 0.09, 0.574, -7.79);
  for (const z of [-8.13, -7.56]) k.box('#647c7c', 0.76, 0.045, 0.025, 1.06, 0.64, z, metal);
}
export function paperStock(k) {
  for (const [bay, z] of [-4.8, -5.8, -6.8].entries()) {
    for (const y of [0.14, 0.56, 1.03, 1.5]) k.box('#667a76', 0.5, 0.04, 0.86, -1.45, y, z, metal);
    for (const side of [-0.42, 0.42]) k.box('#667a76', 0.025, 1.52, 0.025, -1.2, 0.05, z + side, metal);
    for (const [level, y] of [0.2, 0.62, 1.09].entries()) {
      if ((bay + level) % 3 === 0) {
        k.box('#b59a73', 0.36, 0.23, 0.4, -1.42, y, z - 0.16, paper);
        k.box('#d5c4a6', 0.375, 0.015, 0.11, -1.42, y + 0.23, z - 0.16, paper);
        k.box('#eee8d7', 0.006, 0.075, 0.19, -1.233, y + 0.07, z - 0.16, paper);
      }
      const count = 2 + ((bay + level) % 3),
        zz = z + 0.2;
      for (let n = 0; n < count; n++) {
        k.box('#eee8d7', 0.37, 0.058, 0.29, -1.42, y + n * 0.061, zz, paper);
        k.box(
          ['#8caaa2', '#b5625d', '#d5b559'][(bay + level) % 3],
          0.375,
          0.013,
          0.08,
          -1.42,
          y + n * 0.061 + 0.025,
          zz,
          paper,
        );
      }
      if ((bay + level) % 3 !== 0)
        for (let n = 0; n < 4; n++)
          k.box(
            ['#cad4c1', '#d8c1aa', '#adbec9', '#eee8d7'][n],
            0.37,
            0.023,
            0.33,
            -1.42,
            y + n * 0.026,
            z - 0.18,
            paper,
          );
    }
  }
  // Small job slips and a colour proof on the existing work surface, not a new quest notice.
  pinboard(k, 1.65, 1.1, -5.65, -Math.PI / 2, 0.85, 0.32, ['#eee8d7', '#cad4c1']);
  for (const z of [-6.3, -6]) {
    for (let n = 0; n < 3; n++) k.box('#8caaa2', 0.29, 0.004, 0.006, 1.26, 0.775, z + 0.025 * n, paper);
  }
}
