// The dorm quarter's plan: Jørgen's pick on Review dorm-quarter-5 (2026-10-17, "5, excellent"), drawn to scale in
// art/candidates/dorm-quarter-5/5-beach-promenade.webp and laid here on the lane's grid, in the island frame as
// [x0, x1, z0, z1] (x east, z south; 1 unit = 1.5 m). Every builder of the quarter reads these (dorm-quarter/*.js),
// the island layout spreads its paths and green from them (scenes/island-dorms.js), and the east coast walks them
// (east-coast/plan.js). One grid: the promenade east-west, the north-south walk across it, everything square to them.
//
//   the promenade: the plaza lane carried on east from the dorm street along the park's south side, past the dorm
//   courtyard's gate (Eric's block, turned to face it) to a small plaza on the beach promenade
//   the north-south walk: from the courts walk south past the residents' gardens, between N-W and N-E, through the
//   park and over the pond on a bridge, across the promenade, past S-E's court to the dorm row
//   the park at the heart: the big lawn inside a loop walk, the wisteria shelter on the court gate's axis, the pond
//   with its bridge, a boardwalk off the bridge to the cherry and its ring seat, the play corner, the common room as
//   a pavilion on the promenade
//   north: N-W (five storeys) on the park's north side, its balconies over the park, its door path behind it; the
//   residents' allotments, their shed and the orchard between that path and the courts walk; N-E stepping down five,
//   four, three storeys toward the sea, a terrace on every step, its hedged gardens and the sea garden with a pergola
//   south: S-E as an L, an east wing on the sea and a south wing, its door in the angle off a court with a play spot;
//   the two senior villas on the dorm row's south side, facing the sea over their walled gardens
//   east: the beach promenade along the sea wall, from a lookout deck at the north path's end to the sea terrace at
//   the dorm row's end: benches facing the sea, steps down to the sand, a fitness corner, the plaza with its drinks
//   machines where the promenade comes in
export const STOREY = 1.75; // the dorm blocks' floor-to-floor height, as Eric's block (dorm-court/block.js)

// --- the walks ---------------------------------------------------------------------------------------------------
export const DORM_STREET = [73.04, 76.04, -11.5, 22.4]; // the east lane's (island-east.js), for the joins
export const PROM = [76.04, 125.6, -11.5, -8.5]; // the promenade, 3 wide, the lane's brick
export const NS_X = [105.8, 107.8]; // the north-south walk, 2 wide
export const AXIS_X = (NS_X[0] + NS_X[1]) / 2;
export const NORTH = [80, 129.2, -38, -36]; // the north path: N-W's door, the gardens' gate, N-E, on to the sea
export const PARK_W = 78.2; // the park's ground runs out west to here (the lawn along the dorm street beyond)
export const PARK_N = [80, 129.2, -29.9, -28.4]; // along the park's north side under N-W's balconies, to the sea
export const COURTS = [59.2, 104, -58.5, -56.5]; // the courts walk (island-sports.js), for the joins
export const COURTS_EAST = [104, 127.6, -58.5, -56.5]; // the courts walk on east to a bench at the water
export const NS_N = [NS_X[0], NS_X[1], COURTS[3], PARK_N[2]]; // the courts walk to the park
export const NS_PARK = [NS_X[0], NS_X[1], PARK_N[3], PROM[2]]; // through the park, the bridge over the pond in it
export const NS_S = [NS_X[0], NS_X[1], PROM[3], 9]; // the promenade to the dorm row
export const ROW = [76.04, 124, 9, 12]; // the dorm row, the shop street's way in, on east to the terrace
export const TERRACE = [124, 129.2, 8, 13]; // the sea terrace at the row's end, benches looking south

