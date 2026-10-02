// The drink round: who gives what to whom at the B2 kitchenette table, and how to say it.
// The sentence for every round is built from who gives, who gets and who is talking, so the
// verb the game wants always follows from the scene (README.md, Drink round).

import { nameFor } from '../common/cast.js';

export const ITEMS = {
  coffee: { jp: 'コーヒー', en: 'a coffee' },
  tea: { jp: 'こうちゃ', en: 'a tea' },
  melon: { jp: 'メロンソーダ', en: 'a melon soda' },
  cornsoup: { jp: 'コーンスープ', en: 'a corn soup' },
  choco: { jp: 'チョコ', en: 'some chocolate' },
  onigiri: { jp: 'おにぎり', en: 'a rice ball' },
};

export const VERBS = {
  ageru: { jp: '{あげました|agemashita|gave (away from the speaker)}', plain: 'あげました' },
  kureru: { jp: '{くれました|kuremashita|gave (to the speaker)}', plain: 'くれました' },
  morau: { jp: '{もらいました|moraimashita|got, received}', plain: 'もらいました' },
};

const EN = { eric: 'Eric', mio: 'Mio', mori: 'Mr. Mori', kenji: 'Kenji' };

/** The verb a round needs: the getter as subject says もらう; otherwise in to the speaker is くれる, else あげる. */
export function verbFor({ g, r, speaker = 'eric', frame = 'giver' }) {
  if (frame === 'receiver') return 'morau';
  return r === speaker ? 'kureru' : 'ageru';
}

/**
 * The sentence for a round as parts (markup strings and gaps), plus its English.
 * gaps: which pieces are left open: 'verb', 'particle' (に/から on the giver), 'getter' (the name before に).
 */
export function sentence(round, gaps = []) {
  const { g, r, item, speaker = 'eric', frame = 'giver' } = round;
  const verb = verbFor(round);
  const N = id => nameFor(id, speaker);
  const I = `{${ITEMS[item].jp}||${ITEMS[item].en.replace(/^(a|some) /, '')}}`;
  const gap = { slot: true };
  const parts = [];
  // Someone who isn't Eric leaves out their own わたし, the way people talk.
  const dropMe = speaker !== 'eric';
  if (frame === 'receiver') {
    if (!(dropMe && r === speaker)) parts.push(`${N(r)}は `);
    parts.push(`${N(g)}`);
    parts.push(gaps.includes('particle') ? gap : round.particle === 'kara' ? '{から|kara|from}' : '{に|ni|from (with もらう)}');
    parts.push(` ${I}を `);
  } else {
    const wa = verb === 'kureru' ? '{が|ga|(marks who did it)}' : '{は|wa|(marks the topic)}';
    if (!(dropMe && g === speaker)) parts.push(`${N(g)}`, `${wa} `);
    if (!(dropMe && r === speaker)) parts.push(gaps.includes('getter') ? gap : N(r), '{に|ni|to}', ' ');
    parts.push(`${I}を `);
  }
  parts.push(gaps.includes('verb') ? gap : `*${VERBS[verb].jp}*`, '。');
  const who = id => (id === speaker ? 'I' : EN[id]);
  const whom = id => (id === speaker ? 'me' : EN[id]);
  const en = frame === 'receiver'
    ? `${who(r)} got ${ITEMS[item].en} from ${whom(g)}.`
    : `${who(g)} gave ${whom(r)} ${ITEMS[item].en}.`;
  return { parts, en };
}

/** The whole line as one markup string (no gaps). */
export const line = round => sentence(round).parts.join('');

