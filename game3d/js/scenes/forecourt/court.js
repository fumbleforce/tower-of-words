// The forecourt's court (scenes/forecourt.js), built from its plan (forecourt/plan.js) with the outdoor kit
// (scenes/outdoor/): pale granite round one designed walk from the station door to the head office door (dark
// granite in running bond with a pale soldier border and the yellow guide line down its middle), the raised bed
// with its row of zelkovas along the north edge, benches in front of it, lamps on two staggered lines either side
// of the walk, a pair of clipped pines framing the head office door, the bike court behind its hedge and the
// raised garden east of it. Returns the lamps (for the evening) and the rectangles people can't walk through.
import { Parts, along, pair } from '../outdoor/parts.js';
import { paver, GRANITE } from '../outdoor/paving.js';
import { kerb, kerbRect, wallRect } from '../outdoor/edges.js';
import { keyaki, sakura, pine, maple, ginkgo, cluster, hedge, grass, bed, treePit, LEAF } from '../outdoor/planting.js';
import { lamps, bench, bins, bollard } from '../outdoor/furniture.js';
import { bikeRow } from './details.js';
import * as P from './plan.js';

const { X0, SE, ZN, HZ, HO_X, LE, AZ, BW, LEG, BIKES, GARDEN, NORTH_BED: NB, DOOR_X } = P;

// the walk: its three legs of dark granite, the soldier border round its outline, the guide line on its axis
function walk(pv) {
  const [a, b, c] = [LEG.a, LEG.b, LEG.c];
  const o = { tones: GRANITE.dark, vary: 0.07, origin: [DOOR_X, AZ] };
  pv.field([b[0] + BW, b[1] - BW, b[2] + BW, b[3] - BW], { ...o, pattern: 'bond', module: [0.6, 0.3] });
  pv.field([a[0] + BW, a[1] - BW, b[3] - BW, ZN], { ...o, pattern: 'bondZ', module: [0.6, 0.3] });
  pv.field([c[0] + BW, c[1] - BW, HZ, b[2] + BW], { ...o, pattern: 'bondZ', module: [0.6, 0.3], seed: 3 });
  // the border runs round the walk's outline, broken only at the two doors
  const e = { w: BW, tones: GRANITE.edge };
  pv.border([a[0], a[0] + BW, b[2], ZN], { ...e, sides: 'w' });
  pv.border([a[0] + BW, c[0] + BW, b[2], b[2] + BW], { ...e, sides: 'n' });
  pv.border([c[0], c[0] + BW, HZ, b[2]], { ...e, sides: 'w' });
  pv.border([c[1] - BW, c[1], HZ, b[3]], { ...e, sides: 'e' });
  pv.border([a[1] - BW, c[1] - BW, b[3] - BW, b[3]], { ...e, sides: 's' });
  pv.border([a[1] - BW, a[1], b[3], ZN], { ...e, sides: 'e' });
  pv.tactile([
    [DOOR_X, ZN - 0.45],
    [DOOR_X, AZ],
    [HO_X, AZ],
    [HO_X, HZ + 0.75],
  ]);
}

function paving(root) {
  const pv = paver();
  const court = { pattern: 'bond', module: [0.9, 0.45], tones: GRANITE.pale, origin: [DOOR_X, AZ] };
  for (const f of P.FIELDS) pv.field(f, court);
  pv.field(P.SERVICE, { ...court, pattern: 'bondZ' });
  walk(pv);
  // the bike court: brick in herringbone, a pale band where it meets the court's hedge
  pv.field(BIKES, { pattern: 'herringbone', module: [0.3, 0.15], tones: GRANITE.brick, vary: 0.08, origin: [SE, ZN] });
  pv.build(root);
}

