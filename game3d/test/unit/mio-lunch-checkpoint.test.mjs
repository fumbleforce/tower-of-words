import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';

register(new URL('../support/save-loader.mjs', import.meta.url));
const storage = new Map(), writes = [];
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem(key, value) {
  storage.set(key, value); writes.push(JSON.parse(value));
} };
globalThis.window = {};
globalThis.fetch = async () => ({ ok: false });
const { Runner, flags } = await import('../../js/runner.js');
const S = await import('../../js/sim.js');
const { installProgressionHooks } = await import('../../js/narrative/hooks/progression.js');
const { mioLunchState, completeMioLunch } = await import('../../js/places/mio-lunch/state.js');

function fixture(step, saved = null, { finish = true } = {}) {
  for (const key of Object.keys(flags)) delete flags[key];
  const effect = { do: 'mioLunchComplete', step, text: `Mio milestone ${step} test memory.` };
  const story = { people: { mio: { name: 'Mio' } }, nodes: { lunch: [effect, 'STOP'] } };
  const game = { hooks: {}, ui: {}, place: { name: 'office', people: {} }, story, found: new Set(),
    sim: S.sim, queue: [], wait: async () => {}, beat: fn => fn() };
  game.runner = new Runner(game);
  S.restore(game, saved || { v: 1, day: 5, period: 'lunch', met: ['mio'], bonds: { mio: step === 3 ? 14 : 6 },
    flags: { senderHeldRecord: 25 }, rel: {} });
  game.runner.use(game.place, story);
  installProgressionHooks(game, {});
  S.installSim(game);
  S.absorb(story);
  const context = () => ({ day: S.sim.day, period: S.sim.period, place: game.place.name, flags });
  const state = mioLunchState(saved?.world?.lunch || null);
  let placement = saved?.world?.placement || 'machine-room';
  if (!saved) {
    state.offer(context());
    for (const phase of step === 2 ? ['accepted', 'seated', 'ate']
      : ['accepted', 'held', 'away', 'inspected', 'marked', 'returned']) state.advance(phase);
    if (finish) state.advance('settled');
  }
  const periods = [];
  game.place.onPeriod = p => periods.push(p);
  game.place.day5Period = () => { placement = 'afternoon-desks'; };
  game.place.snapshotState = () => ({ lunch: state.snapshot(), placement });
  game.captureStaging = () => ({ place: 'office', flags: { ...flags }, world: game.place.snapshotState() });
  game.restoreStaging = snap => { state.restore(snap.world.lunch); placement = snap.world.placement; };
  game.hooks.mioLunchComplete = args => completeMioLunch(state, context(), args, {
    ...game.hooks, release: () => { placement = 'standing'; },
  });
  return { game, state, periods, effect, context, placement: () => placement };
}

async function stopAfterCompletion(step) {
  let reached;
  const stop = new Promise(resolve => { reached = resolve; });
  globalThis.__saveTestUI = { say: () => { reached(); return new Promise(() => {}); } };
  const f = fixture(step);
  writes.length = 0;
  void f.game.runner.run('lunch');
  await stop;
  return { ...f, saved: S.loadSave(), recorded: structuredClone(writes) };
}

for (const step of [2, 3]) test(`actual Runner saves Mio step ${step}, memory, gate and period together`, async () => {
  const { saved, recorded, periods } = await stopAfterCompletion(step);
  assert.deepEqual(periods, ['afternoon']);
  assert.equal(saved.period, 'afternoon');
  assert.equal(saved.flags[`ms${step}_mio`], true);
  assert.equal(!!saved.flags.bond3_mio, step === 3);
  assert.equal(saved.flags[`rem_mio_milestone${step}`], true);
  assert.equal(saved.bonds.mio, step === 3 ? 14 : 6);
  assert.equal(saved.flags.senderHeldRecord, 25);
  assert.equal(saved.world.lunch, null);
  assert.equal(saved.world.placement, 'afternoon-desks');
  for (const save of recorded.filter(save => !save.flags[`ms${step}_mio`])) {
    assert.equal(save.period, 'lunch');
    assert.equal(save.flags.bond3_mio, undefined);
    assert.equal(save.flags[`rem_mio_milestone${step}`], undefined);
  }
  const completed = recorded.filter(save => save.flags[`ms${step}_mio`]);
  assert.ok(completed.length);
  for (const save of completed) {
    assert.equal(save.period, 'afternoon');
    assert.equal(!!save.flags.bond3_mio, step === 3);
    assert.equal(save.flags[`rem_mio_milestone${step}`], true);
    assert.ok(save.runner.execution.frames[0].done.includes('[0]:hook'));
    assert.equal(save.runner.execution.frames[0].worldAfter['[0]:hook'].world.placement, 'afternoon-desks');
  }
  globalThis.__saveTestUI = { say: () => {} };
  const resumed = fixture(step, saved);
  resumed.game.hooks.mioLunchComplete = () => { throw new Error('Completed effect ran twice'); };
  assert.equal(await resumed.game.runner.resume(), true);
  assert.equal(resumed.placement(), 'afternoon-desks');
  assert.deepEqual(resumed.periods, []);
  assert.equal(S.sim.period, 'afternoon');
  assert.equal(S.bonds.person('mio').rem.filter(memory => memory.key === `milestone${step}`).length, 1);
});

test('rejected physical completion leaves live flags, gate, memory and storage untouched', async () => {
  const f = fixture(3, null, { finish: false });
  S.save(f.game);
  const beforeFlags = structuredClone(flags), beforeBonds = structuredClone(S.bonds.person('mio'));
  const beforeStorage = globalThis.localStorage.getItem('amakawa-day1-save');
  assert.throws(() => f.game.hooks.mioLunchComplete(f.effect), /physically finished/);
  assert.deepEqual(flags, beforeFlags);
  assert.deepEqual(S.bonds.person('mio'), beforeBonds);
  assert.equal(globalThis.localStorage.getItem('amakawa-day1-save'), beforeStorage);
  assert.deepEqual(f.periods, []);
  await assert.rejects(f.game.runner.run('lunch'), /physically finished/);
  assert.equal(S.loadSave().flags.ms3_mio, undefined);
  assert.equal(S.loadSave().period, 'lunch');
});

test('duplicate completion outside the scene never consumes another period or memory', async () => {
  const { saved } = await stopAfterCompletion(3);
  const f = fixture(3, saved);
  const before = structuredClone(S.bonds.person('mio'));
  assert.equal(f.game.hooks.mioLunchComplete(f.effect), false);
  assert.deepEqual(S.bonds.person('mio'), before);
  assert.deepEqual(f.periods, []);
  assert.equal(S.sim.period, 'afternoon');
});
