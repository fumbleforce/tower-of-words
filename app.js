'use strict';
/* Tower of Words: an offline Japanese RPG. All state lives in localStorage. */

const FLOORS = (window.FLOORS || []).slice().sort((a, b) => a.id - b.id);
const SAVE_KEY = 'tower.save.v1';
const HOUR = 3600e3, DAY = 24 * HOUR;
// Spaced-repetition intervals per stage. 20h instead of 1d so "tomorrow's commute" catches it.
const INTERVALS = [0, 20 * HOUR, 2 * DAY, 4 * DAY, 7 * DAY, 14 * DAY, 30 * DAY, 60 * DAY, 120 * DAY];
const KNOWN = 3;   // stage at which an item counts as "known" in stats
const MASTER = 6;

// Romaji for every basic kana, used for look-alike drills and distractors.
const KANA_RM = (() => {
  const h = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ';
  const r = 'a i u e o ka ki ku ke ko sa shi su se so ta chi tsu te to na ni nu ne no ha hi fu he ho ma mi mu me mo ya yu yo ra ri ru re ro wa wo n ga gi gu ge go za ji zu ze zo da ji zu de do ba bi bu be bo pa pi pu pe po'.split(' ');
  const m = {};
  [...h].forEach((c, i) => { m[c] = r[i]; m[String.fromCharCode(c.charCodeAt(0) + 0x60)] = r[i]; });
  return m;
})();

/* ---------------- content index ---------------- */
const ITEMS = {};        // id -> { id, type, floor, d }
const FLOOR_ITEMS = {};  // floor id -> ordered ids (learning order)
const FLOOR_BY_ID = {};

function buildIndex() {
  // Every kana taught anywhere, so look-alike groups can reference other floors.
  const taughtAll = new Set();
  for (const f of FLOORS) for (const k of f.kana || []) { taughtAll.add(k.k); if (k.r && !KANA_RM[k.k]) KANA_RM[k.k] = k.r; }
  for (const f of FLOORS) {
    FLOOR_BY_ID[f.id] = f;
    const order = [];
    const add = (type, d) => { ITEMS[d.id] = { id: d.id, type, floor: f.id, d }; return d.id; };
    (f.kana || []).forEach(k => order.push(add('kana', k)));
    // Look-alike characters not already taught become their own drill items.
    for (const group of f.confuse || []) for (const c of group) {
      if (!taughtAll.has(c) && KANA_RM[c]) { order.push(add('kana', { id: 'cf_' + c, k: c, r: KANA_RM[c], lookalike: true })); taughtAll.add(c); }
    }
    const v = (f.vocab || []).map(x => add('vocab', x));
    const k = (f.kanji || []).map(x => add('kanji', x));
    const g = (f.grammar || []).map(x => add('gram', x));
    let vi = 0, ki = 0, gi = 0;
    while (vi < v.length || ki < k.length || gi < g.length) {
      for (let i = 0; i < 6 && vi < v.length; i++) order.push(v[vi++]);
      if (gi < g.length) order.push(g[gi++]);
      for (let i = 0; i < 2 && ki < k.length; i++) order.push(k[ki++]);
    }
    FLOOR_ITEMS[f.id] = order;
  }
}

/* ---------------- state ---------------- */
function fresh() {
  return {
    v: 1, name: '', created: Date.now(), xp: 0, floor: 1, cleared: [], items: {}, log: [], listen: [], side: {},
    settings: { furi: true, audio: true, rate: 0.85, newPer: 7 },
    xpBy: {}, sync: { token: '', gist: '', at: 0 },
  };
}
let S = load();
// Each device only ever increments its own XP counter, so merging devices is a per-device max (no double counting).
const DEVICE = (() => { try { let d = localStorage.getItem('tower.device'); if (!d) { d = Math.random().toString(36).slice(2, 10); localStorage.setItem('tower.device', d); } return d; } catch (e) { return 'local'; } })();
if (!Object.keys(S.xpBy).length && S.xp) S.xpBy[DEVICE] = S.xp;
recomputeXp();
function recomputeXp() { S.xp = Object.values(S.xpBy).reduce((a, b) => a + b, 0); }
function addXp(n) { S.xpBy[DEVICE] = (S.xpBy[DEVICE] || 0) + n; recomputeXp(); }
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) { const s = JSON.parse(raw); return Object.assign(fresh(), s, { settings: Object.assign(fresh().settings, s.settings) }); }
  } catch (e) { /* fall through */ }
  return fresh();
}
function save() { S.mod = Date.now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { toast('Could not save progress!'); } }

