import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import { test } from 'node:test';

// Task #426: a registered story module that will not load stops the trip before anything is left, cleared or saved.
register(new URL('../support/save-loader.mjs', import.meta.url));
const storage = new Map();
globalThis.localStorage = { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)) };
globalThis.sessionStorage = globalThis.localStorage;
globalThis.location = { search: '', hostname: 'localhost', href: 'http://localhost/' };
globalThis.window = { addEventListener() {}, dispatchEvent() {} };
globalThis.fetch = async () => ({ ok: false });
const noop = () => {};
globalThis.document = {
  body: { dataset: {}, classList: { contains: () => false, add: noop, remove: noop, toggle: noop } },
};
const { Runner } = await import('../../js/runner.js');
const { StoryMissingError } = await import('../../js/story-load.js');
const { dayOf, storyRegistered } = await import('../../js/days.js');
const S = await import('../../js/sim.js');
const { storyLoads } = await import('../../js/places/story-guard.js');

// the entry boundary as travel() uses it: prepare is Runner.load plus the build, here just the load
function boundary(runner) {
  const toasts = [];
  const old = { name: 'dorms' };
  const game = {
    place: old,
    goal: 'Go to work',
    found: new Set(),
    transition: { from: 'dorms', to: 'forecourt', phase: 'leaving' },
    ui: { toast: (t) => toasts.push(t) },
  };
  const attempt = async () => {
    if (!(await storyLoads(game, 'forecourt', (n) => runner.load(n)))) return false;
    // what travel() does next: record the trip and save, then leave the old place
    game.transition = { phase: 'leaving' };
    S.save(game);
    game.place = { name: 'forecourt' };
    game.goal = '';
    return true;
  };
  return { game, old, toasts, attempt };
}

test('a registered module that fails to import: no save, same place and goal, the error surfaces', async () => {
  S.sim.day = 2;
  const files = dayOf(2).files;
  files.push('forecourt_missing');
  try {
    assert.equal(storyRegistered('forecourt_missing', 2), true);
    const runner = new Runner({ sim: S.sim });
    await assert.rejects(runner.load('forecourt_missing'), StoryMissingError);
    const load = runner.load.bind(runner);
    runner.load = (n) => load(n === 'forecourt' ? 'forecourt_missing' : n);
    const { game, old, toasts, attempt } = boundary(runner);
    const quiet = console.error;
    console.error = noop;
    try {
      assert.equal(await attempt(), false);
    } finally {
      console.error = quiet;
    }
    assert.equal(storage.size, 0, 'nothing saved');
    assert.equal(game.place, old);
    assert.equal(game.goal, 'Go to work');
    assert.equal(game.transition, null);
    assert.match(toasts.at(-1), /couldn't load/);
  } finally {
    files.pop();
  }
});

test('a place with no story module still enters, with an empty story', async () => {
  S.sim.day = 2;
  assert.equal(storyRegistered('not_a_place', 2), false);
  const runner = new Runner({ sim: S.sim });
  const story = await runner.load('not_a_place');
  assert.deepEqual(story.nodes, {});
  const { game, attempt } = boundary(runner);
  const load = runner.load.bind(runner);
  runner.load = (n) => load(n === 'forecourt' ? 'not_a_place' : n);
  assert.equal(await attempt(), true);
  assert.equal(game.place.name, 'forecourt');
});

test('enter and travel check the story before leaving the old place', () => {
  const source = readFileSync(new URL('../../js/places/lifecycle.js', import.meta.url), 'utf8');
  const enter = source.slice(source.indexOf('async function enter('), source.indexOf('async function travel('));
  assert(enter.indexOf('await prepare(name)') < enter.indexOf('place.leave()'));
  assert(enter.indexOf('runner.load(name)') < enter.indexOf('place.leave()'));
  const travel = source.slice(source.indexOf('async function travel('));
  assert(travel.indexOf('storyLoads(') < travel.indexOf('save(game)'));
});
