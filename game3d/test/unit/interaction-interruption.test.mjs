import assert from 'node:assert/strict';
import { register } from 'node:module';
import test from 'node:test';
register(new URL('../support/interactions-loader.mjs', import.meta.url));
globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.location = { search: '' };
globalThis.window = { addEventListener() {} };
globalThis.fetch = async () => ({ ok: false });
const { installInteractions } = await import('../../js/gameplay/interactions.js');
const { Runner, flags } = await import('../../js/runner.js');
const { known } = await import('../../js/lang.js');
const train = (await import('../../story/train.js')).default;

function setup(story = train) {
  for (const key of Object.keys(flags)) delete flags[key];
  known.clear();
  const visited = [], place = { name: 'train', people: {}, things: {} };
  const game = {
    place, story, queue: [], found: new Set(),
    ui: { closeActs() {}, refreshPeople() {} },
    player: { root: { position: { x: 0, z: 0 } }, seated: false },
    walker: {
      path: null, arrive: null,
      goTo(x, z, arrive) { this.path = [x, z]; this.arrive = arrive || null; },
      stop() { this.path = this.arrive = null; },
      faceTo() {},
    },
    hooks: new Proxy({}, { get: () => async () => {} }),
    async wait() {},
    async beat(fn) {
      if (this.busy) return;
      this.busy = true;
      this.walker.stop();
      try { await fn(); } finally { this.busy = false; }
      if (this.queue.length) this.nextBeat = this.beat(this.queue.shift());
    },
    onNode(node, phase) { if (phase === 'start') visited.push(node); },
    markers: { list: [] },
  };
  game.runner = new Runner(game); game.runner.use(place, story);
  const interactions = installInteractions(game);
  const target = (id = 'mio') => {
    const item = { id, label: id, spot: () => [2, 2], enabled: () => true };
    game.markers.list.push(item); return item;
  };
  return { game, interactions, target, visited };
}
const simple = {
  on: { 'talk:mio': 'hello', 'talk:other': 'other' },
  nodes: { hello: [{ set: 'said_hello' }], other: [{ set: 'said_other' }], unrelated: [{ set: 'interrupted' }] },
};
function arrive(game) {
  const callback = game.walker.arrive;
  game.walker.stop();
  assert.equal(typeof callback, 'function');
  callback();
}

test('a walk to Mio crossing free_seat finishes the introduction and waits for another Talk', async () => {
  const { game, target, visited } = setup();
  const choices = ['Let her catch the lunchbox', 'Just nod'];
  globalThis.__saveTestUI = { choose: (_who, _text, options) => {
    const text = choices.shift();
    assert.ok(text, 'the old Talk must not start a lesson choice');
    const index = options.findIndex(o => o.html.includes(text)); assert.ok(index >= 0); return index;
  } };
  const mio = target(); game.use(mio);
  await game.beat(() => game.runner.run(game.runner.resolve('zone:free_seat'), { trigger: 'zone:free_seat' }));
  assert.deepEqual(visited, ['seat', 'mio_catches', 'sit', 'leave_it', 'chat1_end']);
  assert.equal(flags.chat1, true); assert.equal(flags.lesson_on, undefined);
  assert.equal(game.walker.arrive, null); assert.deepEqual(choices, []);
  game.use(mio); assert.ok(game.walker.arrive, 'a deliberate second Talk remains available');
});

test('an unrelated scene resumes the pending walk once and keeps its original trigger', async () => {
  const { game, target, visited } = setup(simple);
  game.use(target(), { trigger: 'talk:other' });
  await game.beat(() => game.runner.run('unrelated'));
  assert.ok(game.walker.arrive); arrive(game);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(visited, ['unrelated', 'other']);
  assert.equal(flags.said_other, true); assert.equal(flags.said_hello, undefined);
});

