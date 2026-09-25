// Shared core for the mechanics prototypes: one progress store (localStorage), per-kanji word display,
// look-ups, audio and browser TTS, karaoke follow-along, a live level adapter, and the end-of-run stats screen.
import { LEX, KANJI_TIER } from './lexicon.js';
import { WORD_INFO, GRAMMAR, PRESETS as PROFILE_PRESETS } from './data.js';
export { GRAMMAR };

export const $ = (s, r = document) => r.querySelector(s);
export const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const pick = a => a[Math.floor(Math.random() * a.length)];
export const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------------- store ---------------- */
const KEY = 'amakawa.mechanics.v1';
const fresh = () => ({ v: 1, dayOffset: 0, prof: { level: null, lv: {}, reading: 'kana', kata: null, calibrated: false }, words: {}, kanji: {}, kana: {}, grammar: {}, sessions: [] });
function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 1) return { ...fresh(), ...s, prof: { ...fresh().prof, ...s.prof } }; } catch {} return fresh(); }
export let S = load();
export function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} }
export function resetAll() { S = fresh(); save(); }
const realDay = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / 864e5);
export const today = () => realDay() + (S.dayOffset || 0);
export const dayNo = () => (S.dayOffset || 0) + 1;

/* ---------------- levels ---------------- */
export const LEVELS = [
  { n: 0, name: 'Kana only', sub: 'every word in kana' },
  { n: 1, name: 'Starter', sub: 'first kanji with readings' },
  { n: 2, name: 'N5', sub: 'basic kanji plain, N5 with readings' },
  { n: 3, name: 'Early N4', sub: 'N5 kanji plain' },
  { n: 4, name: 'N4', sub: 'most everyday kanji plain' },
  { n: 5, name: 'N3', sub: 'nearly everything plain' },
];
// Presets are the reference players in data/lang/profiles.json.
export const PRESETS = PROFILE_PRESETS.map(p => ({ ...p, label: { beginner: 'New to Japanese', jorgen: 'Early intermediate', n3: 'Around N3' }[p.id] || p.label }));
export function applyPreset(p) {
  S.prof.reading = p.reading;
  for (const c of p.readable || '') S.kanji[c] = { ...(S.kanji[c] || { ok: [], miss: 0 }), st: 2 };
  for (const c of p.learning || '') S.kanji[c] = { ...(S.kanji[c] || { ok: [], miss: 0 }), st: 1 };
  save();
}
export function levelFor(proto) { const l = S.prof.lv[proto]; return l ?? S.prof.level; }
export function setLevel(proto, l, global = false) { S.prof.lv[proto] = l; if (global || S.prof.level == null) S.prof.level = l; save(); }

/* ---------------- words, kanji, grammar tracking ---------------- */
export const lex = k => LEX[k] || null;
function W(k) { return S.words[k] || (S.words[k] = { days: [], seen: 0, looks: 0, lookDays: [] }); }
export function wordSeen(keys) { for (const k of keys) W(k).seen++; save(); }
// A success counts once per (simulated) day, and only on a day the word was not looked up.
export function wordSuccess(keys) {
  const d = today();
  for (const k of new Set(keys)) { const w = W(k); if (!w.lookDays.includes(d) && !w.days.includes(d)) w.days.push(d); }
  save();
}
export function wordLookup(k) {
  const w = W(k), d = today(); w.looks++;
  if (!w.lookDays.includes(d)) w.lookDays.push(d);
  w.days = w.days.filter(x => x !== d); save();
}
export const USABLE_DAYS = 3;
export const wordDays = k => (S.words[k]?.days.length || 0);
export const isUsable = k => wordDays(k) >= USABLE_DAYS;

// Map the short notes in line markup to grammar ids from data/lang/grammar.json.
const NOTE_ID = [[/^te-form/, 'te-request'], [/^past/, 'past'], [/^volitional/, 'volitional'], [/^~ている|^~ていた/, 'te-iru'], [/^~ないで/, 'nai-de'], [/^~たら/, 'tara'],
  [/^~てもいい|^~ていい/, 'te-mo-ii'], [/^negative/, 'nai'], [/^polite past/, 'polite-past'], [/^polite volitional/, 'mashou'], [/^polite/, 'masu']];
