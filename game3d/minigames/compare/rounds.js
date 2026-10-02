// Lunch run: Eric gets lunch for B2 from the canteen counter. What each dish costs, how big it
// is and how hot it is are on the counter; the rounds ask the player to read and make
// comparisons about them (README.md, Lunch run). The likes here are for this game only, not
// cast facts.

export const DISHES = {
  ramen: { jp: 'ラーメン', en: 'ramen', price: 650, size: 3, hot: 2 },
  curry: { jp: 'カレー', en: 'curry', price: 580, size: 2, hot: 3 },
  udon: { jp: 'うどん', en: 'udon', price: 420, size: 2, hot: 0 },
  yakisoba: { jp: 'やきそば', en: 'yakisoba', price: 480, size: 2, hot: 1 },
};

export const ADJ = {
  yasui: { jp: '{やすい|yasui|cheap}', en: 'cheap', key: 'price', low: true },
  ookii: { jp: '{おおきい|ookii|big}', en: 'big', key: 'size' },
  karai: { jp: '{からい|karai|spicy, hot}', en: 'spicy', key: 'hot' },
};

const D = id => `{${DISHES[id].jp}||${DISHES[id].en}}`;
export const dishMarkup = D;

/** Which of these dishes wins on an adjective (cheapest, biggest, hottest). */
export function best(ids, adj) {
  const { key, low } = ADJ[adj];
  return [...ids].sort((a, b) => (low ? DISHES[a][key] - DISHES[b][key] : DISHES[b][key] - DISHES[a][key]))[0];
}

// kind 'give': read what someone wants, carry the dish to their tray.
// kind 'compare': a question about two dishes on the counter; put them in order in AはBより….
// kind 'pick': tap the dish that answers an いちばん question.
// kind 'rank': dishes under lids and two clues; put them in order, hottest first.
// kind 'own': the player's own answer; any dish is right.
export const SCRIPT = [
  { intro: [
    ['mio', "Hey, can you get lunch for everybody from the canteen? I can't leave the servers right now.", { face: 'phone' }],
    ['mio', "I'll tell you what everyone wants. Just put it on their tray.", { face: 'phone' }],
  ] },
  { kind: 'give', on: ['ramen', 'udon'], who: 'kenji', want: 'ramen', showEn: true,
    line: `${D('ramen')}が{すき|suki|like}です！`, en: 'I like ramen!',
    after: [['mio', 'すき is like. He likes everything, honestly.', { face: 'phone' }]] },
  { kind: 'give', on: ['ramen', 'udon'], who: 'mori', want: 'udon', showEn: true,
    ask: ['mio', `${D('ramen')}と${D('udon')}、{どちら|dochira|which (of two)}の{ほう|hō|side, one}が{すき|suki|like}ですか。`, 'Ramen or udon, which do you like more?'],
    line: `${D('udon')}*の{ほう|hō|side, one}が*{すき|suki|like}です。`, en: 'I like udon more.',
    after: [['mio', 'のほうが is like, that one, more. Udon is his whole life.', { face: 'phone' }]] },
  { kind: 'give', on: ['ramen', 'curry'], who: 'mio', want: 'curry',
    before: [['mio', 'Okay, mine. Careful.', { face: 'phone' }]],
    line: `${D('ramen')}*{より|yori|than}*${D('curry')}のほうがすき。`, en: 'I like curry more than ramen.',
    after: [['mio', 'より is than. The one before より loses.', { face: 'phone' }]] },

  { kind: 'compare', on: ['curry', 'ramen'], who: 'kenji', adj: 'yasui',
    ask: ['kenji', `${D('curry')}と${D('ramen')}、どちらのほうが{やすい|yasui|cheap}ですか。`, 'Curry or ramen, which is cheaper?'],
    before: [['mio', 'Kenji is asking you something. Answer him, look at the prices.', { face: 'phone' }]] },
  { kind: 'compare', on: ['ramen', 'udon'], who: 'mori', adj: 'ookii',
    ask: ['mori', `${D('ramen')}と${D('udon')}、どちらのほうが{おおきい|ookii|big}ですか。`, 'Ramen or udon, which is bigger?'] },

  { kind: 'pick', on: ['ramen', 'udon', 'yakisoba'], who: 'kenji', adj: 'yasui',
    ask: ['kenji', `どれが*{いちばん|ichiban|the most, number one}*{やすい|yasui|cheap}ですか。`, 'Which one is the cheapest?'],
    before: [['mio', 'いちばん is number one. Most. For three or more you say どれ, not どちら.', { face: 'phone' }]],
    after: [['kenji', 'Udon! Cheap! Kenji... money is little.', { face: 'sheepish' }]] },
  { kind: 'rank', on: ['curry', 'ramen', 'yakisoba'], who: 'mio', adj: 'karai',
    before: [
      ['kenji', 'Eh? This week... all is spicy?! Kenji cannot spicy!', { face: 'sheepish' }],
      ['mio', "Spicy week. They put lids on so you can't see. Ask at the counter.", { face: 'phone' }],
    ],
    by: 'cook',
    clues: [
      [`${D('curry')}は${D('ramen')}*より*{からい|karai|spicy}です。`, 'Curry is spicier than ramen.'],
      [`${D('ramen')}は${D('yakisoba')}*より*{からい|karai|spicy}です。`, 'Ramen is spicier than yakisoba.'],
    ],
    after: [['mio', 'Okay so his ramen is out. He gets the least spicy one.', { face: 'phone' }]] },
  { kind: 'give', on: ['curry', 'ramen', 'yakisoba'], who: 'kenji', want: 'yakisoba',
    prompt: ['mio', 'Give Kenji the least spicy one.', { face: 'phone' }],
    after: [['kenji', 'やきそば… safe. Thank you, Eric-san.', { face: 'grin' }]] },
  { kind: 'own', on: ['ramen', 'curry', 'udon', 'yakisoba'], who: 'mio',
    ask: ['mio', `エリックさんは？ この{なか|naka|among these}で、どれがいちばん{すき|suki|like}ですか。`, 'And you? Of these, which do you like best?', { face: 'phone' }] },
  { outro: [['mio', 'Okay. Bring it down, the servers are warm, we eat here.', { face: 'phone' }]] },
];
