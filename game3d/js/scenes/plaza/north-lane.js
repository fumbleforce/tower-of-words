// North of the lane, behind the canteen (the plan is plaza/north-plan.js): backdrop for the top of the plaza's
// frames and the island map, nothing walkable. Laid with the outdoor kit like the east lane (plaza/east-lane.js):
//   the back lane: the town's lane in grey brick between pale borders, from the canteen's loading yard to the north
//   street; a verge and zelkova avenue down its north side, opened for the clinic's court and block_e2's walk; a
//   lower verge without trees on its south side past the canteen; post lamps every 8, manhole covers
//   the canteen's yard and apron: plaza/north-yard.js
//   the clinic, its court and bike bay: plaza/north-clinic.js; the lane's lamps either side of the court
//   block_e2 and m6: small blocks (plaza/east-fronts.js), their office doors on their walks
//   office_e1: the block the forecourt's cross street ends at (forecourt/north.js), the same here
//   the grove: a walk from the lane between two beds of trees to a gravel square with benches, a row of trees
//   behind; a few more trees by the canteen's ends
// It all lies outside the plaza's sun shadow box (scenes/plaza.js), so none of it casts a shadow; its shadows are
// laid on the ground instead (outdoor/shade.js).
import * as THREE from 'three';
import { paver } from '../outdoor/paving.js';
import { laneField, verge } from '../outdoor/lane.js';
import { kerb, kerbRect } from '../outdoor/edges.js';
import { keyaki, sakura, ginkgo, maple, cluster, bed, gravel, LEAF } from '../outdoor/planting.js';
import { lamps, bench } from '../outdoor/furniture.js';
import { Parts } from '../outdoor/parts.js';
import { blockSets, buildBlockSets } from '../outdoor/block.js';
import { shade } from '../outdoor/shade.js';
import { groundPatches, TOWN } from '../town.js';
import { officeE1 } from '../forecourt/north.js';
import { buildFronts } from './east-fronts.js';
import { tree, walk } from './east-lane.js';
import { yardGround, buildYard } from './north-yard.js';
import { clinicGround, clinic } from './north-clinic.js';
import * as N from './north-plan.js';

const { BACK, APRON, E2_WALK, GROVE_WALK, SQUARE, VERGE, CLINIC, CANTEEN } = N;
const VB = BACK[2] - VERGE; // the north verge's back
const E1_H = 2.4 + 3 * 2;

function ground(root) {
  groundPatches(root, [[-44, 44, -48, -30, TOWN.grass]]); // the lawn on north of the plaza's
  const pv = paver();
  laneField(pv, BACK, { origin: [BACK[0], BACK[2]] });
  yardGround(pv);
  clinicGround(pv);
  walk(pv, E2_WALK, false);
  walk(pv, GROVE_WALK, false);
  pv.build(root);
}

