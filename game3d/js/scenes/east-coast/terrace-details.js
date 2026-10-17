// Fitted finishes on the existing terrace. All positions use the island frame;
// the walls, cabinets, trees and walking/seat anchors remain with their builders.
import { plane } from '../../props.js';
import { drinksFace } from '../outdoor/vending-face.js';
import { mound } from '../outdoor/planting.js';

const STONE = ['#959b9d', '#a2a6a5', '#919799', '#9b9f9d'];
const FINISH = { cast: false, surf: 'stone' };

// Small stone panels fit over the existing wall face; genuine joints remain between them.
function facing(p, a, b, h, inward = 1) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    length = Math.hypot(dx, dz);
  const ux = dx / length,
    uz = dz / length,
    n = Math.ceil(length / 0.68),
    span = length / n;
  const ry = Math.atan2(-uz, ux);
  for (let i = 0; i < n; i++) {
    const x = a[0] + ux * (i + 0.5) * span,
      z = a[1] + uz * (i + 0.5) * span;
    p.box(STONE[i % STONE.length], span - 0.016, h - 0.07, 0.008, x, 0.014, z, {
      ...FINISH,
      ry,
    });
    // Cap joints stop at the existing coping edges, without raising the wall.
    if (i)
      p.box(
        '#7d8588',
        0.012,
        0.004,
        0.27,
        a[0] + ux * i * span - uz * inward * 0.11,
        h - 0.001,
        a[1] + uz * i * span + ux * inward * 0.11,
        { ...FINISH, ry },
      );
  }
}

// Recessed-looking channel with broad grate bars; no subpixel cross-hatch texture.
export function drain(p, a, b, width = 0.16) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    length = Math.hypot(dx, dz);
  const ry = Math.atan2(-dz, dx),
    n = Math.floor(length / 0.16);
  p.box('#555f64', length, 0.006, width, (a[0] + b[0]) / 2, 0.011, (a[1] + b[1]) / 2, { cast: false, ry });
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    p.box('#899093', 0.032, 0.006, width - 0.018, a[0] + dx * t, 0.017, a[1] + dz * t, { cast: false, ry });
  }
}

// a drinks machine facing +z: its housing in `color`, its lit front from the shared face (the beach plaza's pair
// take a second colour, dorm-quarter/promenade.js)
export function terraceVending(root, p, x, z, { color = '#3f6f9e', seed = 4 } = {}) {
  p.box(color, 0.75, 1.8, 0.65, x, 0, z);
  p.box('#283d50', 0.65, 0.08, 0.61, x, 0, z, { cast: false });
  const face = plane(0.69, 1.65, drinksFace(color, seed), { emissiveK: 0.42 });
  face.name = 'coast-vending-display';
  face.position.set(x, 0.92, z + 0.329);
  face.userData.noLook = true;
  root.add(face);
  // A separate coin lip and dispensing sill give the existing painted face depth.
  p.box('#b7bec1', 0.19, 0.025, 0.025, x + 0.18, 0.59, z + 0.339, {
    cast: false,
  });
  p.box('#243541', 0.52, 0.045, 0.04, x, 0.23, z + 0.338, { cast: false });
}

export function terraceDetails(p, [x0, x1, z0, z1], [bx0, bx1, bz0, bz1]) {
  facing(p, [x0, z1 + 0.004], [x1, z1 + 0.004], 0.38, -1);
  facing(p, [x1, z1 - 0.224], [x0, z1 - 0.224], 0.38, -1);
  // Planter panels and cap joints on all four faces, with plants kept inside the rim.
  for (const [a, b] of [
    [
      [bx0 - 0.004, bz0],
      [bx0 - 0.004, bz1],
    ],
    [
      [bx0, bz1 + 0.004],
      [bx1, bz1 + 0.004],
    ],
    [
      [bx1 + 0.004, bz1],
      [bx1 + 0.004, bz0],
    ],
    [
      [bx1, bz0 - 0.004],
      [bx0, bz0 - 0.004],
    ],
  ])
    facing(p, a, b, 0.45, -1);
  const cx = (bx0 + bx1) / 2,
    cz = (bz0 + bz1) / 2;
  for (const [dx, dz, r, color] of [
    [-0.57, -0.34, 0.19, '#66795b'],
    [0.47, -0.32, 0.25, '#738161'],
    [-0.5, 0.37, 0.22, '#7e8867'],
    [0.51, 0.32, 0.19, '#697c60'],
  ])
    mound(p, cx + dx, cz + dz, r, color, { y: 0.43, squash: 0.3 });
  drain(p, [x0 + 0.14, z0 + 0.28], [x1 - 0.25, z0 + 0.28]);
}
