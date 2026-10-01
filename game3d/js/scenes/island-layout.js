// The island in one shared frame: where each built place (chunk) sits, and the buildings, paths, green and coast
// around the day-1 route, traced from the picked island map (reviews/island-map-4,
// art/candidates/island-map-4/01-overview.png) and its straight-down version (art/island/island-map-4-topdown.png,
// footprints in art/candidates/island-map-4-topdown/buildings.json). Pure data plus helpers: chunk builders cut their
// background from BUILDINGS, and the island map's compare view (js/map/, ?mapcompare=1) draws all of it over the
// reference. The chunk table's home is docs/game/places.md ("Where the places sit on the island"); CHUNKS follows it
// and `node tools/facts/check.mjs` compares the two. The gaps between this layout and the built places are listed
// in notes/map-gaps.md.
//
// Frame: 1 unit = UNIT metres. x runs east, z runs south, and the axes run along the town's street grid: the map
// draws the grid (the station, the platform shed, the head office, the shop street) turned about 23° clockwise from
// its own up, so the frame is turned with it (REF.turn) and every building on the grid is a plain rectangle, square
// to the game's cameras. "North" in the game and in these notes is the grid's north. Origin: the head office's
// entrance door as the reference draws it.

import { EAST_PATHS, EAST_GREEN } from './island-east.js';
import { WEST_PATHS, WEST_GREEN } from './island-west.js';
import { NORTH_PATHS, NORTH_GREEN } from './island-north.js';

export const UNIT = 1.5;

// The reference is a perspective view from the south: a camera whose horizon lies above the image. REF maps its
// ground plane to the island frame. horizon (image row), focal (px) and centre (image column) come from the ground
// squash, measured on the fountain's round ring (0.72 at row 612) and the football pitch (0.54 at row 165); k
// sets the scale so the station, as drawn, is as long as the gate room (12.6 units); x0 and d0 put the origin on
// the head office door (505, 571). D is the ground distance north of the camera line. turn: the grid's angle, in
// degrees clockwise from the picture's up; the flattened ground is turned back by it.
export const REF = {
  image: '/art/candidates/island-map-4/01-overview.png',
  size: [1536, 1024],
  horizon: -1176,
  focal: 2483.3,
  centre: 768,
  k: 746579,
  x0: 45.26,
  d0: 427.35,
  turn: 23,
};
// The straight-down reference (art/candidates/island-map-4-topdown/frame.json): pixel (i, j) is the point
// (x0 + (i + 0.5) / ppu, z0 + (j + 0.5) / ppu) in the picture's own frame, before REF.turn (its up is the picture's
// up). Git-ignored, served from the main checkout; backed up under bible/shots/showcase/island-topdown-1/.
export const TOPDOWN = {
  image: '/art/island/island-map-4-topdown.png',
  x0: -120,
  z0: -215,
  ppu: 6,
};

const TURN = (REF.turn * Math.PI) / 180;
// the picture's own frame (up = the picture's up) to the island frame, and back
export const fromPicture = (x, z) => [
  x * Math.cos(TURN) + z * Math.sin(TURN),
  -x * Math.sin(TURN) + z * Math.cos(TURN),
];
export const toPicture = (x, z) => [x * Math.cos(TURN) - z * Math.sin(TURN), x * Math.sin(TURN) + z * Math.cos(TURN)];
// image pixel -> island point, and back
export function fromImage(u, v, R = REF) {
  const D = R.k / (v - R.horizon);
  return fromPicture(R.x0 + ((u - R.centre) * D) / R.focal, R.d0 - D);
}
export function toImage(x, z, R = REF) {
  const [px, pz] = toPicture(x, z);
  const D = R.d0 - pz;
  return [R.centre + (R.focal * (px - R.x0)) / D, R.horizon + R.k / D];
}

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
    view: [-42, 31, -28, 17], // west to the coast and over the platform shed (scenes/island-west.js)
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
    view: [-22, 38.6, -42, 32], // east to the dorm courtyard's tile (plaza/east-lane.js), north to the clinic (plaza/north-lane.js)
    anchor: 'the fountain on the fountain as drawn',
  },
  dorm_court: {
    at: [79.84, -1.3],
    turn: 90,
    scale: 1,
    level: 0,
    walk: [-5.1, 5.2, -4.1, 2.45],
    view: [-6.5, 9.6, -8.4, 4.0],
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
  train: {
    at: [-28.6, -3.9],
    turn: 90,
    scale: 1.18,
    level: 1,
    walk: [-17, 17, -1.2, 4.6],
    view: [-17, 17, -4.6, 4.6],
    anchor: 'the car in the middle of the platform shed as drawn, its walkway end toward the station',
  },
};

