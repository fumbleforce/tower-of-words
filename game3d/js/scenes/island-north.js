// North of the lane, behind the canteen: the back lane's paths and green in the island frame. scenes/island-layout.js
// spreads them into PATHS and GREEN, scenes/plaza/north-lane.js builds them. On the lane's grid like the east lane's
// (scenes/island-east.js): the street 3 wide, the walks to the doors square to it.
export const NORTH_PATHS = [
  {
    id: 'back_lane',
    kind: 'lane',
    rect: [22.535, -33, 67.77, -30],
    detail:
      'The service street behind the canteen: from the canteen’s loading yard at its west end east past the clinic and block_e2 to the north street, which it meets square on.',
  },
  {
    id: 'canteen_yard',
    kind: 'court',
    rect: [15.79, -33, 22.535, -23.98],
    detail:
      'The canteen’s loading yard at the back lane’s west end, against the canteen’s west face with its roller shutter; closed by a hedge on the lawn sides.',
  },
  {
    id: 'm6_walk',
    kind: 'walk',
    rect: [17.65, -39.1, 19.15, -33],
    detail: 'From the loading yard’s north edge to m6’s door, in the middle of its south face.',
  },
  {
    id: 'canteen_apron',
    kind: 'walk',
    rect: [22.535, -30, 45.235, -28.8],
    detail:
      'The paved strip along the canteen’s back between its wall and the back lane: the loading bay, the kitchen door, the bins.',
  },
  {
    id: 'clinic_court',
    kind: 'walk',
    rect: [27.75, -36.2, 33.75, -33],
    detail: 'The clinic’s small entrance court off the back lane, on the clinic’s door.',
  },
  {
    id: 'e2_walk',
    kind: 'walk',
    rect: [61.1, -35.2, 62.6, -33],
    detail: 'From the back lane to block_e2’s door, in the middle of its south face.',
  },
  {
    id: 'grove_walk',
    kind: 'walk',
    rect: [46.9, -37.08, 48.4, -33],
    detail: 'From the back lane north into the grove, between two planted beds, to its seating square.',
  },
  {
    id: 'grove_square',
    kind: 'plaza',
    rect: [45.65, -41.08, 49.65, -37.08],
    detail: 'A small gravel square in the grove with a tree in the middle and benches round it.',
  },
];
export const NORTH_GREEN = [
  {
    id: 'clinic_grove',
    rect: [36.6, -45, 57.7, -34.1],
    detail:
      'Lawn between the clinic and block_e2, north of the back lane’s avenue: two planted beds either side of the grove walk, trees round its seating square.',
  },
];
