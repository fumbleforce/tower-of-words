import test from 'node:test';
import assert from 'node:assert/strict';
import { seatSurface } from '../../tools/seat-surface.mjs';

const select = (heights, options) => heights.reduce((best, top) => seatSurface(best, { top }, options), null)?.top;

test('a named train cushion wins over an adjacent armrest in either ray order', () => {
  for (const heights of [[0.04, 0.222, 0.381], [0.381, 0.222, 0.04]]) {
    assert.equal(select(heights, { expectedTop: 0.22, hipY: 0.353 }), 0.222);
    // The same comparison works in world coordinates after the car moves vertically.
    assert.equal(select(heights.map(y => y + 2), { expectedTop: 2.22, hipY: 2.353 }), 2.222);
  }
});

test('a deeply sunken sitter still measures the named cushion above its hips', () => {
  const hipY = 0.17, underside = 0.12;
  const top = select([0.04, 0.222, 0.381], { expectedTop: 0.22, hipY });
  assert.equal(top, 0.222);
  assert.ok(hipY - top < 0, 'hips below cushion remains a failure');
  assert.ok(underside - top < -0.03, 'existing 3 cm sinking limit still fails');
});

test('an unknown seat retains the highest surface below the hips with existing slack', () => {
  assert.equal(select([0.04, 0.22, 0.5], { hipY: 0.3 }), 0.22);
  assert.equal(select([0.5], { hipY: 0.3 }), undefined);
});