/* ---------------- cross-device sync (private GitHub gist) ---------------- */
const GIST_FILE = 'tower-of-words-save.json';
function mergeState(a, b) {
  // a = local, b = remote. Result keeps local settings, sync config and device.
  const out = Object.assign({}, a);
  out.items = Object.assign({}, a.items);
  for (const [id, r] of Object.entries(b.items || {})) {
    const l = out.items[id];
    if (!l || (r.last || 0) > (l.last || 0) || ((r.last || 0) === (l.last || 0) && r.s > l.s)) out.items[id] = r;
  }
  out.xpBy = Object.assign({}, a.xpBy);
  for (const [d, x] of Object.entries(b.xpBy || {})) out.xpBy[d] = Math.max(out.xpBy[d] || 0, x);
  const seen = new Set(); out.log = [...(a.log || []), ...(b.log || [])].filter(l => { const k = l.t + l.kind; if (seen.has(k)) return false; seen.add(k); return true; }).sort((x, y) => x.t - y.t).slice(-500);
  out.cleared = [...new Set([...(a.cleared || []), ...(b.cleared || [])])].sort((x, y) => x - y);
  out.floor = Math.max(a.floor || 1, b.floor || 1);
  out.side = Object.assign({}, a.side);
  for (const [k, v] of Object.entries(b.side || {})) out.side[k] = Math.max(out.side[k] || 0, v || 0);
  out.listen = (a.listen || []).length >= (b.listen || []).length ? a.listen : b.listen;
  if (!out.name && b.name) out.name = b.name;
  out.onboarded = a.onboarded || b.onboarded;
  out.xp = Object.values(out.xpBy).reduce((x, y) => x + y, 0);
  return out;
}
async function gh(path, opts = {}) {
  const res = await fetch('https://api.github.com' + path, Object.assign({}, opts, {
    headers: { Authorization: 'Bearer ' + S.sync.token, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
  }));
  if (!res.ok) throw new Error('GitHub ' + res.status);
  return res.json();
}
let syncing = false;
async function sync(manual) {
  if (!S.sync.token || syncing || !navigator.onLine) { if (manual && !navigator.onLine) toast('Offline: will sync later.'); return; }
  syncing = true;
  try {
    if (!S.sync.gist) {
      const list = await gh('/gists?per_page=100');
      const found = list.find(g => g.files && g.files[GIST_FILE]);
      S.sync.gist = found ? found.id : '';
    }
    const strip = st => { const c = Object.assign({}, st); delete c.sync; delete c.settings; return c; };
    if (S.sync.gist) {
      const g = await gh('/gists/' + S.sync.gist);
      const f = g.files[GIST_FILE];
      const text = f.truncated ? await (await fetch(f.raw_url)).text() : f.content;
      const merged = mergeState(S, JSON.parse(text));
      merged.sync = S.sync; merged.settings = S.settings;
      S = merged;
      await gh('/gists/' + S.sync.gist, { method: 'PATCH', body: JSON.stringify({ files: { [GIST_FILE]: { content: JSON.stringify(strip(S)) } } }) });
    } else {
      const g = await gh('/gists', { method: 'POST', body: JSON.stringify({ description: 'Tower of Words save (auto-synced)', public: false, files: { [GIST_FILE]: { content: JSON.stringify(strip(S)) } } }) });
      S.sync.gist = g.id;
    }
    S.sync.at = Date.now(); S.sync.err = ''; save();
    if (manual) toast('Synced ✓');
    return true;
  } catch (e) {
    S.sync.err = e.message; save();
    if (manual) toast('Sync failed: ' + e.message);
  } finally { syncing = false; }
}

const st = id => S.items[id];
const stage = id => (S.items[id] ? S.items[id].s : -1);
const introduced = id => !!S.items[id];

function grade(id, ok) {
  const now = Date.now();
  const it = S.items[id] || (S.items[id] = { s: 0, due: 0, r: 0, w: 0 });
  it.last = now;
  if (ok) {
    it.r++;
    // Only advance when the item was actually due: cramming in one sitting doesn't count.
    if (now >= it.due) { it.s = Math.min(8, it.s + 1); it.due = now + INTERVALS[it.s] * (0.9 + Math.random() * 0.2); }
  } else {
    it.w++;
    it.s = it.s >= 3 ? it.s - 2 : Math.max(0, it.s - 1);
    it.due = now + (it.s <= 1 ? 0 : INTERVALS[it.s - 1]);
  }
}
function markKnown(id) { S.items[id] = { s: KNOWN, due: Date.now() + INTERVALS[KNOWN], r: 1, w: 0, last: Date.now(), skipped: true }; }
function introduce(id) { if (!S.items[id]) S.items[id] = { s: 0, due: 0, r: 0, w: 0, last: Date.now() }; }

function dueIds() {
  const now = Date.now();
  return Object.keys(S.items).filter(id => ITEMS[id] && S.items[id].due <= now)
    .sort((a, b) => S.items[a].s - S.items[b].s || S.items[a].due - S.items[b].due);
}
function newIds(n) {
  const out = [];
  for (let f = 1; f <= S.floor && out.length < n; f++) {
    for (const id of FLOOR_ITEMS[f] || []) { if (!introduced(id)) { out.push(id); if (out.length >= n) break; } }
  }
  return out;
}
function floorProgress(fid) {
  const ids = FLOOR_ITEMS[fid] || [];
  const intro = ids.filter(introduced).length;
  const recalled = ids.filter(id => stage(id) >= 1).length;
  const known = ids.filter(id => stage(id) >= KNOWN).length;
  return { total: ids.length, intro, recalled, known };
}
function bossReady(fid) {
  const p = floorProgress(fid);
  return p.total > 0 && p.intro === p.total && p.recalled / p.total >= 0.8;
}

/* ---------------- xp / level ---------------- */
const xpFor = L => 60 * L * (L - 1);
function level(xp = S.xp) { let L = 1; while (xp >= xpFor(L + 1)) L++; return L; }
const TITLES = ['Newcomer', 'Katakana Scout', 'Blade Novice', 'Verb Wielder', 'Adjective Knight', 'Te-form Duelist',
  'Street Speaker', 'Chain Linker', 'Clause Weaver', 'Veteran', 'Fate Breaker', 'Anime-tongue', 'Logout Survivor'];
const title = () => TITLES[Math.min(S.cleared.length, TITLES.length - 1)];

/* ---------------- audio ---------------- */
let jaVoice = null;
function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const vs = speechSynthesis.getVoices().filter(v => /^ja/i.test(v.lang));
  jaVoice = vs.find(v => /google|kyoko|otoya|haruka|nanami|o-ren/i.test(v.name)) || vs[0] || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function speak(text, force) {
  if ((!S.settings.audio && !force) || !('speechSynthesis' in window) || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/\s+/g, ''));
  u.lang = 'ja-JP'; u.rate = S.settings.rate; if (jaVoice) u.voice = jaVoice;
  speechSynthesis.speak(u);
}
// What to say aloud for each item: readings (kana) avoid wrong kanji readings.
function sayText(it) {
  const d = it.d;
  if (it.type === 'kana') return d.k;
  if (it.type === 'vocab') return d.kana || d.ja;
  if (it.type === 'kanji') { const ex = parseEx(d.ex); return ex ? ex.kana : d.c; }
  return '';
}

/* ---------------- helpers ---------------- */
const $ = s => document.querySelector(s);
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  return el;
}
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const hasKanji = s => /[一-龯]/.test(s || '');
const isKatakana = s => /^[゠-ヿー・]+$/.test(s || '');
function parseEx(ex) {
  const m = /^(.+?)\s*[(（]\s*([^)）]+)\s*[)）]\s*(.*)$/.exec(ex || '');
  return m ? { word: m[1].trim(), kana: m[2].trim(), en: m[3].trim() } : null;
}
let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}
function mount(...nodes) { const app = $('#app'); app.replaceChildren(...nodes); window.scrollTo(0, 0); }
function setNav(on) {
  const nav = $('#nav'); nav.hidden = !on;
  nav.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.go === currentTab));
}
let currentTab = 'home';
$('#nav').addEventListener('click', e => { const b = e.target.closest('button'); if (b) go(b.dataset.go); });
function go(tab) { currentTab = tab; ({ home: renderHome, codex: renderCodex, stats: renderStats, settings: renderSettings })[tab](); setNav(true); }

// Pool of other items of a type for distractors: same floor first, then neighbours.
function poolOf(type, fid, exclude) {
  const out = [];
  for (const f of [fid, fid - 1, fid + 1, fid - 2, fid - 3]) for (const id of FLOOR_ITEMS[f] || []) {
    if (ITEMS[id].type === type && id !== exclude) out.push(ITEMS[id]);
  }
  return out;
}
function distinct(correct, candidates, n = 3) {
  const seen = new Set([correct]); const out = [];
  for (const c of shuffle(candidates)) { if (c && !seen.has(c)) { seen.add(c); out.push(c); if (out.length >= n) break; } }
  return out;
}

/* ---------------- question generation ---------------- */
function modeFor(it) {
  const s = Math.max(0, stage(it.id));
  const audio = S.settings.audio && 'speechSynthesis' in window;
  switch (it.type) {
    case 'kana': return s < 2 ? 'kana_read' : pick(['kana_read', 'kana_rev']);
    case 'vocab': {
      const modes = s === 0 ? ['v_read'] : s === 1 ? ['v_read', 'v_rev'] : ['v_read', 'v_rev', 'v_rev'];
      if (audio && s >= 1) modes.push('v_listen', 'v_listen');
      if (isKatakana(it.d.ja) && it.d.rm && it.floor <= 3) modes.push('v_romaji');
      return pick(modes);
    }
    case 'kanji': return s < 2 || !parseEx(it.d.ex) ? 'k_mean' : pick(['k_mean', 'k_read']);
    case 'gram': return s < 1 ? 'g_mean' : pick(['g_build', 'g_build', 'g_mean']);
  }
}

