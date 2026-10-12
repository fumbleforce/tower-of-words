// Eric's exterior roof follows the playable roof's stair head, tank, washing and
// planting positions. It carries only the shapes visible from the court and lane.
import { apartmentDeck, apartmentServices } from './roofs.js';
import { copedParapet } from '../outdoor/block-style.js';
import { faces } from '../outdoor/block-face.js';
import { DORMS } from './plan.js';

export function exteriorRoof(p, B, { detail = true } = {}) {
  const y = B.ground + B.floors * B.floor,
    front = B.z + B.corridor,
    long = [B.x0, B.rx, B.back, front],
    ret = [B.rx, B.x1, B.back, B.rz];
  apartmentDeck(p, long, y, { edges: 'nsw', seams: detail });
  apartmentDeck(p, ret, y, { edges: 'nse', seams: detail });
  copedParapet(p, faces([B.rx, B.x1, front, B.rz]).w, y, '#9da1a6');
  // Same offset as dorms/layout.js: its own floor origin sits behind the gallery.
  const x = DORMS.x,
    z = DORMS.z,
    stair = [B.rx, B.rx + 1.95, z + 0.25, z + 4.65];
  apartmentServices(p, y, {
    stair,
    doorZ: z + 1.45,
    tank: [x + 4.3, z - 1.75],
    units: Array.from({ length: 4 }, (_, i) => [x - 1.4 + i * 0.85, B.back + 0.45]),
    vents: [
      [x - 8.85, z - 0.35],
      [x + 0.35, z - 0.35],
      [x + 2.65, z - 0.35],
    ],
    detail,
  });
  // A low service tray joins the condensers to the stair house, away from the walk.
  p.box('#b8bcba', B.rx - x - 1.5, 0.07, 0.09, (x + 1.5 + B.rx) / 2, y + 0.025, B.back + 0.18, { cast: false });
  p.box('#8d939b', 0.7, 0.22, 0.7, x + 1.6, y + 0.025, z + 0.75);
  p.box('#b3bec3', 0.75, 0.04, 0.75, x + 1.6, y + 0.245, z + 0.75, {
    cast: false,
  });
  // T-poles, a sheet and towels, kept west of the clear path to the stair door.
  const [wx0, wx1, wz] = [x - 6.5, x - 3, z - 1];
  for (const xx of [wx0, wx1]) {
    p.box('#87949d', 0.05, 1.15, 0.05, xx, y + 0.025, wz);
    p.box('#87949d', 0.04, 0.04, 0.7, xx, y + 1.145, wz, { cast: false });
  }
  for (const dz of [-0.3, 0.3])
    p.box('#c9cdd2', wx1 - wx0, 0.012, 0.012, (wx0 + wx1) / 2, y + 1.155, wz + dz, { cast: false });
  for (const [col, w, h, xx, zz] of [
    ['#e4e4df', 1.0, 0.8, x - 5.6, wz - 0.3],
    ['#a9bcd6', 0.4, 0.55, x - 4.4, wz - 0.3],
    ['#c96a5a', 0.35, 0.5, x - 3.7, wz + 0.3],
  ])
    p.box(col, w, h, 0.025, xx, y + 1.155 - h, zz, { cast: false });
  // The planter boxes and blue chairs are the roof's recognisable domestic corner.
  for (let i = 0; i < 5; i++) {
    const xx = x - 8.6 + i * 0.62;
    p.box('#e4e9e7', 0.55, 0.22, 0.32, xx, y + 0.025, front - 0.32);
    p.box('#506b54', 0.43, 0.12 + (i % 2) * 0.08, 0.25, xx, y + 0.245, front - 0.32, { cast: false });
    if (detail)
      p.box('#b6c1a7', 0.015, 0.5, 0.015, xx + 0.12, y + 0.245, front - 0.32, {
        cast: false,
      });
  }
  for (const dx of [-0.45, 0.45]) {
    p.box('#596976', 0.3, 0.26, 0.26, x - 9.3 + dx, y + 0.025, z - 1.25);
    p.box('#3f6f9e', 0.32, 0.03, 0.3, x - 9.3 + dx, y + 0.285, z - 1.25);
    p.box('#3f6f9e', 0.32, 0.3, 0.03, x - 9.3 + dx, y + 0.315, z - 1.4);
  }
  // Two drains discharge to attached stacks, never through the open gallery.
  for (const xx of [B.x0 + 0.18, B.x1 - 0.18]) {
    p.box('#647581', 0.08, y - 0.15, 0.08, xx, 0.05, B.back - 0.045, {
      cast: false,
    });
    p.box('#4b565e', 0.18, 0.16, 0.14, xx, y - 0.18, B.back - 0.055, {
      cast: false,
    });
  }
}