function planting(q, lights, sh) {
  // the north verge and its avenue, lamps on the lane's north border every 8
  const east = BACK[1] - VERGE; // the north street's verge takes the corner
  verge(q, [BACK[0], BACK[2]], [east, BACK[2]], 'n', { crossings: N.OPENINGS, trees: N.AVENUE, seed: 31 });
  for (const x of N.AVENUE) sh.tree(x, BACK[2] - 2.1, 1.04);
  // the south verge past the canteen's east end: kerb, bed and hedge, no trees (the canteen's lawn has its own)
  verge(q, [APRON[1], BACK[3]], [east, BACK[3]], 's', { seed: 33 });
  kerb(q, [APRON[1], APRON[2]], [APRON[1], APRON[3]], { off: 0.08 }); // where the apron meets the canteen's lawn
  lamps(
    lights,
    q,
    N.LAMPS.map((x) => [x, BACK[2] + 0.35]),
    { kind: 'post', pool: 1.5, poolShift: [0, 0.6] },
  );
  // block_e2's walk: kerbs from the verge to its door
  for (const [x, o] of [
    [E2_WALK[0], -0.08],
    [E2_WALK[1], 0.08],
  ])
    kerb(q, [x, E2_WALK[2]], [x, VB], { off: o });
  // the grove: a walk in from the lane between two kerbed beds of trees and shrubs, to a gravel square with a
  // zelkova in the middle, a bench either side facing it and a lamp; a row of trees on the lawn behind
  const [wx0, wx1] = GROVE_WALK,
    [sx0, sx1, sz0, sz1] = SQUARE;
  for (const [x, o] of [
    [wx0, -0.08],
    [wx1, 0.08],
  ])
    kerb(q, [x, sz1], [x, VB], { off: o });
  kerbRect(q, SQUARE, { gaps: { s: [[wx0, wx1]] } });
  gravel(q, [sx0 + 0.08, sx1 - 0.08, sz0 + 0.08, sz1 - 0.08], { y: 0.01 });
  const [scx, scz] = [(sx0 + sx1) / 2, (sz0 + sz1) / 2];
  // the zelkova in a low round planter of stone above the gravel, mulch inside
  keyaki(q, scx, scz - 0.4, 1.05, 89);
  q.geo('#8b8d90', new THREE.CylinderGeometry(0.7, 0.72, 0.26, 18).translate(scx, 0.13, scz - 0.4), {
    surf: 'concrete',
  });
  q.geo(LEAF.mulch, new THREE.CylinderGeometry(0.6, 0.6, 0.02, 18).translate(scx, 0.27, scz - 0.4), { surf: 'soil' });
  sh.tree(scx, scz - 0.4, 1.05);
  bench(q, sx0 + 0.45, scz + 0.5, Math.PI / 2, { len: 1.3 });
  bench(q, sx1 - 0.45, scz + 0.5, -Math.PI / 2, { len: 1.3 });
  lamps(lights, q, [[sx1 - 0.3, sz0 + 0.3]], { kind: 'post', pool: 1.4 });
  const beds = [
    [
      [CLINIC[1] + 2.4, wx0 - 1.6, VB - 5.4, VB - 2.0],
      [
        [keyaki, 1.6, 1.1],
        [sakura, 4.6, 0.95],
      ],
    ],
    [
      [wx1 + 1.6, N.E2.rect[0] - 2.4, VB - 5.4, VB - 2.0],
      [
        [maple, 1.8, 0.95],
        [keyaki, 4.8, 1.1],
      ],
    ],
  ];
  beds.forEach(([r, trees], g) => {
    kerbRect(q, r);
    bed(q, [r[0] + 0.1, r[1] - 0.1, r[2] + 0.1, r[3] - 0.1], { y: 0.06 });
    trees.forEach(([kind, dx, s], i) => {
      const x = r[0] + dx,
        z = (r[2] + r[3]) / 2 + (i % 2 ? 0.4 : -0.3);
      kind(q, x, z, s, 90 + g * 4 + i);
      sh.tree(x, z, s);
    });
    for (const [dx, n] of [
      [0.7, 3],
      [3.1, 4],
      [r[1] - r[0] - 0.8, 4],
    ])
      cluster(q, r[0] + dx, r[3] - 0.7, { n, r: 0.34, seed: 92 + g * 3 + n });
  });
  // the row behind the square, on the lawn
  for (const [kind, x, s, seed] of [
    [sakura, CLINIC[1] + 3.4, 1.0, 101],
    [ginkgo, sx0 - 3.6, 1.0, 102],
    [ginkgo, sx1 + 3.6, 1.0, 103],
    [sakura, N.E2.rect[0] - 3.2, 0.95, 104],
  ]) {
    const z = sz0 - 1.8;
    tree(q, kind, x, z, s, seed);
    sh.tree(x, z, s);
  }
  // by the canteen: a zelkova and a cherry on the lawn past its east end, a ginkgo west of it toward office_e1
  for (const [kind, x, z, s, seed] of [
    [keyaki, CANTEEN[1] + 2.6, CANTEEN[3] - 3.2, 1.05, 96],
    [sakura, CANTEEN[1] + 4.8, CANTEEN[2] + 2.0, 0.95, 97],
    [ginkgo, CANTEEN[0] - 4.6, CANTEEN[3] - 0.4, 1.0, 98],
  ]) {
    tree(q, kind, x, z, s, seed);
    sh.tree(x, z, s);
  }
}

// builds it all into the plaza: lights, the plaza's light set. Returns the evening switch, and update(sun), which
// keeps the laid shadows on the side the sun is on
export function buildNorthLane(root, lights) {
  ground(root);
  const q = new Parts(),
    sets = blockSets(),
    sh = shade();
  planting(q, lights, sh);
  buildYard(q, sets, lights, sh);
  const cl = clinic(sets, q, lights, sh);
  for (const m of cl.meshes) root.add(m);
  officeE1(sets, N.E1);
  sh.block(N.E1, E1_H);
  const fronts = buildFronts(q, lights, [N.E2, N.M6]);
  for (const k of [N.E2, N.M6]) sh.block(k.rect, k.row.storeys * k.row.floorH);
  fronts.meshes(root);
  const group = new THREE.Group(); // everything here, so none of it casts
  root.add(group);
  const { lit } = buildBlockSets(sets, group);
  q.build(group);
  group.traverse((m) => (m.castShadow = false));
  const shadows = sh.build(root);
  return {
    evening() {
      if (lit) lit.visible = true;
      fronts.evening();
      cl.evening();
    },
    update(sun) {
      shadows.follow(sun.position);
    },
  };
}