function makeQ(id, mode) {
  const it = ITEMS[id]; const d = it.d; mode = mode || modeFor(it);
  const q = { id, mode, it };
  const ch = (correct, wrongs, fmt = x => ({ label: x })) => shuffle([{ ...fmt(correct), ok: true }, ...wrongs.map(w => ({ ...fmt(w), ok: false }))]);
  switch (mode) {
    case 'kana_read': {
      const group = (FLOOR_BY_ID[it.floor].confuse || []).find(g => g.includes(d.k)) || [];
      const conf = group.filter(c => c !== d.k).map(c => KANA_RM[c]);
      const rest = poolOf('kana', it.floor, id).map(x => x.d.r);
      const wr = distinct(d.r, conf, 3); wr.push(...distinct(d.r, rest.filter(r => !wr.includes(r)), 3 - wr.length));
      Object.assign(q, { kind: 'Read the kana', show: { huge: d.k }, say: d.k, choices: ch(d.r, wr) });
      break;
    }
    case 'kana_rev': {
      const group = (FLOOR_BY_ID[it.floor].confuse || []).find(g => g.includes(d.k)) || [];
      const wr = distinct(d.k, group, 3);
      wr.push(...distinct(d.k, poolOf('kana', it.floor, id).map(x => x.d.k).filter(k => !wr.includes(k)), 3 - wr.length));
      Object.assign(q, { kind: 'Find the kana', show: { big: d.r }, choices: ch(d.k, wr) });
      break;
    }
    case 'v_read': {
      const wr = distinct(d.en, poolOf('vocab', it.floor, id).map(x => x.d.en));
      Object.assign(q, { kind: 'What does it mean?', show: { big: d.ja, hint: hintFor(d) }, say: d.kana, choices: ch(d.en, wr) });
      break;
    }
    case 'v_rev': {
      const others = poolOf('vocab', it.floor, id);
      const wr = distinct(d.ja, others.map(x => x.d.ja));
      const kanaOf = Object.fromEntries(others.map(x => [x.d.ja, x.d.kana]));
      kanaOf[d.ja] = d.kana;
      Object.assign(q, {
        kind: 'Say it in Japanese', show: { en: d.en }, sayAfter: d.kana,
        choices: ch(d.ja, wr, x => ({ label: x, sub: S.settings.furi && hasKanji(x) ? kanaOf[x] : null })),
      });
      break;
    }
    case 'v_listen': {
      const wr = distinct(d.en, poolOf('vocab', it.floor, id).map(x => x.d.en));
      Object.assign(q, { kind: 'Listen', show: { listen: true }, say: d.kana, choices: ch(d.en, wr), reveal: `${d.ja} (${d.kana})`, listen: true });
      break;
    }
    case 'v_romaji': {
      const wr = distinct(d.rm, poolOf('vocab', it.floor, id).filter(x => x.d.rm).map(x => x.d.rm));
      Object.assign(q, { kind: 'How is it read?', show: { big: d.ja }, sayAfter: d.kana, choices: ch(d.rm, wr) });
      break;
    }
    case 'k_mean': {
      const wr = distinct(d.en, poolOf('kanji', it.floor, id).map(x => x.d.en));
      Object.assign(q, { kind: 'Kanji meaning', show: { huge: d.c }, choices: ch(d.en, wr), reveal: d.ex });
      break;
    }
    case 'k_read': {
      const ex = parseEx(d.ex);
      const wr = distinct(ex.kana, poolOf('kanji', it.floor, id).map(x => parseEx(x.d.ex)?.kana));
      Object.assign(q, { kind: 'Read the word', show: { big: ex.word }, sayAfter: ex.kana, choices: ch(ex.kana, wr), reveal: `${ex.word} = ${ex.en}` });
      break;
    }
    case 'g_mean': {
      const ex = pick(d.examples);
      const others = [];
      for (const f of [it.floor, it.floor - 1]) for (const g of (FLOOR_BY_ID[f]?.grammar || [])) for (const e of g.examples) if (e !== ex) others.push(e.en);
      Object.assign(q, { kind: d.title, show: { mid: ex.ja, hint: S.settings.furi ? ex.kana : null }, say: ex.kana, choices: ch(ex.en, distinct(ex.en, others)), reveal: d.pattern });
      break;
    }
    case 'g_build': {
      const ex = pick(d.examples);
      Object.assign(q, { kind: 'Build: ' + d.title, show: { en: ex.en }, build: ex, sayAfter: ex.kana });
      break;
    }
  }
  return q;
}
function hintFor(d) { return S.settings.furi && hasKanji(d.ja) ? d.kana : null; }

