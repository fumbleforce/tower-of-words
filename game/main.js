// Amakawa, day-1 slice. A small script interpreter plus the game's systems: voiced lines, the word display rule,
// look-ups, choices, the elevator, the canteen, spells, free talk with an LLM, and the company phone.
import { GLOSSARY, START_KNOWN } from './data/glossary.js';
import { CAST, FLOORS, SCENES } from './data/script.js';
import { VOICE } from './audio/voice/index.js';

const $ = s => document.querySelector(s);
const stage = $('#stage'), ui = $('#ui'), hud = $('#hud'), chars = $('#chars'), fx = $('#fx'), phone = $('#phone');
const SAVE = 'amakawa.save.v1';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

/* ---------------- state ---------------- */
function freshState() {
  return {
    scene: null, time: 8 * 60 + 40, task: '', flags: {}, rel: {}, suspicion: 0,
    words: {}, known: [...START_KNOWN], messages: [], order: null, day: 1,
    settings: { listenFirst: true, showEn: false, llmEndpoint: 'http://127.0.0.1:8190/v1', llmKey: '', llmModel: '' },
  };
}
let S = load() || freshState();
function load() { try { return JSON.parse(localStorage.getItem(SAVE)); } catch { return null; } }
function save() { try { localStorage.setItem(SAVE, JSON.stringify(S)); } catch {} }

/* ---------------- audio ---------------- */
const fnv = s => { let x = 0x811c9dc5; for (const c of s) { x ^= c.codePointAt(0); x = Math.imul(x, 0x01000193) >>> 0; } return x.toString(16).padStart(8, '0'); };
let voiceEl = null, musicEl = null, musicName = null;
function playVoice(who, text) {
  const key = fnv(`${who}|${text}`);
  if (voiceEl) voiceEl.pause();
  if (!VOICE[key]) return null;
  voiceEl = new Audio(`audio/voice/${key}.mp3`);
  voiceEl.play().catch(() => {});
  return voiceEl;
}
function sfx(name, vol = .5) { const a = new Audio(`audio/sfx/${name}.mp3`); a.volume = vol; a.play().catch(() => {}); }
function music(name) {
  if (name === musicName) return;
  const old = musicEl; musicName = name;
  if (old) { let v = old.volume; const id = setInterval(() => { v -= .03; old.volume = Math.max(0, v); if (v <= 0) { clearInterval(id); old.pause(); } }, 50); }
  if (!name) { musicEl = null; return; }
  musicEl = new Audio(`audio/music/${name}.mp3`); musicEl.loop = true; musicEl.volume = 0;
  musicEl.play().then(() => { const id = setInterval(() => { musicEl.volume = Math.min(.22, musicEl.volume + .02); if (musicEl.volume >= .22) clearInterval(id); }, 60); }).catch(() => {});
}

