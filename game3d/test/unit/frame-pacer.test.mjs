import test from 'node:test';
import assert from 'node:assert/strict';
import { createFramePacer } from '../../js/perf/frame-pacer.js';

test('play and paused caps keep their requested rates across common display refresh rates', () => {
  for (const refresh of [60, 120, 144, 165, 240]) {
    for (const fps of [20, 30, 60]) {
      const due = createFramePacer();
      let frames = 0;
      for (let i = 0; i < refresh * 60; i++) if (due(i * 1000 / refresh, fps)) frames++;
      assert.ok(Math.abs(frames - fps * 60) <= 1, `${refresh} Hz / ${fps} fps drew ${frames} frames in a minute`);
    }
  }
});

test('a long stall does not burst frames on resume, and changing or disabling the cap takes effect immediately', () => {
  const due = createFramePacer();
  assert.equal(due(0, 60), true);
  assert.equal(due(10000, 60), true);
  assert.equal(due(10001, 60), false);
  assert.equal(due(10002, 30), true);
  assert.equal(due(10003, 30), false);
  assert.equal(due(10004, 0), true);
  assert.equal(due(10005, 0), true);
  assert.equal(due(10006, 60), true);
  assert.equal(due(10007, 60), false);
});