/* ---------------- battle engine ---------------- */
// queue: array of question objects (from makeQ, or custom {kind, show, choices, custom:true})
function runBattle({ title: btitle, enemy, queue, hearts = 5, onEnd, graded = true }) {
  const total = queue.length;
  let hp = hearts, done = 0, right = 0, wrong = 0, xp = 0, i = 0;
  const retried = new Set();
  const listenLog = [];
  const q0 = queue.slice();

  function frame(content) {
    const heartStr = h('div', { class: 'hearts' }, ...Array.from({ length: hearts }, (_, k) => h('span', { class: k < hp ? '' : 'lost' }, '♥')));
    return [
      h('div', { class: 'battle-top' },
        h('button', { class: 'btn ghost small', onclick: () => { if (confirm('Retreat? XP earned so far is kept.')) finish(true); } }, '✕'),
        h('div', { class: 'spacer' }, h('div', { class: 'small dim' }, btitle)),
        heartStr),
      h('div', { class: 'enemy' },
        h('div', { class: 'name jp' }, enemy),
        h('div', { class: 'bar red' }, h('i', { style: `width:${100 - (done / total) * 100}%` }))),
      content,
    ];
  }

  function next() {
    if (hp <= 0 || i >= q0.length) return finish(false);
    const q = q0[i++];
    q.build ? showBuild(q) : showChoice(q);
  }

  function header(q) {
    const s = q.show;
    const kids = [h('div', { class: 'kind' }, q.kind)];
    if (s.huge) kids.push(h('div', { class: 'huge' }, s.huge));
    if (s.big) kids.push(h('div', { class: 'big' }, s.big));
    if (s.mid) kids.push(h('div', { class: 'mid' }, s.mid));
    if (s.en) kids.push(h('div', { class: 'en' }, s.en));
    if (s.hint) kids.push(h('div', { class: 'hint' }, s.hint));
    if (s.text) kids.push(h('div', { class: 'story' }, s.text));
    if (s.listen) kids.push(h('button', { class: 'speak big', onclick: () => speak(q.say, true) }, '🔊'));
    else if (q.say) kids.push(h('div', {}, h('button', { class: 'speak', onclick: () => speak(q.say, true) }, '🔊')));
    return h('div', { class: 'panel qcard' }, ...kids);
  }

  function showChoice(q) {
    const card = header(q);
    const box = h('div', { class: 'choices' });
    const fb = h('div');
    q.choices.forEach(c => {
      const b = h('button', { class: 'choice jp', onclick: () => answer(c, b) }, c.label, c.sub ? h('small', {}, c.sub) : null);
      box.append(b);
    });
    function answer(c, b) {
      [...box.children].forEach(x => { x.disabled = true; });
      q.choices.forEach((cc, k) => { if (cc.ok) box.children[k].classList.add('ok'); });
      if (!c.ok) b.classList.add('bad');
      resolve(q, c.ok, fb, card);
    }
    mount(...frame(h('div', {}, card, box, fb)));
    if (q.say && (q.show.listen || q.mode === 'kana_read' || q.mode === 'v_read' || q.mode === 'g_mean')) setTimeout(() => speak(q.say), 150);
  }

  function showBuild(q) {
    const card = header(q);
    const ex = q.build;
    const tiles = shuffle(ex.chunks.map((t, k) => ({ t, k })));
    const placed = [];
    const slots = h('div', { class: 'slots' });
    const pool = h('div', { class: 'pool' });
    const fb = h('div');
    const checkBtn = h('button', { class: 'btn primary', style: 'margin-top:12px', disabled: true, onclick: check }, 'Cast ✦');
    function draw() {
      slots.replaceChildren(...placed.map((p, idx) => h('button', { class: 'tile', onclick: () => { placed.splice(idx, 1); draw(); } }, p.t)));
      pool.replaceChildren(...tiles.map(p => h('button', { class: 'tile' + (placed.includes(p) ? ' used' : ''), onclick: () => { if (!placed.includes(p)) { placed.push(p); draw(); } } }, p.t)));
      checkBtn.disabled = placed.length !== tiles.length;
    }
    function check() {
      const ok = placed.map(p => p.t).join('') === ex.ja;
      checkBtn.remove();
      [...slots.children, ...pool.children].forEach(x => { x.disabled = true; });
      resolve(q, ok, fb, card, ok ? null : [h('div', { class: 'jp' }, ex.ja), h('div', { class: 'small dim jp' }, ex.kana)]);
    }
    draw();
    mount(...frame(h('div', {}, card, slots, pool, checkBtn, fb)));
  }

  function resolve(q, ok, fb, card, extra) {
    if (ok) { right++; xp += 10; card.classList.add('hit'); } else { wrong++; hp--; card.classList.add('shake'); }
    if (graded && q.id) grade(q.id, ok);
    if (q.listen) listenLog.push(ok ? 1 : 0);
    if (!ok && q.id && !retried.has(q.id) && hp > 0) { retried.add(q.id); q0.push(makeQ(q.id)); }
    done = Math.min(total, done + (ok ? 1 : 0));
    const said = q.sayAfter || q.say;
    if (said) speak(said);
    const d = q.it?.d;
    const info = [];
    if (q.it?.type === 'vocab') info.push(h('div', { class: 'jp' }, `${d.ja}  ${d.ja !== d.kana ? '(' + d.kana + ')' : ''}  ${d.rm ? '· ' + d.rm : ''}`), h('div', {}, d.en), d.note ? h('div', { class: 'small dim' }, d.note) : null);
    else if (q.it?.type === 'kana') info.push(h('div', { class: 'jp' }, `${d.k} = ${d.r}`));
    else if (q.reveal) info.push(h('div', { class: 'jp' }, q.reveal));
    if (q.explain) info.push(h('div', { class: 'small' }, q.explain));
    if (extra) info.push(...extra);
    fb.replaceChildren(h('div', { class: 'feedback ' + (ok ? 'ok' : 'bad') },
      h('b', {}, ok ? pick(['Hit!', 'Critical!', 'Clean strike!', 'Nice!', '見事！']) : pick(['Ouch.', 'Missed.', 'Blocked!'])),
      ...info),
      h('button', { class: 'btn primary', style: 'margin-top:10px', onclick: next }, hp <= 0 ? 'Fall back…' : 'Continue ▸'));
    save();
    fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function finish(retreated) {
    S.listen.push(...listenLog); S.listen = S.listen.slice(-100);
    addXp(xp); save();
    onEnd({ right, wrong, xp, won: !retreated && hp > 0, retreated, total });
  }
  if (!q0.length) return onEnd({ right: 0, wrong: 0, xp: 0, won: true, total: 0, empty: true });
  next();
}

/* ---------------- learn cards ---------------- */
function learnCard(id) {
  const it = ITEMS[id], d = it.d;
  const kids = [];
  if (it.type === 'kana') {
    kids.push(h('div', { class: 'big' }, d.k), h('div', { class: 'reading' }, d.r));
    const group = (FLOOR_BY_ID[it.floor].confuse || []).find(g => g.includes(d.k));
    if (group) kids.push(h('div', { class: 'note jp' }, 'Don\'t confuse: ' + group.map(c => `${c} ${KANA_RM[c] || ''}`).join(' · ')));
    if (d.lookalike) kids.push(h('div', { class: 'note' }, 'Look-alike repair drill'));
  } else if (it.type === 'vocab') {
    kids.push(h('div', { class: 'big' }, d.ja));
    if (d.ja !== d.kana) kids.push(h('div', { class: 'reading' }, d.kana));
    kids.push(h('div', { class: 'small dim' }, d.rm || ''), h('div', { class: 'meaning' }, d.en));
    if (d.note) kids.push(h('div', { class: 'note' }, d.note));
  } else if (it.type === 'kanji') {
    kids.push(h('div', { class: 'big' }, d.c), h('div', { class: 'meaning' }, d.en),
      h('div', { class: 'reading' }, [d.on, d.kun].filter(Boolean).join(' · ')), h('div', { class: 'note jp' }, d.ex));
  } else if (it.type === 'gram') {
    kids.push(h('div', { class: 'mid jp', style: 'font-size:26px;font-weight:700' }, d.title),
      h('div', { class: 'chip cyan jp' }, d.pattern),
      h('p', { style: 'text-align:left' }, d.explain),
      ...d.examples.slice(0, 3).map(exampleEl));
  }
  return h('div', { class: 'panel qcard learn' }, h('div', { class: 'kind' }, 'New ' + ({ kana: 'kana', vocab: 'word', kanji: 'kanji', gram: 'skill' })[it.type]), ...kids,
    it.type !== 'gram' ? h('div', {}, h('button', { class: 'speak', onclick: () => speak(sayText(it), true) }, '🔊')) : null);
}
function exampleEl(e) {
  return h('div', { class: 'ex' },
    h('div', { class: 'row' }, h('div', { class: 'ja spacer' }, e.ja), h('button', { class: 'speak', onclick: () => speak(e.kana, true) }, '🔊')),
    h('div', { class: 'kana' }, e.kana), h('div', { class: 'en' }, e.en));
}

function runLearn(ids, onDone) {
  const learned = [];
  let i = 0;
  function show() {
    if (i >= ids.length) return onDone(learned);
    const id = ids[i];
    const it = ITEMS[id];
    mount(
      h('div', { class: 'battle-top' }, h('div', { class: 'spacer small dim' }, `Training · ${i + 1}/${ids.length}`)),
      learnCard(id),
      h('div', { class: 'stack', style: 'margin-top:12px' },
        h('button', { class: 'btn primary', onclick: () => { introduce(id); learned.push(id); i++; save(); show(); } }, 'Got it — add to my skills ▸'),
        h('button', { class: 'btn ghost', onclick: () => { markKnown(id); addXp(5); i++; save(); toast('Marked as known · +5 XP'); show(); } }, 'I already know this')),
    );
    if (it.type !== 'gram') setTimeout(() => speak(sayText(it)), 200);
  }
  show();
}

/* ---------------- sessions ---------------- */
function logSession(kind, res, t0) {
  S.log.push({ t: Date.now(), kind, xp: res.xp, right: res.right, total: res.right + res.wrong, ms: Date.now() - t0 });
  S.log = S.log.slice(-500); save();
  sync();
}
function weakest(fid, n, exclude = []) {
  return (FLOOR_ITEMS[fid] || []).filter(id => introduced(id) && !exclude.includes(id))
    .sort((a, b) => (stage(a) - stage(b)) || (st(a).last - st(b).last) || (Math.random() - .5)).slice(0, n);
}

function startQuest() {
  const t0 = Date.now(); const lv0 = level(); const tot = { right: 0, wrong: 0, xp: 0 };
  const acc = r => { tot.right += r.right; tot.wrong += r.wrong; tot.xp += r.xp; };
  const f = FLOOR_BY_ID[S.floor];
  // Battle 1: reviews
  const due = dueIds().slice(0, 10);
  const b1 = () => due.length
    ? interlude('Battle 1 · Ambush', `${due.length} monsters ambush you — things you're about to forget.`, () =>
      runBattle({ title: 'Ambush · reviews', enemy: 'Rust of Memory 記憶の錆', queue: shuffle(due).map(id => makeQ(id)), onEnd: r => { acc(r); b2(); } }))
    : b2();
  // Battle 2: new items
  const b2 = () => {
    const fresh = newIds(S.settings.newPer + (S.floor <= 2 ? 5 : 0));
    if (!fresh.length) return b3();
    interlude('Battle 2 · Training', `Your trainer shows you ${fresh.length} new techniques. Then you test them.`, () =>
      runLearn(fresh, learned => {
        if (!learned.length) return b3(learned);
        runBattle({ title: 'Training · new skills', enemy: 'Training Dummy 木人', queue: shuffle(learned).map(id => makeQ(id)), onEnd: r => { acc(r); b3(learned); } });
      }));
  };
  // Battle 3: mixed floor practice, weakest first, different modes
  const b3 = (learned = []) => {
    const ids = [...new Set([...shuffle(learned).slice(0, 4), ...weakest(S.floor, 8, learned)])].slice(0, 8);
    if (!ids.length) return end();
    const queue = ids.map(id => { const it = ITEMS[id]; const m = modeFor(it); return makeQ(id, m); });
    interlude('Battle 3 · Field', `A wild monster of ${f.name.replace(/^Floor \d+\s*[—-]\s*/, '')} blocks the path.`, () =>
      runBattle({ title: 'Field battle', enemy: pick(['Kobold 小鬼', 'Dire Wolf 狼', 'Sentinel Drone 警備ドローン', 'Rogue Knight 騎士', 'Stone Golem ゴーレム', 'Siege Automaton 機械兵']), queue, onEnd: r => { acc(r); end(); } }));
  };
  const end = () => {
    tot.xp += 30; addXp(30);
    logSession('quest', tot, t0);
    showResult('Quest complete', tot, lv0);
  };
  b1();
}

function startPatrol() {
  const t0 = Date.now(); const lv0 = level();
  let ids = dueIds().slice(0, 15);
  const light = ids.length < 8;
  if (ids.length < 8) ids = [...new Set([...ids, ...weakest(S.floor, 8 - ids.length, ids)])];
  const go2 = () => runBattle({
    title: 'Patrol', enemy: 'Night Patrol 夜警', queue: shuffle(ids).map(id => makeQ(id)), onEnd: r => {
      // If reviews were light, learn a handful of new things so home days also move you forward.
      const fresh = light ? newIds(3) : [];
      const end = (r2) => {
        const tot = { right: r.right + (r2?.right || 0), wrong: r.wrong + (r2?.wrong || 0), xp: r.xp + (r2?.xp || 0) + 15 };
        addXp(15); logSession('patrol', tot, t0); showResult('Patrol complete', tot, lv0);
      };
      if (!fresh.length) return end();
      interlude('Bonus · 3 new techniques', 'Quiet night. Time to learn a little more.', () => runLearn(fresh, learned => learned.length
        ? runBattle({ title: 'Bonus', enemy: 'Training Dummy 木人', queue: learned.map(id => makeQ(id)), onEnd: end })
        : end()));
    },
  });
  if (!ids.length) { toast('Nothing to patrol yet: start a Quest first.'); return; }
  go2();
}

function startBoss() {
  const f = FLOOR_BY_ID[S.floor]; const b = f.boss; const t0 = Date.now(); const lv0 = level();
  // Phase 1: dialogue
  const shown = [];
  const wrap = h('div');
  const nextBtn = h('button', { class: 'btn primary', style: 'margin-top:12px' }, 'Next ▸');
  let li = 0;
  function addLine() {
    const l = b.lines[li++];
    const en = h('div', { class: 'en hidden', onclick: () => en.classList.remove('hidden') }, l.en);
    const el = h('div', { class: 'line' },
      h('div', { class: 'row' }, h('div', { class: 'sp spacer' }, l.sp), h('button', { class: 'speak', onclick: () => speak(l.kana || l.ja, true) }, '🔊')),
      h('div', { class: 'ja' }, l.ja), S.settings.furi ? h('div', { class: 'kana' }, l.kana) : null, en);
    wrap.append(el); shown.push(el);
    speak(l.kana || l.ja);
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (li >= b.lines.length) { nextBtn.textContent = 'Fight! ⚔'; }
  }
  nextBtn.onclick = () => { if (li < b.lines.length) addLine(); else fight(); };
  mount(
    h('h3', {}, 'Floor boss'), h('h1', { class: 'jp' }, `${b.name} · ${b.jp}`),
    h('p', { class: 'dim' }, b.scene),
    h('p', { class: 'small dim' }, 'Read each line. Try to understand it before tapping to reveal the English: the boss will quiz you on it.'),
    wrap, nextBtn);
  setNav(false);
  addLine();

  function fight() {
    const qs = b.questions.map(qq => ({
      kind: 'Boss question', custom: true, show: { en: qq.q },
      choices: shuffle(qq.choices.map((c, k) => ({ label: c, ok: k === qq.a }))),
    }));
    const grams = shuffle(f.grammar || []).slice(0, 3).map(g => makeQ(g.id, 'g_build'));
    const vocab = shuffle((f.vocab || []).filter(v => introduced(v.id))).slice(0, 3).map(v => makeQ(v.id, S.settings.audio ? 'v_listen' : 'v_rev'));
    runBattle({
      title: 'Floor boss', enemy: `${b.name} ${b.jp}`, hearts: 5, queue: [...qs, ...shuffle([...grams, ...vocab])],
      onEnd: r => {
        logSession('boss', r, t0);
        if (r.won) {
          if (!S.cleared.includes(f.id)) { S.cleared.push(f.id); addXp(200); r.xp += 200; }
          if (FLOOR_BY_ID[f.id + 1]) S.floor = Math.max(S.floor, f.id + 1);
          save();
          mount(h('div', { class: 'stack' },
            h('h3', {}, 'Floor cleared'), h('div', { class: 'result-big jp' }, '撃破！'),
            h('h1', { class: 'center' }, `${b.name} defeated`),
            h('div', { class: 'panel story' }, f.outro),
            level() > lv0 ? h('div', { class: 'levelup' }, `LEVEL UP → ${level()}`) : null,
            h('div', { class: 'panel gold center' }, h('div', { class: 'small dim' }, 'New title'), h('b', {}, title())),
            FLOOR_BY_ID[f.id + 1] ? h('div', { class: 'panel' }, h('h3', {}, 'Next'), h('b', {}, FLOOR_BY_ID[f.id + 1].name), h('p', { class: 'story' }, FLOOR_BY_ID[f.id + 1].intro)) : finale(),
            h('p', { class: 'dim small center' }, 'The boss dialogue is now in your Codex under Story, if you want to reread it on the train.'),
            h('button', { class: 'btn primary', onclick: () => go('home') }, 'Return to the Tower')));
        } else {
          mount(h('div', { class: 'stack' },
            h('div', { class: 'result-big' }, r.retreated ? 'Retreated' : 'Defeated'),
            h('div', { class: 'panel' }, h('p', {}, `The ${b.name} was too strong this time. You keep the ${r.xp} XP.`),
              h('p', { class: 'dim' }, 'Do a Patrol or two and try again. You can retry any time, and nothing is lost.')),
            h('button', { class: 'btn primary', onclick: () => go('home') }, 'Return to the Tower')));
        }
      },
    });
  }
}
function finale() {
  return h('div', { class: 'panel glow' }, h('h2', {}, 'The Logout Gate is open.'),
    h('p', {}, 'The real final boss is outside the game: watch Sword Art Online, episode 1, with Japanese subtitles. Then come back and mark the side quest.'));
}

function interlude(head, text, cont) {
  setNav(false);
  mount(h('div', { class: 'stack', style: 'padding-top:14vh' },
    h('h3', { class: 'center' }, head), h('p', { class: 'center story' }, text),
    h('button', { class: 'btn primary', onclick: cont }, 'Engage ⚔')));
}

function showResult(head, tot, lv0) {
  const n = tot.right + tot.wrong;
  const L = level();
  mount(h('div', { class: 'stack' },
    h('h3', { class: 'center', style: 'margin-top:8vh' }, head),
    h('div', { class: 'result-big' }, `+${tot.xp} XP`),
    L > lv0 ? h('div', { class: 'levelup' }, `LEVEL UP → ${L}`) : null,
    h('div', { class: 'stats' },
      h('div', { class: 'stat' }, h('b', {}, n ? Math.round(100 * tot.right / n) + '%' : '—'), h('span', {}, 'accuracy')),
      h('div', { class: 'stat' }, h('b', {}, n), h('span', {}, 'answers'))),
    bossReady(S.floor) && !S.cleared.includes(S.floor) ? h('div', { class: 'panel gold' }, h('b', {}, '👑 The floor boss has noticed you.'), h('p', { class: 'dim small' }, 'You can challenge it from the Tower screen.')) : null,
    h('p', { class: 'center dim small' }, 'Done for today. Go read your book. 📖'),
    h('button', { class: 'btn primary', onclick: () => go('home') }, 'Return to the Tower')));
}

/* ---------------- screens ---------------- */
function hud() {
  const L = level(); const a = xpFor(L), b = xpFor(L + 1);
  return h('div', { class: 'hud' },
    h('div', { class: 'lv' }, h('div', {}, h('small', {}, 'LV'), L)),
    h('div', { class: 'spacer' },
      h('div', { class: 'row' }, h('b', {}, S.name || 'Hunter'), h('span', { class: 'chip gold' }, title())),
      h('div', { class: 'bar', style: 'margin-top:6px' }, h('i', { style: `width:${Math.round(100 * (S.xp - a) / (b - a))}%` })),
      h('div', { class: 'small dim' }, `${S.xp - a} / ${b - a} XP`)));
}

function renderHome() {
  const f = FLOOR_BY_ID[S.floor];
  if (!f) return mount(h('p', {}, 'No content loaded.'));
  const p = floorProgress(S.floor);
  const due = dueIds().length;
  const cleared = S.cleared.includes(f.id);
  const ready = bossReady(f.id);
  const allCleared = !FLOOR_BY_ID[S.floor + 1] && cleared;
  const lastDays = new Set(S.log.map(l => new Date(l.t).toDateString()));
  const trainedToday = lastDays.has(new Date().toDateString());

  mount(
    hud(),
    h('div', { class: 'panel glow stack' },
      h('div', { class: 'row' }, h('h3', { class: 'spacer' }, `Floor ${f.id} / ${FLOORS.length}`), h('span', { class: 'chip' }, f.weeks || '')),
      h('h1', {}, f.name.replace(/^Floor \d+\s*[—-]\s*/, ''), ' ', h('span', { class: 'jp dim', style: 'font-size:16px' }, f.jp)),
      h('p', { class: 'small dim' }, f.goal),
      h('div', {},
        h('div', { class: 'row small dim' }, h('span', { class: 'spacer' }, 'Learned'), h('span', {}, `${p.intro}/${p.total}`)),
        h('div', { class: 'bar' }, h('i', { style: `width:${p.total ? 100 * p.intro / p.total : 0}%` })),
        h('div', { class: 'row small dim', style: 'margin-top:6px' }, h('span', { class: 'spacer' }, 'Known (3+ recalls)'), h('span', {}, `${p.known}/${p.total}`)),
        h('div', { class: 'bar green' }, h('i', { style: `width:${p.total ? 100 * p.known / p.total : 0}%` })))),
    h('div', { class: 'stack', style: 'margin-top:12px' },
      trainedToday ? h('p', { class: 'center small', style: 'color:var(--green)' }, '✓ Trained today. Anything more is a bonus.') : null,
      h('button', { class: 'btn primary', onclick: startQuest },
        h('span', { class: 'ico' }, '⚔'), h('span', { class: 'txt' }, 'Quest', h('small', {}, `Train day · ~12 min · ${due ? due + ' reviews + ' : ''}new skills`))),
      h('button', { class: 'btn', onclick: startPatrol, disabled: !Object.keys(S.items).length },
        h('span', { class: 'ico' }, '🛡'), h('span', { class: 'txt' }, 'Patrol', h('small', {}, `Home day · ~5 min · ${due} due`))),
      !cleared ? h('button', { class: 'btn gold', disabled: !ready, onclick: startBoss },
        h('span', { class: 'ico' }, '👑'), h('span', { class: 'txt' }, `Floor boss: ${f.boss.name}`,
          h('small', {}, ready ? 'It\'s waiting for you.' : `Unlocks when all ${p.total} are learned and 80% recalled once (${p.recalled}/${p.total})`)))
        : allCleared ? finale() : null),
    h('div', { class: 'panel stack', style: 'margin-top:12px' },
      h('h3', {}, 'Side quest (real world)'),
      h('p', {}, f.side),
      h('label', { class: 'toggle' }, h('span', {}, S.side[f.id] ? 'Completed ✓' : 'Mark as done'),
        h('input', { type: 'checkbox', checked: !!S.side[f.id], onchange: e => { S.side[f.id] = e.target.checked ? Date.now() : 0; if (e.target.checked) { addXp(50); toast('+50 XP · side quest'); } save(); renderHome(); } }))),
    h('div', { class: 'panel stack', style: 'margin-top:12px' },
      h('h3', {}, 'Speaking practice (optional, weekly)'),
      h('p', { class: 'small dim' }, 'Paste this into Claude for a 10-minute conversation at your current level.'),
      h('button', { class: 'btn small', onclick: () => copy(f.talk) }, '📋 Copy conversation prompt')),
    h('h3', { style: 'margin-top:18px' }, 'The Tower'),
    floorMap(),
  );
}

function floorMap() {
  return h('div', { class: 'floors' }, ...FLOORS.slice().reverse().map(f => {
    const done = S.cleared.includes(f.id), cur = f.id === S.floor && !done, locked = f.id > S.floor;
    const p = floorProgress(f.id);
    return h('div', { class: `floor-row ${done ? 'done' : ''} ${cur ? 'cur' : ''} ${locked ? 'locked' : ''}` },
      h('div', { class: 'n' }, done ? '✓' : f.id),
      h('div', { class: 't' }, h('div', {}, f.name.replace(/^Floor \d+\s*[—-]\s*/, '')), h('div', { class: 'small dim' }, locked ? '🔒 ' + (f.weeks || '') : `${p.known}/${p.total} known`)));
  }));
}

function copy(text) {
  (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => toast('Copied. Paste it into Claude.'), () => {
    mount(h('h2', {}, 'Copy this'), h('textarea', { style: 'min-height:260px;font-size:14px' }, text), h('button', { class: 'btn', onclick: () => go('home') }, 'Back'));
  });
}

function totals() {
  const out = { kana: [0, 0], vocab: [0, 0], kanji: [0, 0], gram: [0, 0] };
  for (const it of Object.values(ITEMS)) { out[it.type][1]++; if (stage(it.id) >= KNOWN) out[it.type][0]++; }
  return out;
}

function renderStats() {
  const t = totals();
  const all = Object.keys(ITEMS).length;
  const known = Object.keys(ITEMS).filter(id => stage(id) >= KNOWN).length;
  const mastered = Object.keys(ITEMS).filter(id => stage(id) >= MASTER).length;
  const lis = S.listen.slice(-50);
  const lisAcc = lis.length ? Math.round(100 * lis.reduce((a, b) => a + b, 0) / lis.length) : null;
  const mins = Math.round(S.log.reduce((a, l) => a + (l.ms || 0), 0) / 60000);
  // Pace projection: items introduced per week over the last 3 weeks
  const intro = Object.values(S.items).map(x => x.last || 0);
  const since = Date.now() - 21 * DAY;
  const firstT = Math.min(...S.log.map(l => l.t), Date.now());
  const weeks = Math.max(1, (Date.now() - Math.max(since, firstT)) / (7 * DAY));
  const recentIntro = Object.values(S.items).filter(x => (x.first || x.last || 0) > since).length;
  const perWeek = recentIntro / weeks;
  const remaining = all - Object.keys(S.items).filter(id => ITEMS[id]).length;
  const eta = perWeek > 3 ? new Date(Date.now() + (remaining / perWeek) * 7 * DAY) : null;
  // 4-week activity grid
  const byDay = {};
  for (const l of S.log) { const k = new Date(l.t).toDateString(); byDay[k] = (byDay[k] || 0) + (l.ms || 0); }
  const grid = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(today); start.setDate(start.getDate() - 27 - ((start.getDay() + 6) % 7));
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const m = (byDay[d.toDateString()] || 0) / 60000;
    grid.push(h('i', { class: m <= 0 ? '' : m < 6 ? 'l1' : m < 12 ? 'l2' : 'l3', title: d.toDateString() }));
  }
  const thisWeek = S.log.filter(l => l.t > Date.now() - 7 * DAY);

  mount(
    hud(),
    h('h3', {}, 'Your Japanese'),
    h('div', { class: 'stats' },
      h('div', { class: 'stat' }, h('b', {}, `${t.vocab[0]}`), h('span', {}, `words known / ${t.vocab[1]}`)),
      h('div', { class: 'stat' }, h('b', {}, `${t.kanji[0]}`), h('span', {}, `kanji known / ${t.kanji[1]}`)),
      h('div', { class: 'stat' }, h('b', {}, `${t.gram[0]}`), h('span', {}, `grammar skills / ${t.gram[1]}`)),
      h('div', { class: 'stat' }, h('b', {}, `${t.kana[0]}`), h('span', {}, `kana solid / ${t.kana[1]}`)),
      h('div', { class: 'stat' }, h('b', {}, lisAcc == null ? '—' : lisAcc + '%'), h('span', {}, 'listening (last 50)')),
      h('div', { class: 'stat' }, h('b', {}, mastered), h('span', {}, 'mastered (30+ day)'))),
    h('div', { class: 'panel stack', style: 'margin-top:12px' },
      h('h3', {}, 'Road to the final boss'),
      h('p', { class: 'small' }, 'SAO episode 1 with Japanese subtitles'),
      h('div', { class: 'bar gold' }, h('i', { style: `width:${Math.round(100 * known / all)}%` })),
      h('div', { class: 'row small dim' }, h('span', { class: 'spacer' }, `${known}/${all} known · ${S.cleared.length}/${FLOORS.length} floors`), h('span', {}, `${Math.round(100 * known / all)}%`)),
      h('p', { class: 'small' }, eta ? `At your current pace (${Math.round(perWeek)} new items/week) you reach the Logout Gate around ${eta.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}.` : 'Play a few sessions to see your projected finish date.')),
    h('div', { class: 'panel stack', style: 'margin-top:12px' },
      h('div', { class: 'row' }, h('h3', { class: 'spacer' }, 'Last 4 weeks'), h('span', { class: 'small dim' }, `${thisWeek.length} sessions this week · ${mins} min total`)),
      h('div', { class: 'days' }, ...grid),
      h('p', { class: 'small dim' }, 'No streaks here. Skipped days cost nothing, and your reviews just wait for you.')),
    h('div', { class: 'panel stack', style: 'margin-top:12px' },
      h('h3', {}, 'Real-world milestones'),
      ...FLOORS.map(f => h('div', { class: 'row small' }, h('span', {}, S.side[f.id] ? '✅' : '⬜'), h('span', { class: 'spacer' }, `F${f.id}: ${f.side}`)))),
  );
}

