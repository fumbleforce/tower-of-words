// The B2 team as the minigames show them. Who they are is docs/game/cast.md; this is only how
// each one is written in Japanese here and which portrait faces exist (game3d/assets/portraits).

export const PEOPLE = {
  eric: { en: 'Eric', jp: 'エリックさん', faces: ['neutral', 'surprised', 'tired'] },
  mio: { en: 'Mio', jp: 'ミオさん', faces: ['neutral', 'smile', 'deadpan', 'surprised', 'embarrassed', 'tired', 'phone'] },
  mori: { en: 'Mr. Mori', jp: 'モリさん', faces: ['neutral', 'smile', 'flustered'] },
  kenji: { en: 'Kenji', jp: 'ケンジくん', faces: ['neutral', 'grin', 'sheepish'] },
  cook: { en: 'Canteen worker', jp: 'しょくどうのひと', faces: [] },
};

/** Portrait URL (null for someone without portraits); falls back to neutral when there is no such face. */
export function portrait(id, face = 'neutral') {
  const p = PEOPLE[id];
  if (!p.faces.length) return null;
  const f = p && p.faces.includes(face) ? face : 'neutral';
  return new URL(`../../assets/portraits/${id}-${f}.webp`, import.meta.url).href;
}

/** How a speaker refers to someone: themselves as わたし, everyone else by name. */
export function nameFor(id, speaker) {
  return id === speaker ? '{わたし|watashi|I, me}' : `{${PEOPLE[id].jp}||${PEOPLE[id].en}}`;
}
