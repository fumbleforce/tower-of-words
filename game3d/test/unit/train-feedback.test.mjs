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
  let current = true;
  const arrival = trainArrival({ arrived: false }, () => current);
  let starts = 0;
  const wait = arrival.begin(() => starts++);
  current = false;
  arrival.leave();
  assert.deepEqual(await wait, { worldComplete: false });
  arrival.stopped();
  assert.deepEqual(arrival.begin(() => starts++), { worldComplete: false });
  assert.equal(starts, 1);
});

test('the cached train can arrive after Continue leaves and re-enters the same place', async () => {
  let current = true;
  const st = { arrived: false }, arrival = trainArrival(st, () => current);
  const first = arrival.begin(() => {});
  current = false;
  arrival.leave();
  assert.deepEqual(await first, { worldComplete: false });
  // places/lifecycle.enter reuses the object in game.prepared, including on Continue.
  current = true;
  let started = false;
  const second = arrival.begin(() => { started = true; });
  assert.ok(started, 're-entering the cached train starts its saved approach');
  assert.ok(second instanceof Promise);
  st.arrived = true;
  arrival.stopped();
  assert.equal(await second, undefined);
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

test('Continue at the stop-event checkpoint runs the sumimasen lesson once', async () => {
  const make = (arrived = false) => {
    const st = { arrived }, arrival = trainArrival(st), snapshots = [];
    const noop = () => {};
    const game = { place: { name: 'train', people: {} }, story: train, busy: true, queue: [], wait: async () => {},
      hooks: { goal: noop, walk: noop, stand: noop, doorsOpen: noop, announce: noop, face: noop,
        type: noop, alight: noop, hide: noop, catTo: noop, arrive: () => arrival.begin(noop) },
      captureStaging: () => ({ arrived: st.arrived }), restoreStaging: s => { st.arrived = s.arrived; } };
    const runner = game.runner = new Runner(game);
    runner.use(game.place, train);
    runner.onCheckpoint = () => snapshots.push({ runner: runner.snapshot(), arrived: st.arrived });
    return { st, arrival, game, runner, snapshots };
  };
  const first = make();
  const running = first.runner.run('approach');
  await new Promise(resolve => setImmediate(resolve));
  first.st.arrived = true;
  first.runner.trigger('event:arrived');
  first.arrival.stopped();
  await running;
  // enqueue persists inside onStop, before the approach hook can finish.
  const checkpoint = first.snapshots.find(s => s.arrived && s.runner.queued?.length &&
    s.runner.execution?.frames.at(-1)?.node === 'approach');
  assert.ok(checkpoint, 'test the real enqueue checkpoint, not an invented fixture');
  const resumed = make(checkpoint.arrived), lines = [];
  globalThis.__saveTestUI = { say: async (_speaker, line) => lines.push(line) };
  resumed.runner.restore(checkpoint.runner);
  const replay = resumed.runner.resume();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(resumed.st.arrived, false, 'Continue rebuilds pre-approach physical staging');
  resumed.st.arrived = true;
  resumed.runner.trigger('event:arrived');
  resumed.arrival.stopped();
  await replay;
  while (resumed.game.queue.length) await resumed.game.queue.shift()();
  assert.equal(lines.filter(line => line.includes("Ah, she's in the way")).length, 1);
  assert.equal(resumed.runner.recoveryError, null);
});
