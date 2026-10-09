// Focused diagnostic regression: run with node, no browser or GPU needed.
import assert from 'node:assert/strict';
import * as THREE from '../../vendor/three/three.module.js';
import { legClearance } from '../../tools/crowd-bag-clearance.mjs';
const root = new THREE.Group(),
  bag = new THREE.Group(),
  leg = new THREE.Group();
bag.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)));
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute([-2, -2, 0, 2, -2, 0, 0, 2, 0], 3));
leg.add(new THREE.Mesh(geometry));
root.add(bag, leg);
root.updateMatrixWorld(true);
assert.equal(
  legClearance(THREE, { legs: [leg] }, bag)().intersections,
  1,
  'A triangle crosses the body although all vertices are outside',
);
leg.position.x = 4;
root.updateMatrixWorld(true);
assert.equal(legClearance(THREE, { legs: [leg] }, bag)().intersections, 0, 'Separated leg surface is clear');
leg.position.set(0, 0, 0.5);
root.updateMatrixWorld(true);
assert.equal(legClearance(THREE, { legs: [leg] }, bag)().intersections, 0, 'Tangency is not penetration');
leg.position.set(0, 0, 0);
root.rotation.y = 0.7;
root.scale.setScalar(0.85);
root.position.set(10, 2, -4);
root.updateMatrixWorld(true);
assert.equal(
  legClearance(THREE, { legs: [leg] }, bag)().intersections,
  1,
  'Shared scale, translation and turn preserve intersection',
);
const skin = geometry.clone();
skin.translate(3, 0, 0);
skin.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Array(12).fill(0), 4));
skin.setAttribute('skinWeight', new THREE.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4));
const mesh = new THREE.SkinnedMesh(skin),
  bone = new THREE.Bone(),
  model = new THREE.Group();
bone.name = 'LeftUpLeg';
mesh.add(bone);
mesh.bind(new THREE.Skeleton([bone]));
model.add(mesh);
root.add(model);
root.updateMatrixWorld(true);
assert.equal(legClearance(THREE, { model }, bag)().intersections, 0, 'Bind pose is clear');
bone.position.x = -3;
root.updateMatrixWorld(true);
assert.equal(
  legClearance(THREE, { model }, bag)().intersections,
  1,
  'Posed skinned vertices intersect despite clear bind pose',
);
console.log('PASS crossing, separation, tangency, world transform and native skin deformation');
