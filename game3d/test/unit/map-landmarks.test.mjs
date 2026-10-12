import test from 'node:test';
import assert from 'node:assert/strict';
import { BUILDINGS, footprint } from '../../js/scenes/island-layout.js';
import { ALLEYS, BAYS, ROWS_Z } from '../../js/scenes/island-south.js';
import { MARKET_ROUTE, marketFootprints } from '../../js/scenes/market-route.js';
import { mapFootprints } from '../../js/ui/map/landmarks.js';

const mapped = mapFootprints(BUILDINGS, footprint);
test('the map leaves all three built shop-street alleys open', () => {
  const south = mapped.filter((b) => b.id.startsWith('shops_south_'));
  assert.equal(south.length, 7);
  for (const [x0, z0, x1, z1] of ALLEYS)
    for (const b of south) {
      const [a, c, d, e] = b.rect;
      assert.ok(Math.min(x1, d) <= Math.max(x0, a) || Math.min(z1, e) <= Math.max(z0, c), `${b.id} blocks an alley`);
    }
  assert.equal(Math.min(...south.map((b) => b.rect[0])), BAYS.x0);
  assert.equal(Math.max(...south.map((b) => b.rect[2])), BAYS.x0 + BAYS.n * BAYS.w);
  assert.ok(south.every((b) => b.rect[1] === ROWS_Z.south));
});
test('shop roof detail never changes unrelated map footprints or building identities', () => {
  for (const b of BUILDINGS.filter((b) => !['shops_north', 'shops_south', 'arcade'].includes(b.id))) {
    const entries = mapped.filter((m) => m.id === b.id);
    assert.equal(entries.length, 1);
    assert.deepEqual(entries[0].points, footprint(b));
  }
  assert.deepEqual(BUILDINGS.find((b) => b.id === 'shops_south').rect, [-4, 22.4, 64.5, 26.9]);
});

test('the fountain to shore route stays open in all market footprints', () => {
  for (const id of ['shops_north', 'shops_south', 'arcade']) {
    const building = BUILDINGS.find((b) => b.id === id);
    const proxies = marketFootprints(building);
    assert.equal(proxies.length, 2);
    assert.ok(proxies.every((b) => b.id === id));
    for (const b of [...proxies, ...mapped.filter((b) => b.id.startsWith(id))])
      assert.ok(b.rect[2] <= MARKET_ROUTE.x0 || b.rect[0] >= MARKET_ROUTE.x1, `${id} bridges the route`);
  }
});
