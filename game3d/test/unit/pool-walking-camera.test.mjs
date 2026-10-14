import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
registerHooks({ resolve(s, c, next) {
  if (s === 'three') return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, c);
  if (s.startsWith('three/addons/')) return next(new URL('../../vendor/' + s.slice(13), import.meta.url).href, c);
  return next(s, c);
} });
globalThis.location = { search: '' };
globalThis.window = {};
const { poolWalkingCamera } = await import('../../js/places/day3/pool-walking-camera.js');
const { changingPlan } = await import('../../js/scenes/sports/changing-room.js');
for (const gender of ['man', 'woman']) test(`pool corridor shows the actor above lockers without changing deck or held shots: ${gender}`, () => {
  const look = { yaw: -.22, elev: 54 * Math.PI / 180 };
  const cam = { ...look }, walk = poolWalkingCamera(cam, look, gender);
  const { bounds: [x0, x1], corridor, deck } = changingPlan(gender);
  // A ray from a 1 m torso to the camera clears a 1.65 m locker less than 0.2 m ahead.
  for (let x = x0 + .4; x < x1 - .4; x += .5) {
    const p = { x, z: corridor[1] };
    walk.update(p, 1);
    assert.ok(1 + .2 * Math.tan(cam.elev) > 1.65);
    assert.equal(cam.yaw, look.yaw);
  }
  cam.close = { poolWaterShot: true }; cam.elev = .48;
  walk.update({ x: corridor[0], z: corridor[1] }, 1);
  assert.equal(cam.elev, .48, 'authored water shot unchanged');
  cam.close = null; walk.update({ x: deck[0], z: deck[1] }, 1);
  assert.equal(cam.elev, look.elev, 'normal deck camera restored');
});
