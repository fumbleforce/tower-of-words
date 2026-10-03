import * as DAY2 from '../story/day2/words.js';
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
  ohayo: {
    ja: 'おはようございます',
    alias: ['おはよう'],
    ro: 'ohayō gozaimasu',
    en: 'good morning',
    phrase: true,
    voice: 'eric-ohayo',
  },
  yoroshiku: {
    ja: 'よろしくおねがいします',
    alias: ['よろしくお願いします', 'よろしく'],
    ro: 'yoroshiku onegaishimasu',
    en: 'nice to meet you',
    phrase: true,
    voice: 'eric-yoroshiku',
  },
  sumimasen: {
    ja: 'すみません',
    alias: ['すいません'],
    ro: 'sumimasen',
    en: 'excuse me, sorry',
    phrase: true,
    voice: 'eric-sumimasen',
  },
  otsukare: { ja: 'お疲れさまです', ro: 'otsukaresama desu', en: 'the everyday hello at work' },
  // Eric never says it, so the replay is Mio's slow word clip (audio/word-gaijin.mp3), not an eric- clip
  gaijin: { ja: '外人', ro: 'gaijin', en: 'foreigner', voice: 'word-gaijin' },
  kotodama: { ja: '言霊', ro: 'kotodama', en: 'words with power in them' },
  // day 2's words (story/day2/words.js): phrases, unknown until typed there
  ...DAY2.WORDS,
};
// People's names are never garbled (Jørgen, 2026-09-30: "his name should not be obscured"). In an overheard line
// each one stays readable with the name in romaji after it, taught or not, with an honorific if one follows.
// Every Japanese spelling of a name the day uses goes here; the language check fails on one that isn't.
export const NAMES = [
  { ja: '森', en: 'Mori' },
  { ja: '浜田', en: 'Hamada' },
  { ja: '石橋', en: 'Ishibashi' },
  { ja: '玖路', en: 'Kuro' },
  { ja: 'エリック', en: 'Eric' },
  { ja: 'ミオ', en: 'Mio' },
  { ja: 'ケンジ', en: 'Kenji' },
  { ja: 'エミ', en: 'Emi' },
  { ja: 'アオイ', en: 'Aoi' },
  { ja: 'レイ', en: 'Rei' },
  { ja: 'タマ', en: 'Tama' },
];
export const HONORIFICS = { さん: 'san', くん: 'kun', ちゃん: 'chan', 様: 'sama' };
const KANJI = /[\u3400-\u9fff々]/,
  KATA = /[\u30a0-\u30ff]/;
// the name that starts at text[i] as a whole word (森 but not 森林, レイ but not キレイ), with its honorific
export function nameAt(text, i) {
  for (const n of NAMES) {
    if (!text.startsWith(n.ja, i)) continue;
    const script = KANJI.test(n.ja[0]) ? KANJI : KATA;
    const end = i + n.ja.length;
    if ((i > 0 && script.test(text[i - 1])) || (end < text.length && script.test(text[end]))) continue;
    const h = Object.keys(HONORIFICS).find((k) => text.startsWith(k, end));
    return { ja: n.ja + (h || ''), gl: n.en + (h ? `-${HONORIFICS[h]}` : '') };
  }
  return null;
}
// Verbs are met in a form, not as the dictionary word: 待って matte is the -te form of 待つ matsu.
// The Words panel shows the form as met plus this line, so nobody takes matte for the base word.
export const BASE = {
  matte: { form: 'te', ja: '待つ', ro: 'matsu', en: 'to wait' },
  akete: { form: 'te', ja: '開ける', ro: 'akeru', en: 'to open' },
  kite: { form: 'te', ja: '来る', ro: 'kuru', en: 'to come' },
  ugoite: { form: 'te', ja: '動く', ro: 'ugoku', en: 'to move, to run' },
  irete: { form: 'te', ja: '入れる', ro: 'ireru', en: 'to put in, to make (tea)' },
  dashite: { form: 'te', ja: '出す', ro: 'dasu', en: 'to put out, to hand over' },
  tomatte: { form: 'te', ja: '止まる', ro: 'tomaru', en: 'to stop' },
  ohayo: { form: 'set', note: 'A fixed greeting. Gozaimasu makes it polite; with friends, just ohayō.' },
  yoroshiku: { form: 'masu', lead: 'onegaishimasu: ', ja: 'お願いする', ro: 'onegai suru', en: 'to ask a favour' },
  sumimasen: { form: 'set', note: 'A fixed phrase. The -masen ending is the polite way to say "not".' },
  ...DAY2.BASE,
};
const FORM_NAME = { te: '-te form', masu: 'polite -masu form', ...DAY2.FORM_NAME };
// what each ending does, in a line (shown once above the words that use it)
export const FORM_NOTE = {
  ...DAY2.FORM_NOTE,
  te: 'These words end in -te, the form you use to ask someone to do something. Matte on its own means "wait!", and matte kudasai means "please wait". The same ending also links two actions in one sentence.',
};
// the small line under a word in the Words panel: which form it is and its dictionary word
export function baseHTML(id) {
  const b = BASE[id];
  if (!b) return '';
  if (b.note) return `<span class="bf">${b.note}</span>`;
  return `<span class="bf">${b.lead || ''}${FORM_NAME[b.form]} of <span class="bj">${b.ja}</span> ${b.ro}, ${b.en}</span>`;
}

