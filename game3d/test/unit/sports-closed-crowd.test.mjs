import test from 'node:test';
import assert from 'node:assert/strict';
import { CROWD_SOUTH } from '../../js/crowd/data-south.js';
import { sportsCrowd } from '../../js/places/sports-crowd.js';
const data = CROWD_SOUTH.sports;
test('closed sports approach keeps the population on distinct open routes', () => {
  const before = JSON.stringify(data);
  for (const day of [3, 4]) {
    const plan = sportsCrowd(data, day);
    for (const [period, spec] of Object.entries(plan.periods)) {
      assert.equal(spec.walk, data.periods[period].walk);
      assert.equal(spec.chat, data.periods[period].chat);
      assert.equal(spec.twos, data.periods[period].twos);
      assert.ok(spec.flows.length);
      for (const [from, to, weight, kind] of spec.flows) {
        assert.notEqual(from, 'office_street');
        assert.notEqual(to, 'office_street');
        assert.notEqual(from, to);
        assert.ok(plan.ends[from] && plan.ends[to] && weight > 0);
        assert.ok(!kind || kind === 'jog');
      }
    }
  }
  assert.equal(JSON.stringify(data), before);
  for (const day of [1, 2, 5, 11]) assert.equal(sportsCrowd(data, day), data);
});