export function noteGrammar(note) { for (const [re, id] of NOTE_ID) if (re.test(note)) return id; return null; }
export function grammarMark(id, ok, produced = false) {
  if (!id) return;
  const g = S.grammar[id] || (S.grammar[id] = { ok: 0, total: 0, produced: 0, days: [] });
  g.total++; if (ok) { g.ok++; if (produced) g.produced++; const d = today(); if (!g.days.includes(d)) g.days.push(d); }
  save();
}
export function kanaMark(ch, ok) { const k = S.kana[ch] || (S.kana[ch] = { ok: 0, miss: 0 }); ok ? k.ok++ : k.miss++; save(); }

const isKanji = c => /[㐀-鿿々〆]/.test(c);
export const hasKanji = s => /[㐀-鿿々〆]/.test(s);
export const isKata = s => /^[ァ-ヺー・]+$/.test(s);
// Kanji state for this player: 0 can't read (show kana), 1 learning (show with a reading), 2 known (plain).
export function kanjiState(ch, level) {
  const o = S.kanji[ch];
  if (o && o.st != null) return o.st;
  const t = KANJI_TIER[ch] ?? 5;
  if (level == null) level = 2;
  return t < level ? 2 : t === level ? 1 : 0;
}
// Called after a line was understood without looking anything up: kanji read with a reading move toward plain
// after unaided reads on two separate days.
export function kanjiReadOK(chars) {
  const d = today();
  for (const ch of new Set(chars)) {
    const k = S.kanji[ch] || (S.kanji[ch] = { ok: [], miss: 0 });
    if (!k.ok.includes(d)) k.ok.push(d);
    if (k.ok.length >= 2 && (k.st == null || k.st === 1)) k.st = 2;
  }
  save();
}
export function kanjiMiss(chars) {
  for (const ch of new Set(chars)) { const k = S.kanji[ch] || (S.kanji[ch] = { ok: [], miss: 0 }); k.miss++; if (k.st === 2) k.st = 1; }
  save();
}

/* ---------------- kana and romaji ---------------- */
const KANA_ROMA = (() => {
  const m = {}, rows = 'a i u e o ka ki ku ke ko sa shi su se so ta chi tsu te to na ni nu ne no ha hi fu he ho ma mi mu me mo ya . yu . yo ra ri ru re ro wa . . . wo ga gi gu ge go za ji zu ze zo da ji zu de do ba bi bu be bo pa pi pu pe po'.split(' ');
  const kana = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもや.ゆ.よらりるれろわ...をがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ';
  [...kana].forEach((k, i) => { if (k !== '.') m[k] = rows[i]; });
  Object.assign(m, { 'ん': 'n', 'ぁ': 'a', 'ぃ': 'i', 'ぅ': 'u', 'ぇ': 'e', 'ぉ': 'o', 'ゔ': 'vu' });
  return m;
})();
export const hira = s => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
export function romaji(kana) {
  const s = hira(kana); let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i], n = s[i + 1];
    if (c === 'っ') { const nx = KANA_ROMA[n] || ''; out += nx.startsWith('ch') ? 't' : (nx[0] || ''); continue; }
    if (n && 'ゃゅょ'.includes(n)) {
      const base = KANA_ROMA[c] || '', y = { 'ゃ': 'a', 'ゅ': 'u', 'ょ': 'o' }[n];
      out += /^(shi|chi|ji)$/.test(base) ? base.slice(0, -1) + y : base.slice(0, -1) + 'y' + y; i++; continue;
    }
    if (n && 'ぁぃぅぇぉ'.includes(n) && KANA_ROMA[c]) { out += (c === 'ふ' ? 'f' : c === 'う' ? 'w' : KANA_ROMA[c].slice(0, -1)) + KANA_ROMA[n]; i++; continue; }
    if (c === 'ー') { const v = out.match(/[aeiou]$/); out += v ? v[0] : ''; continue; }
    if (c === 'ん' && n && 'あいうえおやゆよ'.includes(n)) { out += "n'"; continue; }
    out += KANA_ROMA[c] ?? c;
  }
  return out;
}
// Morae, for timing karaoke and estimating speech length.
export const morae = s => [...hira(s)].filter(c => /[ぁ-んー]/.test(c) && !'ゃゅょぁぃぅぇぉ'.includes(c)).length;

