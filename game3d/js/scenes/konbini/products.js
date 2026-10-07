import * as THREE from 'three';
import { rbox, mat, sh } from '../../props.js';
import { Kit } from '../dorms/kit.js';
import { signBoard } from '../plaza-buildings.js';
const labels = new Map();
function packageLabel(...args) {
  const key = JSON.stringify(args);
  if (!labels.has(key)) labels.set(key, signBoard(...args));
  return labels.get(key).clone();
}
export const PRODUCT_X = { milk: -1.43, riceball: -0.87, tea: -0.31, coffee: 0.25 };
export const PRODUCT_LABEL = {
  milk: ['牛乳', 'MILK'],
  riceball: ['塩むすび', 'RICE BALL'],
  tea: ['紅茶', 'MILK TEA'],
  coffee: ['コーヒー', 'COFFEE'],
};
export function grocery(id, { opened = false } = {}) {
  const g = new THREE.Group();
  g.name = 'konbini-' + id;
  if (id === 'milk') {
    g.scale.y = 0.8; // The small 200 ml carton stays below the eyes when its spout reaches the mouth.
    g.add(rbox(0.14, 0.21, 0.13, '#e8efec', { y: 0.105, r: 0.008 }));
    g.add(rbox(0.142, 0.065, 0.132, '#5c83a1', { y: 0.145, r: 0.004 }));
    for (const side of [-1, 1])
      g.add(rbox(0.14, 0.012, 0.095, '#e0e8e7', { y: 0.237, z: side * 0.032, rx: (side * Math.PI) / 4, r: 0.002 }));
    const spout = rbox(0.14, 0.028, 0.014, '#aec2cf', { y: 0.277, r: 0.002 });
    spout.rotation.x = opened ? -0.8 : 0;
    g.add(spout);
    const label = packageLabel('牛乳', 'MILK 200 ml', 0.12, 0.062, '#4b6c86');
    label.position.set(0, 0.157, 0.068);
    g.add(label);
  } else if (id === 'riceball') {
    const s = new THREE.Shape();
    s.moveTo(-0.092, 0);
    s.lineTo(0.092, 0);
    s.quadraticCurveTo(0.08, 0.04, 0.026, 0.145);
    s.quadraticCurveTo(0, 0.183, -0.026, 0.145);
    s.quadraticCurveTo(-0.08, 0.04, -0.092, 0);
    const rice = sh(
      new THREE.Mesh(
        new THREE.ExtrudeGeometry(s, {
          depth: 0.085,
          bevelEnabled: true,
          bevelSize: 0.008,
          bevelThickness: 0.006,
          bevelSegments: 1,
          steps: 1,
        }),
        mat('#e9e9db'),
      ),
    );
    rice.position.z = -0.042;
    g.add(rice);
    g.add(rbox(0.063, 0.083, 0.097, '#30443d', { y: 0.04, r: 0.004 }));
    if (!opened) {
      const film = rbox(0.214, 0.205, 0.115, '#d5e7e5', { y: 0.09, r: 0.006, opacity: 0.27 });
      film.material = film.material.clone();
      film.material.transparent = true;
      film.material.opacity = 0.27;
      g.add(film);
      const tag = packageLabel('塩', 'SALT', 0.085, 0.045, '#557889');
      tag.position.set(0, 0.13, 0.067);
      g.add(tag);
    }
  } else {
    const color = id === 'tea' ? '#947487' : '#4a657b';
    const can = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.19, 12), mat(color)));
    can.position.y = 0.095;
    g.add(can);
    for (const y of [0.008, 0.185]) {
      const rim = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.012, 12), mat('#bbc5c8')));
      rim.position.y = y;
      g.add(rim);
    }
    const label = packageLabel(...PRODUCT_LABEL[id], 0.098, 0.065, color);
    label.position.set(0, 0.1, 0.06);
    g.add(label);
  }
  return g;
}
export function basket() {
  const g = new THREE.Group(),
    k = new Kit();
  g.name = 'konbini-basket';
  k.box('#50738b', 0.43, 0.025, 0.3, 0, 0, 0, { surf: 'plastic' });
  for (const x of [-0.205, 0.205]) {
    for (let z = -0.13; z < 0.15; z += 0.052) k.box('#50738b', 0.025, 0.15, 0.025, x, 0.025, z, { surf: 'plastic' });
    k.box('#48657d', 0.03, 0.024, 0.3, x, 0.17, 0, { surf: 'plastic' });
  }
  for (const z of [-0.137, 0.137]) {
    for (let x = -0.18; x < 0.2; x += 0.06) k.box('#50738b', 0.026, 0.15, 0.025, x, 0.025, z, { surf: 'plastic' });
    k.box('#48657d', 0.43, 0.024, 0.026, 0, 0.17, z, { surf: 'plastic' });
  }
  for (const z of [-0.12, 0.12]) {
    k.box('#374b5b', 0.31, 0.019, 0.021, 0, 0.3, z, { surf: 'plastic' });
    for (const x of [-0.15, 0.15]) k.box('#374b5b', 0.019, 0.12, 0.021, x, 0.19, z, { surf: 'plastic' });
  }
  k.flush(g);
  return g;
}
