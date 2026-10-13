import assert from 'node:assert/strict';
import historical from '../fixtures/removed-staff-seam.json' with { type: 'json' };
import { test } from 'node:test';
import { accessRecoveryReason, needsAccessRecovery } from '../../js/saves/access-recovery.js';
import { migrateDay2Save } from '../../js/saves/day2.js';
import { newFrame, readCheckpoint } from '../../js/narrative/checkpoint.js';
import forecourt from '../../story/forecourt.js';
import campus from '../../story/campus.js';
import { STORIES as day2 } from '../../story/day2/index.js';
import { STORIES as day3 } from '../../story/day3/index.js';
import { STORIES as day4 } from '../../story/day4/index.js';
import { STORIES as day5 } from '../../story/day5/index.js';
const stories = { 1: { forecourt, campus }, 2: day2, 3: day3, 4: day4, 5: day5 };
const old = (day, place, extra = {}) => ({
  v: 1, day, place, flags: { place, period: 'evening', d2_content_revision: 2, d2_ticket_done: true, paid: true },
  known: ['matte'], yen: 3240, met: ['mio'], inv: ['card'], tickets: { T0002: { paid: true } },
  runner: { onceDone: ['old-completed-trigger'] }, world: { old: true }, zones: { old: true },
  surface: { x: 1, z: 2, y: 0 }, ui: { hold: 'mio', goal: 'Old route', sideGoal: 'Keep this note' }, ...extra,
});
const continuing = Object.fromEntries(await Promise.all(['forecourt', 'campus', 'office_quarter', 'harbour', 'print_shop', 'ferry_terminal']
  .map(async place => [place, (await import(`../../story/ongoing/${place}.js`)).default])));
