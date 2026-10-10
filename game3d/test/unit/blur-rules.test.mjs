// The blur rule (js/narrative/heard-line.js) and its check (tools/lib/blur-rules.mjs): anyone else's Japanese blurs
// and never shows its English (Jørgen, 2026-10-10: "I should not be understanding what kuro says when she talks japanese").
import test from 'node:test';
import assert from 'node:assert/strict';
import { japaneseLine, presentLine } from '../../js/narrative/heard-line.js';
import { spokenProblems, walkSpoken } from '../../../tools/lib/blur-rules.mjs';

test('Japanese from anyone but the player blurs, marked overheard or not, and never shows its en', () => {
  assert.deepEqual(presentLine('kuro', 'B2は、あちらのエレベーターです。', {}), { heard: true, mixed: false, en: undefined });
  assert.deepEqual(presentLine('kuro', 'ありがとう。', { en: 'Thank you.' }), { heard: true, mixed: false, en: undefined });
  assert.deepEqual(presentLine('kuro', '{ohayo}。', {}), { heard: true, mixed: false, en: undefined });
  assert.equal(presentLine('kuro', 'Lift, there.', {}).heard, false);
  assert.equal(presentLine('kuro', 'Shout {matte}!', {}).heard, false);
  // the slow repeat of a word being taught right then stays glossed
  assert.equal(presentLine('kuro', '{oyogu}。', { slow: true }).heard, false);
  // the player's own line keeps its subtitle
  assert.deepEqual(presentLine('eric', 'おねがい、しました', { en: 'I asked it nicely.' }), { heard: false, mixed: false, en: 'I asked it nicely.' });
  // English with Japanese dropped in (Mio): the English reads as written, the Japanese blurs in place
  assert.deepEqual(presentLine('kuro', 'Long day. お疲れ, I guess.', {}), { heard: false, mixed: true, en: undefined });
  assert.deepEqual(presentLine('kuro', 'Long day. Want a coffee?', {}), { heard: false, mixed: false, en: undefined });
  assert.equal(japaneseLine('{mc.name_jp}さん。ここ、風が弱いですよ。'), true);
  assert.equal(japaneseLine('Hi {mc.name}! {ohayo}'), false);
});

test('the check fails a line that would show unknown Japanese or its meaning', () => {
  const p = (who, s, o = {}) => spokenProblems(who, s, o);
  assert.equal(p('kuro', { text: 'ゆっくりで、いいですよ。', overheard: true, clear: [{ ja: 'ゆっくり', en: 'slowly' }] }).length, 1);
  assert.equal(p('music', { text: '自分で録ったの。', en: 'I recorded it myself.' }, { strictEn: true }).length, 1);
  assert.equal(p('worker', { text: 'Oh. 気持ちいい. 規則...', clear: ['規則'] }).length, 1);
  assert.equal(p('kuro', { text: '{futari}、です。', slow: true }).length, 1);
  // allowed: loanwords, names, numbers, arigatō, a hand-glossed word in English, the player, an ambient exchange
  assert.deepEqual(p('kuro', { text: 'B2は、あちらのエレベーターです。', overheard: true, clear: ['B2', { ja: 'エレベーター', en: 'lift' }] }), []);
  assert.deepEqual(p('mori', { text: '1994年です。', overheard: true, clear: [{ ja: '1994年', en: '1994' }] }), []);
  assert.deepEqual(p('mio', { text: 'Just おはよう (ohayō) is fine.' }), []);
  assert.deepEqual(p('eric', { text: 'おねがい', en: 'Please.' }, { strictEn: true }), []);
  assert.deepEqual(p('sales1', { text: 'え、今日から？', en: 'From today?' }, { ambient: true, strictEn: true }), []);
});

test('walkSpoken finds long-form steps, string lines in step lists and ambient captions', () => {
  const seen = [];
  walkSpoken({ nodes: { a: ['kuro: こんにちは', { say: 'mori', text: 'はい' }, { if: 'x', then: ['> narration'] }] }, ambient: [{ lines: ['kenji: やあ'] }], labels: { kuro: 'Desk' } },
    (who, s, where, o) => seen.push(`${who}:${s.text}:${!!o.ambient}`));
  assert.deepEqual(seen.sort(), ['kenji:やあ:true', 'kuro:こんにちは:false', 'mori:はい:false']);
});
