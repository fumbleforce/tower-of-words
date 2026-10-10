import test from 'node:test';
import assert from 'node:assert/strict';
import { senderCamera } from '../../js/investigations/sender/camera.js';

test('sender saves only its active camera and reacquires it on restore', () => {
  const game = { player: { root: { position: { x: -1, z: -2 } } } };
  const place = {
    people: { mio: { root: { position: { x: -2, z: -3 } } } },
    cam: { fitDist: 8, close: null, closeOn(point, zoom, y) { this.close = { point, zoom, y }; }, snap() {} },
  };
  const camera = senderCamera(game, place);
  assert.equal(camera.snapshot(), null);
  camera.pair();
  const saved = camera.snapshot();
  assert.deepEqual(saved, { pair: true });
  const originalClose = place.cam.close;
  place.cam.closeOn([5, 5], 1, 1);
  assert.equal(camera.snapshot(), null, 'another office chat does not inherit sender framing');
  camera.load(saved);
  assert.notEqual(place.cam.close, originalClose);
  assert.deepEqual(camera.snapshot(), saved);
  assert.equal(place.cam.close.conversationShot.yaw, 2.6);
  place.cam.close = null;
  assert.equal(camera.snapshot(), null, 'released camera carries no sender framing');
  camera.load(null);
  place.cam.closeOn([1, 1], 1, 1);
  assert.equal(camera.snapshot(), null, 'unrelated restored camera remains unrelated');
});
