import { archiveArea } from './archive.js';
import { researchWindowView } from './view.js';
import { roomDetails } from './details.js';
import * as THREE from 'three';
import { Kit } from '../dorms/kit.js';
import { shell, roomLights, plankFloor } from '../rooms/shell.js';
import { R, DOOR, SEATS, SPOTS, INDEX, researchNav } from './plan.js';
import { furniture } from './furniture.js';
import { readingBooks } from './books.js';
export function buildResearchRoom({ preview = false } = {}) {
  const scene = new THREE.Scene(),
    root = new THREE.Group(),
    k = new Kit();
  scene.background = new THREE.Color('#b9c5c4');
  scene.add(root);
  const windows = [
    [-3.0, -1.9, 0.8, 1.7],
    [-1.5, -0.4, 0.8, 1.7],
    [0, 1.1, 0.8, 1.7],
    [1.5, 2.6, 0.8, 1.7],
  ];
  shell(root, R, { holes: { w: [[-0.55, 0.55, 0, 1.85]], n: windows }, color: '#eee7d8', top: '#c9bfaa' });
  plankFloor(k, R, { color: '#c6b99e', seam: '#ad9e84', w: 0.35 });
  for (const [a, b, lo, hi] of windows) {
    for (const x of [a, b]) k.box('#89958c', 0.045, hi - lo, 0.08, x, lo, R.z0, { cast: false });
    for (const y of [lo, hi]) k.box('#89958c', b - a, 0.045, 0.08, (a + b) / 2, y, R.z0, { cast: false });
    k.box('#dddccf', b - a + 0.1, 0.04, 0.22, (a + b) / 2, lo - 0.03, R.z0 + 0.035, { surf: 'paint' });
  }
  for (const z of [-0.59, 0.59]) k.box('#6a8079', 0.12, 1.87, 0.055, R.x0, 0, z, { surf: 'metal' });
  k.box('#6a8079', 0.12, 0.055, 1.23, R.x0, 1.85, 0, { surf: 'metal' });
  // Both leaves are held inward against their stops; the west aperture stays clear.
  for (const z of [-0.55, 0.55]) {
    k.box('#91a29e', 0.51, 1.73, 0.035, -3.945, 0.06, z, { surf: 'glass' });
    for (const x of [-4.2, -3.69]) k.box('#6a8079', 0.025, 1.79, 0.05, x, 0.03, z, { surf: 'metal' });
    for (const y of [0.03, 1.79]) k.box('#6a8079', 0.53, 0.025, 0.05, -3.945, y, z, { surf: 'metal' });
    k.box('#64766e', 0.12, 0.025, 0.07, -3.74, 0.92, z, { surf: 'metal' });
  }
  k.box('#c6b99e', 0.25, 0.025, 1.1, -4.075, -0.025, 0, { surf: 'concrete' });
  k.box('#3f626e', 1.08, 0.01, 1.04, -3.61, 0.003, 0, { surf: 'carpet', cast: false });
  k.flush(root);
  furniture(root);
  roomDetails(root);
  archiveArea(root);
  const books = readingBooks(root);
  const sun = preview
    ? null
    : roomLights(
        scene,
        root,
        {
          sky: '#f4f2e9',
          ground: '#999182',
          k: 1.35,
          key: { color: '#f8f0d8', k: 1.5, at: [-3, 10, -1] },
          lamps: [
            { at: [-1.13, 0.96, -1.8], k: 0.65, reach: 1.35, pool: 0 },
            { at: [2.66, 0.96, -2.04], k: 0.65, reach: 1.35, pool: 0 },
            { at: [0.65, 1.02, 1.7], k: 0.65, reach: 1.35, pool: 0 },
          ],
        },
        R,
      );
  const outside = preview ? null : researchWindowView(root);
  const hemi = scene.children.find((o) => o.isHemisphereLight);
  return {
    scene,
    root,
    sun,
    books,
    nav: researchNav(),
    bounds: R,
    door: DOOR,
    seats: SEATS,
    spots: SPOTS,
    index: INDEX,
    period(p) {
      outside?.onPeriod(p);
      const evening = p === 'evening';
      if (sun) sun.intensity = evening ? 0.3 : 1.5;
      if (hemi) hemi.intensity = evening ? 0.75 : 1.35;
    },
  };
}