test('an interruption fulfilling an unconditional request does not repeat it', async () => {
  const { game, target, visited } = setup(simple);
  game.use(target());
  await game.beat(() => game.runner.run('hello'));
  assert.equal(game.walker.arrive, null);
  assert.deepEqual(visited, ['hello']);
});

// Talk to Mio is 'hello' until a flag moves it on: a zone scene on the way sets that flag
const moving = {
  on: { 'talk:mio': [{ node: 'moved', if: 'aisle_seen' }, 'hello'], 'zone:aisle': 'aisle' },
  nodes: { hello: [{ set: 'said_hello' }], aisle: [{ set: 'aisle_seen' }], moved: [{ set: 'said_moved' }] },
};

test('an unrelated zone scene that moves Talk on still lets the walk carry on to Mio', async () => {
  const { game, target, visited } = setup(moving);
  game.use(target());
  await game.beat(() => game.runner.run(game.runner.resolve('zone:aisle'), { trigger: 'zone:aisle' }));
  assert.equal(game.runner.resolve('talk:mio', { peek: true }), 'moved');
  assert.ok(game.walker.arrive, 'the walk to Mio carries on');
  arrive(game);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(visited, ['aisle', 'moved']);
  assert.equal(flags.said_moved, true); assert.equal(flags.said_hello, undefined);
});

test('a request whose own scene already ran is dropped, even when that scene moves Talk on', async () => {
  const afterHello = {
    on: { 'talk:mio': [{ node: 'moved', if: 'said_hello' }, 'hello'] },
    nodes: { hello: [{ set: 'said_hello' }], moved: [{ set: 'said_moved' }] },
  };
  const { game, target, visited } = setup(afterHello);
  game.use(target());
  await game.beat(() => game.runner.run('hello'));
  assert.equal(game.walker.arrive, null);
  assert.deepEqual(visited, ['hello']);
  game.use(target()); assert.ok(game.walker.arrive, 'a deliberate second Talk remains available');
  arrive(game);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(visited, ['hello', 'moved']);
});

for (const change of ['place', 'story', 'removed target', 'disabled target', 'new walk', 'new use']) {
  test(`a ${change} during interruption cancels the old request`, async () => {
    const story = structuredClone(simple), { game, target, visited } = setup(story), mio = target();
    game.use(mio);
    await game.beat(async () => {
      await game.runner.run('unrelated');
      if (change === 'place') game.place = { ...game.place };
      if (change === 'story') game.story = { ...game.story };
      if (change === 'removed target') game.markers.list = [];
      if (change === 'disabled target') mio.enabled = () => false;
      if (change === 'new walk') game.walker.goTo(3, 3);
      if (change === 'new use') { game.busy = false; game.use(target('other')); }
    });
    if (change === 'new use') { arrive(game); await new Promise(resolve => setImmediate(resolve)); }
    else assert.equal(game.walker.arrive, null);
    assert.equal(flags.said_hello, undefined);
    assert.deepEqual(visited, change === 'new use' ? ['unrelated', 'other'] : ['unrelated']);
  });
}


test('queued unrelated scenes finish before one resumed use, preserving existing node observers', async () => {
  const { game, target, visited } = setup(simple);
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  game.use(target());
  game.queue.push(async () => { await pending; await game.runner.run('unrelated'); });
  await game.beat(() => game.runner.run('unrelated'));
  assert.equal(game.busy, true); assert.equal(game.walker.arrive, null);
  release(); await game.nextBeat;
  assert.ok(game.walker.arrive); arrive(game);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(visited, ['unrelated', 'unrelated', 'hello']);
});

test('a queued scene that changes place cannot revive an old request even with the same marker object', async () => {
  const { game, target, visited } = setup(simple);
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  game.use(target());
  game.queue.push(async () => { await pending; await game.runner.run('unrelated'); });
  await game.beat(async () => { await game.runner.run('unrelated'); game.place = { ...game.place }; });
  release(); await game.nextBeat;
  assert.equal(game.walker.arrive, null); assert.deepEqual(visited, ['unrelated', 'unrelated']);
});
