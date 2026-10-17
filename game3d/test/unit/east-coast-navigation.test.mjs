import assert from 'node:assert/strict';
import test from 'node:test';
import { coastNavigation } from '../../js/scenes/east-coast/navigation.js';
import { IN, DOORS, EXITS, NOOKS, pt } from '../../js/scenes/east-coast/plan.js';
import * as Q from '../../js/scenes/dorm-quarter/plan.js';

// The dorm quarter is one large walk grid: exercise the runtime factory and the real search in both directions,
// between the far ends of the row, the park, the gardens, the beach promenade and the onsen.
test('every original coast destination and new garden remains connected in both directions', () => {
  const nav = coastNavigation();
  nav.build();
  const places = {
    row: IN,
    onsen: DOORS[0].step,
    sports: EXITS.sports.lane,
    commons: DOORS[1].step,
    lookout: NOOKS[0].at,
    shrine: [-2.5, -44.3],
    terrace: [0, 0.7],
    promenade: EXITS.east_lane.ways.promenade.lane,
    bridge: pt([Q.AXIS_X, -20]),
    ring: pt([Q.RING.x - Q.RING.pad + 0.2, Q.RING.z + Q.RING.pad - 0.2]),
    gardens: pt([Q.GATE_X, -47]),
    ne_door: pt([Q.NE_DOOR[1] - 0.6, (Q.NE_DOOR[2] + Q.NE_DOOR[3]) / 2]),
    beach: pt([130.6, -15]),
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
