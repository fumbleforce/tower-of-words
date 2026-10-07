import * as THREE from 'three';
import { Parts } from '../outdoor/parts.js';
import { paver } from '../outdoor/paving.js';
import { blockSets, buildBlockSets } from '../outdoor/block.js';
import { signSet } from '../shop-signs.js';
import { ferrySteps } from '../harbour/ships.js';
import { ferryLandingSteps } from '../harbour/quay.js';
import { SEA_Y, LANDING, FERRY_PIER } from '../harbour/plan.js';
import { SEA } from '../skyline.js';
import { ISLAND_DOOR } from './plan.js';
// Same island coordinates and builders as the exterior; this room owns no outdoor population or navigation.
export function terminalView(root) {
  const group = new THREE.Group(),
    sets = blockSets(),
    signs = signSet(),
    p = new Parts(),
    pv = paver();
  group.name = 'ferry-window-view';
  group.position.set(-ISLAND_DOOR[0], 0, -ISLAND_DOOR[1]);
  for (const _ of ferrySteps(sets, signs)) void _;
  for (const _ of ferryLandingSteps(pv, p)) void _;
  pv.build(group);
  p.build(group);
  const blocks = buildBlockSets(sets, group),
    labels = signs.build(group);
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(180, 180),
    new THREE.MeshStandardMaterial({ color: SEA, roughness: 0.8 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set((LANDING[0] + LANDING[1]) / 2, SEA_Y, FERRY_PIER[3] + 30);
  group.add(water);
  root.add(group);
  return {
    group,
    period(value) {
      if (blocks.lit) blocks.lit.visible = value === 'evening';
      if (value === 'evening') labels.evening();
    },
  };
}
