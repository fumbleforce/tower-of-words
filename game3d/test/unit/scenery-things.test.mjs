// A thing is a target only when using it does something of its own (Jørgen, 2026-10-10, on the guard's monitor:
// "Stop making random things that have zero consequence or interesting actions/reactions attached to them
// interactive"). Loads the real gameplay/interactions.js with its browser-side imports stubbed, builds the markers
// of a small place and checks which things can be picked and which get a Say row.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

const stubs = {
  three: 'export class Vector3 { constructor() { this.x = 0; this.y = 0; this.z = 0; } }',
  './gifts.js': 'export const giveItem = () => false;',
  '../move.js': 'export const approachSpot = () => null;',
  '../mastery.js': 'export const needsPractice = () => false;',
  '../feel.js': 'export const learned = () => {};',
  '../ui.js': 'export const sfx = () => {}; export const voice = () => null; export const voiceThenBeat = () => {};',
  '../lang.js':
    "export const WORDS = {}; export const known = new Set(['ohayou', 'tomatte']); export const SAYABLE = ['ohayou', 'tomatte'];",
  '../story.js': "export const defaultReaction = () => 'nothing';",
  '../narrative/state.js': 'export const flags = {}; export const cond = () => true;',
  './register-reactions.js': 'export const registerReaction = () => null; export const registerDue = () => false;',
  '../sim.js':
    'export const sim = { met: new Set(), inv: [], people: {} }; export const ITEMS = {}; export const meet = () => {}; export const take = () => {}; export const peopleHTML = () => "";',
};
registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.endsWith('/js/gameplay/interactions.js') && specifier in stubs)
      return { url: 'data:text/javascript,' + encodeURIComponent(stubs[specifier]), shortCircuit: true };
    return next(specifier, context);
  },
});
globalThis.window ??= { addEventListener() {} };

// the story of the place: the poster has a talk line, the fan takes tomatte, the monitor and the plant have nothing
const ON = { 'talk:poster': 'poster', 'say:tomatte:fan': 'fan_stops' };
const NODES = { poster: ['> A line.'], fan_stops: ['> It stops.'] };

async function place() {
  const { installInteractions } = await import('../../js/gameplay/interactions.js');
  const list = [];
  const game = {
    ui: {},
    place: { name: 'test', people: {} },
    story: { nodes: NODES },
    runner: {
      has: (k) => k in ON,
      resolve: (k) => ON[k] || null,
      trigger: () => false,
    },
    markers: { clear: () => (list.length = 0), add: (m) => list.push(m) },
    walker: {},
    hooks: {},
    beat: (fn) => fn(),
  };
  const api = installInteractions(game);
  const thing = (label) => ({ label, kind: 'thing small', anchor: (v) => v });
  const things = { monitor: thing('Monitor'), plant: thing('Plant'), poster: thing('Poster'), fan: thing('Fan') };
  api.buildMarkers({ name: 'test', people: {}, things });
  const by = Object.fromEntries(list.map((m) => [m.id, m]));
  return { game, by };
}

test('a thing with nothing of its own is scenery, whatever words Eric knows', async () => {
  const { game, by } = await place();
  for (const id of ['monitor', 'plant']) {
    assert.equal(by[id].enabled(), false, `${id} can't be picked`);
    assert.equal(game.sayRow(by[id]), false, `${id} has no Say row`);
  }
});

test('a thing with its own talk line or its own word is still a target', async () => {
  const { game, by } = await place();
  assert.equal(by.poster.enabled(), true);
  assert.equal(by.fan.enabled(), true);
  assert.equal(by.fan.nearOnly(), true, 'a word-only thing shows its pin only close by');
  assert.equal(game.sayRow(by.fan), true);
  assert.equal(game.sayRow(by.poster), false, 'no generic Say row on a thing that takes no word');
});
