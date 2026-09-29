import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';

register(new URL('../support/save-loader.mjs', import.meta.url));
const storage = new Map();
globalThis.localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) };
globalThis.window = {};
globalThis.fetch = async () => ({ ok: false });
const { Runner, flags } = await import('../../js/runner.js');
const S = await import('../../js/sim.js');
const { known, seen } = await import('../../js/lang.js');

function gameFor(story, saved) {
  for (const key of Object.keys(flags)) delete flags[key];
  known.clear(); seen.clear();
  const game = { hooks: {}, place: { name: 'office', people: {} }, story, found: new Set(),
    sim: S.sim, queue: [], wait: async () => {}, beat(fn) { this.running = fn(); return this.running; } };
  game.runner = new Runner(game);
  S.restore(game, saved || { v: 1, day: 1, period: 'lunch', flags: {}, rel: {} });
  game.runner.use(game.place, story);
  S.installSim(game);
  S.absorb({ people: { mio: { name: 'Mio' } }, moments: {}, ...story });
  game.hooks.buy = ({ item }) => { S.buy(game, item); flags.purchaseFinished = true; };
  game.hooks.period = ({ to }) => S.setPeriod(to, game);
  return game;
}

async function capture(story, { node = 'parent', trigger, choose = () => 0, setup = () => {} } = {}) {
  let reached;
  const atStop = new Promise(resolve => { reached = resolve; });
  globalThis.__saveTestUI = { choose, say: (_who, line) => {
    if (line === 'STOP') { reached(); return new Promise(() => {}); }
  } };
  const game = gameFor(story);
  setup(game);
  const running = trigger ? (game.runner.trigger(trigger), game.running) : game.runner.run(node);
  await Promise.race([atStop, running.then(() => { throw new Error('Scene completed before STOP'); })]);
  S.save(game);
  return { game, saved: S.loadSave() };
}

async function replay(story, saved, setup = () => {}) {
  const lines = [];
  globalThis.__saveTestUI = { say: (_who, line) => lines.push(line), choose: () => {
    throw new Error('Completed choice asked again');
  } };
  const game = gameFor(story, saved);
  setup(game);
  assert.equal(await game.runner.resume(), true);
  assert.equal(S.loadSave().runner.execution, null);
  return { game, lines };
}

test('restart the unfinished leaf dialogue without repeating increments', async () => {
  const story = { nodes: { parent: ['A', { inc: 'count' }, 'STOP', 'C'] } };
  const { saved } = await capture(story);
  assert.equal(saved.flags.count, 1);
  const { lines } = await replay(story, saved);
  assert.deepEqual(lines, ['A', 'STOP', 'C']);
  assert.equal(flags.count, 1);
});

test('resume called scene and then caller tail, omitting earlier parent dialogue', async () => {
  const story = { nodes: { parent: ['P', { call: 'child' }, { inc: 'tail' }], child: ['C', 'STOP'] } };
  const { saved } = await capture(story);
  assert.deepEqual(saved.runner.execution.frames.map(f => f.node), ['parent', 'child']);
  const { lines } = await replay(story, saved);
  assert.deepEqual(lines, ['C', 'STOP']);
  assert.equal(flags.tail, 1);
});

test('go replaces the called frame while preserving its caller', async () => {
  const story = { nodes: { parent: [{ call: 'child' }, { inc: 'tail' }],
    child: ['old', { go: 'leaf' }], leaf: ['leaf', 'STOP'] } };
  const { saved } = await capture(story);
  assert.deepEqual(saved.runner.execution.frames.map(f => f.node), ['parent', 'leaf']);
  const { lines } = await replay(story, saved);
  assert.deepEqual(lines, ['leaf', 'STOP']);
  assert.equal(flags.tail, 1);
});

test('nested branch callers continue their saved path after the condition changes', async () => {
  const story = { nodes: { parent: [{ set: 'route' }, { if: 'route',
    then: ['old', { call: 'child' }, { inc: 'inner' }], else: [{ inc: 'wrong' }] }, { inc: 'outer' }],
    child: [{ unset: 'route' }, 'STOP'] } };
  const { saved } = await capture(story);
  assert.equal(saved.flags.route, false);
  const { lines } = await replay(story, saved);
  assert.deepEqual(lines, ['STOP']);
  assert.equal(flags.inner, 1); assert.equal(flags.outer, 1); assert.equal(flags.wrong, undefined);
  assert.equal(flags.route, false);
});

