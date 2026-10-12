import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ACTIVITY_REASON, busyReason } from '../../js/travel/activity.js';
import { timeChoices } from '../../js/ui/time-policy.js';
const doc = (...shown) => ({ getElementById: id => ({ hidden: !shown.includes(id) }),
  querySelector: () => shown.includes('panel') ? {} : null,
  body: { classList: { contains: cls => shown.includes(cls) } } });
const free = () => ({ busy: false, walker: { locked: false }, runner: {}, queue: [] });
test('idle, ordinary walking, a seat, and a closed board do not block travel', () => {
  for (const extra of [{}, { walker: { path: [[1, 2]], locked: false } }, { player: { seated: true } }])
    assert.equal(busyReason({ ...free(), ...extra }, doc()), '');
});
test('awaited board/find input identifies what must close, ahead of the generic beat lock', () => {
  const g = { ...free(), busy: true, walker: { locked: true } };
  assert.equal(busyReason(g, doc('boardView')), 'noticeboard');
  assert.equal(busyReason(g, doc('findView')), 'find');
  assert.equal(busyReason(g, doc('panel')), 'panel');
  assert.equal(busyReason(free(), doc('talk')), 'talking');
});
test('actual story, transition, recovery, startup and queue gates stay closed', () => {
  for (const [state, reason] of [[{ busy: true }, 'busy'], [{ walker: { locked: true } }, 'busy'],
    [{ queue: [() => {}] }, 'busy'], [{ transition: { to: 'office' } }, 'transition'],
    [{ pendingStart: 'plaza' }, 'starting'], [{ runner: { recoveryError: 'failure' } }, 'recovery'],
    [{ ended: true }, 'ended'], [{ saying: true }, 'talking']]) {
    assert.equal(busyReason({ ...free(), ...state }, doc()), reason);
    const clock = timeChoices({ day: 3, period: 'morning', started: true, busy: reason }, ['morning', 'lunch']);
    assert.equal(clock.reason, ACTIVITY_REASON[reason]);
    assert.deepEqual(clock.targets, []);
  }
});
