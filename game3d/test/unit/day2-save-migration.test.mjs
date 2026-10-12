import assert from 'node:assert/strict';
import { test } from 'node:test';
import { migrateDay2Save } from '../../js/saves/day2.js';

function oldSave(node, extra = {}) {
  return { day: 2, place: 'shotengai', flags: { d2_ate: true, d2_ticket_done: true },
    known: ['matte', 'tabetai'], yen: 3240, met: ['emi', 'mio'],
    inv: ['card'], tickets: { 'T-0002': { paid: true } },
    runner: { execution: { v: 3, place: 'shotengai', frames: [{ node, fingerprint: 'old' }] }, onceDone: ['one'] },
    world: { oldBench: true }, ui: { hold: 'mio', goal: 'Old bench' }, ...extra };
}
for (const node of ['d2_supper', 'd2_take_food', 'd2_drink_word', 'd2_mori_rest']) {
  test(`old ${node} moves to the restaurant with durable progress intact`, () => {
    const before = oldSave(node), snapshot = structuredClone(before);
    const after = migrateDay2Save(before);
    assert.equal(after.place, 'izakaya'); assert.equal(after.pendingStart, 'izakaya');
    assert.equal(after.flags.place, 'izakaya'); assert.equal(after.runner.execution, null);
    assert.equal(after.world, null); assert.equal(after.ui.hold, null);
    assert.ok(after.visited.includes('izakaya'));
    for (const key of ['known', 'yen', 'met', 'inv', 'tickets']) assert.deepEqual(after[key], before[key]);
    assert.deepEqual(after.runner.onceDone, ['one']); assert.deepEqual(before, snapshot);
    assert.equal(migrateDay2Save(after), after, 'migration is idempotent');
  });
}
test('finished party street walk stays on the street, while old active coda relocates', () => {
  const saved = oldSave('d2_mori_rest', { flags: { d2_party_done: true }, runner: {} });
  assert.equal(migrateDay2Save(saved).place, 'shotengai');
  assert.equal(migrateDay2Save(oldSave('d2_mori_rest', { flags: { d2_party_done: true } })).place, 'izakaya');
});
test('station dialogue restarts safely without undoing report or payments', () => {
  const saved = oldSave('d2_submit', { place: 'train' });
  const after = migrateDay2Save(saved);
  assert.equal(after.place, 'train'); assert.equal(after.pendingStart, 'train');
  assert.equal(after.flags.d2_ticket_done, true); assert.deepEqual(after.tickets, saved.tickets);
  assert.equal(after.runner.execution, null);
});
test('queued party scenes migrate, unrelated checkpoints and days stay intact', () => {
  const queued = oldSave(null, { flags: {}, runner: { queued: [{ node: 'd2_supper' }] } });
  assert.equal(migrateDay2Save(queued).place, 'izakaya');
  const unrelated = oldSave('find_bakery', { flags: {} });
  assert.equal(migrateDay2Save(unrelated).runner, unrelated.runner);
  for (const extra of [{ day: 1 }, { day: 3 }, { ended: true }]) {
    const saved = oldSave('d2_supper', extra); assert.equal(migrateDay2Save(saved), saved);
  }
});

const { TRIPS } = await import('../../story/day2/index.js');
for (const place of ['office_quarter', 'harbour', 'campus', 'print_shop', 'ferry_terminal']) {
  for (const revision of [undefined, 2]) test(`day-two save in ${place}, revision ${revision}, returns safely from the closed staff district`, () => {
    const saved = oldSave('sit', {
      place, flags: { day: 2, place, period: 'evening', d2_content_revision: revision, d2_ticket_done: true, d2_party_done: true },
      transition: { from: 'campus', to: 'forecourt' }, zones: { forecourt_exit: true }, surface: { x: 900, z: -900 },
      runner: { execution: { place, frames: [{ node: 'sit' }] }, queued: [{ node: 'to_forecourt' }], onceDone: ['one'] },
    });
    const before = structuredClone(saved), after = migrateDay2Save(saved);
    assert.equal(after.place, 'forecourt'); assert.equal(after.pendingStart, 'forecourt');
    assert.equal(after.flags.place, 'forecourt'); assert.equal(after.flags.period, 'evening');
    assert.equal(after.flags.d2_ticket_done, true); assert.equal(after.flags.d2_party_done, true);
    for (const key of ['world', 'zones', 'surface', 'transition']) assert.equal(after[key], null, key);
    assert.equal(after.runner.execution, null); assert.deepEqual(after.runner.queued, []);
    assert.deepEqual(after.runner.onceDone, ['one']); assert.equal(after.ui.hold, null); assert.equal(after.ui.goal, '');
    for (const key of ['known', 'yen', 'met', 'inv', 'tickets']) assert.deepEqual(after[key], saved[key], key);
    assert.deepEqual(saved, before, 'original slot is untouched'); assert.equal(migrateDay2Save(after), after);
    const reached = new Set(), visit = p => { if (reached.has(p)) return; reached.add(p); TRIPS[p].forEach(visit); };
    visit(after.place);
    for (const target of ['dorms', 'office', 'gate', 'train', 'izakaya', 'shotengai']) assert(reached.has(target), `Cannot reach ${target}`);
  });
}
test('closed-district recovery preserves finished saves, other days and current active saves exactly', () => {
  for (const extra of [{ place: 'campus', ended: true }, { day: 1, place: 'campus' }, { day: 3, place: 'campus' }, { place: 'forecourt', flags: { d2_content_revision: 2 } }]) {
    const saved = oldSave('sit', extra); assert.equal(migrateDay2Save(saved), saved);
  }
});