// The first run, in order. kind 'act': read it, then drag from who gives to who gets.
// kind 'watch': see it happen, then fill the gaps. before/after: lines around the round.
export const SCRIPT = [
  { tier: 'ageru', intro: [
    ['mio', "Okay so at lunch here everybody swaps drinks from the machine. It's a whole thing."],
    ['mio', "Mori-san writes down who gave what to who, so he can say thank you properly later. Don't ask me."],
    ['mio', "You help him. You read it, then show him with your finger: drag from the one who gives, to the one who gets."],
  ] },
  { kind: 'act', g: 'mio', r: 'kenji', item: 'coffee', showEn: true,
    after: [['mio', "Yes. あげる is give. And に goes on the one who gets it, so Kenji."]] },
  { kind: 'act', g: 'kenji', r: 'mori', item: 'melon', showEn: true,
    after: [['kenji', 'Melon soda is... best. Mori-san, present!', { face: 'grin' }]] },
  { kind: 'watch', g: 'mori', r: 'mio', item: 'tea', gaps: ['getter'],
    before: [['mio', "Now he does one, you say who got it."]],
    after: [['mio', 'Mm. I said I don\'t like tea. He knows. He does it anyway.', { face: 'deadpan' }]] },

  { tier: 'kureru', intro: [
    ['mio', "Now the annoying one. When it comes to you, it's not あげる any more. It's くれる."],
  ] },
  { kind: 'watch', g: 'mio', r: 'eric', item: 'coffee', gaps: ['verb'], choices: ['ageru', 'kureru'],
    after: [['mio', "Right. Don't make it weird, it's one coffee.", { face: 'embarrassed' }]] },
  { kind: 'act', g: 'mori', r: 'eric', item: 'cornsoup',
    after: [['mori', '{どうぞ|dōzo|here you are}。', { jp: true, en: 'Here you are.', face: 'smile' }]] },
  { kind: 'watch', g: 'eric', r: 'kenji', item: 'tea', gaps: ['verb'], choices: ['ageru', 'kureru'],
    after: [['kenji', 'Tea! Thank you, Eric-san!', { face: 'grin' }]] },
  { kind: 'watch', g: 'kenji', r: 'mio', item: 'melon', gaps: ['verb'], choices: ['ageru', 'kureru'],
    before: [['mio', "This one has nothing to do with you. Careful."]],
    after: [['mio', "He owes me. It's fine."]] },

  { tier: 'morau', intro: [
    ['mio', "Last one, もらう. It means get. The one who gets it goes first."],
    ['mio', "And the one who gave it gets に, or から. Both okay."],
  ] },
  { kind: 'act', g: 'mori', r: 'kenji', item: 'choco',
    after: [['mio', "See, Kenji is first in the sentence but he's the one getting."]] },
  { kind: 'watch', g: 'kenji', r: 'eric', item: 'melon', frame: 'receiver', gaps: ['particle', 'verb'],
    after: [['kenji', 'Melon soda for Eric-san! Is... best!', { face: 'grin' }]] },
  { kind: 'act', g: 'kenji', r: 'mio', item: 'onigiri', frame: 'receiver', particle: 'kara' },

  { tier: 'side', intro: [
    ['mio', "Okay, now I say them. When I talk, I'm わたし. So it's my side now, not yours."],
  ], speaker: 'mio' },
  { kind: 'watch', g: 'eric', r: 'mio', item: 'coffee', speaker: 'mio', gaps: ['verb'], choices: ['ageru', 'kureru', 'morau'],
    after: [['mio', "See. You gave it, but for me it came in. So くれる."]] },
  { kind: 'watch', g: 'mio', r: 'mori', item: 'cornsoup', speaker: 'mio', gaps: ['verb'], choices: ['ageru', 'kureru', 'morau'],
    after: [['mio', 'He likes it, I don\'t. Everybody wins.']] },
  { kind: 'watch', g: 'mori', r: 'kenji', item: 'tea', speaker: 'kenji', frame: 'receiver', gaps: ['particle', 'verb'],
    before: [['kenji', 'Kenji turn! Kenji is わたし!', { face: 'grin' }]] },
  { tier: 'end', outro: [
    ['mori', '{みなさん|minasan|everyone}、{ありがとうございます|arigatō gozaimasu|thank you}。', { jp: true, en: 'Thank you, everyone.', face: 'smile' }],
    ['mio', "Tomorrow he thanks every one of us. One by one. You'll see."],
  ] },
];

const PEOPLE_IDS = ['eric', 'mio', 'mori', 'kenji'];
const pickOne = (list, not = []) => {
  const ok = list.filter(x => !not.includes(x));
  return ok[Math.floor(Math.random() * ok.length)];
};

/** For Play again: the same rounds with other people and drinks, keeping each one's direction to the speaker. */
export function remix(round) {
  // The setup lines are for the first run; the later tier lines stay as reminders.
  if (!round.kind) return round.tier === 'ageru' ? { ...round, intro: [] } : round;
  const s = round.speaker || 'eric';
  const rel = round.g === s ? 'out' : round.r === s ? 'in' : 'side';
  let g, r;
  if (rel === 'out') [g, r] = [s, pickOne(PEOPLE_IDS, [s])];
  else if (rel === 'in') [g, r] = [pickOne(PEOPLE_IDS, [s]), s];
  else {
    g = pickOne(PEOPLE_IDS, [s]);
    r = pickOne(PEOPLE_IDS, [s, g]);
  }
  return { ...round, g, r, item: pickOne(Object.keys(ITEMS)), before: null, after: null, showEn: false };
}
