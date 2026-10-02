// Favours: B2 in the afternoon, everyone wants something done. ～たい is wanting to do it
// yourself; Yに～てほしい is wanting Y to do it. The player hands each job to whoever will do it,
// and when that is a machine, Eric says the command (the -te words day 1 teaches; README.md, Favours).

export const MACHINES = {
  copier: { jp: 'コピーき', en: 'Copier' },
  kettle: { jp: 'やかん', en: 'Kettle' },
  alarm: { jp: 'アラーム', en: 'Rack alarm' },
};

// The -te commands Eric can say; ids match game3d/js/lang.js, and the last field plays Mio's clip.
export const COMMANDS = {
  matte: '{まって|matte|wait|matte}',
  akete: '{あけて|akete|open|akete}',
  ugoite: '{うごいて|ugoite|move, work|ugoite}',
  tomatte: '{とまって|tomatte|stop|tomatte}',
  irete: '{いれて|irete|pour, make (tea)|irete}',
};

const TAI = '*{たい|tai|want to}*';
const HOSHII = '*{ほしい|hoshii|want (someone to)}*';

// who: who says it. doer: who (or what) will do it. job: the card's words.
// command: when a machine does it, the word Eric says to it.
export const SCRIPT = [
  { intro: [
    ['mio', "Afternoon. Everybody here wants something, and nobody does it themselves."],
    ['mio', "Read who says it, then give the job to whoever is going to actually do it."],
  ] },
  { who: 'kenji', doer: 'kenji', showEn: true, job: ['メロンソーダをのむ', 'drink a melon soda'],
    line: `メロンソーダが{のみ|nomi|drink}${TAI}…`, en: 'I want to drink a melon soda...',
    after: [['mio', 'たい is want to. He wants to do it, so he does it himself.']] },
  { who: 'mio', doer: 'mio', showEn: true, job: ['かえる', 'go home'],
    line: `{かえり|kaeri|go home}${TAI}。`, en: 'I want to go home.',
    after: [['mio', 'Not yet though.', { face: 'tired' }]] },

  { intro: [['mio', "Now the other one. てほしい is when you want somebody else to do it. に is who."]] },
  { who: 'mio', doer: 'kenji', job: ['ドアをあける', 'open the door'],
    line: `{ケンジくん||Kenji}に ドアを {あけて|akete|open|akete}${HOSHII}。`, en: 'I want Kenji to open the door.',
    after: [['kenji', 'Door! Open! Hot from servers, yes.', { face: 'grin' }]] },
  { who: 'mori', doer: 'eric', command: 'irete', at: 'kettle', job: ['おちゃをいれる', 'make the tea'],
    line: `{エリックさん||Eric}に おちゃを {いれて|irete|pour, make (tea)|irete}${HOSHII}です。`, en: 'I would like Eric to make the tea.',
    after: [['mori', '{ありがとうございます|arigatō gozaimasu|thank you}。', { jp: true, en: 'Thank you.', face: 'smile' }]] },
  { who: 'kenji', doer: 'mori', job: ['まつ', 'wait'],
    line: `{モリさん||Mr. Mori}に {まって|matte|wait|matte}${HOSHII}！`, en: 'I want Mr. Mori to wait!' },

  { intro: [['mio', "And sometimes it's not a person."]] },
  { who: 'mori', doer: 'copier', command: 'ugoite', job: ['うごく', 'work'],
    line: `コピーきに {うごいて|ugoite|move, work|ugoite}${HOSHII}ですね…`, en: 'I wish the copier would work...',
    after: [['mori', '{おお|ō|oh}…！', { jp: true, en: 'Oh...!', face: 'smile' }]] },
  { who: 'mio', doer: 'mio', job: ['コーヒーをのむ', 'drink a coffee'],
    line: `コーヒーが{のみ|nomi|drink}${TAI}。`, en: 'I want to drink a coffee.',
    before: [['mio', "Careful, this one's mine."]] },
  { who: 'mio', doer: 'alarm', command: 'tomatte', job: ['とまる', 'stop'],
    line: `アラームに {とまって|tomatte|stop|tomatte}${HOSHII}。`, en: 'I want the alarm to stop.',
    after: [['mio', "Thank you. Don't tell anyone how.", { face: 'smile' }]] },
  { own: true, who: 'mio',
    line: '{エリックさん||Eric}は？ {なに|nani|what}が{し|shi|do}たいですか。', en: 'And you? What do you want to do?',
    options: [['{かえり|kaeri|go home}たいです。', 'I want to go home.'], ['{ねたい|netai|want to sleep}です。', 'I want to sleep.'], ['{たべ|tabe|eat}たいです。', 'I want to eat.']] },
  { intro: [['mio', 'Same. Two more hours.', { face: 'tired' }]] },
];
