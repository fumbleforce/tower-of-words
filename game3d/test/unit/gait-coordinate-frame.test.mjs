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

function fixture() {
  globalThis.window = {};
  let frame;
  globalThis.requestAnimationFrame = (fn) => {
    frame = fn;
    return 1;
  };
  const scene = new THREE.Scene(),
    space = new THREE.Group(),
    root = new THREE.Group();
  scene.add(space);
  space.add(root);
  const feet = [new THREE.Object3D(), new THREE.Object3D()];
  root.add(...feet);
  const camera = new THREE.OrthographicCamera(-100, 100, 100, -100, 0.1, 1000);
  camera.position.set(0, 30, 100);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const player = { root, feet, state: 'walk', _walk: true };
  const game = {
    place: { name: 'first', space, camera, people: {} },
    player,
    t: 0,
  };
  const report = startGaitCheck(game);
  let offset = 0;
  return {
    game,
    report,
    sample(t, speed = 1) {
      game.t = t;
      root.position.x = t * speed + offset;
      const p = t % 0.8,
        leftLow = p < 0.4,
        x = leftLow ? 0.2 - p : p - 0.6;
      feet[0].position.set(x, leftLow ? 0 : 0.08, 0.1);
      feet[1].position.set(-x, leftLow ? 0.08 : 0, -0.1);
      scene.updateMatrixWorld(true);
      frame();
    },
    changeFrame(n, changePlace = true) {
      const next = new THREE.Group();
      next.position.x = -n;
      scene.add(next);
      next.updateMatrixWorld(true);
      next.attach(root);
      offset = n;
      if (changePlace) game.place = { ...game.place, name: 'next-' + n, space: next };
    },
  };
}

test('gait windows do not interpret a changed local coordinate origin as foot sliding', () => {
  const f = fixture();
  for (let i = 0; i < 240; i++) {
    if (i === 74) f.changeFrame(40);
    if (i === 105) f.changeFrame(-35);
    f.sample(i / 60);
  }
  assert.ok(f.report.windows >= 4, 'actual sampler completed windows');
  assert.deepEqual(f.report.episodes, []);
});

test('changing carriers within the same place also starts a fresh measurement frame', () => {
  const f = fixture();
  for (let i = 0; i < 240; i++) {
    if (i === 74) f.changeFrame(40, false);
    if (i === 105) f.changeFrame(-35, false);
    f.sample(i / 60);
  }
  assert.ok(f.report.windows >= 4, 'actual sampler completed windows');
  assert.deepEqual(f.report.episodes, []);
});

test('the same sampler still reports real sliding within one coordinate frame', () => {
  const f = fixture();
  for (let i = 0; i < 180; i++) f.sample(i / 60, 4);
  assert.ok(f.report.episodes.some((e) => e.kind === 'slide' && e.windows >= 2));
});
