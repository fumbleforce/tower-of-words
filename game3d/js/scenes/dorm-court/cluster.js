// The dorm cluster round the inner court, east of the dorm courtyard (the plan is dorm-court/cluster-plan.js):
// backdrop for the island map and the edges of the courtyard's frame, nothing walkable. Laid with the outdoor kit
// in the island frame, then turned into the place's frame (placeIn):
//   the dorm row: the lane's brick between pale borders, a kerb on each side; on its north side a pale apron along
//   Eric's block and a bed under dorm_1e's end, then the court's verge; on its south side a verge with the zelkova
//   avenue in front of the garden, and dorm_2's apron; it ends in the square at dorm_3's main door
//   the inner court: four lawns between the cross of walks, kerbed; a paved square where the walks cross, with a
//   maple in a raised bed, benches and the sorted bins round it; ginkgos, a maple and a cherry in the lawns; bikes
//   left about; hedges close the court's open corners
//   the back walk, dorm_entry's walk and the link, pale slabs between soldier borders
//   the yards round the blocks (dorm-court/cluster-yards.js) and the seven blocks' fronts (plaza/east-fronts.js,
//   the one block builder): dorm entrances, balconies
// Built into the dorm courtyard (its map tile and the edges of its frame), and into the plaza, where the courtyard
// isn't built: there a plain stand-in of it and of Eric's block fill the ground east of the dorm street.
import { GRANITE } from '../outdoor/paving.js';
import { laneField, verge, LANE_BORDER as BW } from '../outdoor/lane.js';
import { kerb, kerbRect, wallRect } from '../outdoor/edges.js';
import { hedge, sakura, ginkgo, maple, keyaki, mound, bed, treePit, LEAF } from '../outdoor/planting.js';
import { lamps, bench, bins, lightSet } from '../outdoor/furniture.js';
import { frontsSteps } from '../plaza/east-fronts.js';
import { CHUNKS, toLocal } from '../island-layout.js';
import { TOWN, groundPatches } from '../town.js';
import { cells } from './cells.js';
import {
  bike,
  shrubBed,
  endSquare,
  backYards,
  garden,
  GARDEN_WALK,
  belts,
  doorPots,
  SHELTER_PAD,
} from './cluster-yards.js';
import { standIn } from './cluster-standin.js';
import * as P from './plan.js';
import * as C from './cluster-plan.js';

const { ROW, NS, EW, LINK, BACK, ENTRY, COURT, SQUARE, PLANTER, AXIS_X, AXIS_Z } = C;
const edge = (pv, rect, module) => pv.field(rect, { pattern: 'grid', module, tones: GRANITE.edge, h: 0.007 });
const D1E = C.block('dorm_1e'),
  D2 = C.block('dorm_2'),
  GAL = C.block('dorm_gallery');
const D2_APRON = [D2[0], D2[1], ROW[3], D2[2]]; // dorm_2's apron, from the row to its door
const NORTH_APRON = [78.84, D1E[1], C.DORM_1_SOUTH, ROW[2]]; // along Eric's block's end and dorm_1e's
const D1E_BED = [D1E[0], D1E[1], D1E[3], C.DORM_1_SOUTH]; // under dorm_1e's south end
const COURT_APRON = [D1E[1], LINK[0], COURT[2], COURT[2] + 0.6]; // along the court's north side
const LAWN_Z = [COURT_APRON[3], ROW[2] - 1.1]; // the lawns' north and south edges (the verge is 1.1 deep)
const HEDGE_Z = COURT[2] - 0.3; // the hedges closing the court's open corners, north of the apron
// the cells everything is collected in (dorm-court/cells.js), about 8 across: the courtyard's camera sees at most
// the row's west end, the garden and the lawn north of the court, so the rest is culled
const XCUTS = [88, 96, 104, 112, 120];