/* ---------------- Japanese text rendering ----------------
   Markup: {surface|reading|dictionary key|note}. Reading defaults to the surface (kana words); key defaults to the surface.
   Bare katakana runs outside braces become tappable words too. */
const MARK = /\{([^}|]+)(?:\|([^}|]*))?(?:\|([^}|]*))?(?:\|([^}]*))?\}/g;
const KATA = /[ァ-ヺ][ァ-ヺー]*/g;
export function parse(markup) {
  const out = []; let last = 0;
  const plainPart = t => { let l = 0; for (const m of t.matchAll(KATA)) { if (m.index > l) out.push({ t: t.slice(l, m.index) }); out.push({ s: m[0], r: m[0], k: m[0] }); l = m.index + m[0].length; } if (l < t.length) out.push({ t: t.slice(l) }); };
  for (const m of markup.matchAll(MARK)) {
    plainPart(markup.slice(last, m.index));
    out.push({ s: m[1], r: m[2] || m[1], k: m[3] || m[1], n: m[4] || '' });
    last = m.index + m[0].length;
  }
  plainPart(markup.slice(last));
  return out;
}
export const keysOf = markup => parse(markup).filter(x => x.s).map(x => x.k);
export const labelJP = (markup, level) => renderJP(markup, { level, noRuby: true }).replace(/ class="w"/g, '');
export const plain = markup => parse(markup).map(x => x.t ?? x.s).join('');
export const kanaOf = markup => parse(markup).map(x => x.t ?? x.r).join('');
// Split a word into kana prefix, kanji core and kana suffix so the reading sits only over the kanji part.
function rubySplit(s, r) {
  let a = 0, b = 0;
  const hs = hira(s), hr = hira(r);
  while (a < s.length && !isKanji(s[a]) && hs[a] === hr[a]) a++;
  while (b < s.length - a && !isKanji(s[s.length - 1 - b]) && hs[s.length - 1 - b] === hr[hr.length - 1 - b]) b++;
  return [s.slice(0, a), s.slice(a, s.length - b), r.slice(a, r.length - b), s.slice(s.length - b)];
}
export function wordHTML(x, opts = {}) {
  const level = opts.level ?? 2;
  const attrs = st => `class="w" data-key="${x.k}" data-read="${x.r}" data-surf="${x.s}" data-note="${x.n || ''}" data-kst="${st}"`;
  if (!hasKanji(x.s)) return `<span ${attrs('')}>${x.s}</span>`;
  const st = Math.min(...[...x.s].filter(isKanji).map(c => kanjiState(c, level)));
  if (st === 0) return `<span ${attrs(0)}>${x.r}</span>`;
  if (st === 2 || opts.noRuby) return `<span ${attrs(st)}>${x.s}</span>`;
  const [pre, core, rr, post] = rubySplit(x.s, x.r);
  const rt = (opts.reading || S.prof.reading) === 'romaji' ? romaji(rr) : rr;
  return `<span ${attrs(1)}>${pre}<ruby>${core}<rt>${rt}</rt></ruby>${post}</span>`;
}
export function renderJP(markup, opts = {}) {
  return parse(markup).map(x => x.t != null ? x.t : wordHTML(x, opts)).join('');
}
// Which kanji the rendered line showed with a reading (1) or plain (2).
export function shownKanji(root, st) {
  const out = [];
  for (const w of root.querySelectorAll(`.w[data-kst="${st}"]`)) out.push(...[...w.dataset.surf].filter(isKanji));
  return out;
}

