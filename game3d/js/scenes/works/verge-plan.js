// Island coordinates. The eight trees retain seed 505's original belt roots, species and scale.
export const EAST_TREES = [
  ['keyaki', -43.41, -88.2, 0.98, 505],
  ['ginkgo', -43.05, -84.55, 1.06, 506],
  ['sakura', -42.69, -81.65, 1.14, 507],
  ['keyaki', -43.23, -78, 0.9, 508],
  ['ginkgo', -42.87, -75.1, 0.98, 509],
  ['sakura', -43.41, -72.2, 1.06, 510],
  ['keyaki', -43.05, -68.55, 1.14, 511],
  ['ginkgo', -42.69, -65.65, 0.9, 512],
];

// Connected soil, inside the old bed's envelope; its edges bend around the planted groups.
export const EAST_SOIL = [
  [-45.4, -89.8],
  [-41.1, -89.8],
  [-40.3, -87.2],
  [-40.7, -83.8],
  [-40.2, -80.7],
  [-40.8, -77.2],
  [-40.3, -73.2],
  [-40.8, -69.5],
  [-40.4, -66.1],
  [-41.1, -64.2],
  [-45.2, -64.2],
  [-45.8, -66.8],
  [-45.3, -70.1],
  [-45.9, -73.6],
  [-45.4, -77.1],
  [-45.8, -80.8],
  [-45.3, -84.2],
  [-45.9, -87.1],
];
export const EAST_GROUPS = [-86.8, -80, -73.2, -66.8];
export const WEST_BEDS = [
  [-51.9, -50.65, -89, -84],
  [-51.9, -50.65, -77.9, -73],
  [-51.9, -50.65, -69.5, -65],
];
export const POLES = [-83, -72].map((z) => [-51.2, z]);
export const GATE = [-82, -78.4];

export function clearOfServices(x, z, radius = 0) {
  return (
    (z + radius < GATE[0] || z - radius > GATE[1]) &&
    POLES.every(([px, pz]) => Math.hypot(x - px, z - pz) >= 0.65 + radius)
  );
}
