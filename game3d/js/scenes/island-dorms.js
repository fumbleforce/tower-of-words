// The dorm cluster's paths and green round the inner court, east of the dorm courtyard, in the island frame:
// scenes/island-layout.js spreads them into PATHS and GREEN, scenes/dorm-court/cluster.js builds them. On the lane's
// grid like the east lane (scenes/island-east.js): the street 3 wide, walks 1.5, every one meeting a street, another
// walk or a door square on.
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
];
