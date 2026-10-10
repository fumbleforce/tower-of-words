// The east lane's paths and green past the fountain plaza, in the island frame: scenes/island-layout.js spreads
// them into PATHS and GREEN, scenes/plaza/east-lane.js builds them. Every path is on the lane’s grid, 3 wide for
// streets and 1.5 for walks, meeting the lane, each other and the doors square on.
export const EAST_PATHS = [
  {
    id: 'dorm_street',
    kind: 'lane',
    rect: [73.04, -11.5, 76.04, 22.4],
    detail:
      'The street past the dorm courtyard’s gate, the lane’s last leg: from the jog’s north-east corner south past the ramen shop’s door to the shop street’s walk.',
  },
  {
    id: 'arcade_end',
    kind: 'walk',
    rect: [64.5, 17.9, 73.04, 22.4],
    detail: 'The shop street’s walk on out of the arcade’s east mouth, past the izakaya’s door, to the dorm street.',
  },
  {
    id: 'north_street',
    kind: 'lane',
    rect: [67.77, -46.5, 70.77, -11.5],
    detail:
      'North from the jog’s top leg toward housing_n, on the pocket park’s north-south axis, between block_e1 and block_e3.',
  },
  {
    id: 'east_cross',
    kind: 'walk',
    rect: [54.39, -12.6, 55.89, 6],
    detail: 'A walk across the lane between two avenue trees, from block_e1’s door to m_e2’s.',
  },
  {
    id: 'south_walk',
    kind: 'walk',
    rect: [54.39, 1.9, 73.04, 3.4],
    detail: 'Along the fronts of m_e1 and r8, from the cross walk to the dorm street.',
  },
  {
    id: 'park_walk_ew',
    kind: 'walk',
    rect: [65.5, -3.5, 73.04, -2],
    detail: 'Through the pocket park on the lane’s axis, from the jog’s corner to the dorm street.',
  },
  {
    id: 'park_walk_ns',
    kind: 'walk',
    rect: [68.52, -8.5, 70.02, 1.9],
    detail:
      'Through the pocket park on the north street’s axis, from the jog’s top leg to the south walk, opposite r8’s door.',
  },
];
export const EAST_GREEN = [
  {
    id: 'pocket_park',
    rect: [65.5, -8.5, 73.04, 1.9],
    detail: 'The lawn inside the lane’s jog: a cross of walks, a gravel square with one tree and benches.',
  },
];
