import test from 'node:test';
import assert from 'node:assert/strict';
import { FINDS, NODES, eligible, writtenNode, withoutInterruptedLook } from '../../js/flavor-finds/model.js';
import { createConditionEvaluator } from '../../js/narrative/conditions.js';
test('each find respects its first date, final date and pool membership/period boundary', () => {
  for (const f of FINDS) {
    const cond = createConditionEvaluator((k) => ({ period: 'evening', club_swimming: true })[k] ?? 0);
    assert.equal(eligible(f, f.from - 1, cond), false, f.id);
    assert.equal(eligible(f, f.from, cond), true, f.id);
    assert.equal(eligible(f, f.until ? f.until + 1 : 12, cond), !f.until, f.id);
  }
  const key = FINDS.find((f) => f.id === 'pool_key_tag');
  for (const values of [
    { period: 'morning', club_swimming: true },
    { period: 'evening', club_swimming: false },
  ]) {
    assert.equal(
      eligible(
        key,
        3,
        createConditionEvaluator((k) => values[k] ?? 0),
      ),
      false,
    );
  }
});
test('only authored paper captions change presentation; dialogue, return action and final flags are retained', () => {
  for (const f of FINDS) {
    const transformed = writtenNode(f),
      source = NODES[f.node];
    assert.equal(transformed.length, source.length);
    for (const [i, step] of source.entries()) {
      if (typeof step === 'string' && step.startsWith('>')) assert.equal(transformed[i].text, step.slice(2));
      else assert.deepEqual(transformed[i], step);
    }
  }
});
test('interrupted looks save no resumable scene; unrelated checkpoints and final flags are untouched', () => {
  const other = { execution: { frames: [{ node: 'd4_fan' }] }, onceDone: ['kept'] };
  assert.equal(withoutInterruptedLook(other), other);
  for (const f of FINDS) {
    const active = { ...other, execution: { frames: [{ node: f.node }] } };
    assert.deepEqual(withoutInterruptedLook(active), { ...other, execution: null });
    assert.ok(active.execution);
  }
});