let codexFloor = null, codexTab = 'vocab';
function renderCodex() {
  const avail = FLOORS.filter(f => f.id <= S.floor);
  if (codexFloor == null || codexFloor > S.floor) codexFloor = S.floor;
  const f = FLOOR_BY_ID[codexFloor];
  const tabBtn = (k, label) => h('button', { class: codexTab === k ? 'on' : '', onclick: () => { codexTab = k; renderCodex(); } }, label);
  const pips = id => h('div', { class: 'pips' }, ...Array.from({ length: 6 }, (_, k) => h('i', { class: stage(id) > k ? (stage(id) >= MASTER ? 'gold' : 'on') : '' })));
  let body;
  if (codexTab === 'vocab') {
    const list = [...(f.kana || []), ...(f.vocab || [])].map(d => ITEMS[d.id]);
    body = list.map(it => h('div', { class: 'item-row', onclick: () => speak(sayText(it), true) },
      h('div', { class: 'ja' }, it.d.ja || it.d.k),
      h('div', { class: 'meta' }, h('div', {}, it.d.en || it.d.r), h('div', { class: 'kana' }, it.type === 'vocab' ? `${it.d.kana} · ${it.d.rm || ''}` : '')),
      introduced(it.id) ? pips(it.id) : h('span', { class: 'chip' }, 'new')));
  } else if (codexTab === 'kanji') {
    body = (f.kanji || []).map(d => h('div', { class: 'item-row', onclick: () => speak(sayText(ITEMS[d.id]), true) },
      h('div', { class: 'ja', style: 'font-size:30px' }, d.c),
      h('div', { class: 'meta' }, h('div', {}, d.en), h('div', { class: 'kana' }, `${d.on || ''} · ${d.kun || ''} — ${d.ex}`)),
      introduced(d.id) ? pips(d.id) : h('span', { class: 'chip' }, 'new')));
    if (!body.length) body = [h('p', { class: 'dim' }, 'No kanji on this floor.')];
  } else if (codexTab === 'gram') {
    body = (f.grammar || []).map(g => h('div', { class: 'panel', style: 'margin-bottom:10px' },
      h('div', { class: 'row' }, h('h2', { class: 'jp spacer' }, g.title), introduced(g.id) ? pips(g.id) : h('span', { class: 'chip' }, 'new')),
      h('div', { class: 'chip cyan jp' }, g.pattern), h('p', {}, g.explain), ...g.examples.map(exampleEl)));
  } else {
    const cleared = S.cleared.includes(f.id);
    body = [h('div', { class: 'panel story' }, f.intro),
      cleared ? h('div', { class: 'panel', style: 'margin-top:10px' }, h('h3', {}, `${f.boss.name} · ${f.boss.jp}`), h('p', { class: 'dim small' }, f.boss.scene),
        ...f.boss.lines.map(l => h('div', { class: 'line' },
          h('div', { class: 'row' }, h('div', { class: 'sp spacer' }, l.sp), h('button', { class: 'speak', onclick: () => speak(l.kana || l.ja, true) }, '🔊')),
          h('div', { class: 'ja' }, l.ja), h('div', { class: 'kana' }, l.kana), h('div', { class: 'en' }, l.en))),
        h('div', { class: 'panel story', style: 'margin-top:10px' }, f.outro))
        : h('p', { class: 'dim', style: 'margin-top:10px' }, '🔒 The boss scene is added here after you defeat it.')];
  }
  mount(
    h('h1', {}, 'Codex'),
    h('p', { class: 'small dim' }, 'Everything you\'ve unlocked. Tap a row to hear it. Good for reading on the train.'),
    h('select', { onchange: e => { codexFloor = +e.target.value; renderCodex(); } },
      ...avail.map(x => h('option', { value: x.id, selected: x.id === codexFloor }, x.name))),
    h('div', { class: 'tabs' }, tabBtn('vocab', f.kana ? 'Kana & words' : 'Words'), tabBtn('kanji', 'Kanji'), tabBtn('gram', 'Grammar'), tabBtn('story', 'Story')),
    h('div', {}, ...body));
}

