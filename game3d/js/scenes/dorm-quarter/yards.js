// The dorm quarter's south yards (the plan is dorm-quarter/plan.js), in the island frame:
//   the sea terrace at the dorm row's east end: mid stone in bond in a pale border, a low wall on its sea side, a
//   bench at each end looking out, a drinks machine lit on its north side, a raised bed with a big black pine, a lamp
//   the dorm row: the verge with its zelkovas and lamps on its south side, along the ramen corner's lawn and the
//   villas' doors; a verge along its north side under S-E's gardens
//   the garden south of the row between the ramen shop and the villas: a walk in from the row to a pergola, drifts
//   with a cherry in each (and on south, the coastal garden's loop, east-coast/coast-garden.js)
import { GRANITE } from '../outdoor/paving.js';
import { lowWall, wallRect, kerbRect } from '../outdoor/edges.js';
import { verge } from '../outdoor/lane.js';
import { keyaki, sakura, pine, bed, treePit } from '../outdoor/planting.js';
import { drift } from '../forecourt/gardens.js';
import { lamps, bench } from '../outdoor/furniture.js';
import { terraceDetails, terraceVending } from '../east-coast/terrace-details.js';
import { coastGardenSteps } from '../east-coast/coast-garden.js';
import { COAST_GARDEN as G } from '../island-dorms.js';
import { pale } from '../dorm-court/cluster-yards.js';
import { pergola } from '../outdoor/park-kit.js';
import * as Q from './plan.js';
import { ROW_TREES, ROW_LAMPS } from './fittings.js';

const BW = 0.25;
const edge = (pv, rect, module) => pv.field(rect, { pattern: 'grid', module, tones: GRANITE.edge, h: 0.007 });
const TR = Q.TERRACE,
  ROW = Q.ROW;

export function* terraceSteps(pv, p, lights, root) {
  pv.field(TR, { pattern: 'bond', module: [0.6, 0.3], tones: GRANITE.mid, origin: [TR[0], TR[2]] });
  for (const z of [TR[2], TR[3] - BW]) edge(pv, [TR[0], TR[1], z, z + BW], [0.15, BW]);
  // the wall on the sea side, closed
  lowWall(p, [TR[0], TR[3]], [TR[1], TR[3]], { off: -0.11 });
  for (const x of [TR[0] + 1.1, TR[1] - 1.3]) bench(p, x, TR[3] - 0.7, 0, { len: 1.3 });
  const vx = TR[0] + 0.6,
    vz = TR[2] + 0.55;
  terraceVending(root, p, vx, vz);
  lights.lit.push([vx, vz + 0.9, 0.9]);
  // in the terrace's north half a raised bed with a big black pine, seen from up the row
  const tc = (TR[0] + TR[1]) / 2,
    tz = TR[2] + 0.95;
  yield;
  wallRect(p, [tc - 1.0, tc + 1.0, tz - 0.8, tz + 0.8], { h: 0.45 });
  bed(p, [tc - 0.8, tc + 0.8, tz - 0.6, tz + 0.6], { y: 0.43, cover: false });
  terraceDetails(p, TR, [tc - 1, tc + 1, tz - 0.8, tz + 0.8]);
  pine(p, tc, tz, 0.9, 81);
  lamps(lights, p, [[TR[1] - 0.6, TR[2] + 0.4]], { pool: 1.5 });
  yield;
  // the terrace's southern view open between two shelter pines
  pine(p, TR[0] - 0.8, TR[3] + 2.4, 0.8, 79);
  pine(p, TR[1] - 0.2, TR[3] + 1.0, 0.75, 80);
  yield;
}

// the row's verges: south, along the ramen corner's lawn and the villas, open at the garden's walk, the villas'
// walks and the coastal garden's east path; north, under S-E's gardens, open for the north-south walk
export const GARDEN_WALK = [G.entry[0], G.entry[1]];
export function* rowSteps(p, lights) {
  const cross = [GARDEN_WALK, ...Q.VILLA_DOORS.map((r) => [r[0], r[1]]), [117, 118.8]];
  verge(p, [Q.DORM_STREET[1], ROW[3]], [TR[0], ROW[3]], 's', { crossings: cross, seed: 33, ground: true });
  yield;
  // the zelkovas in tree pits along the row's south side, between the lamps
  for (const [i, x] of ROW_TREES.entries()) {
    treePit(p, x, ROW[3] - 0.75);
    keyaki(p, x, ROW[3] - 0.75, 1.0 + (i % 2) * 0.06, 33 + i);
  }
  lamps(
    lights,
    p,
    ROW_LAMPS.map((x) => [x, ROW[3] - 0.25]),
    { pool: 1.4, poolShift: [0, -0.6] },
  );
  yield;
}

// the garden south of the row: a walk in from the row through the verge to a paved pad under a pergola with a bench
// at each end, drifts of layered planting either side with a cherry in each
export function* gardenSteps(pv, p) {
  const [x0, x1, , z1] = [82, 96.9, 12, 20],
    [w0, w1] = GARDEN_WALK,
    pad = G.pergola;
  pale(pv, [w0, w1, ROW[3], pad[2]]);
  for (const x of [w0, w1 - BW]) edge(pv, [x, x + BW, ROW[3], pad[2]], [BW, 0.15]);
  pv.field(pad, { pattern: 'bond', module: [0.6, 0.3], tones: GRANITE.mid, origin: [pad[0], pad[2]] });
  for (const z of [pad[2], pad[3] - BW]) edge(pv, [pad[0], pad[1], z, z + BW], [0.15, BW]);
  kerbRect(p, [w0, w1, ROW[3] + 1.1, pad[2]], { sides: 'we' });
  kerbRect(p, pad, { gaps: { n: [[w0, w1]], e: [[17, 18.8]] } });
  // the pergola in grey steel
  pergola(p, [pad[0] + 0.15, pad[1] - 0.15, pad[2] + 0.15, pad[3] - 0.15], {
    h: 2.3,
    along: 'x',
    slat: 0.45,
    wood: { dark: '#8f969e', mid: '#7d858e', pale: '#9aa0a6' },
  });
  bench(p, pad[0] + 0.7, (pad[2] + pad[3]) / 2, Math.PI / 2, { len: 1.6 });
  bench(p, 90.4, pad[3] - 0.5, Math.PI, { len: 1.6 });
  yield;
  drift(p, [x0 + 0.4, pad[0] - 0.4, ROW[3] + 1.6, z1 - 0.3], { back: 's', seed: 41 });
  yield;
  drift(p, [pad[1] + 0.4, x1 - 1.2, ROW[3] + 1.6, 16.2], { back: 'n', seed: 45 });
  yield;
  sakura(p, (x0 + pad[0]) / 2, ROW[3] + 3.6, 1.0, 42);
  sakura(p, 94.6, 14.4, 0.85, 43);
  pine(p, (x0 + pad[0]) / 2 + 0.8, z1 - 1.4, 0.8, 44);
  yield;
}

export function* southSteps(pv, p, lights, root) {
  yield* terraceSteps(pv, p, lights, root);
  yield* rowSteps(p, lights);
  yield* gardenSteps(pv, p);
  yield* coastGardenSteps(pv, p, lights);
}
