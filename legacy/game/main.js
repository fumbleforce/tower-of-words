// Amakawa: a week at the company. A small script interpreter plus the game's systems:
// voiced lines, per-word reading stages and spaced "known" status, look-ups, pins, the elevator, menus and a wallet,
// spells built from verb forms, witnesses and breath, free talk with an LLM, rewards, and the company phone.
import { GLOSSARY, START_KNOWN } from './data/glossary.js';
import { CAST, FLOORS, SCENES as DAY1, SPELLS } from './data/script.js';
import { kanjiLevel as kanjiLevelList } from './data/kanji.js';
import { toRomaji } from '../data/lang/romaji.js';
import { GLOSSARY_ADDITIONS } from '../content/glossary-additions.js';
import * as D2 from '../content/day2.js';
import * as D3 from '../content/day3.js';
import * as D4 from '../content/day4.js';
import * as D5 from '../content/day5.js';
import { VOICE } from './audio/voice/index.js';
import { PLACEHOLDER, insertHTML, housingHTML } from './art.js';

for (const [k, v] of Object.entries(GLOSSARY_ADDITIONS)) if (!GLOSSARY[k]) GLOSSARY[k] = v;
const SCENES = { ...DAY1, ...D2.SCENES, ...D3.SCENES, ...D4.SCENES, ...D5.SCENES };
const DAYS = { 1: 'train', 2: 'day2_morning', 3: 'day3_morning', 4: 'day4_morning', 5: 'day5_morning' };
const DAY_NAMES = { 1: '{月曜日|げつようび}', 2: '{火曜日|かようび}', 3: '{水曜日|すいようび}', 4: '{木曜日|もくようび}', 5: '{金曜日|きんようび}' };
const DAY_NTH = { 1: '{一日目|いちにちめ}', 2: '{二日目|ふつかめ}', 3: '{三日目|みっかめ}', 4: '{四日目|よっかめ}', 5: '{五日目|いつかめ}' };
const dayName = d => (DAY_NAMES[d] ? renderJP(DAY_NAMES[d]) : '');
const LAST_DAY = 5;
// Kotodama (voice marks) per day. Day 1 has five, shared between the copy room and Sales.
const BREATH = { 1: 5 };
const breathMax = () => BREATH[S.day] || 3;

// Language data (data/lang, built by tools/lang): tokenised script lines, JMdict words, KANJIDIC kanji, profiles.
const LANG = {};
async function loadLang() {
  try {
    const [l, w, k, p] = await Promise.all(['lines', 'words', 'kanji', 'profiles'].map(n => fetch(`../data/lang/${n}.json`).then(r => r.json())));
    LANG.lines = l.lines; LANG.words = w.words; LANG.kanji = k.kanji; LANG.profiles = p.profiles;
  } catch (e) { console.warn('language data not loaded; using the script markup', e); }
}
// JLPT level from KANJIDIC (5 = N5) → 1, 4 → 2, anything else 3; the built-in list is the fallback.
const kanjiLevel = c => { const n = LANG.kanji?.[c]?.n; return n === 5 ? 1 : n === 4 ? 2 : n ? 3 : kanjiLevelList(c); };
const $ = s => document.querySelector(s);
const stage = $('#stage'), ui = $('#ui'), hud = $('#hud'), chars = $('#chars'), fx = $('#fx'), phone = $('#phone');
const SAVE = 'amakawa.save.v2', WORDS = 'amakawa.words.v1';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const TOUCH = matchMedia('(pointer: coarse)').matches;
const realDay = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / 864e5);

/* ---------------- state ---------------- */
function freshState() {
  return {
    day: 1, scene: null, time: 8 * 60 + 40, task: '', flags: {}, rel: {}, suspicion: 0, sus: {}, noise: 0, casts: 0, breath: 5, name: '',
    messages: [], order: null, spells: [], rewards: [], grammar: { right: 0, total: 0 }, dayLog: {},
    settings: {
      karaoke: true, discreet: TOUCH, freeTyping: !TOUCH,
      llmEndpoint: 'http://127.0.0.1:8190/v1', llmKey: '', llmModel: '',
    },
  };
}
let S = load(SAVE) || freshState();
S.settings = { ...freshState().settings, ...S.settings };
let L = load(WORDS) || { words: {}, today: null };
L.kanji ||= {}; L.kata ||= {};
function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }
function save() { try { localStorage.setItem(SAVE, JSON.stringify(S)); localStorage.setItem(WORDS, JSON.stringify(L)); } catch {} }

/* ---------------- words: reading stages and spaced "known" ----------------
   stage 0: romaji above the word · stage 1: kana above · stage 2: no reading aid · stage 3: known.
   A word moves 0→1→2 on story days where you meet it without looking it up. "Known" needs unaided days on
   three different real calendar days, the last at stage 2. Looking up a stage-2+ word drops it one stage. */
function word(key) {
  let w = L.words[key];
  if (!w) w = L.words[key] = { stage: START_KNOWN.includes(key) ? 3 : 0, good: [], seen: 0, looked: 0 };
  return w;
}
function today() {
  if (!L.today || L.today.storyDay !== S.day) L.today = { storyDay: S.day, seen: {}, looked: {} };
  L.today.kseen ||= {}; L.today.kmiss ||= {};
  return L.today;
}
// A meaning look-up is a vocabulary miss; a reading request is a miss for the kanji in the word (see record()).
function lookup(key) {
  const t = today(); t.looked[key] = 1; word(key).looked++; sceneStats.taps++;
}
function readingMiss(surface) {
  const t = today();
  // Soft adaptation: a kanji whose reading was asked for twice shows its reading by default from then on.
  for (const c of kanjiIn(surface)) { t.kmiss[c] = 1; const k = kanjiRec(c); k.rd = (k.rd || 0) + 1; if (k.rd >= 2 && k.st >= 2) k.st = 1; }
}

/* ---------------- letters: per-kanji reading state and the player's profile ----------------
   Kanji state: 0 = not yet (the word shows in kana), 1 = learning (kanji with the reading above), 2 = readable.
   The starting state comes from the kanji band set by the level check; play moves single kanji from there. */
const kanjiIn = s => [...(s || '')].filter(c => /[\u3400-\u9fff]/.test(c));
// Reverse learning (2026-09-25): text is natural Japanese by default; readings appear when the player asks for them.
const profile = () => (L.profile ||= { mode: 'reverse', band: 3 });
function bandState(c) {
  if (profile().mode === 'reverse') return 2;
  const lv = kanjiLevel(c), b = profile().band;
  if (b <= 0) return 0;
  if (b === 1) return lv === 1 ? 1 : 0;
  if (b === 2) return lv === 1 ? 2 : lv === 2 ? 1 : 0;
  return lv <= 2 ? 2 : 1;
}
function kanjiRec(c) { return (L.kanji[c] ||= { st: bandState(c), good: [] }); }
function kanjiState(c, key) {
  const k = L.kanji[c];
  let st = k ? k.st : bandState(c);
  // Once a word's meaning is well on its way, its easy kanji start showing (with the reading).
  if (st === 0 && key && kanjiLevel(c) <= 2 && (L.words[key]?.stage || 0) >= 2) st = 1;
  return st;
}
// Adaptive drift: new words shown and taps per scene; two quiet scenes move the band up, heavy tapping moves it down.
const sceneStats = { shown: new Set(), taps: 0 }, lastScenes = [];
function sceneEnd() {
  if (sceneStats.shown.size >= 6) {
    lastScenes.push(sceneStats.taps / sceneStats.shown.size);
    if (lastScenes.length > 2) lastScenes.shift();
    const p = profile();
    if (lastScenes.length === 2 && lastScenes.every(r => r < 0.05) && p.band < 3) { p.band++; lastScenes.length = 0; }
    else if (lastScenes.length === 2 && lastScenes.every(r => r > 0.3) && p.band > 0) { p.band--; lastScenes.length = 0; }
  }
  sceneStats.shown.clear(); sceneStats.taps = 0;
}
const MARK = /\{([^}|]+)(?:\|([^}|]*))?(?:\|([^}]*))?\}/g;
const KATA = /[ァ-ヺ][ァ-ヺー]+/g;
function keysOf(markup) {
  const keys = [];
  let last = 0;
  for (const m of markup.matchAll(MARK)) { for (const k of markup.slice(last, m.index).match(KATA) || []) keys.push(k); keys.push(m[3] || m[1]); last = m.index + m[0].length; }
  for (const k of markup.slice(last).match(KATA) || []) keys.push(k);
  return keys;
}
// Content tokens of a line from lines.json (particles, auxiliaries and punctuation left out), or null.
const CONTENT = t => t.p !== 'punct' && t.p !== 'prt' && t.p !== 'aux' && /[\u3040-\u30ff\u3400-\u9fff]/.test(t.s);
const tokensOf = markup => LANG.lines?.[plain(markup)]?.t || null;
const lineKeys = markup => { const t = tokensOf(markup); return t ? t.filter(CONTENT).map(x => x.b || x.s) : keysOf(markup); };
function markSeen(markup) {
  const t = today();
  const toks = tokensOf(markup);
  if (toks) {
    for (const x of toks.filter(CONTENT)) { const k = x.b || x.s; t.seen[k] = (t.seen[k] || 0) + 1; word(k).seen++; if (word(k).stage < 2 && !START_KNOWN.includes(k)) sceneStats.shown.add(k); for (const c of kanjiIn(x.s)) if (kanjiState(c, k) === 1) t.kseen[c] = 1; }
    return;
  }
  for (const k of keysOf(markup)) { t.seen[k] = (t.seen[k] || 0) + 1; word(k).seen++; if (word(k).stage < 2 && !START_KNOWN.includes(k)) sceneStats.shown.add(k); }
  // Kanji shown with their reading count as exposure for the reading track.
  for (const m of markup.matchAll(MARK)) { const key = m[3] || m[1]; for (const c of kanjiIn(m[1])) if (kanjiState(c, key) === 1) t.kseen[c] = 1; }
}
function lookupAll(markup) { for (const k of lineKeys(markup)) lookup(k); }
function endOfDayWords() {
  const t = today(), rd = realDay(), moved = [], slipped = [], known = [];
  for (const [k, n] of Object.entries(t.seen)) {
    const w = word(k);
    if (w.stage >= 3 && !t.looked[k]) continue;
    if (t.looked[k]) { if (w.stage >= 2) { w.stage = w.stage === 3 ? 2 : 1; slipped.push(k); } continue; }
    if (!w.good.includes(rd)) w.good.push(rd);
    if (w.stage === 0 && n >= 2) { w.stage = 1; moved.push(k); }
    else if (w.stage === 1) { w.stage = 2; moved.push(k); }
    else if (w.stage === 2 && w.good.length >= 3) { w.stage = 3; known.push(k); }
  }
  // Kanji: a learning kanji read (with its reading shown) on two separate days without a look-up becomes readable.
  const kread = [];
  for (const c of Object.keys(t.kseen)) {
    if (t.kmiss[c]) continue;
    const k = kanjiRec(c);
    if (k.st === 0) k.st = 1;
    if (!k.good.includes(rd)) k.good.push(rd);
    if (k.st === 1 && k.good.length >= 2) { k.st = 2; kread.push(c); }
  }
  return { moved, slipped, known, kread, looked: Object.keys(t.looked) };
}

/* ---------------- audio ---------------- */
const fnv = s => { let x = 0x811c9dc5; for (const c of s) { x ^= c.codePointAt(0); x = Math.imul(x, 0x01000193) >>> 0; } return x.toString(16).padStart(8, '0'); };
let voiceEl = null, musicEl = null, musicName = null, lastVoice = null;
const GAIN = { player: .55, announcer: .8, ishibashi: 1, jun: .95 };
function playVoice(who, text, rate = 1) {
  const key = fnv(`${who}|${text}`);
  if (voiceEl) voiceEl.pause();
  if (who !== 'player') lastVoice = [who, text];
  if (!VOICE[key]) return null;
  voiceEl = new Audio(`audio/voice/${key}.mp3`);
  voiceEl.volume = GAIN[who] ?? .9;
  voiceEl.preservesPitch = true; voiceEl.playbackRate = rate;
  voiceEl.play().catch(() => {});
  return voiceEl;
}
function replay() { if (lastVoice) playVoice(lastVoice[0], lastVoice[1], .85); }
function sfx(name, vol = .5) { const a = new Audio(`audio/sfx/${name}.mp3`); a.volume = vol; a.play().catch(() => {}); }
// Music: one Lyria loop per mood, crossfading into itself 3 s before the end.
const MUSIC_VOL = .2;
function fade(a, to, ms, done) {
  const from = a.volume, t0 = performance.now();
  const tick = () => { const k = Math.min(1, (performance.now() - t0) / ms); a.volume = from + (to - from) * k; if (k < 1) requestAnimationFrame(tick); else done?.(); };
  requestAnimationFrame(tick);
}
function playTrack(name) {
  const a = new Audio(`audio/music/${name}.mp3`); a.volume = 0;
  a.play().then(() => fade(a, MUSIC_VOL, 2500)).catch(() => {});
  let handed = false;
  a.addEventListener('timeupdate', () => {
    if (handed || musicName !== name || !a.duration || a.currentTime < a.duration - 3) return;
    handed = true; fade(a, 0, 3000, () => a.pause()); musicEl = playTrack(name);
  });
  return a;
}
function music(name) {
  if (name === musicName) return;
  const old = musicEl; musicName = name;
  if (old) fade(old, 0, 1500, () => old.pause());
  musicEl = name ? playTrack(name) : null;
}

