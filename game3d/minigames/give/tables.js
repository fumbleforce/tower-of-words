// Friday drinks: four rounds of B2's drink swap. In each one everybody at the table gave one drink
// and got one, and the player draws who gave what from what people say (README.md, Friday drinks).
// Every clue sentence is built here from who said it and which hand-over it is about, so the
// Japanese always follows from the scene.

import { nameFor } from '../common/cast.js';

export const ITEMS = {
  coffee: { jp: 'コーヒー', en: 'a coffee', the: 'the coffee' },
  tea: { jp: 'こうちゃ', en: 'a tea', the: 'the tea' },
  melon: { jp: 'メロンソーダ', en: 'a melon soda', the: 'the melon soda' },
  cornsoup: { jp: 'コーンスープ', en: 'a corn soup', the: 'the corn soup' },
  choco: { jp: 'チョコ', en: 'some chocolate', the: 'the chocolate' },
  onigiri: { jp: 'おにぎり', en: 'a rice ball', the: 'the rice ball' },
};

export const VERBS = {
  ageru: '{あげました|agemashita|gave (away from the one talking)}',
  kureru: '{くれました|kuremashita|gave (to the one talking)}',
  morau: '{もらいました|moraimashita|got, received}',
};

export const EN = { eric: 'Eric', mio: 'Mio', mori: 'Mori-san', kenji: 'Kenji' };

const item = id => `{${ITEMS[id].jp}||${ITEMS[id].en.replace(/^(a|some) /, '')}}`;
const WA = '{は|wa|(marks who the sentence is about)}';
const GA = '{が|ga|(marks who did it)}';
const NI_TO = '{に|ni|to}';
const PARTICLE = { ni: '{に|ni|from (with もらう)}', kara: '{から|kara|from}' };

/** Who gave to whom in a round: { giver: getter }. Items: { getter: item }. */
export const giverOf = (round, r) => Object.keys(round.gifts).find(g => round.gifts[g][0] === r);

/**
 * One clue as markup and English. A clue is about one hand-over (`of`, the giver) and said by
 * `by`. say: 'ageru' (the giver: I gave X to Y), 'item' (the giver: I gave the X; look who holds it),
 * 'kureru' (the getter: X gave it to me), 'morau' (the getter: I got it from X), 'silent'.
 * me: say わたし out loud (early rounds); people drop it once the player is used to them.
 */
export function clueLine(round, clue) {
  if (clue.say === 'silent') return { jp: '…', en: clue.note };
  const g = clue.of, [r, thing] = round.gifts[g];
  const N = id => nameFor(id, clue.by), I = item(thing), V = `*${VERBS[clue.say === 'item' ? 'ageru' : clue.say]}*`;
  const ME = `{わたし|watashi|I, me}`;
  const who = id => (id === clue.by ? 'I' : EN[id]), whom = id => (id === clue.by ? 'me' : EN[id]);
  switch (clue.say) {
    case 'ageru':
      return { jp: `${clue.me ? `${ME}${WA} ` : ''}${N(r)}${NI_TO} ${I}を ${V}。`, en: `${who(g)} gave ${whom(r)} ${ITEMS[thing].en}.` };
    case 'item':
      return { jp: `${ME}${WA} ${I}を ${V}。`, en: `I gave ${ITEMS[thing].the}.` };
    case 'kureru':
      return { jp: `${N(g)}${GA} ${clue.me ? `${ME}${NI_TO} ` : ''}${I}を ${V}。`, en: `${who(g)} gave ${whom(r)} ${ITEMS[thing].en}.` };
    case 'morau':
      return { jp: `${clue.me ? `${ME}${WA} ` : ''}${N(g)}${PARTICLE[clue.p || 'ni']} ${I}を ${V}。`, en: `${who(r)} got ${ITEMS[thing].en} from ${whom(g)}.` };
  }
  throw new Error(`unknown clue ${clue.say}`);
}

/** The hand-over as one plain あげました sentence, for the notebook at the end. */
export function record(round, g) {
  const [r, thing] = round.gifts[g];
  return { jp: `${nameFor(g, null)}${WA} ${nameFor(r, null)}${NI_TO} ${item(thing)}を ${VERBS.ageru}。`, en: `${EN[g]} gave ${EN[r]} ${ITEMS[thing].en}.` };
}

/** What Mio says when a hand-over was drawn wrong: how its clue gives it away. */
export function why(round, r) {
  const g = giverOf(round, r), clue = round.clues.find(c => c.of === g);
  const [, thing] = round.gifts[g];
  const s = id => (id === 'mio' ? 'I' : EN[id]), obj = id => (id === 'mio' ? 'me' : EN[id]);
  const S = s(clue.by), the = ITEMS[thing].the;
  switch (clue.say) {
    case 'ageru':
      return `${S} said あげました, so it went away from ${obj(clue.by)}, to whoever has に. That's ${EN[r]}.`;
    case 'item':
      return `${S} said ${S === 'I' ? 'I' : 'they'} gave ${the}, and look who's holding ${the}. That's ${EN[r]}.`;
    case 'kureru':
      return `${S} said くれました. That one always comes in to whoever is talking, so ${S} got it, from whoever has が. That's ${EN[g]}.`;
    case 'morau':
      return `${S} said もらいました, so ${S} got it. The one with ${clue.p === 'kara' ? 'から' : 'に'} gave it, that's ${EN[g]}.`;
    default:
      return `Nobody said that one. But everybody gave one and got one, so it's the one left over. That's ${EN[g]}.`;
  }
}

// Lines when someone is thanked for a drink they didn't give: [face, line].
export const NOT_ME = {
  mio: ['deadpan', "Hm? That wasn't me. I bought something else."],
  kenji: ['grin', 'Kenji? Kenji gave... okay! You are welcome!'],
  mori: ['flustered', '{え|e|huh}？ {わたし|watashi|me}？'],
  eric: ['tired', "That wasn't me. I drew that arrow myself, too."],
};