// a walk: pale slabs between soldier borders on its long sides
function walk(pv, [x0, x1, z0, z1], alongX = x1 - x0 > z1 - z0) {
  pv.field([x0, x1, z0, z1], { pattern: 'grid', module: [0.6, 0.6], tones: GRANITE.pale, origin: [x0, z0] });
  if (alongX) for (const z of [z0, z1 - BW]) edge(pv, [x0, x1, z, z + BW], [0.15, BW]);
  else for (const x of [x0, x1 - BW]) edge(pv, [x, x + BW, z0, z1], [BW, 0.15]);
}
const pale = (pv, r) => pv.field(r, { pattern: 'grid', module: [0.6, 0.6], tones: GRANITE.pale, origin: [r[0], r[2]] });

function ground(pv) {
  // the row, in a piece a cell
  const xs = [ROW[0], ...XCUTS.filter((x) => x > ROW[0] && x < ROW[1]), ROW[1]];
  for (let i = 1; i < xs.length; i++)
    laneField(pv, [xs[i - 1], xs[i], ROW[2], ROW[3]], { origin: [C.DORM_STREET[0], ROW[2]] });
  pale(pv, NORTH_APRON);
  pale(pv, D2_APRON);
  pale(pv, COURT_APRON);
  // the court's cross: the square, and the walks up to it
  pv.field(SQUARE, { pattern: 'bond', module: [0.6, 0.3], tones: GRANITE.mid, origin: [SQUARE[0], SQUARE[2]] });
  const [sx0, sx1, sz0, sz1] = SQUARE;
  edge(pv, [sx0, sx1, sz0, sz0 + BW], [0.15, BW]);
  edge(pv, [sx0, sx1, sz1 - BW, sz1], [0.15, BW]);
  edge(pv, [sx0, sx0 + BW, sz0 + BW, sz1 - BW], [BW, 0.15]);
  edge(pv, [sx1 - BW, sx1, sz0 + BW, sz1 - BW], [BW, 0.15]);
  walk(pv, [NS[0], NS[1], COURT_APRON[3], SQUARE[2]]);
  walk(pv, [NS[0], NS[1], SQUARE[3], ROW[2]]);
  walk(pv, [EW[0], SQUARE[0], EW[2], EW[3]]);
  walk(pv, [SQUARE[1], EW[1], EW[2], EW[3]]);
  walk(pv, [LINK[0], LINK[1], BACK[3], EW[2]]);
  walk(pv, [ENTRY[0], ENTRY[1], ENTRY[2], BACK[2]]);
  walk(pv, BACK, true);
}

function kerbs(p) {
  // the row: its north side along the aprons, from the courtyard's front bed (the court's verge has its own), its
  // south side the verge's
  kerb(p, [ROW[0] + P.SOUTH_BED[3] - P.SOUTH_BED[2], ROW[2]], [D1E[1], ROW[2]], { off: -0.08 });
  kerb(p, [D2[0], ROW[3]], [D2[1], ROW[3]], { off: 0.08 });
  // the court's lawns, open where the walks come in
  const ns = [NS[0], NS[1]],
    ew = [EW[2], EW[3]];
  kerbRect(p, [D1E[1], LINK[0], LAWN_Z[0], EW[2]], { sides: 'se', gaps: { s: [[SQUARE[0], SQUARE[1]]] } });
  kerbRect(p, [D1E[1], COURT[1], EW[3], LAWN_Z[1]], { sides: 'n', gaps: { n: [[SQUARE[0], SQUARE[1]]] } });
  kerb(p, [D1E[1], COURT[2]], [LINK[0], COURT[2]], { off: 0.08, gaps: [[GAL[0], GAL[1]]] }); // the apron's north edge
  kerbRect(p, SQUARE, { gaps: { n: [ns], s: [ns], w: [ew], e: [ew] } });
  // the walks' edges through the lawns
  for (const x of ns) {
    const o = x === ns[0] ? -0.08 : 0.08;
    kerb(p, [x, COURT_APRON[3]], [x, SQUARE[2]], { off: o });
    kerb(p, [x, SQUARE[3]], [x, LAWN_Z[1]], { off: o });
  }
  // the back walk, the entry walk and the link, where they run through grass
  kerbRect(p, BACK, {
    sides: 'nse',
    gaps: {
      n: [
        [ENTRY[0], ENTRY[1]],
        [SHELTER_PAD[0], SHELTER_PAD[1]],
      ],
      s: [[LINK[0], LINK[1]]],
    },
  });
  kerbRect(p, [ENTRY[0], ENTRY[1], ENTRY[2], BACK[2]], { sides: 'we' });
  kerbRect(p, [LINK[0], LINK[1], BACK[3], COURT[2]], { sides: 'w' });
}