/* ---------------- Japanese text ---------------- */
const KANA_ROMA = (() => {
  const m = {}, rows = 'a i u e o ka ki ku ke ko sa shi su se so ta chi tsu te to na ni nu ne no ha hi fu he ho ma mi mu me mo ya . yu . yo ra ri ru re ro wa . . . wo ga gi gu ge go za ji zu ze zo da ji zu de do ba bi bu be bo pa pi pu pe po'.split(' ');
  const kana = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもや.ゆ.よらりるれろわ...をがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ';
  [...kana].forEach((k, i) => { if (k !== '.') m[k] = rows[i]; });
  m['ん'] = 'n'; m['ー'] = '-';
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
    if (c === 'ー') { out += out.slice(-1); continue; }
    out += KANA_ROMA[c] ?? c;
  }
  return out;
}
// Markup: {kanji|kana|dictionary key} or {kana word}. Display rule: known = kanji, learning = kanji with romaji above, advanced = kana only.
function renderJP(markup) {
  return markup.replace(/\{([^}|]+)(?:\|([^}|]*))?(?:\|([^}]*))?\}/g, (_, surface, reading, key) => {
    key = key || surface; reading = reading || GLOSSARY[key]?.r || surface;
    const g = GLOSSARY[key] || { lv: 1 };
    const known = S.known.includes(key);
    const attrs = `class="w${g.lv >= 3 && !known ? ' adv' : ''}" data-key="${key}" data-read="${reading}" data-surf="${surface}"`;
    if (surface === reading) return `<span ${attrs}>${surface}</span>`;
    if (known) return `<span ${attrs}>${surface}</span>`;
    if (g.lv >= 3) return `<span ${attrs}>${reading}</span>`;
    return `<span ${attrs}><ruby>${surface}<rt>${romaji(reading)}</rt></ruby></span>`;
  });
}
const plain = s => s.replace(/\{([^}|]+)(?:\|[^}]*)?\}/g, '$1');
function markSeen(markup) {
  for (const m of markup.matchAll(/\{([^}|]+)(?:\|([^}|]*))?(?:\|([^}]*))?\}/g)) {
    const key = m[3] || m[1]; const w = S.words[key] ||= { seen: 0, looked: 0 }; w.seen++;
  }
}
// Tap a word for its meaning; that counts as a look-up.
let glossEl = null;
stage.addEventListener('pointerdown', e => {
  const w = e.target.closest('.w'); glossEl?.remove(); glossEl = null;
  if (!w) return;
  e.stopPropagation();
  const key = w.dataset.key, g = GLOSSARY[key] || {};
  (S.words[key] ||= { seen: 0, looked: 0 }).looked++;
  glossEl = h('div', 'gloss', `<b>${w.dataset.surf}</b><div class="r">${w.dataset.read} · ${romaji(w.dataset.read)}</div>${g.en || ''}`);
  stage.append(glossEl);
  const r = w.getBoundingClientRect(), s = stage.getBoundingClientRect();
  glossEl.style.left = Math.min(s.width - glossEl.offsetWidth - 8, Math.max(8, r.left - s.left)) + 'px';
  glossEl.style.top = Math.max(8, r.top - s.top - glossEl.offsetHeight - 10) + 'px';
  setTimeout(() => { glossEl?.remove(); glossEl = null; }, 3500);
}, true);

/* ---------------- time ---------------- */
const KANJI_NUM = n => { const d = '〇一二三四五六七八九'; if (n <= 10) return n === 10 ? '十' : d[n]; if (n < 20) return '十' + d[n - 10]; const t = Math.floor(n / 10), o = n % 10; return d[t] + '十' + (o ? d[o] : ''); };
function jpTime(min) {
  const hh = Math.floor(min / 60) % 24, mm = min % 60, pm = hh >= 12, h12 = hh % 12 || 12;
  return `${pm ? '午後' : '午前'}${KANJI_NUM(h12)}時${mm ? KANJI_NUM(mm) + '分' : ''}`;
}
const digital = min => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const parseClock = t => { const [a, b] = t.split(':').map(Number); return a * 60 + b; };