// The four rounds. who: who is at the table. gifts: giver -> [getter, item]. clues: what people
// say, in order. fill: Eric says one hand-over himself at the end (frame, the gaps, and Mori's ask).
// intro/after: [who, line, opts] lines around the round.
export const ROUNDS = [
  {
    tier: 'ageru', showEn: true, who: ['mio', 'kenji', 'mori'],
    gifts: { mio: ['kenji', 'melon'], kenji: ['mori', 'cornsoup'], mori: ['mio', 'tea'] },
    clues: [
      { by: 'mio', of: 'mio', say: 'ageru', me: true },
      { by: 'kenji', of: 'kenji', say: 'ageru', me: true },
      { by: 'mori', of: 'mori', say: 'silent', note: "(Mori-san never says what he gave.)" },
    ],
    intro: [
      ['mio', "So, Fridays. Everybody buys a drink from the machine for somebody else, and then you thank whoever gave you yours. It's Mori-san's thing."],
      ['mio', "Nobody watches who puts what where, so he wants it drawn out first. That's you. Drag from the one who gave, to the one who got it."],
    ],
    after: [
      ['mio', "Tea again. He knows I don't drink tea. He does it anyway.", { face: 'deadpan' }],
      ['kenji', 'Melon soda! Is best! Thank you, Mio-san!', { face: 'grin' }],
    ],
  },
  {
    tier: 'kureru', who: ['mio', 'kenji', 'mori', 'eric'],
    gifts: { kenji: ['mio', 'coffee'], eric: ['kenji', 'melon'], mio: ['mori', 'choco'], mori: ['eric', 'onigiri'] },
    clues: [
      { by: 'mio', of: 'kenji', say: 'kureru', me: true },
      { by: 'kenji', of: 'eric', say: 'kureru' },
      { by: 'mio', of: 'mio', say: 'ageru' },
      { by: 'mori', of: 'mori', say: 'silent', note: '(Still not saying.)' },
    ],
    intro: [
      ['kenji', 'Round two! Kenji went to the machine again!', { face: 'grin' }],
      ['mio', "When it comes to whoever is talking, it's くれました, not あげました. So watch who's talking. And you're in this one."],
    ],
    after: [['mori', '{どうぞ|dōzo|here you are}。', { jp: true, en: 'Here you are.', face: 'smile' }]],
    fill: { g: 'mori', frame: 'kureru' },
  },
  {
    tier: 'morau', who: ['mio', 'kenji', 'mori', 'eric'],
    gifts: { mori: ['kenji', 'choco'], kenji: ['mio', 'onigiri'], eric: ['mori', 'cornsoup'], mio: ['eric', 'coffee'] },
    clues: [
      { by: 'kenji', of: 'mori', say: 'morau', me: true },
      { by: 'mio', of: 'kenji', say: 'morau', p: 'kara' },
      { by: 'mori', of: 'eric', say: 'morau' },
      { by: 'mio', of: 'mio', say: 'silent', note: '(Mio has her headphones on.)' },
    ],
    intro: [
      ['mio', "Last new one. もらいました is got. The one talking got it, and に or から is who gave it."],
    ],
    after: [['mio', "Don't make it weird. It's one coffee.", { face: 'embarrassed' }]],
  },
  {
    tier: 'mixed', who: ['mio', 'kenji', 'mori', 'eric'],
    gifts: { mio: ['kenji', 'tea'], mori: ['eric', 'cornsoup'], eric: ['mio', 'coffee'], kenji: ['mori', 'melon'] },
    clues: [
      { by: 'kenji', of: 'mio', say: 'kureru' },
      { by: 'mori', of: 'mori', say: 'item' },
      { by: 'mio', of: 'eric', say: 'morau' },
      { by: 'kenji', of: 'kenji', say: 'silent', note: '(Kenji is staring at his tea.)' },
    ],
    intro: [['mio', 'Last round. Everything mixed now.']],
    after: [
      ['mio', 'He said what he gave. He never says that.', { face: 'surprised' }],
      ['mori', '{あ|a|oh}… {こうちゃ|kōcha|tea}…', { jp: true, en: 'Oh... the tea...', face: 'flustered' }],
      ['mio', "It's a good tea. That's why I gave it to Kenji.", { face: 'deadpan' }],
    ],
    fill: { g: 'mori', frame: 'morau' },
  },
];

const shuffle = list => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * For Play again: the same rounds with Mio, Kenji and Mori swapped round and other drinks, so the
 * clues have to be read again. The lines written for the first run go, the rule lines stay.
 */
export function remix(rounds) {
  const ids = ['mio', 'kenji', 'mori'], order = shuffle(ids);
  const to = Object.fromEntries(ids.map((id, i) => [id, order[i]]));
  const kinds = Object.keys(ITEMS), drinks = shuffle(kinds);
  const swap = Object.fromEntries(kinds.map((k, i) => [k, drinks[i]]));
  const p = id => to[id] || id;
  return rounds.map(r => ({
    ...r,
    intro: r.tier === 'ageru' ? [] : r.intro.filter(([who]) => who === 'mio').slice(-1),
    after: [],
    who: r.who.map(p),
    gifts: Object.fromEntries(Object.entries(r.gifts).map(([g, [x, it]]) => [p(g), [p(x), swap[it]]])),
    clues: r.clues.map(c => ({ ...c, by: p(c.by), of: p(c.of), note: c.say === 'silent' ? "(Nobody says this one.)" : c.note })),
    fill: r.fill && { ...r.fill, g: p(r.fill.g) },
    showEn: false,
  }));
}