// --- the park ------------------------------------------------------------------------------------------------------
export const PARK = [80, 126, PARK_N[3], PROM[2]];
// the loop walk round the big lawn, 1 wide: its outer edge, and the walks off it: north on the court gate's axis to the
// park's north walk, and east along the pond's north end to the north-south walk
export const GATE_X = 89.5; // the dorm courtyard's gate and hall doors (dorm_court's DOOR_X), the gardens' path
export const LOOP = [82.4, 101.6, -26.2, -15.6];
export const LOOP_W = 1.0;
export const LAWN = [LOOP[0] + LOOP_W, LOOP[1] - LOOP_W, LOOP[2] + LOOP_W, LOOP[3] - LOOP_W]; // the big lawn
export const LOOP_LINKS = [
  [GATE_X - 0.5, GATE_X + 0.5, PARK_N[3], LOOP[2]],
  [LOOP[1], NS_X[0], LOOP[2], LOOP[2] + LOOP_W],
];
// the wisteria shelter on the court gate's axis between the big lawn and the promenade's verge, a bench either side
// under it looking over the lawn
export const WISTERIA = [GATE_X - 3.0, GATE_X + 3.0, -15.5, -13.0]; // off the loop's south side
// the pond, the north-south walk crossing it on a bridge; a boardwalk east off the bridge to the cherry's ring
export const POND = [104, 109.6, -24.6, -15.6];
export const BRIDGE = [NS_X[0], NS_X[1], POND[2] - 0.4, POND[3] + 0.4];
export const RING = { x: 112.4, z: -21.2, seat: 1.3, pad: 2.0 }; // the cherry, its ring seat and paved round
export const BOARDWALK = [NS_X[1], RING.x - RING.pad + 0.2, RING.z - 0.5, RING.z + 0.5];
export const PLAY = [115.6, 122.4, -27.4, -22.2]; // the play corner, on sand, off the park's north walk
export const PLAY_LINK = [118.5, 119.5, PARK_N[3], PLAY[2]];
// the common room: a one-storey pavilion on the promenade (the dorm_commons chunk is its floor), its glazed door on
// the south face on a short walk from the promenade
export const COMMONS = [115.5, 123.9, -18.9, -13.4];
export const COMMONS_DOOR = [119.7, COMMONS[3]];
export const COMMONS_APRON = [COMMONS[0], COMMONS[1], COMMONS[3], PROM[2]]; // paved, under its canopy, on the promenade

// --- the blocks ----------------------------------------------------------------------------------------------------
// each: its footprint, storeys, the face its door is on and where along it (x on a north or south face, z on a west or
// east one), the face of its open corridors (the door side) and of its balconies, and its wall colour (TOWN.walls)
export const BLOCKS = [
  // N-W: on the park's north side, balconies south over the park, its door and corridors on the north path
  {
    id: 'dorm_nw',
    rect: [80.6, 103.4, -35.6, -30.6],
    storeys: 5,
    face: 'n',
    at: GATE_X,
    galleries: 'n',
    balconies: 's',
    wall: 1,
  },
  // N-E: five storeys at the back, then four, then three toward the sea, every flat a terrace east; its door and
  // corridors west, on a short walk off the north-south walk
  {
    id: 'dorm_ne',
    rect: [111, 114.6, -50.9, -38.6],
    storeys: 5,
    face: 'w',
    at: -44.7,
    galleries: 'w',
    terrace: 'e',
    wall: 0,
  },
  {
    id: 'dorm_ne_4',
    rect: [114.6, 117.2, -50.9, -38.6],
    storeys: 4,
    face: null,
    terrace: 'e',
    balconies: 'e',
    wall: 0,
  },
  { id: 'dorm_ne_3', rect: [117.2, 119.8, -50.9, -38.6], storeys: 3, face: null, balconies: 'e', wall: 0 },
  // S-E: an east wing on the sea and a south wing, at right angles; the door in the angle, on the east wing's west
  // face, corridors on the court sides, balconies east and south
  {
    id: 'dorm_se',
    rect: [119.2, 125.2, -7.2, 6.2],
    storeys: 5,
    face: 'w',
    at: -1.1,
    galleries: 'w',
    balconies: 'e',
    wall: 2,
  },
  {
    id: 'dorm_se_s',
    rect: [109.6, 119.2, 0.2, 6.2],
    storeys: 5,
    face: null,
    galleries: 'n',
    balconies: 's',
    wall: 2,
    joins: 'e',
  },
  // the senior villas: two storeys and a roof pavilion, doors on the row, terraces and gardens south to the sea
  { id: 'villa_w', rect: [96, 104.2, 13.3, 19.3], storeys: 2, face: 'n', at: 100.1, villa: true, wall: 3 },
  { id: 'villa_e', rect: [105.9, 114.1, 13.3, 19.3], storeys: 2, face: 'n', at: 110, villa: true, wall: 0 },
];
export const block = (id) => BLOCKS.find((k) => k.id === id).rect;
const NE = block('dorm_ne'),
  NE3 = block('dorm_ne_3'),
  SE = block('dorm_se'),
  SES = block('dorm_se_s');
