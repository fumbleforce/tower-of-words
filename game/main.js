// Amakawa: a week at the company. A small script interpreter plus the game's systems:
// voiced lines, per-word reading stages and spaced "known" status, look-ups, pins, the elevator, menus and a wallet,
// spells built from verb forms, witnesses and breath, free talk with an LLM, rewards, and the company phone.
import { GLOSSARY, START_KNOWN } from './data/glossary.js';
import { CAST, FLOORS, SCENES as DAY1, SPELLS } from './data/script.js';
import { GLOSSARY_ADDITIONS } from '../content/glossary-additions.js';
import * as D2 from '../content/day2.js';
import * as D3 from '../content/day3.js';
import * as D4 from '../content/day4.js';
import * as D5 from '../content/day5.js';
import { VOICE } from './audio/voice/index.js';

for (const [k, v] of Object.entries(GLOSSARY_ADDITIONS)) if (!GLOSSARY[k]) GLOSSARY[k] = v;
const SCENES = { ...DAY1, ...D2.SCENES, ...D3.SCENES, ...D4.SCENES, ...D5.SCENES };
const DAYS = { 1: 'monorail', 2: 'day2_morning', 3: 'day3_morning', 4: 'day4_morning', 5: 'day5_morning' };
const DAY_NAMES = { 1: '{月曜日|げつようび}', 2: '{火曜日|かようび}', 3: '{水曜日|すいようび}', 4: '{木曜日|もくようび}', 5: '{金曜日|きんようび}' };
const DAY_NTH = { 1: '{一日目|いちにちめ}', 2: '{二日目|ふつかめ}', 3: '{三日目|みっかめ}', 4: '{四日目|よっかめ}', 5: '{五日目|いつかめ}' };
const dayName = d => (DAY_NAMES[d] ? renderJP(DAY_NAMES[d]) : '');
const LAST_DAY = 5;
const BREATH_PER_DAY = 3;

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
    day: 1, scene: null, time: 8 * 60 + 40, task: '', flags: {}, rel: {}, suspicion: 0, breath: BREATH_PER_DAY,
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
  return L.today;
}
function lookup(key) { const t = today(); t.looked[key] = 1; word(key).looked++; }
const MARK = /\{([^}|]+)(?:\|([^}|]*))?(?:\|([^}]*))?\}/g;
const KATA = /[ァ-ヺ][ァ-ヺー]+/g;
function keysOf(markup) {
  const keys = [];
  let last = 0;
  for (const m of markup.matchAll(MARK)) { for (const k of markup.slice(last, m.index).match(KATA) || []) keys.push(k); keys.push(m[3] || m[1]); last = m.index + m[0].length; }
  for (const k of markup.slice(last).match(KATA) || []) keys.push(k);
  return keys;
}
function markSeen(markup) { const t = today(); for (const k of keysOf(markup)) { t.seen[k] = (t.seen[k] || 0) + 1; word(k).seen++; } }
function lookupAll(markup) { for (const k of keysOf(markup)) lookup(k); }
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
  return { moved, slipped, known, looked: Object.keys(t.looked) };
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
const hasKanji = s => /[\u3400-\u9fff々〆]/.test(s);
function wordHTML(key, surface, reading, opts) {
  reading = reading || GLOSSARY[key]?.r || surface;
  const g = GLOSSARY[key] || { lv: 1 };
  const st = opts.forceKana ? Math.min(word(key).stage, 1) || 1 : word(key).stage;
  const attrs = `class="w${g.lv >= 3 ? ' adv' : ''}${st >= 3 ? ' known' : ''}" data-key="${key}" data-read="${reading}" data-surf="${surface}"`;
  // Never put a reading above text that is already kana.
  if (surface === reading || !hasKanji(surface)) return `<span ${attrs}>${surface}</span>`;
  if (g.lv >= 3 && st < 3) return `<span ${attrs}>${reading}</span>`;
  if (st >= 2) return `<span ${attrs}>${surface}</span>`;
  return `<span ${attrs}><ruby>${surface}<rt>${st === 0 ? romaji(reading) : reading}</rt></ruby></span>`;
}
function renderJP(markup, opts = {}) {
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

/* ---------------- look-ups ---------------- */
let glossEl = null;
function showGloss(el, key, surface, reading) {
  glossEl?.remove();
  const g = GLOSSARY[key] || {}, w = word(key);
  const stageTxt = ['new', 'learning', 'recalling', 'known'][w.stage];
  glossEl = h('div', 'gloss', `<b>${surface}</b><div class="r">${reading} · ${romaji(reading)}</div>${g.en || (isKata(key) ? 'loanword' : '')}<div class="r" style="margin-top:.3em">${stageTxt}</div>`);
  stage.append(glossEl);
  const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect();
  glossEl.style.left = Math.min(s.width - glossEl.offsetWidth - 8, Math.max(8, r.left - s.left)) + 'px';
  glossEl.style.top = Math.max(8, r.top - s.top - glossEl.offsetHeight - 10) + 'px';
  setTimeout(() => { glossEl?.remove(); glossEl = null; }, 3500);
}
stage.addEventListener('pointerdown', e => {
  const w = e.target.closest('.w');
  glossEl?.remove(); glossEl = null;
  if (!w) return;
  e.stopPropagation();
  lookup(w.dataset.key); save();
  showGloss(w, w.dataset.key, w.dataset.surf, w.dataset.read);
}, true);
stage.addEventListener('contextmenu', e => {
  const w = e.target.closest('.w'); if (!w) return;
  e.preventDefault(); lookup(w.dataset.key); save(); showGloss(w, w.dataset.key, w.dataset.surf, w.dataset.read);
});

/* ---------------- time ---------------- */
function jpTime(min) {
  const hh = Math.floor(min / 60) % 24, mm = min % 60, pm = hh >= 12, h12 = hh % 12 || 12;
  return `${pm ? '午後' : '午前'}${kanjiNum(h12)}時${mm ? kanjiNum(mm) + '分' : ''}`;
}
const digital = min => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const parseClock = t => { const [a, b] = t.split(':').map(Number); return a * 60 + b; };

/* ---------------- HUD & phone ---------------- */
const breathMarks = () => `${'◆'.repeat(Math.max(0, S.breath))}${'◇'.repeat(Math.max(0, BREATH_PER_DAY - S.breath))}`;
function drawHud(ping) {
  hud.innerHTML = '';
  if (S.task) hud.append(h('div', 'task', `<small>TASK</small>${renderJP(S.task)}`));
  const hasPhone = S.messages.length > 0, hasMagic = S.flags.knowsMagic || S.day > 1;
  const b = h('button', 'phone-btn' + (ping ? ' ping' : '') + (hasPhone ? '' : ' nophone'), `${hasPhone ? '<span class="dot"></span>' : ''}${digital(S.time)}${hasMagic ? `<span class="breath" title="kotodama left today">${breathMarks()}</span>` : ''}`);
  if (hasPhone) b.onclick = openPhone;
  hud.append(b);
}
let phoneTab = 'msg';
function openPhone() {
  sfx('tap', .3);
  const tabs = [['msg', 'メッセージ'], ['words', 'たんご'], ['set', 'せってい']];
  if (S.flags.knowsMagic || S.day > 1) tabs.splice(1, 0, ['book', 'ことだま']);
  if (S.rewards.length) tabs.splice(tabs.length - 1, 0, ['album', 'アルバム']);
  const body = h('div', 'ph-body');
  if (phoneTab === 'msg') {
    if (!S.messages.length) body.append(h('p', 'small', 'No messages yet.'));
    for (const m of [...S.messages].reverse()) body.append(h('div', 'msg', `<div class="from">${CAST[m.from]?.name || m.from} · ${dayName(m.day)}</div><div class="jp">${renderJP(m.jp)}</div>`));
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
      <button id="setRS" class="ph-close" style="background:#3a1a14">Restart the week (keeps your words)</button>`;
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
function setBg(name) {
  const a = $('#bg'), b = $('#bg2');
  const [front, back] = bgFlip ? [a, b] : [b, a];
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
function showChar(id, expr = 'neutral', at = 'center') {
  let el = onStage[id];
  if (!el) {
    el = h('div', `ch ${at} enter`); const img = h('img'); img.alt = CAST[id]?.en || id; el.append(img);
    chars.append(el); onStage[id] = el;
    loadSprite(img, id, expr, ok => { if (!ok) el.style.display = 'none'; requestAnimationFrame(() => el.classList.remove('enter')); });
  } else {
    if (at) el.className = `ch ${at}`;
    setExpr(id, expr);
  }
}
function setExpr(id, expr) { const el = onStage[id]; if (!el || !expr) return; loadSprite(el.querySelector('img'), id, expr, () => {}); }
function hideChar(id) { const el = onStage[id]; if (!el) return; el.classList.add('enter'); setTimeout(() => el.remove(), 350); delete onStage[id]; }
function focusSpeaker(id) { for (const [k, el] of Object.entries(onStage)) el.classList.toggle('dim', !!id && k !== id); }
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
  backlogEl.append(h('div', 'bl-head', 'Backlog · scroll down or Esc to return'), list);
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
    const click = e => { if (e.target.closest('.phone-btn, .w, #phone, .en-btn, .replay, button')) return; go(); };
    const cleanup = () => { stage.removeEventListener('click', click); keyHandler = null; englishHandler = null; };
    stage.addEventListener('click', click);
    keyHandler = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); go(); } };
  });
}
function pick(options, render) {
  return new Promise(res => {
    // Tapping a word inside an option only looks it up and arms the option; tapping the armed option (or its free area) picks it.
    const els = options.map((o, i) => { const el = render(o, i); el.addEventListener('click', e => {
      if (el.disabled) return;
      if (e.target.closest('.w') && !el.classList.contains('armed')) { els.forEach(x => x.classList.remove('armed')); el.classList.add('armed'); return; }
      sfx('tap', .35); keyHandler = null; englishHandler = null; res(o);
    }); return el; });
    keyHandler = e => { const n = +e.key; if (n >= 1 && n <= options.length && !els[n - 1].disabled) { e.preventDefault(); els[n - 1].click(); } };
  });
}
// English reveal: one control per screen; using it counts as looking up every word shown.
function englishButton(container, markups, reveal) {
  const b = h('button', 'en-btn', 'EN <kbd>T</kbd>');
  const doIt = () => { markups.forEach(lookupAll); save(); reveal(); b.remove(); englishHandler = null; };
  b.onclick = e => { e.stopPropagation(); doIt(); };
  englishHandler = doIt;
  container.append(b);
}

/* ---------------- lines ---------------- */
// Control hints show for the first few lines only.
function hint(text) { S.hints = (S.hints || 0) + 1; return S.hints <= 6 ? text : ''; }
// Karaoke: characters light up in proportion to the audio's progress. Punctuation counts as a short pause.
function karaoke(line, audio) {
  const spans = [];
  const walk = node => {
    for (const n of [...node.childNodes]) {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        for (const ch of n.textContent) { const sp = document.createElement('span'); sp.className = 'k'; sp.textContent = ch; frag.append(sp); spans.push(sp); }
        n.replaceWith(frag);
      } else if (n.nodeName !== 'RT') walk(n);
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
async function say(st) {
  const who = st.say, c = CAST[who] || { name: who, color: '#fff' };
  if (who !== 'announcer' && who !== 'player') { if (!onStage[who]) showChar(who, st.expr, defaultSpot()); else setExpr(who, st.expr); }
  focusSpeaker(who === 'announcer' || who === 'player' ? null : who);
  markSeen(st.jp);
  logLine(c.name, st.jp, st.en, [who, plain(st.jp)]);
  const box = h('div', 'subs');
  box.append(h('div', 'who', `<span style="color:${c.color}">${c.name}</span>`));
  const a = playVoice(who, plain(st.jp));
  const line = h('div', 'line', renderJP(st.jp));
  box.append(line);
  const en = h('div', 'en', st.en || ''); en.hidden = true; box.append(en);
  const tools = h('div', 'hint', hint('click / space: continue · R: replay · tap a word: meaning '));
  box.append(tools);
  ui.innerHTML = ''; ui.append(box);
  if (st.en) englishButton(tools, [st.jp], () => { en.hidden = false; });
  let finish = null;
  if (a && S.settings.karaoke !== false) finish = karaoke(line, a);
  if (st.auto) { if (a) await new Promise(r => { a.addEventListener('ended', r); setTimeout(r, 6000); }); else await sleep(900); return; }
  // First press while a line is still being spoken shows it all; the next press continues.
  await waitAdvance(() => { if (finish && !line.classList.contains('done') && a && !a.ended) { finish(); return false; } return true; });
  voiceEl?.pause();
}
async function narrate(text) {
  focusSpeaker(null); logLine('', '', text, null);
  const box = h('div', 'subs'); box.append(h('div', 'narr', text)); ui.innerHTML = ''; ui.append(box);
  await waitAdvance();
}
async function notify(m) {
  focusSpeaker(null); markSeen(m.jp); logLine(CAST[m.from]?.name || m.from, m.jp, m.en, null);
  const box = h('div', 'subs');
  box.append(h('div', 'who', `<span style="color:#ff9a8a">${CAST[m.from]?.name || m.from}</span>　<span class="small-tag">chat</span>`));
  box.append(h('div', 'line', renderJP(m.jp)));
  const en = h('div', 'en', m.en); en.hidden = true; box.append(en);
  const tools = h('div', 'hint', hint('saved in your phone (P) · ')); box.append(tools);
  ui.innerHTML = ''; ui.append(box);
  englishButton(tools, [m.jp], () => { en.hidden = false; });
  await waitAdvance();
}

/* ---------------- steps ---------------- */
class Goto { constructor(scene) { this.scene = scene; } }
async function exec(steps) {
  for (const st of steps || []) { const r = await step(st); if (r instanceof Goto) return r; }
}
const flagOk = f => (f.startsWith('!') ? !S.flags[f.slice(1)] : !!S.flags[f]);
async function step(st) {
  if (st.bg) setBg(st.bg);
  if ('music' in st) music(st.music);
  if (st.clock) { S.time = Math.max(S.time, parseClock(st.clock)); drawHud(); }
  if (st.time) { S.time += st.time; drawHud(); }
  if (st.narrate) await narrate(st.narrate);
  if (st.say) await say(st);
  if (st.show) showChar(st.show, st.expr, st.at);
  if (st.hide) hideChar(st.hide);
  if (st.hideAll) Object.keys(onStage).forEach(hideChar);
  if (st.msg) { S.messages.push({ ...st.msg, day: S.day }); sfx('bell', .35); drawHud(true); await notify(st.msg); }
  if (st.task) { S.task = st.task; drawHud(); }
  if (st.set) Object.assign(S.flags, st.set);
  if (st.fx) for (const [k, v] of Object.entries(st.fx)) S.rel[k] = (S.rel[k] || 0) + v;
  if (st.suspicion) S.suspicion += st.suspicion;
  let r;
  if (st.ifLate && S.time > parseClock(st.ifLate)) r = await exec(st.then);
  if (!r && st.ifTime) r = await exec(S.time > parseClock(st.ifTime.after) ? st.ifTime.then : st.ifTime.else);
  if (!r && st.if) r = await exec(flagOk(st.if) ? st.then : st.else);
  if (!r && st.ifRel) { const v = S.rel[st.ifRel.who] || 0; const ok = 'atLeast' in st.ifRel ? v >= st.ifRel.atLeast : v < st.ifRel.below; r = await exec(ok ? st.ifRel.then : st.ifRel.else); }
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
  if (st.summary) return summary();
  if (st.goto) return new Goto(st.goto);
  save();
}

async function choose(c) {
  let options = c.options.filter(o => !o.if || flagOk(o.if));
  for (;;) {
    ui.innerHTML = '';
    const wrap = h('div', `choices${c.kind === 'sign' ? ' signs' : ''}`);
    if (c.prompt) wrap.append(h('div', 'prompt', c.prompt));
    ui.append(wrap);
    const btns = [];
    const pending = pick(options, (o, i) => {
      const noBreath = o.magic && S.breath <= 0;
      const label = c.show === 'en' ? `<span class="en-only">${o.en}</span>` : `${renderJP(o.jp)}<span class="en" hidden>${o.en}</span>`;
      const b = h('button', `choice${o.magic ? ' magic' : ''}${c.kind === 'sign' ? ' sign' : ''}`, `<kbd>${i + 1}</kbd>${label}${noBreath ? '<span class="en">no kotodama left today</span>' : ''}`);
      if (noBreath) { b.disabled = true; b.classList.add('spent'); }
      wrap.append(b); btns.push(b); return b;
    });
    const tools = h('div', 'choice-tools'); wrap.append(tools);
    if (lastVoice) { const rp = h('button', 'replay', '♪ <kbd>R</kbd>'); rp.onclick = e => { e.stopPropagation(); replay(); }; tools.append(rp); }
    if (c.show !== 'en') englishButton(tools, options.map(o => o.jp), () => btns.forEach(b => { const e = b.querySelector('.en'); if (e) e.hidden = false; }));
    const chosen = await pending;
    if (c.show !== 'en' && !chosen.jp.startsWith('（')) await say({ say: 'player', jp: chosen.jp, en: chosen.en, auto: true });
    else if (c.show !== 'en') markSeen(chosen.jp);
    if (options.some(o => o.correct)) { S.grammar.total++; if (chosen.correct) S.grammar.right++; }
    if (chosen.fx) for (const [k, v] of Object.entries(chosen.fx)) S.rel[k] = (S.rel[k] || 0) + v;
    const r = await exec(chosen.then || []);
    if (r) return r;
    if (!chosen.retry) return;
    options = options.filter(o => o !== chosen);
  }
}

// Pin what you understood from a message or a spoken instruction. The task line is built from your pins.
async function pin(p) {
  ui.innerHTML = '';
  const wrap = h('div', 'pinbox');
  wrap.append(h('div', 'prompt', p.prompt));
  const fromMemory = p.fields.some(f => f.id.startsWith('e_'));
  if (!fromMemory) for (const m of S.messages.filter(m => m.day === S.day).slice(-2)) wrap.append(h('div', 'pin-msg', `<span class="from">${CAST[m.from]?.name || m.from}</span>${renderJP(m.jp)}`));
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
    const panel = h('div', 'panel', '<h3>AMAKAWA TOWER</h3>');
    ui.append(panel);
    const f = await pick(FLOORS, (fl, i) => { const b = h('button', 'floor', `<span class="btn"></span><span>${renderJP(fl.jp)}</span><kbd>${i + 1}</kbd>`); panel.append(b); return b; });
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
async function spell(sp) {
  if (S.breath <= 0) { await narrate('Nothing comes. You\'ve used all your kotodama for today.'); return; }
  sfx('open', .4);
  const witnesses = sp.witnesses === 'auto' ? 1 + (S.flags.aoiWithYou ? 1 : 0) : (sp.witnesses || 0);
  while (S.breath > 0) {
    ui.innerHTML = '';
    const ov = h('div', 'spell'); const ring = h('div', 'ring');
    S.flags.knowsMagic = true; drawHud();
    ring.append(h('div', 'goal', `${renderJP('{言霊|ことだま}')} · ${sp.goal}`),
      h('div', 'meta', `${renderJP('{見|み|見る}ている{人|ひと}')}：${witnesses ? renderJP(`{${kanjiNum(witnesses)}人|${['', 'ひとり', 'ふたり', 'さんにん'][witnesses] || ''}}`) : 'なし'}　·　${breathMarks()}`),
      h('div', 'hint', sp.hint));
    const row = h('div', 'row');
    ring.append(row); ov.append(ring); ui.append(ov);
    const verb = await pick(sp.verbs, (v, i) => { const b = h('button', 'rune', `${renderJP(`{${v.forms[0][0]}|${v.forms[0][1]}|${v.key}}`)}<small>${i + 1} · ${v.en}</small>`); row.append(b); return b; });
    const stem = commonPrefix(verb.forms.map(f => f[0]));
    const stemRead = commonPrefix(verb.forms.map(f => f[1]));
    const suffixes = [...new Set(verb.forms.map(f => f[0].slice(stem.length)))];
    const tiles = [...new Set([...suffixes, ...DISTRACT.filter(d => !suffixes.includes(d)).sort(() => Math.random() - .5).slice(0, Math.max(0, 5 - suffixes.length))])].sort(() => Math.random() - .5);
    row.innerHTML = '';
    ring.querySelector('.hint').textContent = 'Say it: pick the ending, or type the whole word in romaji and press Enter.';
    const built = h('div', 'built', (stem ? renderJP(`{${stem}|${stemRead}|${verb.key}}`) : '') + '<span class="blank">＿＿</span>');
    ring.insertBefore(built, row);
    const typed = h('input', 'spell-type'); typed.placeholder = romaji(verb.forms[0][1]) + ' → ?';
    ring.append(typed);
    if (!TOUCH) setTimeout(() => typed.focus(), 50);
    const form = await new Promise(res => {
      tiles.forEach((t, i) => { const b = h('button', 'rune small', `${t}<small>${i + 1}</small>`); b.onclick = () => res(stem + t); row.append(b); });
      keyHandler = e => { const n = +e.key; if (n >= 1 && n <= tiles.length) res(stem + tiles[n - 1]); };
      typed.addEventListener('keydown', e => {
        if (/^[1-9]$/.test(e.key) && !typed.value) { e.preventDefault(); keyHandler?.(e); return; }
        if (e.key !== 'Enter' || !typed.value.trim()) return;
        const k = hira(toKana(typed.value.trim())).replace(/[。？?]/g, '');
        const hit = verb.forms.find(f => hira(f[1]).replace(/[。？?]/g, '') === k);
        res(hit ? hit[0] : stem + '…');
      });
    });
    keyHandler = null;
    ui.innerHTML = '';
    S.breath--; drawHud();
    const glyph = h('div', 'cast-glyph', form); fx.append(glyph); setTimeout(() => glyph.remove(), 1500);
    S.grammar.total++;
    if (form === sp.answer) {
      S.grammar.right++;
      sfx('cast', .6); stage.classList.add('flash'); setTimeout(() => stage.classList.remove('flash'), 950); await sleep(900);
      return exec(sp.success);
    }
    sfx('fizzle', .5); await sleep(700);
    if (witnesses) S.suspicion += witnesses;
    const r = await exec(sp.outcomes?.[form] || sp.outcomes?.default || [{ narrate: 'Nothing happens.' }]);
    if (r) return r;
    if (S.breath <= 0) { await narrate('Your kotodama is spent for today.'); return; }
    let giveUp = false;
    await choose({ prompt: 'Try again?', kind: 'action', options: [
      { jp: 'もう{一度|いちど}', en: 'Try again (uses kotodama)', then: [] },
      { jp: 'やめる', en: 'Give up', then: [] },
    ].map((o, i) => ({ ...o, then: i ? [{ set: { __giveUp: true } }] : [] })) });
    giveUp = !!S.flags.__giveUp; delete S.flags.__giveUp;
    if (giveUp) return;
  }
}
async function learnSpell(ls) {
  if (!S.spells.some(s => s.form === ls.form)) S.spells.push({ ...ls, day: S.day });
  sfx('cast', .5);
  const ov = h('div', 'spell'); const ring = h('div', 'ring');
  const reading = (GLOSSARY[ls.key]?.r || '') + ls.form.slice(ls.key.length);
  ring.append(h('div', 'goal', renderJP('{新|あたら|新しい}しい{言霊|ことだま}')), h('div', 'cast-still', renderJP(`{${ls.form}|${reading || ls.form}|${ls.key}}`)), h('div', 'hint', ls.en), h('div', 'hint', 'click / space: continue'));
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
    box.append(h('div', 'who', `<span style="color:#ff9a8a">${CAST[m.from]?.name || m.from}</span>`), h('div', 'line', renderJP(m.jp, { forceKana: true })), h('div', 'hint', 'click / space: continue'));
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
  box.append(h('div', 'gloss-card', `<b>${key}</b><div class="r">${e.r || ''} · ${romaji(e.r || key)}</div>${e.en || ''}`), h('div', 'hint', 'click / space: continue'));
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
  emi: 'Emi, 32, the relaxed, sharp leader of Planning Office 7. Teasing, warm, casual Japanese.',
  rei: 'Rei, 26, the top salesperson. Cool, precise, a little predatory, curious about the player. Casual but sharp Japanese.',
  aoi: 'Aoi, 22, a chaotic, cheerful intern. Energetic, casual Japanese, uses あたし.',
  yuzuki: 'Yuzuki, 31, the company\'s PR spokeswoman and in-house reporter. Polished and friendly, secretly tired. Casual with the player.',
};
async function llm(messages) {
  const st = S.settings;
  const res = await fetch(`${st.llmEndpoint.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(st.llmKey ? { Authorization: `Bearer ${st.llmKey}` } : {}) },
    body: JSON.stringify({ model: st.llmModel || undefined, messages, temperature: 0.8, max_tokens: 400, response_format: { type: 'json_object' } }),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}`);
  const text = (await res.json()).choices[0].message.content;
  return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
}
async function llmAvailable() {
  if (!S.settings.freeTyping) return false;
  try { const r = await fetch(`${S.settings.llmEndpoint.replace(/\/$/, '')}/models`, { headers: S.settings.llmKey ? { Authorization: `Bearer ${S.settings.llmKey}` } : {}, signal: AbortSignal.timeout(2500) }); return r.ok; } catch { return false; }
}
function dayFacts() {
  const f = S.flags, facts = [];
  if (S.day === 1) {
    facts.push('first day at Amakawa; stopped at the security gate by the guard Ishibashi');
    if (f.wrongFloor) facts.push('got lost in the elevator and went to a wrong floor');
    facts.push(f.gotDocs ? 'got documents from Rei Kuroda in Sales, who is scary' : 'failed to get documents from Rei Kuroda in Sales');
    if (f.lateDocs) facts.push('arrived at Sales after the 11:00 deadline');
    facts.push(f.mioDate ? 'had lunch in the canteen with Mio, who invited him to play games' : 'had lunch');
    facts.push('did NOT use the copier today');
  }
  for (const [k, v] of Object.entries(f)) if (v === true && !k.startsWith('pin_')) facts.push(`flag: ${k}`);
  return facts;
}
async function freeTalk(t) {
  if (!(await llmAvailable())) return exec(t.fallback);
  const persona = t.persona || PERSONAS[t.with] || `${CAST[t.with]?.en}, a coworker.`;
  const sys = `You are ${persona} You are talking with a foreign new hire at the company; he is an early-intermediate Japanese learner. `
    + 'Speak ONLY casual Japanese at a beginner-friendly level (JLPT N5-N4 words, short sentences, 1-2 sentences per reply). Stay in character. Never use English in "ja". '
    + `The player's goal: ${t.goal} `
    + (t.checkFacts ? `What actually happened today: ${dayFacts().join('; ')}. If the player claims something that did not happen, react to that in character. ` : '')
    + (t.target ? `Target grammar for the player: ${t.target.join(', ')}. ` : '')
    + 'Reply with strict JSON: {"ja": your line, "kana": the same line in kana only, "en": English translation, "correction": null or a short kind English note if the player\'s Japanese had a clear mistake, "used_target": true/false, "true_to_day": true/false/null}.';
  const msgs = [{ role: 'system', content: sys }];
  for (let turn = 0; turn < t.turns; turn++) {
    ui.innerHTML = '';
    const wrap = h('div', 'talk');
    wrap.append(h('div', 'goal', `${t.goal} (${turn + 1}/${t.turns})`));
    wrap.append(h('div', 'who', '<span>あなた</span>'));
    const input = kanaInput('type in romaji… ↵'); wrap.append(input); ui.append(wrap);
    input.focus();
    const said = await new Promise(res => input.addEventListener('keydown', e => { if (e.key === 'Enter' && input.value.trim()) res(toKana(input.value.trim())); }));
    msgs.push({ role: 'user', content: said });
    ui.innerHTML = ''; ui.append(h('div', 'subs', '<div class="narr">…</div>'));
    let reply;
    try { reply = await llm(msgs); } catch (e) { await narrate(`(The conversation AI didn't answer: ${e.message}. Using the script instead.)`); return exec(t.fallback); }
    msgs.push({ role: 'assistant', content: JSON.stringify(reply) });
    if (t.target) { S.grammar.total++; if (reply.used_target) S.grammar.right++; }
    S.rel[t.with] = (S.rel[t.with] || 0) + (reply.true_to_day === false ? -1 : 1);
    const c = CAST[t.with];
    const box = h('div', 'subs');
    box.append(h('div', 'who', `<span style="color:${c.color}">${c.name}</span>`));
    box.append(h('div', 'line', reply.ja || ''));
    const en = h('div', 'en', `${reply.kana || ''}<br>${reply.en || ''}`); en.hidden = true; box.append(en);
    if (reply.correction) box.append(h('div', 'en note', `✎ ${reply.correction}`));
    const tools = h('div', 'hint', 'click / space: continue '); box.append(tools);
    ui.innerHTML = ''; ui.append(box);
    englishButton(tools, [], () => { en.hidden = false; });
    await waitAdvance();
  }
}

/* ---------------- summary & day flow ---------------- */
function startDay(d) {
  S.day = d; S.scene = DAYS[d]; S.task = ''; S.breath = BREATH_PER_DAY;
  S.time = { 1: 8 * 60 + 40, 2: 7 * 60 + 50, 3: 8 * 60, 4: 8 * 60, 5: 8 * 60 }[d] || 8 * 60;
  S.dayLog[d] = { rel: { ...S.rel }, suspicion: S.suspicion, grammar: { ...S.grammar } };
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
        ${res.known.length ? `<p>Now known: ${list(res.known)}</p>` : ''}
        ${res.slipped.length ? `<p>Slipped back: ${list(res.slipped)}</p>` : ''}
        <p class="small">All words: new ${counts[0]} · learning ${counts[1]} · recalling ${counts[2]} · known ${counts[3]}</p>
        <h2 style="margin-top:1em">JAPANESE</h2><p>${g.total ? `${g.right} of ${g.total} answers and spells right` : '—'}</p></div>
      <div><h2>PEOPLE</h2>${rels || '<p>Nobody yet.</p>'}
        <h2 style="margin-top:1em">SUSPICION</h2><p>${'●'.repeat(Math.min(S.suspicion, 10))}${'○'.repeat(Math.max(0, 5 - S.suspicion))} ${S.suspicion >= 4 ? 'People are talking about you.' : S.suspicion >= 2 ? 'Someone is starting to wonder about you.' : 'Nobody suspects a thing. Yet.'}</p></div>
    </div>
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
window.__amakawa = { renderJP, word, GLOSSARY, SCENES, L: () => L };

/* ---------------- title & main loop ---------------- */
async function title() {
  setBg('monorail'); drawHud();
  const saved = load(SAVE);
  ui.innerHTML = '';
  const t = h('div', 'summary title', `<div class="card" style="text-align:center"><h1 style="font-size:clamp(48px,9cqw,120px)"><small>AMAKAWA · THE FIRST WEEK</small>天川</h1>
    <p style="max-width:34em;margin:1em auto;color:#cfd3dc">Headphones on.</p>
    <div class="choices" style="position:static;transform:none;margin:1.5em auto 0"></div></div>`);
  ui.append(t);
  const opts = [{ jp: 'はじめから', en: 'New game', v: 'new' }];
  if (saved?.scene) opts.unshift({ jp: 'つづきから', en: 'Continue', v: 'cont' });
  const wrap = t.querySelector('.choices');
  const c = await pick(opts, (o, i) => { const b = h('button', 'choice', `<kbd>${i + 1}</kbd>${o.jp}<span class="en">${o.en}</span>`); wrap.append(b); return b; });
  if (c.v === 'new') { const st = S.settings; S = freshState(); S.settings = st; startDay(1); }
  return S.scene || DAYS[S.day];
}
(async () => {
  let scene = await title();
  drawHud();
  while (scene) {
    S.scene = scene; save();
    if (!SCENES[scene]) { await narrate(`(Missing scene: ${scene})`); break; }
    const r = await exec(SCENES[scene]);
    scene = r instanceof Goto ? r.scene : null;
  }
})();
