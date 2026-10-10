// The Words panel's data (js/ui/words-data.js): only known words, grouped by day or kind, searched by any spelling.
import assert from 'node:assert/strict';
import { test } from 'node:test';
const { wordEntries, groupEntries, matches, fold } = await import('../../js/ui/words-data.js');
const { learn, known, learnedAt, setLearnWhere, kanaOf } = await import('../../js/lang.js');

const at = {
  ohayo: { day: 1, place: 'train', n: 1 },
  matte: { day: 1, place: 'train', n: 2 },
  kanpai: { day: 2, place: 'izakaya', n: 3 },
  kenmei: { day: 2, place: 'office', n: 4 },
};

test('only the known words are entries, with kana for words written in kanji', () => {
  const e = wordEntries(['ohayo', 'matte', 'nope'], at, 2);
  assert.deepEqual(e.map((x) => x.id), ['ohayo', 'matte']);
  assert.equal(e.find((x) => x.id === 'matte').kana, 'まって');
  assert.equal(e.find((x) => x.id === 'ohayo').kana, ''); // written in kana already
  for (const id of ['kite', 'irete', 'dashite', 'tomatte', 'kenmei', 'tanto']) assert.ok(kanaOf(id), id);
});

test('by day: newest day first, words in the order learned, an unrecorded word under Earlier', () => {
  const e = wordEntries(['ohayo', 'matte', 'kanpai', 'gaijin'], at, 2);
  const g = groupEntries(e, 'day');
  assert.deepEqual(g.map((x) => x.title), ['Day 2', 'Day 1', 'Earlier']);
  assert.deepEqual(g[1].entries.map((x) => x.id), ['ohayo', 'matte']);
  assert.ok(e.find((x) => x.id === 'kanpai').today);
});

test('by kind: phrases, commands, words, ticket labels', () => {
  const g = groupEntries(wordEntries(['ohayo', 'matte', 'kenmei', 'gaijin'], at, 2), 'kind');
  assert.deepEqual(g.map((x) => x.key), ['phrase', 'command', 'word', 'label']);
});

test('search matches Japanese, kana, romaji with or without long marks, and English', () => {
  const [ohayo] = wordEntries(['ohayo'], at, 1);
  for (const q of ['ohayo', 'OHAYOU', 'ohayō', 'おはよう', 'オハヨウ', 'good morning', '']) assert.ok(matches(ohayo, q), q);
  assert.ok(!matches(ohayo, 'wait'));
  const [matte] = wordEntries(['matte'], at, 1);
  for (const q of ['待', 'まって', 'wait']) assert.ok(matches(matte, q), q);
  assert.equal(fold('Tantō Suru'), 'tantosuru');
});

test('learn() records when and where, once', () => {
  setLearnWhere(() => ({ day: 3, place: 'plaza', period: 'morning' }));
  known.delete('koko');
  delete learnedAt.koko;
  assert.ok(learn('koko'));
  assert.equal(learnedAt.koko.place, 'plaza');
  assert.equal(learnedAt.koko.day, 3);
  setLearnWhere(() => ({ day: 4, place: 'gym' }));
  assert.ok(!learn('koko'));
  assert.equal(learnedAt.koko.day, 3);
  setLearnWhere(() => null);
});
