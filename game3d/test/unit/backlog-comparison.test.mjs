import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.endsWith('/js/ui/dialogue-text.js') && specifier === '../audio/core.js')
      return { url: 'data:text/javascript,export const paused=false;', shortCircuit: true };
    return next(specifier, context);
  },
});
const { heardHTML } = await import('../../js/ui/dialogue-text.js');
const { earlierReading } = await import('../../js/ui/backlog-comparison.js');
const { known } = await import('../../js/lang.js');
const { createConversationMemory } = await import('../../js/conversations/memory.js');
const { REMARKS } = await import('../../story/conversations/remarks.js');
const readable = html => html.replace(/<span class="gx"[^>]*>[^<]*<\/span>/g, '').replace(/<[^>]+>/g, '');
const entry = { memoryId: 'mori_return_norway', ov: true, text: '1994年に行ったんです。また行きたいですね。', clear: [{ ja: '1994年', en: '1994' }], knownAtTime: [] };

test('an earlier hearing keeps new vocabulary hidden without altering current knowledge or contextual glosses', () => {
  known.clear(); known.add('ikitai');
  const now = heardHTML(entry.text, entry.clear);
  const before = earlierReading(entry, now);
  assert.match(readable(now), /行きたい/);
  assert.doesNotMatch(readable(before), /行きたい|ikitai|want to go/);
  assert.match(readable(before), /1994年/);
  assert.match(before, /<summary>What I understood then<\/summary>/);
  assert.deepEqual([...known], ['ikitai']);
  assert.deepEqual(entry.knownAtTime, []);
});

test('unrelated vocabulary, fully known remarks, English and legacy history have no redundant comparison', () => {
  known.clear(); known.add('ohayo');
  assert.equal(earlierReading(entry, heardHTML(entry.text, entry.clear)), '');
  known.add('ikitai');
  for (const e of [{ ...entry, knownAtTime: [...known] }, { ...entry, knownAtTime: null }, { ...entry, memoryId: null }, { ...entry, ov: false }])
    assert.equal(earlierReading(e, heardHTML(e.text, e.clear)), '');
});

test('the original render preserves names, aliases and its original learned word, but hides other words', () => {
  const html = heardHTML('森さん、{matte}。{ugoite}。', [], new Set(['matte']));
  assert.match(readable(html), /森さん \(Mori-san\)/);
  assert.match(readable(html), /待って/);
  assert.doesNotMatch(readable(html), /動いて/);
});

test('comparison survives serialized memory without inventing a lesson or a follow-up', () => {
  const memory = createConversationMemory(REMARKS);
  memory.hear({ who: 'mori', text: entry.text, source: { day: 2 }, known: new Set(), clear: entry.clear });
  const restored = createConversationMemory(REMARKS);
  restored.load(JSON.parse(JSON.stringify(memory.toJSON())));
  const [record] = restored.entries();
  const saved = restored.toJSON();
  known.clear(); known.add('ikitai');
  assert.ok(earlierReading({ ...record, ov: true, memoryId: record.id }, heardHTML(record.text, record.clear)));
  assert.deepEqual(restored.toJSON(), saved);
  assert.equal(restored.ready(record.id, new Set()), false);
  assert.equal(restored.ready(record.id, known), true);
});
