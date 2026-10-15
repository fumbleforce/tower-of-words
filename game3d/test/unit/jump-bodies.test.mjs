import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import * as THREE from '../../vendor/three/three.core.js';
registerHooks({
  resolve(s, c, next) {
    return next(s === 'three' ? new URL('../../vendor/three/three.core.js', import.meta.url).href : s, c);
  },
});
const { installJumpBodies } = await import('../../js/movement/jump-bodies.js');
const { poolOutfitSlot } = await import('../../js/places/day3/pool-outfit-slot.js');
const { swimmerPose } = await import('../../js/places/day3/swim-pose.js');
function make(root, name, calls) {
  const model = new THREE.Group();
  model.name = name;
  const hips = new THREE.Bone();
  hips.name = 'Hips';
  hips.position.y = 0.8;
  model.add(hips);
  root.add(model);
  return {
    root,
    model,
    update() {
      calls[name] = (calls[name] || 0) + 1;
    },
    setState() {},
  };
}
test('pool model swaps retain one body, physical root and exactly one native mixer update', () => {
  const root = new THREE.Group(),
    shadow = new THREE.Group(),
    calls = {};
  root.position.set(3, 0.2, 5);
  root.rotation.y = 0.7;
  root.scale.setScalar(1.18);
  root.add(shadow);
  const player = make(root, 'ordinary', calls),
    ordinary = player.model;
  const bodies = installJumpBodies(player, shadow),
    first = bodies.sync(),
    ordinaryUpdate = player.update;
  const slot = poolOutfitSlot(player, (r) => make(r, 'swimwear', calls));
  let swimHop, swimUpdate;
  for (let i = 0; i < 10; i++) {
    first.pose.begin(3);
    first.pose.update({ airborne: true, dt: 0.25 });
    slot.set(true);
    const wearing = bodies.sync();
    swimHop ||= wearing.hop;
    swimUpdate ||= player.update;
    assert.equal(wearing.hop, swimHop);
    assert.equal(player.update, swimUpdate);
    assert.equal(first.hop.parent, null);
    assert.equal(root.getObjectByName('ordinary'), undefined);
    assert.equal(shadow.parent, root);
    assert.equal(wearing.hop.parent, root);
    wearing.pose.begin(3);
    wearing.pose.update({ airborne: true, dt: 0.25 });
    const before = calls.swimwear;
    player.update(1 / 60);
    assert.equal(calls.swimwear, before + 1);
    assert(wearing.pose.pivot.rotation.x > 3);
    slot.set(false);
    const normal = bodies.sync();
    assert.equal(normal.hop, first.hop);
    assert.equal(player.model, ordinary);
    assert.equal(player.update, ordinaryUpdate);
    assert.equal(normal.pose.pivot.rotation.x, 0);
    assert.equal(swimHop.parent, null);
    assert.equal(root.getObjectByName('swimwear'), undefined);
    const beforeNormal = calls.ordinary;
    player.update(1 / 60);
    assert.equal(calls.ordinary, beforeNormal + 1);
    assert.deepEqual(root.position.toArray(), [3, 0.2, 5]);
    assert.equal(root.rotation.y, 0.7);
    assert.deepEqual(root.scale.toArray(), [1.18, 1.18, 1.18]);
  }
  slot.dispose();
  assert.equal(bodies.sync().changed, false);
});

test('restoring a cached outfit directly into water keeps the new swimming overlay', () => {
  const root = new THREE.Group(),
    shadow = new THREE.Group(),
    calls = {};
  root.add(shadow);
  const player = make(root, 'ordinary', calls),
    bodies = installJumpBodies(player, shadow);
  bodies.sync();
  const slot = poolOutfitSlot(player, (r) => make(r, 'swimwear', calls));
  for (let cycle = 0; cycle < 4; cycle++) {
    slot.set(true);
    const water = swimmerPose(player);
    water.enter('swim');
    bodies.sync();
    const before = calls.swimwear;
    root.rotation.x = 0;
    player.update(0.1);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(player.model.getWorldQuaternion(new THREE.Quaternion()));
    assert.ok(Math.abs(up.y - Math.cos(1.28)) < 1e-6, 'the restored local swim overlay applies every frame');
    assert.equal(calls.swimwear, before + 1, 'one native mixer update, without old overlay accumulation');
    water.dispose();
    slot.set(false);
    bodies.sync();
    player.update(0.1);
    assert.equal(Math.abs(root.rotation.x), 0);
  }
  slot.dispose();
});
