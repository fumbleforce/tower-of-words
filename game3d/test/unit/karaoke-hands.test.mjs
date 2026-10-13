import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
const hook = registerHooks({
  resolve(s, c, n) {
    return n(s === 'three' ? new URL('../../vendor/three/three.module.js', import.meta.url).href : s, c);
  },
});
const THREE = await import('three');
const { karaokeHands } = await import('../../js/places/ongoing/karaoke-hands.js');
const { karaokeProps } = await import('../../js/places/ongoing/karaoke-props.js');
hook.deregister();

for (const side of ['Right', 'Left'])
  test(`${side} table reach shares bounded torso lean and restores the animated pose`, () => {
    const space = new THREE.Group(),
      root = new THREE.Group();
    space.position.set(2, 0.3, -1);
    space.rotation.y = 0.7;
    space.add(root);
    const sign = side === 'Right' ? -1 : 1,
      bones = [];
    let parent = root;
    for (const [name, position] of [
      ['Spine02', [0, 0.4, 0]],
      ['Spine01', [0, 0.08, 0]],
      ['Spine', [0, 0.08, 0]],
      [side + 'Arm', [sign * 0.15, 0.05, 0]],
      [side + 'ForeArm', [0, -0.15, 0]],
      [side + 'Hand', [0, -0.14, 0]],
    ]) {
      const b = new THREE.Bone();
      b.name = name;
      b.position.fromArray(position);
      parent.add(b);
      parent = b;
      bones.push(b);
    }
    const update = () => {},
      rig = { root, update },
      hands = karaokeHands(space),
      target = new THREE.Vector3(sign * 0.32, 0.26, 0),
      identity = new THREE.Quaternion();
    hands.setSide(rig, side);
    hands.reach(rig, [sign * 0.22, 0.4, 0.05]);
    for (const b of bones.slice(0, 3))
      assert(b.quaternion.angleTo(identity) < 1e-7, 'reachable arm motion leaves torso upright');
    hands.reach(rig, target.toArray());
    const position = () => space.worldToLocal(parent.getWorldPosition(new THREE.Vector3()));
    assert(position().distanceTo(target) < 0.005, 'the hand reaches the table with actual lower-torso joints');
    for (const b of bones.slice(0, 3))
      assert(b.quaternion.angleTo(identity) <= 0.250001, 'total torso allowance stays at .75 radians');
    const reached = bones.map((b) => b.quaternion.clone());
    for (let i = 0; i < 4; i++) rig.update();
    bones.forEach((b, i) => assert(b.quaternion.angleTo(reached[i]) < 1e-6, 'render updates must not accumulate lean'));
    const prop = new THREE.Group();
    space.add(prop);
    hands.hold(rig, prop);
    hands.reach(rig, target.toArray());
    assert(prop.position.distanceTo(position()) < 1e-7, 'held prop follows the actual wrist');
    const direction = new THREE.Vector3(0, 1, 0).applyQuaternion(parent.getWorldQuaternion(new THREE.Quaternion()));
    assert(
      direction.distanceTo(new THREE.Vector3(0, 1, 0)) < 1e-7,
      'rigid palm aligns with the upright microphone shaft',
    );
    const carried = prop.position.clone();
    hands.follow(rig);
    root.position.x += 0.2;
    rig.update();
    assert(
      prop.position.distanceTo(carried.add(new THREE.Vector3(0.2, 0, 0))) < 0.005,
      'carried contact translates with a walking actor',
    );
    hands.dispose();
    assert.equal(rig.update, update);
    for (const b of bones) assert(b.quaternion.angleTo(identity) < 1e-7, 'temporary reach restores every bone');
  });

test('top-corner receipt grip lies flat on the back-right table corner', () => {
  const prior = globalThis.document,
    context = new Proxy({}, { get: () => () => {}, set: () => true });
  globalThis.document = {
    createElement: () => ({ getContext: () => context }),
  };
  try {
    const space = new THREE.Group(),
      props = karaokeProps(space);
    for (const mesh of props.card.children) {
      const vertices = mesh.geometry.attributes.position;
      for (let i = 0; i < vertices.count; i++) {
        const vertex = new THREE.Vector3().fromBufferAttribute(vertices, i);
        const point = mesh.localToWorld(vertex);
        assert(point.x >= -1.22 && point.x <= 0.22, 'paper stays over table width');
        assert(point.z >= -2.32 && point.z <= -1.48, 'paper stays over table depth');
        assert(point.y > 0.55 && point.y < 0.554, 'paper lies within 4mm of the tabletop');
      }
    }
  } finally {
    globalThis.document = prior;
  }
});
