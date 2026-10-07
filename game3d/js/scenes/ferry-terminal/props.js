import * as THREE from 'three';
import { rbox } from '../../props.js';
import { BAG_HOME, BAG_FLOOR } from './plan.js';
function leaflet() {
  const g = new THREE.Group();
  g.add(rbox(0.23, 0.012, 0.18, '#e8ece3', { r: 0.003 }));
  g.add(rbox(0.09, 0.003, 0.13, '#7b9b9d', { x: -0.055, y: 0.008, z: -0.008 }));
  for (let i = 0; i < 4; i++)
    g.add(rbox(0.078, 0.003, 0.009, '#78908e', { x: 0.061, y: 0.008, z: -0.045 + i * 0.025 }));
  return g;
}
function luggage() {
  const g = new THREE.Group();
  g.add(rbox(0.5, 0.36, 0.28, '#44616f', { y: -0.25, r: 0.055, seg: 2, surf: 'fabric' }));
  g.add(rbox(0.32, 0.17, 0.025, '#5f7d85', { y: -0.25, z: 0.149, r: 0.024, surf: 'fabric' }));
  for (const x of [-0.105, 0.105]) g.add(rbox(0.035, 0.13, 0.035, '#2e434c', { x, y: -0.045, r: 0.012 }));
  g.add(rbox(0.24, 0.04, 0.035, '#2e434c', { y: 0.015, r: 0.012 }));
  g.add(rbox(0.41, 0.014, 0.017, '#b5c6c5', { y: -0.085, z: 0.119 }));
  // A folded umbrella in its side sleeve, the object the traveller is checking.
  g.add(rbox(0.055, 0.29, 0.055, '#738476', { x: 0.23, y: -0.12, r: 0.022 }));
  g.add(rbox(0.035, 0.12, 0.035, '#344c51', { x: 0.23, y: 0.07, r: 0.012 }));
  return g;
}
export function terminalProps(space) {
  const root = new THREE.Group();
  root.name = 'terminal-activity-props';
  root.userData.noBatch = true;
  space.add(root);
  const bag = luggage(),
    reader = leaflet(),
    staff = leaflet();
  for (const [id, item] of Object.entries({ bag, reader, staff })) {
    item.name = 'terminal-' + id;
    root.add(item);
    item.userData.noBatch = true;
  }
  const bagAt = (where) => [where[0], where[1] + 0.43, where[2]];
  return {
    root,
    bag,
    reader,
    staff,
    bagAt,
    reset(moved) {
      root.attach(bag);
      bag.position.set(...bagAt(moved ? BAG_FLOOR : BAG_HOME));
      bag.rotation.set(0, 0, 0);
      root.attach(staff);
      staff.position.set(4.87, 0.8, -6.28);
      staff.rotation.set(-0.9, 0, 0);
    },
    dispose() {
      root.removeFromParent();
    },
  };
}
