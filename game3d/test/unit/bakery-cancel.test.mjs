import assert from 'node:assert/strict';
import { register } from 'node:module';
import test from 'node:test';
register(new URL('../support/save-loader.mjs', import.meta.url));
globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.window = {};
globalThis.fetch = async () => ({ ok: false });
const { Runner, flags } = await import('../../js/runner.js');
const { bakeryAction } = await import('../../js/places/bakery/action.js');
const { diningActions } = await import('../../js/places/izakaya/actions.js');
const { bakeryTrade } = await import('../../js/places/bakery/trade.js');
const story = (await import('../../story/bakery.js')).default;
test('actual Runner stops the selected order after place cancellation, before checkout, payment or dialogue', async () => {
  for (const key of Object.keys(flags)) delete flags[key];
  const lines = [], actions = diningActions(), sim = { yen: 1000, inv: [] }, place = { name: 'bakery', people: {}, hooks: {} };
  const game = { place, sim, hooks: {}, queue: [], wait: async () => {}, found: new Set() };
  const trade = bakeryTrade(sim, flags); let release, reached;
  const held = new Promise(resolve => { reached = resolve; });
  globalThis.__saveTestUI = { say: (_, line) => lines.push(line), choose: () => { throw Error('Cancelled order reached choice'); } };
  place.hooks.bakeryShop = bakeryAction(game, place, args => actions.run(async job => {
    assert.equal(args.state, 'select'); trade.select(args.item); reached();
    await job.wait(new Promise(resolve => { release = resolve; }));
    return true;
  }));
  const runner = game.runner = new Runner(game); runner.use(place, story);
  const running = runner.run('curry'); await held;
  game.place = { name: 'shotengai' }; trade.cancel(); actions.cancel();
  await running; release(); await Promise.resolve();
  assert.deepEqual(sim, { yen: 1000, inv: [] }); assert.deepEqual(lines, []);
  assert.equal(flags.bakery_action_complete, false); assert.equal(flags.bakery_phase, 'cancelled');
  assert.deepEqual(runner.frames, []); assert.equal(runner.recoveryError, undefined);
});
test('a completed physical action continues to the authored price and cancellation choice', async () => {
  for (const key of Object.keys(flags)) delete flags[key];
  const lines = [], sim = { yen: 1000, inv: [] }, place = { name: 'bakery', people: {}, hooks: {} };
  const game = { place, sim, hooks: {}, queue: [], wait: async () => {}, found: new Set() };
  const trade = bakeryTrade(sim, flags);
  globalThis.__saveTestUI = { say: (_, line) => lines.push(line), choose: (_who, _line, choices) => choices.length - 1 };
  place.hooks.bakeryShop = bakeryAction(game, place, async args => {
    if (args.state === 'select') trade.select(args.item);
    if (args.state === 'cancel') trade.cancel();
    return true;
  });
  const runner = game.runner = new Runner(game); runner.use(place, story);
  await runner.run('curry');
  assert.equal(lines.length, 1); assert.equal(flags.bakery_phase, 'cancelled');
  assert.deepEqual(sim, { yen: 1000, inv: [] });
});
