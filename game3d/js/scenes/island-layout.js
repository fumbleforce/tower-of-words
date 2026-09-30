// The island in one shared frame: where each built place (chunk) sits, and the buildings, paths, green and coast
// around the day-1 route, traced from the picked island map (reviews/island-map-4,
// art/candidates/island-map-4/01-overview.png). Pure data plus helpers: chunk builders cut their background from
// BUILDINGS, and the island map's compare view (js/map/, ?mapcompare=1) draws all of it over the reference.
// The chunk table's home is docs/game/places.md ("Where the places sit on the island"); CHUNKS follows it and
// `node tools/facts/check.mjs` compares the two. The gaps between this layout and the built places are listed in
// notes/map-gaps.md.
//
// Frame: 1 unit = UNIT metres. x runs east, z runs south; north is the reference's up once its ground is
// rectified (REF). Origin: the head office's entrance door as the reference draws it.

export const UNIT = 1.5;

// The reference is a perspective view from the south: a camera whose horizon lies above the image. REF maps its
// ground plane to the island frame. horizon (image row), focal (px) and centre (image column) come from the ground
// squash, measured on the fountain's round ring (0.72 at row 612) and the football pitch (0.54 at row 165); k
// sets the scale so the station, as drawn, is as long as the gate room (12.6 units); x0 and d0 put the origin on
// the head office door (505, 571). D is the ground distance north of the camera line.
export const REF = {
  image: '/art/candidates/island-map-4/01-overview.png',
  size: [1536, 1024],
  horizon: -1176,
  focal: 2483.3,
  centre: 768,
  k: 746579,
  x0: 45.26,
  d0: 427.35,
};
// image pixel -> island point, and back
export function fromImage(u, v, R = REF) {
  const D = R.k / (v - R.horizon);
  return [R.x0 + ((u - R.centre) * D) / R.focal, R.d0 - D];
}
export function toImage(x, z, R = REF) {
  const D = R.d0 - z;
  return [R.centre + (R.focal * (x - R.x0)) / D, R.horizon + R.k / D];
}

// Each built place: at = the island point of its local (0, 0); turn = clockwise degrees on the map (local north to
// island north); scale (the train is built at people scale 1, the rest at 1.18); level (0 ground, -2 B2, 1 upstairs);
// walk = its walkable rectangle and view = the part drawn on the map, both local [x0, x1, z0, z1];
// anchor = what pins it to the reference.
export const CHUNKS = {
  gate: {
    at: [-15.14, 0],
    turn: 0,
    scale: 1,
    level: 0,
    walk: [-6.3, 6.3, -4.5, 4.5],
    view: [-6.5, 6.5, -4.6, 5.0],
    anchor: 'the room centred on the station building as drawn',
  },
  forecourt: {
    at: [-14.64, -7.15],
    turn: 0,
    scale: 1,
    level: 0,
    walk: [-4.7, 22.2, -3.6, 3.9],
    view: [-7.3, 31, -9.4, 8],
    anchor: 'the gate room (its exit is the station door at local (-1.5, 2.65))',
  },
  office: {
    at: [7.45, -4.99],
    turn: 0,
    scale: 1,
    level: -2,
    walk: [-7, 7, -6.4, 6.4],
    view: [-7, 7, -6.4, 6.4],
    anchor: 'its lift under the forecourt lift',
  },
  plaza: {
    at: [36.35, 12.5],
    turn: 0,
    scale: 1,
    level: 0,
    walk: [-6.6, 6.6, -5.4, 1.0],
    view: [-7.3, 7.3, -10.2, 5.4],
    anchor: 'the fountain on the fountain as drawn',
  },
  dorm_court: {
    at: [79.53, 30.59],
    turn: 0,
    scale: 1,
    level: 0,
    walk: [-5.1, 5.2, -4.1, 2.45],
    view: [-5.8, 5.6, -8.2, 4.0],
    anchor: 'the hall door on the dorm cluster’s west entrance court as drawn',
  },
  dorms: {
    at: [81.28, 25.19],
    turn: 0,
    scale: 1,
    level: 1,
    walk: [-0.97, 0.97, -2.6, 0.95],
    view: [-1.15, 1.15, -2.8, 1.15],
    anchor: 'in the dorm courtyard’s block, above the passage',
  },
  train: {
    at: [-20.84, -13.12],
    turn: 112,
    scale: 1.18,
    level: 1,
    walk: [-17, 17, -1.2, 4.6],
    view: [-17, 17, -4.6, 4.6],
    anchor: 'the car in the middle of the platform shed as drawn, its walkway end toward the station',
  },
};