// a block's door: on its face, the face's outward normal, and its direction along
export function doorOf(k) {
  if (!k.face) return null;
  const [x0, x1, z0, z1] = k.rect;
  const n = { s: [0, 1], n: [0, -1], w: [-1, 0], e: [1, 0] }[k.face];
  const x = k.face === 'w' ? x0 : k.face === 'e' ? x1 : k.at,
    z = k.face === 'n' ? z0 : k.face === 's' ? z1 : k.at;
  return { x, z, n, along: n[0] ? [0, 1] : [1, 0] };
}
// the short walks to the doors off the walks they face
export const NE_DOOR = [NS_X[1], NE[0], -45.3, -44.1];
export const SE_DOOR = [NS_X[1], SE[0], -1.7, -0.5];
export const VILLA_DOORS = BLOCKS.filter((k) => k.villa).map((k) => [k.at - 0.5, k.at + 0.5, ROW[3], k.rect[2]]);

// --- gardens -------------------------------------------------------------------------------------------------------
// the ground-floor flats' gardens: a hedge round each run, a low hedge between flats, a gate onto the lawn beyond
export const GARDENS = [
  { rect: [NE3[1], NE3[1] + 2.4, NE[2], NE[3]], open: 'e', pitch: NE[3] - NE[2] }, // N-E, east
  { rect: [SE[1], SE[1] + 1.7, SE[2], 7.9], open: 'e' }, // S-E's east wing
  { rect: [SES[0], SE[0], SES[3], 7.9], open: 's' }, // S-E's south wing
  { rect: [96, 104.2, 19.3, 22.9], open: 's', walled: true }, // the villas'
  { rect: [105.9, 114.1, 19.3, 22.9], open: 's', walled: true },
];
// N-E's sea garden: the pergola over two picnic tables, on a walk off the north path; pines in groups, a cherry
export const PERGOLA = [123.4, 126.8, -43.6, -40.9];
export const PERGOLA_WALK = [124.6, 125.6, PERGOLA[3], NORTH[2]];
// S-E's court in the angle: the door walk across it, a play spot with a bench, trees
export const SE_COURT = [NS_X[1], SE[0], PROM[3] + 1.0, SES[2]];
export const SE_PLAY = [112.4, 115.6, -5.4, -2.6];
// the bike shelters: N-W's on the north path west of the gardens' path, S-E's in its court by the door, each open to
// its walk, on a paved pad
export const NW_SHELTER = [81.0, 86.4, -40.5, NORTH[2]];
export const SE_SHELTER = [115.9, 118.6, -3.5, SE_DOOR[2]];
// the residents' allotments north of N-W's path: two rows of plots either side of the gardens' path (on the courts
// gate's axis), a gravel walk along their north side and between the rows, the tool shed in the first plot's place,
// the orchard of plums and persimmons beyond, a hedge along the courts walk
export const GARDEN_PATH = [GATE_X - 0.85, GATE_X + 0.85, -49.6, NORTH[2]];
export const PLOT_WALKS = [
  [79.2, 102.8, -49.6, -48.8],
  [79.2, 102.8, -45.6, -44.8],
];
export const PLOT_ROWS = [
  [-48.6, -45.8],
  [-44.6, -41.8],
];
export const PLOT_XS = [
  [79.4, 82.2],
  [82.5, 85.3],
  [85.6, 88.4],
  [90.5, 93.3],
  [93.6, 96.4],
  [96.7, 99.5],
  [99.8, 102.6],
];
export const SHED = [90.6, 93.2, -48.5, -46.0]; // in the north row's first plot east of the path
export const PLOTS = PLOT_ROWS.flatMap(([z0, z1], r) =>
  PLOT_XS.filter((x, i) => !(r === 0 && i === 3)).map(([x0, x1]) => [x0, x1, z0, z1]),
);
export const ORCHARD = [79.2, 103.4, -55.6, -50.4];
export const ORCHARD_TREES = [
  [80.4, -53.4, 'plum'],
  [83.9, -52.0, 'kaki'],
  [87.2, -53.8, 'plum'],
  [92.3, -52.4, 'kaki'],
  [95.8, -53.9, 'plum'],
  [99.3, -52.2, 'kaki'],
  [102.4, -54.1, 'plum'],
];