/* ---------------- HUD & phone ---------------- */
function drawHud(ping) {
  hud.innerHTML = '';
  if (S.task) hud.append(h('div', 'task', `<small>TASK</small>${renderJP(S.task)}`));
  const b = h('button', 'phone-btn' + (ping ? ' ping' : ''), `<span class="dot"></span>${jpTime(S.time)}`);
  b.style.pointerEvents = 'auto'; b.onclick = openPhone; b.title = `${digital(S.time)} (P opens the phone)`;
  hud.append(b);
}
let phoneTab = 'msg';
function openPhone() {
  sfx('tap', .3);
  const tabs = [['msg', 'メッセージ'], ['words', '単語'], ['set', '設定']];
  const body = h('div', 'ph-body');
  if (phoneTab === 'msg') {
    if (!S.messages.length) body.append(h('p', 'small', 'No messages yet.'));
    for (const m of [...S.messages].reverse()) body.append(h('div', 'msg', `<div class="from">${CAST[m.from]?.name || m.from}</div><div class="jp">${renderJP(m.jp)}</div><div class="en">${m.en}</div>`));
  } else if (phoneTab === 'words') {
    const entries = Object.entries(S.words).sort((a, b) => b[1].seen - a[1].seen);
    body.append(h('p', 'small', 'Words you have met today. Tap-ups count as looked up; a word becomes known once you have met it enough times without looking.'));
    for (const [k, w] of entries) {
      const g = GLOSSARY[k] || {};
      body.append(h('div', 'wordrow', `<span><b>${k}</b> ${g.r && g.r !== k ? g.r : ''}</span><span class="small">${g.en || ''}</span><span class="small">${S.known.includes(k) ? 'known' : `${w.seen}× · looked ${w.looked}`}</span>`));
    }
  } else {
    const st = S.settings;
    body.innerHTML = `
      <label>Listen first (text clears after the voice) <input type="checkbox" id="setLF" ${st.listenFirst ? 'checked' : ''}></label>
      <label>Always show English <input type="checkbox" id="setEN" ${st.showEn ? 'checked' : ''}></label>
      <div style="padding:.7em 0;border-bottom:1px solid #22252c"><b>Conversation AI</b><div class="small">Free conversations use an OpenAI-compatible endpoint: a local llama.cpp server (default) or OpenRouter. The key stays in this browser.</div>
        <input type="text" id="setEP" placeholder="endpoint" value="${st.llmEndpoint}">
        <input type="text" id="setMO" placeholder="model (blank = server default)" value="${st.llmModel}">
        <input type="password" id="setKE" placeholder="API key (OpenRouter only)" value="${st.llmKey}"></div>
      <button id="setRS" class="ph-close" style="background:#3a1a14">Restart day</button>`;
    setTimeout(() => {
      $('#setLF').onchange = e => { st.listenFirst = e.target.checked; save(); };
      $('#setEN').onchange = e => { st.showEn = e.target.checked; save(); };
      $('#setEP').onchange = e => { st.llmEndpoint = e.target.value.trim(); save(); };
      $('#setMO').onchange = e => { st.llmModel = e.target.value.trim(); save(); };
      $('#setKE').onchange = e => { st.llmKey = e.target.value.trim(); save(); };
      $('#setRS').onclick = () => { localStorage.removeItem(SAVE); location.reload(); };
    });
  }
  phone.innerHTML = '';
  phone.append(
    h('div', 'ph-top', `<div class="brand">AMAKAWA 社内フォン</div><div class="time">${jpTime(S.time)}<small>${digital(S.time)} · DAY ${S.day}</small></div>`),
    Object.assign(h('div', 'ph-tabs'), { innerHTML: tabs.map(([k, l]) => `<button data-t="${k}" class="${k === phoneTab ? 'on' : ''}">${l}</button>`).join('') }),
    body, Object.assign(h('button', 'ph-close', '閉じる (close)'), { onclick: closePhone }));
  phone.querySelectorAll('.ph-tabs button').forEach(b => b.onclick = () => { phoneTab = b.dataset.t; openPhone(); });
  phone.hidden = false;
}
function closePhone() { phone.hidden = true; }

/* ---------------- stage ---------------- */
let bgFlip = false;
function setBg(name) {
  const a = $('#bg'), b = $('#bg2'), url = `url(img/bg/${name}.webp)`;
  const [front, back] = bgFlip ? [a, b] : [b, a];
  front.style.backgroundImage = url; front.style.opacity = 1; back.style.opacity = 0; bgFlip = !bgFlip;
  stage.dataset.bg = name; // drives the per-location tint on sprites
}
const onStage = {};
function showChar(id, expr = Object.keys(onStage).length ? 'neutral' : 'neutral', at = 'center') {
  let el = onStage[id];
  const src = `img/ch/${id}-${expr}.webp`;
  if (!el) {
    el = h('div', `ch ${at} enter`); el.innerHTML = `<img src="${src}" alt="${CAST[id]?.en || id}">`;
    chars.append(el); onStage[id] = el; requestAnimationFrame(() => el.classList.remove('enter'));
  } else {
    el.className = `ch ${at || [...el.classList].find(c => ['left', 'center', 'right'].includes(c))}`;
    el.querySelector('img').src = src;
  }
}
function setExpr(id, expr) {
  const el = onStage[id]; if (!el || !expr) return;
  const img = el.querySelector('img'), src = `img/ch/${id}-${expr}.webp`;
  const probe = new Image(); probe.onload = () => { img.src = src; }; probe.src = src; // keep the old face if an expression is missing
}
function hideChar(id) { const el = onStage[id]; if (!el) return; el.classList.add('enter'); setTimeout(() => el.remove(), 350); delete onStage[id]; }
function focusSpeaker(id) { for (const [k, el] of Object.entries(onStage)) el.classList.toggle('dim', !!id && k !== id); }