/* ---------------- Japanese text ---------------- */
const KANA_ROMA = (() => {
  const m = {}, rows = 'a i u e o ka ki ku ke ko sa shi su se so ta chi tsu te to na ni nu ne no ha hi fu he ho ma mi mu me mo ya . yu . yo ra ri ru re ro wa . . . wo ga gi gu ge go za ji zu ze zo da ji zu de do ba bi bu be bo pa pi pu pe po'.split(' ');
  const kana = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもや.ゆ.よらりるれろわ...をがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ';
  [...kana].forEach((k, i) => { if (k !== '.') m[k] = rows[i]; });
  Object.assign(m, { 'ん': 'n', 'ぁ': 'a', 'ぃ': 'i', 'ぅ': 'u', 'ぇ': 'e', 'ぉ': 'o', 'ゔ': 'vu' });
  return m;
})();
const hira = s => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
function romaji(kana) {
  const s = hira(kana); let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i], n = s[i + 1];
    if (c === 'っ') { const nx = KANA_ROMA[n] || ''; out += nx[0] === 'c' ? 't' : (nx[0] || ''); continue; }
    if (n && 'ゃゅょ'.includes(n)) {
      const base = KANA_ROMA[c] || '', y = { 'ゃ': 'a', 'ゅ': 'u', 'ょ': 'o' }[n];
      out += /^(shi|chi|ji)$/.test(base) ? base.slice(0, -1) + y : base.slice(0, -1) + 'y' + y; i++; continue;
    }
    if (n && 'ぁぃぅぇぉ'.includes(n) && KANA_ROMA[c]) { out += KANA_ROMA[c].slice(0, -1) + KANA_ROMA[n]; i++; continue; }
    if (c === 'ー') { out += out.slice(-1); continue; }
    out += KANA_ROMA[c] ?? c;
  }
  return out;
}
const isKata = s => /^[ァ-ヺー]+$/.test(s);
const hasKanji = s => /[㐀-鿿々〆]/.test(s);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
// A tappable word. Kanji words always carry their ruby; the reading stays hidden (class rd shows it) until the
// player asks for it, the word was asked about before, or one of its kanji is still being learned.
function wordSpan(key, surface, reading, fu, opts, extra = '') {
  const gl = opts.gl?.[surface] ?? opts.gl?.[key];
  const attrs = (cls) => `class="w${isKata(surface) ? ' kata' : ''}${word(key).stage >= 3 ? ' known' : ''}${cls}" data-key="${esc(key)}" data-read="${esc(reading)}" data-surf="${esc(surface)}"${gl ? ` data-gl="${esc(gl)}"` : ''}${extra}`;
  if (!hasKanji(surface) || surface === reading) return `<span ${attrs('')}>${surface}</span>`;
  const states = kanjiIn(surface).map(c => kanjiState(c, key));
  // A kanji the player can't read at all yet: the whole word in kana.
  if (opts.forceKana || states.some(x => x === 0)) return `<span ${attrs('')} data-kana="1">${reading}</span>`;
  const show = states.some(x => x < 2) || (word(key).rd || 0) > 0;
  const ruby = fu ? fu.map(([part, r]) => (r && hasKanji(part) ? `<ruby>${part}<rt>${r}</rt></ruby>` : part)).join('') : `<ruby>${surface}<rt>${reading}</rt></ruby>`;
  return `<span ${attrs(show ? ' rd' : '')}>${ruby}</span>`;
}
function wordHTML(key, surface, reading, opts) {
  reading = reading || GLOSSARY[key]?.r || surface;
  return wordSpan(key, surface, reading, null, opts);
}
// One token from lines.json, shown for this player.
function tokenHTML(t, opts) {
  if (!CONTENT(t)) return t.s;
  const key = t.b || t.s;
  return wordSpan(key, t.s, t.r || t.s, t.fu, opts, `${t.id ? ` data-id="${t.id}"` : ''}${t.en ? ` data-en="${esc(t.en)}"` : ''}`);
}
function renderJP(markup, opts = {}) {
  const toks = tokensOf(markup);
  if (toks) return toks.map(t => tokenHTML(t, opts)).join('');
  let out = '', last = 0;
  const plainPart = t => t.replace(KATA, k => wordHTML(k, k, k, opts));
  for (const m of markup.matchAll(MARK)) {
    out += plainPart(markup.slice(last, m.index));
    out += wordHTML(m[3] || m[1], m[1], m[2], opts);
    last = m.index + m[0].length;
  }
  return out + plainPart(markup.slice(last));
}
const plain = s => s.replace(/\{([^}|]+)(?:\|[^}]*)?\}/g, '$1');

// Numbers and money in Japanese.
const DIG = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
function kanjiNum(n) {
  if (n === 0) return '〇';
  let out = '';
  const man = Math.floor(n / 10000); if (man) { out += kanjiNum(man) + '万'; n %= 10000; }
  for (const [v, u] of [[1000, '千'], [100, '百'], [10, '十']]) { const d = Math.floor(n / v); if (d) out += (d > 1 ? DIG[d] : '') + u; n %= v; }
  return out + (n ? DIG[n] : '');
}
function kanaNum(n) {
  const ones = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];
  const hund = { 1: 'ひゃく', 3: 'さんびゃく', 6: 'ろっぴゃく', 8: 'はっぴゃく' };
  const thou = { 1: 'せん', 3: 'さんぜん', 8: 'はっせん' };
  let out = '';
  const t = Math.floor(n / 1000); if (t) out += thou[t] || ones[t] + 'せん'; n %= 1000;
  const hu = Math.floor(n / 100); if (hu) out += hund[hu] || ones[hu] + 'ひゃく'; n %= 100;
  const te = Math.floor(n / 10); if (te) out += (te > 1 ? ones[te] : '') + 'じゅう'; n %= 10;
  return out + ones[n];
}
function yen(n) {
  const surface = kanjiNum(n) + '円', reading = kanaNum(n) + 'えん';
  if (!GLOSSARY[surface]) GLOSSARY[surface] = { r: reading, en: `${n.toLocaleString('en')} yen`, lv: 1 };
  return `{${surface}|${reading}}`;
}

/* ---------------- tapping words: reading, then meaning ----------------
   Tap a kanji word once: the kana reading appears above it. Tap again: the English for this context appears below,
   with the romaji. Kana words go straight to the meaning. Another tap closes the meaning (the reading stays).
   Every voluntary request is stored per word and per kanji (L.words[k].rd / .mn, L.kanji[c].rd) and in L.taps, so
   later scenes can bring those words back. Taps the tutorial cue asked for are logged with tut: true and count for nothing. */
const help = () => (S.help ||= { lines: {}, meaning: 0 });
// The "supported" versions of later lines are used once the player has needed help on three different lines.
const support = () => Object.keys(help().lines).length >= 3;
let cue = null; // { el: word element, text, then: second-stage text } while a tutorial cue is up
function record(kind, w, tut) {
  const key = w.dataset.key, surf = w.dataset.surf, line = w.closest('[data-line]')?.dataset.line || '';
  (L.taps ||= []).push({ k: key, s: surf, kind, line, day: S.day, scene: S.scene, t: Date.now(), ...(tut ? { tut: 1 } : {}) });
  if (L.taps.length > 3000) L.taps.shift();
  if (!tut) {
    const wd = word(key);
    if (kind === 'read') { wd.rd = (wd.rd || 0) + 1; readingMiss(surf); }
    else { wd.mn = (wd.mn || 0) + 1; lookup(key); }
    if (line) help().lines[line] = 1;
  }
  save();
}
function meaningOf(w) {
  const key = w.dataset.key, id = w.dataset.id, jm = id && LANG.words?.[id];
  return w.dataset.gl || GLOSSARY[key]?.en || jm?.g || w.dataset.en || (isKata(key) ? 'loanword' : '');
}
function showMeaning(w) {
  w.querySelector('.mean')?.remove();
  const rd = w.dataset.read || w.dataset.surf;
  const m = h('span', 'mean', `${esc(meaningOf(w))}<small>${esc(toRomaji(rd))}${w.dataset.key !== w.dataset.surf ? ` · ${esc(w.dataset.key)}` : ''}</small>`);
  w.append(m);
  w.closest('.line, .opt-text, .ctx-line, .hs-text, .ins-word')?.classList.add('has-mean');
  // Keep the explanation inside the screen.
  const box = stage.getBoundingClientRect(), r = m.getBoundingClientRect();
  let dx = 0;
  if (r.left < box.left + 6) dx = box.left + 6 - r.left; else if (r.right > box.right - 6) dx = box.right - 6 - r.right;
  if (dx) m.style.marginLeft = `${dx}px`;
}
function tapWord(w) {
  const tut = cue && cue.el === w;
  const hasReading = !!w.querySelector('rt') && !w.dataset.kana;
  if (hasReading && !w.classList.contains('rd')) {
    w.classList.add('rd'); record('read', w, tut);
    if (tut && cue.then) setCue(w, cue.then, null); else if (tut) clearCue();
    else if (w.dataset.cue2 && !S.flags.cue2done) { S.flags.cue2done = true; setCue(w, 'Tap again for the meaning.', null); }
    return;
  }
  if (!w.classList.contains('mn')) {
    w.classList.add('mn'); showMeaning(w); record('mean', w, tut);
    if (cue) clearCue();
    return;
  }
  w.classList.remove('mn'); w.querySelector('.mean')?.remove();
}
// The cue sits in the flow right under the line it points at, so it never covers the stage direction above.
function setCue(w, text, then) {
  clearCue();
  const el = h('div', 'cue', text);
  const line = w.closest('.line, .opt-text, .hs-text') || w;
  line.after(el);
  w.classList.add('cued');
  cue = { el: w, box: el, then };
}
function clearCue() { if (!cue) return; cue.box.remove(); cue.el.classList.remove('cued'); cue = null; }
// Word taps are caught before anything else sees the click, so a tap on a word never advances or chooses.
document.addEventListener('click', e => {
  const w = e.target.closest('.w');
  if (!w || e.target.closest('.nolook')) return;
  e.stopPropagation(); e.preventDefault();
  tapWord(w);
}, true);
// Whole-line meaning: an escape hatch. It counts as a look-up of every word in the line.
function meaningButton(container, markups, reveal, label = 'Meaning') {
  const b = h('button', 'tool-btn', label);
  let shown = false;
  const doIt = () => {
    if (shown) { reveal(false); b.textContent = label; shown = false; return; }
    markups.forEach(m => { lookupAll(m); help().lines[plain(m)] = 1; }); help().meaning++; save(); reveal(true); b.textContent = 'Hide English'; shown = true;
  };
  b.onclick = e => { e.stopPropagation(); doIt(); };
  englishHandler = doIt;
  container.append(b);
  return b;
}
const englishButton = meaningButton;

/* ---------------- time ---------------- */
function jpTime(min) {
  const hh = Math.floor(min / 60) % 24, mm = min % 60, pm = hh >= 12, h12 = hh % 12 || 12;
  return `${pm ? '午後' : '午前'}${kanjiNum(h12)}時${mm ? kanjiNum(mm) + '分' : ''}`;
}
const digital = min => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const parseClock = t => { const [a, b] = t.split(':').map(Number); return a * 60 + b; };

