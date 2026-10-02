// The office street and its walks (docs/game/island.md, "Office quarter"), in the island frame:
// scenes/island-layout.js spreads these into PATHS; the office quarter chunk builds them (scenes/office-quarter.js).
// The street and gym_link moved here from the day-2 plan (island-plan.js) when the chunk was built, with the two
// short walks to the doors set back from the street. On the lane's grid like the rest: the street 3 wide, walks 1.5,
// meeting square on.
export const OFFICE_PATHS = [
  {
    id: 'office_street',
    kind: 'lane',
    rect: [-62, -55.5, 36, -52.5],
    detail:
      'The office quarter’s main street, east-west: from the supply quay’s yard past the office blocks to the gym.',
  },
  {
    id: 'gym_link',
    kind: 'lane',
    rect: [33, -55.5, 36, -46.5],
    detail: 'The office street’s east end, turning south past the gym’s west corner to the sports lane.',
  },
  {
    id: 'foods_walk',
    kind: 'walk',
    rect: [-19.68, -64.9, -18.18, -55.5],
    detail: 'From the office street north to Amakawa Foods’ door (m1), on the shed street’s line.',
  },
  {
    id: 'construction_walk',
    kind: 'walk',
    rect: [15.35, -67.4, 16.85, -55.5],
    detail: 'From the office street north between m3 and m5 to the court in front of Amakawa Construction (m4).',
  },
  {
    id: 'construction_court',
    kind: 'court',
    rect: [15.35, -69.4, 23.4, -67.4],
    detail: 'The paved court in front of Amakawa Construction’s door, behind m5.',
  },
];
