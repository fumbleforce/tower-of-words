import * as THREE from 'three';
import { Kit } from '../dorms/kit.js';
import { shell, roomLights } from '../rooms/shell.js';
import { signBoard } from '../plaza-buildings.js';
import { rbox } from '../../props.js';
import { R, DOOR, SEAT, SPOTS, COUNTER, konbiniNav } from './plan.js';
import { grocery, basket, PRODUCT_X, PRODUCT_LABEL } from './products.js';
import { shopDetails } from './details.js';
import { ITEMS } from '../../gameplay/items.js';
export function buildKonbini() {
  const scene = new THREE.Scene(),
    root = new THREE.Group(),
    k = new Kit();
  scene.background = new THREE.Color('#34434d');
  scene.add(root);
  shell(root, R, {
    entryDoor: true,
    color: '#e0e3df',
    top: '#7b8d99',
    holes: {
      s: [
        [-0.55, 0.55, 0, R.near],
        [0.97, 2.03, R.near, 1.91],
      ],
    },
  });
  k.box('#cad2d1', 4.16, 0.1, 4.34, 0, -0.1, -2.17, { surf: 'tile' });
  for (let x = -1.5; x < 2; x += 0.5) k.box('#b5c0c2', 0.009, 0.003, 4.34, x, 0, -2.17);
  for (let z = -4; z < 0; z += 0.5) k.box('#b5c0c2', 4.16, 0.003, 0.009, 0, 0, z);
  k.box('#567489', 0.96, 0.018, 0.57, 0, 0.004, -0.3, { surf: 'carpet' });
  // Refrigerated case: real shelves, raised toe grille and sliding front panes.
  k.box('#8396a2', 2.82, 0.2, 0.82, -0.54, 0, -3.92, { surf: 'metal' });
  k.box('#dce5e1', 2.65, 1.7, 0.055, -0.54, 0.19, -4.29, { surf: 'metal' });
  for (const x of [-1.91, 0.83]) k.box('#8396a2', 0.08, 1.9, 0.82, x, 0, -3.92, { surf: 'metal' });
  k.box('#8396a2', 2.82, 0.09, 0.82, -0.54, 1.82, -3.92, { surf: 'metal' });
  for (const y of [0.3, 0.68, 1.08, 1.48]) k.box('#c1cccb', 2.68, 0.04, 0.56, -0.54, y, -3.67, { surf: 'metal' });
  for (let x = -1.82; x < 0.8; x += 0.09) k.box('#4e6471', 0.028, 0.1, 0.018, x, 0.07, -3.5, { surf: 'metal' });
  const stock = [];
  for (const [id, x] of Object.entries(PRODUCT_X)) {
    for (const y of [0.34, 0.72, 1.12, 1.52])
      for (const [dx, z] of [
        [0, -3.5],
        [-0.22, -3.5],
        [0.22, -3.5],
        [0, -3.7],
        [-0.22, -3.7],
        [0.22, -3.7],
        [0, -3.92],
      ]) {
        const o = grocery(id);
        o.position.set(x + dx, y, z);
        root.add(o);
        stock.push(o);
      }
    const [ja, en] = PRODUCT_LABEL[id],
      tag = signBoard(ja, `${en} · ${ITEMS[id].price}`, 0.5, 0.17, '#45667e');
    tag.position.set(x, 0.66, -3.34);
    root.add(tag);
  }
  const fridge = [];
  for (const side of [-1, 1]) {
    const pane = new THREE.Group();
    pane.name = 'konbini-fridge-door';
    pane.userData.noBatch = true;
    pane.position.set(-0.54 + side * 0.68, 0, -3.33 + (side === 1 ? 0.025 : 0));
    const glass = rbox(1.3, 1.55, 0.018, '#c7dedb', { y: 1.04 });
    glass.material = glass.material.clone();
    glass.material.transparent = true;
    glass.material.opacity = 0.14;
    glass.castShadow = false;
    pane.add(glass);
    for (const x of [-0.665, 0.665]) pane.add(rbox(0.035, 1.7, 0.055, '#556c7c', { x, y: 1.04 }));
    for (const y of [0.19, 1.89]) pane.add(rbox(1.35, 0.045, 0.055, '#556c7c', { y }));
    pane.add(rbox(0.024, 0.35, 0.06, '#b3c2c8', { x: -side * 0.57, y: 0.9, z: 0.045 }));
    root.add(pane);
    fridge.push(pane);
  }
  // Household shelf stays shallow, leaving a usable centre aisle and a turn beside the till.
  k.box('#697e8d', 0.05, 1.55, 1.74, 2.055, 0, -2.55, { surf: 'metal' });
  for (const z of [-3.43, -1.67]) k.box('#697e8d', 0.72, 1.55, 0.04, 1.71, 0, z, { surf: 'metal' });
  for (const y of [0.16, 0.53, 0.9, 1.27]) {
    k.box('#d8dfdc', 0.77, 0.035, 1.78, 1.69, y, -2.55, { surf: 'metal' });
    for (const z of y === 0.9 ? [-3.21, -2.82, -2.43, -2.04] : []) {
      k.box(y > 0.8 ? '#a8bdb9' : '#c7d1dc', 0.3, 0.25, 0.26, 1.53, y + 0.04, z, { surf: 'card', r: 0.009 });
      k.box('#edf0e8', 0.012, 0.07, 0.23, 1.371, y + 0.15, z, { surf: 'card' });
    }
  }
  const supplies = signBoard('日用品', 'DAILY SUPPLIES · 100', 1.34, 0.25, '#4d6c83');
  supplies.position.set(2.056, 1.9, -2.53);
  supplies.rotation.y = -Math.PI / 2;
  root.add(supplies);
  // Checkout is an L-shaped staff corner, physically separate from the door and customer approach.
  k.box('#6c8498', 0.34, COUNTER.top - 0.05, 1.47, COUNTER.x, 0, COUNTER.z, { surf: 'laminate' });
  k.box('#dfe4df', 0.4, 0.055, 1.52, COUNTER.x, COUNTER.top - 0.05, COUNTER.z, { surf: 'stone' });
  k.box('#445967', 0.31, 0.032, 0.25, -1.13, COUNTER.top + 0.005, -1.96, { surf: 'metal' });
  k.box('#485f72', 0.23, 0.19, 0.14, -1.16, COUNTER.top + 0.04, -1.97, { surf: 'metal' });
  const total = signBoard('0', 'YEN', 0.31, 0.18, '#304d62');
  total.position.set(-0.95, COUNTER.top + 0.18, -1.91);
  total.rotation.y = Math.PI / 2;
  root.add(total);
  k.box('#334c61', 0.035, 0.34, 0.04, -1.9, 0.76, -0.85, { surf: 'metal' });
  for (let n = 0; n < 4; n++)
    k.box('#dce5dc', 0.25, 0.2, 0.025, -1.82 + n * 0.012, 0.78, -0.84 + n * 0.03, { surf: 'card' });
  for (let n = 0; n < 3; n++) {
    const b = basket();
    b.scale.setScalar(0.8);
    b.position.set(-1.56, 0.1 + n * 0.05, -0.52);
    root.add(b);
  }
  // Street-facing nook: stool, deep ledge and glazing only above the overview cut.
  k.box('#b5c5cf', 1.08, 0.06, 0.72, 1.51, 0.65, -0.37, { surf: 'laminate' });
  k.box('#607e94', 0.43, 0.05, 0.43, SEAT.x, SEAT.top - 0.05, SEAT.z, { surf: 'fabric', r: 0.02 });
  for (const dx of [-0.17, 0.17])
    for (const dz of [-0.17, 0.17])
      k.box('#586f7e', 0.032, SEAT.top - 0.05, 0.032, SEAT.x + dx, 0, SEAT.z + dz, { surf: 'metal' });
  k.box('#607e94', 0.43, 0.27, 0.045, SEAT.x, SEAT.top, SEAT.z - 0.21, { surf: 'laminate' });
  const windowKit = new Kit(),
    full = root.getObjectByName('follow-interior');
  windowKit.box('#e0e3df', 1.06, 0.79 - R.near, R.t, 1.5, R.near, R.t / 2, { surf: 'plaster', cast: false });
  for (const x of [0.95, 2.05])
    windowKit.box('#5c788d', 0.04, 1.16, 0.1, x, 0.77, 0.02, { surf: 'frame', cast: false });
  for (const y of [0.77, 1.91])
    windowKit.box('#5c788d', 1.14, 0.035, 0.1, 1.5, y, 0.02, { surf: 'frame', cast: false });
  windowKit.box('#cedfe0', 1.06, 1.12, 0.025, 1.5, 0.79, 0.06, { surf: 'glass', cast: false });
  const glazing = new THREE.Group();
  windowKit.flush(glazing);
  glazing.traverse((o) => {
    if (o.isMesh) o.userData.noBatch = true;
  });
  full.add(glazing);
  shopDetails(root, full);
  k.flush(root);
  const sun = roomLights(
    scene,
    root,
    {
      sky: '#ecf3ed',
      ground: '#7c8782',
      k: 1.45,
      key: { color: '#f4f1df', k: 1.2, at: [3, 9, 5] },
      lamps: [{ at: [0, 2.14, -2], color: '#f3f5e8', k: 1.5, reach: 5 }],
    },
    R,
  );
  return {
    scene,
    root,
    sun,
    nav: konbiniNav(),
    bounds: R,
    door: DOOR,
    seats: { konbini_seat: SEAT },
    spots: SPOTS,
    fridge,
    total,
    stock,
  };
}
