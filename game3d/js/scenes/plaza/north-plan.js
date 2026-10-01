// North of the lane's plan (plaza/north-lane.js): the ground behind the canteen, from the island layout
// (scenes/island-north.js: the back lane, the canteen's yard and apron, the clinic's court, the walks to block_e2 and
// m6, the grove), in the plaza's frame as [x0, x1, z0, z1] like the rest of the plaza's plan.
//
// One grid. The back lane runs east-west behind the canteen, 3 wide like every street, from the canteen's loading
// yard at its west end to the north street (plaza/east-plan.js), which it meets square on. The yard lies against the
// canteen's west face, its roller shutter, and a walk leaves its north edge for m6's door. Along the lane's south side
// the canteen's apron: the kitchen door, the duct, the condensers. Along its north side the lane's verge and avenue,
// opened for two doors: the clinic's, on a small entrance court centred on it, and block_e2's, on a walk.
import * as LAYOUT from '../island-layout.js';
import { building } from './plan.js';
import { rect } from './east-plan.js';

const path = (id) => LAYOUT.PATHS.find((p) => p.id === id);
export const BACK = rect(path('back_lane').rect);
export const APRON = rect(path('canteen_apron').rect);
export const YARD = rect(path('canteen_yard').rect);
export const M6_WALK = rect(path('m6_walk').rect);
export const GROVE_WALK = rect(path('grove_walk').rect);
export const SQUARE = rect(path('grove_square').rect);
export const COURT = rect(path('clinic_court').rect);
export const E2_WALK = rect(path('e2_walk').rect);
export const GROVE = rect(LAYOUT.GREEN.find((g) => g.id === 'clinic_grove').rect);
export const VERGE = 1.1; // the verge's depth (outdoor/lane.js)
export const CLINIC = rect(building('clinic').rect);
export const E1 = rect(building('office_e1').rect);
export const CANTEEN = rect(building('canteen').rect);
// the clinic's bike bay: east of its court, from the clinic's face to the lane, as far as its east wall
export const BIKES = [COURT[1], CLINIC[1] - 0.1, COURT[2], COURT[3]];
// block_e2 and m6, for the small blocks' fronts (plaza/east-fronts.js): office ground floors, each door on its walk
const front = (id, walk, wall) => ({
  id,
  face: 's',
  at: (walk[0] + walk[1]) / 2,
  ground: 'office',
  wall,
  rect: rect(building(id).rect),
  row: building(id),
});
export const E2 = front('block_e2', E2_WALK, 2);
export const M6 = front('m6', M6_WALK, 0);
// built here, so the skyline leaves them out
export const NORTH_IDS = ['clinic', 'office_e1', 'block_e2', 'm6'];
// the avenue on the north verge: a zelkova every 4, none in front of the clinic or block_e2 (they stand close
// behind the verge, and their doors open through it) or at an opening, and a lamp every 8 on the lane's north
// border, between two trees' places, and one either side of the clinic's court and bike bay
export const OPENINGS = [
  [COURT[0], BIKES[1]],
  [GROVE_WALK[0], GROVE_WALK[1]],
  [E2_WALK[0], E2_WALK[1]],
];
const FRONTS = [
  [CLINIC[0], CLINIC[1]],
  [E2.rect[0], E2.rect[1]],
];
export const AVENUE = (() => {
  const out = [];
  for (let x = BACK[0] + 2; x < BACK[1] - 1.5; x += 4)
    if (![...FRONTS, ...OPENINGS].some(([a, b]) => x > a - 1.2 && x < b + 1.2)) out.push(x);
  return out;
})();
export const LAMPS = [];
for (let x = BACK[0] + 4; x < BACK[1] - 2; x += 8)
  if (!OPENINGS.some(([a, b]) => x > a - 0.6 && x < b + 0.6)) LAMPS.push(x);
LAMPS.push(BIKES[1] + 0.45); // past the clinic's bike bay
