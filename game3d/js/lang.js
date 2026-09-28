// The few Japanese words in day one. Every one is shown with its reading and English, every time.
// The four commands are the ones Mio can say to make things happen.

export const WORDS = {
  matte: { ja: '待って', alias: ['まって'], ro: 'matte', en: 'wait', cmd: true, voice: 'eric-matte' },
  akete: { ja: '開けて', alias: ['あけて'], ro: 'akete', en: 'open', cmd: true, voice: 'eric-akete' },
  kite: { ja: '来て', ro: 'kite', en: 'come', cmd: true, voice: 'eric-kite' },
  ugoite: { ja: '動いて', alias: ['うごいて'], ro: 'ugoite', en: 'work, move', cmd: true, voice: 'eric-ugoite' },
  irete: { ja: '入れて', ro: 'irete', en: 'pour, make (tea)', cmd: true, voice: 'eric-irete' },
  dashite: { ja: '出して', ro: 'dashite', en: 'give it out', cmd: true, voice: 'eric-dashite' },
  tomatte: { ja: '止まって', ro: 'tomatte', en: 'stop', cmd: true, voice: 'eric-tomatte' },
  honsha: { ja: '本社', ro: 'honsha', en: 'head office' },
  tsugiwa: { ja: 'つぎは', ro: 'tsugi wa', en: 'next' },
  ohayo: { ja: 'おはようございます', alias: ['おはよう'], ro: 'ohayō gozaimasu', en: 'good morning', phrase: true, voice: 'eric-ohayo' },
  yoroshiku: { ja: 'よろしくおねがいします', alias: ['よろしくお願いします', 'よろしく'], ro: 'yoroshiku onegaishimasu', en: 'nice to meet you', phrase: true, voice: 'eric-yoroshiku' },
  sumimasen: { ja: 'すみません', alias: ['すいません'], ro: 'sumimasen', en: 'excuse me, sorry', phrase: true, voice: 'eric-sumimasen' },
  otsukare: { ja: 'お疲れさまです', ro: 'otsukaresama desu', en: 'the everyday hello at work' },
  gaijin: { ja: '外人', ro: 'gaijin', en: 'foreigner' },
  kotodama: { ja: '言霊', ro: 'kotodama', en: 'words with power in them' },
};
export const COMMANDS = ['matte', 'akete', 'kite', 'ugoite', 'irete', 'dashite', 'tomatte'];
export const PHRASES = ['ohayo', 'yoroshiku', 'sumimasen'];
export const SAYABLE = [...PHRASES, ...COMMANDS];

export const known = new Set();
export function learn(id) { const isNew = !known.has(id); known.add(id); return isNew; }

const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// words Eric has met in a glossed line; he recognises them inside overheard Japanese
export const seen = new Set();
export function wordHTML(id) {
  const w = WORDS[id]; seen.add(id);
  return `<span class="jp" data-w="${id}">${w.ja}</span> <span class="gl">(${w.ro}, ${w.en})</span>`;
}
// A line: plain text with {id} for words.
export function lineHTML(text) {
  return esc(text).replace(/\{(\w+)\}/g, (_, id) => (WORDS[id] ? wordHTML(id) : id));
}
// the command as a button face: Japanese big, reading and English under it
export function cmdHTML(id) {
  const w = WORDS[id];
  return `<span class="jp">${w.ja}</span><span class="rd">${w.ro} · ${w.en}</span>`;
}