/* ---------------- look-ups (tap any word) ---------------- */
let glossEl = null;
export function closeGloss() { glossEl?.remove(); glossEl = null; }
export function showGloss(el) {
  closeGloss();
  const key = el.dataset.key, surf = el.dataset.surf, read = el.dataset.read, note = el.dataset.note;
  const L = LEX[key] || {}, I = WORD_INFO[key] || {};
  const kata = isKata(surf);
  // Show the word the way it was displayed: a word shown in kana keeps its kanji out of the gloss.
  const shownKana = el.dataset.kst === '0';
  const head = hasKanji(surf) && !shownKana ? `<b lang="ja">${surf}</b><span class="g-r" lang="ja">${read}</span>` : `<b lang="ja">${shownKana ? read : surf}</b>`;
  glossEl = h('div', 'gloss', `${head}<span class="g-ro">${romaji(read)}</span><span class="g-en">${L.en || I.g || (kata ? 'loanword' : '')}</span>${I.n ? `<span class="g-n">JLPT N${I.n}</span>` : ''}${note ? `<span class="g-note">${note}</span>` : ''}${key !== surf && !kata && !shownKana ? `<span class="g-note" lang="ja">${key}</span>` : ''}`);
  document.body.append(glossEl);
  const r = el.getBoundingClientRect();
  const gw = glossEl.offsetWidth, gh = glossEl.offsetHeight;
  glossEl.style.left = clamp(r.left + r.width / 2 - gw / 2, 8, innerWidth - gw - 8) + 'px';
  const above = r.top - gh - 10;
  glossEl.style.top = (above > 8 ? above : r.bottom + 10) + scrollY + 'px';
}
// Tapping a word shows its gloss and counts as a look-up. The tap never triggers the button it sits in.
export function enableLookups(root, onLookup) {
  root.addEventListener('click', e => {
    const w = e.target.closest('.w');
    if (!w || !root.contains(w) || root.classList.contains('no-lookup') || w.closest('.no-lookup')) return;
    e.preventDefault(); e.stopPropagation();
    showGloss(w); wordLookup(w.dataset.key);
    if (w.dataset.kst === '2') kanjiMiss([...w.dataset.surf].filter(isKanji));
    w.classList.add('looked');
    onLookup?.(w.dataset.key, w);
  }, true);
}
document.addEventListener('pointerdown', e => { if (!e.target.closest('.w') && !e.target.closest('.gloss')) closeGloss(); });

/* ---------------- audio ---------------- */
let cur = null;
export function stopAudio() { if (cur) { cur.pause?.(); cur = null; } try { speechSynthesis.cancel(); } catch {} }
export function playFile(url, rate = 1) {
  stopAudio();
  const a = new Audio(url); a.preservesPitch = true; a.playbackRate = rate; cur = a;
  const done = new Promise(res => { a.onended = res; a.onerror = res; });
  const started = a.play().then(() => true).catch(() => false);
  return { audio: a, done, started };
}
let jaVoiceP = null;
export function jaVoice() {
  if (jaVoiceP) return jaVoiceP;
  jaVoiceP = new Promise(res => {
    if (!('speechSynthesis' in window)) return res(null);
    const find = () => speechSynthesis.getVoices().filter(v => /^ja/i.test(v.lang));
    const choose = vs => vs.find(v => /google|kyoko|haruka|nanami|o-ren/i.test(v.name)) || vs[0] || null;
    if (find().length) return res(choose(find()));
    const t = setTimeout(() => res(choose(find())), 1500);
    speechSynthesis.addEventListener('voiceschanged', () => { if (find().length) { clearTimeout(t); res(choose(find())); } });
  });
  return jaVoiceP;
}
// Speak with the browser's Japanese voice. Resolves with a handle whose progress() gives 0..1 for karaoke.
export async function speak(text, rate = 1) {
  stopAudio();
  const v = await jaVoice();
  const est = morae(text) / (7.2 * rate) * 1000 + 300;
  if (!v) return null;
  const u = new SpeechSynthesisUtterance(text); u.voice = v; u.lang = v.lang; u.rate = rate;
  let t0 = null, endAt = null, boundary = null;
  const done = new Promise(res => { u.onend = () => { endAt = performance.now(); res(); }; u.onerror = () => { endAt = performance.now(); res(); }; setTimeout(res, est * 2 + 2000); });
  u.onstart = () => { t0 = performance.now(); };
  u.onboundary = e => { boundary = e.charIndex / text.length; };
  speechSynthesis.speak(u);
  return { done, progress: () => endAt ? 1 : t0 == null ? 0 : Math.max(boundary ?? 0, Math.min(.97, (performance.now() - t0) / est)) };
}