/* ---------------- input helpers ---------------- */
let keyHandler = null;
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'p' || e.key === 'P') { phone.hidden ? openPhone() : closePhone(); return; }
  if (e.key === 'Escape') { closePhone(); return; }
  keyHandler?.(e);
});
function waitAdvance(el, onFirst) {
  // Resolves on click/space/enter. onFirst lets the first press do something else (e.g. clear listen-first blur).
  return new Promise(res => {
    let first = !!onFirst;
    const go = () => { if (first) { first = false; if (onFirst() === false) return; } cleanup(); res(); };
    const click = e => { if (e.target.closest('.phone-btn, .w, #phone')) return; go(); };
    const cleanup = () => { stage.removeEventListener('click', click); keyHandler = null; };
    stage.addEventListener('click', click);
    keyHandler = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); go(); } if (e.key === 't' || e.key === 'T') el?.querySelector('.en')?.toggleAttribute('hidden'); };
  });
}
function pick(options, render) {
  // Generic numbered choice: render(opt, i) -> element with .onclick wired by us.
  return new Promise(res => {
    const els = options.map((o, i) => { const el = render(o, i); el.onclick = () => { sfx('tap', .35); keyHandler = null; res(o); }; return el; });
    keyHandler = e => { const n = +e.key; if (n >= 1 && n <= options.length) { e.preventDefault(); els[n - 1].click(); } };
    return els;
  });
}

/* ---------------- lines ---------------- */
async function say(st) {
  const who = st.say, c = CAST[who] || { name: who, color: '#fff' };
  if (who !== 'announcer') { if (!onStage[who]) showChar(who, st.expr, defaultSpot(who)); else setExpr(who, st.expr); }
  focusSpeaker(who === 'announcer' ? null : who);
  markSeen(st.jp);
  const box = h('div', 'subs');
  box.append(h('div', 'who', `<span style="color:${c.color}">${c.name}</span>`));
  const line = h('div', 'line', renderJP(st.jp));
  box.append(line);
  const en = h('div', 'en', st.en); if (!S.settings.showEn) en.hidden = true; box.append(en);
  box.append(h('div', 'hint', 'click / space: continue · T: English · tap a word: meaning'));
  ui.innerHTML = ''; ui.append(box);
  const a = playVoice(who, plain(st.jp));
  let blurred = false;
  if (a && S.settings.listenFirst) {
    line.classList.add('listen'); blurred = true;
    a.addEventListener('ended', () => { line.classList.remove('listen'); blurred = false; });
  }
  await waitAdvance(box, () => { if (blurred) { line.classList.remove('listen'); blurred = false; return false; } return true; });
  voiceEl?.pause();
}
function defaultSpot(id) { const used = Object.values(onStage).map(el => [...el.classList].find(c => ['left', 'center', 'right'].includes(c))); return ['center', 'left', 'right'].find(p => !used.includes(p)) || 'center'; }
async function notify(m) {
  // A company-chat notification: the message itself, in Japanese, under the word display rule.
  focusSpeaker(null); markSeen(m.jp);
  const box = h('div', 'subs');
  box.append(h('div', 'who', `<span style="color:#ff9a8a">${CAST[m.from]?.name || m.from}</span>　<span style="font-size:.8em;color:#ddd">社内チャット</span>`));
  box.append(h('div', 'line', renderJP(m.jp)));
  const en = h('div', 'en', m.en); if (!S.settings.showEn) en.hidden = true; box.append(en);
  box.append(h('div', 'hint', 'saved in your phone (P) · T: English'));
  ui.innerHTML = ''; ui.append(box);
  await waitAdvance(box);
}
async function narrate(text) {
  focusSpeaker(null);
  const box = h('div', 'subs'); box.append(h('div', 'narr', text)); ui.innerHTML = ''; ui.append(box);
  await waitAdvance(box);
}