test('choice keeps its original index even when its mutation hides that option', async () => {
  const story = { nodes: { parent: [{ choice: [
    { text: 'hidden', if: false }, { text: 'other' },
    { text: 'selected', if: '!picked', set: 'picked', call: 'child' },
  ] }, { inc: 'tail' }], child: ['STOP'] } };
  const { saved } = await capture(story, { choose: () => 1 });
  assert.equal(saved.runner.execution.frames[0].choices['[0]'], 2);
  await replay(story, saved);
  assert.equal(flags.picked, true); assert.equal(flags.tail, 1);
});

test('completed child scene is omitted when its parent restarts', async () => {
  const story = { nodes: { parent: ['P', { call: 'child' }, 'STOP'], child: ['C', { inc: 'award' }] } };
  const { saved } = await capture(story);
  const { lines } = await replay(story, saved);
  assert.deepEqual(lines, ['P', 'STOP']);
  assert.equal(flags.award, 1);
});

test('purchase and bond autosaves include their completed operation before replay', async () => {
  const story = { nodes: { parent: [{ do: 'buy', item: 'coffee' },
    { do: 'bond', who: 'mio', add: 2, key: 'checkpoint-award' }, 'STOP'] } };
  const writes = [], originalSet = localStorage.setItem;
  localStorage.setItem = (key, value) => { writes.push(JSON.parse(value)); originalSet(key, value); };
  let saved;
  try { ({ saved } = await capture(story)); } finally { localStorage.setItem = originalSet; }
  const bought = writes.filter(d => d.inv.includes('coffee'));
  assert.ok(bought.length);
  for (const data of bought) {
    assert.ok(data.runner.execution.frames[0].done.includes('[0]:hook'));
    assert.equal(data.flags.purchaseFinished, true);
  }
  for (const data of writes.filter(d => d.rel.bonds.p.mio?.pts === 2)) {
    assert.ok(data.runner.execution.frames[0].done.includes('[1]:hook'));
  }
  await replay(story, saved);
  assert.equal(S.sim.yen, saved.yen);
  assert.deepEqual(S.sim.inv, ['coffee']);
  assert.deepEqual(S.bonds.toJSON(), saved.rel.bonds);
});

test('node entry autosave names the child, and completion saves once and talk state', async () => {
  const story = { on: { 'talk:mio': { node: 'parent', once: true } },
    moments: { child: { bond: [['mio', 'scene', 1, 'entry']] } },
    nodes: { parent: [{ call: 'child' }], child: ['STOP'] } };
  const { saved } = await capture(story, { trigger: 'talk:mio' });
  assert.equal(saved.runner.execution.frames.at(-1).node, 'child');
  assert.equal(saved.rel.bonds.p.mio.pts, 1);
  const { game } = await replay(story, saved);
  assert.equal(flags.talked_mio, true);
  assert.equal(game.runner.has('talk:mio'), false);
  assert.deepEqual(S.loadSave().runner.onceDone, ['talk:mio>parent']);
});

test('legacy or invalid execution data resumes idle without running arbitrary nodes', async () => {
  const game = gameFor({ nodes: { valid: ['hello'] } });
  for (const execution of [undefined, { v: 2 }, { v: 1, place: 'gate', frames: [] },
    { v: 1, place: 'office', frames: [{ node: 'missing' }] }]) {
    game.runner.restore({ execution });
    assert.equal(await game.runner.resume(), false);
    assert.equal(game.runner.frames.length, 0);
  }
});

test('an event queued during dialogue survives its once trigger being consumed', async () => {
  const story = { on: { 'event:arrived': { node: 'arrival', once: true } },
    nodes: { parent: ['STOP'], arrival: [{ inc: 'arrivalCount' }] } };
  const { game } = await capture(story);
  game.busy = true;
  assert.equal(game.runner.trigger('event:arrived'), true);
  assert.equal(game.runner.has('event:arrived'), false);
  const saved = S.loadSave();
  assert.deepEqual(saved.runner.queued, [{ node: 'arrival', trigger: 'event:arrived' }]);
  const { game: resumed } = await replay(story, saved);
  assert.equal(resumed.queue.length, 1);
  await resumed.queue.shift()();
  assert.equal(flags.arrivalCount, 1);
  assert.equal(S.loadSave().runner.queued, undefined);
  assert.equal(resumed.runner.has('event:arrived'), false);
});

