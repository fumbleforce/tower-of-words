// The seafront south of the shop street, in the island frame: scenes/island-layout.js spreads the paths into PATHS,
// the beach into SAND and the shoreline into COAST; scenes/outdoor/seafront.js builds the paving, stairs, lamps and
// planting, and the sea wall with scenes/outdoor/coast.js, for the plaza's and the forecourt's map tiles. Picked map:
// art/island/island-map-4-topdown.png (a promenade behind the south row, a sea wall, stairs down to a sand beach,
// rocks).
//
//   the shop rows: bays 4.5 wide from x -3 (plaza-buildings.js shopStreet); the south row is broken by three alleys,
//   one bay wide, every five bays, each with a walk from the arcade to the promenade
//   the promenade: 5.5 wide on the grid, from the south walk's foot (scenes/island-west.js) along the south row's
//   backs to a lookout over the rocks past the rows' east end; a band of darker stone along the wall carries the
//   lamps and benches, and a band across it on each alley's axis runs on to a flight of stairs down to the beach
//   the arcade's two mouths: a walk down each end of the rows to the promenade, the west one from the footpath along
//   the north row's backs
//   the sea wall: along the promenade's south edge, with a return down the beach's west side to the west coast's
//   wall; over the beach it stands on the sand (no armour rocks) with shrubs at its foot, east of the beach on armour
//   rocks in the sea like the west's
//   the beach: sand from the wall to the shoreline, boulders in groups, foam along the water
const pairs = (f) => f.reduce((a, v, i) => (i % 2 ? a[a.length - 1].push(v) : a.push([v]), a), []);

// the shop rows' bay grid, and the rows' lines (scenes/island-layout.js ROWS: shops_north, arcade, shops_south)
export const BAYS = { x0: -3, w: 4.5, n: 15, alleys: [1, 6, 11] };
export const bayMid = (i) => BAYS.x0 + BAYS.w * (i + 0.5);
export const ROWS_Z = { north: 13.4, arcade: 17.9, south: 22.4, back: 26.9 };
const ROW_W = BAYS.x0, // the rows' west end as built (ROWS has them from -4)
  ROW_E = 64.5; // and their east end

// the promenade [x0, z0, x1, z1] and the wall along its south edge
export const PROMENADE = [-16.1, ROWS_Z.back, 71, 32.4];
export const WALL_Z = PROMENADE[3];
export const BAND = 1.4; // the darker band along the wall
const STAIR_W = 2.4,
  STAIR_D = 3.2;
export const STAIRS = BAYS.alleys.map((i) => [
  bayMid(i) - STAIR_W / 2,
  WALL_Z,
  bayMid(i) + STAIR_W / 2,
  WALL_Z + STAIR_D,
]);
export const ALLEYS = BAYS.alleys.map((i) => [bayMid(i) - 1, ROWS_Z.south, bayMid(i) + 1, ROWS_Z.back]);
// the footpath along the north row's backs, as the plaza lays it (plaza/plan.js FOOTPATH), for the forecourt's tile
export const BACK_WALK = [ROW_W - 2.5, ROWS_Z.north - 1.7, 17.5, ROWS_Z.north];
export const LINKS = {
  west: [ROW_W - 2.5, BACK_WALK[1], ROW_W, ROWS_Z.back], // from the back footpath past the arcade's mouth
  east: [PROMENADE[2] - 2.5, ROWS_Z.south, PROMENADE[2], ROWS_Z.back], // up from the promenade's east end
};
// where the beach ends and the wall stands in the sea, and where the wall ends east (past the plaza's tile)
export const BEACH_E = 59;
const WALL_E = 80;

const ALLEY =
  'An alley through the south row from the arcade to the promenade, opposite a flight of stairs to the beach.';
