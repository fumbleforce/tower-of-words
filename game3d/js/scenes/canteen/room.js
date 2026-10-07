import * as THREE from 'three';
import { Kit } from '../dorms/kit.js';
import { shell, roomLights, roomNav } from '../rooms/shell.js';
import { R, DOOR, SPOTS, SEATS } from './plan.js';
import { canteenDetail } from './detail.js';
import { dining, service } from './furniture.js';

export function buildCanteen() {
  const scene = new THREE.Scene(),
    root = new THREE.Group(),
    kit = new Kit();
  scene.background = new THREE.Color('#29353a');
  scene.add(root);
  const nav = roomNav(R);
  shell(root, R, {
    entryDoor: true,
    holes: { s: [[DOOR.x - 0.8, DOOR.x + 0.8, 0, R.near]] },
    color: '#e1dbcb',
    top: '#9d9b8f',
  });
  kit.box('#d5c9af', R.x1 - R.x0, 0.12, -R.z0, 0, -0.12, R.z0 / 2, { surf: 'tile', cast: false });
  // Durable square floor tiles, a teal service strip and a recessed entry mat.
  for (let x = R.x0 + 0.75; x < R.x1; x += 0.75)
    kit.box('#bbb29d', 0.012, 0.003, -R.z0, x, 0, R.z0 / 2, { cast: false });
  for (let z = R.z0 + 0.75; z < 0; z += 0.75) kit.box('#bbb29d', R.x1 - R.x0, 0.003, 0.012, 0, 0, z, { cast: false });
  kit.box('#91aaa3', 12.2, 0.008, 0.75, -2.7, 0.004, -6.0, { surf: 'stone', cast: false });
  kit.box('#465c5d', 1.6, 0.012, 0.7, DOOR.x, 0.008, -0.36, { surf: 'carpet', cast: false });
  for (const x of [DOOR.x - 0.84, DOOR.x + 0.84]) kit.box('#46605f', 0.07, 0.35, 0.09, x, 0, 0);
  // Lower wall protection and tall back windows; the near glazing is cut with the front wall for the game camera.
  kit.box('#74968a', R.x1 - R.x0, 0.45, 0.03, 0, 0.08, R.z0 + 0.01, { surf: 'plaster' });
  const windows = new THREE.Group();
  for (const x of [-9.5, -6.5, -3.5, -0.5, 2.5, 6.5, 9.5]) {
    kit.box('#536661', 1.8, 0.68, 0.05, x, 1.3, R.z0 + 0.035, { surf: 'frame' });
    const pane = new THREE.Mesh(
      new THREE.BoxGeometry(1.64, 0.54, 0.055),
      new THREE.MeshStandardMaterial({
        color: '#b9d5d9',
        emissive: '#b9d5d9',
        emissiveIntensity: 0.2,
        roughness: 0.65,
      }),
    );
    pane.position.set(x, 1.64, R.z0 + 0.06);
    windows.add(pane);
  }
  root.add(windows);
  // Service hatch to the closed kitchen, with shelf, stacks of dishes and a ventilation hood.
  kit.box('#52696b', 7.3, 0.7, 0.08, -2.8, 0.85, R.z0 + 0.06, { surf: 'metal' });
  kit.box('#c2cac5', 7.6, 0.16, 0.65, -2.8, 1.95, R.z0 + 0.27, { surf: 'metal' });
  kit.box('#a9b5b1', 7.5, 0.055, 0.4, -2.8, 0.88, R.z0 + 0.25, { surf: 'metal' });
  for (const x of [-5.5, -4.9, -1.5])
    for (let i = 0; i < 5; i++)
      kit.cyl('#eee7d7', 0.15, 0.15, 0.025, x, 0.94 + i * 0.026, R.z0 + 0.25, { surf: 'ceramic' });
  dining(kit, nav);
  service(kit, nav);
  canteenDetail(kit);
  // Keep the kitchen/service staff lane out of player navigation; it is visibly behind the counter.
  nav.block(R.x0, R.x1, R.z0, -6.55);
  const lamps = new THREE.Group();
  for (const x of [-8.5, -1.5, 7.5])
    for (const z of [R.z0 + 0.24]) {
      kit.box('#62706a', 1.35, 0.06, 0.24, x, 2.07, z, { surf: 'metal' });
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(1.25, 0.02, 0.19),
        new THREE.MeshStandardMaterial({ color: '#fff1d5', emissive: '#ffe4ae', emissiveIntensity: 0.35 }),
      );
      panel.position.set(x, 2.07, z);
      lamps.add(panel);
    }
  root.add(lamps);
  kit.flush(root);
  const sun = roomLights(
    scene,
    root,
    { sky: '#edf1e6', ground: '#78756a', k: 1.4, key: { color: '#fff5df', k: 1.1, at: [-5, 14, 8] } },
    R,
  );
  const hemi = scene.children.find((o) => o.isHemisphereLight);
  function period(value) {
    const night = value === 'evening';
    hemi.intensity = night ? 1.1 : 1.4;
    hemi.color.set(night ? '#ffe7c7' : '#edf1e6');
    sun.intensity = night ? 0.65 : 1.1;
    sun.color.set(night ? '#ffddb0' : '#fff5df');
    for (const pane of windows.children) {
      pane.material.color.set(night ? '#344d60' : '#b9d5d9');
      pane.material.emissive.set(night ? '#344d60' : '#b9d5d9');
      pane.material.emissiveIntensity = night ? 0.05 : 0.2;
    }
    for (const lamp of lamps.children) lamp.material.emissiveIntensity = night ? 1.1 : 0.35;
  }
  return { scene, root, nav, sun, bounds: R, door: DOOR, spots: SPOTS, seats: SEATS, period };
}
