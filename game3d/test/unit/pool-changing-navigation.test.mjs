import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({
  resolve(s, c, next) {
    if (s === 'three') return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, c);
    if (s.startsWith('three/addons/')) return next(new URL('../../vendor/' + s.slice(13), import.meta.url).href, c);
    return next(s, c);
  },
});
globalThis.addEventListener = () => {};
globalThis.innerWidth = 1366;
globalThis.innerHeight = 860;
globalThis.location = { search: '?q=0' };
globalThis.window = { addEventListener() {} };
globalThis.localStorage = { getItem: () => null };
const context = new Proxy(
  {
    measureText: () => ({ width: 100 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  },
  { get: (o, k) => o[k] ?? (() => {}) },
);
globalThis.document = {
  body: { classList: { contains: () => false, toggle() {} } },
  documentElement: { style: { setProperty() {} } },
  createElement: () => ({ getContext: () => context }),
};
const THREE = await import('../../vendor/three/three.module.js');
const { buildSports } = await import('../../js/scenes/sports.js');
const D = await import('../../js/scenes/sports/deck-plan.js');
const P = await import('../../js/scenes/sports/plan.js');

const { changingPlan, changingNavigation, CHANGING_ENTRY } = await import('../../js/scenes/sports/changing-room.js');
const { seatInventory, seatExit } = await import('../../js/gameplay/seat-inventory.js');
const { createTraversal } = await import('../../js/movement/traversal.js');
const { createJump } = await import('../../js/movement/jump.js');
const { poolSave } = await import('../../js/places/day3/pool-save.js');
const floor = changingNavigation();
const world = buildSports({
  walks: [...D.WALKS, ...floor.walks],
  blocks: [...D.BLOCKS, ...floor.blocks],
  start: CHANGING_ENTRY.inside,
  poolInterior: true,
});
const coldPoint = [4.312762523970516, 0, -33.93251450451114];
function session(gender = 'woman') {
  const player = { root: new THREE.Group(), setState() {} };
  player.root.scale.setScalar(1.18);
  world.root.add(player.root);
  const place = {
    name: 'pool',
    space: world.root,
    nav: world.nav,
    changing: changingPlan(gender),
    start: CHANGING_ENTRY.inside,
    seats: {},
    people: {},
    cam: { snap() {} },
  };
  const game = { place, player, busy: true, walker: { sync() {} } };
  game.jump = createJump(game);
  const restoreSurface = game.jump.restoreSurface,
    checked = [];
  game.jump.restoreSurface = (saved) => {
    checked.push({ ...saved });
    return restoreSurface(saved);
  };
  const club = { snapshot: () => ({}), restore() {}, playerInWater: () => false };
  return { game, player, place, checked, save: poolSave(game, place, club) };
}
function restore(s, at, surface) {
  s.player.root.position.fromArray(at);
  const saved = { world: s.save.snapshot(), ...(surface ? { surface } : {}) };
  s.player.root.position.set(s.place.start[0], 0, s.place.start[1]);
  // Continue rebuilds the active place, restores its world, then restores a saved supported surface.
  s.save.restore(saved);
  if (saved.surface) s.game.jump.restoreSurface(saved.surface);
  return saved;
}
test('both real open rooms have connected floor and usable actual bench metadata', () => {
  const place = { space: world.root, nav: world.nav },
    physical = createTraversal(place);
  for (const gender of ['man', 'woman']) {
    const c = changingPlan(gender),
      points = [CHANGING_ENTRY.inside, c.corridor, c.locker, c.shower, c.deck];
    for (let i = 0; i < points.length; i++) {
      assert.equal(world.nav.free(...points[i]), true);
      if (i) assert.ok(world.nav.path(...points[i - 1], ...points[i])?.length);
    }
    const seats = [...seatInventory(place).values()].filter(
      (s) => Math.hypot(s.x - c.seat.at[0], s.z - c.seat.at[1]) < 0.5,
    );
    assert.equal(seats.length, 2);
    for (const seat of seats) {
      const out = seatExit(place, seat);
      assert.ok(out);
      assert.equal(physical.free(...out, ...out, 0, 1.18, false), true);
    }
    assert.equal(world.nav.free(...c.seat.at), false, 'bench solid remains blocked');
    assert.equal(world.nav.free(c.locker[0] - 1.3, c.locker[1] - 0.65), false, 'locker solid remains blocked');
  }
});
test('exact cold near-locker point survives both surface-less Autosave and Quick Continue', () => {
  assert.equal(
    world.nav.free(coldPoint[0], coldPoint[2]),
    false,
    'real padded planner proxy still rejects this physical floor',
  );
  for (const gender of ['man', 'woman'])
    for (const kind of ['Autosave', 'Quick'])
      for (const rootY of [0, 0.006000000052154064]) {
        const s = session(gender),
          surface = kind === 'Quick' ? { x: coldPoint[0], z: coldPoint[2], y: 0.006000000052154064 } : null;
        restore(s, [coldPoint[0], rootY, coldPoint[2]], surface);
        assert.deepEqual(s.player.root.position.toArray(), coldPoint, `${gender} ${kind}`);
        assert.equal(s.game.jump.air, false);
        assert.ok(Math.abs(s.game.jump.supportHeight - 0.006000000052154064) < 1e-6);
        assert.equal(s.checked[0].y, rootY, 'the original saved root height reaches the validator');
        // The next automatic world-only checkpoint must keep the same location too.
        const next = { world: s.save.snapshot() };
        s.player.root.position.set(0, 0, 0);
        s.save.restore(next);
        assert.deepEqual(s.player.root.position.toArray(), coldPoint);
      }
});
test('bounded physical fallback rejects solids, outside pavilion, underwater and unsupported legacy heights', () => {
  const water = P.pt([(D.WATER[0] + D.WATER[1]) / 2, (D.WATER[2] + D.WATER[3]) / 2]);
  const cases = [
    { name: 'inside actual locker', at: [3, 0, -34.38], checks: 0 },
    { name: 'outside pavilion', at: [20, 0, -35], checks: 0 },
    { name: 'water', at: [water[0], -0.5, water[1]], checks: 0 },
    { name: 'shallow submerged legacy', at: [coldPoint[0], -.3, coldPoint[2]], checks: 0 },
    { name: 'submerged above skyline legacy', at: [coldPoint[0], -.4, coldPoint[2]], checks: 0 },
    { name: 'unsupported submerged legacy', at: [coldPoint[0], -3, coldPoint[2]], checks: 0 },
    { name: 'unsupported high legacy', at: [coldPoint[0], 4, coldPoint[2]], checks: 1 },
  ];
  for (const { name, at, checks } of cases) {
    const s = session();
    restore(s, at);
    assert.deepEqual(s.player.root.position.toArray(), [s.place.start[0], 0, s.place.start[1]], name);
    assert.equal(s.checked.length, checks, name);
    assert.equal(s.game.jump.supportHeight, 0, name + ' leaves no stale support');
    assert.equal(s.game.jump.height, 0, name + ' leaves no stale hop');
    if (checks) assert.equal(s.checked[0].y, at[1], name + ' uses original y');
  }
  const s = session();
  s.player.seated = true;
  restore(s, coldPoint);
  assert.equal(s.checked.length, 0, 'a seated legacy record cannot use the dry-floor fallback');
});
