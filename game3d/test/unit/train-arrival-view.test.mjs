import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../../vendor/three/three.module.js';
import { frameTrainArrival } from '../../js/train/arrival-view.js';

const lesson = { arriving: true };
function cameraFor(target) {
  const camera = new THREE.PerspectiveCamera(40, 390 / 844, 1, 160);
  const angle = 62 * Math.PI / 180;
  const dir = new THREE.Vector3(-Math.cos(angle), Math.sin(angle), 0);
  const place = (t, d) => {
    camera.position.copy(t).addScaledVector(dir, d);
    camera.lookAt(t);
    camera.updateMatrixWorld();
  };
  // The shipped phone fit uses the carriage width and platform margin.
  let lo = 2, hi = 120;
  for (let i = 0; i < 40; i++) {
    place(new THREE.Vector3(0, .3, .3), (lo + hi) / 2);
    const fits = [-1.2 - .1 - .42, 1.2 + .1 + .9].every(z => [0, 1.45].every(y => {
      const v = new THREE.Vector3(0, y, z).project(camera);
      return Math.abs(v.x) <= 1 && Math.abs(v.y) <= 3;
    }));
    if (fits) hi = (lo + hi) / 2;
    else lo = (lo + hi) / 2;
  }
  place(target, hi);
  return camera;
}
function pixels(camera, [x, y, z]) {
  const p = new THREE.Vector3(x, y, z).project(camera);
  return [(p.x + 1) * 195, (1 - p.y) * 422];
}

test('phone arrival keeps actual displaced player, blocker and exit above the portrait', () => {
  const player = new THREE.Vector3(-2.453449, 0, 1.364983);
  const target = new THREE.Vector3(player.x + .6, .3, .448485);
  const oldCamera = cameraFor(target);
  const [oldX, oldY] = pixels(oldCamera, player.toArray());
  assert(oldX > 220 && oldY > 440, 'reproduces the observed portrait obstruction');
  frameTrainArrival(target, player, true, true, lesson);
  const camera = cameraFor(target);
  const points = [];
  for (const [x, z] of [[player.x, player.z], [-2.8, .35], [-3.2, .2]])
    for (const dx of [-.32, .32]) for (const y of [0, 1.4]) points.push([x + dx, y, z]);
  for (const x of [-2.65 - .45, -2.65 + .45])
    for (const y of [0, 1.22]) points.push([x, y, 1.2]);
  for (const point of points) {
    const [x, y] = pixels(camera, point);
    assert(x > 12 && x < 378 && y > 40 && y < 420, `safe scene point ${point}: ${x},${y}`);
  }
});

test('arrival framing is reconstructed on Continue and releases without persistent state', () => {
  const player = new THREE.Vector3(-2.8, 0, .35);
  const normal = new THREE.Vector3(-2.2, .3, .3);
  const first = frameTrainArrival(normal.clone(), player, true, true, lesson);
  const continued = frameTrainArrival(normal.clone(), player, true, true, { ...lesson });
  assert.deepEqual(continued, first);
  for (const [phone, arrived, flags] of [[false, true, lesson], [true, false, lesson],
    [true, true, {}], [true, true, { ...lesson, alighted: true }]]) {
    assert.deepEqual(frameTrainArrival(normal.clone(), player, phone, arrived, flags), normal);
  }
});
