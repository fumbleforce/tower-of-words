import * as THREE from 'three';
import { Parts } from '../outdoor/parts.js';
import { buildSkyline } from '../skyline.js';
import * as layout from '../island-layout.js';
import { coastLand } from '../island-west.js';
import { TOWN } from '../town.js';
import { station } from '../works/props.js';
import { stationDetails } from '../works/service-details.js';
import { signSet } from '../shop-signs.js';
import { ORIGIN } from './plan.js';
// Actual island neighbours and the same instruments as the works, without new routes or residents.
export function researchWindowView(root) {
  const sky = buildSkyline(root, 'research_lab', {
    layout,
    skip: ['n4'],
    land: coastLand(layout.COAST.line),
    landColor: TOWN.grass,
    near: 40,
    far: 80,
  });
  const group = new THREE.Group(),
    p = new Parts(),
    mesh = new Parts(),
    signs = signSet();
  group.name = 'research-window-view';
  group.position.set(-ORIGIN[0], 0, -ORIGIN[1]);
  station(p, mesh);
  stationDetails(p, signs);
  p.build(group);
  mesh.build(group);
  signs.build(group);
  root.add(group);
  return sky;
}