/* ---------------- steps ---------------- */
class Goto { constructor(scene) { this.scene = scene; } }
async function exec(steps) {
  for (const st of steps) { const r = await step(st); if (r instanceof Goto) return r; }
}
async function step(st) {
  if (st.bg) setBg(st.bg);
  if ('music' in st) music(st.music);
  if (st.clock) { S.time = parseClock(st.clock); drawHud(); }
  if (st.time) { S.time += st.time; drawHud(); }
  if (st.narrate) await narrate(st.narrate);
  if (st.say) await say(st);
  if (st.show) showChar(st.show, st.expr, st.at);
  if (st.hide) hideChar(st.hide);
  if (st.hideAll) Object.keys(onStage).forEach(hideChar);
  if (st.msg) { S.messages.push(st.msg); sfx('bell', .35); drawHud(true); await notify(st.msg); }
  if (st.task) { S.task = st.task; drawHud(); }
  if (st.set) Object.assign(S.flags, st.set);
  if (st.fx) for (const [k, v] of Object.entries(st.fx)) S.rel[k] = (S.rel[k] || 0) + v;
  if (st.suspicion) S.suspicion += st.suspicion;
  if (st.ifLate) { if (S.time > parseClock(st.ifLate)) { const r = await exec(st.then); if (r) return r; } }
  if (st.if) { const r = await exec(S.flags[st.if] ? st.then : (st.else || [])); if (r) return r; }
  if (st.choose) { const r = await choose(st.choose); if (r) return r; }
  if (st.elevator) await elevator(st.elevator);
  if (st.menu) await menu(st.menu);
  if (st.pay) await pay(st.pay);
  if (st.spell) { const r = await spell(st.spell); if (r) return r; }
  if (st.freeTalk) await freeTalk(st.freeTalk);
  if (st.summary) await summary();
  if (st.goto) return new Goto(st.goto);
  save();
}

async function choose(c) {
  let options = c.options;
  for (;;) {
    ui.innerHTML = '';
    const wrap = h('div', 'choices');
    if (c.prompt) wrap.append(h('div', 'prompt', c.prompt));
    ui.append(wrap);
    const chosen = await pick(options, (o, i) => {
      const b = h('button', `choice${o.magic ? ' magic' : ''}${c.kind === 'sign' ? ' sign' : ''}`, `<kbd>${i + 1}</kbd>${renderJP(o.jp)}<span class="en">${o.en}</span>`);
      wrap.append(b); return b;
    });
    markSeen(chosen.jp);
    if (chosen.fx) for (const [k, v] of Object.entries(chosen.fx)) S.rel[k] = (S.rel[k] || 0) + v;
    const r = await exec(chosen.then || []);
    if (r) return r;
    if (!chosen.retry) return;
    options = options.filter(o => o !== chosen);
  }
}

async function elevator(e) {
  for (;;) {
    ui.innerHTML = '';
    const panel = h('div', 'panel', '<h3>AMAKAWA TOWER · FLOORS</h3>');
    ui.append(panel);
    const f = await pick(FLOORS, (fl, i) => { const b = h('button', 'floor', `<span class="btn"></span><span>${renderJP(fl.jp)}</span><kbd>${i + 1}</kbd>`); panel.append(b); return b; });
    markSeen(f.jp);
    sfx('bell', .3); S.time += 1; drawHud();
    ui.innerHTML = '';
    if (f.id === e.target) { await sleep(400); return; }
    await exec(e.wrong[f.id] || [{ narrate: 'Wrong floor.' }]);
  }
}

async function menu(m) {
  ui.innerHTML = '';
  const board = h('div', 'board', '<h3>メニュー</h3>');
  ui.append(board);
  const item = await pick(m.items, (it, i) => { const b = h('button', 'item', `<span>${renderJP(it.jp)}</span><span class="dots"></span><span>${renderJP(`{${it.price}|${it.priceKana}}`)}</span>`); board.append(b); return b; });
  markSeen(item.jp);
  S.order = item;
  // Kaori reads the price aloud in Japanese; you have to understand it to pay.
  await say({ say: 'kaori', expr: 'smile', jp: `{${item.price}|${item.priceKana}}ね。`, en: `"That's ${item.price.replace('五百円', '500').replace('六百円', '600').replace('七百円', '700')} yen."` });
}

async function pay(p) {
  ui.innerHTML = '';
  const board = h('div', 'board', '<h3>いくら？</h3>');
  const row = h('div', 'coins'); board.append(row); ui.append(board);
  const val = s => ({ 五百円: 500, 六百円: 600, 七百円: 700 })[s];
  const coin = await pick(p.coins, (c, i) => { const b = h('button', 'coin', renderJP(`{${c}|${GLOSSARY[c].r}}`)); row.append(b); return b; });
  sfx('place', .5);
  const diff = val(coin) - val(S.order.price);
  await exec(diff < 0 ? p.tooLittle : diff > 0 ? p.tooMuch : p.right);
  if (diff < 0) return pay(p);
}

