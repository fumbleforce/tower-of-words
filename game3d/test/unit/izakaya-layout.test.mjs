import test from 'node:test';
import assert from 'node:assert/strict';
import { R, SEATS, DOOR, SPOTS, izakayaNav } from '../../js/scenes/izakaya/plan.js';
import { BUILDINGS } from '../../js/scenes/island-layout.js';
test('izakaya respects the real facade footprint and fits all five table places', () => {
  const b = BUILDINGS.find((x) => x.id === 'izakaya').rect;
  assert.ok(R.x1 - R.x0 < b[2] - b[0]);
  assert.ok(-R.z0 < b[3] - b[1]);
  assert.deepEqual(Object.keys(SEATS), ['party_seat', 'party_mori', 'party_mio', 'party_kenji', 'party_emi']);
  const nav = izakayaNav();
  for (const [id, s] of Object.entries(SEATS)) {
    assert.ok(!nav.free(s.x, s.z), id + ' chair is solid');
    assert.ok(nav.free(...s.out), id + ' approach is free');
    const route = nav.path(...DOOR.in, ...s.out);
    assert.ok(route?.length, id + ' route from door');
    assert.ok(
      Math.hypot(route.at(-1)[0] - s.out[0], route.at(-1)[1] - s.out[1]) < 0.12,
      id + ' route ends on actual approach',
    );
    assert.ok(nav.path(...s.out, ...DOOR.out)?.length, id + ' return to door');
  }
  assert.ok(nav.free(...SPOTS.service_counter));
  assert.ok(nav.path(...DOOR.in, ...SPOTS.service_counter)?.length);
});