test('busy events retain their selected conditions and FIFO order across saving', async () => {
  const story = { on: {
    'event:first': [{ node: 'selected', if: 'eligible', once: true }, { node: 'wrong' }],
    'event:second': { node: 'second', once: true },
  }, nodes: { parent: ['STOP'], selected: ['FIRST'], second: ['SECOND'], wrong: ['WRONG'] } };
  const { game } = await capture(story);
  game.busy = true;
  flags.eligible = true;
  assert.equal(game.runner.trigger('event:first'), true);
  assert.equal(game.runner.trigger('event:second'), true);
  assert.deepEqual([...game.runner.onceDone], ['event:first>selected', 'event:second>second']);
  flags.eligible = false;
  S.save(game);
  const saved = S.loadSave();
  assert.deepEqual(saved.runner.queued, [
    { node: 'selected', trigger: 'event:first' }, { node: 'second', trigger: 'event:second' },
  ]);
  const { game: resumed, lines } = await replay(story, saved);
  while (resumed.queue.length) await resumed.queue.shift()();
  assert.deepEqual(lines, ['STOP', 'FIRST', 'SECOND']);
  assert.equal(flags.eligible, false);
  assert.equal(S.loadSave().runner.queued, undefined);
});

test('without a staging snapshot, a completed physical action is not repeated', async () => {
  const story = { nodes: { parent: [{ do: 'depart' }, 'STOP'] } };
  let reached;
  globalThis.__saveTestUI = { say: () => { reached?.(); return new Promise(() => {}); } };
  const stop = new Promise(resolve => { reached = resolve; });
  let departures = 0;
  const game = gameFor(story);
  game.hooks.depart = async () => { departures++; };
  void game.runner.run('parent');
  await stop;
  S.save(game);
  const saved = S.loadSave();
  const resumed = gameFor(story, saved);
  resumed.hooks.depart = async () => { departures++; };
  globalThis.__saveTestUI = { say: () => {} };
  await resumed.runner.resume();
  assert.equal(departures, 1);
});

test('resume starts walks after staging restore, or directly when no staging was saved', async () => {
  const story = { nodes: { parent: ['STOP'] } };
  for (const staged of [false, true]) {
    const { saved } = await capture(story, { setup: game => {
      if (staged) game.captureStaging = () => ({ place: 'office', world: { at: 'entry' } });
    } });
    const events = [];
    const game = gameFor(story, saved);
    game.resumeWalks = () => events.push('walks');
    game.restoreStaging = () => { events.push('restore'); game.resumeWalks(); };
    globalThis.__saveTestUI = { say: () => events.push('line') };
    assert.equal(await game.runner.resume(), true);
    assert.deepEqual(events, staged ? ['restore', 'walks', 'line'] : ['walks', 'line']);
  }
});

test('continuing a parent restores only the unfinished child staging', async () => {
  const story = { nodes: { parent: ['P', { do: 'depart' }, { call: 'child' }, 'TAIL'], child: ['STOP'] } };
  const { saved } = await capture(story, { setup: game => {
    const world = stagingWorld(game, { departed: false });
    game.hooks.depart = () => { world.departed = true; };
  } });
  assert.deepEqual(saved.runner.execution.frames.map(frame => frame.staging.world.departed), [false, true]);
  const restored = [];
  const { lines } = await replay(story, saved, game => {
    game.restoreStaging = state => restored.push(state.world.departed);
    game.hooks.depart = () => { throw new Error('Continuing parent replayed departure'); };
  });
  assert.deepEqual(restored, [true]);
  assert.deepEqual(lines, ['STOP', 'TAIL']);
});

