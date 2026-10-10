// The reading path through a branching scene (web/paths.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readingPath, flatten, pathSummary, choiceTargets, decide, choiceKey } from '../web/paths.js';

const start = [
  '> On the bench.',
  { choice: [{ text: 'Look', go: 'look' }, { text: 'Leave', go: 'leave' }] },
  '> Never reached after a go.',
];
const parts = { look: { steps: ['> You sit down.', { choice: [{ text: 'Stay', set: 'stay' }, { text: 'Go', set: 'go_home' }] }, { if: 'stay', then: ['mio: Good.'], else: ['mio: Night.'] }, '> The end.'] }, leave: { steps: ['> You walk on.'] } };
const docs = n => parts[n] || null;
const text = items => flatten(items).map(i => (typeof i.step === 'string' ? i.step : i.step.choice ? 'CHOICE' : JSON.stringify(i.step)));

test('a choice continues with the picked part; switching swaps it', () => {
  const picks = new Map();
  let tree = readingPath(start, { docs, picks });
  assert.deepEqual(text(tree), ['> On the bench.', 'CHOICE', '> You sit down.', 'CHOICE', 'mio: Good.', '> The end.']);
  const section = tree.find(i => i.type === 'section');
  assert.equal(section.option, 'Look');
  assert.deepEqual(section.items[0].path, ['@look', 0]);
  assert.equal(tree.at(-1).type, 'skipped', 'beats after a go are skipped on this path');
  picks.set(choiceKey(start[1]), 1);
  tree = readingPath(start, { docs, picks });
  assert.deepEqual(text(tree), ['> On the bench.', 'CHOICE', '> You walk on.']);
  assert.deepEqual(pathSummary(tree).map(p => p.label), ['Leave']);
});

test('a pick that remembers a flag decides the branch after it', () => {
  const picks = new Map([[choiceKey(parts.look.steps[1]), 1]]);
  const tree = readingPath(start, { docs, picks });
  assert.deepEqual(text(tree).slice(-2), ['mio: Night.', '> The end.']);
  const branch = tree.find(i => i.type === 'section').items.find(i => i.type === 'branch');
  assert.equal(branch.locked, true);
  assert.equal(branch.reason, 'Go');
  assert.deepEqual(branch.items[0].path, ['@look', 2, 'else', 0]);
});

test('who plays defaults to Eric and switches every branch on it', () => {
  const steps = [{ if: 'mc_carina', then: ['> Carina.'], else: ['> Eric.'] }, { if: '!mc_carina', then: ['> Not Carina.'] }];
  assert.deepEqual(text(readingPath(steps)), ['> Eric.', '> Not Carina.']);
  assert.deepEqual(text(readingPath(steps, { arms: new Map([['mc_carina', 'then']]) })), ['> Carina.', '> Not Carina.']);
});

test('a guard that only stops the scene shows the scene going on', () => {
  const steps = [{ if: '!ready', then: [{ end: true }] }, '> Goes on.'];
  assert.deepEqual(text(readingPath(steps)), ['> Goes on.']);
});

test('targets, conditions', () => {
  assert.deepEqual(choiceTargets([...start, { if: 'x', then: [{ choice: [{ text: 'a', call: 'aside' }] }] }]), ['look', 'leave', 'aside']);
  assert.equal(decide('a && !b', new Map([['a', true], ['b', false]])), true);
  assert.equal(decide('a || c', new Map([['a', false]])), undefined);
  assert.equal(decide("day >= 2", new Map([['day', 3]])), true);
});

test('a part already on the path is not shown twice', () => {
  const loop = { back: { steps: [{ choice: [{ text: 'Again', go: 'start' }] }] } };
  const tree = readingPath([{ choice: [{ text: 'On', go: 'back' }] }], { docs: n => loop[n] || null, home: 'start' });
  const inner = tree.find(i => i.type === 'section').items;
  assert.equal(inner.find(i => i.type === 'elsewhere').node, 'start');
});
