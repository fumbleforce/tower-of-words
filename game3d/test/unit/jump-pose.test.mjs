import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import * as THREE from '../../vendor/three/three.core.js';
registerHooks({
  resolve(s, c, next) {
    return next(s === 'three' ? new URL('../../vendor/three/three.core.js', import.meta.url).href : s, c);
  },
});
const { installJumpPose } = await import('../../js/movement/jump-pose.js');
function fixture() {
  const hop = new THREE.Group(),
    model = new THREE.Group(),
    hips = new THREE.Bone();
  hips.name = 'Hips';
  hips.position.y = 0.8;
  model.add(hips);
  hop.add(model);
  const leg = new THREE.Bone();
  leg.name = 'LeftUpLeg';
  hips.add(leg);
  const shin = new THREE.Bone();
  shin.name = 'LeftLeg';
  shin.position.y = -0.4;
  leg.add(shin);
  const foot = new THREE.Bone();
  foot.name = 'LeftFoot';
  foot.position.y = -0.4;
  shin.add(foot);
  const player = {
    model,
    update() {
      leg.rotation.x = 0.3;
    },
  };
  const pose = installJumpPose(hop, player);
  return { hop, model, player, pose, leg };
}
test('jump pose overrides walking legs then restores mixer, without touching physical height or squash', () => {
  const f = fixture();
  f.hop.position.y = 1.5;
  f.hop.scale.set(0.9, 1.1, 0.9);
  f.pose.begin(1);
  f.pose.update({ airborne: true, velocityRatio: 0.1, dt: 0.15 });
  f.player.update(0.016);
  assert(f.leg.rotation.x < -0.3);
  assert.equal(f.hop.position.y, 1.5);
  assert.equal(f.hop.scale.y, 1.1);
  f.pose.reset();
  f.player.update(0.016);
  assert(Math.abs(f.leg.rotation.x - 0.3) < 1e-6);
  assert.equal(f.pose.pivot.rotation.x, 0);
});
test('only third jump flips forward once; ground and interruptions recover upright', () => {
  const f = fixture();
  for (const count of [1, 2, 3]) {
    f.pose.begin(count);
    f.pose.update({ airborne: true, velocityRatio: 0, dt: 0.255 });
    assert.equal(f.pose.pivot.rotation.x > 3, count === 3);
    f.pose.update({ airborne: true, velocityRatio: -0.8, dt: 0.25 });
    assert(Math.abs(f.pose.pivot.rotation.x - (count === 3 ? Math.PI * 2 : 0)) < 1e-6);
    f.pose.update({ airborne: false, dt: 0.02 });
    f.player.update(0.016);
    assert.equal(f.pose.pivot.rotation.x, 0);
    f.pose.update({ airborne: false, dt: 0.2 });
    assert.equal(f.pose.active, false);
  }
  f.pose.begin(3);
  f.pose.update({ airborne: true, dt: 0.2 });
  f.pose.reset();
  assert.equal(f.pose.pivot.rotation.x, 0);
  assert.equal(f.pose.active, false);
});
test('layer does not accumulate over unchanged mixer frames', () => {
  const f = fixture();
  f.pose.begin(1);
  f.pose.update({ airborne: true, velocityRatio: 0, dt: 0.1 });
  f.player.update(0);
  const q = f.leg.quaternion.clone();
  for (let n = 0; n < 20; n++) f.player.update(0);
  assert(q.angleTo(f.leg.quaternion) < 1e-6);
});
