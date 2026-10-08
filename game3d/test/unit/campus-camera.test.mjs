import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'three')
      return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, context);
    if (specifier.startsWith('three/addons/'))
      return next(new URL('../../vendor/' + specifier.slice(13), import.meta.url).href, context);
    return next(specifier, context);
  },
});
Object.assign(globalThis, {
  location: { search: '' },
  window: {},
  addEventListener() {},
  localStorage: { getItem: () => null },
  document: {},
});
const THREE = await import('../../vendor/three/three.module.js');
const { campusCameraPose } = await import('../../js/places/campus-camera.js');
const { RoomCam } = await import('../../js/cam.js');
const { followFit, turningCam } = await import('../../js/places/turning-cam.js');
const { pt, BOUNDS, PRINT_STEP } = await import('../../js/scenes/campus/plan.js');

test('campus overview keeps the tower and wing out of the walking sightline in both directions', () => {
  const [x0, z0] = pt([-4.9, -13.85]),
    [x1, z1] = pt([11.5, -4.25]);
  const tower = new THREE.Box3(new THREE.Vector3(x0, 0, z0), new THREE.Vector3(x1, 25, z1));
  const [wx0, wz0] = pt([-14, -11.9]),
    [wx1, wz1] = pt([-8.2, -7.3]);
  const wing = new THREE.Box3(new THREE.Vector3(wx0, 0, wz0), new THREE.Vector3(wx1, 11, wz1));
  for (const aspect of [1366 / 860, 390 / 844]) {
    const cam = new RoomCam({ elev: 55, fov: 28, yaw: 0.22 });
    followFit(cam, { x0: BOUNDS[0], x1: BOUNDS[1], z0: BOUNDS[2], z1: BOUNDS[3] }, aspect, {
      yaw: 0.22,
      elev: (55 * Math.PI) / 180,
    });
    const turn = turningCam(cam, campusCameraPose);
    const route = [
      [4.5, -35],
      [4.5, -16.6],
      [-19.25, -16.6],
      [-19.25, -7.05],
      [-19.25, -16.6],
      [4.5, -16.6],
      [4.5, -35],
    ].map(pt);
    const player = new THREE.Vector3(route[0][0], 0, route[0][1]);
    turn.steer(player, 1 / 60);
    cam.snap(player);
    let tested = 0;
    for (let i = 1; i < route.length; i++) {
      const from = player.clone(),
        to = new THREE.Vector3(route[i][0], 0, route[i][1]),
        frames = Math.ceil(from.distanceTo(to) / (1.6 / 60));
      for (let frame = 1; frame <= frames; frame++) {
        player.lerpVectors(from, to, frame / frames);
        turn.steer(player, 1 / 60);
        cam.update(1 / 60, player);
        const target = player.clone().add(new THREE.Vector3(0, 0.85, 0));
        const ray = new THREE.Ray(cam.camera.position.clone(), target.clone().sub(cam.camera.position).normalize());
        for (const block of [tower, wing]) {
          const hit = ray.intersectBox(block, new THREE.Vector3());
          assert(
            !hit || hit.distanceTo(cam.camera.position) > target.distanceTo(cam.camera.position),
            `building blocks aspect ${aspect} at local ${player.x},${player.z}; camera ${cam.camera.position.toArray()} yaw ${cam.yaw}`,
          );
        }
        tested++;
      }
    }
    assert(tested > 3000);
  }
});

test('campus camera retains the print-shop close view and northern overview', () => {
  assert.deepEqual(campusCameraPose(...PRINT_STEP), { yaw: 1.07, elev: (47 * Math.PI) / 180 });
  for (const point of [
    [4.5, -38],
    [-37, -33],
    [-22, -25],
  ])
    assert.deepEqual(campusCameraPose(...pt(point)), { yaw: 0.22, elev: (55 * Math.PI) / 180 });
});
