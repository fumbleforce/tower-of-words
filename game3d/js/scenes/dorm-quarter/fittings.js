// Where the dorm quarter's walks, seats, lamps and trees in the paving stand (the plan is dorm-quarter/plan.js): pure
// data the builders lay (ground.js, park.js, promenade.js, gardens.js, yards.js) and the east coast's walk grid keeps
// the crowd off (east-coast/plan.js). In the island frame, [x0, x1, z0, z1].
import * as Q from './plan.js';

// the loop walk's four sides round the big lawn
export const LOOP_RECTS = (() => {
  const [x0, x1, z0, z1] = Q.LOOP,
    w = Q.LOOP_W;
  return [
    [x0, x1, z0, z0 + w],
    [x0, x1, z1 - w, z1],
    [x0, x0 + w, z0 + w, z1 - w],
    [x1 - w, x1, z0 + w, z1 - w],
  ];
})();

// the walks by how they are laid
export const WALKS = [
  Q.NS_N,
  Q.NS_PARK,
  Q.NS_S,
  Q.NORTH,
  Q.WEST,
  Q.PARK_N,
  Q.COURTS_EAST,
  Q.NE_DOOR,
  Q.SE_DOOR,
  ...Q.VILLA_DOORS,
  Q.GARDEN_PATH,
  Q.PERGOLA_WALK,
  Q.PLAY_LINK,
];
export const PARK_WALKS = [...LOOP_RECTS, ...Q.LOOP_LINKS];
export const PADS = [Q.PLAZA, Q.FITNESS, Q.PERGOLA, Q.COMMONS_APRON, Q.NW_SHELTER, Q.SE_SHELTER];
export const RING_PAD = [Q.RING.x - Q.RING.pad, Q.RING.x + Q.RING.pad, Q.RING.z - Q.RING.pad, Q.RING.z + Q.RING.pad];
// timber (the bridge, the boardwalk, the deck: park.js and promenade.js lay their boards) and the play corner's sand
export const TIMBER = [Q.BOARDWALK, Q.DECK];
// every paved rect, for the edges
export const PAVED = [
  Q.PROM,
  Q.ROW,
  Q.TERRACE,
  Q.BEACH_PROM,
  ...WALKS,
  ...PARK_WALKS,
  ...PADS,
  RING_PAD,
  ...TIMBER,
  ...Q.PLOT_WALKS,
  Q.PLAY,
  Q.SE_PLAY,
];

// the park's benches round the loop ([x, z, facing]), its lamps and the promenade's on the park's verge
export const LOOP_BENCHES = [
  [86.2, Q.LOOP[2] - 0.45, 0],
  [93.0, Q.LOOP[2] - 0.45, 0],
  [97.6, Q.LOOP[3] + 0.45, Math.PI],
  [Q.LOOP[0] - 0.45, -18.2, Math.PI / 2],
  [Q.LOOP[1] + 0.45, -23.4, -Math.PI / 2],
];
export const PARK_LAMPS = [
  [Q.LOOP[0] - 0.4, Q.LOOP[2] - 0.4],
  [Q.LOOP[1] + 0.4, Q.LOOP[2] - 0.4],
  [Q.LOOP[0] - 0.4, Q.LOOP[3] + 0.4],
  [Q.LOOP[1] + 0.4, Q.LOOP[3] + 0.4],
  [Q.NS_X[0] - 0.35, Q.PARK_N[3] + 0.6],
  [Q.NS_X[1] + 0.35, Q.PROM[2] - 1.4],
  [Q.RING.x + Q.RING.pad - 0.3, Q.RING.z - Q.RING.pad + 0.3],
];
// the promenade's lamps on the park's verge, every 8 or so, none before the gate
export const PROM_PARK_LAMPS = [83.4, 96.6, 104.4, 112.8, 125.0].map((x) => [x, Q.PROM[2] - 0.3]);
// what stands where Eric walks or sits, for the walk grid (east-coast/plan.js)
export const PARK_FURNITURE = [
  ...LOOP_BENCHES.map(([x, z, f]) =>
    Math.abs(Math.sin(f)) > 0.5 ? [x - 0.3, x + 0.3, z - 0.85, z + 0.85] : [x - 0.85, x + 0.85, z - 0.3, z + 0.3],
  ),
  ...[Q.GATE_X - 1.75, Q.GATE_X + 1.75].map((x) => [x - 0.85, x + 0.85, -13.9, -13.3]),
  [
    Q.RING.x - Q.RING.seat - 0.2,
    Q.RING.x + Q.RING.seat + 0.2,
    Q.RING.z - Q.RING.seat - 0.2,
    Q.RING.z + Q.RING.seat + 0.2,
  ],
];

// where the railing and the wall are open: the deck, each flight of steps
export const WALL_GAPS = [[Q.DECK[2], Q.DECK[3]], ...Q.STEPS.map((s) => [s[2], s[3]])];
// what stands on the walks, for the walk grid: the benches, the lamps, the machines, the tap, the bars
export const PROM_FURNITURE = [
  ...Q.SEA_BENCHES.map((z) => [Q.BEACH_PROM[1] - 0.75, Q.BEACH_PROM[1] - 0.15, z - 0.85, z + 0.85]),
  ...Q.PROM_LAMPS.map((z) => [Q.BEACH_PROM[0] - 0.35, Q.BEACH_PROM[0] + 0.05, z - 0.18, z + 0.18]),
  [125.85, 127.75, Q.PLAZA[2], Q.PLAZA[2] + 0.75],
  [131.9, 132.4, -11.85, -11.35],
  [Q.FITNESS[0] + 0.2, Q.FITNESS[1] - 0.2, Q.FITNESS[2] + 0.4, Q.FITNESS[3] - 0.4],
];

// the lamps along the north path, the north-south walk and the walks to the doors
export const QUARTER_LAMPS = [
  ...[84, 94, 100.8, 112.2, 120.4].map((x) => [x, Q.NORTH[2] - 0.3]),
  ...[-52, -44].map((z) => [Q.NS_X[1] + 0.3, z]),
  [Q.NS_X[1] + 0.3, 4.6],
  [Q.WEST[0] - 0.3, -32.4],
  [Q.WEST[0] - 0.3, -16.2],
  [Q.PERGOLA_WALK[1] + 0.3, -39.0],
  [Q.SE_DOOR[0] + 1.2, Q.SE_DOOR[2] - 0.3],
];

// the dorm row's zelkovas in tree pits along its south side, and its lamps between them
export const ROW_TREES = [84.5, 92.5, 103.2, 115.4, 121.6];
export const ROW_LAMPS = [80.5, 88.5, 96.5, 107.5, 112.5, 119.5];
