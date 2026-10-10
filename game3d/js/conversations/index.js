import { installSenderHook } from '../investigations/sender/hook.js';
import CONVERSATIONS from '../../story/conversations/index.js';
import { conversationMemory } from './state.js';
import { known } from '../lang.js';
import { expandMc } from '../mc.js';
import { flags } from '../narrative/state.js';
import PEOPLE from '../../story/people.js';
import { applyNeeds, knows } from './needs.js';

const EVERYDAY = {
  mio: ['mio_mother_weekends', 'ask:mio-break'],
  emi: [],
  guard: ['guard_short_rest', 'ask:guard-break'],
  kuro: ['kuro_swimming_pace', 'ask:kuro-swimming'],
  aoi: ['aoi_wants_tennis', 'ask:aoi-tennis'],
  rei: ['rei_another_game', 'ask:rei-again'],
};

export function topicFor(who, memory = conversationMemory, words = known, met = false, introductions = flags) {
  if (!met || (PEOPLE[who]?.introduction && !introductions[PEOPLE[who].introduction])) return null;
  if (EVERYDAY[who]) {
    const [remark, followup] = EVERYDAY[who];
    return {
      label: who === 'guard' ? 'Chat with the guard' : `Chat with ${PEOPLE[who].name}`,
      trigger: remark && memory.ready(remark, words) ? followup : `ask:${who}`,
    };
  }
  if (who === 'kuroda')
    return memory.ready('hamada_wednesday_booking', words)
      ? { label: 'Ask about his karaoke booking', trigger: 'ask:kuroda-booking' }
      : { label: 'Chat about his evenings', trigger: 'ask:kuroda' };
  if (who === 'kenji')
    return {
      label: knows('kenji.arcade', introductions) ? 'Chat about the arcade' : 'Chat with Kenji',
      trigger: 'ask:kenji',
    };
  if (who !== 'mori') return null;
  return memory.ready('mori_return_norway', words)
    ? { label: 'Ask about Norway', trigger: 'ask:mori' }
    : { label: 'Talk about travel', trigger: 'ask:mori-travel' };
}
export function withConversations(story) {
  const shared = expandMc(structuredClone(CONVERSATIONS));
  return { ...story, on: { ...shared.on, ...story.on }, nodes: { ...applyNeeds(shared.nodes), ...story.nodes } };
}
export function installConversations(game) {
  installSenderHook(game, flags);
  game.topicFor = (who) =>
    who === 'mio' && game.place?.name === 'train'
      ? null
      : topicFor(who, conversationMemory, known, game.sim?.met.has(who));
}