// Buildings around the route, from the reference: its roof outlines moved down by the drawn wall height onto the
// ground, then through REF. Each row: id, kind, storeys, floorH (units a storey), wall (an index into TOWN.walls,
// scenes/town.js), roof colour, windows ('office' | 'flat' | 'dorm' | 'shop'), and the footprint: four numbers are
// a rect [x0, z0, x1, z1] square to the frame, more are a poly's corners x, z, ... clockwise from the north-west.
// Storeys come from the drawn window rows. Traced by eye, so a unit or two out.
const ROOF = '#5d636c',
  DORM_ROOF = '#555a63',
  SHOP_ROOF = '#7a7f87',
  BLUE_ROOF = '#56697d';
const ROWS = [
  ['station', 'station', 2, 1.9, 1, ROOF, 'flat', [-21.44, -4.5, -8.84, 4.5]],
  ['platform_shed', 'shed', 1, 2.4, 2, BLUE_ROOF, 'flat', [-16.2, -36.9, -9.4, -29.6, -25.7, 10, -32.2, 3.9]],
  ['head_office', 'tower', 12, 2, 0, ROOF, 'office', [1.6, -13.4, 15.3, -7.5, 10.8, -0.2, -2.7, -6]],
  ['head_office_wing', 'office', 4, 2, 1, ROOF, 'office', [-11.9, -28.2, -3.2, -22.7]],
  ['office_w1', 'office', 2, 2, 2, ROOF, 'office', [-16.6, -60.6, -4, -51.2]],
  ['office_n1', 'office', 3, 2, 0, ROOF, 'office', [-16.1, -75.1, -1.5, -66.8]],
  ['office_n2', 'office', 3, 2, 3, ROOF, 'office', [1.2, -78.8, 10.7, -70.4]],
  ['office_n3', 'office', 4, 2, 1, ROOF, 'office', [13.2, -66.1, 24.8, -55.6]],
  ['office_n4', 'office', 4, 2, 0, ROOF, 'office', [27.4, -58.1, 37.9, -49.7]],
  ['office_n5', 'office', 4, 2, 2, ROOF, 'office', [41.7, -65.1, 54.3, -55.6]],
  ['office_n6', 'office', 3, 2, 3, ROOF, 'office', [38.3, -51.2, 48.3, -43.7]],
  ['office_n7', 'office', 4, 2, 1, ROOF, 'office', [26, -40.7, 38.5, -31.2]],
  ['garage', 'low', 1, 2, 3, ROOF, 'flat', [12.4, -51.8, 22, -48.2]],
  ['office_e1', 'office', 3, 2, 0, ROOF, 'office', [16.6, -12.8, 25.4, -6]],
  ['canteen', 'canteen', 2, 2.1, 1, BLUE_ROOF, 'flat', [28, -14.4, 51.3, -4.2]],
  ['clinic', 'clinic', 3, 2, 0, ROOF, 'office', [36, -25.7, 48.2, -19.4]],
  ['gym', 'gym', 2, 2, 1, '#6f7d72', 'flat', [55.4, -54, 79.6, -27.6]],
  ['block_e1', 'office', 3, 2, 2, ROOF, 'flat', [57.3, 8.6, 66.9, 14.9]],
  ['block_e2', 'office', 3, 2, 3, ROOF, 'flat', [68.6, -14.2, 76.5, -7.2]],
  ['block_e3', 'office', 3, 2, 0, ROOF, 'flat', [73.3, -1.5, 79, 7.5]],
  ['shops_north', 'shop', 2, 1.45, 2, SHOP_ROOF, 'shop', [-8.69, 11.96, 57.15, 43.65, 55.63, 46.8, -10.21, 15.11]],
  ['arcade', 'arcade', 1, 2.9, 1, '#9aa4ad', 'flat', [-10.21, 15.11, 55.63, 46.8, 54.11, 49.96, -11.73, 18.27]],
  ['shops_south', 'shop', 2, 1.45, 3, SHOP_ROOF, 'shop', [-11.73, 18.27, 54.11, 49.96, 52.59, 53.11, -13.25, 21.42]],
  ['shop_e1', 'shop', 2, 1.45, 0, SHOP_ROOF, 'shop', [52.8, 27.7, 60.8, 31.5]],
  ['shop_e2', 'shop', 2, 1.45, 2, SHOP_ROOF, 'shop', [63, 31.9, 70.1, 37.7]],
  ['shop_e3', 'shop', 2, 1.45, 1, SHOP_ROOF, 'shop', [52.6, 38.7, 61.1, 44.1]],
  ['izakaya', 'shop', 2, 1.45, 3, SHOP_ROOF, 'shop', [61.3, 40.7, 69.5, 48]],
  ['dorm_1', 'dorm', 6, 1.75, 1, DORM_ROOF, 'dorm', [89.4, 27, 92, 29.8, 77.7, 38.1, 75.1, 35]],
  ['dorm_2', 'dorm', 7, 1.75, 1, DORM_ROOF, 'dorm', [83.6, 44.9, 86.9, 49.9, 80.2, 53.1, 77, 48]],
  ['dorm_3', 'dorm', 6, 1.75, 0, DORM_ROOF, 'dorm', [103.7, 37.1, 111.2, 45.7, 105.8, 48.6, 98.2, 39.7]],
  ['dorm_4', 'dorm', 6, 1.75, 2, DORM_ROOF, 'dorm', [114.4, 29.8, 120.5, 37.1, 115.3, 39.7, 109.3, 31.9]],
  ['dorm_5', 'dorm', 5, 1.75, 1, DORM_ROOF, 'dorm', [80.2, -4, 88.4, 15.6]],
  ['dorm_6', 'dorm', 5, 1.75, 0, DORM_ROOF, 'dorm', [115.2, -3.2, 123.2, 15.1]],
  ['housing_n', 'dorm', 4, 1.75, 3, DORM_ROOF, 'dorm', [90.6, -14.4, 114.7, -6.7]],
  ['sento_laundry', 'low', 1, 2, 3, DORM_ROOF, 'shop', [70.8, 45.7, 76.5, 49.9]],
];
const DETAILS = {
  station:
    'Honsha station and its security room: the gate room’s footprint. The reference draws it about 12 by 3, turned 23°.',
  platform_shed: 'The monorail platforms under one long curved blue-grey roof; the beam enters its south end.',
  head_office:
    'The tallest building: blue-grey curtain wall, pale fins, rooftop plant. Drawn turned 23°; entrance on the south face near the south-west corner.',
  head_office_wing: 'The lower wing north-west of the tower.',
  office_e1: 'East of the tower, on the lane toward the fountain.',
  canteen:
    'The company canteen: two storeys, blue-grey roof with plant, umbrella terrace on its south side facing the fountain.',
  clinic: 'The clinic (green cross).',
  gym: 'The gym’s arched roof (green on the reference, muted); the pool and courts east of it.',
  shops_north: 'The north row: about eight units, awnings to the arcade, bilingual rooftop signs.',
  arcade: 'The arcade roof over the lane between the rows.',
  shops_south: 'The south row, its back to the promenade and the sea.',
  shop_e3: 'Ramen and izakaya at the east end of the shop street, by the lane into the dorm court.',
  dorm_1: 'The block behind the dorm entrance court (Eric’s).',
  housing_n: 'The more generous block on the cluster’s quieter north edge.',
  sento_laundry:
    'Sento and coin laundry sharing one frontage at the dorm approach (placed by the brief; too small to read on the reference).',
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
// No roads, no cars.
export const PATHS = [
  {
    id: 'court',
    kind: 'court',
    rect: [-8.8, -5, 0, 4],
    detail: 'The open station forecourt between the station and the head office.',
  },
  {
    id: 'route_home',
    kind: 'lane',
    w: 3,
    line: pairs([0, 0, 16.7, 4.6, 26.4, 12.8, 36.6, 19.6, 50.5, 22.5, 63.4, 25.1, 72.9, 28.3, 80, 29.4]),
    detail: 'Head office door, along the fountain plaza’s south edge, east-south-east to the dorm entrance court.',
  },
  {
    id: 'fountain_plaza',
    kind: 'plaza',
    circle: [36.35, 9.8, 11.5],
    detail: 'The round paved plaza; the basin is about 8.6 across on the reference.',
  },
  {
    id: 'promenade',
    kind: 'promenade',
    w: 4,
    line: pairs([-26.1, 22.9, 13.9, 52.4, 44.1, 58.9, 79.4, 62.5, 109.4, 58.9]),
    detail: 'The seafront promenade behind the shops and the dorms.',
  },
  {
    id: 'beam',
    kind: 'beam',
    w: 2,
    line: pairs([-83.9, 9.8, -44.8, 7.7, -28.9, 7]),
    detail: 'The monorail beam, raised on piers, into the shed’s south end.',
  },
];

// Planting, coarse: only what frames the route.
export const GREEN = [
  {
    id: 'tower_trees',
    rect: [13, -4, 26, 3],
    detail: 'Trees and beds between the tower and the plaza, south of office_e1.',
  },
  {
    id: 'lane_verge',
    poly: pairs([0, 3, 26.4, 15.3, 36.6, 22.1, 36.6, 24, -4, 10]),
    detail: 'The verge between the lane and the shop street’s back.',
  },
  { id: 'dorm_inner_court', rect: [88, 32, 100, 44], detail: 'The planted inner court between the dorm blocks.' },
];

// The coastline on the route's side of the island, land north-east of the line (sea south and west).
export const COAST = {
  line: pairs([
    -39.4, -52.5, -42.6, -29, -45.5, -7.7, -44.6, 7.7, -40.9, 18.5, -29, 33.6, -20.5, 45.7, -3.8, 56.1, 17.7, 63.3,
    38.3, 65.1, 64.3, 68.6, 89.9, 72, 112, 68.6, 125, 55.2, 136.1, 29.4, 138.7, 7,
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