// Buildings around the route: each traced building's footprint (buildings.json: its roof in the picture moved down
// by its drawn height, then through REF), squared onto the grid: its middle kept, each side's length on the grid
// axis nearest it. Storeys from the drawn height. Each row: id, kind, storeys, floorH (units a storey), wall (an
// index into TOWN.walls, scenes/town.js), roof colour, windows ('office' | 'flat' | 'dorm' | 'shop'), and the
// footprint: four numbers are a rect [x0, z0, x1, z1], more are a poly's corners x, z, ... clockwise from the
// north-west. The route's own buildings are set by hand (the station on the gate room, the tower, the shop street
// as one street, Eric's block and its neighbour on the dorm court's frame); see DETAILS. Traced by eye, and the
// map's own angles are loose (its town is drawn between 0° and 25° off its grid), so a unit or two out.
const ROOF = '#5d636c',
  DORM_ROOF = '#555a63',
  SHOP_ROOF = '#7a7f87',
  BLUE_ROOF = '#56697d';
const ROWS = [
  ['station', 'station', 2, 1.9, 1, ROOF, 'flat', [-20.75, 2, -8.15, 11]],
  ['platform_shed', 'shed', 1, 2.4, 2, BLUE_ROOF, 'flat', [-32.6, -24.4, -24.6, 14]],
  ['head_office', 'tower', 12, 2, 0, ROOF, 'office', [-4.9, -13.85, 11.5, -4.25]],
  ['head_office_wing', 'office', 5, 2, 1, ROOF, 'office', [-14, -11.9, -8.2, -7.3]],
  ['canteen', 'canteen', 2, 2.1, 1, BLUE_ROOF, 'flat', [22.535, -28.8, 45.235, -20.5]],
  ['clinic', 'clinic', 3, 2, 0, ROOF, 'office', [25.4, -42.2, 36.1, -36.2]],
  ['shops_north', 'shop', 2, 1.45, 2, SHOP_ROOF, 'shop', [-4, 13.4, 64.5, 17.9]],
  ['arcade', 'arcade', 1, 2.9, 1, '#9aa4ad', 'flat', [-4, 17.9, 64.5, 22.4]],
  ['shops_south', 'shop', 2, 1.45, 3, SHOP_ROOF, 'shop', [-4, 22.4, 64.5, 26.9]],
  ['izakaya', 'shop', 3, 1.6, 3, SHOP_ROOF, 'shop', [66.6, 13.4, 70.6, 17.9]],
  ['ramen', 'shop', 3, 1.6, 0, SHOP_ROOF, 'shop', [76.6, 13.4, 82, 18.4]],
  [
    'dorm_1',
    'dorm',
    5,
    1.75,
    1,
    DORM_ROOF,
    'dorm',
    [84.14, -11.8, 88.29, -11.8, 88.29, 8.1, 78.84, 8.1, 78.84, 4.6, 84.14, 4.6],
  ],
  ['dorm_1e', 'dorm', 7, 1.75, 1, DORM_ROOF, 'dorm', [89.44, -7.8, 94.2, 7.1]],
  ['sento_laundry', 'low', 1, 2, 3, DORM_ROOF, 'shop', [83.6, 13.1, 89.3, 17.3]],
  ['nw_old', 'low', 4, 2, 3, ROOF, 'flat', [-96, -118.6, -85.4, -109.8]],
  ['chimney', 'low', 8, 2, 1, ROOF, 'flat', [-82, -123.3, -79, -118.1]],
  ['factory', 'low', 3, 2, 0, ROOF, 'flat', [-76.7, -128.8, -52.4, -114.5]],
  ['works_shed', 'low', 2, 2, 1, ROOF, 'flat', [-79.4, -111.9, -70.7, -106.2]],
  ['works_orange', 'low', 2, 2, 1, ROOF, 'flat', [-94.4, -100.7, -84.6, -95.3]],
  ['works_blue', 'low', 1, 2, 1, ROOF, 'flat', [-75.4, -101.8, -64.5, -97.6]],
  ['works_kiosk', 'low', 1, 2, 2, ROOF, 'flat', [-62.4, -113.8, -56.9, -107.5]],
  ['dock_shed', 'low', 2, 2, 0, ROOF, 'flat', [-84.2, -68, -74.4, -64.3]],
  ['dock_hut', 'low', 1, 2, 1, ROOF, 'flat', [-80.4, -79.2, -75.2, -76.2]],
  ['n1', 'office', 3, 2, 3, ROOF, 'office', [-60.1, -142.9, -38.7, -129.4]],
  ['n2', 'office', 4, 2, 0, ROOF, 'office', [-33, -144.1, -23.1, -129.4]],
  ['n3', 'office', 4, 2, 1, ROOF, 'office', [-22.6, -144.8, -12.9, -133]],
  ['n4', 'office', 6, 2, 2, ROOF, 'office', [-35.2, -107.1, -11.6, -99.8]],
  ['w2', 'office', 3, 2, 1, ROOF, 'office', [-45.8, -97.9, -35.4, -93.7]],
  ['n_coast', 'office', 1, 2, 3, ROOF, 'flat', [-16.9, -181.8, -12.6, -178.5]],
  ['w1', 'office', 4, 2, 0, ROOF, 'office', [-40.7, -61.4, -27.6, -56.2]],
  ['w3', 'office', 3, 2, 2, ROOF, 'office', [-34, -45.2, -24.3, -41.4]],
  ['m1', 'office', 4, 2, 2, ROOF, 'office', [-23.9, -69.3, -16.8, -64.9]],
  ['m2', 'office', 5, 2, 3, ROOF, 'office', [-10.1, -63.3, 0.3, -59.2]],
  ['m3', 'office', 4, 2, 0, ROOF, 'office', [6, -62.5, 14.9, -58.7]],
  ['m4', 'office', 5, 2, 1, ROOF, 'office', [17, -74.2, 26.9, -69.4]],
  ['m5', 'office', 3, 2, 2, ROOF, 'office', [17.3, -62.6, 26, -59.1]],
  ['m6', 'office', 5, 2, 3, ROOF, 'office', [13.6, -45, 23.2, -39.1]],
  ['b_h', 'office', 2, 2, 1, ROOF, 'office', [-7.1, -51.8, 2.5, -50]],
  ['office_e1', 'office', 4, 2, 0, ROOF, 'office', [12.8, -18.3, 20.1, -14.9]],
  ['gym', 'gym', 3, 2, 1, '#6f7d72', 'flat', [37.4, -76.2, 56.7, -50.9]],
  ['pool_hall', 'office', 2, 2, 2, ROOF, 'flat', [59.4, -94, 73.1, -87.1]],
  ['court_hall', 'office', 1, 2, 1, ROOF, 'flat', [75.6, -91.2, 85.8, -84.9]],
  ['stage', 'office', 3, 2, 0, ROOF, 'flat', [53.9, -127.5, 66.1, -123.8]],
  ['history_hall', 'office', 2, 2, 2, ROOF, 'flat', [81.4, -162.1, 101.6, -149.2]],
  ['statue', 'office', 4, 2, 2, ROOF, 'flat', [106, -153.9, 108.1, -150.9]],
  ['onsen_pav', 'office', 1, 2, 1, ROOF, 'flat', [122.1, -116.1, 130.1, -109]],
  ['onsen_main', 'office', 2, 2, 3, ROOF, 'flat', [117.6, -96.2, 128.6, -88.2]],
  ['block_e2', 'office', 4, 2, 0, ROOF, 'flat', [58.2, -38.5, 65.5, -35.2]],
  ['r3', 'office', 3, 2, 1, ROOF, 'flat', [72.9, -44.8, 78.3, -41.4]],
  ['housing_n', 'dorm', 4, 1.75, 2, DORM_ROOF, 'dorm', [78.7, -53.2, 102.5, -46.5]],
  ['dorm_5', 'dorm', 3, 1.75, 3, DORM_ROOF, 'dorm', [76.5, -37.2, 83.6, -18.4]],
  ['block_e3', 'office', 3, 2, 0, ROOF, 'flat', [71.6, -29.2, 76.4, -18]],
  ['block_e1', 'office', 2, 2, 1, ROOF, 'flat', [50.2, -19.6, 60.1, -12.6]],
  ['dorm_6', 'dorm', 4, 1.75, 2, DORM_ROOF, 'dorm', [108.4, -50.7, 114.9, -32.8]],
  ['dorm_2', 'dorm', 7, 1.75, 2, DORM_ROOF, 'dorm', [91.4, 12, 99.4, 18.3]],
  ['dorm_entry', 'dorm', 3, 1.75, 3, DORM_ROOF, 'dorm', [97.2, -13.3, 101.3, -9.4]],
  ['dorm_gallery', 'dorm', 2, 1.75, 1, DORM_ROOF, 'dorm', [96.8, -2.9, 105, 2.1]],
  ['dorm_3', 'dorm', 9, 1.75, 3, DORM_ROOF, 'dorm', [109, 0.7, 119.5, 6.5]],
  ['dorm_4', 'dorm', 9, 1.75, 0, DORM_ROOF, 'dorm', [116.3, -9.2, 125.4, -3.1]],
  ['dorm_annex', 'dorm', 1, 1.75, 3, DORM_ROOF, 'dorm', [125.4, -7.5, 128.1, -3.6]],
  ['r8', 'office', 2, 2, 2, ROOF, 'flat', [66.5, 3.4, 72.04, 7.6]],
  ['r9', 'office', 2, 2, 3, ROOF, 'flat', [71.6, -16.6, 76, -12.6]],
  ['m_e1', 'office', 2, 2, 2, ROOF, 'flat', [60.6, 3.4, 66, 8]],
  ['m_e2', 'office', 1, 2, 3, ROOF, 'flat', [52.6, 6, 57.7, 8.6]],
];
const DETAILS = {
  station:
    'Honsha station and its security room: the gate room’s footprint, centred on the station as traced (12.4 by 6.5); the gate room is deeper.',
  platform_shed:
    'The monorail platforms under one long curved blue-grey roof, on the grid; the beam comes into its south end.',
  head_office:
    'The tallest building: blue-grey curtain wall, pale fins, rooftop plant; entrance on the south face near the south-west corner.',
  head_office_wing: 'The lower wing west of the tower, across a service lane.',
  office_e1: 'North-east of the tower, behind the trees on the lane toward the fountain.',
  canteen:
    'The company canteen: two storeys, blue-grey roof with plant, umbrella terrace on its south side facing the fountain; placed so its door bay is on the fountain’s north-south axis and the terrace ends short of the plaza.',
  clinic:
    'The clinic (green cross), three storeys behind the canteen, set back from the back lane by its entrance court; its door in the middle of its south face.',
  gym: 'The gym’s arched roof (green on the reference, muted); the pool and courts east of it.',
  shops_north:
    'The north row: awnings to the arcade, bilingual rooftop signs, backs to the lane. One street on the grid.',
  arcade: 'The arcade roof over the walk between the rows.',
  shops_south: 'The south row, its back to the promenade and the sea.',
  izakaya: 'Izakaya at the east end of the shop street, by the way into the dorm court.',
  ramen: 'Ramen across the dorm street from the izakaya, its door on the street.',
  dorm_1:
    'Eric’s block, five storeys: its long west face on the dorm entrance court, returning west at its south end (built by the dorm_court chunk, square to it). The map draws the dorm blocks turned 25 to 40° off the grid; here they are on it.',
  dorm_1e: 'The block east of Eric’s, parallel to it; its west face is the wall outside Eric’s window, 1.3 out.',
  housing_n: 'The more generous block on the cluster’s quieter north edge.',
  sento_laundry:
    'Sento and coin laundry sharing one frontage at the dorm approach (placed by the brief; too small to read on the reference).',
  // the east lane's six small blocks (scenes/plaza/east-lane.js builds their fronts), squared onto its paths
  block_e1:
    'Two storeys of offices north of the lane past the plaza; its door in the middle of its south face, at the head of the cross path.',
  m_e2: 'A one-storey shop with a tiled roof; its door at the foot of the cross path, opposite block_e1’s.',
  m_e1: 'Two storeys, a café on the ground floor fronting the south walk.',
  r8: 'Two storeys; its door on the pocket park’s north-south axis, across the south walk.',
  r9: 'A two-storey house on the north street’s east side, south of block_e3, its door on that street.',
  block_e3: 'Three storeys on the north street’s east side; its door on that street.',
  block_e2:
    'Four storeys of offices on the back lane’s north side; its door in the middle of its south face, on a short walk.',
  m6: 'Five storeys of offices north of the canteen’s loading yard; its door in the middle of its south face, on a walk from the yard.',
  r3: 'Three storeys on the north street’s east side, north of block_e3; its door on that street.',
};
const pairs = (f) => f.reduce((a, v, i) => (i % 2 ? a[a.length - 1].push(v) : a.push([v]), a), []);
export const BUILDINGS = ROWS.map(([id, kind, storeys, floorH, wall, roof, windows, f]) => ({
  id,
  kind,
  ...(f.length === 4 ? { rect: f } : { poly: pairs(f) }),
  storeys,
  floorH,
  wall,
  roof,
  windows,
  detail: DETAILS[id] || '',
}));

