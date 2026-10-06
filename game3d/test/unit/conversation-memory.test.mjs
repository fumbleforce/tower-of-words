import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createConversationMemory } from '../../js/conversations/memory.js';
import { REMARKS } from '../../story/conversations/remarks.js';

const id = 'mori_return_norway';
const line = { who: 'mori', text: REMARKS[0].lines[0], source: { day: 2, period: 'evening', place: 'izakaya', node: 'd2_norway' } };
test('learning later unlocks a heard remark without changing its original interpretation', () => {
  const memory = createConversationMemory(REMARKS), known = new Set(['ohayo']);
  memory.hear({ ...line, known });
  assert.equal(memory.ready(id, known), false);
  known.add('ikitai');
  assert.equal(memory.ready(id, known), true);
  memory.revisit(id, known);
  assert.deepEqual(memory.entries()[0], { id, ...line, knownAtTime: ['ohayo'], understoodAtTime: false, revisited: true });
});
test('knowing a word before meeting its speaker still requires hearing the evidence', () => {
  const memory = createConversationMemory(REMARKS), known = new Set(['ikitai']);
  assert.equal(memory.ready(id, known), false);
  memory.hear({ ...line, who: 'kenji', known });
  memory.hear({ ...line, text: 'また行きましょう。', known });
  assert.equal(memory.has(id), false);
  memory.hear({ ...line, known });
  assert.equal(memory.ready(id, known), true);
  assert.equal(memory.entries()[0].understoodAtTime, true);
});
test('Continue retains the first source and loading another slot replaces its memories', () => {
  const memory = createConversationMemory(REMARKS), known = new Set();
  memory.hear({ ...line, known });
  const save = JSON.parse(JSON.stringify(memory.toJSON()));
  const restored = createConversationMemory(REMARKS);
  restored.load(save);
  restored.hear({ ...line, source: { day: 9, place: 'office' }, known: new Set(['ikitai']) });
  assert.deepEqual(restored.entries(), memory.entries());
  const copy = restored.entries();
  copy[0].source.place = 'changed';
  assert.equal(restored.entries()[0].source.place, 'izakaya');
  restored.load(null);
  assert.deepEqual(restored.entries(), []);
});
test('malformed and unknown saved remarks cannot create conversation evidence', () => {
  const memory = createConversationMemory(REMARKS);
  memory.load({ v: 1, records: [null, { id }, { id: 'invented', ...line, knownAtTime: [] }] });
  assert.deepEqual(memory.entries(), []);
  memory.revisit(id, new Set(['ikitai']));
  assert.equal(memory.has(id), false);
});

test('legacy history preserves unknown original comprehension after new words are learned', () => {
  const memory = createConversationMemory(REMARKS);
  memory.hear(line);
  assert.equal(memory.ready(id, new Set(['ikitai'])), true);
  const restored = createConversationMemory(REMARKS);
  restored.load(JSON.parse(JSON.stringify(memory.toJSON())));
  assert.equal(restored.entries()[0].knownAtTime, null);
  assert.equal(restored.entries()[0].understoodAtTime, null);
  assert.equal(restored.ready(id, new Set()), false);
});

test('remembered remarks retain only their original contextual glosses and voice', () => {
  const memory = createConversationMemory(REMARKS);
  const clear = [{ ja: '1994年', en: '1994' }];
  memory.hear({ ...line, clear, voiceKey: 'oh-example' });
  clear[0].en = 'changed';
  const saved = memory.toJSON();
  saved.records[0].clear.push(null, { ja: 42 });
  memory.load(saved);
  assert.deepEqual(memory.entries()[0].clear, [{ ja: '1994年', en: '1994' }]);
  assert.equal(memory.entries()[0].voiceKey, 'oh-example');
});
