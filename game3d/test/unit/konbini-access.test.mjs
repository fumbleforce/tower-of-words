import test from 'node:test';
import assert from 'node:assert/strict';
import { createConditionEvaluator } from '../../js/narrative/conditions.js';
import { waysOut } from '../../js/travel/ways.js';
import { placeStates } from '../../js/travel/rules.js';
import { giveItem } from '../../js/gameplay/gifts.js';
import { itemDocumentPages } from '../../js/gameplay/item-documents.js';
import konbini from '../../story/konbini.js';
import { KONBINI_OPEN } from '../../js/gameplay/shop-hours.js';

test('the actual daytime street trigger and map agree; a plain route cannot bypass closed hours', async () => {
  for (const day of [1, 2, 3, 4, 5]) {
    const street = (await import(`../../story/${day === 1 ? '' : `day${day}/`}shotengai.js`)).default;
    for (const period of ['early', 'morning', 'lunch', 'afternoon', 'evening']) {
      const cond = createConditionEvaluator(k => ({ day, period })[k] ?? 0);
      const opts = { cond, day };
      const fromStreet = waysOut('shotengai', street, opts);
      const expected = day >= 3 && cond(KONBINI_OPEN);
      assert.equal(fromStreet.some(w => w.to === 'konbini' && !w.scene), expected, `${day}/${period}`);
      const graph = { shotengai: fromStreet, konbini: waysOut('konbini', konbini, opts) };
      const state = placeStates({ here: 'shotengai', day, period, graph }).konbini;
      assert.equal(state.state, day < 3 ? 'hidden' : expected ? 'go' : 'closed');
      if (day >= 3) assert.ok(graph.konbini.some(w => w.to === 'shotengai' && !w.scene), 'exit stays open after closing');
      const shortcut = { on: { 'talk:door': 'enter' }, nodes: { enter: [{ do: 'trip', to: 'konbini' }] } };
      assert.equal(waysOut('shotengai', shortcut, opts).length > 0, expected, 'route extraction enforces hours itself');
    }
  }
});

test('groceries cannot fall through a drink-only wildcard gift branch', () => {
  const calls = [], state = { flags: {}, take: k => calls.push(k), runner: {
    has: () => true, entry: () => ({}), trigger: k => calls.push(k),
  } };
  for (const item of ['milk', 'riceball']) assert.equal(giveItem(state, item, 'mio'), null);
  assert.deepEqual(calls, []);
  assert.equal(giveItem(state, 'water', 'mio'), 'give:water:mio');
  assert.deepEqual(calls, ['water', 'give:water:mio']);
});


test('owned grocery labels supply plain multiline pages to the shared Bag reader', () => {
  for (const id of ['milk', 'riceball']) {
    const pages = itemDocumentPages(id);
    assert.equal(pages.length, 1);
    assert.equal(pages[0].split('\n').length, 3);
    assert.equal(pages[0].includes('\\n'), false);
    assert.equal(pages[0].includes('<br>'), false);
    pages[0] = 'changed caller copy';
    assert.notEqual(itemDocumentPages(id)[0], pages[0]);
  }
});