// Exercise the real Runner against a serializable place boundary. Browser checks
// separately verify that the Three.js rooms implement this boundary faithfully.
function stagingWorld(game, initial, observations = []) {
  const world = structuredClone(initial);
  game.captureStaging = () => ({ place: game.place.name, world: structuredClone(world) });
  game.restoreStaging = saved => {
    for (const key of Object.keys(world)) delete world[key];
    Object.assign(world, structuredClone(saved.world));
  };
  const say = globalThis.__saveTestUI.say;
  globalThis.__saveTestUI.say = (who, line) => {
    observations.push({ line, world: structuredClone(world) });
    return say(who, line);
  };
  return world;
}

test('leaf replay restores the train before dialogue and repeats departure without repeating purchases', async () => {
  const story = { nodes: { parent: ['Sleeping passenger', { do: 'buy', item: 'coffee' },
    { inc: 'count' }, { do: 'depart' }, 'STOP'] } };
  let departures = 0;
  const setup = initial => game => {
    const world = stagingWorld(game, initial);
    game.hooks.depart = async () => { world.departed = true; world.passenger = 'platform'; departures++; };
  };
  const entry = { departed: false, passenger: 'train' };
  const { saved } = await capture(story, { setup: setup(entry) });
  assert.deepEqual(saved.runner.execution.frames[0].staging.world, entry);
  const observations = [];
  const { lines } = await replay(story, saved, game => {
    const world = stagingWorld(game, { departed: true, passenger: 'platform' }, observations);
    game.hooks.depart = async () => { world.departed = true; world.passenger = 'platform'; departures++; };
  });
  assert.deepEqual(lines, ['Sleeping passenger', 'STOP']);
  assert.deepEqual(observations[0].world, entry);
  assert.deepEqual(observations[1].world, { departed: true, passenger: 'platform' });
  assert.equal(departures, 2);
  assert.equal(flags.count, 1);
  assert.equal(S.sim.yen, saved.yen);
  assert.deepEqual(S.sim.inv, ['coffee']);
});

test('replayed parent restores completed child staging without repeating child dialogue or rewards', async () => {
  const story = { nodes: { parent: ['Before child', { call: 'child' }, 'After child', 'STOP'],
    child: ['Child dialogue', { do: 'depart' }, { inc: 'reward' }] } };
  const { saved } = await capture(story, { setup(game) {
    const world = stagingWorld(game, { departed: false });
    game.hooks.depart = async () => { world.departed = true; };
  } });
  const observations = [];
  const { lines } = await replay(story, saved, game => {
    stagingWorld(game, { departed: true }, observations);
    game.hooks.depart = () => { throw new Error('Completed child ran again'); };
  });
  assert.deepEqual(lines, ['Before child', 'After child', 'STOP']);
  assert.deepEqual(observations.map(o => o.world.departed), [false, true, true]);
  assert.equal(flags.reward, 1);
});

test('completed period change restores scheduled movement without rerunning durable period effects', async () => {
  const story = { nodes: { parent: ['Before period', { do: 'period', to: 'afternoon' }, 'STOP'] } };
  const destination = { who: 'mori', to: [2, -3], sit: true };
  const { saved } = await capture(story, { setup(game) {
    const world = stagingWorld(game, { walk: null });
    const changePeriod = game.hooks.period;
    game.hooks.period = step => { changePeriod(step); world.walk = destination; };
  } });
  const observations = [];
  await replay(story, saved, game => {
    stagingWorld(game, { walk: null }, observations);
    game.hooks.period = () => { throw new Error('Period changed twice'); };
  });
  assert.deepEqual(observations.map(o => o.world.walk), [null, destination]);
  assert.equal(S.sim.period, 'afternoon');
});

test('a second reload retains the original scene entry rather than its last replay state', async () => {
  const story = { nodes: { parent: ['Before departure', { do: 'depart' }, 'STOP'] } };
  const { saved } = await capture(story, { setup(game) {
    const world = stagingWorld(game, { departed: false });
    game.hooks.depart = async () => { world.departed = true; };
  } });
  let reached;
  const stop = new Promise(resolve => { reached = resolve; });
  globalThis.__saveTestUI = { say: (_who, line) => {
    if (line === 'STOP') { reached(); return new Promise(() => {}); }
  } };
  const resumed = gameFor(story, saved);
  const world = stagingWorld(resumed, { departed: true });
  resumed.hooks.depart = async () => { world.departed = true; };
  void resumed.runner.resume();
  await stop;
  S.save(resumed);
  const again = S.loadSave();
  assert.deepEqual(again.runner.execution.frames[0].staging, saved.runner.execution.frames[0].staging);
  const observations = [];
  await replay(story, again, game => {
    const replayWorld = stagingWorld(game, { departed: true }, observations);
    game.hooks.depart = async () => { replayWorld.departed = true; };
  });
  assert.deepEqual(observations.map(o => o.world.departed), [false, true]);
});

