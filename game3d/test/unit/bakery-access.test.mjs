import test from 'node:test';
import assert from 'node:assert/strict';
import { createConditionEvaluator } from '../../js/narrative/conditions.js';
import { waysOut } from '../../js/travel/ways.js';
import { placeStates } from '../../js/travel/rules.js';
import { giveItem } from '../../js/gameplay/gifts.js';
import bakery from '../../story/bakery.js';
import { BAKERY_OPEN } from '../../js/gameplay/shop-hours.js';

test('the actual daytime street trigger and map agree; a plain route cannot bypass closed hours', async () => {
  for (const day of [1, 2, 3, 4, 5]) {
    const street = (await import(`../../story/${day === 1 ? '' : `day${day}/`}shotengai.js`)).default;
    for (const period of ['early', 'morning', 'lunch', 'afternoon', 'evening']) {
      const cond = createConditionEvaluator(k => ({ day, period })[k] ?? 0);
      const opts = { cond, day };
      const fromStreet = waysOut('shotengai', street, opts);
      const expected = day >= 3 && cond(BAKERY_OPEN);
      assert.equal(fromStreet.some(w => w.to === 'bakery' && !w.scene), expected, `${day}/${period}`);
      const graph = { shotengai: fromStreet, bakery: waysOut('bakery', bakery, opts) };
      const state = placeStates({ here: 'shotengai', day, period, graph }).bakery;
      assert.equal(state.state, day < 3 ? 'hidden' : expected ? 'go' : 'closed');
      if (day >= 3) assert.ok(graph.bakery.some(w => w.to === 'shotengai' && !w.scene), 'exit stays open after closing');
      const shortcut = { on: { 'talk:door': 'enter' }, nodes: { enter: [{ do: 'trip', to: 'bakery' }] } };
      assert.equal(waysOut('shotengai', shortcut, opts).length > 0, expected, 'route extraction enforces hours itself');
    }
  }
});

test('bread cannot fall through a drink-only wildcard gift branch', () => {
  const calls = [], state = { flags: {}, take: k => calls.push(k), runner: {
    has: () => true, entry: () => ({}), trigger: k => calls.push(k),
  } };
  for (const item of ['curry_bread', 'butter_roll']) assert.equal(giveItem(state, item, 'mio'), null);
  assert.deepEqual(calls, []);
  assert.equal(giveItem(state, 'water', 'mio'), 'give:water:mio');
  assert.deepEqual(calls, ['water', 'give:water:mio']);
});
