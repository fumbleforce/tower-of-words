// Built campus connections; the same footprints drive map paving and physical navigation.
export const CAMPUS_PATHS = [
  {
    id: 'shed_street_far',
    kind: 'lane',
    rect: [-20.75, -52.5, -17.75, -22.1],
    detail: 'The shed street continues from the station campus to the office street.',
  },
  {
    id: 'quarter_street',
    kind: 'lane',
    rect: [3, -52.5, 6, -18.1],
    detail: 'The quarter street connects the tower rear to the office street.',
  },
  {
    id: 'back_lane_west',
    kind: 'lane',
    rect: [6, -33, 15.79, -30],
    detail: 'The service lane links the quarter street to the canteen loading yard.',
  },
  {
    id: 'print_shop_walk',
    kind: 'walk',
    rect: [-24.3, -44.1, -20.75, -42.5],
    detail: 'A level walk from the shed street to the print shop east door.',
  },
  {
    id: 'campus_rest',
    kind: 'plaza',
    rect: [-39.4, -33.8, -34.4, -29.8],
    detail: 'A small paved rest garden between the coast walk and print shop.',
  },
  {
    id: 'campus_rest_link',
    kind: 'walk',
    rect: [-40.6, -32.6, -39.4, -31],
    detail: 'The coast walk opens into the rest garden.',
  },
];