function renderSettings() {
  const set = (k, v) => { S.settings[k] = v; save(); };
  const voiceMsg = !('speechSynthesis' in window) ? 'Speech is not supported in this browser.'
    : jaVoice ? `Japanese voice: ${jaVoice.name}` : 'No Japanese voice found. Install one: on Android, Settings → Text-to-speech → install Japanese; on iPhone, Settings → Accessibility → Spoken Content → Voices → Japanese.';
  const ta = h('textarea', { placeholder: 'Paste a backup code here to restore…' });
  mount(
    h('h1', {}, 'Settings'),
    h('div', { class: 'panel' },
      h('label', { class: 'toggle' }, h('span', {}, 'Hunter name'), h('input', { type: 'text', value: S.name, style: 'max-width:180px', onchange: e => { S.name = e.target.value.trim(); save(); } })),
      h('label', { class: 'toggle' }, h('span', {}, 'Show kana readings (furigana hints)'), h('input', { type: 'checkbox', checked: S.settings.furi, onchange: e => set('furi', e.target.checked) })),
      h('label', { class: 'toggle' }, h('span', {}, 'Audio (Japanese voice)'), h('input', { type: 'checkbox', checked: S.settings.audio, onchange: e => set('audio', e.target.checked) })),
      h('label', { class: 'toggle' }, h('span', {}, 'Voice speed'),
        h('select', { style: 'max-width:140px', onchange: e => set('rate', +e.target.value) },
          ...[[0.7, 'Slow'], [0.85, 'Relaxed'], [1, 'Natural']].map(([v, l]) => h('option', { value: v, selected: S.settings.rate === v }, l)))),
      h('label', { class: 'toggle' }, h('span', {}, 'New items per Quest'),
        h('select', { style: 'max-width:140px', onchange: e => set('newPer', +e.target.value) },
          ...[4, 5, 7, 9, 12].map(v => h('option', { value: v, selected: S.settings.newPer === v }, v)))),
      h('p', { class: 'small dim' }, voiceMsg),
      h('button', { class: 'btn small', onclick: () => speak('こんにちは、ハンター。', true) }, '🔊 Test voice')),
    h('div', { class: 'panel stack', style: 'margin-top:12px' },
      h('h3', {}, 'Sync phone ↔ desktop'),
      h('p', { class: 'small dim' }, 'Progress syncs through a private GitHub gist when you have internet. Offline play is merged in later, so nothing is lost.'),
      h('p', { class: 'small dim' }, h('a', { href: 'https://github.com/settings/personal-access-tokens/new', target: '_blank', style: 'color:var(--cyan)' }, 'Create a fine-grained token'), ' with only Account permissions → Gists: Read and write. Paste the same token on each device.'),
      h('input', { type: 'text', placeholder: 'github_pat_…', value: S.sync.token, autocomplete: 'off', onchange: e => { S.sync.token = e.target.value.trim(); S.sync.gist = ''; save(); sync(true).then(() => renderSettings()); } }),
      h('div', { class: 'row' },
        h('span', { class: 'small dim spacer' }, !S.sync.token ? 'Not connected' : S.sync.err ? '⚠ ' + S.sync.err : S.sync.at ? 'Last sync ' + new Date(S.sync.at).toLocaleString() : 'Connecting…'),
        S.sync.token ? h('button', { class: 'btn small', onclick: () => sync(true).then(() => renderSettings()) }, '⟳ Sync now') : null)),
    h('div', { class: 'panel stack', style: 'margin-top:12px' },
      h('h3', {}, 'Backup'),
      h('p', { class: 'small dim' }, 'Progress is saved on this phone only. Copy a backup code now and then (e.g. into a note).'),
      h('button', { class: 'btn small', onclick: () => copy(btoa(unescape(encodeURIComponent(JSON.stringify(S))))) }, '📋 Copy backup code'),
      ta,
      h('button', { class: 'btn small', onclick: () => {
        try { const s = JSON.parse(decodeURIComponent(escape(atob(ta.value.trim())))); if (!s.items) throw 0; S = mergeState(Object.assign(fresh(), { sync: S.sync, settings: S.settings }), s); save(); toast('Restored!'); go('home'); } catch (e) { toast('That code didn\'t work.'); }
      } }, 'Restore from code')),
    h('div', { class: 'panel stack', style: 'margin-top:12px' },
      h('h3', {}, 'Danger zone'),
      h('button', { class: 'btn small', onclick: () => { if (confirm('Erase ALL progress? This cannot be undone.')) { S = fresh(); save(); onboard(); } } }, 'Reset everything')),
    h('p', { class: 'small dim center' }, `Tower of Words · ${FLOORS.length} floors · ${Object.keys(ITEMS).length} items`));
}

