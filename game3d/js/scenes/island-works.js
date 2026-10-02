// The old works (docs/game/island.md, "Old works"), in the island frame: scenes/island-layout.js spreads these into
// PATHS; the works chunk builds them (scenes/works.js). The lane, the yard, the street and the research walk moved
// here from the day-2 plan (island-plan.js) when the chunk was built; the apron before the factory's gates and the
// one before the server hall's door came with it. On the lane's grid like the rest: streets 3 wide, the walk 1.5,
// meeting square on.
export const WORKS_PATHS = [
  {
    id: 'works_lane',
    kind: 'lane',
    rect: [-83.5, -114.5, -80.5, -98],
    detail:
      'From the supply yard north between the harbour office and the server hall, past the works yard, to the power plant’s door and the chimney’s foot.',
  },
  {
    id: 'works_yard',
    kind: 'court',
    rect: [-80.5, -106, -47, -102],
    detail:
      'The old works’ cracked concrete yard between the works shed and the server hall, from the works lane east to the works street.',
  },
  {
    id: 'factory_gate',
    kind: 'court',
    rect: [-70.7, -114.5, -62.4, -106],
    detail:
      'The apron before the old factory’s chained gates, north off the yard between the works shed and the gatehouse.',
  },
  {
    id: 'hall_apron',
    kind: 'court',
    rect: [-64.5, -102, -50, -97],
    detail: 'The apron south off the yard before the server hall’s door on its east face, open to the works street.',
  },
  {
    id: 'works_street',
    kind: 'lane',
    rect: [-50, -106, -47, -55.5],
    detail: 'North from the office street up the quarter’s west side to the works yard: old asphalt, faded edge lines.',
  },
  {
    id: 'research_walk',
    kind: 'walk',
    rect: [-47, -104.5, -35.2, -103],
    detail: 'From the works yard’s east end to Amakawa Research’s door on its west face.',
  },
];
