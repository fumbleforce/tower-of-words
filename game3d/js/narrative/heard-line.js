// How a spoken line shows in the text box: blurred (overheard) or as written. One rule for every speaker, public
// story and private scenes alike (Jørgen, 2026-10-10: "I should not be understanding what kuro says when she talks
// japanese, a consistent failure many places in dialogue, you keep forgetting the blur").
//   - The player's own lines show as written, with their `en` if they carry one: he knows what he says.
//   - Anyone else's Japanese goes through the blur, whether or not the story marked it `overheard`: only the words
//     he has been taught, names and the line's `clear` entries stay readable (ui/dialogue-text.js heardHTML).
//   - An `en` English subtitle is never shown for anyone else's line. (Captions of ambient moments between two
//     other people keep theirs: narrative/ambient-lines.js.)
//   - Japanese inside someone's English line blurs in place; the English around it reads as written.
//   - `slow: true` is the slow repeat of a word being taught right then; it stays glossed.
// No DOM, so the checks (game3d/tools/blur-check.mjs, the private scenes' own) use it too.

import { isPlayer } from '../mc.js';

const JP = /[぀-ヿ㐀-鿿々]/g;
const LATIN = /[A-Za-z]/g;
const HAS_JP = /[぀-ヿ㐀-鿿々]/;

// Is this text Japanese speech? Japanese characters outweigh Latin letters, or the line is only word ids ({ohayo}。).
// Protagonist tokens ({mc.name}) don't count either way.
export function japaneseLine(text = '') {
  const s = String(text).replace(/\{mc\.\w+\}/g, '');
  const ids = (s.match(/\{\w+\}/g) || []).length;
  const rest = s.replace(/\{\w+\}/g, '');
  const jp = (rest.match(JP) || []).length,
    lat = (rest.match(LATIN) || []).length;
  return jp > 0 ? jp >= lat : ids > 0 && lat === 0;
}

// { heard, mixed, en }: whether the line blurs; whether it is English from someone else with Japanese stretches in
// it, which blur inside the line (ui/dialogue-text.js mixedHTML); the subtitle that may show (only the player's own)
export function presentLine(who, text, s = {}) {
  if (isPlayer(who)) return { heard: !!s.overheard, mixed: false, en: s.en };
  const heard = !!s.overheard || (!s.slow && japaneseLine(text));
  const mixed = !heard && !s.slow && HAS_JP.test(String(text).replace(/\{[\w.]+\}/g, ''));
  return { heard, mixed, en: undefined };
}