// Walking surfaces. line: a centre line (x, z, ...) and width w; rect: [x0, z0, x1, z1]; circle: [x, z, r].
// Every line runs along the grid and turns at right angles; a turn is a square of paving as wide as the line.
// No roads, no cars.
export const PATHS = [
  {
    id: 'court',
    kind: 'court',
    rect: [-20.75, -4.25, 5, 2],
    detail: 'The open station forecourt between the station’s north door and the head office’s south door.',
  },
  {
    id: 'bike_court',
    kind: 'court',
    rect: [-8.15, 2, 0.25, 9.95],
    detail: 'The bike court east of the station.',
  },
  {
    id: 'route_home',
    kind: 'lane',
    w: 3,
    line: pairs([-1.7, -2.75, 64, -2.75, 64, -10, 74.54, -10, 74.54, -0.8, 79.34, -0.8]),
    detail:
      'From the head office door (the lane’s north edge), east along the tower’s south face and straight on through the fountain plaza (it meets the circle on the fountain’s east-west axis, in on the west, out on the east), on east past the plaza, a jog north beyond it, east to the dorms, then south as the street past the dorm entrance court, turning in through the court’s gate on the axis of the dorm’s hall doors.',
  },
  {
    id: 'fountain_plaza',
    kind: 'plaza',
    circle: [37.29, -2.75, 11.5],
    detail:
      'The round paved plaza; the basin is about 8.6 across on the reference. Its centre sits on the lane’s axis, 2.4 south of where the reference draws it, so the lane runs straight in and out and the canteen’s terrace stays clear of it.',
  },
  ...EAST_PATHS, // the east lane (scenes/island-east.js)
  ...WEST_PATHS, // the coast path west of the station (scenes/island-west.js)
  ...NORTH_PATHS, // the back lane behind the canteen (scenes/island-north.js)
  {
    id: 'promenade',
    kind: 'promenade',
    w: 4,
    line: pairs([-15.1, 31.3, 33.3, 42.8, 63.6, 37, 97.5, 26.5, 123.7, 11.5]),
    detail: 'The seafront promenade behind the shops and the dorms; it follows the sea wall.',
  },
  {
    id: 'beam',
    kind: 'beam',
    w: 2,
    line: pairs([-73.4, 41.8, -45, 31.5, -37, 28.5, -32.5, 25.5, -30.8, 22, -30.8, 14]),
    detail: 'The monorail beam, raised on piers, curving in from the west-south-west into the shed’s south end.',
  },
];