/* ---------------- karaoke ---------------- */
// Characters light up in step with playback. Each character inside a word carries its share of the word's morae;
// punctuation is a short pause.
export function karaoke(line, progress, onDone) {
  const units = [];
  const walk = (node, wordW) => {
    for (const n of [...node.childNodes]) {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        const chars = [...n.textContent];
        for (const ch of chars) {
          const sp = document.createElement('span'); sp.className = 'k'; sp.textContent = ch; frag.append(sp);
          const pause = '、。，．…？！?!　「」'.includes(ch);
          units.push({ sp, w: pause ? 1.6 : wordW ? wordW / wordW.chars : morae(ch) || 1 });
        }
        n.replaceWith(frag);
      } else if (n.nodeName !== 'RT') {
        let ww = wordW;
        if (n.classList?.contains('w')) { const txt = n.textContent.replace(n.querySelector('rt')?.textContent || '', ''); ww = new Number(Math.max(1, morae(n.dataset.read))); ww.chars = [...txt].length; }
        walk(n, ww);
      }
    }
  };
  walk(line, null);
  const cum = []; let tot = 0; for (const u of units) { tot += +u.w; cum.push(tot); }
  line.classList.add('karaoke');
  let raf, finished = false;
  const tick = () => {
    const p = progress();
    const at = p * tot;
    units.forEach((u, i) => u.sp.classList.toggle('on', cum[i] - u.w * .5 <= at));
    if (p >= 1) { finish(); return; }
    raf = requestAnimationFrame(tick);
  };
  const finish = () => { if (finished) return; finished = true; cancelAnimationFrame(raf); line.classList.add('done'); onDone?.(); };
  line.classList.remove('done');
  raf = requestAnimationFrame(tick);
  return { stop: finish };
}
// Plays a line: a voice file if there is one, otherwise the browser voice, otherwise a timed read-along.
// Returns { mode: 'voice'|'tts'|'text', done }.
export async function sayLine(el, { file, text, rate = 1, follow = true }) {
  if (file) {
    const p = playFile(file, rate);
    const ok = await Promise.race([p.started, sleep(1500).then(() => false)]);
    if (ok) {
      const a = p.audio;
      const prog = () => a.ended ? 1 : a.duration ? clamp((a.currentTime / a.duration - .04) / .9, 0, 1) : 0;
      if (follow) karaoke(el, prog);
      await p.done; el.classList.add('done');
      return { mode: 'voice' };
    }
  }
  const t = await speak(text, rate);
  if (t) { if (follow) karaoke(el, t.progress); await t.done; el.classList.add('done'); return { mode: 'tts' }; }
  // No audio available: a timed read-along at a natural pace.
  const dur = morae(text) / (6.5 * rate) * 1000 + 400, t0 = performance.now();
  if (follow) karaoke(el, () => Math.min(1, (performance.now() - t0) / dur));
  await sleep(dur); el.classList.add('done');
  return { mode: 'text' };
}

/* ---------------- level adapter ----------------
   Moves the level from how the last few items went: clean and quick runs go up, misses and heavy look-ups go down. */
export class Adapter {
  constructor(level, { min = 0, max = 5, win = 3, slowMs = 15000 } = {}) { Object.assign(this, { level, min, max, win, slowMs, hist: [] }); }
  push(r) {
    this.hist.push(r);
    const last = this.hist.slice(-this.win);
    if (last.length < this.win) return 0;
    const clean = last.every(x => x.ok && !x.lookups && x.ms < this.slowMs);
    const bad = last.filter(x => !x.ok).length >= 2 || last.reduce((a, x) => a + (x.lookups || 0), 0) >= 4;
    let d = 0;
    if (clean && this.level < this.max) d = 1; else if (bad && this.level > this.min) d = -1;
    if (d) { this.level += d; this.hist = []; }
    return d;
  }
}

