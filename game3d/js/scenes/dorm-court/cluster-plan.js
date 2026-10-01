// The dorm cluster's plan (dorm-court/cluster.js): the blocks round the inner court east of the dorm courtyard, their
// street and walks, from the island layout (scenes/island-layout.js, scenes/island-dorms.js), in the island frame as
// [x0, x1, z0, z1] (x east, z south). The builder works in this frame and is turned into a place's own by
// placeIn() (cluster.js).
//
// One grid, the lane's. The dorm row leaves the dorm street just south of the courtyard's gate and runs east along
// the south end of Eric's block and the inner court, to a bed across its end. Two axes cross the inner court:
//   north-south, dorm_gallery's door axis: through the court, over the row, to dorm_2's door
//   east-west: from dorm_1e's door to dorm_3's
// where they cross, a paved square with a maple in a raised bed. A link runs north out of the court's north-east
// corner to the back walk, which joins dorm_entry's walk to dorm_4's door. South of the row, between the ramen shop
// and dorm_2, a lawn with trees.
import * as LAYOUT from '../island-layout.js';

const path = (id) => LAYOUT.PATHS.find((p) => p.id === id);
const green = (id) => LAYOUT.GREEN.find((g) => g.id === id);
const building = (id) => LAYOUT.BUILDINGS.find((b) => b.id === id);
// a layout rect [x0, z0, x1, z1] as [x0, x1, z0, z1]
const rect = ([x0, z0, x1, z1]) => [x0, x1, z0, z1];

export const DORM_STREET = rect(path('dorm_street').rect); // the east lane's last leg (plaza/east-lane.js)
export const ROW = rect(path('dorm_row').rect);
export const SQUARE_END = rect(path('row_square').rect);
export const SEA_WALK = rect(path('sea_walk').rect);
export const TERRACE = rect(path('sea_terrace').rect);
export const NS = rect(path('court_walk_ns').rect);
export const EW = rect(path('court_walk_ew').rect);
export const LINK = rect(path('court_link').rect);
export const BACK = rect(path('back_walk').rect);
export const ENTRY = rect(path('entry_walk').rect);
export const COURT = rect(green('dorm_inner_court').rect);
export const GARDEN = rect(green('dorm_row_garden').rect);
export const AXIS_X = (NS[0] + NS[1]) / 2;
export const AXIS_Z = (EW[2] + EW[3]) / 2;
// the square where the court's walks cross, and the raised bed in its middle
export const SQUARE = [AXIS_X - 2.2, AXIS_X + 2.2, AXIS_Z - 2.2, AXIS_Z + 2.2];
export const PLANTER = [AXIS_X - 0.75, AXIS_X + 0.75, AXIS_Z - 0.75, AXIS_Z + 0.75];
// the ends of Eric's block (dorm_1, its return) and dorm_1e along the row's north side
export const DORM_1_SOUTH = 8.1;

// the blocks, each with its door: the face it is on and where along it (x on a north or south face, z on a west or
// east one); ground floors as in plaza/east-fronts.js; balconies on the faces given
const b = (id) => rect(building(id).rect);
export const BLOCKS = [
  { id: 'dorm_1e', face: 'e', at: AXIS_Z, ground: 'dorm', wall: 1, balconies: 'e' },
  { id: 'dorm_gallery', face: 's', at: AXIS_X, ground: 'dorm', wall: 3 },
  {
    id: 'dorm_3',
    face: 's',
    at: (SQUARE_END[0] + SQUARE_END[1]) / 2,
    also: [{ face: 'w', at: AXIS_Z }],
    ground: 'dorm',
    wall: 0,
    balconies: 's',
  },
  { id: 'dorm_2', face: 'n', at: AXIS_X, ground: 'dorm', wall: 2, balconies: 's' },
  { id: 'dorm_entry', face: 's', at: (ENTRY[0] + ENTRY[1]) / 2, ground: 'dorm', wall: 1 },
  { id: 'dorm_4', face: 'w', at: (BACK[2] + BACK[3]) / 2, ground: 'dorm', wall: 2, balconies: 's' },
  { id: 'dorm_annex', face: null, ground: 'house', wall: 3 },
].map((k) => ({ ...k, rect: b(k.id), row: building(k.id) }));
export const BLOCK_IDS = BLOCKS.map((k) => k.id);
// Eric's block (dorm_1), for the plaza, which doesn't build the courtyard: its long block and its return, plain,
// with the court side's open corridors as a balcony row (the courtyard builds the real one, dorm-court/block.js)
const D1 = building('dorm_1');
export const DORM_1_PARTS = [
  { id: 'dorm_1', rect: [84.14, 88.29, -11.8, 8.1], face: null, ground: 'house', wall: 1, balconies: 'ws' },
  { id: 'dorm_1', rect: [78.84, 84.14, 4.6, 8.1], face: null, ground: 'house', wall: 1, balconies: 'ws' },
].map((k) => ({ ...k, row: D1 }));
// a block's doors: where each is on its face, the face's outward normal and its direction along
export function doorsOf(k) {
  const out = [];
  for (const d of [k.face && k, ...(k.also || [])].filter(Boolean)) {
    const [x0, x1, z0, z1] = k.rect;
    const n = { s: [0, 1], n: [0, -1], w: [-1, 0], e: [1, 0] }[d.face];
    const x = d.face === 'w' ? x0 : d.face === 'e' ? x1 : d.at,
      z = d.face === 'n' ? z0 : d.face === 's' ? z1 : d.at;
    out.push({ x, z, n, along: n[0] ? [0, 1] : [1, 0] });
  }
  return out;
}
export const block = (id) => BLOCKS.find((k) => k.id === id).rect;
export const inRect = (x, z, [x0, x1, z0, z1], m = 0) => x > x0 + m && x < x1 - m && z > z0 + m && z < z1 - m;
