// Island coordinates, shared by the physical grounds and map. Existing trees keep their positions/seeds.
export const CAMPUS_TREES = [
  ['pine', -37.3, -40.2, 1.1, 830],
  ['pine', -39.4, -36.9, 0.9, 831],
  ['sakura', -33.2, -36.7, 1.05, 832],
  ['keyaki', -27.9, -31.1, 1.15, 833],
  ['keyaki', -24, -36.4, 0.95, 834],
  ['sakura', -11.8, -36.2, 1.1, 835],
  ['keyaki', -8.9, -42.1, 0.95, 836],
  ['keyaki', -3.4, -27.4, 1, 837],
  ['sakura', 0.6, -37.3, 0.85, 838],
];
const gardens = [
  {
    id: 'coastal-drift',
    poly: [
      [-48, -37],
      [-45, -37.7],
      [-44.3, -36.2],
      [-44.3, -33.1],
      [-45, -30.1],
      [-47.2, -28.5],
      [-48.7, -29.7],
      [-47.3, -33.2],
    ],
    seed: 950,
    gaps: [
      [-45.85, -34.9, 0.48],
      [-46.1, -31.6, 0.42],
    ],
    grasses: [
      [-45.6, -35.7],
      [-46.3, -32.9],
      [-47.45, -29.8],
    ],
    masses: [
      [-46.6, -35.4, 0.8],
      [-45.4, -32.8, 0.72],
      [-47.1, -30.3, 0.85],
    ],
  },
  {
    id: 'harbour-pines',
    poly: [
      [-40.15, -40.9],
      [-37, -41.15],
      [-35.65, -39.6],
      [-36.3, -37.95],
      [-38, -35.2],
      [-40.1, -34.2],
    ],
    seed: 951,
    gaps: [[-38.4, -37.4, 0.38]],
    grasses: [
      [-39.1, -39.7],
      [-38.5, -36.3],
    ],
    masses: [
      [-38.3, -39.5, 0.75],
      [-37.5, -37.95, 0.7],
      [-39, -35.65, 0.6],
    ],
  },
  {
    id: 'rest-garden-east',
    poly: [
      [-34.15, -35.9],
      [-32.6, -38.3],
      [-30.7, -37.5],
      [-31.4, -34.8],
      [-32.8, -32.2],
      [-33.5, -29.7],
      [-34.15, -29.7],
    ],
    seed: 952,
    gaps: [[-32.35, -36, 0.35]],
    grasses: [
      [-32, -37.2],
      [-33.1, -33.1],
    ],
    masses: [
      [-32.5, -36.8, 0.7],
      [-32.9, -34.8, 0.62],
      [-33.4, -31.4, 0.48],
    ],
  },
  {
    id: 'rest-garden-south',
    poly: [
      [-39.3, -29.6],
      [-35.1, -29.6],
      [-34.6, -28.7],
      [-36, -27.85],
      [-39.5, -28.3],
    ],
    seed: 953,
    gaps: [],
    grasses: [[-37, -28.8]],
    masses: [
      [-38, -28.8, 0.48],
      [-36.1, -28.8, 0.48],
    ],
  },
];
// Round each corner inward; world and map share these exact, gently curved outlines.
function plantedOutline(points) {
  for (let pass = 0; pass < 2; pass++)
    points = points.flatMap((a, i) => {
      const b = points[(i + 1) % points.length];
      return [
        [a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25],
        [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75],
      ];
    });
  return points;
}
export const CAMPUS_GARDENS = gardens.map((g) => ({ ...g, poly: plantedOutline(g.poly) }));
export const PRINT_SERVICE_PAD = [-31, -40.99, -25.95, -39.72];
export const SERVICE_PAD_TOP = 0.025;

// These are real level paving extensions at the doorway; no fictional map-only roads.
export const PRINT_APRONS = [
  {
    id: 'print_arrival_n',
    kind: 'plaza',
    rect: [-24.3, -45.25, -21.6, -44.1],
    detail: 'Level north side of the print-shop entrance apron.',
  },
  {
    id: 'print_arrival_s',
    kind: 'plaza',
    rect: [-24.3, -42.5, -21.6, -41.05],
    detail: 'Level south side of the print-shop entrance apron.',
  },
];
export const PRINT_FOUNDATIONS = [
  [-34, -45.7, -24.3, -45.22],
  [-34, -41.38, -24.3, -40.82],
  [-34.5, -45.7, -34.02, -40.82],
];
// Fixed physical objects outside all walkable paving, also used by builder clearance tests.
export const CAMPUS_DETAILS = {
  printStore: [-27.3, -40.35, 2.3, 0.85],
  returnCart: [-30.1, -40.35, 1.15, 0.72],
};
export function insideGarden(poly, x, z) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [a, b] = poly[i],
      [c, d] = poly[j];
    if (b > z !== d > z && x < ((c - a) * (z - b)) / (d - b) + a) inside = !inside;
  }
  return inside;
}
// A few authored masses, joined by lower overlapping cover instead of isolated equally sized bushes.
export function gardenPlants(garden) {
  return garden.masses.map(([x, z, r]) => ({ x, z, r }));
}
export function gardenCover(garden) {
  let state = garden.seed;
  const random = () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
  const xs = garden.poly.map((p) => p[0]),
    zs = garden.poly.map((p) => p[1]),
    result = [];
  for (let x = Math.min(...xs) + 0.25; x < Math.max(...xs); x += 0.48)
    for (let z = Math.min(...zs) + 0.25; z < Math.max(...zs); z += 0.48) {
      const px = x + (random() - 0.5) * 0.16,
        pz = z + (random() - 0.5) * 0.16,
        r = 0.34 + random() * 0.09;
      if (garden.gaps.some(([x, z, r]) => Math.hypot(px - x, pz - z) < r)) continue;
      if (
        Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4;
          return insideGarden(garden.poly, px + Math.cos(a) * r, pz + Math.sin(a) * r);
        }).every(Boolean)
      )
        result.push({ x: px, z: pz, r });
    }
  return result;
}
