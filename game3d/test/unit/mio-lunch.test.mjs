import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mioLunchOffer } from '../../js/places/mio-lunch/eligibility.js';
import { mioLunchState } from '../../js/places/mio-lunch/state.js';

const context = (overrides = {}) => ({ day: 5, period: 'lunch', place: 'office',
  flags: { met_mio: true, step_mio: 2, bondready_mio: 0 }, ...overrides });

test('Mio weekday lunch needs the actual place, time, introduction and existing bond readiness', () => {
  const base = context();
  assert.equal(mioLunchOffer(base), 2);
  for (const change of [{ day: 4 }, { day: 10 }, { day: 11 }, { period: 'morning' },
    { place: 'east_coast' }, { available: false }, { flags: {} }, { flags: { met_mio: true, step_mio: 1 } }])
    assert.equal(mioLunchOffer({ ...base, ...change }), null, JSON.stringify(change));
  for (const day of [5, 6, 7, 8, 9, 12]) assert.equal(mioLunchOffer(context({ day })), 2);
});

test('Trusted handover takes priority without making the earlier lunch expression a gate', () => {
  const flags = { met_mio: true, step_mio: 2, bondready_mio: 3 };
  assert.equal(mioLunchOffer(context({ flags })), 3);
  assert.equal(mioLunchOffer(context({ flags: { ...flags, ms2_mio: true } })), 3);
  assert.equal(mioLunchOffer(context({ flags: { ...flags, ms3_mio: true } })), null);
  assert.equal(mioLunchOffer(context({ flags: { ...flags, bondready_mio: 0, ms2_mio: true } })), null);
});

test('a refused or interrupted lunch cannot complete; sitting alone is not a meal', () => {
  const state = mioLunchState(), c = context();
  state.offer(c);
  assert.throws(() => state.completion(c), /physically finished/);
  state.clear();
  assert.equal(state.snapshot(), null);
  state.offer(c);
  state.advance('accepted');
  state.advance('seated');
  assert.throws(() => state.advance('settled'), /Invalid.*transition/);
  assert.throws(() => state.completion(c), /physically finished/);
  state.advance('ate');
  state.advance('settled');
  assert.equal(state.completion(c), 2);
  assert.throws(() => state.completion({ ...c, period: 'afternoon' }), /accepted period/);
  assert.throws(() => state.completion({ ...c, day: 6 }), /accepted period/);
});

test('Continue preserves each physical handover stage and cannot skip the returned sheet', () => {
  const c = context({ flags: { met_mio: true, step_mio: 2, bondready_mio: 3 } });
  let state = mioLunchState();
  state.offer(c);
  for (const phase of ['accepted', 'held', 'away', 'inspected', 'marked', 'returned', 'settled']) {
    assert.throws(() => state.completion(c), /physically finished/);
    state.advance(phase);
    state = mioLunchState(structuredClone(state.snapshot()));
    assert.equal(state.phase, phase);
  }
  assert.equal(state.completion(c), 3);
  assert.throws(() => state.completion(context()), /no longer eligible/);
  assert.throws(() => mioLunchState({ step: 3, day: 5, phase: 'ate' }), /Invalid.*snapshot/);
  assert.throws(() => mioLunchState({ step: '3', day: 5, phase: 'settled' }), /Invalid.*snapshot/);
});


test('weekday Mio lunch placement changes only after the completed checklist scene', async () => {
  const {registerHooks} = await import('node:module');
  const hook = registerHooks({resolve(id, context, next) {return next(id === 'three' ? new URL('../../vendor/three/three.module.js', import.meta.url).href : id, context);}});
  const {PLANS} = await import('../../js/places/day5/plan.js');
  const {weeklyPlan} = await import('../../js/places/ongoing/plan.js');
  const {isWeekend} = await import('../../js/places/ongoing/calendar.js');
  hook.deregister();
  for (let day=5; day<=33; day++) {
    const plan = day===5 ? PLANS : weeklyPlan(day);
    if (isWeekend(day)) { assert.equal(plan.office.mio.lunch, undefined); continue; }
    assert.equal(plan.office.mio.lunch.if, '!ms3_mio');
    assert.equal(plan.east_coast.mio.lunch.if, 'ms3_mio');
    for (const complete of [false,true]) {
      const active = Object.entries(plan).filter(([,people])=> {
        const spec=people.mio?.lunch;
        return !!spec && (spec.if==='ms3_mio' ? complete : spec.if==='!ms3_mio' ? !complete : true);
      }).map(([place])=>place);
      assert.deepEqual(active,[complete?'east_coast':'office'],`day ${day} completed ${complete}`);
    }
  }
});