function court(p, lights) {
  const ns = [NS[0], NS[1]];
  // the verge on the row, open for the north-south walk
  verge(p, [D1E[1], ROW[2]], [ROW[1], ROW[2]], 'n', { crossings: [ns], seed: 31 });
  // the raised bed in the square, a maple in it over clipped balls; a bench either side of the walks' mouths on the
  // square's north and south sides, facing the bed
  wallRect(p, PLANTER, { h: 0.42 });
  bed(p, [PLANTER[0] + 0.2, PLANTER[1] - 0.2, PLANTER[2] + 0.2, PLANTER[3] - 0.2], { y: 0.4 });
  maple(p, AXIS_X, AXIS_Z, 0.95, 12);
  for (const [dx, dz] of [
    [-0.45, 0.4],
    [0.4, -0.45],
  ])
    mound(p, AXIS_X + dx, AXIS_Z + dz, 0.2, LEAF.fresh, { y: 0.4 });
  // round the bed, no two corners alike: a bench facing it, one turned to face along the walk, a bench facing the
  // gallery, the sorted bins
  const off = (ns[1] - ns[0]) / 2 + 0.85;
  bench(p, AXIS_X - off, SQUARE[2] + 0.45, 0, { len: 1.1 });
  bench(p, AXIS_X + off + 0.2, SQUARE[2] + 0.75, -Math.PI / 2, { len: 1.1 });
  bench(p, AXIS_X - off, SQUARE[3] - 0.45, Math.PI, { len: 1.1 });
  bins(p, AXIS_X + off, SQUARE[3] - 0.35, Math.PI);
  // the lamps on the east-west walk's edges just outside the square, one each side
  lamps(
    lights,
    p,
    [
      [SQUARE[0] - 0.5, EW[2] + 0.2],
      [SQUARE[1] + 0.5, EW[3] - 0.2],
    ],
    { pool: 1.5 },
  );
  const gz = GAL[3] + 0.3;
  // two bikes left on the apron by the common building's east end, and a third by dorm_1e's door
  bike(p, GAL[1] - 0.9, gz + 0.05, Math.PI / 2, 1);
  bike(p, GAL[1] + 0.5, gz + 0.12, Math.PI / 2 + 0.15, 4);
  bike(p, D1E[1] + 0.35, EW[2] - 1.2, 0.1, 2);
  // the sorted bins at dorm_1e's door too
  bins(p, D1E[1] + 0.45, EW[3] + 0.9, Math.PI / 2);
  // the lawns: a ginkgo in each north one, a maple and a cherry in the south ones, in from the walks
  const qx = [(D1E[1] + SQUARE[0]) / 2, (SQUARE[1] + LINK[0]) / 2];
  qx.forEach((x, i) => ginkgo(p, x, (LAWN_Z[0] + EW[2]) / 2, 0.9, 81 + i));
  maple(p, qx[0], (EW[3] + LAWN_Z[1]) / 2, 0.8, 83);
  sakura(p, qx[1], (EW[3] + LAWN_Z[1]) / 2, 0.85, 84);
  // hedges closing the court's open corners, north of its apron: west of the gallery, and between it and the link
  hedge(p, [D1E[1] + 0.2, HEDGE_Z], [GAL[0], HEDGE_Z], { w: 0.5, h: 0.7, seed: 85 });
  hedge(p, [GAL[1], HEDGE_Z], [LINK[0] - 0.2, HEDGE_Z], { w: 0.5, h: 0.7, seed: 86 });
}

