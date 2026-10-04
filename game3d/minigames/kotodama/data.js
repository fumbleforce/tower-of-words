// Kotodama's words, machines, people, lines and shifts. Who the people are is docs/game/cast.md;
// the machines are B2's (docs/game/places.md: the vending machine by the lift, the thermos pot and the
// fridge in the kitchenette). Japanese uses the minigames' markup (common/jp.js).

/** Things in the room. Every one can be a word in a command. */
export const THINGS = {
  vend: { kind: 'machine', jp: 'じはんき', r: 'jihanki', en: 'vending machine', verb: 'dashite', makes: ['cola', 'coffee'] },
  pot: { kind: 'machine', jp: 'ポット', r: 'potto', en: 'hot-water pot', verb: 'irete', makes: ['tea'] },
  fridge: { kind: 'machine', jp: 'れいぞうこ', r: 'reizōko', en: 'fridge', verb: 'dashite', makes: ['milk', 'pudding'] },

  cola: { kind: 'item', jp: 'コーラ', r: 'kōra', en: 'cola', a: 'a cola', from: 'vend' },
  coffee: { kind: 'item', jp: 'コーヒー', r: 'kōhī', en: 'coffee', a: 'a coffee', from: 'vend' },
  tea: { kind: 'item', jp: 'おちゃ', r: 'ocha', en: 'tea', a: 'tea', from: 'pot' },
  milk: { kind: 'item', jp: 'ミルク', r: 'miruku', en: 'milk', a: 'milk', from: 'fridge' },
  pudding: { kind: 'item', jp: 'プリン', r: 'purin', en: 'pudding', a: 'a pudding', from: 'fridge' },

  kenji: { kind: 'person', jp: 'ケンジくん', r: 'Kenji-kun', en: 'Kenji', likes: ['cola', 'coffee', 'pudding'] },
  mio: { kind: 'person', jp: 'ミオさん', r: 'Mio-san', en: 'Mio', likes: ['coffee', 'tea', 'pudding'] },
  mori: { kind: 'person', jp: 'モリさん', r: 'Mori-san', en: 'Mr. Mori', likes: ['tea', 'coffee', 'pudding'] },
  tama: { kind: 'cat', jp: 'タマ', r: 'Tama', en: 'Tama', likes: ['milk'] },
  minna: { kind: 'all', jp: 'みんな', r: 'minna', en: 'everyone' },
};

export const VERBS = {
  dashite: { jp: 'だして', r: 'dashite', en: 'put out', clip: 'dashite' },
  irete: { jp: 'いれて', r: 'irete', en: 'make', clip: 'irete' },
};

/** Particles as tiles. role: what the particle marks in a command. */
export const PARTICLES = {
  o: { jp: 'を', r: 'o', en: 'what', key: 'o' },
  ni: { jp: 'に', r: 'ni', en: 'to, for', key: 'n' },
  to: { jp: 'と', r: 'to', en: 'and', key: 't' },
  nimo: { jp: 'にも', r: 'ni mo', en: 'to … too', key: 'm' },
};

/** Power words, offered between shifts (three of these four, pick one). */
export const POWERS = {
  mo: { jp: 'も', r: 'mo', en: 'too', what: 'After a command, ミオさんにも sends the same again to someone else. Free, once a turn.', ex: '{ミオさんにも|Mio-san ni mo|to Mio too} {だして|dashite|put out}' },
  minna: { jp: 'みんな', r: 'minna', en: 'everyone', what: 'みんなに: everyone in the room gets one. Once a shift.', ex: '{みんなに|minna ni|to everyone} {コーヒーを|kōhī o|coffee} {だして|dashite|put out}' },
  matte: { jp: 'まって', r: 'matte', en: 'wait', what: 'みんな、まって: everyone waits two commands longer. Free, once a shift.', ex: '{みんな、まって|minna, matte|everyone, wait}', clip: 'matte' },
  kudasai: { jp: 'ください', r: 'kudasai', en: 'please', what: 'Commands end in ください. Polite commands score double.', ex: '{だしてください|dashite kudasai|put it out, please}' },
};