/* ---------------- HUD & phone ---------------- */
const breathMarks = () => `${'◆'.repeat(Math.max(0, S.breath))}${'◇'.repeat(Math.max(0, breathMax() - S.breath))}`;
function drawHud(ping) {
  hud.innerHTML = '';
  if (S.task) {
    const t = h('div', 'task', `<small>GOAL</small>${renderJP(S.task)}`);
    // Emi's photo rides along with the goal it belongs to.
    if (S.flags.keptPhoto && /photo/.test(S.task)) { const b = h('button', 'hud-photo', `<img src="img/bg/gate.webp" alt="Emi's photo">`); b.setAttribute('aria-label', 'Open Emi\'s photo'); b.onclick = e => { e.stopPropagation(); showPhoto(); }; t.append(b); }
    hud.append(t);
  }
  const hasPhone = S.messages.length > 0, hasMagic = S.flags.knowsMagic || S.day > 1;
  const b = h('button', 'phone-btn' + (ping ? ' ping' : '') + (hasPhone ? '' : ' nophone'), `${hasPhone ? `<span class="pl">Phone${S.unread ? ' · new' : ''}</span>` : ''}${digital(S.time)}${hasMagic ? `<span class="breath" title="kotodama left today">${breathMarks()}</span>` : ''}`);
  if (hasPhone) b.onclick = openPhone;
  hud.append(b);
}
let phoneTab = 'msg';
function openPhone() {
  S.unread = false; drawHud();
  if (phone.classList.contains('app')) return;
  sfx('tap', .3);
  const tabs = [['msg', 'メッセージ'], ['words', 'たんご'], ['set', 'せってい']];
  if (S.flags.knowsMagic || S.day > 1) tabs.splice(1, 0, ['book', 'ことだま']);
  if (S.rewards.length) tabs.splice(tabs.length - 1, 0, ['album', 'アルバム']);
  const body = h('div', 'ph-body');
  if (phoneTab === 'msg') {
    if (!S.messages.length) body.append(h('p', 'small', 'No messages yet.'));
    for (const m of [...S.messages].reverse()) {
      const from = `<div class="from">${CAST[m.from]?.en || m.from} · ${dayName(m.day)}</div>`;
      if (m.kind === 'voice') {
        const el = h('div', 'msg', `${from}<div class="small">Voice message</div>`);
        for (const l of m.lines || []) {
          const row = h('div', 'msg-line', `<div class="jp" data-line="${esc(plain(l.jp))}">${l.me ? '<span class="me">You:</span> ' : ''}${renderJP(l.jp)}</div><div class="en" hidden>${esc(l.en || '')}</div>`);
          const b = h('button', 'tool-btn', 'Meaning'); b.onclick = () => { row.querySelector('.en').hidden = false; b.remove(); lookupAll(l.jp); save(); };
          const p2 = h('button', 'tool-btn', '▶'); p2.onclick = () => playVoice(l.me ? 'player' : m.from, plain(l.jp), .85);
          row.append(p2, b); el.append(row);
        }
        body.append(el); continue;
      }
      const el = h('div', 'msg', `${from}${m.img ? `<img class="msg-img" src="img/bg/${m.img}.webp" alt="Photo from ${CAST[m.from]?.en || m.from}">` : ''}<div class="jp" data-line="${esc(plain(m.jp))}">${renderJP(m.jp, { gl: m.gl })}</div><div class="en" hidden>${esc(m.en || '')}</div>`);
      if (m.en) { const b = h('button', 'tool-btn', 'Meaning'); b.onclick = () => { el.querySelector('.en').hidden = false; b.remove(); lookupAll(m.jp); save(); }; el.append(b); }
      body.append(el);
    }
  } else if (phoneTab === 'book') {
    body.append(h('p', 'small', `Kotodama left today: ${breathMarks()}. Casting in front of people risks being noticed; a botched cast more so.`));
    const book = [{ form: '渡して', en: 'make someone hand something over' }, ...S.spells];
    for (const s of book.filter((s, i, a) => a.findIndex(x => x.form === s.form) === i)) body.append(h('div', 'wordrow', `<span><b>${s.form}</b></span><span class="small">${s.en}</span>`));
    body.append(h('p', 'small', `Suspicion: ${'●'.repeat(Math.min(S.suspicion, 10))}${'○'.repeat(Math.max(0, 5 - S.suspicion))}`));
  } else if (phoneTab === 'words') {
    const entries = Object.entries(L.words).filter(([, w]) => w.seen).sort((a, b) => a[1].stage - b[1].stage || b[1].seen - a[1].seen);
    const counts = [0, 0, 0, 0]; entries.forEach(([, w]) => counts[w.stage]++);
    body.append(h('p', 'small', `New ${counts[0]} · learning ${counts[1]} · recalling ${counts[2]} · known ${counts[3]}. Readings shrink from romaji to kana to nothing as you meet a word without looking it up. "Known" takes unaided days on three different calendar days.`));
    for (const [k, w] of entries) {
      const g = GLOSSARY[k] || {};
      body.append(h('div', 'wordrow', `<span><b>${k}</b> ${g.r && g.r !== k ? g.r : ''}</span><span class="small">${g.en || ''}</span><span class="small">${['new', 'learning', 'recalling', 'known'][w.stage]}</span>`));
    }
  } else if (phoneTab === 'album') {
    for (const r of S.rewards) body.append(h('div', 'msg', `<div class="from">${dayName(r.day)}</div><div class="en">${r.caption}</div>`));
  } else {
    const st = S.settings;
    body.innerHTML = `
      <label>Follow-along text (words light up as they're spoken) <input type="checkbox" id="setLF" ${st.karaoke !== false ? 'checked' : ''}></label>
      <label>Discreet mode (hide reward pictures) <input type="checkbox" id="setDS" ${st.discreet ? 'checked' : ''}></label>
      <label>Free typing in conversations <input type="checkbox" id="setFT" ${st.freeTyping ? 'checked' : ''}></label>
      <div class="ph-block"><b>Conversation AI</b><div class="small">An OpenAI-compatible endpoint: the local llama.cpp server (default) or OpenRouter. The key stays in this browser.</div>
        <input type="text" id="setEP" placeholder="endpoint" value="${st.llmEndpoint}">
        <input type="text" id="setMO" placeholder="model (blank = server default)" value="${st.llmModel}">
        <input type="password" id="setKE" placeholder="API key (OpenRouter only)" value="${st.llmKey}"></div>
      <div class="ph-block"><b>Jump to a day</b> <span class="small">(for testing; keeps flags)</span><div id="setDays" class="ph-days"></div></div>
      <button id="setRS" class="ph-close" style="background:#3a1a14">Restart the week (keeps your words)</button>
      <p class="small">${EDRDG}</p>`;
    setTimeout(() => {
      $('#setLF').onchange = e => { st.karaoke = e.target.checked; save(); };
      $('#setDS').onchange = e => { st.discreet = e.target.checked; save(); };
      $('#setFT').onchange = e => { st.freeTyping = e.target.checked; save(); };
      $('#setEP').onchange = e => { st.llmEndpoint = e.target.value.trim(); save(); };
      $('#setMO').onchange = e => { st.llmModel = e.target.value.trim(); save(); };
      $('#setKE').onchange = e => { st.llmKey = e.target.value.trim(); save(); };
      for (const d of Object.keys(DAYS)) {
        const b = h('button', 'ph-day', `${d} ${dayName(d)}`);
        b.onclick = () => { startDay(+d); save(); location.reload(); };
        $('#setDays').append(b);
      }
      $('#setRS').onclick = () => { const s = S.settings; S = freshState(); S.settings = s; save(); location.reload(); };
    });
  }
  phone.innerHTML = '';
  phone.append(
    h('div', 'ph-top', `<div class="brand">AMAKAWA</div><div class="time">${digital(S.time)}<small>${dayName(S.day)}</small></div>`),
    Object.assign(h('div', 'ph-tabs'), { innerHTML: tabs.map(([k, l]) => `<button data-t="${k}" class="${k === phoneTab ? 'on' : ''}">${l}</button>`).join('') }),
    body, Object.assign(h('button', 'ph-close', 'とじる'), { onclick: closePhone }));
  phone.querySelectorAll('.ph-tabs button').forEach(b => b.onclick = () => { phoneTab = b.dataset.t; openPhone(); });
  phone.hidden = false;
}
function closePhone() { phone.hidden = true; }

/* ---------------- stage ---------------- */
let bgFlip = false;
// Backdrops drawn in code: the lift (a floor panel over steel), the title, and the train opening's placeholders
// (no approved art yet for the carriage, the exterior reveal, the doors or the platform; see TODO.md).
const CSS_BG = ['lift', 'title', ...Object.keys(PLACEHOLDER)];
function setBg(name) {
  const a = $('#bg'), b = $('#bg2');
  const [front, back] = bgFlip ? [a, b] : [b, a];
  front.dataset.css = CSS_BG.includes(name) ? name : '';
  front.innerHTML = PLACEHOLDER[name] || '';
  if (CSS_BG.includes(name)) { front.style.backgroundImage = ''; front.classList.remove('missing'); front.style.opacity = 1; back.style.opacity = 0; bgFlip = !bgFlip; stage.dataset.bg = name; return; }
  const img = new Image();
  img.onload = () => { front.style.backgroundImage = `url(${img.src})`; front.classList.remove('missing'); };
  img.onerror = () => { front.style.backgroundImage = ''; front.classList.add('missing'); };
  front.dataset.label = name;
  img.src = `img/bg/${name}.webp`;
  front.style.opacity = 1; back.style.opacity = 0; bgFlip = !bgFlip;
  stage.dataset.bg = name;
}
const onStage = {};
const FALLBACK_EXPR = ['neutral', 'smile', 'bored', 'cold', 'grin', 'smirk', 'serious', 'panic', 'surprised', 'suspicious', 'confused', 'tired'];
const EXPR_ALIAS = { emi: { smirk: 'teasing', bored: 'neutral', serious: 'neutral', tired: 'worried', panic: 'worried', cold: 'neutral', grin: 'laughing' } };
function loadSprite(img, id, expr, done) {
  expr = EXPR_ALIAS[id]?.[expr] || expr;
  const tries = [expr, ...FALLBACK_EXPR.filter(e => e !== expr)];
  let i = 0;
  const next = () => {
    if (i >= tries.length) { done(false); return; }
    const src = `img/ch/${id}-${tries[i++]}.webp`;
    const probe = new Image(); probe.onload = () => { img.src = src; done(true); }; probe.onerror = next; probe.src = src;
  };
  next();
}
// On a phone only one character is drawn at a time (the one in front: the speaker, or whoever arrived last),
// centred. Two sprites side by side overlap at 390 px, so the others wait off screen (playtest 3).
function setFront(id) { if (!onStage[id]) return; for (const [k, el] of Object.entries(onStage)) el.classList.toggle('front', k === id); }
function showChar(id, expr = 'neutral', at = 'center') {
  let el = onStage[id];
  if (!el) {
    el = h('div', `ch ${at} enter`); const img = h('img'); img.alt = CAST[id]?.en || id; el.append(img);
    chars.append(el); onStage[id] = el;
    loadSprite(img, id, expr, ok => { if (!ok) el.style.display = 'none'; requestAnimationFrame(() => el.classList.remove('enter')); });
  } else {
    if (at) el.className = `ch ${at}${el.classList.contains('front') ? ' front' : ''}`;
    setExpr(id, expr);
  }
  setFront(id);
}
function setExpr(id, expr) { const el = onStage[id]; if (!el || !expr) return; loadSprite(el.querySelector('img'), id, expr, () => {}); }
function hideChar(id) {
  const el = onStage[id]; if (!el) return; el.classList.add('enter'); setTimeout(() => el.remove(), 350); delete onStage[id];
  if (el.classList.contains('front')) { const rest = Object.keys(onStage); if (rest.length) setFront(rest[rest.length - 1]); }
}
function focusSpeaker(id) { for (const [k, el] of Object.entries(onStage)) el.classList.toggle('dim', !!id && k !== id); if (id) setFront(id); }
function defaultSpot() { const used = Object.values(onStage).map(el => ['left', 'center', 'right'].find(c => el.classList.contains(c))); return ['center', 'left', 'right'].find(p => !used.includes(p)) || 'center'; }

/* ---------------- input helpers ---------------- */
let keyHandler = null, englishHandler = null;
let backlogEl = null;
function openBacklog() {
  if (backlogEl || !backlog.length) return;
  backlogEl = h('div', 'backlog');
  const list = h('div', 'bl-list');
  for (const b of backlog) {
    const row = h('div', 'bl-row');
    row.append(h('div', 'bl-who', b.who || ''), h('div', b.jp ? 'bl-jp' : 'bl-narr', b.jp ? renderJP(b.jp) : b.en));
    if (b.voice) { const r = h('button', 'bl-play', '♪'); r.onclick = e => { e.stopPropagation(); playVoice(b.voice[0], b.voice[1], .85); }; row.append(r); }
    list.append(row);
  }
  const close = h('button', 'tool-btn bl-close', 'Close'); close.onclick = e => { e.stopPropagation(); closeBacklog(); };
  const head = h('div', 'bl-head', `<span>Earlier lines${TOUCH ? '' : ' · Esc or scroll down to return'}</span>`); head.append(close);
  backlogEl.append(head, list);
  ui.append(backlogEl);
  list.scrollTop = list.scrollHeight;
  backlogEl.addEventListener('click', e => e.stopPropagation());
  list.addEventListener('wheel', e => { if (e.deltaY > 0 && list.scrollTop + list.clientHeight >= list.scrollHeight - 2) closeBacklog(); });
}
function closeBacklog() { backlogEl?.remove(); backlogEl = null; }
stage.addEventListener('wheel', e => { if (e.deltaY < 0 && !backlogEl && !e.target.closest('#phone')) openBacklog(); }, { passive: true });
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'PageUp') { e.preventDefault(); openBacklog(); return; }
  if (backlogEl) { if (e.key === 'Escape' || e.key === 'PageDown') closeBacklog(); return; }
  if (phone.classList.contains('app')) { keyHandler?.(e); return; }
  if (e.key === 'p' || e.key === 'P') { phone.hidden ? openPhone() : closePhone(); return; }
  if (e.key === 'Escape') { closePhone(); return; }
  if (e.key === 'r' || e.key === 'R') { replay(); return; }
  if ((e.key === 't' || e.key === 'T') && englishHandler) { englishHandler(); return; }
  keyHandler?.(e);
});
function waitAdvance(onFirst) {
  return new Promise(res => {
    let first = !!onFirst;
    const go = () => { if (first) { first = false; if (onFirst() === false) return; } cleanup(); res(); };
    const click = e => { if (e.target.closest('.phone-btn, .w, #phone, button, a, .hud-photo')) return; go(); };
    const cleanup = () => { stage.removeEventListener('click', click); keyHandler = null; englishHandler = null; };
    stage.addEventListener('click', click);
    keyHandler = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); go(); } };
  });
}
// `render` returns the element that commits the option (for a spoken reply that is its Say button, never the text).
function pick(options, render) {
  return new Promise(res => {
    const els = options.map((o, i) => { const el = render(o, i); el.addEventListener('click', e => {
      if (el.disabled) return;
      e.stopPropagation(); sfx('tap', .35); keyHandler = null; englishHandler = null; res(o);
    }); return el; });
    keyHandler = e => { const n = +e.key; if (n >= 1 && n <= options.length && !els[n - 1].disabled) { e.preventDefault(); els[n - 1].click(); } };
  });
}