async function spell(sp) {
  sfx('open', .4);
  for (;;) {
    ui.innerHTML = '';
    const ov = h('div', 'spell'); const ring = h('div', 'ring');
    ring.append(h('div', 'goal', `言霊 · ${sp.goal}`), h('div', 'hint', sp.hint));
    const row = h('div', 'row'); ring.append(row); ov.append(ring); ui.append(ov);
    const verb = await pick(sp.verbs, (v, i) => { const b = h('button', 'rune', `${renderJP(`{${v.key}|${GLOSSARY[v.key].r}}`)}<small>${i + 1} · ${v.en}</small>`); row.append(b); return b; });
    row.innerHTML = ''; ring.querySelector('.hint').textContent = 'Now say it: which form?';
    const [form] = await pick(verb.forms, ([f, r], i) => { const b = h('button', 'rune', `${renderJP(`{${f}|${r}|${verb.key}}`)}<small>${i + 1}</small>`); row.append(b); return b; });
    ui.innerHTML = '';
    const glyph = h('div', 'cast-glyph', form); fx.append(glyph); setTimeout(() => glyph.remove(), 1500);
    if (form === sp.answer) {
      sfx('cast', .6); stage.classList.add('flash'); setTimeout(() => stage.classList.remove('flash'), 950); await sleep(900);
      const r = await exec(sp.success); if (r) return r; return;
    }
    sfx('fizzle', .5); await sleep(700);
    const r = await exec(sp.outcomes[form] || sp.outcomes.default); if (r) return r;
  }
}

/* ---------------- free talk (LLM) ---------------- */
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
  try { const r = await fetch(`${S.settings.llmEndpoint.replace(/\/$/, '')}/models`, { headers: S.settings.llmKey ? { Authorization: `Bearer ${S.settings.llmKey}` } : {} }); return r.ok; } catch { return false; }
}
async function freeTalk(t) {
  if (!(await llmAvailable())) { const r = await exec(t.fallback); return r; }
  const sys = `You are ${t.persona} You are talking with a foreign new hire on his first day; he is an early-intermediate Japanese learner. `
    + 'Speak ONLY casual Japanese at a beginner-friendly level (JLPT N5-N4 words, short sentences, 1-2 sentences per reply). Stay in character. '
    + `The player's goal: ${t.goal} `
    + 'Reply with strict JSON: {"ja": your line in Japanese, "kana": the same line in hiragana/katakana only, "en": English translation, "correction": null or a short, kind English note if the player\'s Japanese had a clear mistake}.';
  const msgs = [{ role: 'system', content: sys }];
  for (let turn = 0; turn < t.turns; turn++) {
    ui.innerHTML = '';
    const wrap = h('div', 'talk');
    wrap.append(h('div', 'goal', `${t.goal} Type in romaji or Japanese, then Enter. (${turn + 1}/${t.turns})`));
    const input = h('input'); input.placeholder = 'e.g. tsukareta kedo tanoshikatta'; wrap.append(input); ui.append(wrap);
    input.addEventListener('input', () => { if (/[a-z]$/i.test(input.value) === false || /[aiueo]$/i.test(input.value)) { const k = toKana(input.value); if (k !== input.value && !/[a-z]{3,}/i.test(k)) input.value = k; } });
    input.focus();
    const said = await new Promise(res => input.addEventListener('keydown', e => { if (e.key === 'Enter' && input.value.trim()) res(toKana(input.value.trim())); }));
    msgs.push({ role: 'user', content: said });
    ui.innerHTML = ''; ui.append(h('div', 'subs', '<div class="narr">…</div>'));
    let reply;
    try { reply = await llm(msgs); } catch (e) { await narrate(`(The conversation AI did not answer: ${e.message}. Falling back to the script.)`); return exec(t.fallback); }
    msgs.push({ role: 'assistant', content: JSON.stringify(reply) });
    const box = h('div', 'subs');
    box.append(h('div', 'who', `<span style="color:${CAST[t.with].color}">${CAST[t.with].name}</span>`));
    box.append(h('div', 'line', reply.ja || ''));
    box.append(h('div', 'en', `${reply.kana || ''}<br>${reply.en || ''}`));
    if (reply.correction) box.append(h('div', 'en', `✎ ${reply.correction}`));
    box.append(h('div', 'hint', 'click / space: continue'));
    ui.innerHTML = ''; ui.append(box);
    S.rel[t.with] = (S.rel[t.with] || 0) + 1;
    await waitAdvance(box);
  }
}

