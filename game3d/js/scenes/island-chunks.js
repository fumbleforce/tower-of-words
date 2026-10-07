// The built places' frames in the island frame of scenes/island-layout.js, which re-exports CHUNKS and works with
// it (toLocal). The chunk table's home is docs/game/places.md ("Where the places sit on the island"); CHUNKS follows
// it and `node tools/facts/check.mjs` compares the two.
//
// Each built place: at = the island point of its local (0, 0); turn = clockwise degrees on the map (local north to
// island north); scale (the train is built at people scale 1, the rest at 1.18); level (0 ground, -2 B2, 1 upstairs);
// walk = its walkable rectangle and view = the part drawn on the map, both local [x0, x1, z0, z1];
// anchor = what pins it to the reference.
export const CHUNKS = {
  ferry_terminal: {
    at: [-112, -100],
    turn: 0,
    scale: 1,
    level: 0,
    walk: [-7.86, 7.86, -7.86, 0],
    view: [-8, 8, -8, 0.2],
    anchor: 'the existing ferry terminal south door and harbour waiting-room footprint',
  },
  konbini: {
    at: [30.75, 17.9],
    turn: 0,
    scale: 1,
    level: 0,
    walk: [-2.04, 2.04, -3.45, -0.04],
    view: [-2.22, 2.22, -4.48, 0.2],
    anchor: 'the konbini bay 7 south door and existing ground-floor footprint',
  },
  bakery: {
    at: [44.25, 17.9],
    turn: 0,
    scale: 1,
    level: 0,
    walk: [-2.04, 2.04, -2.71, -0.04],
    view: [-2.22, 2.22, -4.48, 0.2],
    anchor: 'the bakery bay 10 south door and existing ground-floor footprint',
  },
  print_shop: {
    at: [-24.3, -43.3],
    turn: 270,
    scale: 1,
    level: 0,
    walk: [-1.74, 1.74, -7.72, 0],
    view: [-1.9, 1.9, -9.7, 0.2],
    anchor: 'existing w3 east door, with the ground-floor room turned toward it',
  },
  campus: {
    at: [-13.95, -0.65],
    turn: 0,
    scale: 1,
    level: 0,
    walk: [-28.650000000000002, 29.74, -51.85, -5.4],
    view: [-48, 48, -68, 10],
    anchor: 'the head-office north campus, in the forecourt frame',
  },
  izakaya: {
    at: [68.6, 17.9],
    turn: 0,
    scale: 1,
    level: 0,
    walk: [-1.81, 1.81, -3.88, -0.03],
    view: [-2, 2, -4.5, 0.2],
    anchor: 'the izakaya south door and existing ground-floor footprint',
  },
  canteen: {
    at: [33.885, -20.5],
    turn: 0,
    scale: 1,
    level: 0,
    walk: [-11.17, 11.17, -6.55, 0],
    view: [-11.35, 11.35, -8.3, 0.2],
    anchor: 'the existing canteen ground-floor footprint and south-facing plaza door',
  },
  gate: {
    at: [-14.45, 6.5],
    turn: 0,
    scale: 1,
    level: 0,
    walk: [-6.3, 6.3, -4.5, 4.5],
    view: [-6.5, 6.5, -4.6, 5.0],
    anchor: 'the room centred on the station building’s footprint',
  },
  forecourt: {
    at: [-13.95, -0.65],
    turn: 0,
    scale: 1,
    level: 0,
    walk: [-6.6, 35, -13.4, 12.75],
    view: [-42, 31, -28, 52.15], // west to the coast, over the platform shed, south to the beach (island-south.js)
    anchor: 'the gate room (its exit is the station door at local (-1.5, 2.65))',
  },
  office: {
    at: [8.75, -8.45],
    turn: 0,
    scale: 1,
    level: -2,
    walk: [-7, 7, -6.4, 6.4],
    view: [-7, 7, -6.4, 6.4],
    anchor: 'its lift under the forecourt lift',
  },
  plaza: {
    at: [37.29, -2.48],
    turn: 0,
    scale: 1,
    level: 0,
    walk: [-11.8, 13.2, -16.4, 11.2],
    view: [-22, 38.6, -42, 53.98], // east to the dorm court's tile, north to the clinic, south to the beach
    anchor: 'the fountain on the fountain as drawn',
  },
  dorm_court: {
    at: [79.84, -1.3],
    turn: 90,
    scale: 1,
    level: 0,
    walk: [-5.1, 5.2, -4.1, 2.45],
    view: [-12.7, 21.8, -49.2, 4.0], // east over the dorm cluster round the inner court (dorm-court/cluster.js)
    anchor: 'the open entrance court west of the dorm blocks as drawn, looking east at Eric’s block',
  },
  dorms: {
    at: [85.49, -1.79],
    turn: 90,
    scale: 1,
    level: 1,
    walk: [-1.55, 8.1, -2.6, 2.1],
    view: [-1.6, 8.3, -2.8, 4.6],
    anchor: 'in the dorm courtyard’s block, above the passage; its corridor runs to the stairs in the return',
  },
  shotengai: {
    at: [64.5, 20.15],
    turn: 270, // looking west down the arcade from its east mouth; view: the rows' backs to the beach
    scale: 1,
    level: 0,
    walk: [-12.25, 8.65, -77.9, 9.5],
    view: [-27, 7, -80.5, 13.5],
    anchor: 'the middle of the arcade’s east mouth, between the two shop rows as drawn',
  },
  karaoke: {
    at: [62.25, 22.4],
    turn: 180, // an interior, its door on the arcade (the south row faces north): looked into from the arcade's side
    scale: 1,
    level: 0,
    walk: [-3.6, 3.6, -4.4, 0],
    view: [-3.8, 3.8, -4.6, 0.4],
    anchor: 'the karaoke box’s door off the arcade, south row bay 14, inside',
  },
  karaoke_booth: {
    at: [59.4, 24.6],
    turn: 180, // upstairs over the front desk
    scale: 1,
    level: 1,
    walk: [-2.4, 2.4, -3.6, 0],
    view: [-2.6, 2.6, -3.8, 0.4],
    anchor: 'one booth on the karaoke box’s first floor, over the desk',
  },
  east_lane: {
    at: [69.27, -2.75],
    turn: 0, // the camera turns itself: north-east over most of it, south-east over the south walk (scenes/east-lane.js)
    scale: 1,
    level: 0,
    walk: [-17.38, 9.87, -35.65, 16.92],
    view: [-26, 14, -40, 20],
    anchor: 'the middle of the pocket park’s gravel square, where its two walks cross',
  },
  east_coast: {
    at: [126.5, 10.5],
    turn: 0, // the camera turns itself: east along the dorm row, north up the coast and to the onsen (scenes/east-coast.js)
    scale: 1,
    level: 0,
    walk: [-50.7, 5.5, -98.7, 2.5],
    view: [-56, 18, -112, 20],
    anchor: 'the middle of the dorms’ sea terrace, at the dorm row’s east end',
  },
  dorm_commons: {
    at: [100.9, 2.1],
    turn: 0, // an interior: the camera looks in from the south over the cut-down front wall (scenes/rooms/commons.js)
    scale: 1,
    level: 0,
    walk: [-4.0, 4.0, -4.7, 0],
    view: [-4.2, 4.2, -4.9, 0.4],
    anchor: 'the common room’s glazed door in dorm_gallery’s south face, inside',
  },
  sports: {
    at: [58.2, -57.5],
    turn: 0, // the camera turns itself: north over the lane and the pool walk, east along the courts walk (scenes/sports.js)
    scale: 1,
    level: 0,
    walk: [-21.8, 43.6, -33.5, 20.5],
    view: [-30, 50, -46, 32],
    anchor: 'the corner where the pool walk meets the courts walk',
  },
  pool: {
    at: [58.2, -57.5],
    turn: 0, // the sports ground's frame and world (scenes/sports.js), walked on the deck: the camera looks up the pool
    scale: 1,
    level: 0,
    walk: [1.8, 17.2, -29.5, -3.5],
    view: [-4, 22, -40, 0],
    anchor: 'the sports ground’s own, the deck inside the pool’s fence',
  },
  gym: {
    at: [47.05, -50.9],
    turn: 0, // an interior: the camera looks in from the south over the cut-down front wall (scenes/rooms/gym.js)
    scale: 1,
    level: 0,
    walk: [-9.4, 9.4, -13, 0],
    view: [-9.6, 9.6, -13.2, 0.4],
    anchor: 'the gym’s main doors, inside: the entrance lobby, the sports hall behind its glass wall',
  },
  office_quarter: {
    at: [4.5, -54],
    turn: 0, // the camera turns itself: north-north-west along the street, north up the walks, as the sports lane by the gym (scenes/office-quarter.js)
    scale: 1,
    level: 0,
    walk: [-44.6, 39.6, -15.6, 7.6],
    view: [-60, 50, -40, 25],
    anchor: 'the office street where the quarter street meets it',
  },
  harbour: {
    at: [-100, -88],
    turn: 0, // the camera turns itself: north over the yard, the landing and the piers, as the office street on the street and the harbour walk (scenes/harbour.js)
    scale: 1,
    level: 0,
    walk: [-26, 69.4, -13, 58.6],
    view: [-40, 80, -30, 72],
    anchor: 'the corner of the quay where the ferry landing meets the supply yard',
  },
  works: {
    at: [-82, -104],
    turn: 0, // the camera turns itself: from the south-east up the lane, north over the yard, from the south-west up the street (scenes/works.js)
    scale: 1,
    level: 0,
    walk: [-3.4, 47, -14, 48.4],
    view: [-22, 62, -30, 62],
    anchor: 'the middle of the works lane where it meets the works yard',
  },
  train: {
    at: [-28.6, -3.9],
    turn: 270, // heading north up the shed (the beam comes in from the south, train/island.js); the platform side east
    scale: 1.18,
    level: 1,
    walk: [-17, 17, -1.2, 4.6],
    view: [-17, 17, -4.6, 4.6],
    anchor: 'the car in the middle of the platform shed as drawn, its walkway end south, toward the stairs',
  },
};