test('reject stale choice indices and invalid caller cursors before replaying any step', async () => {
  const story = { nodes: { parent: [{ choice: [{ text: 'call', call: 'child' }] }], child: ['STOP'] } };
  const { saved } = await capture(story);
  for (const mutate of [
    f => { f.choices['[0]'] = 9; },
    f => { f.cursors[0].phase = 'call'; },
    f => { f.cursors[0].path = [0, 'then']; },
    f => { f.branches['[0]'] = true; },
    f => { delete f.staging; },
    f => { f.staging = []; },
    f => { f.staging = false; },
    f => { delete f.worldAfter; },
    f => { f.worldAfter = null; },
    f => { f.worldAfter = []; },
  ]) {
    const changed = structuredClone(saved);
    mutate(changed.runner.execution.frames[0]);
    const game = gameFor(story, changed);
    globalThis.__saveTestUI = { say: () => { throw new Error('Invalid checkpoint ran dialogue'); } };
    assert.equal(await game.runner.resume(), false);
    assert.equal(game.runner.frames.length, 0);
    assert.deepEqual(game.runner.snapshot().execution, changed.runner.execution);
  }
});

test('story edits cannot reuse positional journals or overwrite the original save', async () => {
  const story = { nodes: { parent: [{ call: 'child' }, { inc: 'tail' }],
    child: [{ do: 'buy', item: 'coffee' }, { inc: 'count' }, 'STOP'] } };
  const { saved } = await capture(story);
  const original = localStorage.getItem('amakawa-day1-save');
  const variants = [
    { ...story, nodes: { ...story.nodes, child: ['inserted', ...story.nodes.child] } },
    { ...story, nodes: { ...story.nodes, child: ['shortened'] } },
    { ...story, nodes: { parent: story.nodes.parent, renamed: story.nodes.child } },
    { nodes: {} },
  ];
  for (const changed of variants) {
    const game = gameFor(changed, saved);
    assert.equal(await game.runner.resume(), false);
    assert.match(game.runner.recoveryError, /changed/);
    assert.deepEqual(game.runner.snapshot().execution, saved.runner.execution);
    assert.equal(S.sim.yen, saved.yen);
    assert.equal(flags.count, 1);
    flags.unrelated = true;
    S.save(game);
    assert.equal(localStorage.getItem('amakawa-day1-save'), original);
  }
  await replay(story, S.loadSave());
  assert.equal(flags.count, 1);
  assert.equal(flags.tail, 1);
  assert.equal(S.sim.yen, saved.yen);
  assert.deepEqual(S.sim.inv, ['coffee']);
});

test('checkpoint version, place, depth and suspended caller are validated before any effect', async () => {
  const story = { nodes: { parent: [{ call: 'child' }], child: ['STOP'] } };
  const { saved } = await capture(story);
  for (const mutate of [
    e => { e.v = 1; },
    e => { e.place = 'gate'; },
    e => { e.frames = Array.from({ length: 33 }, () => structuredClone(e.frames[0])); },
    e => { e.frames[0].cursors[0].phase = 'step'; },
    e => { delete e.frames[1].fingerprint; },
  ]) {
    const changed = structuredClone(saved);
    mutate(changed.runner.execution);
    const game = gameFor(story, changed);
    assert.equal(await game.runner.resume(), false);
    assert.deepEqual(game.runner.snapshot().execution, changed.runner.execution);
  }
});

