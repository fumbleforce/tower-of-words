// A fixed workload clock for before/after traces; normal fast tests keep real time.
import { setTimeout as delay } from 'node:timers/promises';

// Playwright 1.63.0 replays install/pause logs on navigation and retains the real
// millisecond between those commands in its tick counter. Its public clock API
// cannot reset that counter. This test-only adapter is deliberately pinned and
// fails closed if its paused, timer-free pre-navigation state ever changes.
export function resetTraceClockOrigin() {
  const controller = window.__pwClock?.controller;
  if (!controller || typeof controller.performanceNow !== 'function') throw new Error('Missing pinned trace clock');
  controller.performanceNow(); // Replay install/pause before checking the state.
  if (!Object.hasOwn(controller, '_realTime') || controller._realTime !== undefined || controller._timers?.size !== 0
    || !Number.isFinite(controller._now?.ticks)) throw new Error('Trace clock origin is not safe to reset');
  controller._now.ticks = 0;
}

export async function installTraceClock(page, { wallTimeoutMs = 230000, log = console.log } = {}) {
  if (!Number.isFinite(wallTimeoutMs) || wallTimeoutMs <= 0) throw new Error('Invalid clock wall-time budget');
  const epoch = new Date('2026-01-01T08:00:00Z');
  await page.clock.install({ time: epoch });
  await page.clock.pauseAt(epoch);
  await page.addInitScript(resetTraceClockOrigin);
  let task, cancellation, rejectCancellation;
  const interrupted = new Promise((_, reject) => { rejectCancellation = reject; });
  interrupted.catch(() => {});
  const cancel = error => { cancellation ||= error; rejectCancellation(cancellation); };
  const guard = action => Promise.race([interrupted, Promise.resolve().then(() => {
    if (cancellation) throw cancellation;
    return action();
  })]);
  const pump = async () => {
    const limit = setTimeout(() => cancel(new Error('Controlled trace clock exceeded its wall-time budget')), wallTimeoutMs);
    try {
      while (true) {
        const state = await guard(() => page.evaluate(() => ({ ready: !!window.__test,
          failure: document.querySelector('.err')?.textContent })));
        if (state.failure) throw new Error(state.failure);
        if (state.ready) break;
        await guard(() => delay(10));
      }
      // Warm the actual data imports before advancing timers. In particular,
      // travel loads transitions outside game.prepared and could otherwise let
      // an extra movement frame run while its module arrives over the network.
      await guard(() => page.evaluate(async () => {
        await Promise.all(['train', 'gate', 'forecourt', 'office', 'transitions'].map(name => window.__game.runner.load(name)));
      }));
      await guard(() => page.waitForLoadState('networkidle', { timeout: 30000 }));
      log('trace clock: initial assets and story modules ready');
      for (let ticks = 0; ticks < 15000; ticks++) {
        // Do not serialize the resolved places: they contain the full Three.js scene.
        await guard(() => page.evaluate(async () => { await Promise.all(Object.values(window.__game.prepared)); }));
        await guard(() => page.clock.runFor(16));
        if (ticks % 625 === 0) log('trace clock:', await guard(() => page.evaluate(() => ({
          ms: performance.now(), place: window.__game.place?.name,
          node: window.__game.runner.currentNode, recent: window.__test.log.slice(-2),
        }))));
        const done = await guard(() => page.evaluate(() => window.__test?.done && !window.__game.runner.frames.length
          && !window.__game.busy && !window.__game.queue.length));
        if (done) {
          await guard(() => page.clock.runFor(1000));
          return;
        }
      }
      throw new Error('Controlled trace clock exceeded 240 virtual seconds');
    } finally { clearTimeout(limit); }
  };
  const start = () => { task = pump(); task.catch(() => {}); };
  page.once('domcontentloaded', start);
  return {
    finish: async () => { if (!task) throw new Error('Clock never started'); await task; },
    stop: async () => {
      page.off('domcontentloaded', start);
      cancel(new Error('Controlled trace clock stopped'));
      // No new RPC starts after cancellation. An already-sent runFor may finish;
      // the browser owner closes pending page RPCs immediately after this returns.
      await task?.catch(() => {});
    },
  };
}
