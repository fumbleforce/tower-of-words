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
  const { bounds: [x0, x1, , z1], corridor, deck } = changingPlan(gender);
  // A ray from a 1 m torso to the camera clears a 1.65 m locker less than 0.2 m ahead.
  for (let x = x0 + .4; x < x1 - .4; x += .5) {
    const p = { x, z: corridor[1] };
    walk.update(p, 1);
    assert.ok(1 + .2 * Math.tan(cam.elev) > 1.65);
    assert.equal(cam.yaw, look.yaw);
  }
  walk.update({ x: 10.556155122038238, z: -30.332565043504808 }, 1);
  assert.ok(cam.elev > 1.3, 'the actual hidden foreground-wall pose keeps the higher view');
  walk.update({ x: corridor[0], z: z1 + .3 }, 1);
  assert.ok(cam.elev > 1.3, 'pavilion doorway retains its readable view');
  cam.close = { poolWaterShot: true }; cam.elev = .48;
  walk.update({ x: corridor[0], z: corridor[1] }, 1);
  assert.equal(cam.elev, .48, 'authored water shot unchanged');
  cam.close = null; walk.update({ x: deck[0], z: deck[1] + 2 }, 1);
  assert.equal(cam.elev, look.elev, 'normal deck camera restored');
});

const THREE = await import('../../vendor/three/three.module.js');
const { Parts } = await import('../../js/kit/core/parts.js');
const { buildChangingRoom } = await import('../../js/scenes/sports/changing-room.js');
const { pt } = await import('../../js/scenes/sports/plan.js');
const { RoomCam } = await import('../../js/cam.js');
test('actual pavilion meshes leave saved foreground-wall torso and head visible through approach and departure', () => {
  const root = new THREE.Group(), island = new THREE.Group(), parts = new Parts(); root.add(island);
  const offset = pt([0, 0]); island.position.set(offset[0], 0, offset[1]);
  buildChangingRoom(parts, { field() {} }, { card() {} }, { glowParts: [], lit: [] }, island);
  const meshes = parts.build(island); root.updateMatrixWorld(true);
  const cam = new RoomCam({ yaw: -.22, elev: 54 }), walk = poolWalkingCamera(cam, { yaw: -.22, elev: 54 * Math.PI / 180 }, 'man');
  const ray = new THREE.Raycaster();
  for (const x of [10.556155122038238, ...['man', 'woman'].map(g => changingPlan(g).deck[0])]) for (const reverse of [false, true]) {
    const zs = Array.from({ length: 61 }, (_, index) => -31.6 + index * .08); if (reverse) zs.reverse();
    for (const z of [-30.332565043504808, ...zs]) {
      const p = new THREE.Vector3(x, 0, z); walk.update(p, .05);
      const eye = p.clone().addScaledVector(new THREE.Vector3(Math.sin(cam.yaw) * Math.cos(cam.elev), Math.sin(cam.elev), Math.cos(cam.yaw) * Math.cos(cam.elev)), 18);
      for (const y of [.8, 1.2]) {
        const body = p.clone().setY(y); ray.set(eye, body.clone().sub(eye).normalize()); ray.far = eye.distanceTo(body) - .02;
        assert.equal(ray.intersectObjects(meshes, false).length, 0, `pavilion hides body ${p.toArray()} at ${y}, reverse ${reverse}`);
      }
    }
  }
});
