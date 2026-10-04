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

  kenji: { kind: 'person', jp: 'ケンジさん', r: 'Kenji-san', en: 'Kenji', likes: ['cola', 'coffee', 'pudding'] },
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
  mo: { jp: 'も', r: 'mo', en: 'too', what: 'After a command, ミオさんにも sends the same thing to one more person. It doesn’t use up a command.', ex: '{ミオさんにも|Mio-san ni mo|to Mio too} {だして|dashite|put out}' },
  minna: { jp: 'みんな', r: 'minna', en: 'everyone', what: 'みんなに sends one to everyone in the room. Once a shift.', ex: '{みんなに|minna ni|to everyone} {コーヒーを|kōhī o|coffee} {だして|dashite|put out}' },
  matte: { jp: 'まって', r: 'matte', en: 'wait', what: 'Ask everyone to wait: every request gets two more dots. Once a shift, and it doesn’t use up a command.', ex: '{みなさん、まってください|minasan, matte kudasai|everyone, please wait}', clip: 'matte' },
  kudasai: { jp: 'ください', r: 'kudasai', en: 'please', what: 'Every command ends in ください. Polite commands score double.', ex: '{だしてください|dashite kudasai|put it out, please}' },
};

/** What people say. Each line: [markup, English]. People ask politely, the way colleagues do at work. */
export const LINES = {
  ask: {
    kenji: { cola: ['{コーラを|kōra o|a cola} {ください|kudasai|please}！', 'A cola, please!'], coffee: ['{コーヒーが|kōhī ga|coffee} {のみたいです|nomitai desu|I’d like to drink}…', 'I could use a coffee…'], pudding: ['{プリンが|purin ga|pudding} {たべたいです|tabetai desu|I’d like to eat}！', 'I’d love a pudding!'] },
    mio: { coffee: ['{コーヒー|kōhī|coffee}、{いいですか|ii desu ka|may I}？', 'Could I have a coffee?'], tea: ['{おちゃを|ocha o|tea} {ください|kudasai|please}。', 'Tea, please.'], pudding: ['{プリン|purin|pudding}… {ありますか|arimasu ka|is there any}？', 'Is there any pudding?'] },
    mori: { tea: ['{おちゃを|ocha o|tea} {おねがいします|onegai shimasu|please}。', 'Tea, please.'], coffee: ['{コーヒーを|kōhī o|coffee} {おねがいします|onegai shimasu|please}。', 'Coffee, please.'], pudding: ['{プリンを|purin o|pudding}… {おねがいします|onegai shimasu|please}。', 'A pudding… please.'] },
    tama: { milk: ['{にゃあ|nyā|meow}。', 'Meow.'] },
  },
  served: {
    kenji: ['{やった|yatta|yes}！{ありがとうございます|arigatō gozaimasu|thank you}！', 'Yes! Thank you!'],
    mio: ['{ありがとうございます|arigatō gozaimasu|thank you}。', 'Thank you.'],
    mori: ['{たすかります|tasukarimasu|that helps a lot}。', 'That’s a great help.'],
    tama: ['{ごろごろ|goro goro|purr}…', 'Purr…'],
  },
  spare: {
    kenji: ['{え|e|huh}、{これですか|kore desu ka|this one}？', 'Huh, this one?'],
    mio: ['…{これじゃないです|kore ja nai desu|it’s not this}。', '…That’s not it.'],
    mori: ['{あの|ano|um}… {ちがいます|chigaimasu|that’s wrong}。', 'Um… that’s not it.'],
    tama: ['…', '(Tama sniffs it and looks away.)'],
  },
  launched: {
    kenji: ['{うわっ|uwa|whoa}！', 'Whoa!'],
    mio: ['…{エリックさん|Erikku-san|Eric}。', '…Eric.'],
    mori: ['！？', '!?'],
  },
  expired: {
    kenji: ['{もう|mō|already} {いいです|ii desu|it’s fine}…', 'Never mind…'],
    mio: ['…{じぶんで|jibun de|myself} {かいます|kaimasu|I’ll buy it}。', '…I’ll get it myself.'],
    mori: ['…{もう|mō|already} {けっこうです|kekkō desu|no thank you}。', '…No, it’s fine now.'],
    tama: ['…', '(Tama gives up and leaves.)'],
  },
};

/** Mio's coaching, one line at a time, in the strip over the room. [markup, English]. */
export const COACH = {
  first: ['{ケンジさんは|Kenji-san wa|Kenji} {コーラです|kōra desu|wants a cola}。', 'Kenji wants a cola: ケンジさんに, コーラを, then だして.'],
  second: ['{つぎは|tsugi wa|next is} {わたしです|watashi desu|me}。', 'Now Mio wants a coffee. Same as before: ミオさんに, コーヒーを, then だして.'],
  order: ['{どちらでも|dochira demo|either way} {いいですよ|ii desu yo|is fine}。', 'Either order works. The particle says who is who.'],
  shift2: ['{ふたりとも|futari tomo|both of them} {コーヒーです|kōhī desu|want coffee}。', 'Kenji and Mori both want coffee. One command can serve both, for 2 × 2 points.'],
  shift2how: ['{ふたりとも|futari tomo|both of them} {コーヒーです|kōhī desu|want coffee}。', 'Kenji and Mori both want coffee. ケンジさんと モリさんに serves both in one command, for 2 × 2 points.'],
  pot: ['{おちゃは|ocha wa|tea} {ポットです|potto desu|is the pot}。', 'Tea comes from the pot: おちゃを いれて.'],
  shift3: ['{タマは|Tama wa|Tama} {ミルクです|miruku desu|wants milk}。', 'Mori’s pudding and Tama’s milk are in the fridge. タマに ミルクを.'],
  expired: [null, 'Their dots ran out, so they gave up. That costs a heart.'],
  shiftEnd: ['{おつかれさまです|otsukaresama desu|good work}。', 'Good work.'],
};

/** The shift's goal, shown on the wall the whole time. */
export const GOAL = 'Serve each request before its dots run out';

/**
 * The first command, one step at a time: each step is two taps or one, with a hand on the next tap.
 * A tap is [kind, id]: a person or item in the room, a particle on the pad, or the verb.
 */
export const TUTORIAL = [
  { taps: [['thing', 'kenji'], ['p', 'ni']], text: 'Tap <b>Kenji</b>, then <b class="p-ni">に</b> <i>(to)</i>' },
  { taps: [['thing', 'cola'], ['p', 'o']], text: 'Tap the <b>cola</b>, then <b class="p-o">を</b> <i>(what)</i>' },
  { taps: [['fire']], text: 'Press <b class="p-ni">だして</b> <i>(put out)</i>' },
];

/** と, taught the first time two people want the same thing (shift 2): one hand per tap. */
export const TO_STEP = 'と means “and”: tap <b>Kenji</b>, <b class="p-to">と</b>, <b>Mori</b>, <b class="p-ni">に</b>, then <b>coffee</b> <b class="p-o">を</b>';

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
