import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { overBudget, staleExceptions, describe, lower, limitFor } from '../../tools/perf/place-budget-lib.mjs';
import { PLACE_FILES } from '../../js/places/definitions.js';

const budgets = {
  budgets: { phone: { calls: 200, tris: 300000 } },
  places: { forecourt: { phone: { tris: { max: 380000, issue: 372 } } } },
};

test('a place over its tier budget fails, naming the place, the number and the budget', () => {
  const over = overBudget(budgets, { phone: { plaza: { calls: 210, tris: 250000 } } });
  assert.equal(over.length, 1);
  assert.equal(describe(over[0]), 'plaza (phone): 210 draw calls, over the phone budget 200');
});

test('a known exception raises only its own number, and is a ratchet', () => {
  assert.deepEqual(overBudget(budgets, { phone: { forecourt: { calls: 190, tris: 364000 } } }), []);
  const over = overBudget(budgets, { phone: { forecourt: { calls: 201, tris: 390000 } } });
  assert.deepEqual(over.map(o => o.metric), ['calls', 'tris']);
  assert.match(describe(over[1]), /390k triangles, over its known-exception ceiling 380k \(#372\)/);
  assert.equal(limitFor(budgets, 'phone', 'forecourt', 'calls').limit, 200);
});

test('a load time gets its allowance for run-to-run noise before it fails', () => {
  const noisy = { ...budgets, budgets: { phone: { loadMs: 6000 } }, allowance: { loadMs: 0.15 } };
  assert.deepEqual(overBudget(noisy, { phone: { plaza: { loadMs: 6800 } } }), []);
  const over = overBudget(noisy, { phone: { plaza: { loadMs: 7000 } } });
  assert.equal(describe(over[0]), 'plaza (phone): 7000 load ms, over the phone budget 6000 and its 15% allowance for run-to-run noise');
});

test('a place that does not open fails', () => {
  const over = overBudget(budgets, { phone: { gym: { error: 'boom' } } });
  assert.equal(describe(over[0]), 'gym (phone) did not open: boom');
});

test('an exception the place no longer needs is reported', () => {
  const notes = staleExceptions(budgets, { phone: { forecourt: { calls: 150, tris: 290000 } } });
  assert.equal(notes.length, 1);
  assert.match(notes[0], /back under the budget 300k/);
});

test('a retry keeps the lower number of the two runs', () => {
  assert.deepEqual(lower({ calls: 210, tris: 100 }, { calls: 190, tris: 120 }), { calls: 190, tris: 100 });
  assert.deepEqual(lower({ error: 'x' }, { calls: 1 }), { calls: 1 });
});

test('the budgets file names an issue for every exception and only places the game has', () => {
  const file = JSON.parse(fs.readFileSync(new URL('../../tools/perf/place-budgets.json', import.meta.url), 'utf8'));
  for (const [place, tiers] of Object.entries(file.places)) {
    assert.ok(PLACE_FILES[place], `${place} is not a place`);
    for (const [tier, own] of Object.entries(tiers)) {
      assert.ok(file.tiers[tier], `${place}: no tier ${tier}`);
      for (const [metric, e] of Object.entries(own)) {
        assert.ok(file.budgets[tier][metric] != null, `${place} (${tier}): ${metric} has no budget`);
        assert.ok(e.max > file.budgets[tier][metric], `${place} (${tier}): the ${metric} exception is not above the budget`);
        assert.ok(Number.isInteger(e.issue), `${place} (${tier}): the ${metric} exception needs an issue`);
      }
    }
  }
});
