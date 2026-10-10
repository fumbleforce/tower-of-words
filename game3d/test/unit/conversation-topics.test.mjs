import assert from 'node:assert/strict';
import { test } from 'node:test';
import { topicFor, withConversations } from '../../js/conversations/index.js';
import { createConversationMemory } from '../../js/conversations/memory.js';
import { REMARKS } from '../../story/conversations/remarks.js';
import { manifestOf, voiceLines } from '../../tools/voice-manifest.mjs';
import { readdirSync, statSync } from 'node:fs';
import { createConditionEvaluator } from '../../js/narrative/conditions.js';
import { NEEDS } from '../../story/conversations/needs.js';
import { MOMENTS } from '../../js/bonds/day1.js';
import CONVERSATIONS from '../../story/conversations/index.js';

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

// Issue #399: a Chat question that presumes something shows only once the player has learned it.
const menuTexts = (trigger, flags) => {
  const story = withConversations({ on: {}, nodes: {} });
  const cond = createConditionEvaluator((key) => flags[key] ?? 0);
  const steps = story.nodes[story.on[trigger]];
  return steps.find((step) => step.choice).choice.filter((option) => cond(option.if)).map((option) => option.text);
};
// day 1 evening after Emi drops in, with nothing yet heard about the club or lunch
const day1 = { day: 1, period_evening: true, place: 'office', met_emi: true, met_mio: true, met_kenji: true, fact_emi_ten_years: true };
test('a fresh day 1 offers no swimming club, server lunch or crane game question', () => {
  assert.ok(!menuTexts('ask:emi', day1).some((text) => /swimming|join in/.test(text)));
  assert.ok(menuTexts('ask:emi', day1).includes('What makes things easier for you at work?'), 'first-meeting questions stay');
  assert.ok(!menuTexts('ask:mio', day1).some((text) => /servers/.test(text)));
  assert.ok(!menuTexts('ask:kenji', day1).some((text) => /crane/.test(text)));
  assert.equal(topicFor('kenji', createConversationMemory(REMARKS), new Set(), true, day1).label, 'Chat with Kenji');
});
test('each question opens once its fact is learned, and stays open from saved flags', () => {
  for (const flags of [{ lunch_mio: true }, { lunch_mori: true }, { fact_mio_lunch_spot: true }])
    assert.ok(menuTexts('ask:mio', { ...day1, ...flags }).includes('Do you ever eat away from the servers?'));
  for (const flags of [{ fact_emi_swimming_club: true }, { d3_swim_done: true }]) {
    const saved = JSON.parse(JSON.stringify({ ...day1, ...flags, day: 3 }));
    assert.ok(menuTexts('ask:emi', saved).includes('What made you join the swimming club?'));
    assert.ok(menuTexts('ask:emi', { ...saved, chat_emi_club_known: true }).includes('Are you getting much time to join in?'));
  }
  assert.ok(menuTexts('ask:kenji', { ...day1, kenji_arcade_talked: true }).includes('Ask about the crane game.'));
  assert.equal(topicFor('kenji', createConversationMemory(REMARKS), new Set(), true, { kenji_arcade_talked: true }).label, 'Chat about the arcade');
});
test('every needs entry is used, and each fact it names is taught somewhere', async () => {
  const used = new Set();
  const walk = (value) => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== 'object') return;
    if (value.needs) [].concat(value.needs).forEach((key) => used.add(key));
    Object.values(value).forEach(walk);
  };
  walk(CONVERSATIONS.nodes);
  assert.deepEqual([...used].sort(), Object.keys(NEEDS).sort(), 'every used key is in needs.js, and none is unused');
  const taught = new Set();
  for (const place of Object.values(MOMENTS))
    for (const moment of Object.values(place)) for (const [who, id] of moment.fact || []) taught.add(`fact_${who}_${id}`);
  const root = new URL('../../story/', import.meta.url).pathname;
  const files = (dir) =>
    readdirSync(dir).flatMap((name) =>
      statSync(dir + name).isDirectory() ? files(dir + name + '/') : name.endsWith('.js') ? [dir + name] : [],
    );
  const collect = (value, seen) => {
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    if (value.do === 'fact') taught.add(`fact_${value.who}_${value.id}`);
    Object.values(value).forEach((child) => collect(child, seen));
  };
  for (const file of files(root)) {
    try {
      collect(await import(file), new Set());
    } catch {
      // not plain story data
    }
  }
  for (const [key, condition] of Object.entries(NEEDS))
    for (const fact of condition.match(/\bfact_\w+/g) || []) assert.ok(taught.has(fact), `${key}: nothing teaches ${fact}`);
});
