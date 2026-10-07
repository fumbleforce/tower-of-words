import * as THREE from 'three';
import { mat } from '../../props.js';
import { T, parts } from '../head-office/frame.js';
import { upper, ground } from '../head-office/tower.js';
import { blockSets, officeBlock, buildBlockSets } from '../outdoor/block.js';
import { BUILDINGS } from '../island-layout.js';
import { block as officeBlockPlan } from '../office-quarter/plan.js';
import { TOWN } from '../town.js';
import { signBoard } from '../plaza-buildings.js';
import { rect, PRINT_DOOR } from './plan.js';

// The exact approved head-office facade, without installing another receptionist or lobby lifecycle.
export function campusFronts(root) {
  const tower = new THREE.Group();
  tower.position.set(T.o[0], 0, T.o[1]);
  root.add(tower);
  const glass = parts(),
    lit = parts(),
    frame = parts(),
    lobby = parts();
  upper(glass, lit, frame, lobby);
  ground(tower, frame);
  for (const [p, c] of [
    [glass, '#8c9dad'],
    [lit, '#8c9dad'],
    [frame, '#b3b9c0'],
    [lobby, '#95a3ad'],
  ]) {
    const m = p.mesh(mat(c), 'campus-tower');
    if (m) tower.add(m);
  }
  const sets = blockSets();
  for (const id of ['w3', 'b_h']) {
    const b = BUILDINGS.find((x) => x.id === id),
      r = rect([b.rect[0], b.rect[2], b.rect[1], b.rect[3]]);
    officeBlock(sets, r, {
      storeys: b.storeys,
      fh: b.floorH,
      wall: id === 'w3' ? '#a3afb7' : TOWN.walls[1],
      doors: [
        {
          face: 'e',
          at: id === 'w3' ? PRINT_DOOR[1] : officeBlockPlan('b_h').door[1] + 0.65,
          w: id === 'w3' ? 1.25 : officeBlockPlan('b_h').w,
        },
      ],
      seed: id === 'w3' ? 831 : officeBlockPlan('b_h').seed,
    });
  }
  const blocks = buildBlockSets(sets, root);
  const sign = signBoard('いんさつ', 'PRINT SHOP', 2.5, 0.52, '#426773');
  sign.rotation.y = Math.PI / 2;
  sign.position.set(PRINT_DOOR[0] + 0.8, 2.62, PRINT_DOOR[1]);
  root.add(sign);
  return blocks;
}
