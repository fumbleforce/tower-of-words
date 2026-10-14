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
const { startMoveCheck } = await import('../../js/movement/checks.js');
const { poolOutfitSlot } = await import('../../js/places/day3/pool-outfit-slot.js');
const { swimmerPose } = await import('../../js/places/day3/swim-pose.js');

function make(root, name, calls) {
  const model = new THREE.Group(),
    hips = new THREE.Bone(),
    leg = new THREE.Bone(),
    shin = new THREE.Bone(),
    foot = new THREE.Bone();
  hips.name = 'Hips';
  hips.position.y = 0.8;
  leg.name = 'LeftUpLeg';
  shin.name = 'LeftLeg';
  shin.position.y = -0.4;
  foot.name = 'LeftFoot';
  foot.position.y = -0.4;
  root.add(model);
  model.add(hips);
  hips.add(leg);
  leg.add(shin);
  shin.add(foot);
  return {
    root,
    model,
    update() {
      calls[name]++;
      leg.rotation.x = 0.3;
    },
    setState() {},
  };
}

test('movement checks survive repeated ordinary/swim reactivation and a fresh water overlay', (t) => {
  const previousWindow = globalThis.window,
    previousRAF = globalThis.requestAnimationFrame;
  globalThis.window = {};
  globalThis.requestAnimationFrame = () => 0;
  t.after(() => {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousRAF === undefined) delete globalThis.requestAnimationFrame;
    else globalThis.requestAnimationFrame = previousRAF;
  });
  const root = new THREE.Group(),
    shadow = new THREE.Group(),
    space = new THREE.Group(),
    calls = { ordinary: 0, swim: 0 };
  root.add(shadow);
  space.add(root);
  const player = make(root, 'ordinary', calls),
    bodies = installJumpBodies(player, shadow),
    ordinary = bodies.sync();
  // Native boot installs jump first, then fast-test movement checks. The outfit
  // slot therefore saves a check wrapper that already calls the ordinary jump.
  const checks = startMoveCheck({ player, place: { name: 'pool', space } }),
    slot = poolOutfitSlot(player, (r) => make(r, 'swim', calls));
  const tick = (name, dt) => {
    const before = { ...calls },
      steps = checks.steps;
    player.update(dt);
    assert.equal(calls[name], before[name] + 1, 'one native animation update');
    const other = name === 'ordinary' ? 'swim' : 'ordinary';
    assert.equal(calls[other], before[other], 'the inactive body is not updated');
    assert.equal(checks.steps, steps + (name === 'ordinary' && dt > 0 ? 1 : 0));
  };
  tick('ordinary', 0.1);
  for (let cycle = 0; cycle < 2; cycle++) {
    slot.set(true);
    // First entry installs the overlay during swimming. Continue into water
    // installs it before the cached jump body is reactivated on the next entry.
    const water = cycle ? swimmerPose(player) : null;
    water?.enter('swim');
    const wearing = bodies.sync(),
      swim = water || swimmerPose(player);
    swim.enter('swim');
    for (let frame = 0; frame < 3; frame++) {
      root.rotation.x = 0;
      tick('swim', 0.1);
      assert.equal(root.rotation.x, 0.72, 'the current swimming overlay applies');
    }
    swim.dispose();
    slot.set(false);
    const normal = bodies.sync();
    assert.equal(normal.pose, ordinary.pose);
    assert.notEqual(normal.hop, wearing.hop);
    assert.equal(Math.abs(root.rotation.x), 0);
    tick('ordinary', 0);
    normal.pose.begin(1);
    normal.pose.update({ airborne: true, velocityRatio: 0.1, dt: 0.15 });
    tick('ordinary', 0.1);
    const leg = player.model.getObjectByName('LeftUpLeg');
    assert(leg.rotation.x < -0.3, 'jump posing remains active after changing back');
    normal.pose.reset();
    assert(Math.abs(leg.rotation.x - 0.3) < 1e-6, 'one pose layer restores the native animation');
    tick('ordinary', 0.1);
  }
  slot.dispose();
});
