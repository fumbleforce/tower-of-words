import assert from 'node:assert/strict';
import test from 'node:test';
import { markerGoal } from '../../js/ui/marker-goal.js';

const mio = { goal: () => true };
const seat = { goal: () => true };

test('the opening does not advertise a goal before the player has one', () => {
  assert.equal(markerGoal(mio, { opening: true }), false);
  assert.equal(markerGoal(mio, { opening: true, text: 'Talk to Mio', held: true }), false);
  assert.equal(markerGoal(mio, { opening: true, text: '', held: false }), false);
});

test('an explicit opening destination takes precedence over generic story goals', () => {
  const state = { opening: true, text: 'Sit by the lunchbox.', destination: seat };
  assert.equal(markerGoal(seat, state), true);
  assert.equal(markerGoal(mio, state), false);
  assert.equal(markerGoal(mio, { ...state, destination: null, text: 'Talk to Mio again.' }), true);
  assert.equal(markerGoal({ goal: () => false }, state), false);
});

test('other places retain their authored multiple goals regardless of opening state', () => {
  const state = { opening: false, held: true, text: '', destination: seat };
  assert.equal(markerGoal(mio, state), true);
  assert.equal(markerGoal(seat, state), true);
  assert.equal(markerGoal({ goal: () => false }, state), false);
  assert.equal(markerGoal({}, state), false);
});
