// The ground round the gym, the pool and the tennis courts (docs/game/island.md, "Sports and baths"), in the island
// frame: scenes/island-layout.js spreads these into PATHS; the sports chunk builds them (scenes/sports.js). Moved
// here from the day-2 plan (island-plan.js) when the chunk was built, with the two short walks to the courts' gate
// and the north residence's door. On the lane's grid like the rest: the lane 3 wide, walks 2 and 1.5, meeting square
// on; the gate and the residence's door on one axis across the courts walk.
const DOOR_X = 89.5; // the courts' gate, between the two courts, and the residence's door across the walk

export const SPORT_PATHS = [
  {
    id: 'sports_lane',
    kind: 'lane',
    rect: [33, -49.5, 70.77, -46.5],
    detail: 'Along the gym’s south side, east to the top of the north street (layout north_street).',
  },
  {
    id: 'pool_walk',
    kind: 'walk',
    rect: [57.2, -91, 59.2, -49.5],
    detail: 'North from the sports lane between the gym and the pool to the shower pavilion’s door.',
  },
  {
    id: 'courts_walk',
    kind: 'walk',
    rect: [59.2, -58.5, 104, -56.5],
    detail: 'East from the pool walk along the pool’s and the courts’ south fences, behind the north residence.',
  },
  {
    id: 'courts_gate_walk',
    kind: 'walk',
    rect: [DOOR_X - 0.75, -61, DOOR_X + 0.75, -58.5],
    detail: 'From the courts walk north to the tennis courts’ gate, between the two courts.',
  },
  {
    id: 'residence_walk',
    kind: 'walk',
    rect: [DOOR_X - 0.75, -56.5, DOOR_X + 0.75, -53.2],
    detail: 'From the courts walk south to the north residence’s door, across the walk from the courts’ gate.',
  },
  {
    id: 'pool_deck',
    kind: 'court',
    rect: [60, -87, 75.4, -61],
    detail: 'The pool’s deck round the 25 m pool, fenced; the shower pavilion on its north side.',
  },
];
