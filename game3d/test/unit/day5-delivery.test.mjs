import test from 'node:test';
import assert from 'node:assert/strict';
import { deliveryReturn } from '../../js/places/day5/delivery-state.js';
import { configureStory } from '../../minigames/kotodama/story-session.js';
import { KOTODAMA } from '../../story/day5/kotodama.js';
import { newRun, startShift, resolve } from '../../minigames/kotodama/sim.js';
import { SHIFTS } from '../../minigames/kotodama/data.js';

test('pre-delivery cancellation leaves reveal unseen and cannot award world resources', () => {
  const f = { wallet: 1234, period: 'evening', ticket_T0008: 'done', bond_kenji: 2 };
  const before = structuredClone(f);
  assert.equal(deliveryReturn(f, 'first', 'kotodama_cancel', ''), 'kotodama_cancel');
  assert.deepEqual(f, before);
  assert.equal(deliveryReturn(f, 'first', 'kotodama_exit', 'kenji'), null);
});

test('delivery persists independently of witness consent and cannot replay first can', () => {
  const f = { d5_reveal_agreed: true };
  assert.equal(deliveryReturn(f, 'first', 'kotodama_first', 'kenji'), 'kotodama_first');
  const saved = JSON.parse(JSON.stringify(f));
  assert.equal(saved.d5_delivery_seen, true);
  assert.equal(saved.d5_team_witnessed, undefined);
  assert.equal(saved.d5_reveal_done, undefined);
  assert.equal(deliveryReturn(saved, 'first', 'kotodama_first', 'kenji'), null);
  assert.equal(deliveryReturn(saved, 'rounds', 'kotodama_exit', 'mori'), null);
});

test('every actual last recipient, including no deliveries, returns without rewards', () => {
  for (const recipient of ['kenji', 'mori', 'mio', '', 'tama']) {
    const f = { d5_team_witnessed: true, wallet: 500, ticket_T0007: 'done', bond_mori: 2, period: 'evening' };
    const before = structuredClone(f);
    assert.equal(deliveryReturn(f, 'rounds', 'kotodama_exit', recipient), 'kotodama_exit');
    const { d5_last_recipient, ...rest } = f;
    assert.equal(d5_last_recipient, recipient === 'tama' ? '' : recipient);
    assert.deepEqual(rest, before);
  }
});

test('guided scene creates only one request and emits success only after delivery callback', () => {
  const shifts = structuredClone(SHIFTS), messages = [];
  globalThis.parent = { postMessage: message => messages.push(message) };
  globalThis.location = { origin: 'http://localhost' };
  try {
    const session = configureStory({ mode: 'first', contract: KOTODAMA, session: 'test', launchedMio: 'Carina, please put me down.' });
    const run = newRun(1);
    assert.deepEqual(startShift(run), [{ who: 'kenji', item: 'melon' }]);
    assert.deepEqual(SHIFTS[0].people, ['kenji', 'mori', 'mio']);
    assert.equal(session.guide.length, 5);
    const result = resolve(run, { machine: 'vend', what: ['melon'], to: ['kenji'] }, true);
    assert.deepEqual(result.after.arrived, []);
    assert.deepEqual(messages, []);
    assert.equal(session.delivered(result), true);
    assert.equal(messages[0].event, 'kotodama_first');
    assert.equal(messages[0].lastRecipient, 'kenji');
    session.leave();
    assert.equal(messages.length, 1);
  } finally {
    SHIFTS.splice(0, SHIFTS.length, ...shifts);
    delete globalThis.parent; delete globalThis.location;
  }
});

test('rounds report the actual last fulfilled request, preserving it after a wrong delivery', () => {
  const shifts = structuredClone(SHIFTS), messages = [];
  globalThis.parent = { postMessage: message => messages.push(message) };
  globalThis.location = { origin: 'http://localhost' };
  try {
    for (const who of ['kenji', 'mori', 'mio']) {
      SHIFTS.splice(0, SHIFTS.length, ...structuredClone(shifts));
      const session = configureStory({ mode: 'rounds', contract: KOTODAMA, session: who, launchedMio: 'Carina, please put me down.' });
      const run = newRun(1);
      run.shift = who === 'mori' ? 0 : -1;
      startShift(run);
      if (who === 'mio') session.delivered(resolve(run, { machine: 'vend', what: ['melon'], to: ['kenji'] }, true));
      const item = run.tickets[who]?.item;
      assert.ok(item, `${who} has an actual pending request`);
      const result = resolve(run, { machine: 'vend', what: [item], to: [who] }, true);
      assert.equal(session.delivered(result), false);
      session.delivered(resolve(run, { machine: 'vend', what: ['milk'], to: ['kenji'] }, true));
      session.leave();
      assert.equal(messages.at(-1).lastRecipient, who);
      assert.equal(messages.at(-1).event, 'kotodama_exit');
    }
  } finally {
    SHIFTS.splice(0, SHIFTS.length, ...shifts);
    delete globalThis.parent; delete globalThis.location;
  }
});
