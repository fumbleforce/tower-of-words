import * as THREE from 'three';
import { rbox, mat } from '../../props.js';
export function bread(kind) {
  const g = new THREE.Group(),
    curry = kind === 'curry_bread';
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), mat(curry ? '#bf844b' : '#dba565'));
  body.scale.set(curry ? 0.115 : 0.13, 0.065, curry ? 0.085 : 0.07);
  body.position.y = 0.065;
  g.add(body);
  for (let i = 0; i < (curry ? 9 : 3); i++) {
    const crust = rbox(curry ? 0.018 : 0.025, 0.009, curry ? 0.014 : 0.115, '#efd099', { r: 0.003 });
    crust.position.set(curry ? Math.sin(i * 2.4) * 0.08 : (i - 1) * 0.07, 0.122, curry ? Math.cos(i * 2.4) * 0.055 : 0);
    g.add(crust);
  }
  return g;
}
export function tray() {
  const g = new THREE.Group();
  g.add(rbox(0.38, 0.025, 0.28, '#a9bbb8', { r: 0.01 }));
  for (const x of [-0.18, 0.18]) g.add(rbox(0.018, 0.042, 0.28, '#657d7b', { x, y: 0.01 }));
  for (const z of [-0.13, 0.13]) g.add(rbox(0.36, 0.042, 0.018, '#657d7b', { y: 0.01, z }));
  return g;
}
export function tongs() {
  const g = new THREE.Group();
  for (const side of [-1, 1]) {
    const arm = rbox(0.012, 0.02, 0.21, '#aeb9b7');
    arm.position.set(side * 0.025, 0, -0.1);
    arm.rotation.y = side * 0.15;
    g.add(arm);
  }
  return g;
}
export function bag() {
  const g = new THREE.Group();
  g.add(rbox(0.25, 0.26, 0.12, '#ead9b4', { y: -0.15, r: 0.009, surf: 'card' }));
  for (const x of [-0.09, 0.09]) g.add(rbox(0.018, 0.08, 0.024, '#c6ab82', { x, y: 0.015 }));
  g.add(rbox(0.19, 0.02, 0.024, '#c6ab82', { y: 0.05 }));
  g.add(rbox(0.14, 0.08, 0.004, '#637f7b', { y: -0.14, z: 0.062 }));
  return g;
}
