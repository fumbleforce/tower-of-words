// The dorm cluster's paths and green round the inner court, east of the dorm courtyard, in the island frame:
// scenes/island-layout.js spreads them into PATHS and GREEN, scenes/dorm-court/cluster.js builds them. On the lane's
// grid like the east lane (scenes/island-east.js). The coastal garden's paths and lawn use these same footprints
// for the map, the shared landscape builder and east_coast's navigation.
export const COAST_GARDEN = {
  pergola: [86.1, 92.8, 16.6, 19.6],
  entry: [88.7, 90.2, 12, 16.6],
  paths: [
    [92.8, 95.7, 17, 18.8],
    [93.9, 95.7, 18.8, 24.8],
    [95.7, 117, 23, 24.8],
    [117, 118.8, 12, 24.8],
    [104, 111, 24.8, 28.8],
  ],
  lawns: [
    [96.3, 116.8, 21, 23],
    [96.3, 104, 24.8, 28.8],
  ],
  benches: [
    [105.1, 27.7, 0],
    [109.9, 27.7, 0],
  ],
  lamps: [
    [95.35, 20.6],
    [102.3, 23.3],
    [111.9, 24.5],
    [118.45, 18.6],
  ],
  stones: [
    [97.8, 26.7, 0.16],
    [99.1, 26.7, 0.28],
    [100.4, 26.7, 0.42],
    [101.7, 26.7, 0.28],
    [103, 26.7, 0.16],
  ],
};
export const DORM_PATHS = [
  {
    id: 'dorm_row',
    kind: 'lane',
    rect: [76.04, 9, 109, 12],
    detail:
      'The dorm cluster’s street: east off the dorm street just south of the courtyard’s gate, along the south end of Eric’s block and the inner court, past dorm_2’s door, into the square at dorm_3’s door.',
  },
  {
    id: 'row_square',
    kind: 'court',
    rect: [109, 8.4, 119.5, 12],
    detail: 'The square at the dorm row’s east end, the row widened to dorm_3’s south face, at its main door.',
  },
  {
    id: 'sea_walk',
    kind: 'walk',
    rect: [119.5, 9.45, 124, 10.95],
    detail: 'On east out of the square on the row’s axis, between two beds, to the sea terrace.',
  },
  {
    id: 'sea_terrace',
    kind: 'court',
    rect: [124, 8, 129, 13],
    detail: 'A paved terrace at the cluster’s east end with benches looking south over the coast pines to the sea.',
  },
  {
    id: 'court_walk_ns',
    kind: 'walk',
    rect: [100.15, 2.1, 101.65, 13.4],
    detail: 'Through the inner court on dorm_gallery’s door axis, over the dorm row to dorm_2’s door.',
  },
  {
    id: 'court_walk_ew',
    kind: 'walk',
    rect: [94.2, 4.75, 109, 6.25],
    detail: 'Across the inner court from dorm_1e’s door to dorm_3’s; the two walks cross at a square in its middle.',
  },
  {
    id: 'court_link',
    kind: 'walk',
    rect: [107.5, -5.4, 109, 4.75],
    detail: 'North out of the inner court along dorm_3’s west face, past dorm_gallery’s east end, to the back walk.',
  },
  {
    id: 'back_walk',
    kind: 'walk',
    rect: [98.5, -6.9, 116.3, -5.4],
    detail: 'Behind dorm_gallery: from the foot of dorm_entry’s walk east past the court link to dorm_4’s door.',
  },
  {
    id: 'entry_walk',
    kind: 'walk',
    rect: [98.5, -9.4, 100, -6.9],
    detail: 'From dorm_entry’s door south to the back walk.',
  },
  ...[COAST_GARDEN.entry, COAST_GARDEN.pergola, ...COAST_GARDEN.paths].map(([x0, x1, z0, z1], i) => ({
    id: `coast_garden_${i}`,
    kind: i === 1 || i === 6 ? 'court' : 'walk',
    rect: [x0, z0, x1, z1],
    detail:
      'The dorm garden loop through the pergola, along the southern lawn and sea-facing rest court, back to the row square.',
  })),
];
export const DORM_GREEN = [
  {
    id: 'dorm_inner_court',
    rect: [94.2, 2.1, 109, 9],
    detail:
      'The inner court between the dorm blocks: four lawns round a paved square with a maple, hedged on the street.',
  },
  {
    id: 'dorm_row_garden',
    rect: [82, 12, 96.9, 20],
    detail: 'Lawn and trees on the dorm row’s south side, between the ramen shop and dorm_2.',
  },
  ...COAST_GARDEN.lawns.map(([x0, x1, z0, z1], i) => ({
    id: `coast_garden_lawn_${i}`,
    rect: [x0, z0, x1, z1],
    detail: 'Open coastal lawn for recreation, with low stone stepping blocks and clear sea views.',
  })),
];
