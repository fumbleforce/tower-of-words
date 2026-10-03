import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { test } from 'node:test';
import vm from 'node:vm';
import { installTraceClock, resetTraceClockOrigin } from '../support/trace-clock.mjs';

const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};

class Page extends EventEmitter {
  constructor(prepared = Promise.resolve({ scene: 'must not be returned' })) {
    super();
    this.loaded = [];
    this.advances = [];
    this.preparationRead = deferred();
    const page = this;
    this.context = { document: { querySelector: () => null }, performance: { now: () => 0 },
      window: { __test: { done: true, log: [] }, __game: {
        place: { name: 'train' }, busy: false, queue: [],
        runner: { frames: [], currentNode: '', load: async name => { page.loaded.push(name); return {}; } },
        get prepared() { page.preparationRead.resolve(); return { train: prepared }; },
      } } };
    this.clock = { install: async () => {}, pauseAt: async () => {},
      runFor: async ticks => {
        assert.deepEqual(page.loaded, ['train', 'gate', 'forecourt', 'office', 'transitions']);
        page.advances.push(ticks);
      } };
  }
  async evaluate(callback) {
    const result = await vm.runInNewContext(`(${callback})()`, this.context);
    assert(!Array.isArray(result), 'Readiness must not return prepared scene objects');
    return result;
  }
  async waitForLoadState() {}
  async addInitScript() {}
}

test('clock preloads transition data before advancing and does not serialize scenes', async () => {
  const page = new Page();
  const clock = await installTraceClock(page, { log: () => {} });
  page.emit('domcontentloaded');
  await clock.finish();
  assert.deepEqual(page.advances, [16, 1000]);
  await clock.stop();
});

test('stop cancels a stuck preparation wait without advancing another frame', { timeout: 1000 }, async () => {
  const prepared = deferred(), page = new Page(prepared.promise);
  const clock = await installTraceClock(page, { log: () => {} });
  page.emit('domcontentloaded');
  await page.preparationRead.promise;
  await clock.stop();
  await assert.rejects(clock.finish(), /clock stopped/);
  prepared.resolve({ scene: 'late completion' });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(page.advances, []);
});

test('wall deadline interrupts a stuck preparation promise', { timeout: 1000 }, async () => {
  const page = new Page(new Promise(() => {}));
  const clock = await installTraceClock(page, { wallTimeoutMs: 20, log: () => {} });
  page.emit('domcontentloaded');
  await assert.rejects(clock.finish(), /wall-time budget/);
  await clock.stop();
  assert.deepEqual(page.advances, []);
});

test('stopping before navigation removes the start listener', async () => {
  const page = new Page();
  const clock = await installTraceClock(page, { log: () => {} });
  await clock.stop();
  page.emit('domcontentloaded');
  await assert.rejects(clock.finish(), /never started/);
  assert.equal(page.listenerCount('domcontentloaded'), 0);
});

test('stop between scheduling and executing an RPC prevents it from starting', async () => {
  const page = new Page();
  let calls = 0;
  page.evaluate = async () => { calls++; return { ready: true }; };
  const clock = await installTraceClock(page, { log: () => {} });
  page.emit('domcontentloaded');
  await clock.stop();
  assert.equal(calls, 0);
  await assert.rejects(clock.finish(), /clock stopped/);
});

test('stop does not wait for an already-sent tick and never starts a subsequent tick', async () => {
  const page = new Page(), sent = deferred(), release = deferred();
  page.clock.runFor = async ticks => {
    sent.resolve();
    await release.promise;
    page.advances.push(ticks);
  };
  const clock = await installTraceClock(page, { log: () => {} });
  page.emit('domcontentloaded');
  await sent.promise;
  await clock.stop();
  assert.deepEqual(page.advances, []);
  release.resolve();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(page.advances, [16]);
  await assert.rejects(clock.finish(), /clock stopped/);
});

test('pinned clock origin reset rejects live timers and unpaused or unknown implementations', () => {
  const run = controller => vm.runInNewContext(`(${resetTraceClockOrigin})()`, { window: { __pwClock: { controller } } });
  const controller = { _realTime: undefined, _now: { ticks: 1 }, _timers: new Map(), performanceNow() { this.replayed = true; } };
  run(controller);
  assert.equal(controller.replayed, true);
  assert.equal(controller._now.ticks, 0);
  controller._timers.set(1, {});
  assert.throws(() => run(controller), /not safe to reset/);
  controller._timers.clear();
  controller._realTime = {};
  assert.throws(() => run(controller), /not safe to reset/);
  delete controller._realTime;
  assert.throws(() => run(controller), /not safe to reset/);
  assert.throws(() => run({}), /Missing pinned trace clock/);
});
