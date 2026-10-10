// What the Words panel lists (docs/game/controls-and-ui.md, Words): the words Eric knows, never one he doesn't, each
// with its kana, reading, meaning and where it was learned, grouped by day or by kind, filtered by a search.
// No DOM here, so the unit test imports it in Node; ui/words-view.js draws it.
import { WORDS, PHRASES, COMMANDS, kanaOf } from '../lang.js';

// the game's own kinds of word (docs/game/words.md, Kind), in the order the panel lists them
export const KINDS = [
  ['phrase', 'Phrases', 'Say these to people.'],
  ['command', 'Commands', 'Old machines listen to these.'],
  ['word', 'Words', 'You understand these. They are not for saying.'],
  ['label', 'Ticket app', 'Labels on the ticket screens.'],
];
export const kindOf = (id) => {
  const w = WORDS[id];
  return w.cmd ? 'command' : w.phrase ? 'phrase' : w.ui ? 'label' : 'word';
};
export const sayable = (id) => PHRASES.includes(id) || COMMANDS.includes(id);

// for search: lower case, no long-vowel marks, ou/oo/uu as one vowel, katakana as hiragana, no spaces
export function fold(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/ou|oo/g, 'o')
    .replace(/uu/g, 'u')
    .replace(/[\s'’\-.,;()]/g, '');
}

// one entry per known word. at: { [id]: { day, place, period, n } }; today: the current day
export function wordEntries(knownIds, at = {}, today = 1) {
  const order = Object.keys(WORDS);
  return [...knownIds]
    .filter((id) => WORDS[id])
    .map((id) => {
      const w = WORDS[id],
        rec = at[id] || {},
        kana = kanaOf(id);
      return {
        id,
        ja: w.ja,
        kana: kana && kana !== w.ja ? kana : '',
        ro: w.ro,
        en: w.en,
        kind: kindOf(id),
        day: rec.day || 0,
        place: rec.place || '',
        period: rec.period || '',
        n: rec.n || 0,
        today: !!rec.day && rec.day === today,
        order: order.indexOf(id),
        hay: [w.ja, kana, ...(w.alias || []), w.ro, w.en, w.label || ''].map(fold).join('|'),
      };
    });
}

export function matches(entry, query) {
  const q = fold(query);
  return !q || entry.hay.includes(q);
}

// in the order learned; words with no record (an old save) keep the game's word order after them
const byLearned = (a, b) => (a.n || 1e9) - (b.n || 1e9) || a.order - b.order;

// groups: [{ key, title, note, entries }]. By day the newest day comes first; a word from an old save with no day
// goes under "Earlier". By kind, the KINDS order.
export function groupEntries(entries, mode = 'day', dayTitle = (d) => `Day ${d}`) {
  if (mode === 'kind')
    return KINDS.map(([key, title, note]) => ({
      key,
      title,
      note,
      entries: entries.filter((e) => e.kind === key).sort(byLearned),
    })).filter((g) => g.entries.length);
  const days = [...new Set(entries.map((e) => e.day))].sort((a, b) => (b || -1) - (a || -1));
  return days.map((d) => ({
    key: 'day' + d,
    title: d ? dayTitle(d) : 'Earlier',
    note: '',
    entries: entries.filter((e) => e.day === d).sort(byLearned),
  }));
}