// --- the coast -----------------------------------------------------------------------------------------------------
// the beach promenade: pale stone along the sea wall, a planted edge on the land side opened where the walks come in
export const SEA_X = 132.9; // the sea wall's outer face (the coast's line along the promenade)
export const BEACH_PROM = [129.2, 132.6, -38.5, TERRACE[3]];
export const WALL = [BEACH_PROM[1], SEA_X + 0.3]; // the sea wall's coping (outdoor/coast.js lays it on the coast line)
export const EDGE = [128.2, BEACH_PROM[0]]; // the planted edge on the land side
export const DECK = [BEACH_PROM[1], 135.6, -38.5, -35.5]; // the lookout deck at the north path's end, out over the water
export const BEACH = [WALL[1], 137.2, -26.6, 3.1]; // the sand under the wall, its extent
// the water's edge along the beach, south to north (the sea on its right), curving in to the wall at both ends
export const SHORE = [
  [WALL[1], BEACH[3]],
  [134.9, 2.2],
  [136.4, 0.0],
  [137.1, -4.0],
  [137.3, -11.0],
  [137.1, -18.0],
  [136.3, -22.6],
  [134.8, -25.6],
  [WALL[1], BEACH[2]],
];
export const STEPS = [
  [BEACH_PROM[1], 134.6, -20.8, -18.8],
  [BEACH_PROM[1], 134.6, -11.3, -8.6], // wide, off the plaza
];
export const PLAZA = [125.6, BEACH_PROM[0], -11.7, -7.8]; // where the promenade comes in: drinks machines, a bench
export const FITNESS = [126.9, BEACH_PROM[0], 2.4, 5.8]; // three bars off the promenade by S-E's garden
// benches on the seaward edge facing the sea, z of each; the lamps on the land side
export const SEA_BENCHES = [-31.6, -25.4, -15.4, -4.6, -0.6, 7.2];
export const PROM_LAMPS = [-33.5, -25.4 + 2.6, -16.8, -6.4, 1.2, 9.5];
// where the walks open the planted edge
export const EDGE_GAPS = [
  [NORTH[2], NORTH[3]],
  [PARK_N[2], PARK_N[3]],
  [PLAZA[2], PLAZA[3]],
  [FITNESS[2], FITNESS[3]],
  [TERRACE[2], TERRACE[3]],
];
// the coast's line along the quarter, sea on its right (south-west round to north): in from the south past the
// terrace, up the sea wall, and round the sea garden's low stone edge to the coast north of N-E
export const COAST_LINE = [
  [110.9, 31.1],
  [129.9, 19.4],
  [SEA_X, 12.6],
  [SEA_X, -38.5],
  [131.6, -43.6],
  [130.4, -47.8],
];

export const inRect = (x, z, [x0, x1, z0, z1], m = 0) => x > x0 + m && x < x1 - m && z > z0 + m && z < z1 - m;
export const mid = (a, b) => (a + b) / 2;