test('a failed nested scene retains its cursor stack without leaving dead live frames', async () => {
  const story = { on: { 'talk:mio': { node: 'parent', once: true } }, nodes: {
    parent: [{ if: true, then: [{ call: 'child' }] }, { inc: 'tail' }],
    child: [{ go: 'failed' }], failed: [{ do: 'explode' }], later: ['STOP'],
  } };
  const game = gameFor(story);
  game.hooks.explode = () => { throw new Error('broken place hook'); };
  game.runner.trigger('talk:mio');
  await assert.rejects(game.running, /broken place hook/);
  assert.deepEqual(game.runner.frames, []);
  assert.equal(game.runner.currentNode, '');
  assert.equal(flags.talked_mio, undefined);
  assert.equal(flags.tail, undefined);
  const failed = game.runner.snapshot().execution;
  assert.deepEqual(failed.frames.map(f => f.node), ['parent', 'failed']);
  assert.equal(failed.frames[0].cursors.at(-1).phase, 'call');
  assert.equal(failed.frames[1].cursors[0].index, 0);
  assert.ok(!failed.frames[0].done.includes('[0,"then",0]:call'));
  const original = localStorage.getItem('amakawa-day1-save');
  let reached;
  const stop = new Promise(resolve => { reached = resolve; });
  globalThis.__saveTestUI = { say: () => { reached(); return new Promise(() => {}); } };
  void game.runner.run('later'); // bypass the game beat guard to verify frame cleanup independently
  await stop;
  assert.deepEqual(game.runner.frames.map(f => f.node), ['later']);
  assert.deepEqual(game.runner.snapshot().execution, failed);
  S.save(game);
  assert.equal(localStorage.getItem('amakawa-day1-save'), original);
});

test('a throwing durable effect cannot save a half-applied purchase', async () => {
  const story = { nodes: { parent: [{ do: 'buy', item: 'coffee' }] } };
  const game = gameFor(story);
  let before;
  game.hooks.buy = ({ item }) => {
    before = localStorage.getItem('amakawa-day1-save');
    S.buy(game, item);
    throw new Error('purchase hook failed');
  };
  await assert.rejects(game.runner.run('parent'), /purchase hook failed/);
  assert.equal(localStorage.getItem('amakawa-day1-save'), before);
  assert.deepEqual(game.runner.frames, []);
  assert.ok(game.runner.recoveryError);
  assert.deepEqual(S.loadSave().inv, []);
});

test('an entry callback failure also removes its frame and preserves the previous save', async () => {
  const game = gameFor({ nodes: { parent: ['never'] } });
  S.save(game);
  const original = localStorage.getItem('amakawa-day1-save');
  game.runner.onNodeStart = () => { throw new Error('entry failed'); };
  await assert.rejects(game.runner.run('parent'), /entry failed/);
  assert.deepEqual(game.runner.frames, []);
  assert.equal(localStorage.getItem('amakawa-day1-save'), original);
});

test('a completed typing prompt never asks again and saves its award atomically', async () => {
  const story = { nodes: { parent: [{ do: 'type', word: 'ohayo' }, 'STOP'] } };
  let prompts = 0;
  const { saved } = await capture(story, { setup(game) {
    game.hooks.type = async (_step, complete) => {
      prompts++;
      complete(() => { flags.typed_ohayo = true; known.add('ohayo'); S.save(game); });
    };
  } });
  assert.equal(prompts, 1);
  assert.equal(saved.flags.typed_ohayo, true);
  assert.ok(saved.runner.execution.frames[0].done.includes('[0]:hook'));
  await replay(story, saved, game => {
    game.hooks.type = () => { throw new Error('Typed prompt asked twice'); };
  });
  assert.equal(known.has('ohayo'), true);
});

test('a completed word offer does not ask the player to pick it again', async () => {
  const story = { nodes: { parent: [{ offer: 'ohayo', line: 'mio: A greeting.', from: 'mio' }, 'STOP'] } };
  let offers = 0;
  const { saved } = await capture(story, { choose: () => { offers++; return 0; } });
  assert.equal(offers, 1);
  assert.equal(saved.taught.ohayo, 'mio');
  await replay(story, saved); // replay's UI chooser throws if called
  assert.equal(known.has('ohayo'), true);
});

test('restarting an unset followed by set preserves the saved final flag value', async () => {
  const story = { nodes: { parent: [{ unset: 'ready' }, { set: 'ready' }, 'STOP'] } };
  const { saved } = await capture(story);
  await replay(story, saved);
  assert.equal(flags.ready, true);
});
