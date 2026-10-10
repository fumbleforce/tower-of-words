import assert from 'node:assert/strict';
import test from 'node:test';
import { goalAt } from '../../js/narrative/hooks/goal-at.js';
import { snapshotPlace, snapshotGoalDestination, restoreGoal } from '../../js/saves/zones.js';

function fixture() {
  const mio = { id: 'mio', goal: () => false };
  const game = {
    ui: { goalText: '' },
    place: { name: 'train', seats: { seat_far_r: { x: 1, z: 2 } } },
    markers: {
      list: [mio],
      add(marker) { marker.el = { remove() {} }; this.list.push(marker); return marker; },
    },
    hooks: {},
  };
  const at = goalAt(game, target => Array.isArray(target) ? target : null);
  game.hooks.goal = ({ text, at: target }) => { at(text ? target : null); game.ui.goalText = text; };
  const saved = () => ({ ...snapshotPlace(game), ui: { goal: game.ui.goalText } });
  return { game, mio, saved };
}

test('saving and restoring a seat goal preserves its destination and generic passenger goals', () => {
  const { game, mio, saved } = fixture();
  game.hooks.goal({ text: 'Sit by the lunchbox.', at: 'seat_far_r' });
  const before = saved();
  assert.deepEqual(before.goalDestination, { place: 'train', at: 'seat_far_r' });
  game.hooks.goal({ text: 'Talk to Mio.', at: 'mio' });
  assert.equal(mio.goal(), true);
  restoreGoal(game, before);
  assert.equal(mio.goal(), false, 'the replaced forced goal is restored');
  assert.equal(game.ui.goalText, before.ui.goal);
  assert.equal(game.markers.list.filter(m => m.id === 'goal_at').length, 1);
  assert.deepEqual(saved(), before);
});

test('coordinate destinations are copied at author, snapshot and restore boundaries', () => {
  const { game, saved } = fixture();
  const point = [1, 2];
  game.hooks.goal({ text: 'Walk here.', at: point });
  point[0] = 100;
  const before = saved();
  assert.deepEqual(before.goalDestination.at, [1, 2]);
  game.goalDestination.at[0] = 200;
  assert.deepEqual(before.goalDestination.at, [1, 2]);
  restoreGoal(game, before);
  before.goalDestination.at[1] = 300;
  assert.deepEqual(game.goalDestination.at, [1, 2]);
});

test('goal replacement, clearing and invalid destinations cannot retain a previous pin', () => {
  for (const next of [{ text: '' }, { text: 'Look around.' }, { text: 'Unknown.', at: 'missing' }]) {
    const { game, saved } = fixture();
    game.hooks.goal({ text: 'Sit.', at: 'seat_far_r' });
    game.hooks.goal(next);
    assert.equal(saved().goalDestination, null);
    assert.equal(game.markers.list.some(m => m.id === 'goal_at'), false);
  }
});

test('destinations are scoped to both a place and a nonempty goal', () => {
  const { game, saved } = fixture();
  game.hooks.goal({ text: 'Sit.', at: 'seat_far_r' });
  const before = saved();
  game.ui.goalText = '';
  assert.equal(snapshotGoalDestination(game), null);
  game.ui.goalText = 'Sit.';
  game.place = { name: 'office' };
  assert.equal(snapshotGoalDestination(game), null);
  restoreGoal(game, before);
  assert.equal(game.ui.goalText, 'Sit.');
  assert.equal(game.goalDestination, null);
});

test('old saves retain goal text without inheriting a newer explicit destination', () => {
  const { game } = fixture();
  game.hooks.goal({ text: 'Sit.', at: 'seat_far_r' });
  restoreGoal(game, { ui: { goal: 'Talk to Mio.' } });
  assert.equal(game.ui.goalText, 'Talk to Mio.');
  assert.equal(game.goalDestination, null);
  restoreGoal(game, {});
  assert.equal(game.ui.goalText, '');
});

test('a save without an explicit destination needs no UI state', () => {
  assert.equal(snapshotPlace({ place: { name: 'office' } }).goalDestination, null);
  assert.equal(snapshotGoalDestination({ goalDestination: { place: 'office', at: 'chair' } }), null);
});
