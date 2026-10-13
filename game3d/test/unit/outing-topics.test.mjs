import test from 'node:test';
import assert from 'node:assert/strict';
import { installConversations, topicFor, withConversations } from '../../js/conversations/index.js';
import { flags } from '../../js/narrative/state.js';

test('outing offer leaves ordinary Kenji chat and knowledge prerequisites available while unavailable', () => {
  for (const key of Object.keys(flags)) delete flags[key];
  const game = { hooks: {}, sim: { met: new Set(['kenji']) }, place: { name: 'office' }, outing: { available: () => false } };
  installConversations(game);
  assert.deepEqual(game.topicFor('kenji'), { label: 'Chat with Kenji', trigger: 'ask:kenji' });
  flags.kenji_arcade_talked = true;
  assert.equal(game.topicFor('kenji').label, 'Chat about the arcade');
  flags.outing_paused = true;
  assert.equal(game.topicFor('kenji').trigger, 'ask:kenji', 'a paused outing does not offer a walk during work');
  game.outing.available = () => true;
  assert.equal(game.topicFor('kenji').trigger, 'ask:kenji-outing');
  const story = withConversations({});
  assert.equal(story.on['ask:kenji'], 'conversation_kenji');
  assert.equal(story.on['ask:kenji-outing'], 'outing_chat');
});

test('active outing controls and callbacks do not reveal an unmet person', () => {
  const introductions = { outing_active: true };
  assert.equal(topicFor('kenji', undefined, undefined, false, introductions), null);
  assert.equal(topicFor('kenji', undefined, undefined, true, introductions).trigger, 'ask:kenji-outing');
});