/* ---------------- lines ---------------- */
// Speaker names are shown in English. On the train Rei is "Woman" until she says her name.
// Ishibashi never gives his name on day 1: he is the guard's voice from a speaker.
const whoName = who => (who === 'rei' && S.flags.reiNamed === false ? 'Woman' : who === 'ishibashi' && S.day === 1 ? 'Guard (speaker)' : CAST[who]?.en || who);
// On a phone the sprite steps back while a prop or the phone is up; a small face next to the name keeps the speaker clear.
const faceOf = who => (onStage[who] ? `<img class="face" src="${onStage[who].querySelector('img').getAttribute('src')}" alt="">` : '');
// The line just spoken stays on screen above the choice that answers it.
let ctx = null;
function advanceMark() {
  S.adv = (S.adv || 0) + 1;
  return h('div', 'adv', TOUCH ? 'Tap to continue ▾' : 'Click or Space to continue ▾');
}
function lineTools(box, st, markups, reveal, voiced) {
  const tools = h('div', 'tools');
  if (st.en) meaningButton(tools, markups, reveal);
  if (voiced) { const r = h('button', 'tool-btn', 'Replay'); r.onclick = e => { e.stopPropagation(); replay(); }; tools.append(r); }
  if (backlog.length > 3) { const l = h('button', 'tool-btn', 'Log'); l.onclick = e => { e.stopPropagation(); openBacklog(); }; tools.append(l); }
  box.append(tools);
  return tools;
}
// The supported version of a line, used once the player has needed help on several lines.
const useAlt = o => !!o.alt && support() && (!o.alt.needKnown || (word(o.alt.needKnown).stage || 0) >= 2);
// Karaoke: characters light up in proportion to the audio's progress. Punctuation counts as a short pause.
function karaoke(line, audio) {
  const spans = [];
  const walk = node => {
    for (const n of [...node.childNodes]) {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        for (const ch of n.textContent) { const sp = document.createElement('span'); sp.className = 'k'; sp.textContent = ch; frag.append(sp); spans.push(sp); }
        n.replaceWith(frag);
      } else if (n.nodeName !== 'RT' && !n.classList?.contains('mean')) walk(n);
    }
  };
  walk(line);
  const weight = ch => ('、。，．…？！?!　'.includes(ch.textContent) ? 2.2 : 1);
  const cum = []; let tot = 0; for (const sp of spans) { tot += weight(sp); cum.push(tot); }
  line.classList.add('karaoke');
  let raf;
  const tick = () => {
    if (!audio.duration) { raf = requestAnimationFrame(tick); return; }
    // Voices have a little silence at both ends; map the middle 90% of the clip onto the text.
    const p = Math.min(1, Math.max(0, (audio.currentTime / audio.duration - .04) / .9)) * tot;
    spans.forEach((sp, i) => sp.classList.toggle('on', cum[i] - weight(sp) < p));
    if (!audio.ended && !audio.paused) raf = requestAnimationFrame(tick); else if (audio.ended) finish();
  };
  const finish = () => { cancelAnimationFrame(raf); line.classList.add('done'); };
  audio.addEventListener('play', () => { line.classList.remove('done'); raf = requestAnimationFrame(tick); });
  audio.addEventListener('ended', finish);
  raf = requestAnimationFrame(tick);
  return finish;
}
// Backlog: every spoken line, message and player line, for scrolling back.
const backlog = [];
function logLine(who, jp, en, voice) { backlog.push({ who, jp, en, voice }); if (backlog.length > 300) backlog.shift(); }
function lineBlock(st, name, color) {
  const frag = h('div', 'said');
  if (st.cap) frag.append(h('div', 'cap', st.cap));
  frag.append(h('div', 'who', `${faceOf(st.say)}<span style="color:${color}">${name}</span>`));
  const line = h('div', 'line', renderJP(st.jp, { gl: st.gl })); line.dataset.line = plain(st.jp);
  frag.append(line);
  const en = h('div', 'en', st.en || ''); en.hidden = true; frag.append(en);
  return { frag, line, en };
}
async function say(st) {
  if (useAlt(st)) st = { ...st, ...st.alt };
  const who = st.say, c = CAST[who] || { name: who, color: '#fff' };
  // `off`: a voice with no sprite (a speaker, a phone, the other side of a door).
  const visible = who !== 'announcer' && who !== 'player' && !st.off;
  if (visible) { if (!onStage[who]) showChar(who, st.expr, defaultSpot()); else setExpr(who, st.expr); }
  focusSpeaker(visible ? who : null);
  markSeen(st.jp);
  const name = (st.as || whoName(who)) + (st.via ? ` · ${st.via}` : '');
  logLine(name, st.jp, st.en, [who, plain(st.jp)]);
  if (st.via === 'voice message') keepVoiceLine(who, st);
  const box = h('div', 'subs');
  const { frag, line, en } = lineBlock(st, name, c.color);
  box.append(frag);
  const a = playVoice(who, plain(st.jp));
  ui.innerHTML = ''; ui.append(box);
  if (st.auto) {
    if (a) await new Promise(r => { a.addEventListener('ended', r); a.addEventListener('error', r); setTimeout(r, 6000); }); else await sleep(1100);
    return;
  }
  lineTools(box, st, [st.jp], v => { en.hidden = !v; }, !!a);
  if (st.cue === 'tap') { const w = line.querySelector('.w'); if (w) setCue(w, 'Tap a word for help.', null); }
  if (st.cue === 'tap2') line.querySelectorAll('.w').forEach(w => { if (w.querySelector('rt')) w.dataset.cue2 = 1; });
  let finish = null;
  if (a && S.settings.karaoke !== false) finish = karaoke(line, a);
  // A question answered by the next choice stays on screen with it.
  if (st.noWait) { ctx = { st, name, color: c.color }; return; }
  box.append(advanceMark());
  // First press while a line is still being spoken shows it all; the next press continues.
  await waitAdvance(() => { if (finish && !line.classList.contains('done') && a && !a.ended) { finish(); return false; } return true; });
  clearCue();
  voiceEl?.pause();
}
async function narrate(text) {
  focusSpeaker(null); logLine('', '', text, null);
  const box = h('div', 'subs'); box.append(h('div', 'narr', text), advanceMark()); ui.innerHTML = ''; ui.append(box);
  await waitAdvance();
}
async function notify(m) {
  focusSpeaker(null); markSeen(m.jp); logLine(CAST[m.from]?.en || m.from, m.jp, m.en, null);
  const box = h('div', 'subs');
  box.append(h('div', 'who', `<span style="color:#ff9a8a">${CAST[m.from]?.en || m.from}</span>　<span class="small-tag">message</span>`));
  const line = h('div', 'line', renderJP(m.jp)); line.dataset.line = plain(m.jp);
  box.append(line);
  const en = h('div', 'en', m.en); en.hidden = true; box.append(en);
  lineTools(box, m, [m.jp], v => { en.hidden = !v; }, false);
  box.append(advanceMark());
  ui.innerHTML = ''; ui.append(box);
  await waitAdvance();
}

/* ---------------- steps ---------------- */
class Goto { constructor(scene) { this.scene = scene; } }
async function exec(steps) {
  const list = steps || [];
  for (let i = 0; i < list.length; i++) {
    let st = list[i];
    // A spoken line followed directly by a choice doesn't wait: the choice shows it above the options.
    if (st.say && !st.auto && list[i + 1]?.choose && list[i + 1].choose.kind !== 'lcd') st = { ...st, noWait: true };
    const r = await step(st); if (r instanceof Goto) return r;
  }
}
const flagOk = f => (f.startsWith('!') ? !S.flags[f.slice(1)] : !!S.flags[f]);
async function step(st) {
  if (st.bg) setBg(st.bg);
  if ('music' in st) music(st.music);
  if ('amb' in st) ambience(st.amb);
  if (st.tone) tone(st.tone);
  if (st.wait) await sleep(st.wait);
  if (st.clock) { S.time = Math.max(S.time, parseClock(st.clock)); drawHud(); }
  if (st.time) { S.time += st.time; drawHud(); }
  if ('insert' in st) insert(st.insert);
  if (st.narrate) await narrate(st.narrate);
  if (st.say) await say(st);
  if (st.show) showChar(st.show, st.expr, st.at);
  if (st.hide) hideChar(st.hide);
  if (st.hideAll) Object.keys(onStage).forEach(hideChar);
  if ('hand' in st) await handStep(st.hand);
  if (st.msg) { S.messages.push({ ...st.msg, day: S.day }); S.unread = true; sfx('bell', .35); drawHud(true); await notify(st.msg); }
  if ('task' in st) { S.task = st.task; drawHud(!!st.task); }
  if (st.set) Object.assign(S.flags, st.set);
  if (st.fx) for (const [k, v] of Object.entries(st.fx)) S.rel[k] = (S.rel[k] || 0) + v;
  if (st.suspicion) S.suspicion += st.suspicion;
  if (st.sus) for (const [k, v] of Object.entries(st.sus)) { S.sus[k] = (S.sus[k] || 0) + v; S.suspicion += v; }
  if (st.noise) S.noise += st.noise;
  if (st.unset) for (const k of st.unset) delete S.flags[k];
  if (st.stamp) (S.stamps ||= {})[st.stamp] = S.time;
  if (st.sign) await sign(st.sign);
  if (st.findEntrance) await findEntrance(st.findEntrance);
  let r;
  if (st.ifNoise != null) r = await exec(S.noise >= st.ifNoise ? st.then : st.else);
  if (!r && st.ifCasts != null) r = await exec(S.casts <= st.ifCasts ? st.then : st.else);
  if (!r && st.ifWithin) { const w = st.ifWithin; r = await exec(S.time - (S.stamps?.[w.since] ?? S.time) <= w.min ? w.then : w.else); }
  if (st.ifLate && S.time > parseClock(st.ifLate)) r = await exec(st.then);
  if (!r && st.ifTime) r = await exec(S.time > parseClock(st.ifTime.after) ? st.ifTime.then : st.ifTime.else);
  if (!r && st.if) r = await exec(flagOk(st.if) ? st.then : st.else);
  if (!r && st.ifRel) { const v = S.rel[st.ifRel.who] || 0; const ok = 'atLeast' in st.ifRel ? v >= st.ifRel.atLeast : v < st.ifRel.below; r = await exec(ok ? st.ifRel.then : st.ifRel.else); }
  if (!r && st.ifSupport) r = await exec(support() ? st.ifSupport.then : st.ifSupport.else);
  if (r) return r;
  if (st.choose) { r = await choose(st.choose); if (r) return r; }
  if (st.pin) await pin(st.pin);
  if (st.elevator) await elevator(st.elevator);
  if (st.menu) await menu(st.menu);
  if (st.pay) await pay(st.pay);
  if (st.spell) { r = await spell(typeof st.spell === 'string' ? { ...SPELLS[st.spell], witnesses: st.witnesses ?? SPELLS[st.spell].witnesses } : st.spell); if (r) return r; }
  if (st.learnSpell) await learnSpell(st.learnSpell);
  if (st.freeTalk) { r = await freeTalk(st.freeTalk); if (r) return r; }
  if (st.freeReply) { r = await freeReply(st.freeReply); if (r) return r; }
  if (st.reviewMessages) await reviewMessages(st.reviewMessages);
  if (st.findLabel) await findLabel(st.findLabel);
  if (st.glossNote) await glossNote(st.glossNote);
  if (st.reward) await reward(st.reward);
  if (st.autosave) await autosave();
  if (st.summary) return summary();
  if (st.goto) return new Goto(st.goto);
  save();
}

