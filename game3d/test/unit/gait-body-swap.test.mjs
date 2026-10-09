import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import * as THREE from '../../vendor/three/three.core.js';
registerHooks({
  resolve(s, c, next) {
    return next(s === 'three' ? new URL('../../vendor/three/three.core.js', import.meta.url).href : s, c);
  },
});
const { startGaitCheck } = await import('../../js/movement/gait-watch.js');
const { poolOutfitSlot } = await import('../../js/places/day3/pool-outfit-slot.js');
function fixture() {
  globalThis.window = {};
  globalThis.requestAnimationFrame = () => 1;
  const scene = new THREE.Scene(),
    space = new THREE.Group(),
    root = new THREE.Group();
  scene.add(space);
  space.add(root);
  function make(root) {
    const model = new THREE.Group();
    root.add(model);
    for (const name of ['LeftFoot', 'RightFoot']) {
      const bone = new THREE.Bone();
      bone.name = name;
      model.add(bone);
    }
    return { root, model, state: 'walk', update() {}, setState() {} };
  }
  const actor = make(root),
    ordinary = actor.model;
  const slot = poolOutfitSlot(actor, make);
  const camera = new THREE.OrthographicCamera(-100, 100, 100, -100, 0.1, 1000);
  camera.position.set(0, 30, 100);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const game = {
    player: actor,
    t: 0,
    place: { space, camera, name: 'pool', people: {} },
  };
  const watch = startGaitCheck(game);
  let frame = 0;
  function sample({ frozen = false, speed = 1.11, offset = 0, clock = 'step' } = {}) {
    const t = frame++ / 60;
    game.t = t;
    root.position.set(12 + Math.sin(t) * speed, 0, 10 + Math.cos(t) * speed);
    root.rotation.y = t;
    const p = (frozen ? 0.1 : t) % 0.8,
      leftLow = p < 0.4,
      x = leftLow ? 0.2 - p : p - 0.6;
    if (actor.model) {
      actor.model.children[0].position.set(x * 1.11 + offset, leftLow ? 0 : 0.08, 0.1);
      actor.model.children[1].position.set(-x * 1.11 + offset, leftLow ? 0.08 : 0, -0.1);
    }
    scene.updateMatrixWorld(true);
    watch.sample(clock);
  }
  function steps(n, opts) {
    for (let i = 0; i < n; i++) sample(opts);
  }
  return { actor, ordinary, slot, watch, game, sample, steps, make };
}
test('pool outfit swaps follow the visible skeleton through turns and restore the ordinary feet', () => {
  const f = fixture();
  f.steps(120);
  const ordinaryFeet = f.actor._gaitFeet;
  f.slot.set(true);
  f.steps(240);
  assert.equal(f.ordinary.parent, null);
  assert.notEqual(f.actor._gaitFeet, ordinaryFeet);
  assert.ok(f.actor._gaitFeet.every((foot) => foot.parent === f.actor.model));
  f.slot.set(false);
  f.steps(120);
  assert.ok(f.actor._gaitFeet.every((foot) => ordinaryFeet.includes(foot)));
  assert.ok(f.watch.windows > 8);
  assert.deepEqual(f.watch.episodes, []);
});
test('new skeleton coordinates reset the window and do not extend an earlier bad episode', () => {
  const f = fixture();
  f.steps(180, { frozen: true });
  assert.ok(f.watch.episodes.some((e) => e.kind === 'slide'));
  const previous = f.watch.episodes.map((e) => ({ ...e }));
  f.slot.set(true);
  f.steps(180, { offset: 25 });
  assert.deepEqual(f.watch.episodes, previous);
});
test('a missing model clears its feet and a later model is sampled afresh', () => {
  const f = fixture();
  f.steps(120);
  const old = f.actor.model;
  old.removeFromParent();
  delete f.actor.model;
  f.steps(60);
  assert.equal(f.actor._gaitFeet, null);
  const replacement = f.make(f.actor.root);
  f.actor.model = replacement.model;
  f.steps(180, { offset: 30 });
  assert.ok(f.actor._gaitFeet.every((foot) => foot.parent === replacement.model));
  assert.deepEqual(f.watch.episodes, []);
});
for (const clock of ['step', 'drawn'])
  test(`real frozen feet and in-place stepping remain failures after swaps on ${clock}`, () => {
    for (const frozen of [true, false]) {
      const f = fixture();
      f.actor.scripted = clock === 'drawn';
      f.steps(120, { clock });
      f.slot.set(true);
      f.steps(240, { frozen, speed: frozen ? 1.11 : 0, clock });
      const kind = frozen ? 'slide' : 'on the spot';
      assert.ok(f.watch.episodes.some((e) => e.kind === kind && e.windows >= 4));
      f.slot.set(false);
      f.steps(240, { frozen, speed: frozen ? 1.11 : 0, clock });
      assert.equal(f.watch.episodes.filter((e) => e.kind === kind && e.windows >= 4).length, 2);
    }
  });
