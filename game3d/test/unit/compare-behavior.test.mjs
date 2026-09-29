import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareTraces } from '../../../tools/check/compare-behavior.mjs';

const capture = () => ({
  result: { pass: true }, run: { done: true, ended: true }, version: 1, settings: { route: 'magic' }, manifest: 'manifest', build: 'build',
  browser: 'browser', renderer: 'gpu', harness: { observer: 'same' }, randomAlgorithm: 'mulberry32',
  sources: { 'game3d/js/main.js': 'before' },
  responses: { ...Object.fromEntries(['index.html', 'build.json', 'js/lang.js', 'js/runner.js', 'js/menu.js']
    .map(file => [`/game3d/${file}`, { status: 200, hash: 'same' }])),
    '/game3d/js/main.js': { status: 200, hash: 'before' }, '/game3d/vendor/three/three.module.js': { status: 200, hash: 'vendor' } },
  trace: { events: [{ kind: 'node', node: 'a' }, { kind: 'node', node: 'b' }],
    saves: [{ sequence: 2, json: '{"yen":1000,"known":["ohayo","matte"]}' }],
    final: { save: { ended: true, runner: { execution: null }, world: { people: { mio: { position: [1, 0, 2] } } } } } },
});

test('comparison allows source changes but retains vendor and harness fingerprints', () => {
  const a = capture(), b = capture();
  b.sources['game3d/js/main.js'] = 'formatted';
  b.responses['/game3d/js/main.js'].hash = 'formatted';
  let result = compareTraces(a, b);
  assert.equal(result.sourceDifferences.length, 1);
  assert.equal(result.inputDifferences.length, 0);
  assert.equal(result.behaviorDifferences.length, 0);
  b.responses['/game3d/vendor/three/three.module.js'].hash = 'changed';
  b.harness.observer = 'changed';
  result = compareTraces(a, b);
  assert.equal(result.inputDifferences.length, 2);
});

test('stale served code and missing route provenance cannot support a comparison', () => {
  const a = capture(), b = capture();
  b.responses['/game3d/js/main.js'].hash = 'stale';
  assert.throws(() => compareTraces(a, b), /Server served a different source/);
  b.responses['/game3d/js/main.js'].hash = 'before';
  delete b.responses['/game3d/js/runner.js'];
  assert.throws(() => compareTraces(a, b), /Missing critical fingerprint/);
  b.run.done = false;
  assert.throws(() => compareTraces(a, b), /Missing completed route evidence/);
});

test('comparison preserves event and known-word order, save timing, and physical state', () => {
  const a = capture(), b = capture();
  b.trace.events.reverse();
  b.trace.saves[0] = { sequence: 3, json: '{"yen":880,"known":["matte","ohayo"]}' };
  b.trace.final.save.world.people.mio.position[0] = 4;
  const paths = compareTraces(a, b).behaviorDifferences.map(difference => difference.path);
  for (const required of ['trace/events/0/node', 'trace/saves/0/sequence', 'trace/saves/0/json/yen',
    'trace/saves/0/json/known/0', 'trace/final/save/world/people/mio/position/0']) assert(paths.includes(required));
});

test('failed captures and missing input provenance cannot compare as a pass', () => {
  const a = capture(), b = capture();
  b.result.pass = false;
  assert.throws(() => compareTraces(a, b), /Both captures must pass/);
  b.result.pass = true;
  delete b.renderer;
  assert.throws(() => compareTraces(a, b), /Missing capture input/);
});

test('driver actions, practice counts and heard words are part of behavior evidence', () => {
  const a = capture(), b = capture();
  a.run = { ...a.run, practice: 12, heard: ['ohayo', 'matte'], log: ['talk:mio', 'say:matte'] };
  b.run = { ...b.run, practice: 11, heard: ['matte', 'ohayo'], log: ['say:matte', 'talk:mio'] };
  const paths = compareTraces(a, b).behaviorDifferences.map(difference => difference.path);
  for (const required of ['run/practice', 'run/heard/0', 'run/log/0']) assert(paths.includes(required));
});
