// The platform-side door sets the train place hangs on the car, built from the car's DOORWAYS (car.js), so the
// frames stand outside each opening and the leaves fill it exactly: dark frame posts a little proud of the wall, a
// lamp over the opening (amber shut, green open), a yellow edge stripe on each leaf and a yellow threshold on the
// floor (Jørgen: "the train has no door"). Leaves and frames are full height in every framing and never fade with
// the cut wall (Jørgen: "the doors are still half size when trying to leave the train wagon").
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { DOORWAYS, LZ, T, HF } from './car.js';

const mats = new Map();
const mat = (color, opts = {}) => {
  const key = color + JSON.stringify(opts);
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...opts }));
  return mats.get(key);
};
const emissive = (color, glow, k) => mat(color, { emissive: new THREE.Color(glow), emissiveIntensity: k });
// rounded box sitting on y (its bottom), centred on x/z
function rbox(w, h, d, color, { x = 0, y = 0, z = 0, r = 0.03, m, cast = true } = {}) {
  const geo = new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
  const mesh = new THREE.Mesh(geo, m || mat(color));
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  return mesh;
}

export const lampShut = emissive('#ffcf8a', '#ffb24a', 1.8),
  lampOpen = emissive('#b8f5c8', '#46d18a', 2.2);

// leaves: [{ g, x0, s, far, zShut, zSlide }] for the place to slide; lamps: the lamp meshes to recolour
export function buildDoorSets() {
  const group = new THREE.Group(),
    leaves = [],
    lamps = [];
  const zo = LZ + T + 0.004; // just on the outer face of the wall, thin, so the leaves slide over it
  for (const { x: dx, x0, x1, y0, y1 } of DOORWAYS) {
    const w = x1 - x0,
      hH = y1 - y0 - 0.003;
    for (const s of [-1, 1])
      group.add(rbox(0.07, HF, 0.012, '#2a2f38', { x: dx + s * (w / 2 + 0.035), z: zo, r: 0.004 }));
    const lamp = rbox(0.26, 0.05, 0.03, null, { x: dx, y: y1 + 0.05, z: zo, r: 0.01, m: lampShut, cast: false });
    group.add(lamp);
    lamps.push(lamp);
    group.add(rbox(w - 0.04, 0.004, 0.1, '#d8b447', { x: dx, y: 0.003, z: LZ - 0.07, r: 0.002, cast: false }));
    // the leaves hang just outside the wall (outside-sliding doors) and both slide toward the middle of the car
    // over the wall, the far one further, so nothing ever has to pass through the wall or the rounded corner
    for (const s of [-1, 1]) {
      const leaf = new THREE.Group();
      leaf.userData.doorLeaf = true;
      leaf.add(rbox(w / 2 - 0.004, hH, 0.03, '#56698a', { r: 0.01 }));
      leaf.add(rbox(0.03, hH - 0.02, 0.038, '#e0b83a', { x: -s * (w / 4 - 0.02), y: 0.01, r: 0.008, cast: false }));
      const glass = emissive('#b9d3e6', '#9fc2dc', 0.35);
      leaf.add(
        rbox(w / 2 - 0.1, Math.min(0.2, hH * 0.4), 0.036, null, { y: Math.max(0.08, hH - 0.24), r: 0.015, m: glass }),
      );
      const far = s * Math.sign(dx) > 0;
      // plug doors: shut, the leaf sits in the opening flush with the body (Jørgen: they seemed to hover in
      // front of it); opening, it steps out a hair, then slides along the outside of the wall
      const zShut = LZ + T - 0.02,
        zSlide = LZ + T + (far ? 0.052 : 0.024);
      leaf.position.set(dx + (s * w) / 4, y0 + 0.002, zShut);
      group.add(leaf);
      leaves.push({ g: leaf, x0: leaf.position.x, s, far, zShut, zSlide });
    }
  }
  return { group, leaves, lamps };
}
