import test from 'node:test';
import assert from 'node:assert/strict';
import { attachForecourtFraming, forecourtWestClamp } from '../../js/places/forecourt-camera.js';

test('campus return can center on the western street on desktop and phone', () => {
  for (const phone of [false, true]) {
    assert.equal(forecourtWestClamp({ x: -5.3, z: -3.9 }, phone), -6.8);
    assert(forecourtWestClamp({ x: -5.3, z: -2.3 }, phone) < -5.3);
  }
});
test('station, bike court, head office and lift retain their framing limits', () => {
  for (const phone of [false, true])
    for (const [x, z] of [
      [-1.5, 1.15],
      [-1.5, 2.65],
      [5, 7],
      [12.3, -2.85],
      [17.25, -10.2],
    ])
      assert.equal(forecourtWestClamp({ x, z }, phone), phone ? -1 : 5.2);
});
test('the approach returns smoothly to normal framing when walking south or east', () => {
  for (const phone of [false, true])
    for (const axis of ['x', 'z']) {
      const low = axis === 'x' ? -3.8 : -2.4,
        high = axis === 'x' ? -1 : 0.5;
      let previous = -6.8;
      for (let i = 0; i <= 100; i++) {
        const p = { x: -5.3, z: -3.9, [axis]: low + ((high - low) * i) / 100 };
        const clamp = forecourtWestClamp(p, phone);
        assert(clamp >= previous);
        assert(clamp - previous < 0.19);
        previous = clamp;
      }
    }
});

test('arrival and restored-save snaps update the clamp before camera framing', () => {
  let seen;
  const cam = {
    clamp: [5.2, 26, -11.4, 12],
    snap() {
      seen = this.clamp[0];
    },
  };
  const frame = attachForecourtFraming(cam, () => false);
  cam.snap({ x: -5.3, z: -3.9 });
  assert.equal(seen, -6.8);
  // Lift rides snap their already-authored camera without a player position.
  cam.snap();
  assert.equal(seen, -6.8);
  frame({ x: 12.3, z: -2.85 });
  assert.equal(cam.clamp[0], 5.2);
});

test('the western orbit clears the courtyard tree and leaves other camera directions alone', () => {
  const cam = { clamp: [5.2, 26, -11.4, 12], yaw: 0.2, snap() {} };
  const frame = attachForecourtFraming(cam, () => false);
  frame({ x: 12.3, z: -2.85 });
  assert.equal(cam.yaw, 0.2);
  frame({ x: -5.3, z: -2.3 });
  assert(cam.yaw < -0.49);
  frame({ x: -1.5, z: 1.15 });
  assert(Math.abs(cam.yaw) === 0);
  const phone = { clamp: [-1, 30, -12.4, 12], yaw: -1.2, snap() {} };
  attachForecourtFraming(phone, () => true)({ x: -5.3, z: -2.3 });
  assert.equal(phone.yaw, -1.2);
});
