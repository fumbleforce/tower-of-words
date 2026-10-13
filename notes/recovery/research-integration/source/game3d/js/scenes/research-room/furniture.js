import { Kit } from '../dorms/kit.js';
import { SEATS, READER } from './plan.js';
function chair(k, x, z, yaw) {
  const sin = Math.sin(yaw),
    cos = Math.cos(yaw);
  const at = (a, b) => [x + a * cos + b * sin, z - a * sin + b * cos];
  for (const a of [-0.2, 0.2])
    for (const b of [-0.19, 0.19]) {
      const [xx, zz] = at(a, b);
      k.box('#576c70', 0.045, 0.275, 0.045, xx, 0, zz);
    }
  k.box('#426d80', 0.49, 0.05, 0.46, x, 0.25, z, { ry: yaw, r: 0.02, surf: 'fabric' });
  const [sx, sz] = at(0, -0.185);
  k.box('#658596', 0.4, 0.004, 0.006, sx, 0.39, sz, { ry: yaw, surf: 'fabric', cast: false });
  const [bx, bz] = at(0, -0.22);
  k.box('#426d80', 0.48, 0.29, 0.055, bx, 0.33, bz, { ry: yaw, r: 0.015, surf: 'fabric' });
}
function table(k, x, z, w, d) {
  k.box('#dcc398', w, 0.055, d, x, 0.58, z, { r: 0.015, surf: 'laminate' });
  for (const edge of [-1, 1])
    k.box('#b59a72', w - 0.035, 0.012, 0.008, x, 0.586, z + edge * (d / 2 - 0.008), { surf: 'laminate', cast: false });
  for (const dx of [-w / 2 + 0.1, w / 2 - 0.1])
    for (const dz of [-d / 2 + 0.09, d / 2 - 0.09])
      k.box('#6c6253', 0.055, 0.58, 0.055, x + dx, 0, z + dz, { surf: 'metal' });
  k.box('#bda070', w - 0.2, 0.1, 0.035, x, 0.46, z + d / 2 - 0.1, { surf: 'laminate' });
}
export function furniture(root) {
  const k = new Kit();
  table(k, -0.5, -1.6, 2.65, 0.84);
  table(k, 2.6, -2.56, 0.98, 1.47);
  for (const s of [...Object.values(SEATS), READER]) chair(k, s.x, s.z, s.ry);
  // Shelves sit against the staff partition, with a low display ledge facing the aisle.
  for (const z of [-2.7, -1.15, 0.4]) k.box('#b39a72', 0.38, 1.55, 0.055, 3.72, 0, z, { surf: 'laminate' });
  for (const y of [0.16, 0.65, 1.13, 1.55]) k.box('#d0b588', 0.56, 0.045, 3.15, 3.67, y, -1.15, { surf: 'laminate' });
  k.box('#b79b72', 0.04, 1.55, 3.15, 3.94, 0, -1.15, { surf: 'laminate' });
  const colors = ['#426e91', '#a55747', '#d0ad57', '#688663', '#73638b'];
  for (let row = 0; row < 2; row++)
    for (let j = 0; j < 17; j++) {
      if (j % 7 === 5) continue;
      const z = -2.52 + j * 0.155,
        h = 0.25 + (j % 4) * 0.025;
      k.box(colors[(j + row) % colors.length], 0.22, h, 0.105, 3.6, 0.21 + row * 0.97, z, { surf: 'card', r: 0.004 });
      k.box('#d7cfb9', 0.004, 0.045, 0.08, 3.486, 0.24 + row * 0.97, z, { surf: 'card', cast: false });
    }
  k.box('#dcc398', 0.75, 0.055, 1.7, 3.27, 0.59, -0.6, { surf: 'laminate', r: 0.01 });
  for (const x of [-2.68, 0.3]) k.box('#b49a72', 0.055, 0.55, 0.43, x, 0, 3.06, { surf: 'laminate' });
  for (const y of [0.12, 0.53]) k.box('#d0b588', 3.1, 0.045, 0.47, -1.18, y, 3.06, { surf: 'laminate' });
  for (let i = 0; i < 5; i++) k.box(colors[i], 0.34, 0.035, 0.26, -2.1 + i * 0.4, 0.575, 3.07, { surf: 'card' });
  // The reader's notebook and pencil remain their own working material.
  k.box('#6b776b', 0.42, 0.025, 0.29, 0.05, 0.638, -1.84, { surf: 'card' });
  k.box('#ece5d0', 0.38, 0.007, 0.255, 0.05, 0.663, -1.84, { surf: 'card' });
  k.box('#aa8258', 0.012, 0.012, 0.23, 0.32, 0.64, -1.78, { surf: 'laminate', ry: 0.4 });
  for (const [x, z] of [
    [-1.13, -1.8],
    [2.66, -2.04],
  ]) {
    k.cyl('#526e66', 0.11, 0.14, 0.025, x, 0.638, z, { surf: 'metal' });
    k.box('#536c64', 0.025, 0.36, 0.025, x, 0.66, z, { surf: 'metal' });
    k.box('#3c6c63', 0.34, 0.07, 0.17, x, 0.99, z, { r: 0.02, surf: 'metal' });
    k.box('#efe1ad', 0.27, 0.008, 0.13, x, 0.987, z, { cast: false });
  }
  k.flush(root);
}