export const SOUTH_PATHS = [
  {
    id: 'promenade',
    kind: 'promenade',
    rect: PROMENADE,
    detail:
      'The promenade behind the shop street’s south row, from the south walk’s foot to a lookout over the rocks past the rows’ east end; lamps and benches along the sea wall.',
  },
  {
    id: 'arcade_west',
    kind: 'walk',
    rect: LINKS.west,
    detail:
      'Down the rows’ west end from the footpath along the north row’s backs, past the arcade’s west mouth, to the promenade.',
  },
  {
    id: 'arcade_east',
    kind: 'walk',
    rect: LINKS.east,
    detail:
      'From the shop street’s walk past the arcade’s east mouth down to the promenade’s east end, which turns up into it.',
  },
  ...ALLEYS.map((rect, k) => ({ id: `alley_${k + 1}`, kind: 'walk', rect, detail: ALLEY })),
  ...STAIRS.map((rect, k) => ({
    id: `beach_stairs_${k + 1}`,
    kind: 'stairs',
    rect,
    detail: 'Stairs from the promenade down the sea wall to the beach.',
  })),
];

// The shoreline from the west coast's wall end round the beach to where the wall meets the sea, then along the wall
// (COAST.line takes these points; land north of them)
export const SHORE = pairs([
  -13.6,
  42.3,
  -4,
  44.6,
  6,
  46.2,
  20,
  47.2,
  36,
  46.6,
  48,
  44.2,
  55.5,
  39.2,
  BEACH_E + 0.6,
  WALL_Z + 0.8,
  WALL_E,
  WALL_Z + 0.8,
]);
export const SHORELINE = SHORE.slice(0, 8); // round the beach only
export const SOUTH_SAND = [
  {
    id: 'beach',
    poly: [[-13.6, WALL_Z], [BEACH_E, WALL_Z], ...SHORELINE.slice().reverse()],
    detail: 'The sand beach below the sea wall, from the west coast’s wall to the rocks east of the shop street.',
  },
];

// The sea wall as lines for scenes/outdoor/coast.js: each line runs with the sea (or the beach) on its right.
// beach: on the sand, no rocks or surf, shrubs at its foot; plant: a planted strip behind the coping (on lawn).
// Broken at each flight of stairs, so its piers stand either side of the stairs' head.
const ends = [-13.6, ...STAIRS.flatMap(([x0, , x1]) => [x0, x1]), BEACH_E];
const run = (x0, x1) => [
  [x0, WALL_Z],
  [x1, WALL_Z],
];
export const SOUTH_COAST = [
  {
    line: [
      [-13.6, 42.3],
      [-13.6, WALL_Z],
    ],
    beach: true,
    plant: true,
  },
  ...ends.flatMap((x0, i) => (i % 2 ? [] : [{ line: run(x0, ends[i + 1]), beach: true }])),
  { line: run(BEACH_E, WALL_E) },
];

// Trees on the grid, [kind, x, z, size]: black pines in a three along the wall east of the promenade's lookout, as
// along the west coast, and zelkovas along the west walk (the lawn west of the rows is the grove's, scenes/island-west.js); shrub clusters [x, z] in
// the beds either side of each alley
export const SOUTH_TREES = [
  ...[73.5, 76.5, 79.5].map((x, i) => ['pine', x, 30.2, 1.3 + (i === 1) * 0.2]),
  // zelkovas every 4 down the west walk's lawn side
  ...[15, 19, 23].map((z) => ['keyaki', LINKS.west[0] - 1.4, z, 1.0]),
];
export const SOUTH_SHRUBS = ALLEYS.flatMap(([x0, z0, x1]) =>
  [z0 + 0.9, z0 + 2.3, z0 + 3.7].flatMap((z) => [
    [x0 - 0.65, z],
    [x1 + 0.65, z],
  ]),
);

// On the beach, [x, z] each: beach umbrellas in pairs between the flights and one by the huts, and three beach huts
// against the wall's west return (their doors face the sea)
export const UMBRELLAS = [
  [14, 38.5],
  [17.2, 39.4],
  [34.5, 40.2],
  [37.6, 39],
  [-3.5, 37.4],
];
export const HUTS = [-11.8, -9.4, -7].map((x) => [x, 34.6]);
export const EAST_BED = [ROW_E, ROWS_Z.south, LINKS.east[0], ROWS_Z.back];
