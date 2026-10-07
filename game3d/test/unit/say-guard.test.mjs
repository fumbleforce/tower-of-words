// While Eric is saying a word (practice prompt, voice, answer), a click on a marker or thing must not start a new
// talk and lose the word. Loads the real gameplay/interactions.js with its browser-side imports stubbed.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

const stubs = {
  three: 'export class Vector3 { constructor() { this.x = 0; this.y = 0; this.z = 0; } }',
  './gifts.js': 'export const giveItem = () => false;',
  '../move.js': 'export const approachSpot = () => null;',
  '../mastery.js': 'export const needsPractice = (id) => globalThis.__ix.practice(id);',
  '../feel.js': 'export const learned = () => {};',
  '../ui.js': 'export const sfx = () => {}; export const voice = () => null; export const voiceThenBeat = () => globalThis.__ix.voiced();',
  '../lang.js': "export const WORDS = { ohayou: { voice: 'ohayou', ja: 'おはよう' } }; export const known = new Set(['ohayou']); export const SAYABLE = ['ohayou'];",
  '../story.js': "export const defaultReaction = () => 'nothing';",
  '../narrative/state.js': 'export const flags = {}; export const cond = () => true;',
  '../sim.js': 'export const sim = { met: new Set(), inv: [], people: { mio: {} } }; export const ITEMS = {}; export const meet = () => {}; export const take = () => {}; export const peopleHTML = () => "";',
};
registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.endsWith('/js/gameplay/interactions.js') && specifier in stubs)
      return { url: 'data:text/javascript,' + encodeURIComponent(stubs[specifier]), shortCircuit: true };
    return next(specifier, context);
  },
});
globalThis.window ??= { addEventListener() {} };

const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};

async function fixture({ practice = true, voiced = () => Promise.resolve() } = {}) {
  const calls = [];
  const prompt = deferred();
  globalThis.__ix = { practice: () => practice, voiced };
  const { installInteractions } = await import('../../js/gameplay/interactions.js');
  const ui = {
    typePrompt: () => (calls.push('prompt'), prompt.promise),
    closeTalk: () => {},
    say: async () => {},
    refreshPeople: () => {},
  };
  const game = {
    ui,
    busy: false,
    saying: false,
    hold: null,
    place: { people: { mio: {} } },
    player: { seated: false, root: { position: { x: 0, z: 0 } } },
    walker: { faceTo() {}, stop() {}, goTo() {} },
    runner: { has: (k) => k === 'say:ohayou:cat' || k.startsWith('talk:'), trigger: (k) => (calls.push(k), true) },
    found: new Set(),
    markers: { clear() {}, add() {} },
    mioSays: () => {},
    beat: (fn) => fn(),
    hooks: {},
  };
  const api = installInteractions(game);
  const cat = { id: 'cat', label: 'Cat', kind: 'thing', anchor: (v) => v };
  const mio = { id: 'mio', label: 'Mio', kind: 'person', anchor: (v) => v };
  return { game, api, calls, prompt, cat, mio };
}

test('a click during the practice prompt is ignored and the word still lands', async () => {
  const { game, api, calls, prompt, cat, mio } = await fixture();
  const saying = game.sayWord('ohayou', cat);
  assert.equal(game.saying, true);
  api.use(mio);
  api.use(cat);
  assert.deepEqual(calls, ['prompt'], 'no talk starts while the prompt is up');
  prompt.resolve(true);
  await saying;
  assert.deepEqual(calls, ['prompt', 'say:ohayou:cat']);
  assert.equal(game.saying, false);
  api.use(mio);
  assert.deepEqual(calls.at(-1), 'talk:mio', 'clicks work again once the word is done');
});

test('a click while Eric is voicing the word is ignored', async () => {
  const voiced = deferred();
  const { game, api, calls, cat, mio } = await fixture({ practice: false, voiced: () => voiced.promise });
  const saying = game.sayWord('ohayou', cat);
  api.use(mio);
  assert.deepEqual(calls, []);
  voiced.resolve();
  await saying;
  assert.deepEqual(calls, ['say:ohayou:cat']);
});

test('arriving at a target after a Say started does not talk', async () => {
  const { game, api, calls, prompt, cat, mio } = await fixture();
  let arrive;
  game.walker.goTo = (_x, _z, fn) => (arrive = fn);
  mio.spot = () => [5, 5];
  api.use(mio);
  const saying = game.sayWord('ohayou', cat);
  arrive();
  assert.deepEqual(calls, ['prompt']);
  prompt.resolve(false);
  await saying;
  assert.equal(game.saying, false);
});

test('saying never sticks: a failed word clears it and clicks work again', async () => {
  const { game, api, calls, cat, mio } = await fixture({
    practice: false,
    voiced: () => Promise.reject(new Error('audio failed')),
  });
  await assert.rejects(game.sayWord('ohayou', cat), /audio failed/);
  assert.equal(game.saying, false);
  api.use(mio);
  assert.deepEqual(calls, ['talk:mio']);
});