/* ---------------- summary ---------------- */
async function summary() {
  music('night');
  // Words met at least twice today without a look-up become known.
  const learned = Object.entries(S.words).filter(([k, w]) => !S.known.includes(k) && w.seen >= 2 && w.looked === 0).map(([k]) => k);
  S.known.push(...learned);
  const looked = Object.entries(S.words).filter(([, w]) => w.looked > 0).map(([k]) => k);
  const names = { mio: 'Mio', emi: 'Emi', rei: 'Rei', ishibashi: 'Ishibashi', kaori: 'Kaori', goro: 'Goro', jun: 'Jun' };
  const rels = Object.entries(S.rel).map(([k, v]) => `<div class="rel"><span>${names[k] || k}</span><span class="hearts">${v > 0 ? '♥'.repeat(Math.min(v, 5)) : v < 0 ? '−' : '·'}</span></div>`).join('');
  const ov = h('div', 'summary', `<div class="card"><h1><small>DAY ${S.day} · ${jpTime(S.time)}</small>一日目、おつかれさま。</h1>
    <div class="grid">
      <div><h2>WORDS</h2><p>${Object.keys(S.words).length} met today. ${learned.length} now known (met twice without looking up). ${looked.length} looked up; they will come back tomorrow.</p>
        <div class="words">${learned.map(k => `<span title="${GLOSSARY[k]?.en}">${k}</span>`).join('　') || '—'}</div></div>
      <div><h2>PEOPLE</h2>${rels || '<p>Nobody yet.</p>'}
        <h2 style="margin-top:1em">SUSPICION</h2><p>${'●'.repeat(S.suspicion)}${'○'.repeat(Math.max(0, 5 - S.suspicion))} ${S.suspicion >= 2 ? 'Someone is starting to wonder about you.' : 'Nobody suspects a thing. Yet.'}</p>
        ${S.flags.mioDate ? '<h2 style="margin-top:1em">TONIGHT</h2><p>Mio invited you to play games tonight.</p>' : ''}</div>
    </div>
    <button class="again">Play day one again</button></div>`);
  ui.innerHTML = ''; ui.append(ov); sfx('win', .5);
  save();
  ov.querySelector('.again').onclick = () => { const known = S.known; S = freshState(); S.known = known; save(); location.reload(); };
  await new Promise(() => {});
}

/* ---------------- title & main loop ---------------- */
async function title() {
  setBg('monorail'); drawHud();
  const saved = load();
  ui.innerHTML = '';
  const t = h('div', 'summary', `<div class="card" style="text-align:center"><h1 style="font-size:clamp(48px,9cqw,120px)"><small>AMAKAWA · DAY ONE PROTOTYPE</small>天川</h1>
    <p style="max-width:34em;margin:1em auto;color:#cfd3dc">Headphones on. Click or press space to continue lines, 1–9 to choose, T for English, P for your phone. Tap any word for its meaning.</p>
    <div class="choices" style="position:static;transform:none;margin:1.5em auto 0"></div></div>`);
  ui.append(t);
  const opts = [{ jp: 'はじめから', en: 'New game', v: 'new' }];
  if (saved?.scene) opts.unshift({ jp: 'つづきから', en: 'Continue', v: 'cont' });
  const wrap = t.querySelector('.choices');
  const c = await pick(opts, (o, i) => { const b = h('button', 'choice', `<kbd>${i + 1}</kbd>${o.jp}<span class="en">${o.en}</span>`); wrap.append(b); return b; });
  if (c.v === 'new') { const known = S.known; S = freshState(); S.known = saved?.known || known; }
  return S.scene || 'monorail';
}
(async () => {
  let scene = await title();
  drawHud();
  while (scene) {
    S.scene = scene; save();
    const r = await exec(SCENES[scene]);
    scene = r instanceof Goto ? r.scene : null;
  }
})();
