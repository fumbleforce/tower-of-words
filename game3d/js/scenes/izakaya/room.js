import * as THREE from 'three';
import { Kit } from '../dorms/kit.js';
import { shell, plankFloor, roomLights } from '../rooms/shell.js';
import { R, DOOR, TABLE, SEATS, SPOTS, izakayaNav } from './plan.js';
import { signBoard } from '../plaza-buildings.js';
export function buildIzakaya() {
  const scene = new THREE.Scene(),
    root = new THREE.Group(),
    k = new Kit();
  scene.background = new THREE.Color('#293138');
  scene.add(root);
  shell(root, R, { holes: { s: [[-0.65, 0.65, 0, R.near]] }, color: '#d8cbbb', top: '#786d61' });
  plankFloor(k, R, { color: '#92745e', seam: '#78604f', w: 0.28 });
  // Shoe-on dining room: a tiled threshold and mat, with coats and umbrellas beside the entrance.
  k.box('#748082', 1.3, 0.012, 0.79, 0, 0, -0.39, { surf: 'stone' });
  k.box('#334c50', 1.02, 0.018, 0.47, 0, 0.012, -0.37, { surf: 'carpet' });
  k.box('#536768', 0.3, 0.58, 0.57, 1.62, 0, -0.39, { surf: 'laminate' });
  for (const x of [1.52, 1.65, 1.75]) k.cyl('#c8b69c', 0.012, 0.012, 0.8, x, 0.1, -0.32, { rz: 0.08 });
  // Low wall panelling, a glazed upper strip and a compact, lit kitchen service hatch.
  k.box('#435e5b', R.x1 - R.x0, 0.55, 0.035, 0, 0.03, R.z0 + 0.02, { surf: 'laminate' });
  k.box('#293b3c', 2.1, 0.63, 0.08, 0, 0.94, R.z0 + 0.055, { surf: 'metal' });
  k.box('#a6b4ad', 2.13, 0.05, 0.38, 0, 0.87, R.z0 + 0.2, { surf: 'metal' });
  k.box('#777c75', 2.2, 0.13, 0.42, 0, 1.65, R.z0 + 0.22, { surf: 'metal' });
  for (const x of [-0.79, -0.44, 0.62])
    for (let n = 0; n < 4; n++)
      k.cyl('#ebe6d8', 0.115, 0.105, 0.025, x, 0.93 + n * 0.026, R.z0 + 0.2, { surf: 'ceramic' });
  k.box('#415c58', R.x1 - R.x0, 0.67, 0.42, 0, 0, R.z0 + 0.21, { surf: 'laminate' });
  k.box('#c8b396', R.x1 - R.x0, 0.06, 0.44, 0, 0.67, R.z0 + 0.22, { surf: 'laminate' });
  for (const x of [-1.47, 1.47]) {
    k.box('#8c7560', 0.5, 0.78, 0.04, x, 1.07, R.z0 + 0.03, { surf: 'frame' });
    k.box('#70908e', 0.4, 0.67, 0.045, x, 1.125, R.z0 + 0.055, { surf: 'glass' });
  }
  for (const x of [R.x0 + 0.02, R.x1 - 0.02]) {
    k.box('#50645d', 0.03, 0.54, -R.z0, x, 0.04, R.z0 / 2, { surf: 'laminate' });
    for (const z of [-3.5, -1.1]) k.box('#9e8367', 0.1, 0.1, 0.16, x, 1.6, z, { surf: 'laminate' });
  }
  // Five proper dining chairs; their backrests stay behind the actor, not through their knees.
  for (const s of Object.values(SEATS)) {
    const { x, z, ry, top } = s;
    k.box('#416961', 0.44, 0.055, 0.44, x, top - 0.055, z, { ry, surf: 'fabric', r: 0.015 });
    k.box('#84644b', 0.44, 0.37, 0.055, x - Math.sin(ry) * 0.205, top, z - Math.cos(ry) * 0.205, {
      ry,
      surf: 'laminate',
      r: 0.012,
    });
    for (const dx of [-0.17, 0.17])
      for (const dz of [-0.17, 0.17]) k.box('#493c34', 0.035, top - 0.055, 0.035, x + dx, 0, z + dz, { surf: 'metal' });
  }
  k.box('#b58d67', TABLE.w, 0.07, TABLE.d, 0, TABLE.top - 0.07, TABLE.z, { surf: 'laminate', r: 0.025 });
  for (const x of [-0.67, 0.67])
    for (const z of [-2.36, -1.74]) k.box('#43474a', 0.055, TABLE.top - 0.07, 0.055, x, 0, z, { surf: 'metal' });
  // Wall-mounted practical lighting keeps the tabletop and every face lit without a hanging shade blocking the camera.
  for (const x of [-1.5, 1.5]) {
    k.box('#344c4c', 0.22, 0.34, 0.12, x, 1.69, R.z0 + 0.1, { surf: 'metal' });
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.25, 0.025),
      new THREE.MeshStandardMaterial({ color: '#ffe9bf', emissive: '#ffd794', emissiveIntensity: 0.8 }),
    );
    panel.position.set(x, 1.86, R.z0 + 0.18);
    root.add(panel);
  }
  k.flush(root);
  const sign = signBoard('居酒屋', 'IZAKAYA', 0.82, 0.25, '#3e6260');
  sign.position.set(0, 2.08, R.z0 + 0.085);
  root.add(sign);
  const sun = roomLights(
    scene,
    root,
    {
      sky: '#fff1dd',
      ground: '#746855',
      k: 1.5,
      key: { color: '#fff1de', k: 1.15, at: [-3, 9, 6] },
      lamps: [{ at: [0, 2.1, -2.1], k: 2.2, reach: 5, color: '#ffe3b5' }],
    },
    R,
  );
  return { scene, root, sun, nav: izakayaNav(), bounds: R, door: DOOR, seats: SEATS, spots: SPOTS };
}