// Planting, coarse: only what frames the route.
export const GREEN = [
  {
    id: 'tower_trees',
    rect: [12.5, -13, 24, -3.5],
    detail: 'Trees and beds between the tower and the plaza, south of office_e1.',
  },
  {
    id: 'lane_verge',
    poly: pairs([5, -1.25, 65.5, -1.25, 65.5, 13.4, -4, 13.4, -4, 11, 5, 11]),
    detail: 'The verge between the lane and the shop street’s back.',
  },
  ...EAST_GREEN,
  ...WEST_GREEN,
  ...NORTH_GREEN,
  {
    id: 'dorm_inner_court',
    rect: [95, 2.6, 108.5, 11.5],
    detail: 'The planted inner court between the dorm blocks.',
  },
];

// The coastline on the route's side of the island, land north-east of the line (sea south and west).
export const COAST = {
  line: pairs([
    -56.8, -32.9, -50.5, -10, -44.9, 10.7, -38, 24.5, -30.4, 33, -13.6, 42.3, -1, 50.1, 18.4, 53.1, 41, 51.4, 60.7, 45,
    86, 38, 110.9, 31.1, 129.9, 19.4, 136.6, 2, 136.8, -26.1, 130.4, -47.8,
  ]),
  detail: 'Rocks and a sea wall, with the sand beach south of the shop street’s west end.',
};

// a chunk's local point on the island, and back
export function toIsland(chunk, x, z) {
  const c = CHUNKS[chunk];
  const r = (c.turn * Math.PI) / 180,
    cs = Math.cos(r),
    sn = Math.sin(r);
  const lx = x * c.scale,
    lz = z * c.scale;
  return [c.at[0] + lx * cs - lz * sn, c.at[1] + lx * sn + lz * cs];
}
export function toLocal(chunk, x, z) {
  const c = CHUNKS[chunk];
  const r = (c.turn * Math.PI) / 180,
    cs = Math.cos(r),
    sn = Math.sin(r);
  const dx = x - c.at[0],
    dz = z - c.at[1];
  return [(dx * cs + dz * sn) / c.scale, (-dx * sn + dz * cs) / c.scale];
}

// a building's footprint as a polygon, whichever way it is given
export function footprint(b) {
  if (b.poly) return b.poly;
  const [x0, z0, x1, z1] = b.rect;
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}