// line icons (24 x 24, stroked in the HUD style) for the words he can say
const ICON = {
  ohayo:
    '<path d="M3 18h18"/><path d="M7 18a5 5 0 0 1 10 0"/><path d="M12 7v2.5M6.3 10.3l1.6 1.6M17.7 10.3l-1.6 1.6M3.5 14.5h2M18.5 14.5h2"/>',
  yoroshiku:
    '<circle cx="7.5" cy="8" r="2.3"/><path d="M9.8 9.6l6.2 3.6"/><path d="M16 13.2V21"/><path d="M12 11.3l-2.5 3"/><path d="M19 5.5l-1.5 1.5M20.5 9h-2"/>',
  sumimasen:
    '<path d="M10 21v-5l-2.2-3a1.3 1.3 0 0 1 2.1-1.5L11 13V4.3a1.3 1.3 0 0 1 2.6 0V12"/><path d="M13.6 11a1.3 1.3 0 0 1 2.6 0v1.2a1.3 1.3 0 0 1 2.6 0V16c0 3-2 5-5 5h-3.8"/>',
  matte:
    '<path d="M7 13V7a1.3 1.3 0 0 1 2.6 0v5"/><path d="M9.6 11V4.8a1.3 1.3 0 0 1 2.6 0V11"/><path d="M12.2 11V5.8a1.3 1.3 0 0 1 2.6 0V12"/><path d="M14.8 12V8.3a1.3 1.3 0 0 1 2.6 0V15c0 3.4-2.4 6-5.6 6-2.4 0-3.6-1-4.8-2.8L5 15.2a1.4 1.4 0 0 1 2-1.8"/>',
  akete: '<path d="M5 21V3h12v18"/><path d="M5 3l7 2.5v17L5 21"/><path d="M10 12.5v1"/><path d="M3 21h17"/>',
  kite: '<circle cx="17" cy="7" r="2.4"/><path d="M13.5 21v-3.2a3.5 3.5 0 0 1 7 0V21"/><path d="M3 12.5h8"/><path d="M8 9.5l3 3-3 3"/>',
  ugoite:
    '<circle cx="12" cy="12" r="3.2"/><path d="M12 3.5v2.8M12 17.7v2.8M3.5 12h2.8M17.7 12h2.8M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2"/>',
  irete:
    '<path d="M5 11h11v3.5a5.5 5.5 0 0 1-5.5 5.5A5.5 5.5 0 0 1 5 14.5z"/><path d="M16 12.5h1.5a2 2 0 0 1 0 4H16"/><path d="M10.5 3v5M8.5 6l2 2 2-2"/>',
  dashite: '<path d="M4 13.5V20h16v-6.5"/><path d="M12 15V4"/><path d="M8 8l4-4 4 4"/>',
  tomatte: '<path d="M8.4 3h7.2L21 8.4v7.2L15.6 21H8.4L3 15.6V8.4z"/><path d="M8 12h8"/>',
  tabetai: '<path d="M4 12h16a8 8 0 0 1-16 0z"/><path d="M15 3l-4 7M19 4l-6 6"/>',
  nomitai:
    '<path d="M7 4h10l-1.2 15.2a2 2 0 0 1-2 1.8h-3.6a2 2 0 0 1-2-1.8z"/><path d="M7.4 9h9.2"/><path d="M13 4l2-2"/>',
  mitai: '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.6"/>',
  ikitai: '<path d="M4 12h13"/><path d="M13 7l5 5-5 5"/><path d="M4 7v10"/>',
};
export function iconHTML(id, cls = 'wi') {
  return ICON[id] ? `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[id]}</svg>` : '';
}
export const COMMANDS = ['matte', 'akete', 'kite', 'ugoite', 'irete', 'dashite', 'tomatte'];
export const PHRASES = ['ohayo', 'yoroshiku', 'sumimasen', 'tabetai', 'nomitai', 'mitai', 'ikitai'];
export const SAYABLE = [...PHRASES, ...COMMANDS];

// the words Eric has been taught in play (typed, `learn` or `offer`); nothing else counts as known
export const known = new Set();
export function learn(id) {
  const isNew = !known.has(id);
  known.add(id);
  return isNew;
}

const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// words Eric has met in a glossed line (kept in the save only: meeting a word doesn't make it known)
export const seen = new Set();
export function wordHTML(id) {
  const w = WORDS[id];
  seen.add(id);
  return `<span class="jp" data-w="${id}">${w.ja}</span> <span class="gl">(${w.ro}, ${w.en})</span>`;
}
// A line: plain text with {id} for words.
export function lineHTML(text) {
  return esc(text).replace(/\{(\w+)\}/g, (_, id) => (WORDS[id] ? wordHTML(id) : id));
}
// the command as a button face: Japanese big, reading and English under it
export function cmdHTML(id) {
  const w = WORDS[id];
  return `${iconHTML(id)}<span class="cw"><span class="jp">${w.ja}</span><span class="rd">${w.ro} · ${w.en}</span></span>`;
}