function row(p, lights) {
  // the south verge, a low hedge, along the ramen shop, the garden and dorm_2; zelkovas in pits along the row's
  // south edge between the lamps
  verge(p, [C.DORM_STREET[1], ROW[3]], [D2[0], ROW[3]], 's', { crossings: [GARDEN_WALK], seed: 33 });
  verge(p, [D2[1], ROW[3]], [ROW[1], ROW[3]], 's', { seed: 35 });
  for (const [i, x] of [84.5, 92.5, 106].entries()) {
    treePit(p, x, ROW[3] - 0.75);
    keyaki(p, x, ROW[3] - 0.75, 1.0 + (i % 2) * 0.06, 33 + i);
  }
  shrubBed(p, D1E_BED, 'sew', 37);
  // lamps on the south side every 8, at the verge's kerb
  lamps(
    lights,
    p,
    [80.5, 88.5, 96.5].map((x) => [x, ROW[3] - 0.25]),
    { pool: 1.4, poolShift: [0, -0.6] },
  );
}

// the lawn under the cluster, over the courtyard's ground (which takes its shadows), out past the map tile's edges:
// flat pieces in one mesh, like the courtyard's own ground; the plaza has its own lawn
function lawn(group) {
  const W = 88.29; // dorm_1's east face: north of the row and west of it is the courtyard, which lays its own
  groundPatches(
    group,
    [
      [W, 136, -21, ROW[2], TOWN.grass],
      [ROW[0], 136, ROW[2], 27, TOWN.grass],
    ],
    -0.012,
  );
}

// builds it all into `group`, in the island frame; plaza: also the stand-ins for the courtyard and Eric's block.
// A generator that yields between parts (every few trees in the woods, every block front, every cell's meshes), so
// the place can build it in slices of a few ms (js/perf/slice.js) while the plaza plays; returns the evening switch.
export function* clusterSteps(group, { plaza = false } = {}) {
  group.name = 'dorm-cluster';
  const { parts: p, paver: pv } = cells(XCUTS, [0, 10]),
    lights = lightSet();
  ground(pv);
  yield;
  kerbs(p);
  yield;
  court(p, lights);
  yield;
  row(p, lights);
  yield;
  yield* endSquare(pv, p, lights);
  yield* backYards(pv, p, lights);
  yield* garden(pv, p);
  yield* belts(p);
  doorPots(p, C.BLOCKS);
  yield;
  if (plaza) yield* standIn(pv, p, lights);
  else {
    // the dorm street's edge south of the row, to the courtyard's end of it (the plaza's east lane kerbs its own)
    kerb(p, [ROW[0], ROW[3]], [ROW[0], P.STREET[1] + CHUNKS.dorm_court.at[1]], { off: 0.08 });
    lawn(group);
  }
  yield;
  const fronts = yield* frontsSteps(p, lights, plaza ? [...C.BLOCKS, ...C.DORM_1_PARTS] : C.BLOCKS);
  fronts.meshes(group);
  yield;
  yield* pv.build(group);
  for (const m of yield* p.build(group)) m.castShadow = false;
  const lit = lights.build(group);
  // no shadows on it either: the courtyard's shadow box ends a little way into the row, and its edge would show
  group.traverse((m) => m.isMesh && (m.receiveShadow = false));
  return {
    evening() {
      fronts.evening();
      lit.evening();
    },
  };
}

// the group's place in a chunk's frame: island (x, z) to the chunk's local, turned by the chunk's turn
export function placeIn(group, chunk) {
  const [x, z] = toLocal(chunk, 0, 0);
  group.position.set(x, 0, z);
  group.rotation.y = (CHUNKS[chunk].turn * Math.PI) / 180;
  group.scale.setScalar(1 / CHUNKS[chunk].scale);
  return group;
}
export const CLUSTER_IDS = C.BLOCK_IDS;
