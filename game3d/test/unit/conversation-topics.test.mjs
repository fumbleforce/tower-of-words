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

const everyday = [
  ['mio','mio_mother_weekends','yasumi','ask:mio-break'],
  ['guard','guard_short_rest','yasumi','ask:guard-break'],
  ['kuro','kuro_swimming_pace','oyogu','ask:kuro-swimming','d3_kuro_intro'],
  ['aoi','aoi_wants_tennis','ikitai','ask:aoi-tennis','d3_aoi_intro'],
  ['rei','rei_another_game','mouichido','ask:rei-again','d4_rei_intro'],
];
for (const [who,id,word,trigger,intro] of everyday) for (const wordFirst of [false,true]) {
  test(`${who} shared Chat survives either learning order without replacing ordinary Talk (${wordFirst})`,()=>{
    const memory=createConversationMemory(REMARKS),words=new Set(wordFirst?[word]:[]), introductions=intro?{[intro]:true}:{};
    assert.equal(topicFor(who,memory,words,false,introductions),null);
    if(intro)assert.equal(topicFor(who,memory,words,true,{}),null,'eager met flag cannot introduce a name');
    assert.equal(topicFor(who,memory,words,true,introductions).trigger,`ask:${who}`);
    const remark=REMARKS.find(r=>r.id===id);
    memory.hear({who,text:remark.lines[0],source:{day:6,place:'plaza'},known:words});
    const restored=createConversationMemory(REMARKS);restored.load(JSON.parse(JSON.stringify(memory.toJSON())));
    words.add(word);
    assert.equal(topicFor(who,restored,words,true,introductions).trigger,trigger);
    assert.equal(restored.entries()[0].understoodAtTime,wordFirst);
    const story=withConversations({on:{[`talk:${who}`]:'urgent_job'},nodes:{urgent_job:[]}});
    assert.equal(story.on[`talk:${who}`],'urgent_job');
    const choices=story.nodes[story.on[trigger]].find(s=>s.choice).choice;
    assert.ok(choices.length>=3,'newly understood question coexists with ordinary topics and leaving');
  });
}
test('Emi has ordinary Chat without a word prerequisite',()=>{
  assert.equal(topicFor('emi',createConversationMemory(REMARKS),new Set(),true).trigger,'ask:emi');
});
