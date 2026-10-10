import test from 'node:test';
import assert from 'node:assert/strict';
import { bakeryTrade } from '../../js/places/bakery/trade.js';
import { bakeryOpen, bakeryNav, SPOTS, DOOR, SEAT } from '../../js/scenes/bakery/plan.js';
const fresh = () => ({ sim: { yen: 1000, inv: [] }, flags: {} });
test('checkout commits once across serialized reload and repeated paid hooks', () => {
  const s = fresh(); let t = bakeryTrade(s.sim, s.flags);
  const id = t.select('curry_bread').id;
  assert.equal(t.select('curry_bread').id, id);
  assert.equal(t.pay(), true);
  const loaded = JSON.parse(JSON.stringify(s)); t = bakeryTrade(loaded.sim, loaded.flags);
  assert.equal(t.pay(), true); t.finish(); assert.equal(t.pay(), true);
  assert.deepEqual(loaded.sim, { yen: 820, inv: ['curry_bread'] });
  t.prepareEat(); assert.equal(t.eat(), true); assert.equal(t.eat(), false);
  assert.equal(loaded.flags.bakery_eaten_id, id);
  assert.deepEqual(loaded.sim.inv, []);
  assert.equal(loaded.sim.yen, 820);
});
test('cancel and insufficient funds never debit or add stock; new deliberate orders can repeat', () => {
  const s = fresh(), t = bakeryTrade(s.sim, s.flags);
  t.select('curry_bread'); t.cancel(); assert.equal(t.pay(), false);
  assert.deepEqual(s.sim, { yen: 1000, inv: [] });
  s.sim.yen = 100; t.select('butter_roll'); assert.equal(t.pay(), false);
  assert.equal(s.flags.bakery_cant_pay, true); assert.deepEqual(s.sim.inv, []);
  s.sim.yen = 360; assert.equal(t.pay(), true); t.finish();
  const old = t.receipt().id; t.select('butter_roll'); assert.ok(t.receipt().id > old); t.pay(); t.finish();
  assert.deepEqual(s.sim, { yen: 120, inv: ['butter_roll', 'butter_roll'] });
  t.prepareEat(); t.eat(); assert.deepEqual(s.sim.inv, ['butter_roll']);
});
test('a removed purchase cannot be consumed again or mutate relationship data', () => {
  const s = fresh(), t = bakeryTrade(s.sim, s.flags); s.flags.bond_example = 4;
  t.select('curry_bread'); t.pay(); t.finish(); s.sim.inv.length = 0;
  assert.equal(t.canEat(), false); assert.equal(t.eat(), false); assert.equal(s.flags.bond_example, 4);
});
test('shop hours preserve day one and two closures and permit later daytime visits', () => {
  for (const day of [1, 2]) for (const p of ['early', 'morning', 'lunch', 'afternoon', 'evening']) assert.equal(bakeryOpen(day, p), false);
  for (const day of [3, 4, 5, 12]) {
    for (const p of ['morning', 'lunch', 'afternoon']) assert.equal(bakeryOpen(day, p), true);
    for (const p of ['early', 'evening']) assert.equal(bakeryOpen(day, p), false);
  }
});
test('real counter, shelf and chair approaches connect to the entrance without crossing furnishings', () => {
  const nav = bakeryNav();
  for (const target of [...Object.values(SPOTS), DOOR.out, SEAT.out]) {
    assert.ok(nav.free(...target), `blocked ${target}`);
    assert.ok(nav.path(...DOOR.in, ...target)?.length, `unreachable ${target}`);
  }
  assert.equal(nav.free(SEAT.x, SEAT.z), false);
  assert.equal(nav.free(0.55, -2.98), false);
  assert.equal(nav.free(-1.6, -1.7), false);
});

test('older bread remains edible after another order, and consuming one never removes both', () => {
  const s = fresh(), t = bakeryTrade(s.sim, s.flags);
  for (const item of ['curry_bread', 'butter_roll']) { t.select(item); t.pay(); t.finish(); }
  assert.equal(t.canEat('curry_bread'), true);
  t.prepareEat('curry_bread'); const id = s.flags.bakery_eat_id;
  t.prepareEat('curry_bread'); assert.equal(s.flags.bakery_eat_id, id);
  assert.equal(t.eat(), true); assert.equal(t.eat(), false);
  assert.deepEqual(s.sim.inv, ['butter_roll']);
  t.prepareEat('butter_roll'); assert.equal(t.eat(), true);
  assert.deepEqual(s.sim.inv, []); assert.equal(s.sim.yen, 700);
});
