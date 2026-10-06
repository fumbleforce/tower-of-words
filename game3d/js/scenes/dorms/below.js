// What a corridor floor looks down on over its parapet: the roofs of the fronts on the dorm court, the hall's, the
// laundry's and the sento's, built by the court's own builders (dorm-court/frontages.js) in the court's frame and
// set down in this one, the hall's roof covering the whole hall (the court camera sees into it; this one doesn't),
// the sento's chimney cut where it would stand in front of the corridor. The court's paving far below, and at the
// west end the crowns of the garden's trees. `drop`: how far this floor is above 2F (3F looks down a storey more).
import * as THREE from 'three';
import { Parts } from '../outdoor/parts.js';
import { hallRoof, laundryRoof, sentoRoofs } from '../dorm-court/frontages.js';
import { BLOCK } from '../dorm-court/block.js';
import { keyaki, maple, hedge, cluster } from '../outdoor/planting.js';
import { lightPool } from '../../places/life.js';
import * as PL from '../dorm-court/plan.js';

// the garden's tall trees west of the laundry, in the court's frame: x, z, size, a zelkova or a maple
const TREES = [
  [-7.2, -1.8, 1.0, keyaki],
  [-9.6, -0.9, 0.85, maple],
  [-8.4, 1.4, 1.05, keyaki],
  [-10.8, 2.2, 0.9, maple],
];

export function below(root, { drop = 0 } = {}) {
  const g = new THREE.Group();
  g.position.set(-PL.DORMS.x, -PL.DORMS.y - drop, -PL.DORMS.z);
  const p = new Parts();
  hallRoof(p, {
    x0: PL.HALL[0],
    x1: PL.HALL[1],
    back: PL.BLOCK_Z + BLOCK.corridor,
    front: PL.FRONT_Z + 0.09,
    full: true,
  });
  laundryRoof(p, { ...PL.LAUNDRY, back: PL.BLOCK_Z });
  sentoRoofs(p, { east: PL.EAST, back: PL.BLOCK_Z, cut: PL.DORMS.y + drop + 0.2 });
  // the court's paving between and past them
  p.box('#4b4f57', 24, 0.02, 10, 0, -0.02, PL.BLOCK_Z + 5, { cast: false });
  // the garden west of the laundry: moss under the trees, the hedge along the block's foot, shrubs, its tall lamp
  const [g0, g1, g2, g3] = PL.GARDEN;
  p.box('#2b372f', g1 - g0, 0.03, g3 - g2, (g0 + g1) / 2, -0.01, (g2 + g3) / 2, { cast: false }); // moss, in the dark
  hedge(p, [g0 + 0.5, g2 + 0.35], [g1 - 0.2, g2 + 0.35], { seed: 4 });
  for (const [x, z, seed] of [
    [-6.8, 0.2, 2],
    [-9.2, 1.0, 5],
    [-11.4, -0.6, 7],
    [-7.6, 2.6, 9],
  ])
    cluster(p, x, z, { n: 4, r: 0.38, seed });
  TREES.forEach(([x, z, k, tree], i) => tree(p, x, z, k, i + 3));
  const [lx, lz] = PL.LAMPS[1];
  p.box('#3d4148', 0.08, 2.1, 0.08, lx, 0, lz);
  p.box('#f3ead6', 0.22, 0.14, 0.22, lx, 2.1, lz, {
    cast: false,
    opts: { emissive: '#ffe2b0', emissiveIntensity: 1.6 },
  });
  g.add(lightPool(lx, lz, 1.4, { k: 0.22 }));
  p.build(g);
  root.add(g);
}
