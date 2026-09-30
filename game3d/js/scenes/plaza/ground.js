// The fountain plaza's ground (scenes/plaza.js), laid with the outdoor kit (scenes/outdoor/) from the plan
// (plaza/plan.js): the lawn under everything, the lane in the forecourt lane's grey brick between pale soldier
// borders, the round plaza in rings of stone (a warm apron round the basin, a dark band, pale granite with a dark
// ring line, a dark border ring), the canteen terrace in large pale slabs, and the footpath along the shops' backs.
import { paver, GRANITE } from '../outdoor/paving.js';
import { roundPaver } from '../outdoor/round.js';
import { groundPatches, TOWN } from '../town.js';
import * as P from './plan.js';

const { F, R, BORDER, BASIN, LANE, LINKS, LANE_N, TERRACE, TERRACE_S, FOOTPATH, SHOPS, SHOPS_Z } = P;
const BW = 0.25; // the lane's soldier border
const WARM = ['#aea393', '#a89e8f', '#b3a99a', '#a59a8a']; // the apron round the basin: the one warm stone

// the lane: brick in running bond (courses along the lane on each leg), the pale border along both edges; where the
// lane turns, the border runs round the outside of the turn and the brick carries on across it
function lane(pv) {
  const brick = (rect, pattern) =>
    pv.field(rect, { pattern, module: [0.5, 0.25], tones: GRANITE.brick, vary: 0.08, origin: [F[0], LANE_N] });
  const [w, wl, s, el, e] = [LANE.w, LANE.wl, LANE.s, LANE.el, LANE.e];
  // the brick, inside the borders
  brick([w[0], LINKS.w[1], w[2] + BW, w[3] - BW], 'bond'); // in from the west, and the link on into the plaza
  brick([wl[0] + BW, wl[1] - BW, w[3] - BW, wl[3] + BW], 'bondZ'); // the west leg, from the corner
  brick([s[0] + BW, s[1] - BW, s[2] + BW, s[3] - BW], 'bond'); // along the plaza
  brick([el[0] + BW, el[1] - BW, s[2], s[2] + BW], 'bond'); // the east corner, under the north border's end
  brick([el[0] + BW, el[1] - BW, e[3] - BW, el[3]], 'bondZ'); // the east leg, to the corner
  brick([LINKS.e[0], e[1], e[2] + BW, e[3] - BW], 'bond'); // out to the east, and the link into the plaza
  // the borders, stone ends butting, never overlapping
  const along = (rect) => pv.field(rect, { pattern: 'grid', module: [0.15, BW], tones: GRANITE.edge, h: 0.007 });
  const across = (rect) => pv.field(rect, { pattern: 'grid', module: [BW, 0.15], tones: GRANITE.edge, h: 0.007 });
  along([w[0], LINKS.w[1], w[2], w[2] + BW]); // north of the west lane and its link
  along([w[0], wl[0] + BW, w[3] - BW, w[3]]); // south of the west lane, to the corner
  across([wl[0], wl[0] + BW, w[3] - BW, s[3]]); // the outside of the west leg
  along([s[0] + BW, s[1] - BW, s[3] - BW, s[3]]); // the lane's south edge along the plaza
  across([el[1] - BW, el[1], e[3] - BW, s[3]]); // the outside of the east leg
  along([el[1], e[1], e[3] - BW, e[3]]); // south of the east lane
  along([LINKS.e[0], e[1], e[2], e[2] + BW]); // north of the east lane and its link
  along([LINKS.e[0], el[0] + BW, e[3] - BW, e[3]]); // south of the east link
  across([el[0], el[0] + BW, e[3], s[2] + BW]); // the inside of the east leg
  along([wl[1] - BW, el[0], s[2], s[2] + BW]); // the lane's north edge along the plaza: the circle stops at it
  across([wl[1] - BW, wl[1], w[3], s[2]]); // the inside of the west leg
  along([wl[1] - BW, LINKS.w[1], w[3] - BW, w[3]]); // south of the west link
}

// the round plaza, cut straight by the lane's north edge
function circle(root) {
  const rp = roundPaver(F, { y: 0.014, clip: [[0, 1, LANE_N]] });
  rp.ring(BASIN - 0.05, BASIN + 0.75, { course: 0.4, stone: 0.5, tones: WARM, seed: 3 });
  rp.ring(BASIN + 0.75, BASIN + 1.05, { course: 0.3, stone: 0.32, tones: GRANITE.dark, seed: 4 });
  rp.ring(BASIN + 1.05, 8.05, { course: 0.6, stone: 0.8, tones: GRANITE.pale, seed: 5 });
  rp.ring(8.05, 8.3, { course: 0.25, stone: 0.3, tones: GRANITE.dark, seed: 6 });
  rp.ring(8.3, R - BORDER, { course: 0.6, stone: 0.8, tones: GRANITE.mid, seed: 7 });
  rp.ring(R - BORDER, R, { course: BORDER, stone: 0.22, tones: GRANITE.dark, seed: 8, vary: 0.04 });
  rp.build(root);
}

// the canteen terrace: large pale slabs from the canteen's front to the terrace wall, and on under the circle's
// north arc (the circle is laid over it), with a soldier course along the canteen's face
function terrace(pv) {
  const slabs = { pattern: 'grid', module: [0.9, 0.45], tones: GRANITE.edge, vary: 0.05, origin: [F[0], TERRACE[2]] };
  pv.field([TERRACE[0], TERRACE[1], TERRACE[2] + BW, TERRACE_S], slabs);
  pv.field([-R + 3.2, R - 3.2, TERRACE_S, TERRACE_S + 1.7], slabs);
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
  groundPatches(root, [[-44, 44, SHOPS_Z + SHOPS.depth, SHOPS_Z + SHOPS.depth * 2, TOWN.paving]]);
  const pv = paver();
  lane(pv);
  terrace(pv);
  // the footpath along the shops' backs
  pv.field(FOOTPATH, { pattern: 'grid', module: [0.6, 0.6], tones: GRANITE.mid, origin: [F[0], FOOTPATH[2]] });
  pv.build(root);
  circle(root);
}
