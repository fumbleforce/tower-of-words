// The built places' frames in the island frame of scenes/island-layout.js, which re-exports CHUNKS and works with
// it (toLocal). The chunk table's home is docs/game/places.md ("Where the places sit on the island"); CHUNKS follows
// it and `node tools/facts/check.mjs` compares the two.
//
// Each built place: at = the island point of its local (0, 0); turn = clockwise degrees on the map (local north to
// island north); scale (the train is built at people scale 1, the rest at 1.18); level (0 ground, -2 B2, 1 upstairs);
// walk = its walkable rectangle and view = the part drawn on the map, both local [x0, x1, z0, z1];
// anchor = what pins it to the reference.
export const CHUNKS = {
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
    walk: [-6.6, 35, -9.8, 10.6],
    view: [-42, 31, -28, 52.15], // west to the coast, over the platform shed, south to the beach (island-south.js)
    anchor: 'the gate room (its exit is the station door at local (-1.5, 2.65))',
  },
  office: {
    at: [3.75, -5.01],
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
    walk: [-12.25, 2.25, -77.9, 9.5],
    view: [-27, 7, -80.5, 13.5],
    anchor: 'the middle of the arcade’s east mouth, between the two shop rows as drawn',
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
  sports: {
    at: [58.2, -57.5],
    turn: 0, // the camera turns itself: north over the lane and the pool walk, east along the courts walk (scenes/sports.js)
    scale: 1,
    level: 0,
    walk: [-21.8, 43.6, -33.5, 20.5],
    view: [-30, 50, -46, 32],
    anchor: 'the corner where the pool walk meets the courts walk',
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