/* ---------------- shell: header, level chip, side panel ---------------- */
export function shell({ proto, title, side = '' }) {
  document.body.insertAdjacentHTML('afterbegin', `
  <header class="top">
    <a class="back" href="../index.html" aria-label="All mechanics"><i class="ph ph-caret-left"></i><span>Mechanics</span></a>
    <h1>${title}</h1>
    <div class="top-r">
      <span class="day" title="Simulated day">Day ${dayNo()}</span>
      <button class="lvl" id="lvlBtn" title="Change level"><span class="lvl-n"></span><span class="lvl-name"></span></button>
    </div>
  </header>
  <main class="wrap">
    <section class="stage" id="stage"></section>
    <aside class="side" id="side">
      <div class="live">
        <div><span class="lab">Item</span><b id="stItem">0</b></div>
        <div><span class="lab">Right</span><b id="stOk">0</b></div>
        <div><span class="lab">Look-ups</span><b id="stLook">0</b></div>
        <div><span class="lab">Time</span><b id="stTime">0:00</b></div>
      </div>
      <div class="side-extra">${side}</div>
    </aside>
  </main>
  <footer class="attr">Word data from JMdict and KANJIDIC2, the property of the <a href="https://www.edrdg.org/edrdg/licence.html">Electronic Dictionary Research and Development Group</a>, used under the Group's licence.</footer>`);
  return { stage: $('#stage'), side: $('#side') };
}
export function showLevel(l) {
  const L = LEVELS[l] || LEVELS[2];
  $('.lvl-n').textContent = 'Lv ' + L.n; $('.lvl-name').textContent = L.name;
}
export function toast(msg, cls = '') {
  const t = h('div', 'toast ' + cls, msg); document.body.append(t);
  setTimeout(() => t.classList.add('out'), 1800); setTimeout(() => t.remove(), 2300);
}
// Level sheet: presets, a slider and (optionally) a link to the level check.
export function levelSheet(cur, onPick, { first = false } = {}) {
  const sheet = h('div', 'sheet-bg');
  sheet.innerHTML = `<div class="sheet" role="dialog" aria-label="Level">
    <h2>${first ? 'Where are you starting?' : 'Level'}</h2>
    <div class="presets">${PRESETS.map((p, i) => `<button class="preset" data-i="${i}"><b>${p.label}</b><span>Level ${p.level}: ${LEVELS[p.level].sub}.</span></button>`).join('')}</div>
    <label class="slide"><span>Or set it: <b id="slV"></b></span><input type="range" min="0" max="5" step="1" value="${cur ?? 2}" id="slR"></label>
    <div class="sheet-row"><a class="linkish" href="../reader/index.html#check">Take the 1-minute level check</a><button class="btn" id="slGo">Use this level</button></div>
  </div>`;
  document.body.append(sheet);
  const r = $('#slR', sheet), v = $('#slV', sheet);
  const upd = () => { const L = LEVELS[+r.value]; v.textContent = `${L.n} ${L.name} (${L.sub})`; };
  r.oninput = upd; upd();
  const close = l => { sheet.remove(); onPick(l); };
  sheet.querySelectorAll('.preset').forEach(b => b.onclick = () => { const p = PRESETS[+b.dataset.i]; applyPreset(p); close(p.level); });
  $('#slGo', sheet).onclick = () => close(+r.value);
  if (!first) sheet.addEventListener('pointerdown', e => { if (e.target === sheet) { sheet.remove(); } });
}
// Resolves the starting level: the stored one, or asks once.
export function startLevel(proto) {
  return new Promise(res => {
    const l = levelFor(proto);
    if (l != null) return res(l);
    levelSheet(2, lv => { setLevel(proto, lv, true); res(lv); }, { first: true });
  });
}