// Choices. Spoken replies are a text area (tap its words for help; tapping it never chooses) with a separate
// Say button at the side. Physical actions are plain English buttons. `where: 'phone'` puts the replies on the
// handset with Send buttons and a "Help me reply" control.
async function choose(c) {
  const used = new Set();
  const context = ctx; ctx = null;
  for (;;) {
    // Options are re-checked every time the choice comes back, so flags set by one option can open or close others.
    const options = c.options.filter(o => !used.has(o) && (!o.if || flagOk(o.if))).map(o => (useAlt(o) ? { ...o, ...o.alt, orig: o } : o));
    ui.innerHTML = '';
    if (c.kind === 'lcd' || c.kind === 'sign') { const r = await chooseOld(c, options, used); if (r === 'again') continue; return r; }
    const phoneReply = c.where === 'phone';
    const wrap = h('div', `choices2${phoneReply ? ' phone-reply' : ''}`);
    const reveals = [], markups = [];
    if (context) {
      const cc = context.st;
      const { frag, line, en } = lineBlock(cc, context.name, context.color);
      frag.classList.add('ctx');
      wrap.append(frag); reveals.push(en); markups.push(cc.jp);
      if (cc.cue === 'tap2') line.querySelectorAll('.w').forEach(w => { if (w.querySelector('rt')) w.dataset.cue2 = 1; });
    }
    if (c.prompt) wrap.append(h('div', 'prompt', c.prompt.includes('{') ? renderJP(c.prompt) : c.prompt));
    const list = h('div', 'opts');
    const host = phoneReply ? handReplies() : wrap;
    host.append(list);
    ui.append(wrap);
    const pending = pick(options, (o, i) => {
      const noBreath = o.magic && S.breath <= 0;
      if (o.act || c.show === 'en' || c.meta) {
        const b = h('button', `opt act${o.magic ? ' magic' : ''}`, `<span class="act-label">${esc(o.act || o.en)}</span>${o.says ? `<span class="says">You say: ${esc(plain(o.says))}</span>` : ''}`);
        if (noBreath) { b.disabled = true; b.classList.add('spent'); }
        list.append(b); return b;
      }
      const row = h('div', `opt spk${o.magic ? ' magic' : ''}${plain(o.jp).length > 11 ? ' long' : ''}`);
      const txt = h('div', 'opt-text'); txt.dataset.line = plain(o.jp);
      // Physical actions get a plain English label; the Japanese under it is there to tap.
      txt.innerHTML = `${c.kind === 'action' && o.en ? `<span class="opt-act-en">${esc(o.en)}</span>` : ''}<span class="opt-jp">${renderJP(o.jp, { gl: o.gl })}</span>`;
      const en = h('div', 'opt-en', `${c.kind === 'action' ? '' : o.en || ''}${noBreath ? ' · no kotodama left today' : ''}`); en.hidden = !noBreath; txt.append(en);
      reveals.push(en); markups.push(o.jp);
      // Day 1's older action choices keep Japanese labels; they are done, not said aloud.
      const action = o.jp.startsWith('（') || c.kind === 'action';
      const b = h('button', 'say-btn', phoneReply ? 'Send' : action ? 'Do it' : 'Say it');
      b.setAttribute('aria-label', `${phoneReply ? 'Send' : action ? 'Do' : 'Say'}: ${plain(o.jp)}`);
      if (noBreath) { b.disabled = true; row.classList.add('spent'); }
      row.append(txt, b); list.append(row); return b;
    });
    // The first spoken choice says once how replies work.
    if (!S.flags.replyCue && options.some(o => o.jp && !o.act) && c.show !== 'en' && !c.meta) {
      S.flags.replyCue = true;
      list.before(h('div', 'cue cue-flow', phoneReply ? 'Tap words for help. Send picks the reply.' : 'Tap words for help. Say it picks the reply.'));
    }
    const tools = h('div', 'tools');
    const anyText = markups.length > (context ? 1 : 0) || context;
    if (anyText && c.show !== 'en' && !c.meta) {
      if (phoneReply) {
        if (context) meaningButton(tools, [context.st.jp], v => { reveals[0].hidden = !v; });
        const hb = h('div', 'hs-tools'); host.prepend(hb);
        meaningButton(hb, markups.slice(context ? 1 : 0), v => reveals.slice(context ? 1 : 0).forEach(e => { e.hidden = !v; }), 'Help me reply (English)');
        englishHandler = null;
      } else meaningButton(tools, markups, v => reveals.forEach(e => { e.hidden = !v; }));
    }
    if (lastVoice && (context || !phoneReply)) { const rp = h('button', 'tool-btn', 'Replay'); rp.onclick = e => { e.stopPropagation(); replay(); }; tools.append(rp); }
    if (backlog.length > 3) { const l = h('button', 'tool-btn', 'Log'); l.onclick = e => { e.stopPropagation(); openBacklog(); }; tools.append(l); }
    wrap.append(tools);
    const chosen = await pending;
    clearCue();
    const orig = chosen.orig || chosen;
    if (phoneReply && chosen.jp) await handSent(chosen);
    else if (c.chat && chosen.jp) { markSeen(chosen.jp); logLine('You', chosen.jp, chosen.en, null); await chatOut(chosen.jp); }
    else if (chosen.jp && !chosen.act && c.show !== 'en' && !c.meta && c.kind !== 'action' && !chosen.jp.startsWith('（')) await say({ say: 'player', jp: chosen.jp, en: chosen.en, gl: chosen.gl, auto: true });
    else if (chosen.jp && c.show !== 'en') markSeen(chosen.jp);
    else if (chosen.act) logLine('', '', `(${chosen.act})`, null);
    if (options.some(o => o.correct)) { S.grammar.total++; if (chosen.correct) S.grammar.right++; }
    if (chosen.fx) for (const [k, v] of Object.entries(chosen.fx)) S.rel[k] = (S.rel[k] || 0) + v;
    const r = await exec(chosen.then || []);
    if (r) return r;
    if (!chosen.retry || (c.until && flagOk(c.until))) return;
    if (!chosen.again) used.add(orig);
  }
}
// The keypad and the sign choices keep their own look: one button each, no words to tap.
async function chooseOld(c, options, used) {
  const wrap = h('div', `choices${c.kind === 'sign' ? ' signs' : ''}${c.kind === 'lcd' ? ' lcd' : ''}`);
  if (c.prompt) wrap.append(h('div', 'prompt', c.prompt.includes('{') ? renderJP(c.prompt) : c.prompt));
  ui.append(wrap);
  const chosen = await pick(options, (o, i) => {
    const label = c.kind === 'lcd' ? `<span class="digits">${o.jp}</span>` : `${renderJP(o.jp)}`;
    const b = h('button', `choice${c.kind === 'sign' ? ' sign' : ''}`, `<kbd>${i + 1}</kbd>${label}`);
    b.querySelectorAll('.w').forEach(w => w.classList.add('nolook'));
    wrap.append(b); return b;
  });
  sfx('tap', .3);
  if (c.kind !== 'lcd') markSeen(chosen.jp);
  if (chosen.fx) for (const [k, v] of Object.entries(chosen.fx)) S.rel[k] = (S.rel[k] || 0) + v;
  const r = await exec(chosen.then || []);
  if (r) return r;
  if (!chosen.retry || (c.until && flagOk(c.until))) return;
  if (!chosen.again) used.add(chosen);
  return 'again';
}
// The player's own chat message, shown briefly as sent.
async function chatOut(jp) {
  ui.innerHTML = '';
  const box = h('div', 'subs chat-out');
  box.append(h('div', 'who', '<span style="color:#cfe0ff">You</span>　<span class="small-tag">message</span>'), h('div', 'line', renderJP(jp)));
  ui.append(box); sfx('tap', .25);
  await sleep(1100);
}

