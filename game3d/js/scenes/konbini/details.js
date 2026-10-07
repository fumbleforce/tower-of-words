import * as THREE from 'three';
import { Kit } from '../dorms/kit.js';
import { rbox, mat, sh } from '../../props.js';
import { COUNTER } from './plan.js';
export function shopDetails(root, follow) {
  const k = new Kit();
  // Different household packages fill the shallow shelf without narrowing the aisle.
  for (const z of [-3.17, -2.77, -2.37, -1.97]) {
    k.box('#d5dfdb', 0.28, 0.11, 0.25, 1.5, 0.195, z, { surf: 'card', r: 0.015 });
    k.box('#ecede5', 0.08, 0.025, 0.14, 1.49, 0.305, z, { surf: 'fabric', r: 0.014 });
    for (const x of [1.43, 1.72]) {
      const bottle = sh(
        new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.057, 0.2, 10), mat(z < -2.5 ? '#789ba5' : '#8b9f84')),
      );
      bottle.position.set(x, 0.665, z);
      root.add(bottle);
      k.box('#e4e8df', 0.055, 0.035, 0.055, x, 0.765, z, { surf: 'plastic' });
      k.box('#edf0e8', 0.012, 0.07, 0.07, x - 0.054, 0.66, z, { surf: 'card' });
    }
    for (const d of [-0.08, 0.02, 0.12])
      k.box('#afbfd0', 0.12, 0.25, 0.026, 1.42, 1.31, z + d, { surf: 'card', r: 0.005 });
  }
  // Receipt roll, keypad, coin tray and a power cable stay on the staff side of the clear bagging area.
  k.box('#ecece2', 0.065, 0.025, 0.17, -1.15, COUNTER.top + 0.16, -1.97, { surf: 'card' });
  for (let x = 0; x < 3; x++)
    for (let z = 0; z < 3; z++)
      k.box('#82949e', 0.022, 0.008, 0.023, -1.07 + x * 0.028, COUNTER.top + 0.04, -2.06 + z * 0.033, {
        surf: 'plastic',
      });
  k.box('#859ba9', 0.14, 0.015, 0.16, -1.14, COUNTER.top + 0.006, -0.81, { surf: 'plastic', r: 0.025 });
  for (const [x, z] of [
    [-1.21, -0.82],
    [-1.15, -0.85],
  ]) {
    const c = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.003, 12), mat('#b8c2c4')));
    c.position.set(x, COUNTER.top + 0.025, z);
    root.add(c);
  }
  for (const z of [-2.03, -1.99, -1.95]) k.box('#354b57', 0.19, 0.012, 0.012, -1.57, 0.095, z, { surf: 'plastic' });
  k.box('#b0bfc4', 0.12, 0.16, 0.024, -2.065, 0.2, -1.98, { surf: 'plastic' });
  // Skirting scuffs, front mat edge and perforated return-air grille are tied to the actual floor and rear wall.
  for (let i = 0; i < 18; i++)
    k.box('#acb8b9', 0.05 + (i % 3) * 0.025, 0.008, 0.006, -1.91 + (i % 9) * 0.44, 0.06, i < 9 ? -0.035 : -4.305);
  for (let i = 0; i < 18; i++) k.box('#617b88', 0.018, 0.2, 0.016, -0.94 + i * 0.05, 2.04, -4.3, { surf: 'metal' });
  k.flush(root);
  const lamps = new Kit();
  for (const z of [-1, -2.7]) {
    lamps.box('#657c8d', 0.92, 0.045, 0.18, 0, 2.22, z, { surf: 'metal' });
    lamps.box('#e6eee7', 0.82, 0.018, 0.14, 0, 2.205, z, { surf: 'glass', cast: false });
  }
  const g = new THREE.Group();
  lamps.flush(g);
  g.traverse((o) => {
    if (o.isMesh) o.userData.noBatch = true;
  });
  follow.add(g);
  // Small visible wrapper bin under the perch, entirely inside its existing blocked footprint.
  root.add(rbox(0.26, 0.29, 0.24, '#8198a5', { x: 1.92, y: 0.15, z: -0.39, r: 0.025 }));
  root.add(rbox(0.19, 0.025, 0.13, '#364d5a', { x: 1.92, y: 0.305, z: -0.39, r: 0.018 }));
}
