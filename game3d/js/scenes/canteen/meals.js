import * as THREE from 'three';
import { mat, rbox } from '../../props.js';

const box = (g, color, size, at) => {
  const o = rbox(...size, color, { r: 0.008, seg: 1 });
  o.position.set(...at);
  g.add(o);
  return o;
};
const cylinder = (g, color, radii, height, at) => {
  const o = new THREE.Mesh(new THREE.CylinderGeometry(...radii, height, 16), mat(color));
  o.position.set(...at);
  g.add(o);
  return o;
};
export function mealTray(kind = 'curry') {
  const root = new THREE.Group(),
    food = new THREE.Group();
  root.name = 'canteen-meal-tray';
  root.userData.noBatch = true;
  box(root, '#536e72', [0.55, 0.018, 0.39], [0, 0, 0]);
  for (const x of [-0.269, 0.269]) box(root, '#71898b', [0.016, 0.027, 0.39], [x, 0.014, 0]);
  for (const z of [-0.187, 0.187]) box(root, '#71898b', [0.53, 0.027, 0.016], [0, 0.014, z]);
  root.add(food);
  const plate = cylinder(root, '#efeadc', [0.17, 0.145], 0.024, [-0.045, 0.024, 0]);
  plate.scale.z = 0.8;
  const rice = cylinder(food, '#ede6cf', [0.075, 0.085], 0.045, [-0.095, 0.055, 0]);
  rice.scale.z = 1.25;
  if (kind === 'curry') {
    const sauce = cylinder(food, '#986432', [0.095, 0.095], 0.018, [0.025, 0.041, 0]);
    sauce.scale.z = 1.14;
    for (const [x, z, color] of [
      [0.01, -0.06, '#c99f56'],
      [0.06, 0.04, '#b77435'],
      [-0.01, 0.045, '#8f6039'],
    ])
      box(food, color, [0.032, 0.022, 0.027], [x, 0.062, z]);
  } else {
    for (let i = 0; i < 7; i++) {
      const o = box(
        food,
        ['#66884b', '#d19d47', '#779c56'][i % 3],
        [0.026, 0.025, 0.065],
        [0.015 + (i % 3) * 0.025, 0.049 + Math.floor(i / 3) * 0.014, -0.055 + (i % 4) * 0.032],
      );
      o.rotation.y = i * 0.7;
    }
  }
  cylinder(root, '#794b43', [0.047, 0.035], 0.06, [0.19, 0.049, 0.08]);
  cylinder(food, '#b1a168', [0.041, 0.041], 0.006, [0.19, 0.08, 0.08]);
  const spoon = new THREE.Group();
  box(spoon, '#b6c2c0', [0.015, 0.008, 0.16], [0, 0, -0.04]);
  const bowl = cylinder(spoon, '#b6c2c0', [0.025, 0.02], 0.009, [0, 0.003, 0.057]);
  bowl.scale.z = 1.35;
  spoon.userData.bite = box(spoon, kind === 'curry' ? '#c7a05d' : '#78944b', [0.027, 0.019, 0.024], [0, 0.014, 0.057]);
  spoon.userData.bite.visible = false;
  spoon.position.set(0.19, 0.028, -0.065);
  root.add(spoon);
  return { root, food, spoon, grips: [new THREE.Vector3(-0.21, 0.018, 0), new THREE.Vector3(0.21, 0.018, 0)] };
}
export function waterCup() {
  const root = new THREE.Group();
  cylinder(root, '#e3e4d9', [0.046, 0.035], 0.105, [0, 0.053, 0]);
  cylinder(root, '#87b3bb', [0.04, 0.04], 0.004, [0, 0.099, 0]);
  root.userData.noBatch = true;
  return root;
}
export function lunchContainer() {
  const root = new THREE.Group();
  box(root, '#b2bdad', [0.23, 0.07, 0.18], [0, 0.035, 0]);
  const rice = box(root, '#e8e3d1', [0.205, 0.017, 0.15], [0, 0.075, 0]);
  const lid = box(root, '#637e76', [0.24, 0.016, 0.19], [0, 0.094, 0]);
  root.userData.noBatch = true;
  return { root, rice, lid };
}

export function cashCoins(amount) {
  const root = new THREE.Group();
  let index = 0;
  for (const value of [500, 100, 50, 10])
    while (amount >= value) {
      amount -= value;
      const coin = new THREE.Mesh(
        value === 50
          ? new THREE.TorusGeometry(0.014, 0.004, 6, 12)
          : new THREE.CylinderGeometry(0.019, 0.019, 0.004, 14),
        mat(value === 10 ? '#b5815b' : '#bec5bf'),
      );
      if (value === 50) coin.rotation.x = -Math.PI / 2;
      coin.position.set(((index % 3) - 1) * 0.03, 0.006 + Math.floor(index / 3) * 0.006, ((index % 2) - 0.5) * 0.02);
      root.add(coin);
      index++;
    }
  root.userData.noBatch = true;
  return root;
}