/* ---------------- session stats ---------------- */
export class Session {
  constructor(proto, level) {
    this.proto = proto; this.level0 = level; this.level = level; this.t0 = performance.now(); this.items = []; this.cur = null;
    this.timer = setInterval(() => this.paint(), 500);
  }
  begin(label) { this.cur = { label, t: performance.now(), lookups: 0, replays: 0, taps: 0 }; this.paint(); }
  lookup() { if (this.cur) this.cur.lookups++; this.paint(); }
  replay() { if (this.cur) this.cur.replays++; }
  tap() { if (this.cur) this.cur.taps++; }
  end(ok, extra = {}) {
    if (!this.cur) return null;
    const it = { ...this.cur, ...extra, ok: !!ok, ms: Math.round(performance.now() - this.cur.t), level: this.level };
    delete it.t; this.items.push(it); this.cur = null; this.paint(); return it;
  }
  paint() {
    const n = this.items.length, ok = this.items.filter(x => x.ok).length;
    const look = this.items.reduce((a, x) => a + x.lookups, 0) + (this.cur?.lookups || 0);
    const s = Math.floor((performance.now() - this.t0) / 1000);
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    set('stItem', n + (this.cur ? 1 : 0)); set('stOk', `${ok}/${n}`); set('stLook', look); set('stTime', `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
  }
  summary() {
    const it = this.items, n = it.length || 1;
    const times = it.map(x => x.ms).sort((a, b) => a - b);
    return {
      proto: this.proto, at: Date.now(), day: today(), items: it.length,
      accuracy: it.filter(x => x.ok).length / n, medianMs: times[Math.floor(times.length / 2)] || 0,
      meanMs: Math.round(it.reduce((a, x) => a + x.ms, 0) / n), totalMs: Math.round(performance.now() - this.t0),
      lookups: it.reduce((a, x) => a + x.lookups, 0), replays: it.reduce((a, x) => a + x.replays, 0),
      taps: it.reduce((a, x) => a + x.taps, 0),
      level0: this.level0, level1: this.level, rating: [], detail: it,
    };
  }
  // End screen: stats, per-item times, and a one-tap verdict saved with the run.
  finish(stage, { extraRows = [], again } = {}) {
    clearInterval(this.timer); stopAudio(); closeGloss();
    const s = this.summary();
    S.sessions.push(s); if (S.sessions.length > 200) S.sessions.shift(); save();
    const idx = S.sessions.length - 1;
    const sec = ms => (ms / 1000).toFixed(1) + ' s';
    const max = Math.max(...s.detail.map(x => x.ms), 1);
    stage.innerHTML = `<div class="end">
      <h2>Run finished</h2>
      <div class="stats">
        <div><span class="lab">Accuracy</span><b>${Math.round(s.accuracy * 100)}%</b><small>${s.detail.filter(x => x.ok).length} of ${s.items}</small></div>
        <div><span class="lab">Median per item</span><b>${sec(s.medianMs)}</b><small>mean ${sec(s.meanMs)}</small></div>
        <div><span class="lab">Look-ups</span><b>${s.lookups}</b><small>${(s.lookups / Math.max(1, s.items)).toFixed(1)} per item</small></div>
        <div><span class="lab">Total time</span><b>${Math.floor(Math.round(s.totalMs / 1000) / 60)}:${String(Math.round(s.totalMs / 1000) % 60).padStart(2, '0')}</b><small>level ${s.level0} to ${s.level1}</small></div>
        ${extraRows.map(([l, v, sm]) => `<div><span class="lab">${l}</span><b>${v}</b><small>${sm || ''}</small></div>`).join('')}
      </div>
      <div class="rate"><span>How was that?</span>
        ${[['fun', 'Fun'], ['easy', 'Too easy'], ['hard', 'Too hard'], ['confusing', 'Confusing'], ['slow', 'Too slow']].map(([k, l]) => `<button class="chip" data-r="${k}">${l}</button>`).join('')}
      </div>
      <details class="items" open><summary>Per item</summary>
        <ol>${s.detail.map(x => `<li class="${x.ok ? 'ok' : 'miss'}"><span class="il" lang="ja">${x.label}</span><span class="bar" style="--w:${(x.ms / max * 100).toFixed(1)}%"></span><span class="it">${sec(x.ms)}</span><span class="ix">${x.lookups ? x.lookups + ' look' : ''}${x.replays ? ' ' + x.replays + ' replay' : ''}</span></li>`).join('')}</ol>
      </details>
      <div class="end-row"><button class="btn" id="again">Play again</button><a class="btn ghost" href="../index.html">All mechanics</a></div>
    </div>`;
    stage.querySelectorAll('.chip').forEach(b => b.onclick = () => {
      b.classList.toggle('on');
      S.sessions[idx].rating = [...stage.querySelectorAll('.chip.on')].map(x => x.dataset.r); save();
    });
    $('#again', stage).onclick = () => again ? again() : location.reload();
    return s;
  }
}