function onboard() {
  setNav(false);
  const name = h('input', { type: 'text', placeholder: 'Your name', value: S.name || '' });
  const steps = [
    () => [h('div', { class: 'result-big jp', style: 'margin-top:12vh' }, '塔'), h('h1', { class: 'center' }, 'Tower of Words'),
      h('p', { class: 'story center' }, 'You put on the headset. The world fades to white. A cold voice speaks: 「ようこそ、ハンター。」'),
      h('p', { class: 'story center' }, 'The <em>logout button</em> is gone. The only way out is up: twelve floors, each guarded by a boss that only understands Japanese.')],
    () => [h('h2', { style: 'margin-top:10vh' }, 'What should the Tower call you?'), name],
    () => [h('h2', { style: 'margin-top:8vh' }, 'How this works'),
      h('div', { class: 'panel stack' },
        h('p', {}, '⚔ <b>Quest</b> (~12 min): for train days. Reviews, new skills, a field battle.'),
        h('p', {}, '🛡 <b>Patrol</b> (~5 min): for home days. Only what you\'re about to forget, plus a few new things.'),
        h('p', {}, '👑 <b>Floor boss</b>: a dialogue scene. Beat it to climb.'),
        h('p', {}, '📴 Works offline. No streaks: skipped days cost nothing.'),
        h('p', { class: 'dim small' }, 'Tip: add this page to your home screen so it opens like an app and keeps your save safe.'))],
  ];
  let i = 0;
  function show() {
    const kids = steps[i]();
    kids.forEach(k => { if (k.tagName === 'P' && /<em>|<b>/.test(k.textContent)) k.innerHTML = k.textContent; });
    mount(h('div', { class: 'stack' }, ...kids, h('button', { class: 'btn primary', style: 'margin-top:20px', onclick: () => {
      if (i === 1) { S.name = name.value.trim() || 'Hunter'; }
      if (++i < steps.length) show(); else { S.onboarded = true; save(); go('home'); }
    } }, i < steps.length - 1 ? 'Continue ▸' : 'Enter Floor 1 ⚔')));
  }
  show();
}

/* ---------------- boot ---------------- */
buildIndex();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
if (!FLOORS.length) mount(h('p', {}, 'No floors loaded.'));
else if (!S.onboarded) onboard();
else go('home');
// Pull the other device's progress when opening; push when leaving.
if (S.sync.token) sync().then(ok => { if (ok && currentTab === 'home' && !$('#nav').hidden) renderHome(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') sync(); });
window.addEventListener('online', () => sync());
