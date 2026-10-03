// What the 2F corridor looks down on over its parapet: the roofs of the fronts on the dorm court, the hall's, the
// laundry's and the sento's, built by the court's own builders (dorm-court/frontages.js) in the court's frame and
// set down in this one, the hall's roof covering the whole hall (the court camera sees into it; this one doesn't),
// the sento's chimney cut where it would stand in front of the corridor. The court's paving far below.
import * as THREE from 'three';
import { Parts } from '../outdoor/parts.js';
import { hallRoof, laundryRoof, sentoRoofs } from '../dorm-court/frontages.js';
import { BLOCK } from '../dorm-court/block.js';
import * as PL from '../dorm-court/plan.js';

export function below(root) {
  const g = new THREE.Group();
  g.position.set(-PL.DORMS.x, -PL.DORMS.y, -PL.DORMS.z);
  const p = new Parts();
  hallRoof(p, {
    x0: PL.HALL[0],
    x1: PL.HALL[1],
    back: PL.BLOCK_Z + BLOCK.corridor,
    front: PL.FRONT_Z + 0.09,
    full: true,
  });
  laundryRoof(p, { ...PL.LAUNDRY, back: PL.BLOCK_Z });
  sentoRoofs(p, { east: PL.EAST, back: PL.BLOCK_Z, cut: PL.DORMS.y + 0.2 });
  // the court's paving between and past them
  p.box('#4b4f57', 24, 0.02, 10, 0, -0.02, PL.BLOCK_Z + 5, { cast: false });
  p.build(g);
  root.add(g);
}