// the kerbs where paving meets grass or a bed
function edges(p) {
  kerbRect(p, P.COURT, { sides: 'w' });
  kerb(p, [X0, HZ], [5.95, HZ], { off: -0.08 }); // the court's north edge, west of the service lane
  kerbRect(p, P.SERVICE, { sides: 'we' });
  kerbRect(p, BIKES, { sides: 's' });
  kerb(p, [LE, P.LANE[3]], [LE, ZN], { off: -0.08 }); // the court's east edge south of the lane
}

// the raised bed along the north edge: a low stone wall, a hedge at its back, zelkovas at an even pitch, shrubs
// between them; benches in front under the trees, facing the court
function northBed(p, block) {
  wallRect(p, NB);
  bed(p, [NB[0] + 0.2, NB[1] - 0.2, NB[2] + 0.2, NB[3] - 0.2], { y: 0.33 });
  hedge(p, [NB[0] + 0.45, NB[2] + 0.42], [NB[1] - 0.45, NB[2] + 0.42], { w: 0.42, h: 0.5, y: 0.33, seed: 2 });
  const trees = along([NB[0], NB[3] - 0.5], [NB[1], NB[3] - 0.5], { pitch: 3, inset: 0.9 });
  trees.forEach(({ x, z }, i) => keyaki(p, x, z, 0.95 + (i % 2) * 0.08, i + 3));
  for (let i = 0; i + 1 < trees.length; i++) {
    const x = (trees[i].x + trees[i + 1].x) / 2;
    cluster(p, x, NB[3] - 0.45, { n: 3, r: 0.26, spread: 0.36, seed: i + 5, y: 0.33 });
  }
  block(NB[0] - 0.1, NB[1] + 0.1, NB[2], NB[3] + 0.1);
  // benches under the first and third trees' crowns, facing south over the court
  for (const t of [trees[0], trees[2]]) {
    bench(p, t.x, NB[3] + 0.42, 0, { len: 1.6 });
    block(t.x - 0.85, t.x + 0.85, NB[3] + 0.1, NB[3] + 0.72);
  }
  bins(p, trees[1].x, NB[3] + 0.32, 0);
  block(trees[1].x - 0.4, trees[1].x + 0.4, NB[3] + 0.1, NB[3] + 0.5);
}

// the west square: two zelkovas in pits and a bench between them looking at the walk
function westSquare(p, block) {
  const x = (X0 + LEG.a[0]) / 2 + 0.2;
  for (const z of [AZ - 0.9, ZN - 1.1]) {
    treePit(p, x, z, { s: 1.2 });
    keyaki(p, x, z, 1.02, Math.round(z * 3) + 9);
    block(x - 0.15, x + 0.15, z - 0.15, z + 0.15);
  }
  bench(p, x, (AZ - 0.9 + ZN - 1.1) / 2, Math.PI / 2, { len: 1.5 });
  block(x - 0.35, x + 0.35, AZ - 0.2, ZN - 1.8);
  bins(p, LEG.a[0] - 0.45, ZN - 0.3, Math.PI / 2);
  block(LEG.a[0] - 0.65, LEG.a[0] - 0.25, ZN - 0.55, ZN);
}

// the head office door: a pair of square granite planters with clipped pines either side, outside the canopy
function door(p, block) {
  for (const [x, z] of pair([HO_X, HZ + 0.95], 4.9)) {
    wallRect(p, [x - 0.55, x + 0.55, z - 0.55, z + 0.55], { h: 0.45, w: 0.14 });
    bed(p, [x - 0.45, x + 0.45, z - 0.45, z + 0.45], { y: 0.4, coverTone: LEAF.deep });
    pine(p, x, z, 0.9, Math.round(x));
    block(x - 0.62, x + 0.62, z - 0.62, z + 0.62);
  }
}

