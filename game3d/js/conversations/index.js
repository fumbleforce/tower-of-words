import CONVERSATIONS from '../../story/conversations/index.js';
import { conversationMemory } from './state.js';
import { known } from '../lang.js';
import { expandMc } from '../mc.js';

export function topicFor(who, memory = conversationMemory, words = known, met = false) {
  if (!met) return null;
  if (who === 'kenji') return { label: 'Chat about the arcade', trigger: 'ask:kenji' };
  if (who !== 'mori') return null;
  return memory.ready('mori_return_norway', words)
    ? { label: 'Ask about Norway', trigger: 'ask:mori' }
    : { label: 'Talk about travel', trigger: 'ask:mori-travel' };
}
export function withConversations(story) {
  const shared = expandMc(structuredClone(CONVERSATIONS));
  return { ...story, on: { ...shared.on, ...story.on }, nodes: { ...shared.nodes, ...story.nodes } };
}
export function installConversations(game) {
  game.topicFor = (who) => topicFor(who, conversationMemory, known, game.sim?.met.has(who));
}