/* ---------------- the train opening: props, the player's phone, sounds ---------------- */
// Drawn props sit in #over, between the characters and the subtitles. On a phone the sprite steps back while one is up.
const over = h('div'); over.id = 'over'; stage.insertBefore(over, hud);
const setOverlay = () => stage.classList.toggle('ov', !!over.querySelector('.insert, .handset, .photo-card'));
function insert(name) {
  over.querySelector('.insert')?.remove();
  if (name) over.append(h('div', `insert ins-${name}`, insertHTML(name, (m, gl) => `<span class="ins-word" data-line="${esc(plain(m))}">${renderJP(m, { gl })}</span>`)));
  setOverlay();
}
// The player's phone as a prop: a chat thread with Emi, the housing card, her photo.
let hand = null;
function handShell(title) {
  if (!hand) {
    hand = h('div', 'handset', `<div class="hs-bar"><span class="hs-time"></span><span>AMAKAWA</span></div><div class="hs-head"></div><div class="hs-body"></div><div class="hs-foot"></div>`);
    over.append(hand);
  }
  hand.querySelector('.hs-time').textContent = digital(S.time);
  hand.querySelector('.hs-head').innerHTML = title;
  setOverlay();
  return hand;
}
const emiHead = () => `<img class="hs-av" src="img/ch/emi-smile.webp" alt=""><div><b>${renderJP('エミ', { gl: { エミ: 'Emi (a name)' } })}</b><small>Emi · your new team lead</small></div>`;
const hsBody = () => hand.querySelector('.hs-body'), hsFoot = () => hand.querySelector('.hs-foot');
function handReplies() { const f = hsFoot(); f.innerHTML = ''; return f; }
function bubble(cls, html) { const b = h('div', `bub ${cls}`, html); hsBody().append(b); hsBody().scrollTop = 1e6; return b; }
function keepVoiceLine(who, st) {
  let m = S.messages[S.messages.length - 1];
  if (!m || m.kind !== 'voice' || m.from !== who || m.closed) { m = { from: who, kind: 'voice', day: S.day, lines: [] }; S.messages.push(m); S.unread = true; drawHud(true); }
  m.lines.push({ jp: st.jp, en: st.en });
  const bub = hand && [...hand.querySelectorAll('.bub.in.voice')].pop();
  if (bub) { let t = bub.querySelector('.vtext'); if (!t) { t = h('div', 'vtext'); bub.append(t); } t.insertAdjacentHTML('beforeend', `<div class="hs-text" data-line="${esc(plain(st.jp))}">${renderJP(st.jp, { gl: st.gl })}</div>`); hsBody().scrollTop = 1e6; }
}
async function handStep(m) {
  if (!m) { if (hand) { hand.remove(); hand = null; phoneCue(); } const lastV = S.messages[S.messages.length - 1]; if (lastV?.kind === 'voice') lastV.closed = true; setOverlay(); return; }
  if (m.mode === 'housing') {
    handShell(`<div><b>Housing</b><small>Amakawa staff app</small></div>`);
    hsBody().innerHTML = housingHTML(mk => `<span class="ins-word" data-line="${esc(plain(mk))}">${renderJP(mk, { gl: { 寮: 'dorm, company housing' } })}</span>`);
    hsFoot().innerHTML = '';
    return;
  }
  if (m.mode === 'voicemail') {
    handShell(emiHead()); hsBody().innerHTML = ''; hsFoot().innerHTML = '';
    const b = bubble('in voice', `<button class="play-btn" aria-label="Play the voice message">▶</button><span class="wave"></span><span class="dur">0:04</span>`);
    ui.innerHTML = '';
    const box = h('div', 'subs'); box.append(h('div', 'narr', 'Your phone buzzes. A voice message from Emi.')); ui.append(box);
    const play = b.querySelector('.play-btn');
    play.classList.add('pulse');
    const cueEl = h('div', 'cue cue-hand', 'Tap Play'); hand.append(cueEl);
    await new Promise(res => { play.onclick = e => { e.stopPropagation(); res(); }; keyHandler = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); res(); } }; });
    keyHandler = null; cueEl.remove();
    play.classList.remove('pulse'); b.classList.add('playing'); play.textContent = '❚❚'; sfx('tap', .3);
    return;
  }
  if (m.mode === 'recording') {
    const b = bubble('in typing', `<span class="dots"><i></i><i></i><i></i></span><small>Emi is recording…</small>`);
    await sleep(1300);
    hsBody().querySelectorAll('.bub.playing .play-btn').forEach(x => { x.textContent = '▶'; x.closest('.bub').classList.remove('playing'); });
    b.className = 'bub in voice playing'; b.innerHTML = `<button class="play-btn" tabindex="-1">❚❚</button><span class="wave"></span><span class="dur">0:02</span>`;
    return;
  }
  if (m.mode === 'photo') {
    handShell(emiHead()); hsBody().innerHTML = ''; hsFoot().innerHTML = '';
    const msg = { from: m.from, kind: 'photo', img: 'gate', jp: m.jp, en: m.en, gl: m.gl, day: S.day };
    S.messages.push(msg); S.unread = true; drawHud(true); markSeen(m.jp); logLine('Emi', m.jp, m.en, null);
    const b = bubble('in photo', `<img src="img/bg/gate.webp" alt="Emi's photo: glass security gates in a lobby"><div class="hs-text" data-line="${esc(plain(m.jp))}">${renderJP(m.jp, { gl: m.gl })}</div><div class="hs-en" hidden>${esc(m.en)}</div>`);
    const tb = h('div', 'hs-tools'); b.append(tb);
    meaningButton(tb, [m.jp], v => { b.querySelector('.hs-en').hidden = !v; });
    ui.innerHTML = '';
    const box = h('div', 'subs'); box.append(h('div', 'narr', 'Your phone buzzes again. Emi sent a photo.')); ui.append(box);
    const keep = h('button', 'keep-btn', 'Keep this photo'); hsFoot().append(keep);
    await new Promise(res => { keep.onclick = e => { e.stopPropagation(); res(); }; });
    englishHandler = null;
    sfx('place', .4); S.flags.keptPhoto = true; msg.kept = true;
    if (m.task) { S.task = m.task; drawHud(true); }
    keep.replaceWith(h('div', 'kept', 'Saved. It\'s next to your goal at the top of the screen.'));
    await sleep(1600);
  }
}
// First message: say once where messages are kept.
function phoneCue() {
  if (S.flags.phoneCue || !S.messages.length) return; S.flags.phoneCue = true;
  const c = h('div', 'cue cue-phone', 'Messages are saved in your phone, top right'); hud.append(c); setTimeout(() => c.remove(), 5000);
}
async function handSent(o) {
  markSeen(o.jp); logLine('You', o.jp, o.en, ['player', plain(o.jp)]);
  handReplies();
  hsBody().querySelectorAll('.bub.playing').forEach(x => { x.classList.remove('playing'); const pb = x.querySelector('.play-btn'); if (pb) pb.textContent = '▶'; });
  bubble('out voice', `<span class="play-btn mini">▶</span><span class="wave"></span><span class="hs-text">${renderJP(o.jp)}</span>`).querySelectorAll('.w').forEach(w => w.classList.add('nolook'));
  (S.messages[S.messages.length - 1]?.lines || []).push({ jp: o.jp, en: o.en, me: true });
  ui.innerHTML = '';
  const box = h('div', 'subs');
  box.append(h('div', 'who', '<span style="color:#cfe0ff">You · recording</span>'), h('div', 'line', renderJP(o.jp)));
  ui.append(box);
  const a = playVoice('player', plain(o.jp));
  if (a) await new Promise(r => { a.addEventListener('ended', r); a.addEventListener('error', r); setTimeout(r, 6000); }); else await sleep(1100);
}
// Emi's photo, reopened from the goal at the top of the screen.
function showPhoto() {
  if (over.querySelector('.photo-view')) return;
  const m = [...S.messages].reverse().find(x => x.kind === 'photo');
  if (!m) return;
  const v = h('div', 'photo-view', `<div class="pv-card"><img src="img/bg/${m.img}.webp" alt="Emi's photo: glass security gates in a lobby"><div class="hs-text" data-line="${esc(plain(m.jp))}">${renderJP(m.jp, { gl: m.gl })}</div><div class="hs-en" hidden>${esc(m.en)}</div><div class="pv-tools"></div></div>`);
  const tb = v.querySelector('.pv-tools');
  const mb = h('button', 'tool-btn', 'Meaning'); mb.onclick = e => { e.stopPropagation(); v.querySelector('.hs-en').hidden = false; mb.remove(); };
  const cl = h('button', 'tool-btn', 'Close'); cl.onclick = e => { e.stopPropagation(); v.remove(); };
  tb.append(mb, cl);
  v.addEventListener('click', e => e.stopPropagation());
  over.append(v);
}
// The gate: find the entrance from Emi's photo by tapping it in the scene.
const GATE_DOOR = { w: 1920, h: 1314, x0: 300, x1: 1705, y0: 690, y1: 1050 };
async function findEntrance(fe) {
  ui.innerHTML = '';
  const card = h('div', 'photo-card', `<img src="img/bg/gate.webp" alt="Emi's photo of the entrance"><span>Emi's photo</span>`);
  over.append(card); setOverlay();
  const box = h('div', 'subs'); box.append(h('div', 'narr', fe.prompt)); ui.append(box);
  const spot = h('button', 'hotspot'); spot.setAttribute('aria-label', 'The open gate in the middle');
  over.append(spot);
  const place = () => {
    const W = stage.clientWidth, H = stage.clientHeight, k = Math.max(W / GATE_DOOR.w, H / GATE_DOOR.h);
    const ox = (W - GATE_DOOR.w * k) / 2, oy = (H - GATE_DOOR.h * k) / 2;
    Object.assign(spot.style, { left: `${ox + GATE_DOOR.x0 * k}px`, top: `${oy + GATE_DOOR.y0 * k}px`, width: `${(GATE_DOOR.x1 - GATE_DOOR.x0) * k}px`, height: `${(GATE_DOOR.y1 - GATE_DOOR.y0) * k}px` });
  };
  place(); addEventListener('resize', place);
  let misses = 0;
  const miss = e => { if (e.target === spot || e.target.closest('button')) return; if (++misses === 2) { box.append(h('div', 'cap', 'Look for the row of glass gates in the photo.')); spot.classList.add('strong'); } };
  stage.addEventListener('click', miss);
  await new Promise(res => { spot.onclick = e => { e.stopPropagation(); res(); }; keyHandler = e => { if (e.key === 'Enter') res(); }; });
  keyHandler = null;
  stage.removeEventListener('click', miss); removeEventListener('resize', place);
  sfx('tap', .35); spot.remove(); card.remove(); setOverlay();
  S.task = ''; drawHud();
  const t = h('div', 'toast', 'Goal done: you found the entrance'); stage.append(t); setTimeout(() => t.remove(), 2200);
}
async function autosave() {
  save();
  const t = h('div', 'toast', 'Saved'); stage.append(t);
  await sleep(1500); t.remove();
}
// Sounds made in code: the carriage hum and joints, the arrival chime, the doors, the phone buzzing.
let AC = null, ambNodes = null;
const ac = () => { try { AC ||= new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch { AC = null; } return AC; };
function noiseBuffer(ctxA, secs = 2) {
  const b = ctxA.createBuffer(1, ctxA.sampleRate * secs, ctxA.sampleRate), d = b.getChannelData(0);
  let last = 0; for (let i = 0; i < d.length; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
  return b;
}
function ambience(mode) {
  const a = ac(); if (!a) return;
  if (!mode) { if (ambNodes) { const n = ambNodes; ambNodes = null; n.gain.gain.setTargetAtTime(0, a.currentTime, .6); clearInterval(n.clack); setTimeout(() => n.src.stop(), 3000); } return; }
  if (!ambNodes) {
    const src = a.createBufferSource(); src.buffer = noiseBuffer(a, 4); src.loop = true;
    const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
    const gain = a.createGain(); gain.gain.value = 0;
    src.connect(lp).connect(gain).connect(a.destination); src.start();
    gain.gain.setTargetAtTime(.22, a.currentTime, 1.2);
    ambNodes = { src, lp, gain, clack: setInterval(() => tone('clack'), 3600) };
  }
  if (mode === 'pitch') { ambNodes.lp.frequency.setTargetAtTime(420, a.currentTime, 1.5); ambNodes.src.playbackRate.setTargetAtTime(1.15, a.currentTime, 1.5); }
  if (mode === 'slow') { clearInterval(ambNodes.clack); ambNodes.lp.frequency.setTargetAtTime(200, a.currentTime, 2); ambNodes.src.playbackRate.setTargetAtTime(.7, a.currentTime, 2); ambNodes.gain.gain.setTargetAtTime(.12, a.currentTime, 2); }
}
function tone(name) {
  const a = ac(); if (!a) return;
  const t = a.currentTime;
  const burst = (at, dur, freq, vol, type = 'bandpass') => {
    const s = a.createBufferSource(); s.buffer = noiseBuffer(a, dur + .05);
    const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = 1.2;
    const g = a.createGain(); g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(.0001, at + dur);
    s.connect(f).connect(g).connect(a.destination); s.start(at); s.stop(at + dur + .05);
  };
  const beep = (at, freq, dur, vol, type = 'sine') => {
    const o = a.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = a.createGain(); g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol, at + .02); g.gain.exponentialRampToValueAtTime(.0001, at + dur);
    o.connect(g).connect(a.destination); o.start(at); o.stop(at + dur + .05);
  };
  if (name === 'clack') { burst(t, .08, 180, .5, 'lowpass'); burst(t + .16, .08, 170, .4, 'lowpass'); }
  if (name === 'keys') for (let i = 0; i < 7; i++) burst(t + i * .13 + Math.random() * .05, .03, 3200, .12);
  if (name === 'chime') { beep(t, 659, .9, .12); beep(t + .45, 523, 1.2, .12); }
  if (name === 'buzz') for (let i = 0; i < 2; i++) beep(t + i * .45, 140, .3, .18, 'square');
  if (name === 'door') { burst(t, .9, 900, .25); burst(t + .1, .6, 400, .2); }
}

// A paper sign or screen text: read it, tap words, continue.
async function sign(sg) {
  markSeen(sg.jp); logLine('', sg.jp, sg.en, null);
  const box = h('div', 'subs');
  box.append(h('div', `paper${sg.kind ? ' ' + sg.kind : ''}`, renderJP(sg.jp)));
  const en = h('div', 'en', sg.en); en.hidden = true; box.append(en);
  const tools = h('div', 'tools'); box.append(tools, advanceMark());
  ui.innerHTML = ''; ui.append(box);
  englishButton(tools, [sg.jp], v => { en.hidden = !v; });
  await waitAdvance();
}

// Pin what you understood from a message or a spoken instruction. The task line is built from your pins.
async function pin(p) {
  ui.innerHTML = '';
  const wrap = h('div', 'pinbox');
  wrap.append(h('div', 'prompt', p.prompt));
  const fromMemory = p.fields.some(f => f.id.startsWith('e_'));
  if (!fromMemory) for (const m of S.messages.filter(m => m.day === S.day).slice(-2)) wrap.append(h('div', 'pin-msg', `<span class="from">${CAST[m.from]?.en || m.from}</span>${renderJP(m.jp)}`));
  ui.append(wrap);
  const picked = [];
  for (const f of p.fields) {
    const row = h('div', 'pin-row'); row.append(h('div', 'pin-label', f.labelEn || renderJP(f.label)));
    const opts = h('div', 'pin-opts'); row.append(opts); wrap.append(row);
    const i = await pick(f.options.map((o, i) => i), (idx, n) => { const b = h('button', 'pin-opt', `<kbd>${n + 1}</kbd>${f.en ? f.en[idx] : renderJP(f.options[idx])}`); opts.append(b); return b; });
    if (!f.en) markSeen(f.options[i]);
    opts.querySelectorAll('button').forEach((b, k) => { b.disabled = true; if (k === i) b.classList.add('on'); });
    picked.push(f.options[i]);
    if (i !== f.answer) S.flags[`pin_${f.id}_wrong`] = true;
  }
  S.task = p.fields.every(f => f.en) ? '' : picked.join('・'); drawHud(true);
  await sleep(500);
}

async function elevator(e) {
  for (;;) {
    ui.innerHTML = '';
    const panel = h('div', 'panel', `<h3>AMAKAWA TOWER</h3>${e.hint ? `<p class="panel-hint" data-line="${esc(plain(e.hint))}">${renderJP(e.hint)} Press the round button next to your floor.</p>` : ''}`);
    ui.append(panel);
    // The round button goes; the label is words to tap for help.
    const f = await pick(e.floors || FLOORS, (fl, i) => { const row = h('div', 'floor', `<span class="fl-label" data-line="${esc(plain(fl.jp))}">${renderJP(fl.jp)}</span>`); const b = h('button', 'btn'); b.setAttribute('aria-label', `Floor: ${fl.en}`); row.prepend(b); panel.append(row); return b; });
    markSeen(f.jp);
    sfx('bell', .3); S.time += 1; drawHud();
    ui.innerHTML = '';
    if (f.id === e.target) { await sleep(300); return; }
    S.flags.wrongFloor = true;
    const wrong = e.wrong && e.wrong !== 'default' ? e.wrong[f.id] : null;
    await exec(wrong || [{ narrate: `The doors open on ${f.en}. Not where you need to be.` }, { time: 5 }]);
  }
}

async function menu(m) {
  ui.innerHTML = '';
  const board = h('div', 'board', `<h3>${m.title || 'メニュー'}</h3>`);
  ui.append(board);
  const item = await pick(m.items, (it, i) => { const b = h('button', 'item', `<kbd>${i + 1}</kbd><span>${renderJP(it.jp)}</span><span class="dots"></span><span>${renderJP(yen(it.price))}</span>`); board.append(b); return b; });
  markSeen(item.jp); markSeen(yen(item.price));
  S.order = item;
  if (m.noPay) { await narrate(`You order: ${item.en}.`); return; }
  await say({ say: m.who || 'kaori', expr: 'smile', jp: `${yen(item.price)}ね。`, en: `"That's ${item.price} yen."` });
}

// Pay from a real wallet: pick coins and notes, hand them over, get change.
const MONEY = { 1000: '{千円札|せんえんさつ}', 500: '{五百円玉|ごひゃくえんだま}', 100: '{百円玉|ひゃくえんだま}', 50: '{五十円玉|ごじゅうえんだま}', 10: '{十円玉|じゅうえんだま}' };
async function pay(p) {
  const price = S.order?.price || 0;
  for (;;) {
    ui.innerHTML = '';
    const board = h('div', 'board wallet', `<h3>さいふ</h3><div class="small">Hand over enough for what you ordered, then press ${renderJP('{渡|わた|渡す}す')}. Kaori told you the price out loud (R replays it).</div>`);
    const row = h('div', 'coins'), go = h('button', 'choice go', `<kbd>↵</kbd>${renderJP('{渡|わた|渡す}す')}`);
    board.append(row, go); ui.append(board);
    const chosen = new Set();
    p.wallet.forEach((v, i) => {
      const b = h('button', v >= 1000 ? 'note' : 'coin', `<kbd>${i + 1}</kbd>${renderJP(MONEY[v] || yen(v))}`);
      b.onclick = () => { sfx('place', .4); if (chosen.has(i)) { chosen.delete(i); b.classList.remove('in'); } else { chosen.add(i); b.classList.add('in'); } };
      row.append(b);
    });
    await new Promise(res => {
      go.onclick = res;
      keyHandler = e => { if (e.key === 'Enter') res(); const n = +e.key; if (n >= 1 && n <= p.wallet.length) row.children[n - 1].click(); };
    });
    keyHandler = null;
    const sum = [...chosen].reduce((a, i) => a + p.wallet[i], 0);
    const who = p.who || 'kaori';
    if (sum < price) { await say({ say: who, expr: 'smile', jp: '{足|た|足りる}りないよ。', en: '"That\'s not enough."' }); continue; }
    if (sum === price) { await say({ say: who, expr: 'smile', jp: 'ちょうどね。ありがとう。', en: '"Exact change. Thanks."' }); S.rel[who] = (S.rel[who] || 0) + 1; }
    else await say({ say: who, expr: 'smile', jp: `はい、${yen(sum - price)}の{おつり}。`, en: `"Here's ${sum - price} yen change."` });
    return;
  }
}

// Spells: pick a verb, then build the form yourself (stem plus ending), or type it in romaji.
function commonPrefix(forms) { let p = forms[0]; for (const f of forms) while (!f.startsWith(p)) p = p.slice(0, -1); return p; }
const DISTRACT = ['して', 'って', 'いて', 'んで', 'いで', 'て', 'た', 'った', 'ない'];
const shuffle = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]);
// A spell: pick a verb, then the ending (tiles), or type the whole word in romaji.
//   sp.answer: the form that works cleanly → sp.success
//   sp.pass[form]: forms that work with side effects (loud, overdone) → run, then the scene moves on
//   sp.outcomes[form] / .default: misfires → run, then retry (or return to the caller's choice with sp.noRetry)
//   sp.giveUp: what happens if the player stops trying or runs out of voice (so nobody gets stuck)
async function spell(sp) {
  const fallback = async () => (sp.giveUp ? exec(sp.giveUp) : undefined);
  if (S.breath <= 0) { await narrate('Nothing comes. Your voice is spent for today.'); return fallback(); }
  sfx('open', .4);
  const witnesses = sp.witnesses === 'auto' ? 1 + (S.flags.aoiWithYou ? 1 : 0) : (sp.witnesses || 0);
  let tries = 0;
  while (S.breath > 0) {
    ui.innerHTML = '';
    const hintNow = sp.hints ? sp.hints[Math.min(tries, sp.hints.length - 1)] : sp.hint;
    const ov = h('div', 'spell'); const ring = h('div', 'ring');
    S.flags.knowsMagic = true; drawHud();
    ring.append(h('div', 'goal', `${renderJP('{言霊|ことだま}')} · ${sp.goal}`),
      h('div', 'meta', `${renderJP('{見|み|見る}ている{人|ひと}')}：${witnesses ? renderJP(`{${kanjiNum(witnesses)}人|${['', 'ひとり', 'ふたり', 'さんにん'][witnesses] || ''}}`) : 'なし'}　·　${breathMarks()}`),
      h('div', 'hint', hintNow || ''));
    const row = h('div', 'row');
    ring.append(row); ov.append(ring); ui.append(ov);
    const verb = sp.verbs.length === 1 ? sp.verbs[0] : await pick(sp.verbs, (v, i) => { const b = h('button', 'rune nolook', `${renderJP(`{${v.forms[0][0]}|${v.forms[0][1]}|${v.key}}`)}<small>${i + 1} · ${v.en}</small>`); row.append(b); return b; });
    const stem = commonPrefix(verb.forms.map(f => f[0]));
    const stemRead = commonPrefix(verb.forms.map(f => f[1]));
    const suffixes = [...new Set(verb.forms.map(f => f[0].slice(stem.length)))];
    const extra = shuffle(DISTRACT.filter(d => !suffixes.includes(d))).slice(0, Math.max(0, 6 - suffixes.length));
    const tiles = shuffle([...suffixes, ...extra]);
    row.innerHTML = '';
    ring.querySelector('.hint').textContent = hintNow || `${verb.en}. Pick the ending${TOUCH ? '' : ', or type the whole word in romaji and press Enter'}.`;
    if (tries === 0 && S.casts === 0) ring.append(h('div', 'hint soft', `Pick the ending${TOUCH ? '' : ', or type the whole word in romaji and press Enter'}.`));
    const built = h('div', 'built', (stem ? renderJP(`{${stem}|${stemRead}|${verb.key}}`) : '') + '<span class="blank">＿＿</span>');
    ring.insertBefore(built, row);
    const typed = h('input', 'spell-type'); typed.placeholder = romaji(verb.forms[0][1]) + ' → ?';
    ring.append(typed);
    if (!TOUCH) setTimeout(() => typed.focus(), 50);
    const form = await new Promise(res => {
      const mark = sp.markAfter != null && tries >= sp.markAfter ? sp.answer.slice(stem.length) : null;
      tiles.forEach((t, i) => { const b = h('button', `rune small${t === mark ? ' marked' : ''}`, `${t}<small>${i + 1}</small>`); b.onclick = () => res(stem + t); row.append(b); });
      keyHandler = e => { const n = +e.key; if (n >= 1 && n <= tiles.length) res(stem + tiles[n - 1]); };
      typed.addEventListener('keydown', e => {
        if (/^[1-9]$/.test(e.key) && !typed.value) { e.preventDefault(); keyHandler?.(e); return; }
        if (e.key !== 'Enter' || !typed.value.trim()) return;
        const k = hira(toKana(typed.value.trim())).replace(/[。？?]/g, '');
        const hit = [...verb.forms, ...(verb.typed || [])].find(f => hira(f[1]).replace(/[。？?]/g, '') === k);
        res(hit ? hit[0] : stem + '…');
      });
    });
    keyHandler = null;
    ui.innerHTML = '';
    S.breath--; S.casts++; tries++; drawHud();
    const glyph = h('div', 'cast-glyph', form); fx.append(glyph); setTimeout(() => glyph.remove(), 1500);
    S.grammar.total++;
    const g = (S.grammar.forms ||= {}); g[form] = (g[form] || 0) + 1;
    if (form === sp.answer) {
      S.grammar.right++;
      sfx('cast', .6); stage.classList.add('flash'); setTimeout(() => stage.classList.remove('flash'), 950); await sleep(900);
      return exec(sp.success);
    }
    if (sp.pass?.[form]) {
      sfx('cast', .6); stage.classList.add('flash', 'shake'); setTimeout(() => stage.classList.remove('flash', 'shake'), 950); await sleep(900);
      return exec(sp.pass[form]);
    }
    sfx('fizzle', .5); await sleep(700);
    if (witnesses && sp.witnessSus) for (const [k, v] of Object.entries(sp.witnessSus)) S.sus[k] = (S.sus[k] || 0) + v;
    const r = await exec(sp.outcomes?.[form] || sp.outcomes?.default || [{ narrate: 'Nothing happens.' }]);
    if (r) return r;
    if (sp.noRetry) return;
    if (S.breath <= 0) { await narrate('Your voice is spent for today.'); return fallback(); }
    // Stopping is offered only after a few tries, so the first spell almost always gets seen working.
    if (sp.stopAfter && tries < sp.stopAfter) continue;
    let again = false;
    await choose({ prompt: 'Try again?', kind: 'action', meta: true, options: [
      { jp: 'もう{一度|いちど}', en: `Try again (${S.breath} left today)`, then: [{ set: { __again: true } }] },
      { jp: 'やめる', en: sp.giveUpLabel || 'Stop', then: [] },
    ] });
    again = !!S.flags.__again; delete S.flags.__again;
    if (!again) return fallback();
  }
  return fallback();
}
async function learnSpell(ls) {
  if (!S.spells.some(s => s.form === ls.form)) S.spells.push({ ...ls, day: S.day });
  sfx('cast', .5);
  const ov = h('div', 'spell'); const ring = h('div', 'ring');
  const reading = (GLOSSARY[ls.key]?.r || '') + ls.form.slice(ls.key.length);
  ring.append(h('div', 'goal', renderJP('{新|あたら|新しい}しい{言霊|ことだま}')), h('div', 'cast-still', renderJP(`{${ls.form}|${reading || ls.form}|${ls.key}}`)), h('div', 'hint', ls.en), advanceMark());
  ov.append(ring); ui.innerHTML = ''; ui.append(ov);
  await waitAdvance();
}

