// The fountain plaza's ground (scenes/plaza.js), laid with the outdoor kit (scenes/outdoor/) from the plan
// (plaza/plan.js): the lawn under everything, the lanes and the canteen link in the forecourt lane's grey brick
// between pale soldier borders, the round plaza in rings of stone (a warm apron round the basin, a dark band, pale
// granite with a dark ring line, a dark border ring), the canteen terrace in large pale slabs, and the footpath
// along the shops' backs.
import { paver, GRANITE } from '../outdoor/paving.js';
import { roundPaver } from '../outdoor/round.js';
import { laneField, LANE_BORDER as BW } from '../outdoor/lane.js';
import { groundPatches, TOWN } from '../town.js';
import * as P from './plan.js';

const { F, R, BORDER, BASIN, LANE, LINK, LZ, HALF, TERRACE, TERRACE_S, FOOTPATH, SHOPS, SHOPS_Z } = P;
const WARM = ['#aea393', '#a89e8f', '#b3a99a', '#a59a8a']; // the apron round the basin: the one warm stone

// the lanes and the link: the town's lane (outdoor/lane.js), all running in under the circle's border ring, which
// laps over their ends
function lanes(pv) {
  const origin = [F[0], LZ - HALF];
  for (const rect of [LANE.w, LANE.e]) laneField(pv, rect, { origin });
  laneField(pv, LINK, { along: 'z', origin });
}

// the round plaza, whole: the paths run in under its border ring
function circle(root) {
  const rp = roundPaver(F, { y: 0.014 });
  rp.ring(BASIN - 0.05, BASIN + 0.75, { course: 0.4, stone: 0.5, tones: WARM, seed: 3 });
  rp.ring(BASIN + 0.75, BASIN + 1.05, { course: 0.3, stone: 0.32, tones: GRANITE.dark, seed: 4 });
  rp.ring(BASIN + 1.05, 8.05, { course: 0.6, stone: 0.8, tones: GRANITE.pale, seed: 5 });
  rp.ring(8.05, 8.3, { course: 0.25, stone: 0.3, tones: GRANITE.dark, seed: 6 });
  rp.ring(8.3, R - BORDER, { course: 0.6, stone: 0.8, tones: GRANITE.mid, seed: 7 });
  rp.ring(R - BORDER, R, { course: BORDER, stone: 0.22, tones: GRANITE.dark, seed: 8, vary: 0.04 });
  rp.build(root);
}

// the canteen terrace: large pale slabs from the canteen's front to the terrace wall, with a soldier course along
// the canteen's face
function terrace(pv) {
  const slabs = { pattern: 'grid', module: [0.9, 0.45], tones: GRANITE.edge, vary: 0.05, origin: [F[0], TERRACE[2]] };
  pv.field([TERRACE[0], TERRACE[1], TERRACE[2] + BW, TERRACE_S], slabs);
  pv.field([TERRACE[0], TERRACE[1], TERRACE[2], TERRACE[2] + BW], {
    pattern: 'grid',
    module: [0.15, BW],
    tones: GRANITE.dark,
    h: 0.007,
  });
}

export function buildGround(root) {
  // the lawn under everything; the arcade's floor between the shop rows
  groundPatches(root, [[-44, 44, -30, SHOPS_Z + SHOPS.depth, TOWN.grass]]);
  const rowsEnd = SHOPS.a[0] + SHOPS.length; // past the rows' east end, the lawn (plaza/east-lane.js lays the walk on)
  groundPatches(root, [[-44, rowsEnd, SHOPS_Z + SHOPS.depth, SHOPS_Z + SHOPS.depth * 2, TOWN.paving]]);
  groundPatches(root, [[rowsEnd, 44, SHOPS_Z + SHOPS.depth, SHOPS_Z + SHOPS.depth * 3, TOWN.grass]]);
  const pv = paver();
  lanes(pv);
  terrace(pv);
  // the footpath along the shops' backs
  pv.field(FOOTPATH, { pattern: 'grid', module: [0.6, 0.6], tones: GRANITE.mid, origin: [F[0], FOOTPATH[2]] });
  pv.build(root);
  circle(root);
}
