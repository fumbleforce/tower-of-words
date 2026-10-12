import assert from 'node:assert/strict';
import test from 'node:test';
import { coastNavigation } from '../../js/scenes/east-coast/navigation.js';
import { IN, DOORS, EXITS } from '../../js/scenes/east-coast/plan.js';

// The larger garden formerly exhausted the global A* limit on the two original northern trips. Exercise the
// runtime factory and the real search in both directions, including the farthest garden starts.
test('every original coast destination and new garden remains connected in both directions', () => {
  const nav = coastNavigation();
  nav.build();
  const places = {
    row: IN,
    onsen: DOORS[0].step,
    sports: EXITS.sports.lane,
    commons: DOORS[1].step,
    lookout: [5.2, -46.5],
    shrine: [-2.5, -44.1],
    terrace: [0, 0.7],
    pergola: [-37.05, 7.5],
    lawn: [-26.1, 14.7],
    rest: [-19, 16.5],
  };
  for (const [from, start] of Object.entries(places))
    for (const [to, end] of Object.entries(places)) {
      if (from === to) continue;
      assert.ok(nav.free(...start) && nav.free(...end), `${from} → ${to}: blocked endpoint`);
      const path = nav.path(...start, ...end);
      assert.ok(path?.length, `${from} → ${to}: search returned no route`);
      assert.deepEqual(path.at(-1), end, `${from} → ${to}: endpoint moved`);
      let previous = start;
      for (const point of path) {
        assert.ok(nav.clear(previous, point), `${from} → ${to}: unsafe segment`);
        previous = point;
      }
    }
});