/* ---------------- typed input ---------------- */
const ROMA = (() => {
  const m = { a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お', n: 'ん', '-': 'ー' };
  const rows = { k: 'かきくけこ', s: 'さしすせそ', t: 'たちつてと', n: 'なにぬねの', h: 'はひふへほ', m: 'まみむめも', y: 'や.ゆ.よ', r: 'らりるれろ', w: 'わ...を', g: 'がぎぐげご', z: 'ざじずぜぞ', d: 'だぢづでど', b: 'ばびぶべぼ', p: 'ぱぴぷぺぽ' };
  for (const [c, ks] of Object.entries(rows)) [...'aiueo'].forEach((v, i) => { if (ks[i] !== '.') m[c + v] = ks[i]; });
  Object.assign(m, { shi: 'し', chi: 'ち', tsu: 'つ', fu: 'ふ', ji: 'じ', wo: 'を' });
  for (const [c, k] of Object.entries({ ky: 'き', sh: 'し', ch: 'ち', ny: 'に', hy: 'ひ', my: 'み', ry: 'り', gy: 'ぎ', j: 'じ', by: 'び', py: 'ぴ' })) { m[c + 'a'] = k + 'ゃ'; m[c + 'u'] = k + 'ゅ'; m[c + 'o'] = k + 'ょ'; }
  return m;
})();
function toKana(s) {
  let out = ''; s = s.toLowerCase();
  for (let i = 0; i < s.length;) {
    const c = s[i];
    if (/[a-z-]/.test(c)) {
      if (c === s[i + 1] && !'aiueon'.includes(c)) { out += 'っ'; i++; continue; }
      if (c === 'n' && s[i + 1] && !/[aiueoy]/.test(s[i + 1])) { out += 'ん'; i++; continue; }
      let hit = false;
      for (const len of [3, 2, 1]) { const k = s.slice(i, i + len); if (ROMA[k]) { out += ROMA[k]; i += len; hit = true; break; } }
      if (!hit) { out += c; i++; }
    } else { out += c; i++; }
  }
  return out;
}
function kanaInput(placeholder) {
  const input = h('input'); input.placeholder = placeholder;
  input.addEventListener('input', () => { const v = input.value; if (/[aiueo]$|nn$|[^a-z]$/i.test(v)) { const k = toKana(v); if (!/[a-z]{3,}/i.test(k)) input.value = k; } });
  return input;
}
async function freeReply(fr) {
  ui.innerHTML = '';
  const wrap = h('div', 'talk'); wrap.append(h('div', 'goal', fr.prompt), h('div', 'who', '<span>あなた</span>'));
  const input = kanaInput('type in romaji… ↵'); wrap.append(input); ui.append(wrap);
  input.focus();
  await new Promise(res => input.addEventListener('keydown', e => { if (e.key === 'Enter' && input.value.trim()) res(); }));
  return exec(fr.then);
}
async function reviewMessages(rm) {
  for (const m of S.messages.slice(-rm.count)) {
    const box = h('div', 'subs');
    box.append(h('div', 'who', `<span style="color:#ff9a8a">${CAST[m.from]?.en || m.from}</span>`), h('div', 'line', renderJP(m.jp, { forceKana: true })), advanceMark());
    ui.innerHTML = ''; ui.append(box); markSeen(m.jp);
    await waitAdvance();
  }
}
async function findLabel(fl) {
  let options = fl.options.map((o, i) => i);
  for (;;) {
    ui.innerHTML = '';
    const wrap = h('div', 'choices signs'); wrap.append(h('div', 'prompt', fl.prompt)); ui.append(wrap);
    const i = await pick(options, (idx, n) => { const b = h('button', 'choice sign label', `<kbd>${n + 1}</kbd>${renderJP(fl.options[idx])}`); wrap.append(b); return b; });
    markSeen(fl.options[i]);
    if (i === fl.answer) return;
    await exec(fl.wrong);
    options = options.filter(o => o !== i);
  }
}
async function glossNote(g) {
  const key = g.key, e = GLOSSARY[key] || {};
  markSeen(`{${key}|${e.r || key}}`);
  const box = h('div', 'subs');
  box.append(h('div', 'gloss-card', `<b>${key}</b><div class="r">${e.r || ''} · ${romaji(e.r || key)}</div>${e.en || ''}`), advanceMark());
  ui.innerHTML = ''; ui.append(box);
  await waitAdvance();
}
async function reward(rw) {
  if (!S.rewards.some(r => r.id === rw.id)) S.rewards.push({ ...rw, day: S.day });
  sfx('win', .4);
  const ov = h('div', 'reward');
  const show = !(rw.rating === 'sensitive' && S.settings.discreet);
  if (show) { const img = h('img'); img.alt = rw.caption; img.onerror = () => img.remove(); img.src = `img/reward/${rw.id}.webp`; ov.append(img); }
  ov.append(h('div', 'caption', `${rw.caption}${show ? '' : '<br><span class="small">Discreet mode is on, so the picture stays hidden. It\'s saved in your phone\'s album.</span>'}`));
  ui.innerHTML = ''; ui.append(ov);
  await waitAdvance();
}

/* ---------------- free talk (LLM) ---------------- */
const PERSONAS = {
  jun: 'Jun, 40, the quiet bartender of a small bar inside the Amakawa company city. Calm, dry, kind, a little mysterious. Short casual Japanese.',
  mio: 'Mio, 25, a sardonic gamer coworker in Planning Office 7. Deadpan, few words, secretly warm. Casual Japanese.',
  emi: 'Emi, 32, the leader ("technically", she says) of Planning Office 7 in the basement. Warm and teasing, short casual sentences ending in ね or よ, calls him 新人くん. She is tired after a day of meetings.',
  rei: 'Rei, 26, the top salesperson. Cool, precise, a little predatory, curious about the player. Casual but sharp Japanese.',
  aoi: 'Aoi, 22, a chaotic, cheerful intern. Energetic, casual Japanese, uses あたし.',
  yuzuki: 'Yuzuki, 31, the company\'s PR spokeswoman and in-house reporter. Polished and friendly, secretly tired. Casual with the player.',
};
async function llm(messages) {
  const st = S.settings;
  const res = await fetch(`${st.llmEndpoint.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(st.llmKey ? { Authorization: `Bearer ${st.llmKey}` } : {}) },
    body: JSON.stringify({ model: st.llmModel || undefined, messages, temperature: 0.8, max_tokens: 400, response_format: { type: 'json_object' }, chat_template_kwargs: { enable_thinking: false } }),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}`);
  const text = (await res.json()).choices[0].message.content;
  return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
}
async function llmAvailable(quick) {
  if (!S.settings.freeTyping) return false;
  try { const r = await fetch(`${S.settings.llmEndpoint.replace(/\/$/, '')}/models`, { headers: S.settings.llmKey ? { Authorization: `Bearer ${S.settings.llmKey}` } : {}, signal: AbortSignal.timeout(quick ? 1200 : 2500) }); return r.ok; } catch { return false; }
}
// One click to start the local model: the amakawa:// link runs tools/llm/amakawa-llm.sh (installed by
// tools/llm/install-launcher.sh), which frees ComfyUI's VRAM if it's idle and starts llama-server with Orion on :8190.
function launchLocalLLM() {
  const a = document.createElement('a'); a.href = 'amakawa://llm-start'; a.style.display = 'none'; document.body.append(a); a.click(); a.remove();
}
// Before a free-typing moment: if the AI isn't up, offer to start it (desktop) or go scripted. Returns true if it's up.
async function ensureLLM() {
  if (!S.settings.freeTyping) return false;
  if (await llmAvailable()) return true;
  if (TOUCH) return false;
  for (;;) {
    ui.innerHTML = '';
    const wrap = h('div', 'choices2'), list = h('div', 'opts');
    wrap.append(h('div', 'prompt', 'This moment is free typing with the local AI, and it isn\'t running.'), list);
    ui.append(wrap);
    const opts = [{ v: 'start', label: 'Start it on this PC', en: 'Runs Orion with llama-server on port 8190. Loading takes about a minute.' }, { v: 'script', label: 'Use the scripted version', en: 'Pick from four replies instead.' }];
    const c = await pick(opts, o => { const b = h('button', 'opt act', `<span class="act-label">${o.label}</span><span class="says">${o.en}</span>`); list.append(b); return b; });
    if (c.v === 'script') return false;
    launchLocalLLM();
    ui.innerHTML = '';
    const box = h('div', 'subs'), n = h('div', 'narr', 'Starting the local AI…'), stop = h('button', 'choice', '<kbd>1</kbd><span class="en-only">Use the scripted version instead</span>');
    box.append(n, h('div', '', ''), stop); ui.append(box);
    let cancel = false; stop.onclick = e => { e.stopPropagation(); cancel = true; }; keyHandler = e => { if (e.key === '1') cancel = true; };
    const t0 = Date.now();
    while (!cancel && Date.now() - t0 < 150000) {
      if (await llmAvailable(true)) { keyHandler = null; return true; }
      n.textContent = `Starting the local AI… ${Math.round((Date.now() - t0) / 1000)} s`;
      await sleep(1500);
    }
    keyHandler = null;
    if (cancel) return false;
    ui.innerHTML = '';
    const w2 = h('div', 'choices2'), l2 = h('div', 'opts');
    w2.append(h('div', 'prompt', 'It didn\'t come up. If nothing happened after the click, run tools/llm/install-launcher.sh once (see tools/llm/README.md), or start tools/llm/amakawa-llm.sh by hand.'));
    ui.append(w2);
    w2.append(l2);
    const again = await pick([{ v: 1, l: 'Try again' }, { v: 0, l: 'Use the scripted version' }], o => { const b = h('button', 'opt act', `<span class="act-label">${o.l}</span>`); l2.append(b); return b; });
    if (!again.v) return false;
  }
}
function dayFacts() {
  const f = S.flags, facts = [];
  if (S.day === 1) {
    facts.push('today was his first day at Amakawa; he arrived by monorail and moved into the company dorm');
    facts.push('on the monorail he sat next to Rei Kuroda from Sales before he knew who she was; she recognised Emi\'s voice message and silenced a call from Emi');
    facts.push('his dorm room is Dorm A, room 203, on the second floor; its window faces a concrete wall about two metres away; his boxes are not unpacked');
    facts.push(f.casualGuard ? 'he was too casual with Ishibashi, the gate guard, who stopped him again on the way out' : 'the gate guard Ishibashi stopped him at the gate this morning');
    const count = f.copies100 ? 'a hundred sets (far too many; ninety are left over)' : f.copies20 ? 'twenty sets' : f.copies11 ? 'eleven sets' : 'ten sets, as asked';
    facts.push(`Emi asked him to make copies of her proposal on the old copier in the basement that everyone says is broken; he made ${count}${f.crooked ? ', and some pages were crooked' : ''}${f.fastBack ? ', and he was back surprisingly fast' : ''}`);
    facts.push(f.gotDocs ? 'Emi then sent him to Rei Kuroda in Sales for last year\'s numbers; somehow he came back with them before the meeting, which surprised everyone' : 'Emi then sent him to Rei Kuroda in Sales for last year\'s numbers; Rei told him to come back in the afternoon, so Emi\'s meeting had no numbers');
    facts.push(f.gotDocs ? 'Emi\'s 11:00 meeting went pretty well' : 'Emi\'s 11:00 meeting was a bit rough without the numbers');
    if (f.mioSaw) facts.push('Mio found him in the copy room with the copier running; she has not said anything to Emi');
    facts.push('Mio is the quiet gamer in the office; Emi finds Rei a little scary too');
  }
  return facts;
}
// Free typing with the local AI. `chat: true` shows it as phone chat (no sprite), for when the person isn't there.
async function freeTalk(t) {
  if (!(await ensureLLM())) return exec(t.fallback);
  const persona = t.persona || PERSONAS[t.with] || `${CAST[t.with]?.en}, a coworker.`;
  const sys = `You are ${persona} You are ${t.chat ? 'texting on the company chat app with' : 'talking with'} a foreign new hire at the company; he is a Japanese learner. `
    + 'Write ONLY casual Japanese at a beginner-friendly level: JLPT N5-N4 words, short sentences, one or two sentences per reply, at most 30 characters. Stay in character. Never use English in "ja". '
    + `The player's goal: ${t.goal} `
    + (t.checkFacts ? `What actually happened today: ${dayFacts().join('; ')}. React to what he says using these facts. If he claims something that did not happen, react to that in character. ` : '')
    + (t.guard ? `${t.guard} ` : '')
    + (t.target ? `Target grammar for the player: ${t.target.join(', ')}. ` : '')
    + 'In "ja", write every word that contains kanji as {kanji|kana reading}, for example {部屋|へや}や{今日|きょう}. '
    + 'Reply with strict JSON: {"ja": your line with that markup, "kana": the same line in kana only, "en": English translation, "correction": null or a short kind English note if the player\'s Japanese had a clear mistake, "used_target": true/false, "true_to_day": true/false/null}.';
  const msgs = [{ role: 'system', content: sys }];
  const c = CAST[t.with];
  for (let turn = 0; turn < t.turns; turn++) {
    ui.innerHTML = '';
    const wrap = h('div', 'talk');
    wrap.append(h('div', 'goal', `${t.goal} (${turn + 1}/${t.turns})`));
    wrap.append(h('div', 'who', `<span>あなた</span>${t.chat ? '　<span class="small-tag">chat</span>' : ''}`));
    const input = kanaInput('type in romaji… ↵'); wrap.append(input); ui.append(wrap);
    input.focus();
    const said = await new Promise(res => input.addEventListener('keydown', e => { if (e.key === 'Enter' && input.value.trim()) res(toKana(input.value.trim())); }));
    logLine('あなた', said, '', null);
    msgs.push({ role: 'user', content: said });
    ui.innerHTML = ''; ui.append(h('div', 'subs', `<div class="narr">${t.chat ? `${c.en}…` : '…'}</div>`));
    let reply;
    try { reply = await llm(msgs); } catch (e) { await narrate(`(The local AI didn't answer: ${e.message}. Using the script instead.)`); return exec(t.fallback); }
    msgs.push({ role: 'assistant', content: JSON.stringify(reply) });
    if (t.target) { S.grammar.total++; if (reply.used_target) S.grammar.right++; }
    S.rel[t.with] = (S.rel[t.with] || 0) + (reply.true_to_day === false ? 0 : 1);
    // Use the markup only if every kanji sits inside {…|…}; otherwise show the kana line.
    const ja = String(reply.ja || '');
    const marked = /\{[^}|]+\|[^}]+\}/.test(ja) && !hasKanji(ja.replace(/\{[^}]*\}/g, ''));
    const line = marked ? ja : String(reply.kana || ja);
    markSeen(line); logLine(c.en, line, reply.en || '', null);
    if (t.chat) sfx('bell', .3);
    const box = h('div', 'subs');
    box.append(h('div', 'who', `<span style="color:${c.color}">${c.en}</span>${t.chat ? '　<span class="small-tag">message</span>' : ''}`));
    box.append(h('div', 'line', renderJP(line)));
    const en = h('div', 'en', reply.en || ''); en.hidden = true; box.append(en);
    if (reply.correction) box.append(h('div', 'en note', `✎ ${reply.correction}`));
    const tools = h('div', 'tools'); box.append(tools, advanceMark());
    ui.innerHTML = ''; ui.append(box);
    englishButton(tools, [line], v => { en.hidden = !v; });
    await waitAdvance();
  }
  S.flags.llmTalked = true;
}

