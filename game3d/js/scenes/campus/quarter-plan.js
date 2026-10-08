// Island coordinates shared by both sides of the quarter-street seam and the map.
import { CAMPUS_TREES, insideGarden } from './landscape-plan.js';
export const QUARTER_TREES = [
  ['maple', -1.64, -42.05, 1.14, 119],
  ['sakura', -2.18, -39.05, 0.9, 120],
  // The old BANK_LAWN root at (5.3,-43.2) occupied the street. Its seed and size survive here.
  ['sakura', 7.7, -43.2, 0.98, 377],
  ['keyaki', 8.4, -42.84, 1.06, 378],
  CAMPUS_TREES.find((tree) => tree[4] === 838),
];
export const BANK_FOUNDATIONS = [
  [-7.62, -50.3, -7.1, -44.97],
  [-7.1, -45.5, 2.5, -44.97],
];
export const BANK_APRON_DRAIN = [2.5, -45.5, 2.82, -45.28];
const beds = [
  {
    id: 'quarter-west',
    seed: 961,
    poly: [
      [-3.95, -44.78],
      [2.65, -44.78],
      [2.65, -29.2],
      [1.65, -28.55],
      [0.75, -29.4],
      [0.4, -33.5],
      [-0.9, -35.3],
      [-3.4, -37.1],
      [-3.95, -41.3],
    ],
    masses: [
      [-2.7, -43.3, 0.64],
      [-1.8, -40.9, 0.65],
      [-1.6, -38, 0.6],
      [0.4, -35.1, 0.48],
      [1.5, -30.4, 0.42],
    ],
    grasses: [
      [1.8, -43.5],
      [1.9, -40.6],
      [1.7, -37.3],
      [1.3, -33.7],
      [1.7, -29.9],
    ],
    gaps: [
      [0.6, -37.3, 0.48],
      [-1.64, -42.05, 0.35],
      [-2.18, -39.05, 0.35],
    ],
  },
  {
    id: 'quarter-east',
    seed: 962,
    poly: [
      [6.35, -45.35],
      [8.6, -45.35],
      [10.5, -44.8],
      [10.1, -41.5],
      [8.5, -40.4],
      [8.4, -34.4],
      [9.6, -33.35],
      [6.35, -33.35],
    ],
    masses: [
      [9.4, -44.3, 0.6],
      [9.4, -42.1, 0.58],
      [7.85, -39.8, 0.5],
      [7.8, -35.2, 0.52],
    ],
    grasses: [
      [7.4, -45.1],
      [6.95, -41.3],
      [7.2, -37.3],
      [7.7, -34.2],
    ],
    gaps: [
      [7.7, -43.2, 0.4],
      [8.4, -42.84, 0.4],
      [7, -38.5, 0.65],
    ],
  },
  {
    id: 'quarter-junction',
    seed: 963,
    poly: [
      [6.35, -29.65],
      [9.9, -29.65],
      [9.2, -28.5],
      [7.6, -28.2],
      [6.35, -28.65],
    ],
    masses: [[8.65, -29.05, 0.4]],
    grasses: [[7.2, -29.1]],
    gaps: [],
  },
];

// Small rounded corners retain the straight street edge and all authored clearances.
function roundCorners(poly) {
  return poly.flatMap((b, i) => {
    const a = poly[(i + poly.length - 1) % poly.length],
      c = poly[(i + 1) % poly.length];
    const inset = (p) => {
      const t = Math.min(0.5 / Math.hypot(p[0] - b[0], p[1] - b[1]), 0.18);
      return [b[0] + (p[0] - b[0]) * t, b[1] + (p[1] - b[1]) * t];
    };
    const p = inset(a),
      q = inset(c);
    return [0, 0.33, 0.67, 1].map((t) => [
      (1 - t) ** 2 * p[0] + 2 * (1 - t) * t * b[0] + t * t * q[0],
      (1 - t) ** 2 * p[1] + 2 * (1 - t) * t * b[1] + t * t * q[1],
    ]);
  });
}
export const QUARTER_BEDS = beds.map((bed) => ({ ...bed, poly: roundCorners(bed.poly) }));

// Seeded overlapping cover has no planted rows; every full radius remains within its soil outline.
export function quarterCover(bed) {
  let state = bed.seed;
  const random = () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
  const xs = bed.poly.map((p) => p[0]),
    zs = bed.poly.map((p) => p[1]),
    x0 = Math.min(...xs),
    z0 = Math.min(...zs),
    w = Math.max(...xs) - x0,
    h = Math.max(...zs) - z0,
    points = [];
  for (let i = 0; i < w * h * 30; i++) {
    const x = x0 + random() * w,
      z = z0 + random() * h,
      r = 0.4 + random() * 0.23;
    if (points.some((p) => Math.hypot(x - p.x, z - p.z) < 0.55)) continue;
    if (bed.gaps.some(([a, b, c]) => Math.hypot(x - a, z - b) < c + r * 1.04)) continue;
    if (
      !insideGarden(bed.poly, x, z) ||
      bed.poly.some((a, i) => edgeDistance(x, z, a, bed.poly[(i + 1) % bed.poly.length]) < r * 1.04)
    )
      continue;
    points.push({ x, z, r });
  }
  return points;
}

function edgeDistance(x, z, a, b) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
}
