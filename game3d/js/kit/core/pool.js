// Light pools: a soft additive disc on the ground under a lamp, alone (lightPool) or many in one mesh (pools).
// Moved here from places/life.js and scenes/outdoor/parts.js, which re-export them, so the world kit needs nothing
// from places/ (notes/architecture/world-kit.md).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DECAL } from '../../look/decal.js';

let _poolTex;
function poolTex() {
  if (_poolTex) return _poolTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  gr.addColorStop(0.7, 'rgba(255,255,255,0.14)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  _poolTex = new THREE.CanvasTexture(c);
  _poolTex.colorSpace = THREE.SRGBColorSpace;
  return _poolTex;
}
// r: radius in metres; k: strength; sx/sz stretch it (a strip lamp throws an oval)
export function lightPool(x, z, r = 1.1, { color = '#ffcf94', k = 0.32, sx = 1, sz = 1, y = 0.006 } = {}) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(2 * r * sx, 2 * r * sz),
    new THREE.MeshBasicMaterial({
      map: poolTex(),
      color: new THREE.Color(color).multiplyScalar(k),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: true,
      ...DECAL,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  m.renderOrder = 1;
  m.userData.noAO = true;
  m.userData.stackable = true; // light adds up the same in any order: the draw-call pass may merge them (perf/batch.js)
  return m;
}

// light pools on the ground under a set of lamps, in one mesh (one draw call however many lamps). Returns the mesh;
// set(k) changes their strength (the evening turns them up); userData.gain scales it on top (eveningLight's day 2,
// whose brighter dusk would wash weaker pools out). y: their height, just over the paving they light.
// POOL_Y: over the paving's highest parts (stones 0.006-0.008, tactile tiles 0.012, their ribs and dots 0.026). A pool
// level with the stones fights them for depth, and flickers in stripes as the camera moves (issue #100).
export const POOL_Y = 0.03;
export function pools(points, r = 0.9, { k = 0.2, color = '#ffcf94', y = POOL_Y } = {}) {
  const base = lightPool(0, 0, r, { k, color });
  const quads = points.map(([x, z, s = 1]) => {
    const g = new THREE.PlaneGeometry(2 * r * s, 2 * r * s);
    g.rotateX(-Math.PI / 2);
    return g.translate(x, y, z);
  });
  base.geometry.dispose();
  base.geometry = mergeGeometries(quads);
  quads.forEach((g) => g.dispose());
  base.rotation.set(0, 0, 0);
  base.position.set(0, 0, 0);
  const c0 = new THREE.Color(color);
  Object.assign(base.userData, { k, gain: 1 });
  base.userData.set = (kk) => {
    base.userData.k = kk;
    base.material.color.copy(c0).multiplyScalar(kk * base.userData.gain);
  };
  return base;
}
