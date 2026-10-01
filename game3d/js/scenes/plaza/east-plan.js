// The east lane's plan (plaza/east-lane.js): the ground between the fountain plaza and the dorm courtyard, from the
// island layout (scenes/island-layout.js: route_home's jog, the east paths, the pocket park and the small
// blocks), in the plaza's frame as [x0, x1, z0, z1] like the rest of the plaza's plan.
//
// One grid. The lane leaves the plaza east on the fountain's axis and turns north at the jog; its top leg runs east
// and turns south as the dorm street, past the dorm courtyard's gate. Every turn is a square of paving as wide as the
// lane. Two axes cross the jog:
//   north-south, the north street: it meets the top leg square on, runs on through the pocket park as a walk to the
//   south walk, and ends at r8's door
//   east-west, the lane's own axis: from the jog's first corner a walk runs on through the park to the dorm street
// Where they cross, in the middle of the park, a gravel square with one tree and benches. The cross walk runs over
// the lane between two avenue trees from block_e1's door to m_e2's; the south walk runs along the fronts of m_e1, r8
// and r9 from the cross walk to the dorm street. Streets are 3 wide (the lane's width), walks 1.5.
import * as LAYOUT from '../island-layout.js';
import { local, building, HALF } from './plan.js';

const path = (id) => LAYOUT.PATHS.find((p) => p.id === id);
const green = (id) => LAYOUT.GREEN.find((g) => g.id === id);
// a layout rect [x0, z0, x1, z1] (island) as [x0, x1, z0, z1] in the plaza's frame
export const rect = ([x0, z0, x1, z1]) => {
  const [a, b] = local([x0, z0]),
    [c, d] = local([x1, z1]);
  return [a, c, b, d];
};

// route_home past the plaza: its corners (local), the jog's legs
const ROUTE = path('route_home').line.map(local);
const [, A, B, C] = ROUTE; // the jog: A turn north, B turn east, C turn south
const sq = ([x, z]) => [x - HALF, x + HALF, z - HALF, z + HALF];
export const CORNERS = { a: sq(A), b: sq(B), c: sq(C) };
export const GATE_Z = ROUTE[4][1]; // the dorm courtyard's gate leg, east off the dorm street
export const DORM_ROW = rect(path('dorm_row').rect); // the dorm cluster's street, east off it (dorm-court/cluster.js)
export const WEST_LEG = [A[0] - HALF, A[0] + HALF, B[1] + HALF, A[1] - HALF];
export const TOP_LEG = [B[0] + HALF, C[0] - HALF, B[1] - HALF, B[1] + HALF];
export const DORM_STREET = (([x0, x1, , z1]) => [x0, x1, CORNERS.c[3], z1])(rect(path('dorm_street').rect));
export const NORTH_STREET = rect(path('north_street').rect);
export const CROSS = rect(path('east_cross').rect);
export const CROSS_X = [CROSS[0], CROSS[1]];
export const SOUTH_WALK = rect(path('south_walk').rect);
export const PARK = rect(green('pocket_park').rect);
export const PARK_EW = rect(path('park_walk_ew').rect);
export const PARK_NS = rect(path('park_walk_ns').rect);
// the gravel square where the park's walks cross, 5 across
export const SQUARE = (() => {
  const cx = (PARK_NS[0] + PARK_NS[1]) / 2,
    cz = (PARK_EW[2] + PARK_EW[3]) / 2;
  return [cx - 2.5, cx + 2.5, cz - 2.5, cz + 2.5];
})();

// the blocks along it, each with its door: the face it is on and where along it (null: the face's middle).
// Ground floors: 'office' (a glazed entrance under a canopy, window bands), 'cafe' (a glazed front, an awning),
// 'shop' (a shopfront and a noren-hung door), 'house' (a door and a small window, a light over it); tiled: a tiled
// roof instead of a flat one
const b = (id) => rect(building(id).rect);
export const BLOCKS = [
  // block_e1: the new-staff training centre, its sign on the canopy (its door is a thing, places/plaza.js)
  {
    id: 'block_e1',
    face: 's',
    at: (CROSS[0] + CROSS[1]) / 2,
    ground: 'office',
    wall: 1,
    sign: ['けんしゅう', 'NEW STAFF TRAINING'],
    dark: true,
  },
  { id: 'm_e2', face: 'n', at: (CROSS[0] + CROSS[1]) / 2, ground: 'shop', wall: 3, tiled: true },
  { id: 'm_e1', face: 'n', at: null, ground: 'cafe', wall: 0 },
  { id: 'r8', face: 'n', at: (PARK_NS[0] + PARK_NS[1]) / 2, ground: 'office', wall: 2 },
  { id: 'r9', face: 'w', at: null, ground: 'house', wall: 3 },
  { id: 'block_e3', face: 'w', at: null, ground: 'office', wall: 0 },
  { id: 'r3', face: 'w', at: null, ground: 'office', wall: 1 },
  { id: 'izakaya', face: 's', at: null, ground: 'shop', wall: 3 },
  { id: 'ramen', face: 'w', at: null, ground: 'shop', wall: 1 },
].map((k) => ({ ...k, rect: b(k.id), row: building(k.id) }));
export const BLOCK_IDS = BLOCKS.map((k) => k.id);
for (const k of BLOCKS)
  if (k.at == null) k.at = k.face === 'w' || k.face === 'e' ? (k.rect[2] + k.rect[3]) / 2 : (k.rect[0] + k.rect[1]) / 2;
// the doors set back from a street: a short walk from its edge (block_e3 on the north street, the ramen shop on
// the dorm street)
const spur = (id, x0) => {
  const k = BLOCKS.find((q) => q.id === id);
  return [x0, k.rect[0], k.at - 0.75, k.at + 0.75];
};
export const SPURS = [
  spur('block_e3', NORTH_STREET[1]),
  spur('r9', NORTH_STREET[1]),
  spur('ramen', DORM_STREET[1]),
  spur('r3', NORTH_STREET[1]),
];
export const ARCADE_END = rect(path('arcade_end').rect);
// block_e1's bike pad: along its front from its west end to the cross walk
export const BIKE_PAD = ((r) => [r[0] + 0.3, CROSS[0], r[3], r[3] + 2.2])(BLOCKS[0].rect);
// a seat bay east of the cross walk, between block_e1's bed and the lane's avenue
export const SEAT_BAY = ((r) => [CROSS[1], CROSS[1] + 2.8, r[3] + 2.0, r[3] + 3.2])(BLOCKS[0].rect);

// the avenue: zelkovas every 4 along the north street's west side, from the top leg north
export const STREET_TREES = (() => {
  const out = [];
  for (let z = NORTH_STREET[3] - 2.5; z > NORTH_STREET[2] + 4; z -= 4) out.push(z);
  return out;
})();
export const inRect = (x, z, [x0, x1, z0, z1], m = 0) => x > x0 + m && x < x1 - m && z > z0 + m && z < z1 - m;
