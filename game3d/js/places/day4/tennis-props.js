import * as THREE from 'three';
import { mergeGeometries } from '../../../vendor/utils/BufferGeometryUtils.js';
import { rbox, mat, textTexture } from '../../props.js';
export const movable = (o) => {
  o.traverse((m) => {
    m.userData.noBatch = true;
  });
  return o;
};
// Each carried object is rigid: bake its coloured pieces once into one draw call.
function rigidProp(group) {
  group.updateMatrixWorld(true);
  const parts = [];
  group.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    g.deleteAttribute('uv');
    const colors = new Float32Array(g.attributes.position.count * 3),
      c = o.material.color;
    for (let i = 0; i < colors.length; i += 3) colors.set([c.r, c.g, c.b], i);
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    parts.push(g);
  });
  const material = mat('#ffffff').clone();
  material.vertexColors = true;
  return movable(new THREE.Mesh(mergeGeometries(parts), material));
}
export function racket(color = '#3686a9') {
  const g = new THREE.Group();
  g.add(rbox(0.035, 0.24, 0.035, '#303943', { y: 0.1 }));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.014, 5, 18), mat(color));
  rim.scale.y = 1.25;
  rim.position.y = 0.36;
  g.add(rim);
  for (let i = -2; i <= 2; i++) {
    g.add(rbox(0.2, 0.004, 0.004, '#e0e5e3', { y: 0.36 + i * 0.04 }));
    g.add(rbox(0.004, 0.23, 0.004, '#e0e5e3', { x: i * 0.04, y: 0.36 }));
  }
  return rigidProp(g);
}
export function ball() {
  return movable(new THREE.Mesh(new THREE.IcosahedronGeometry(0.055, 1), mat('#d9e04a')));
}
export function bottle() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.19, 10), mat('#63a7bd')));
  g.add(rbox(0.05, 0.025, 0.05, '#e7f1ee', { y: 0.105 }));
  return rigidProp(g);
}
export function basket() {
  const g = new THREE.Group();
  g.add(rbox(0.38, 0.2, 0.3, '#53656c'));
  for (let i = 0; i < 6; i++) {
    const b = ball();
    b.position.set(((i % 3) - 1) * 0.1, 0.13, (Math.floor(i / 3) - 0.5) * 0.11);
    g.add(b);
  }
  g.add(
    rbox(0.025, 0.18, 0.025, '#a1adb0', { x: -0.19, y: 0.15 }),
    rbox(0.025, 0.18, 0.025, '#a1adb0', { x: 0.19, y: 0.15 }),
    rbox(0.4, 0.025, 0.025, '#a1adb0', { y: 0.25 }),
  );
  return rigidProp(g);
}
export function scorePanel() {
  const texture = textTexture(() => {}, 128, 128);
  const panel = movable(
    new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.2), new THREE.MeshBasicMaterial({ map: texture })),
  );
  return {
    panel,
    set(n) {
      const canvas = texture.image,
        ctx = canvas.getContext('2d');
      ctx.fillStyle = '#f2f2ee';
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#23303b';
      ctx.textAlign = 'center';
      ctx.font = 'bold 100px sans-serif';
      ctx.fillText(String(n), 64, 103);
      texture.needsUpdate = true;
    },
  };
}

export function shoeLace() {
  const g = new THREE.Group();
  for (const side of [-1, 1]) {
    const tail = rbox(0.004, 0.004, 0.12, '#e9e5d7', { x: side * 0.018 });
    tail.rotation.y = side * 0.35;
    g.add(tail);
  }
  return rigidProp(g);
}
