// The shop street's plan (scenes/shotengai.js): the walkable streets of the shop street and seafront district
// (docs/game/island.md), in the island frame, from scenes/island-south.js and the island layout, and their rects in
// the chunk's own frame. The chunk is turned 270° (island-layout.js CHUNKS), so its camera looks west down the
// arcade: local north is island west, local east is island north.
//
//   the arcade: the walk between the two shop rows, from the west mouth to the east mouth, between the rows' posts
//   the shop walk: on east out of the arcade past the izakaya's door to the dorm street, where Eric comes in from
//   the plaza and leaves for it (or, after work, for the dorm courtyard up the street)
//   the mouths' walks: from head office's bicycle court down the rows' west end to the arcade and promenade,
//   and down from the shop walk to the promenade's east end
//   the alleys: three, one bay wide, through the south row from the arcade to the promenade
//   the promenade: from the walk down from the station (not walked) east to the lookout; the stairs down to the beach
//   are chained off at their heads, the beach is seen and not walked
import * as LAYOUT from '../island-layout.js';
import * as S from '../island-south.js';
import { LOOKOUT_GAP } from '../outdoor/seafront.js';
import { WALKS_LOCAL, BENCH_BLOCKS, TOOL_BLOCK } from '../station-garden/plan.js';
import { nookWalks } from '../outdoor/nook-walks.js';

export const CHUNK = 'shotengai';
const path = (id) => LAYOUT.PATHS.find((p) => p.id === id);
export const building = (id) => LAYOUT.BUILDINGS.find((b) => b.id === id);
export const local = ([x, z]) => LAYOUT.toLocal(CHUNK, x, z);
// an island rect [x0, z0, x1, z1] as the chunk's [x0, x1, z0, z1]
export const rect = ([x0, z0, x1, z1]) => {
  const [a, b] = local([x0, z0]),
    [c, d] = local([x1, z1]);
  return [Math.min(a, c), Math.max(a, c), Math.min(b, d), Math.max(b, d)];
};

const { ROWS_Z, BAYS, LINKS, ALLEYS, PROMENADE, WALL_Z } = S;
export const ROW_W = BAYS.x0, // the rows' west and east ends
  ROW_E = BAYS.x0 + BAYS.w * BAYS.n;
// island rects [x0, z0, x1, z1]
export const ARCADE = [ROW_W, ROWS_Z.arcade, ROW_E, ROWS_Z.south];
export const SHOP_WALK = path('arcade_end').rect;
export const DORM_STREET = path('dorm_street').rect;
export const WEST_WALK = LINKS.west;
export const EAST_WALK = LINKS.east;
export const PROM = [PROMENADE[0], PROMENADE[1], PROMENADE[2], WALL_Z - 0.2]; // east of the walk down from the station
export { ALLEYS };

// the arcade's posts, both sides, every bay (plaza-buildings.js shopStreet puts them 1 into each bay, 0.35 off
// the fronts)
export const POSTS = [];
for (let x = ROW_W + 1; x < ROW_E; x += BAYS.w)
  for (const z of [ROWS_Z.arcade + 0.35, ROWS_Z.south - 0.35]) POSTS.push([x, z]);

// the doors of the shops with a name, each { id, at: [x, z] on the front, out: the way the door faces (+1 south,
// -1 north) }: the shop rows' from island-south.js SHOPS, the izakaya's on the shop walk
export const DOORS = [
  ...S.SHOPS.map(({ id, row, door }) => ({
    id,
    at: [S.bayMid(door), row === 'north' ? ROWS_Z.arcade : ROWS_Z.south],
    out: row === 'north' ? 1 : -1,
  })),
  (({ rect: [x0, , x1, z1] }) => ({ id: 'izakaya', at: [(x0 + x1) / 2, z1], out: 1 }))(building('izakaya')),
];

// where Eric comes in from the plaza (the dorm street's edge) and the point on the shop walk he walks to; the exit
// zone: on the dorm street, past the shop walk's end
export const STREET_X = (DORM_STREET[0] + DORM_STREET[2]) / 2;
export const WALK_Z = (SHOP_WALK[1] + SHOP_WALK[3]) / 2;
export const EDGE = [STREET_X, WALK_Z];
export const IN = [SHOP_WALK[2] - 3.2, WALK_Z];
export const EXIT_X = SHOP_WALK[2] - 0.6; // island x past which he is leaving

// the chained heads of the beach stairs: [x0, x1] each, on the wall's line
export const CHAINS = S.STAIRS.map(([x0, , x1]) => [x0, x1]);

// the walkable rects in the chunk's frame, and the promenade's furniture to keep clear of
// the nooks (outdoor/nooks.js), in the chunk's frame: a roadside shrine on the lawn at the arcade's west mouth, its
// pines behind it; the back of the shops in the middle alley, along its west wall; a bench under the pines past the
// lookout's east rail, through the gap in it, looking at the sea
const [GX0, GX1] = [local([0, LOOKOUT_GAP[1]])[0], local([0, LOOKOUT_GAP[0]])[0]],
  END_Z = local([PROMENADE[2], 0])[1];
const MID = rect(ALLEYS[1]);
export const NOOKS = [
  {
    id: 'shotengai_shrine',
    kit: 'shrine',
    at: [-0.9, -71.0],
    face: Math.PI,
    tree: null,
    walks: [[-2.0, 0.2, -72.0, -69.9]],
    pads: [[-2.0, 0.2, -72.0, -70.05]],
  },
  {
    id: 'shotengai_back_alley',
    kit: 'alley',
    at: [(MID[0] + MID[1]) / 2, MID[3] - 0.75],
    face: Math.PI,
    back: MID[3] - MID[2] - 0.8,
    len: MID[1] - MID[0] - 0.4,
  },
  {
    id: 'shotengai_pine_bench',
    kit: 'bench',
    at: [GX1 + 0.8, END_Z + 1.8],
    face: -Math.PI / 2,
    out: true,
    back: false,
    sides: 'none',
    tree: null,
    walks: [
      [GX0 + 0.05, GX1 - 0.05, END_Z - 0.4, END_Z + 0.3],
      [GX0 + 0.05, GX1 + 1.8, END_Z + 0.05, END_Z + 2.9],
    ],
    pads: [[GX0 + 0.05, GX1 + 1.8, END_Z + 0.05, END_Z + 2.9]],
  },
];
export const WALKS = [
  ...[ARCADE, SHOP_WALK, WEST_WALK, EAST_WALK, ...ALLEYS, PROM].map(rect),
  ...nookWalks(NOOKS),
  ...WALKS_LOCAL,
];
export const STREET_END = rect([SHOP_WALK[2] - 0.1, SHOP_WALK[1], DORM_STREET[2], SHOP_WALK[3]]); // out onto the street
export const FURNITURE = [
  ...S.LAMP_X.map((x) => [x - 0.15, S.FURNITURE_Z - 0.15, x + 0.15, S.FURNITURE_Z + 0.15]),
  ...S.BENCH_X.map((x) => [x - 0.95, S.BENCH_Z - 0.75, x + 0.95, S.BENCH_Z + 0.55]),
  ...S.BENCH_X.filter((_, i) => i % 2).map((x) => [x + 0.95, S.BENCH_Z - 0.25, x + 1.85, S.BENCH_Z + 0.25]),
]
  .map(rect)
  .concat(BENCH_BLOCKS, [TOOL_BLOCK]);
export const inRect = (x, z, [x0, x1, z0, z1], m = 0) => x > x0 + m && x < x1 - m && z > z0 + m && z < z1 - m;
