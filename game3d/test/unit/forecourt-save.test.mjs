import assert from 'node:assert/strict';
import { test } from 'node:test';
import { migrateForecourtSave } from '../../js/places/forecourt-save.js';

test('saves from before the forecourt continue on the new route', () => {
  const goal = migrateForecourtSave({ place: 'gate', ui: { goal: 'Take the lift down to B2.' } });
  assert.equal(goal.ui.goal, 'Leave the station and walk to head office.');
  const leaving = migrateForecourtSave({
    place: 'gate',
    transition: { from: 'gate', to: 'office', phase: 'leaving' },
    runner: { execution: { frames: [] }, queued: ['x'], onceDone: ['a'] },
  });
  assert.deepEqual(leaving.transition, { from: 'gate', to: 'forecourt', phase: 'leaving' });
  assert.deepEqual(leaving.runner, { execution: null, queued: [], onceDone: ['a'] });
  const arriving = migrateForecourtSave({ place: 'office', transition: { from: 'gate', to: 'office', phase: 'arriving' } });
  assert.deepEqual(arriving.transition, { from: 'forecourt', to: 'office', phase: 'arriving' });
  const current = { place: 'office', flags: { gate_through: true } };
  assert.deepEqual(migrateForecourtSave(current), current);
  assert.equal(migrateForecourtSave(null), null);
});