/** What people say. Each line: [markup, English]. */
export const LINES = {
  ask: {
    kenji: { cola: ['{コーラ|kōra|cola}、{ちょうだい|chōdai|give me}！', 'Cola, please!'], coffee: ['{コーヒー|kōhī|coffee}、{のみたい|nomitai|I want to drink}…', 'I want a coffee…'], pudding: ['{プリン|purin|pudding}、{たべたい|tabetai|I want to eat}！', 'I want a pudding!'] },
    mio: { coffee: ['{コーヒー|kōhī|coffee}、{おねがい|onegai|please}。', 'Coffee, please.'], tea: ['{おちゃ|ocha|tea}、{おねがい|onegai|please}。', 'Tea, please.'], pudding: ['{プリン|purin|pudding}…{ある|aru|is there}？', 'Is there pudding?'] },
    mori: { tea: ['{おちゃを|ocha o|tea} {おねがいします|onegai shimasu|please}。', 'Tea, please.'], coffee: ['{コーヒーを|kōhī o|coffee} {おねがいします|onegai shimasu|please}。', 'Coffee, please.'], pudding: ['{プリンを|purin o|pudding}… {おねがいします|onegai shimasu|please}。', 'A pudding… please.'] },
    tama: { milk: ['{にゃあ|nyā|meow}。', 'Meow.'] },
  },
  served: {
    kenji: ['{やった|yatta|yes}！{ありがとう|arigatō|thanks}！', 'Yes! Thanks!'],
    mio: ['{ありがと|arigato|thanks}。', 'Thanks.'],
    mori: ['{ありがとうございます|arigatō gozaimasu|thank you very much}。', 'Thank you very much.'],
    tama: ['{ごろごろ|goro goro|purr}…', 'Purr…'],
  },
  spare: {
    kenji: ['{え|e|huh}、{これ|kore|this}？', 'Huh, this?'],
    mio: ['…{これ|kore|this}、{ちがう|chigau|wrong}。', '…That’s not it.'],
    mori: ['{あの|ano|um}… {ちがいます|chigaimasu|that’s wrong}。', 'Um… that’s not it.'],
    tama: ['…', '(Tama sniffs it and looks away.)'],
  },
  launched: {
    kenji: ['{うわあ|uwā|whoa}！', 'Whoaaa!'],
    mio: ['…{エリックさん|Erikku-san|Eric}。', '…Eric.'],
    mori: ['！？', '!?'],
  },
  expired: {
    kenji: ['{もう|mō|already} {いい|ii|fine}…', 'Never mind…'],
    mio: ['{もう|mō|already} {いい|ii|fine}。', 'Forget it.'],
    mori: ['…{もう|mō|already} {けっこうです|kekkō desu|no thank you}。', '…No, it’s fine now.'],
    tama: ['…', '(Tama gives up and leaves.)'],
  },
};

/** Mio's coaching, one line at a time, in the strip over the room. [markup, English]. */
export const COACH = {
  first: ['ケンジくんが {コーラ|kōra|cola}。{だれに|dare ni|to whom}？ {なにを|nani o|what}？', 'Kenji wants a cola. Who gets it: に. What comes out: を. Then だして.'],
  second: ['{わたしは|watashi wa|me} {コーヒー|kōhī|coffee}。', "Now me: a coffee. Same again."],
  order: ['{どっちでも|dotchi demo|either way} {いいよ|ii yo|is fine}。', 'Either order works. The particle says who is who.'],
  shift2: ['{ふたり|futari|two people}とも {コーヒー|kōhī|coffee}。', 'Kenji and Mori both want coffee. Join them with と: ケンジくんと モリさんに. Two cans, one command.'],
  pot: ['{おちゃは|ocha wa|tea} {ポット|potto|pot}。', 'The pot makes tea: おちゃを いれて.'],
  shift3: ['タマは {ミルク|miruku|milk}。', "Mori’s pudding and Tama’s milk are in the fridge. タマに ミルクを."],
  shiftEnd: ['{おつかれさまです|otsukaresama desu|good work}。', 'Good work.'],
};

/**
 * The three shifts. script[i]: requests that arrive at the start of command i ([person, item]).
 * rate: chance a free person asks for something after each command; dup: chance they want what
 * someone else is already waiting for (so と pays). english: 'full' shows English and arrows.
 */
export const SHIFTS = [
  { time: '17:00', machines: ['vend'], people: ['kenji', 'mio'], turns: 5, patience: 5, rate: 0.6, dup: 0.3, english: 'full',
    script: [[['kenji', 'cola']], [['mio', 'coffee']]] },
  { time: '18:00', machines: ['vend', 'pot'], people: ['kenji', 'mio', 'mori'], turns: 6, patience: 4, rate: 0.9, dup: 0.6, english: 'tap',
    script: [[['kenji', 'coffee'], ['mori', 'coffee'], ['mio', 'tea']]] },
  { time: '19:00', machines: ['vend', 'pot', 'fridge'], people: ['kenji', 'mio', 'mori', 'tama'], turns: 7, patience: 3, rate: 1, dup: 0.6, english: 'tap',
    script: [[['tama', 'milk'], ['mori', 'pudding']]] },
];

export const HEARTS = 3;
/** Star lines for the end card (tuned by playing). */
export const STARS = [400, 1200, 2400];
