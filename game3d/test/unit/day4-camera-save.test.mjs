import test from 'node:test';
import assert from 'node:assert/strict';
import { actionShot } from '../../js/places/day4/shot.js';
const camera = fitDist => ({ fitDist, yaw: 0, elev: 1, close: null,
  closeOn(point, zoom, y) { this.close = { point, zoom, y }; },
  release() { this.close = null; },
});
test('Continue restores the physical action frame on a rebuilt camera at another viewport fit', () => {
  const first = actionShot({ cam: camera(80) });
  first.focus([2, 3], 12, 0.8, 1.5, 0.6);
  const saved = JSON.parse(JSON.stringify(first.snapshot()));
  const cam = camera(40), resumed = actionShot({ cam });
  resumed.load(saved);
  assert.deepEqual(cam.close, { point: [2, 3], zoom: 40 / 12, y: 0.8 });
  assert.equal(cam.yaw, 1.5);
  cam.yaw = 0; resumed.update();
  assert.equal(cam.yaw, 1.5, 'district turns must not replace the held action view');
  cam.release(); resumed.update();
  assert.equal(cam.close, null);
  assert.equal(cam.yaw, 0, 'leaving the action restores the normal view');
});
