// A seated Meshy body's shins (movement/sit-legs.js, #601): the sit clip folds the shins back under the seat. The solve
// turns each shin about its knee so the foot points at the spot in front of the seat, keeping the shin's length, the
// knee where the clip put it and the foot's orientation.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

registerHooks({
  resolve(s, c, n) {
    if (s === 'three') return n(new URL('../../vendor/three/three.module.js', import.meta.url).href, c);
    if (s.startsWith('three/addons/')) return n(new URL('../../vendor/' + s.slice(13), import.meta.url).href, c);
    return n(s, c);
  },
});
const THREE = await import('../../vendor/three/three.module.js');
const { solveSeatLegs } = await import('../../js/movement/sit-legs.js');

const DOWN = new THREE.Vector3(0, -1, 0);
const at = (bone) => bone.getWorldPosition(new THREE.Vector3());

// a seated body on a floor at y 0, facing +z: hips 0.33 up, thighs 0.16 and shins 0.15 long, the clip's thighs
// forward and its shins folded back under the hips (the feet sit in the seat)
function seated() {
  const floor = new THREE.Group();
  const root = new THREE.Group();
  floor.add(root);
  const model = new THREE.Group();
  root.add(model);
  const hips = new THREE.Bone();
  hips.name = 'Hips';
  hips.position.set(0, 0.33, 0);
  model.add(hips);
  const legs = {};
  for (const [side, x] of [['Left', 0.06], ['Right', -0.06]]) {
    const thigh = new THREE.Bone();
    thigh.name = side + 'UpLeg';
    thigh.position.set(x, 0, 0);
    hips.add(thigh);
    const shin = new THREE.Bone();
    shin.name = side + 'Leg';
    shin.position.set(0, -0.16, 0);
    thigh.add(shin);
    const foot = new THREE.Bone();
    foot.name = side + 'Foot';
    foot.position.set(0, -0.15, 0);
    shin.add(foot);
    thigh.quaternion.setFromUnitVectors(DOWN, new THREE.Vector3(0, -0.2, 1).normalize());
    shin.quaternion.setFromUnitVectors(DOWN, new THREE.Vector3(0, -0.6, -0.8).normalize());
    legs[side] = { thigh, shin, foot };
  }
  root.updateMatrixWorld(true);
  return { root, model, hips, legs };
}

test('each foot points at the seat target in front of the hips, from its knee', () => {
  const rig = seated();
  const hips = at(rig.hips);
  solveSeatLegs(rig, { ahead: 0.2, height: 0.075 });
  for (const { shin, foot } of Object.values(rig.legs)) {
    const knee = at(shin),
      ankle = at(foot);
    // the front and height of the direction (each foot keeps its side of the hips, so the sideways part is its own)
    const want = new THREE.Vector3(0, 0.075 - knee.y, hips.z + 0.2 - knee.z).normalize();
    const got = new THREE.Vector3(0, ankle.y - knee.y, ankle.z - knee.z).normalize();
    assert.ok(got.distanceTo(want) < 2e-3, `foot direction ${got.toArray()} wants ${want.toArray()}`);
    assert.ok(ankle.z > hips.z + 0.1, 'the foot is in front of the seat lip');
  }
});

test('the thighs and knees stay where the clip put them, and the shins keep their length', () => {
  const before = seated();
  const after = seated();
  solveSeatLegs(after, { ahead: 0.2, height: 0.075 });
  for (const side of ['Left', 'Right']) {
    assert.ok(at(after.legs[side].shin).distanceTo(at(before.legs[side].shin)) < 1e-4, 'knee moved');
    assert.ok(Math.abs(at(after.legs[side].foot).distanceTo(at(after.legs[side].shin)) - 0.15) < 2e-3, 'shin length');
  }
});

test('the feet keep the orientation the clip gave them', () => {
  const rig = seated();
  const before = Object.values(rig.legs).map(({ foot }) => foot.getWorldQuaternion(new THREE.Quaternion()));
  solveSeatLegs(rig, { ahead: 0.2, height: 0.075 });
  Object.values(rig.legs).forEach(({ foot }, i) => {
    const q = foot.getWorldQuaternion(new THREE.Quaternion());
    assert.ok(Math.abs(Math.abs(q.dot(before[i])) - 1) < 1e-4, 'foot turned');
  });
});

test('a target straight below the knee still leaves finite, shin-long legs', () => {
  const rig = seated();
  solveSeatLegs(rig, { ahead: 0, height: 0.02 });
  for (const { shin, foot } of Object.values(rig.legs)) {
    const a = at(foot);
    assert.ok([a.x, a.y, a.z].every(Number.isFinite), 'finite ankle');
    assert.ok(Math.abs(a.distanceTo(at(shin)) - 0.15) < 2e-3, 'shin length');
  }
});
