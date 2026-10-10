import * as THREE from 'three';
import { Kit } from '../dorms/kit.js';
import { shell, roomLights } from '../rooms/shell.js';
import { signBoard } from '../plaza-buildings.js';
import { R, DOOR, SEAT, SPOTS, bakeryNav } from './plan.js';
import { bread, tray, tongs } from './models.js';
import { bakeryDetail } from './detail.js';
export function buildBakery() {
  const scene = new THREE.Scene(),
    root = new THREE.Group(),
    k = new Kit();
  scene.background = new THREE.Color('#34434a');
  scene.add(root);
  shell(root, R, {
    entryDoor: true,
    holes: {
      s: [
        [-0.55, 0.55, 0, R.near],
        [0.97, 2.03, R.near, 1.91],
      ],
    },
    color: '#dedfd3',
    top: '#879793',
  });
  k.box('#bfc8be', 4.16, 0.12, 4.34, 0, -0.12, -2.17, { surf: 'stone' });
  for (let x = -1.5; x < 2; x += 0.5) k.box('#a4b2ab', 0.009, 0.004, 4.34, x, 0, -2.17);
  for (let z = -4; z < 0; z += 0.5) k.box('#a4b2ab', 4.16, 0.004, 0.009, 0, 0, z);
  k.box('#486665', 0.94, 0.013, 0.55, 0, 0.005, -0.3, { surf: 'carpet' });
  // Low display along the left wall, with a lit raised cooling shelf behind it.
  k.box('#667e78', 0.8, 0.65, 1.9, -1.65, 0, -1.65, { surf: 'laminate' });
  for (const y of [0.65, 1.05]) k.box('#cbd0c3', 0.8, 0.04, 1.88, -1.65, y, -1.65, { surf: 'laminate' });
  for (const z of [-2.52, -0.78]) k.box('#637575', 0.06, 1.35, 0.06, -1.99, 0, z, { surf: 'metal' });
  k.box('#e3dbbd', 0.12, 0.05, 1.87, -1.97, 1.33, -1.65, { surf: 'metal' });
  for (const [id, z, name, price] of [
    ['curry_bread', -1.42, 'CURRY BREAD', '180'],
    ['butter_roll', -2.12, 'BUTTER ROLL', '120'],
  ]) {
    for (const y of [0.72, 1.12])
      for (const x of [-1.76, -1.46]) {
        const b = bread(id);
        b.position.set(x, y, z);
        root.add(b);
      }
    const tag = signBoard(price, name, 0.49, 0.16, '#435e5b');
    tag.position.set(-1.225, 0.75, z);
    tag.rotation.y = Math.PI / 2;
    root.add(tag);
  }
  // The counter leaves an open staff lane at its left end, visually distinct from the public aisle.
  k.box('#608279', 2.28, 0.67, 0.34, 0.85, 0, -2.98, { surf: 'laminate' });
  k.box('#ddd4bc', 2.38, 0.055, 0.4, 0.85, 0.67, -2.98, {
    surf: 'laminate',
    r: 0.02,
  });
  k.box('#425c5b', 0.33, 0.035, 0.26, 1.59, 0.725, -2.91, { surf: 'metal' });
  k.box('#485f65', 0.28, 0.19, 0.13, 1.62, 0.76, -3.04, { surf: 'metal' });
  k.box('#b7d4c8', 0.235, 0.11, 0.012, 1.62, 0.805, -2.97, { surf: 'glass' });
  // Real prep counter, compact oven door/handle and stacked cooling trays.
  k.box('#a7b2ad', 3.87, 0.7, 0.48, 0, 0, -4.07, { surf: 'metal' });
  k.box('#d5d7c9', 3.9, 0.04, 0.5, 0, 0.7, -4.07, { surf: 'stone' });
  k.box('#3e4e53', 1.06, 0.41, 0.025, -1.3, 0.15, -3.814, { surf: 'glass' });
  k.box('#c1cac3', 0.87, 0.028, 0.08, -1.3, 0.57, -3.77, { surf: 'metal' });
  for (let n = 0; n < 4; n++)
    k.box('#899b99', 0.59, 0.033, 0.33, -1.25, 0.74 + n * 0.055, -4.04, {
      surf: 'metal',
    });
  for (const x of [1.1, 1.55])
    k.box('#e2d3b5', 0.33, 0.48, 0.27, x, 0.74, -4.09, {
      surf: 'fabric',
      r: 0.04,
    });
  for (const y of [1.39, 1.78]) {
    k.box('#8b9b8b', 1.38, 0.04, 0.3, 0.53, y, -4.16, { surf: 'laminate' });
    for (const x of [0.13, 0.55, 0.97]) k.box('#e4d5b7', 0.28, 0.22, 0.2, x, y + 0.04, -4.12, { surf: 'card' });
  }
  const reserved = signBoard('お取り置き', 'RESERVED', 1.05, 0.2, '#486563');
  reserved.position.set(0.53, 2.13, -4.245);
  root.add(reserved);
  // One seated window nook; knees fit below the ledge, approach and entry remain clear.
  k.box('#bdad8c', 1.08, 0.06, 0.72, 1.51, 0.65, -0.37, { surf: 'laminate' });
  k.box('#5d7e76', 0.43, 0.05, 0.43, SEAT.x, SEAT.top - 0.05, SEAT.z, {
    surf: 'fabric',
    r: 0.02,
  });
  for (const dx of [-0.17, 0.17])
    for (const dz of [-0.17, 0.17])
      k.box('#546561', 0.032, SEAT.top - 0.05, 0.032, SEAT.x + dx, 0, SEAT.z + dz, { surf: 'metal' });
  k.box('#5d7e76', 0.43, 0.27, 0.045, SEAT.x, SEAT.top, SEAT.z - 0.21, {
    surf: 'laminate',
  });
  // This bay shares its east wall with the next shop. The perch faces the actual street window.
  const menu = signBoard('焼きたてパン', 'FRESH BREAD · CURRY 180 / BUTTER 120', 1.2, 0.46, '#486563');
  menu.position.set(2.055, 1.39, -1.34);
  menu.rotation.y = -Math.PI / 2;
  root.add(menu);
  const windowKit = new Kit(),
    enclosure = root.getObjectByName('follow-interior');
  for (const x of [0.95, 2.05])
    windowKit.box('#516d6e', 0.04, 1.16, 0.1, x, 0.77, 0.02, {
      surf: 'frame',
      cast: false,
    });
  for (const y of [0.77, 1.91])
    windowKit.box('#516d6e', 1.14, 0.035, 0.1, 1.5, y, 0.02, {
      surf: 'frame',
      cast: false,
    });
  windowKit.box('#c6ddd6', 1.06, 1.12, 0.025, 1.5, 0.79, 0.06, {
    surf: 'glass',
    cast: false,
  });
  const glazing = new THREE.Group();
  glazing.name = 'bakery-street-window';
  windowKit.flush(glazing);
  glazing.traverse((o) => {
    if (o.isMesh) o.userData.noBatch = true;
  });
  enclosure.add(glazing);
  for (const x of [-1.35, 1.35]) k.box('#506966', 0.42, 0.06, 0.17, x, 2.11, -4.19, { surf: 'metal' });
  bakeryDetail(k, R);
  k.flush(root);
  for (let i = 0; i < 4; i++) {
    const t = tray();
    t.position.set(-1.59, 0.71 + i * 0.035, -0.91);
    root.add(t);
  }
  const tong = tongs();
  tong.position.set(-1.36, 0.86, -0.93);
  root.add(tong);
  const sun = roomLights(
    scene,
    root,
    {
      sky: '#f0f4e5',
      ground: '#777e71',
      k: 1.5,
      key: { color: '#fff0d5', k: 1.2, at: [3, 9, 5] },
      lamps: [{ at: [0.2, 2.15, -2], color: '#ffe9c8', k: 1.4, reach: 5 }],
    },
    R,
  );
  return {
    scene,
    root,
    sun,
    nav: bakeryNav(),
    bounds: R,
    door: DOOR,
    seats: { bakery_seat: SEAT },
    spots: SPOTS,
  };
}
