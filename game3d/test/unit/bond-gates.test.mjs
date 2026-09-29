import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { Bonds } from '../../js/bonds/model.js';
import { storyBondGate } from '../../js/bonds/gates.js';
import { buildGraph } from '../../../bible/story-graph.js';
import { readGame } from '../../../tools/facts/check.mjs';

const cast = { mio: { gates: { 3: 'cast_trust', 4: 'cast_close' } } };
const stories = [
  { gates: { mio: { 3: 'train_trust' } } },
  { gates: { mio: { 5: 'gate_partner' } } },
  { gates: { mio: { 3: '' } } },
];

test('gate declarations match the model after successive per-step story overrides', () => {
  const model = new Bonds({ cast });
  const seen = [];
  for (const story of [{}, ...stories]) {
    seen.push(story);
    for (const [id, gates] of Object.entries(story.gates || {})) model.merge({ [id]: { gates } });
    for (const id of ['mio', 'mori']) for (const step of [3, 4, 5])
      assert.equal(storyBondGate(cast, seen, id, step), model.gate(id, step));
  }
  assert.equal(model.gate('mio', 3), 'bond3_mio');
  assert.equal(model.gate('mio', 4), 'cast_close');
  assert.equal(model.gate('mio', 5), 'gate_partner');
  assert.equal(cast.mio.gates[3], 'cast_trust');
  assert.equal(storyBondGate(cast, [{ gates: { mio: { 3: false } } }], 'mio', 3), 'bond3_mio');
});

test('importing facts data does not run the command or print a report', () => {
  const url = new URL('../../../tools/facts/check.mjs', import.meta.url).href;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(url)})`],
    { encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
});



test('transition gates use the departing story for walk/ride and destination for arrive', async () => {
  const mods = Object.fromEntries(['train', 'gate', 'office'].map(place => [place,
    { gates: { mio: { 3: `${place}_trust` } }, nodes: {} }]));
  const step = [{ if: 'ready', then: [{ do: 'bondStep', who: 'mio', to: 3 }] }];
  mods.transitions = Object.fromEntries(['train_to_gate', 'gate_to_office'].map(slot =>
    [slot, { walk: step, ride: step, arrive: step }]));
  const graph = buildGraph({ mods, cast });
  for (const [slot, expected] of Object.entries({
    train_to_gate: ['train_trust', 'train_trust', 'gate_trust'],
    gate_to_office: ['gate_trust', 'gate_trust', 'office_trust'],
  })) assert.deepEqual(graph.nodes.get(`transitions:${slot}`).sets.map(set => set.flag), expected);
  const facts = await readGame(async file => {
    if (file === 'js/bonds/cast.js') return { CAST: cast };
    if (file === 'js/lang.js') return { WORDS: {} };
    return { default: mods[/^story\/(\w+)\.js$/.exec(file)[1]] };
  });
  assert.deepEqual([...facts.flagsSet].sort(), ['gate_trust', 'office_trust', 'train_trust']);
});

test('story map and facts record the same custom and default gate writes as the game', async () => {
  const mods = Object.fromEntries(['train', 'gate', 'office'].map((place, i) => [place, {
    ...stories[i], start: 'unlock', nodes: { unlock: [3, 4, 5].map(to => ({ do: 'bondStep', who: 'mio', to })) },
  }]));
  mods.transitions = {};
  const graph = buildGraph({ mods, cast });
  const expected = {
    train: ['train_trust', 'cast_close', 'bond5_mio'],
    gate: ['train_trust', 'cast_close', 'gate_partner'],
    office: ['bond3_mio', 'cast_close', 'gate_partner'],
  };
  for (const [place, flags] of Object.entries(expected))
    assert.deepEqual(graph.nodes.get(`${place}:unlock`).sets.map(set => set.flag), flags);
  const facts = await readGame(async file => {
    if (file === 'js/bonds/cast.js') return { CAST: cast };
    if (file === 'js/lang.js') return { WORDS: {} };
    const name = /^story\/(\w+)\.js$/.exec(file)?.[1];
    assert.ok(name && mods[name], file);
    return { default: mods[name] };
  });
  assert.deepEqual([...facts.flagsSet].sort(), [...new Set(Object.values(expected).flat())].sort());
});