/* ---------------- summary & day flow ---------------- */
function startDay(d) {
  S.day = d; S.scene = DAYS[d]; S.task = ''; S.breath = breathMax(); S.noise = 0; S.casts = 0;
  S.time = { 1: 8 * 60 + 40, 2: 7 * 60 + 50, 3: 8 * 60, 4: 8 * 60, 5: 8 * 60 }[d] || 8 * 60;
  S.dayLog[d] = { rel: { ...S.rel }, suspicion: S.suspicion, grammar: { ...S.grammar } };
}
function noticed() {
  const n = Object.entries(S.sus || {}).filter(([, v]) => v > 0).map(([k, v]) => `${CAST[k]?.en || k} ${'●'.repeat(Math.min(v, 5))}`);
  return n.length ? n.join(' · ') : 'Nobody suspects a thing. Yet.';
}
async function summary() {
  music('night');
  const res = endOfDayWords();
  const start = S.dayLog[S.day] || { rel: {}, suspicion: 0, grammar: { right: 0, total: 0 } };
  const rels = Object.entries(S.rel).filter(([k]) => CAST[k]).map(([k, v]) => {
    const d = v - (start.rel[k] || 0);
    return `<div class="rel"><span>${CAST[k].en}</span><span class="hearts">${v > 0 ? '♥'.repeat(Math.min(v, 6)) : v < 0 ? '−' : '·'}${d ? ` <small>${d > 0 ? '+' : ''}${d}</small>` : ''}</span></div>`;
  }).join('');
  const g = { right: S.grammar.right - start.grammar.right, total: S.grammar.total - start.grammar.total };
  const counts = [0, 0, 0, 0]; Object.values(L.words).filter(w => w.seen).forEach(w => counts[w.stage]++);
  const last = S.day >= LAST_DAY;
  const list = ks => ks.map(k => `<span class="wd">${k}</span>`).join(' ');
  const ov = h('div', 'summary', `<div class="card"><h1><small>${digital(S.time)}</small>${renderJP(DAY_NTH[S.day] || '')}、おつかれさま。</h1>
    <div class="grid">
      <div><h2>WORDS</h2>
        <p>${Object.keys(today().seen).length} met today, ${res.looked.length} looked up.</p>
        <p>Reading aid reduced: ${res.moved.length ? list(res.moved) : '—'}</p>
        ${res.kread.length ? `<p>Kanji you now read without help: ${list(res.kread)}</p>` : ''}
        ${res.known.length ? `<p>Now known: ${list(res.known)}</p>` : ''}
        ${res.slipped.length ? `<p>Slipped back: ${list(res.slipped)}</p>` : ''}
        <p class="small">All words: new ${counts[0]} · learning ${counts[1]} · recalling ${counts[2]} · known ${counts[3]}</p>
        <h2 style="margin-top:1em">JAPANESE</h2><p>${g.total ? `${g.right} of ${g.total} answers and spells right` : '—'}</p></div>
      <div><h2>PEOPLE</h2>${rels || '<p>Nobody yet.</p>'}
        <h2 style="margin-top:1em">WHO NOTICED</h2><p>${noticed()}</p></div>
    </div>
    <p class="small saved">Saved. Next time you start, you continue from ${dayName(S.day + 1) || 'the start'}.</p>
    <button class="again">${last ? 'End of the first week · play again' : `${dayName(S.day + 1)}へ`}</button></div>`);
  ui.innerHTML = ''; ui.append(ov); sfx('win', .5);
  L.today = null;
  save();
  await new Promise(res => { ov.querySelector('.again').onclick = res; keyHandler = e => { if (e.key === 'Enter' || e.key === ' ') res(); }; });
  keyHandler = null;
  if (last) { const s = S.settings; S = freshState(); S.settings = s; save(); location.reload(); await new Promise(() => {}); }
  startDay(S.day + 1); save();
  return new Goto(DAYS[S.day]);
}

/* ---------------- test hooks ---------------- */
window.__amakawa = { renderJP, word, GLOSSARY, SCENES, L: () => L, S: () => S, support };

/* ---------------- title & main loop ---------------- */
const EDRDG = 'This game uses the JMdict and KANJIDIC2 dictionary files, the property of the Electronic Dictionary Research and Development Group, used in conformance with the Group\'s licence (<a href="https://www.edrdg.org/edrdg/licence.html" target="_blank" rel="noopener">edrdg.org/edrdg/licence.html</a>).';
async function title() {
  setBg('title'); drawHud();
  const saved = load(SAVE);
  ui.innerHTML = '';
  const t = h('div', 'summary title', `<div class="card" style="text-align:center"><h1 style="font-size:clamp(48px,9cqw,120px)"><small>AMAKAWA · THE FIRST WEEK</small>天川</h1>
    <p style="max-width:34em;margin:1em auto;color:#cfd3dc">Headphones on.</p>
    <p class="credit">${EDRDG}</p>
    <div class="choices" style="position:static;transform:none;margin:1.5em auto 0"></div></div>`);
  ui.append(t);
  const opts = [{ jp: 'はじめから', en: 'New game', v: 'new' }];
  if (saved?.scene) opts.unshift({ jp: 'つづきから', en: 'Continue', v: 'cont' });
  const wrap = t.querySelector('.choices');
  const c = await pick(opts, (o, i) => { const b = h('button', 'choice', `<kbd>${i + 1}</kbd>${o.jp}<span class="en">${o.en}</span>`); wrap.append(b); return b; });
  if (c.v === 'new') {
    const st = S.settings; S = freshState(); S.settings = st; startDay(1);
    // Reverse learning: natural text from the start; the old level-check bands no longer apply.
    if (profile().mode !== 'reverse') { L.profile = { mode: 'reverse', band: 3 }; for (const k of Object.values(L.kanji)) if (!k.rd) k.st = 2; }
    save();
  }
  return S.scene || DAYS[S.day];
}
(async () => {
  await loadLang();
  let scene = await title();
  drawHud();
  while (scene) {
    S.scene = scene; save();
    if (!SCENES[scene]) { await narrate(`(Missing scene: ${scene})`); break; }
    const r = await exec(SCENES[scene]);
    scene = r instanceof Goto ? r.scene : null;
  }
})();
