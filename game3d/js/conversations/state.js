import { createConversationMemory } from './memory.js';
import { REMARKS } from '../../story/conversations/remarks.js';

export const conversationMemory = createConversationMemory(REMARKS);
export function rememberEntry(entry) {
  if (entry.k !== 'line') return;
  conversationMemory.hear({
    who: entry.who,
    text: entry.text,
    source: { day: entry.day, period: entry.period, place: entry.place, node: entry.node },
    known: entry.knownAtTime ? new Set(entry.knownAtTime) : null,
    voiceKey: entry.vk,
    clear: entry.clear || [],
  });
}
export function rememberedLines() {
  return conversationMemory.entries().map((record) => ({
    k: 'line',
    who: record.who,
    text: record.text,
    name: REMARKS.find((entry) => entry.id === record.id)?.name || record.who,
    ...record.source,
    knownAtTime: record.knownAtTime,
    vk: record.voiceKey,
    clear: record.clear || [],
    ov: true,
    memoryId: record.id,
  }));
}