stories[6] = stories[17] = continuing;
for (const item of historical.cases) {
  const { day, place: from, to, node, event: trigger } = item;
  const steps = item.steps, frame = structuredClone(item.execution.frames[0]);
  frame.cursors = [{ path: [], index: 0, phase: 'step' }];
  assert.deepEqual(frame, { ...newFrame(node, steps, trigger), cursors: frame.cursors });
  const execution = { v: 3, place: from, frames: [frame] };
  assert.ok(readCheckpoint(execution, from, { nodes: { [node]: steps } }));
  assert.equal(readCheckpoint(execution, from, stories[day][from]), null);
  for (const [label, place, runner, transition] of [
    ['checkpoint', from, { execution }, null], ['queued', from, { queued: [frame] }, null],
    ['leaving', from, {}, { from, to, phase: 'leaving' }], ['arriving', to, {}, { from, to, phase: 'arriving' }],
    ['checkpoint after arrival', to, { execution }, null],
    ['checkpoint and transition', from, { execution }, { from, to, phase: 'leaving' }],
    ['queued with stale staff surface', from, { queued: [frame] }, null],
  ]) test(`day${day} historical ${from}→${to} ${label} recovers before runner validation`, () => {
    const saved = old(day, place, { runner: { ...runner, onceDone: ['old-completed-trigger'] }, transition,
      ...(label.includes('surface') ? { surface: { x: -5.3, z: -7.9, y: 0 } } : {}) });
    const original = structuredClone(saved), next = migrateDay2Save(saved);
    assert.equal(accessRecoveryReason(saved), 'route'); assert.equal(next.place, 'forecourt');
    assert.equal(next.flags.place, 'forecourt'); assert.equal(next.pendingStart, 'forecourt');
    for (const key of ['world', 'zones', 'surface', 'transition']) assert.equal(next[key], null);
    assert.equal(next.runner.execution, null); assert.deepEqual(next.runner.queued, []);
    assert.deepEqual(next.runner.onceDone, saved.runner.onceDone);
    for (const key of ['known', 'yen', 'met', 'inv', 'tickets']) assert.deepEqual(next[key], saved[key]);
    assert.deepEqual(next.flags, { ...saved.flags, place: 'forecourt' });
    assert.equal(next.ui.hold, null); assert.equal(next.ui.goal, ''); assert.equal(next.ui.sideGoal, saved.ui.sideGoal);
    assert.deepEqual(saved, original); assert.equal(needsAccessRecovery(next), false);
    assert.equal(migrateDay2Save(next), next);
  });
}
for (const day of [3, 4, 5, 6, 17]) for (const place of ['campus', 'office_quarter', 'harbour', 'print_shop', 'ferry_terminal']) {
  test(`day${day} valid ${place} saves stay exactly where they were`, () => {
    const story = stories[day][place], node = Object.keys(story.nodes).find(n => n !== story.start);
    const frame = newFrame(node, story.nodes[node]);
    const saved = old(day, place, { runner: { execution: { v: 3, place, frames: [frame] }, queued: [] } });
    assert.ok(readCheckpoint(saved.runner.execution, place, story));
    assert.equal(needsAccessRecovery(saved), false); assert.equal(migrateDay2Save(saved), saved);
  });
}
test('idle historical forecourt ground support cannot undo the place navigation repair', () => {
  for (const day of [1, 2, 3, 4, 5, 6]) {
    const saved = old(day, 'forecourt', { surface: { x: -5.3, z: -7.9, y: 0 }, world: { player: { eric: { position: [-5.3, 0, -7.9] } } } });
    const before = structuredClone(saved), next = migrateDay2Save(saved);
    assert.equal(accessRecoveryReason(saved), 'surface'); assert.equal(next.surface, null); assert.equal(next.zones, null);
    assert.equal(next.world, saved.world, 'normal place repair remains responsible for the position and props');
    assert.equal(next.runner, saved.runner); assert.equal(next.flags, saved.flags);
    assert.deepEqual(saved, before); assert.equal(migrateDay2Save(next), next);
  }
});
test('surface recovery preserves an unrelated queued current frame', () => {
  const frame = newFrame('d3_to_plaza', day3.forecourt.nodes.d3_to_plaza);
  const saved = old(3, 'forecourt', { surface: { x: -5.3, z: -7.9, y: 0 }, runner: { queued: [frame] } });
  assert.equal(migrateDay2Save(saved).runner, saved.runner);
});
test('legitimate supports, unrelated active runners, finished saves and days outside the seam migration are untouched', () => {
  for (const extra of [
    { surface: { x: -5.3, z: -6.4, y: 0 } }, { surface: { x: -5.3, z: -7.9, y: 0.34 } },
    { surface: { x: 4, z: 5, y: 0.34 } }, { surface: { x: -8, z: -7.9, y: 0 } },
    { surface: { x: -5.3, z: -7.9, y: 0 }, runner: { execution: { place: 'forecourt', frames: [newFrame('d3_to_plaza', day3.forecourt.nodes.d3_to_plaza)] } } },
    { ended: true, transition: { from: 'forecourt', to: 'campus' } },
    { day: 0, transition: { from: 'forecourt', to: 'campus' } },
    { runner: { queued: [newFrame('to_campus', [])] }, place: 'sports' },
  ]) {
    const saved = old(3, 'forecourt', extra);
    assert.equal(needsAccessRecovery(saved), false); assert.equal(migrateDay2Save(saved), saved);
  }
});

test('legacy day-one seam saves without a day field also recover', () => {
  const saved = old(1, 'forecourt', { runner: { queued: [newFrame('to_campus', [{ do: 'trip', to: 'campus' }], 'zone:campus_exit')] } });
  delete saved.day;
  assert.equal(migrateDay2Save(saved).place, 'forecourt');
  assert.deepEqual(migrateDay2Save(saved).runner.queued, []);
});

test('historically reachable ground beside the gate east post also stays on public ground after restoration', () => {
  // Actual old northSteps mesh supports and a clear physical walk were independently verified at these points.
  // They lie outside the old route grid, so checking only nav membership would miss real free-movement saves.
  for (const [x, z, y] of [[-3.6, -7.9, .01], [-3.55, -7.75, .01]]) {
    const saved = old(3, 'forecourt', { surface: { x, z, y }, world: { player: { eric: { position: [x, 0, z] } } } });
    const next = migrateDay2Save(saved);
    assert.equal(accessRecoveryReason(saved), 'surface');
    assert.equal(next.surface, null); assert.equal(next.zones, null);
    assert.equal(next.world, saved.world); assert.equal(next.runner, saved.runner);
    assert.equal(migrateDay2Save(next), next);
    const supportedBench = { ...saved, surface: { x, z, y: .34 } };
    assert.equal(migrateDay2Save(supportedBench), supportedBench);
  }
});
