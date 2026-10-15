import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';

register(new URL('../support/save-loader.mjs', import.meta.url));
globalThis.window = {};
const { Runner, flags } = await import('../../js/runner.js');
const { default: train } = await import('../../story/train.js');
const { trainArrival } = await import('../../js/train/arrival.js');

test('finishing the cat greeting releases the inherited lesson close-up', async () => {
  const cam = { close: { x: .2, z: -.9, zoom: 1.4 } };
  const game = { place: { name: 'train', people: {}, cam }, story: train,
    hooks: { cam: ({ back }) => { if (back) cam.close = null; }, emote() {}, goal() {} } };
  const runner = new Runner(game);
  runner.use(game.place, train);
  globalThis.__saveTestUI = { say: async () => {} };
  flags.cat_task = true;
  await runner.run('ohayo_cat');
  assert.equal(flags.cat_task, false);
  assert.equal(flags.cat_done, true);
  assert.equal(cam.close, null, 'Mio becomes reachable in the ordinary play camera');
});

test('one arrival wait spans physical braking and clears on stop', async () => {
  const st = { arrived: false }, arrival = trainArrival(st);
  let starts = 0, finished = false;
  const wait = arrival.begin(() => starts++);
  wait.then(() => { finished = true; });
  assert.equal(arrival.begin(() => starts++), wait, 'repeat callers share the same run-in');
  await Promise.resolve();
  assert.equal(finished, false);
  assert.equal(starts, 1);
  st.arrived = true;
  arrival.stopped();
  await wait;
  assert.equal(finished, true);
  assert.equal(arrival.begin(() => starts++), undefined, 'restored stopped train needs no new run-in');
  arrival.stopped();
  assert.equal(starts, 1);
});

test('leaving settles the pending hook without completing it or starting another run-in', async () => {
  const arrival = trainArrival({ arrived: false });
  let starts = 0;
  const wait = arrival.begin(() => starts++);
  arrival.leave();
  assert.deepEqual(await wait, { worldComplete: false });
  arrival.stopped();
  assert.deepEqual(arrival.begin(() => starts++), { worldComplete: false });
  assert.equal(starts, 1);
});

for (const cancel of [false, true]) test(`real approach Runner ${cancel ? 'leaves cleanly' : 'waits for queued arrival'}`, async () => {
  const st = { arrived: false }, arrival = trainArrival(st);
  const game = { place: { name: 'train', people: {} }, story: train, busy: true, queue: [], wait: async () => {},
    hooks: { goal() {}, walk() {}, stand() {}, arrive: () => arrival.begin(() => {}) } };
  const runner = game.runner = new Runner(game);
  runner.use(game.place, train);
  const snapshots = [];
  runner.onCheckpoint = () => snapshots.push(runner.snapshot());
  const running = runner.run('approach');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(runner.currentNode, 'approach', 'approach cannot release its beat while train is moving');
  if (cancel) arrival.leave();
  else {
    runner.trigger('event:arrived');
    assert.equal(game.queue.length, 1, 'arrival waits for the owning approach beat');
    assert.deepEqual(runner.snapshot().queued, [{ node: 'arrival', trigger: 'event:arrived' }]);
    st.arrived = true;
    arrival.stopped();
  }
  await running;
  assert.equal(runner.currentNode, '');
  const approach = snapshots.map(s => s.execution?.frames.find(f => f.node === 'approach')).filter(Boolean);
  assert.equal(approach.some(f => f.done.includes('[5]:hook')), !cancel,
    'only physical completion journals the arrival world hook');
  if (cancel) assert.deepEqual(game.queue, [], 'leaving emits no arrival scene');
});
