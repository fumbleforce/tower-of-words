import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
const hook = registerHooks({ resolve(s, c, n) {
  return n(s === 'three' ? new URL('../../vendor/three/three.module.js', import.meta.url).href : s, c);
} });
Object.assign(globalThis, { window: {}, location: { search: '' }, localStorage: { getItem: () => null },
  document: { documentElement: { style: { setProperty() {} } } } });
const THREE = await import('../../vendor/three/three.module.js');
const { startMoveCheck } = await import('../../js/movement/checks.js');

test('water avoids ground checks; dry sliding/furniture and swimmer pair overlaps still fail', () => {
  let sample;
  globalThis.requestAnimationFrame = fn => { sample = fn; };
  const space = new THREE.Group();
  function actor(x) {
    const root = new THREE.Group(), feet = [new THREE.Object3D(), new THREE.Object3D()];
    root.position.set(x, -.5, 0); root.add(...feet); space.add(root);
    return { root, feet, update() {}, swimming: true, state: 'idle' };
  }
  const player = actor(0), other = actor(5), camera = new THREE.PerspectiveCamera(70, 1.6, .01, 100);
  camera.position.set(0, 4, 14); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true);
  const game = { player, t: 0, walker: {}, place: { name: 'pool', space, camera, people: { other },
    nav: { x0: -100, x1: 100, z0: -100, z1: 100, clearance: () => 0 } } };
  const check = startMoveCheck(game);
  const step = (dx = .025) => {
    game.t += .1; player.root.position.x += dx; player.update(.1); sample();
  };
  for (let i = 0; i < 70; i++) step();
  assert.deepEqual(check.overlaps, [], 'water is not deck furniture');
  assert.deepEqual(globalThis.window.__gaitCheck.episodes, [], 'swimming is not foot sliding');
  player.swimming = false; player.root.position.y = 0;
  for (let i = 0; i < 70; i++) step();
  assert.ok(check.overlaps.some(s => s.includes('in the furniture')), 'same dry geometry still fails');
  assert.ok(globalThis.window.__gaitCheck.episodes.some(e => e.kind === 'slide'), 'dry sliding still fails');
  player.swimming = true; player.root.position.y = -.5;
  other.root.position.copy(player.root.position).add(new THREE.Vector3(.1, 0, 0));
  for (let i = 0; i < 12; i++) step(0);
  assert.ok(check.overlaps.some(s => s.includes('and other')), 'submerged swimmers still collide with each other');
});
hook.deregister();
