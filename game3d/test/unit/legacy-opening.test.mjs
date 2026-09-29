import assert from 'node:assert/strict';
import { test } from 'node:test';
import { needsLegacyOpening } from '../../js/narrative/legacy-opening.js';
import train from '../../story/train.js';
import gate from '../../story/gate.js';
import office from '../../story/office.js';

test('old pre-opening saves recover each place opening despite flags from earlier places', () => {
  for (const [place, story, earlier] of [['train', train, {}], ['gate', gate, { held_doors: true }],
    ['office', office, { held_doors: true, gate_through: true, mio_warm: 2 }]]) {
    assert.equal(needsLegacyOpening({ place, flags: { ...earlier, place, period: 'morning' } }, story), true);
    assert.equal(needsLegacyOpening({ place, ui: { goal: '' }, flags: earlier }, story), true);
  }
});

test('authored progress and engine-only place progress prevent an opening restart', () => {
  for (const [place, story, key] of [['train', train, 'sat'], ['train', train, 'arrived'],
    ['gate', gate, 'greeted_guard'], ['gate', gate, 'cardOk'], ['office', office, 'greeted_mori'],
    ['office', office, 'chairHome'], ['office', office, 'machineOpen'], ['office', office, 'copier_done']]) {
    assert.equal(needsLegacyOpening({ place, flags: { [key]: true } }, story), false, key);
  }
});

test('current idle saves and explicit execution states never use legacy inference', () => {
  for (const extra of [{ pendingStart: null }, { pendingStart: 'office' }, { ui: { goal: 'Greet Mr. Mori.' } },
    { ended: true }, { transition: { from: 'gate', to: 'office' } }, { runner: { execution: {} } },
    { runner: { queued: [{ node: 'office_in' }] } }]) {
    assert.equal(needsLegacyOpening({ place: 'office', flags: {}, ...extra }, office), false);
  }
});

test('a nested increment alone establishes local legacy progress', () => {
  const story = { start: 'opening', nodes: { opening: [{ if: true, then: [{ inc: 'localCount' }] }] } };
  for (const count of [0, 1, 2])
    assert.equal(needsLegacyOpening({ place: 'office', flags: { localCount: count } }, story), count === 0);
});
