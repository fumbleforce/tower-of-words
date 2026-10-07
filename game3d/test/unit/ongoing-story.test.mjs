import assert from 'node:assert/strict';
import { test } from 'node:test';
import { STORIES } from '../../story/ongoing/index.js';
import { ROUTES } from '../../story/ongoing/routes.js';
import { DEFAULT_SPEAKERS, GLOBAL_HOOKS, PLACE_DETAILS } from '../../js/narrative/contracts.js';
import { WORDS } from '../../js/lang.js';
import { compileCondition } from '../../js/narrative/conditions.js';
import { expandMc, PROTAGONISTS } from '../../js/mc.js';

for (const [place, story] of Object.entries(STORIES)) test(`continuing ${place} has staged, reachable story references`, () => {
  const details = PLACE_DETAILS[place], nodes = story.nodes;
  const hooks = new Set([...GLOBAL_HOOKS, ...details.hooks]);
  const ids = new Set([...Object.keys(details.things), ...details.people, ...details.spots, ...details.seats, 'eric', 'player', 'mio']);
  const text = (value, at) => {
    if (!value) return;
    assert.ok(!/placeholder|Codex writes/i.test(value), `${at}: unfinished content`);
    for (const [, word] of value.matchAll(/\{(\w+)\}/g)) assert.ok(WORDS[word], `${at}: unknown word ${word}`);
  };
  const condition = (expr, at) => assert.ok(!compileCondition(expr).error, `${at}: invalid condition ${expr}`);
  function steps(list, at) {
    for (const step of list) {
      if (typeof step === 'string') { text(step, at); continue; }
      if (step.say) {
        assert.ok(story.speakers?.[step.say] || DEFAULT_SPEAKERS[step.say], `${at}: missing speaker ${step.say}`);
        assert.ok(step.emo || story.speakers?.[step.say]?.phone, `${at}: missing voice direction`);
        assert.ok(!Object.hasOwn(step, 'en'), `${at}: translated exposition`);
      }
      for (const key of ['text', 'prompt', 'line']) text(step[key], at);
      for (const key of ['go', 'call']) if (step[key]) assert.ok(nodes[step[key]], `${at}: missing ${key} ${step[key]}`);
      if (step.if) condition(step.if, at);
      for (const key of ['then', 'else']) if (step[key]) steps(step[key], at);
      for (const option of step.choice || []) {
        text(option.text, at);
        if (option.if) condition(option.if, at);
        assert.ok(nodes[option.go || option.call], `${at}: missing choice target ${option.go || option.call}`);
      }
      if (!step.do) continue;
      assert.ok(hooks.has(step.do), `${at}: missing hook ${step.do}`);
      if (step.do === 'trip') assert.ok(ROUTES[place][step.to], `${at}: no physical route ${step.to}`);
      if (step.do === 'type') assert.ok(WORDS[step.word], `${at}: missing typed word ${step.word}`);
      if (step.do === 'sit') assert.ok(details.seats.includes(step.at), `${at}: no seat ${step.at}`);
      if (['cam', 'walk', 'face', 'look', 'gesture', 'sit', 'stand', 'goal'].includes(step.do))
        for (const key of ['who', 'on', 'at', 'to']) if (typeof step[key] === 'string') assert.ok(ids.has(step[key]), `${at}: no ${key} ${step[key]}`);
    }
  }
  assert.ok(nodes[story.start]);
  for (const [id, list] of Object.entries(nodes)) steps(list, `${place}/${id}`);
  for (const [trigger, entries] of Object.entries(story.on)) {
    const [kind, a, b] = trigger.split(':'), target = kind === 'say' ? b : a;
    if (kind === 'zone') assert.ok(details.zones.includes(target), `${place}: unknown zone ${target}`);
    else if (kind !== 'event') assert.ok(ids.has(target), `${place}: unknown trigger target ${target}`);
    for (const entry of [].concat(entries)) {
      assert.ok(nodes[typeof entry === 'string' ? entry : entry.node], `${place}: missing trigger node ${trigger}`);
      if (entry.if) condition(entry.if, trigger);
    }
  }
  for (const mc of Object.values(PROTAGONISTS)) assert.ok(!JSON.stringify(expandMc(structuredClone(story), mc)).includes('{mc.'));
});
