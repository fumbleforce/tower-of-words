import assert from 'node:assert/strict';
import { test } from 'node:test';
import { topicFor, withConversations } from '../../js/conversations/index.js';
import { createConversationMemory } from '../../js/conversations/memory.js';
import { REMARKS } from '../../story/conversations/remarks.js';
import { manifestOf, voiceLines } from '../../tools/voice-manifest.mjs';

const known = new Set(['ikitai']);
test('a learned word opens a follow-up only after meeting and hearing the speaker', () => {
  const memory = createConversationMemory(REMARKS);
  assert.equal(topicFor('mori', memory, known, false), null);
  assert.equal(topicFor('mori', memory, known, true).trigger, 'ask:mori-travel');
  memory.hear({ who: 'mori', text: REMARKS.find(remark => remark.id === 'mori_return_norway').lines[0], source: { day: 2 }, known: new Set() });
  assert.equal(topicFor('mori', memory, new Set(), true).trigger, 'ask:mori-travel');
  assert.equal(topicFor('mori', memory, known, true).trigger, 'ask:mori');
  assert.equal(topicFor('kenji', memory, new Set(), true).trigger, 'ask:kenji');
  assert.equal(topicFor('kenji', memory, known, false), null);
  assert.equal(topicFor('unknown', memory, known, true), null);
});
test('shared questions preserve authored place overrides and ordinary Talk', () => {
  const original = { on: { 'talk:mori': 'job', 'ask:mori': 'specific' }, nodes: { job: [], specific: [] } };
  const merged = withConversations(original);
  assert.equal(merged.on['talk:mori'], 'job');
  assert.equal(merged.on['ask:mori'], 'specific');
  assert.ok(merged.nodes.conversation_kenji.length);
  assert.deepEqual(original.nodes, { job: [], specific: [] });
});
test('recurring voice coverage includes reused day-specific lines on every day', async () => {
  const story = { nodes: { line: [{ say: 'eric', text: 'Photo?' }] } };
  const sets = [2, 0].map(day => ({ day, files: [{ name: 'test', load: async () => story }] }));
  const voices = await voiceLines({ mcs: ['eric', 'carina'], sets });
  for (const day of [1, 2, 3, 7]) {
    const lines = manifestOf(voices, day).filter(line => line.text === 'Photo?');
    assert.deepEqual(lines.map(line => line.speaker), ['eric', 'carina']);
  }
});

test('Hamada retains ordinary conversation after a remembered booking becomes understandable', () => {
  const memory = createConversationMemory(REMARKS), words = new Set(['yoyaku']);
  assert.equal(topicFor('kuroda', memory, words, false), null);
  assert.equal(topicFor('kuroda', memory, words, true).trigger, 'ask:kuroda');
  memory.hear({ who: 'kuroda', text: REMARKS.find(item => item.id === 'hamada_wednesday_booking').lines[0], known: new Set(), source: { day: 8 } });
  assert.equal(topicFor('kuroda', memory, new Set(), true).trigger, 'ask:kuroda');
  const topic = topicFor('kuroda', memory, words, true), story = withConversations({ on: {}, nodes: {} });
  assert.equal(topic.trigger, 'ask:kuroda-booking');
  const options = story.nodes[story.on[topic.trigger]].find(step => step.choice).choice;
  assert.ok(options.some(option => option.go === 'conversation_hamada_booking_ask'));
  assert.ok(options.some(option => option.go === 'conversation_hamada_regular'));
  assert.ok(options.some(option => option.go === 'conversation_hamada_leave'));
  assert.equal(options.find(option => option.go === 'conversation_hamada_number').if, 'ms2_kuroda || karaoke_receipt_seen');
});