// the bike court: a hedge along its north side with one opening between bollards, racks in two rows with painted
// bays, bikes of every kind in them
function bikes(root, p, block) {
  const gap = [8.65, 9.85];
  const z = ZN + 0.35;
  kerb(p, [SE, ZN], [BIKES[1], ZN], { off: 0.05, gaps: [gap] });
  for (const [x0, x1] of [
    [SE + 0.05, gap[0]],
    [gap[1], BIKES[1] - 0.05],
  ]) {
    hedge(p, [x0 + 0.1, z], [x1 - 0.1, z], { w: 0.5, h: 0.55, seed: Math.round(x0) });
    block(x0, x1, ZN, ZN + 0.62);
  }
  for (const x of gap) bollard(p, x, z);
  for (const [x, zz, turn, gaps, seed, fallen] of [
    [7.6, 3.9, -Math.PI / 2, [3, 7], 0, 5],
    [10.9, 8.85, Math.PI / 2, [1, 5, 8], 3, -1],
  ]) {
    const row = bikeRow(10, { gaps, seed, fallen });
    row.rotation.y = turn;
    row.position.set(x, 0, zz);
    root.add(row);
    block(x - 0.5, x + 0.5, 3.6, 9.1);
    if (fallen >= 0) block(x + 0.5, x + 1.0, zz + fallen * 0.55 - 0.5, zz + fallen * 0.55 + 0.5); // the fallen bike
    // painted bays: a pale line between each pair of places, across the row
    for (let i = 0; i <= 10; i++) p.box('#bfc2c0', 1.0, 0.004, 0.03, x, 0.008, 3.9 - 0.275 + i * 0.55, { cast: false });
  }
  // a bench on the station's east wall looking over the bikes
  bench(p, SE + 0.42, 6.4, Math.PI / 2, { len: 1.6 });
  block(SE, SE + 0.8, 5.5, 7.3);
}

// the garden east of the bike court: a raised bed with a cherry, a maple and a ginkgo, shrubs and grasses under them
function garden(p, block) {
  const g = [GARDEN[0] + 0.05, GARDEN[1], GARDEN[2] + 0.05, GARDEN[3]];
  wallRect(p, g, { sides: 'nw' });
  kerbRect(p, g, { sides: 'se' });
  bed(p, [g[0] + 0.22, g[1] - 0.1, g[2] + 0.22, g[3] - 0.1], { y: 0.3 });
  const y = 0.3;
  sakura(p, 16.7, 4.8, 0.85, 3);
  maple(p, 15.5, 7.4, 1.0, 2);
  ginkgo(p, 17.6, 8.9, 1.05, 4);
  cluster(p, 15.2, 3.7, { n: 4, r: 0.36, seed: 2, y });
  cluster(p, 17.9, 6.6, { n: 5, r: 0.4, seed: 7, y });
  cluster(p, 16.2, 9.6, { n: 3, r: 0.3, seed: 4, y });
  for (const [x, z, s] of [
    [14.9, 5.6, 1],
    [18.3, 3.6, 2],
    [16.9, 7.9, 3],
  ])
    grass(p, x, z, { seed: s });
  block(g[0], g[1], g[2], g[3]);
}

// the lamps: two staggered lines either side of the walk's long leg, pitch 6, and one at the bike court's opening
function lights(set, p, block) {
  const pts = [
    [-0.5, LEG.b[2] - 0.35],
    [5.5, LEG.b[2] - 0.35],
    [2.5, LEG.b[3] + 0.4],
    [8.5, LEG.b[3] + 0.4],
    [16.0, LEG.b[3] + 0.4],
  ];
  for (const [x, z] of pts) block(x - 0.14, x + 0.14, z - 0.14, z + 0.14);
  lamps(set, p, pts, { kind: 'post' });
}

export function buildCourt(root, nav, set) {
  const block = (x0, x1, z0, z1) => nav.block(x0, x1, z0, z1);
  paving(root);
  const p = new Parts();
  edges(p);
  northBed(p, block);
  westSquare(p, block);
  door(p, block);
  bikes(root, p, block);
  garden(p, block);
  lights(set, p, block);
  p.build(root);
}
