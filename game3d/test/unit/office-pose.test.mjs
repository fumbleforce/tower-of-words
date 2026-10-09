import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import * as THREE from '../../vendor/three/three.module.js';
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'three')
      return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, context);
    if (specifier.startsWith('three/addons/'))
      return next(new URL('../../vendor/' + specifier.slice(13), import.meta.url).href, context);
    return next(specifier, context);
  },
});
const { bridgeOfficePose } = await import('../../js/crowd/office-pose.js');
const { S } = await import('../../js/train/people.js');
process.on('exit', () => hooks.deregister());

function fixture() {
  const root = new THREE.Group(),
    model = new THREE.Group();
  const spine = new THREE.Bone(),
    head = new THREE.Bone();
  spine.name = 'Spine';
  head.name = 'Head';
  root.scale.setScalar(1.18);
  model.scale.setScalar(0.01);
  root.add(model);
  model.add(spine);
  spine.add(head);
  spine.position.set(1, 2, 3);
  head.rotation.set(0.1, -0.2, 0.05);
  const rig = {
    root,
    model,
    head: new THREE.Object3D(),
    torso: new THREE.Object3D(),
    update() {},
  };
  return { rig, spine, head };
}

test('office queue head and shoulder offsets reach real bones without accumulating', () => {
  const { rig, spine, head } = fixture();
  const rest = head.quaternion.clone();
  bridgeOfficePose(rig);
  rig.head.rotation.set(0.3, 0.4, 0);
  rig.torso.position.y = -0.012;
  const expected = rest.clone().multiply(rig.head.quaternion);
  for (let i = 0; i < 120; i++) rig.update(1 / 60);
  assert.ok(head.quaternion.angleTo(expected) < 1e-7);
  assert.ok(Math.abs(spine.position.y - (2 - (0.012 * S) / 0.01)) < 1e-9);
  assert.equal(spine.position.x, 1);
  assert.equal(spine.position.z, 3);
  rig.head.rotation.set(0, 0, 0);
  rig.torso.position.y = 0;
  rig.update(1 / 60);
  assert.ok(head.quaternion.angleTo(rest) < 1e-7);
  assert.equal(spine.position.y, 2);
});

test('office offsets follow the latest native animation pose and restore on release', () => {
  const { rig, head, spine } = fixture();
  let frame = 0;
  rig.update = () => {
    frame++;
    head.rotation.set(0, frame / 100, 0);
    spine.position.y = 2 + frame / 100;
  };
  bridgeOfficePose(rig);
  rig.head.rotation.set(0.2, 0, 0);
  rig.torso.position.y = -0.01;
  for (let i = 0; i < 10; i++) rig.update(1 / 60);
  const native = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.1, 0));
  assert.ok(head.quaternion.angleTo(native.multiply(rig.head.quaternion)) < 1e-7);
  assert.ok(Math.abs(spine.position.y - (2.1 - S)) < 1e-9);
  rig.head.rotation.set(0, 0, 0);
  rig.torso.position.y = 0;
  rig.update(1 / 60);
  assert.ok(head.quaternion.angleTo(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.11, 0))) < 1e-7);
  assert.equal(spine.position.y, 2.11);
});
