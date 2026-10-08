import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import * as THREE from '../../vendor/three/three.core.js';

registerHooks({
  resolve(specifier, context, next) {
    return next(
      specifier === 'three' ? new URL('../../vendor/three/three.core.js', import.meta.url).href : specifier,
      context,
    );
  },
});
const { startGaitCheck } = await import('../../js/movement/gait-watch.js');
const { bodies } = await import('../../js/movement/shared.js');

function fixture() {
  globalThis.window = {};
  globalThis.requestAnimationFrame = () => 1;
  const space = new THREE.Group(),
    root = new THREE.Group();
  space.add(root);
  const feet = [new THREE.Object3D(), new THREE.Object3D()];
  root.add(...feet);
  feet[1].position.y = 0.08;
  const camera = new THREE.OrthographicCamera(-100, 100, 100, -100, 0.1, 1000);
  camera.position.set(0, 30, 100);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const cat = { root, feet, selfGait: true, state: 'walk', air: false };
  const game = { place: { name: 'train', space, camera, people: { tama: cat } }, player: null, t: 0 };
  const report = startGaitCheck(game);
  return {
    cat,
    game,
    report,
    sample(t, x, foot = 0, clock = 'drawn') {
      game.t = t;
      root.position.x = x;
      feet[0].position.x = foot;
      feet[1].position.x = foot;
      space.updateMatrixWorld(true);
      report.sample(clock);
    },
  };
}

test('grounded sliding cat and standing posture motion remain visible to the sampler', () => {
  for (const moving of [true, false]) {
    const f = fixture();
    f.cat.state = moving ? 'walk' : 'wash';
    for (let i = 0; i <= 180; i++) f.sample(i / 60, moving ? i / 60 : 0, moving ? 0 : i / 60);
    assert(f.report.episodes.some((e) => e.kind === (moving ? 'slide' : 'on the spot') && e.windows >= 4));
  }
});

test('explicit flight is excluded only from foot-contact sampling, not the body list or retained findings', () => {
  const f = fixture();
  for (let i = 0; i <= 120; i++) f.sample(i / 60, i / 60);
  const before = structuredClone({
    samples: f.report.samples,
    windows: f.report.windows,
    people: f.report.people,
    episodes: f.report.episodes,
  });
  assert(before.episodes.length);
  f.cat.air = true;
  for (let i = 121; i <= 240; i++) f.sample(i / 60, (i / 60) * 3, i / 60);
  assert.deepEqual(
    { samples: f.report.samples, windows: f.report.windows, people: f.report.people, episodes: f.report.episodes },
    before,
  );
  assert(bodies(f.game).some((b) => b.rig === f.cat));
  assert.equal(f.cat.air, true);
  assert.equal(f.cat.state, 'walk');
});

test('landing starts a fresh interval and bad-window sequence without bridging flight distance', () => {
  const f = fixture();
  for (let i = 0; i <= 40; i++) f.sample(i / 60, i / 60);
  assert.equal(f.report.people.tama.bad, 1);
  f.cat.air = true;
  for (let i = 41; i <= 120; i++) f.sample(i / 60, 10 + i / 60);
  f.cat.air = false;
  f.sample(2.1, 30);
  for (let i = 1; i <= 32; i++) f.sample(2.1 + i / 60, 30 + i / 60);
  assert.equal(f.report.people.tama.windows, 1, 'partial landing interval cannot finish the pre-flight window');
  assert.deepEqual(f.report.episodes, []);
  for (let i = 33; i <= 42; i++) f.sample(2.1 + i / 60, 30 + i / 60);
  assert.equal(f.report.people.tama.windows, 2);
  assert.deepEqual(f.report.episodes, [], 'one new bad window cannot inherit the pre-flight count');
  for (let i = 43; i <= 90; i++) f.sample(2.1 + i / 60, 30 + i / 60);
  assert(f.report.episodes.some((e) => e.kind === 'slide' && e.windows === 2));
});

test('air seen between drawn samples resets contact even on the other clock', () => {
  const f = fixture();
  for (let i = 0; i <= 30; i++) f.sample(i / 60, 0);
  f.cat.air = true;
  f.sample(0.55, 10, 0, 'step');
  f.cat.air = false;
  f.sample(0.6, 20);
  for (let i = 1; i <= 90; i++) f.sample(0.6 + i / 60, 20);
  assert(f.report.windows >= 2);
  assert.equal(f.report.people.tama.bad, 0, 'neither takeoff nor landing displacement enters contact windows');
  assert.deepEqual(f.report.episodes, []);
});

test('initial airborne samples create no contact window, then grounded sliding is measured normally', () => {
  const f = fixture();
  f.cat.air = true;
  for (let i = 0; i <= 120; i++) f.sample(i / 60, 20 + i / 60);
  assert.equal(f.report.samples, 0);
  assert.equal(f.report.windows, 0);
  assert.deepEqual(f.report.people, {});
  f.cat.air = false;
  for (let i = 0; i <= 180; i++) f.sample(3 + i / 60, 40 + i / 60);
  assert(f.report.episodes.some((e) => e.kind === 'slide' && e.windows >= 4));
});

test('only the explicit boolean airborne flag suspends contact sampling', () => {
  const f = fixture();
  f.cat.air = 'unknown';
  f.cat.root.position.y = 1;
  for (let i = 0; i <= 180; i++) f.sample(i / 60, i / 60);
  assert(f.report.episodes.some((e) => e.kind === 'slide' && e.windows >= 4));
});
