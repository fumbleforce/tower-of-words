// HTML overlay: goal, words, the train's LED board, the talk panel with reply chips, fades and the end card.
import { lineHTML, WORDS, COMMANDS, PHRASES, known, seen, cmdHTML } from './lang.js';

const $ = (s) => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

// ---------- sound ----------
let actx = null, muted = false;
let voiceSpans = null;
fetch(new URL('../audio/spans.json?v=' + (window.BUILD || ''), import.meta.url)).then((r) => (r.ok ? r.json() : null)).then((j) => { voiceSpans = j; }).catch(() => {});
const clips = {};
function ac() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch { actx = null; } } if (actx && actx.state === 'suspended') actx.resume(); return actx; }
export function voice(key, { rate = 1, muffle = false } = {}) {
  if (muted || !key) return;
  if (muffle) {
    // overheard speech: heavily muffled (low-pass, quieter), except the words he knows, which come through clear.
    // audio/spans.json lists those words' times per clip [[t0, t1], ...]; the two paths crossfade in 40 ms.
    const c = ac(); if (!c) return;
    try {
      const a = new Audio(new URL(`../audio/${key}.mp3`, import.meta.url).href); a.crossOrigin = 'anonymous';
      const src = c.createMediaElementSource(a), f = c.createBiquadFilter(), f2 = c.createBiquadFilter(), wet = c.createGain(), dry = c.createGain();
      f.type = 'lowpass'; f.frequency.value = 380; f.Q.value = 0.5; f2.type = 'lowpass'; f2.frequency.value = 380; f2.Q.value = 0.5;
      src.connect(f); f.connect(f2); f2.connect(wet); wet.connect(c.destination);
      src.connect(dry); dry.connect(c.destination);
      const W = 0.55, X = 0.04;
      wet.gain.value = W; dry.gain.value = 0;
      // entries are [t0, t1, wordId] (clear only once he knows that word) or [t0, t1, 'clear'] (always clear)
      const spans = ((voiceSpans && voiceSpans[key]) || []).filter(([, , id]) => id === 'clear' || known.has(id) || seen.has(id));
      a.addEventListener('playing', () => {
        const t0 = c.currentTime - a.currentTime;
        for (const [s, e] of spans) {
          dry.gain.setValueAtTime(0, t0 + s - X); dry.gain.linearRampToValueAtTime(1, t0 + s);
          dry.gain.setValueAtTime(1, t0 + e); dry.gain.linearRampToValueAtTime(0, t0 + e + X);
          wet.gain.setValueAtTime(W, t0 + s - X); wet.gain.linearRampToValueAtTime(0, t0 + s);
          wet.gain.setValueAtTime(0, t0 + e); wet.gain.linearRampToValueAtTime(W, t0 + e + X);
        }
      }, { once: true });
      a.play().catch(() => {});
      if (clips._muffled) clips._muffled.pause(); clips._muffled = a;
    } catch { /* no audio */ }
    return;
  }
  try {
    const a = clips[key] || (clips[key] = new Audio(new URL(`../audio/${key}.mp3`, import.meta.url).href));
    a.pause(); a.currentTime = 0; a.playbackRate = rate; a.volume = key.startsWith('mio') ? 0.75 : 1;
    a.play().catch(() => {});
  } catch { /* no audio */ }
}
export function sfx(kind) {
  const c = ac(); if (!c || muted) return;
  const t = c.currentTime, g = c.createGain(); g.connect(c.destination);
  const tone = (f, t0, d, v = 0.12, type = 'sine') => { const o = c.createOscillator(); o.type = type; o.frequency.value = f; const gg = c.createGain(); gg.gain.setValueAtTime(0, t + t0); gg.gain.linearRampToValueAtTime(v, t + t0 + 0.01); gg.gain.exponentialRampToValueAtTime(0.0001, t + t0 + d); o.connect(gg); gg.connect(g); o.start(t + t0); o.stop(t + t0 + d + 0.05); };
  if (kind === 'chime') { tone(784, 0, 0.9, 0.09); tone(659, 0.35, 1.1, 0.09); tone(523, 0.7, 1.4, 0.08); }
  else if (kind === 'ok') { tone(1320, 0, 0.12, 0.08, 'triangle'); tone(1760, 0.1, 0.18, 0.07, 'triangle'); }
  else if (kind === 'no') { tone(220, 0, 0.18, 0.1, 'square'); tone(196, 0.2, 0.25, 0.1, 'square'); }
  else if (kind === 'tap') { tone(900, 0, 0.05, 0.04, 'triangle'); }
  else if (kind === 'word') { tone(988, 0, 0.14, 0.06, 'triangle'); tone(1318, 0.09, 0.22, 0.06, 'triangle'); }
  else if (kind === 'door') { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(90, t); o.frequency.linearRampToValueAtTime(60, t + 0.5); const gg = c.createGain(); gg.gain.setValueAtTime(0.03, t); gg.gain.linearRampToValueAtTime(0, t + 0.55); o.connect(gg); gg.connect(g); o.start(t); o.stop(t + 0.6); }
  else if (kind === 'lift') { tone(1046, 0, 0.6, 0.07); }
  else if (kind === 'clack') { tone(140, 0, 0.05, 0.05, 'square'); tone(120, 0.07, 0.05, 0.04, 'square'); }
  else if (kind === 'beep') { tone(1500, 0, 0.09, 0.06, 'square'); }
  else if (kind === 'brake' || kind === 'crowd') {
    const n = c.createBufferSource(), len = kind === 'brake' ? 1.6 : 2.5, buf = c.createBuffer(1, c.sampleRate * len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    n.buffer = buf; const f = c.createBiquadFilter(); f.type = kind === 'brake' ? 'highpass' : 'bandpass'; f.frequency.value = kind === 'brake' ? 3200 : 700;
    const gg = c.createGain(); gg.gain.value = kind === 'brake' ? 0.05 : 0.04; n.connect(f); f.connect(gg); gg.connect(g); n.start(t);
  }
}
export function setMuted(m) { muted = m; if (m) for (const a of Object.values(clips)) a.pause(); }
export function isMuted() { return muted; }
export function unlockAudio() { ac(); }

// ---------- overheard Japanese ----------
// Eric can't follow it: every character he doesn't know becomes a softened, shifting stand-in glyph, and
// the words he does know (his phrases and commands, plus the line's `clear` list) stay sharp and glossed.
const POOL = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだでどばびぶべぼアイウエオカキクケコサシスセソタチツテトナニヌネノ会社部長話時間問題今日明後来行見出入上下中大小月火水木金土';
function heardHTML(text, clear = []) {
  // {id} words written into an overheard line are what the listener catches: shown sharp and glossed
  const marked = [];
  text = text.replace(/\{(\w+)\}/g, (_, id) => { if (WORDS[id]) { marked.push(id); seen.add(id); return WORDS[id].ja; } return id; });
  const keep = marked.map((id) => ({ ja: WORDS[id].ja, gl: `${WORDS[id].ro}, ${WORDS[id].en}`, known: true }));
  for (const id of new Set([...known, ...seen])) { const w = WORDS[id]; if (!w) continue; for (const ja of [w.ja, ...(w.alias || [])]) keep.push({ ja, gl: `${w.ro}, ${w.en}`, known: true }); }
  // `clear` entries are readable for this line only: plain text, not styled as known, never added to what he knows
  for (const c of clear || []) keep.push(typeof c === 'string' ? { ja: c } : { ja: c.ja, gl: [c.ro, c.en].filter(Boolean).join(', ') });
  keep.sort((a, b) => b.ja.length - a.ja.length);
  let out = '', i = 0;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  while (i < text.length) {
    const k = keep.find((w) => text.startsWith(w.ja, i));
    if (k) { out += `<span class="${k.known ? 'jp clear' : 'plain'}">${esc(k.ja)}</span>${k.gl ? ` <span class="gl">(${esc(k.gl)})</span>` : ''}`; i += k.ja.length; continue; }
    const ch = text[i];
    if (/[\s、。！？!?…「」]/.test(ch)) out += esc(ch);
    else out += `<span class="gx" data-c="${esc(ch)}">${POOL[(ch.charCodeAt(0) * 7 + i) % POOL.length]}</span>`;
    i++;
  }
  return `<span class="heardico" aria-hidden="true"></span>${out}`;
}
let scrambleTimer = null;
function scramble(line) {
  clearInterval(scrambleTimer);
  let n = 0;
  scrambleTimer = setInterval(() => {
    if (!line.isConnected || !line.closest('#talk.heard')) { clearInterval(scrambleTimer); return; }
    const g = line.querySelectorAll('.gx'); if (!g.length) { clearInterval(scrambleTimer); return; }
    for (let k = 0; k < 3; k++) { const e = g[(n * 5 + k * 7) % g.length]; e.textContent = POOL[(Math.random() * POOL.length) | 0]; }
    n++;
  }, 140);
}

// ---------- layout ----------
export const ui = {
  root: null,
  build() {
    const r = $('#ui');
    this.root = r;
    r.innerHTML = `
      <div id="marks"></div>
      <div id="top">
        <div id="goal" hidden><span class="k">Goal</span><span class="t"></span></div>
        <div class="tr">
          <div id="clock" hidden><span class="d"></span><span class="p"></span></div>
          <button id="peopleBtn" type="button" hidden aria-label="People you've met"><span class="lbl">People</span><span class="n">0</span></button>
          <button id="bagBtn" type="button" hidden aria-label="Bag"><span class="lbl">Bag</span><span class="n">0</span></button>
          <button id="cmdsBtn" type="button" hidden aria-label="Words you can say"><span class="lbl">Words</span><span class="n">0</span></button>
        </div>
      </div>
      <div id="board" hidden><div class="led"></div></div>
      <div id="talk" hidden>
        <div class="who"></div>
        <div class="line"></div>
        <div class="chips"></div>
        <div class="more" aria-hidden="true"></div>
      </div>
      <div id="cmdsPanel" hidden><div class="card"><div class="head">Words you can say</div><p class="note">Use the Say button. It speaks to whoever or whatever is nearest.</p><ul></ul><button type="button" class="close">Close</button></div></div>
      <div id="peoplePanel" class="panel" hidden><div class="card"><div class="head">People</div><ul></ul><button type="button" class="close">Close</button></div></div>
      <div id="bagPanel" class="panel" hidden><div class="card"><div class="head">Bag</div><p class="yen"></p><ul></ul><button type="button" class="close">Close</button></div></div>
      <button id="giveBtn" type="button" hidden><span class="t">Give</span><span class="to"></span></button>
      <button id="sayBtn" type="button" hidden><span class="t">Say</span><span class="sub">a word</span><span class="to"></span></button>
      <div id="sayTip" hidden><b>Say</b> speaks a word you know to whoever or whatever is nearest. Try it when you're stuck.<button type="button">Got it</button></div>
      <div id="sayMenu" hidden><div class="head"></div><div class="list"></div><button type="button" class="cancel">Never mind</button></div>
      <div id="hint" hidden></div>
      <div id="toast" hidden></div>
      <div id="caption" hidden><span class="nm"></span><span class="tx"></span></div>
      <div id="liftInd" hidden><span class="arrow">▲</span><span class="fl">1</span></div>
      <img id="xfade" alt="" hidden>
      <div id="fade"><div class="title"></div><div class="sub"></div></div>
      <div id="end" hidden></div>
      <button id="muteBtn" type="button" aria-label="Sound on or off">Sound on</button>
    `;
    $('#cmdsBtn').onclick = () => this.showCmds();
    $('#cmdsPanel .close').onclick = () => { $('#cmdsPanel').hidden = true; };
    $('#sayBtn').onclick = (e) => { e.stopPropagation(); this.onSay && this.onSay(); };
    $('#giveBtn').onclick = (e) => { e.stopPropagation(); this.onGive && this.onGive(); };
    $('#peopleBtn').onclick = () => { $('#peoplePanel ul').innerHTML = this.peopleHTML ? this.peopleHTML() : ''; $('#peoplePanel').hidden = false; };
    $('#bagBtn').onclick = () => { $('#bagPanel').hidden = false; };
    for (const id of ['#peoplePanel', '#bagPanel']) $(id + ' .close').onclick = () => { $(id).hidden = true; };
    $('#sayMenu .cancel').onclick = () => { $('#sayMenu').hidden = true; this._sayRes && this._sayRes(null); };
    $('#muteBtn').onclick = (e) => { e.stopPropagation(); setMuted(!isMuted()); $('#muteBtn').textContent = isMuted() ? 'Sound off' : 'Sound on'; };
    // advancing the talk panel: tap anywhere on it, or Space/Enter
    $('#talk').addEventListener('pointerdown', (e) => { if (e.target.closest('.chip')) return; e.stopPropagation(); this._advance && this._advance(); });
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'Enter') { if (this._advance) { e.preventDefault(); this._advance(); } }
      if (this._chipKeys && /^Digit[1-9]$/.test(e.code)) { const b = this._chipKeys[+e.code.slice(5) - 1]; if (b) b.click(); }
      else if (this._sayKeys && /^Digit[1-9]$/.test(e.code)) { const b = this._sayKeys[+e.code.slice(5) - 1]; if (b) b.click(); }
      if (e.code === 'Escape' && !$('#sayMenu').hidden) $('#sayMenu .cancel').click();
    });
  },
  // Jørgen: no goal or story text in panels. The goal is kept for the markers (teal) but never shown as text.
  goal(text) {
    const g = $('#goal');
    g.hidden = true; this.goalText = text || ''; return;
    if (!text) { g.hidden = true; return; }
    g.hidden = false;
    g.querySelector('.t').innerHTML = lineHTML(text, { count: false });
    g.classList.remove('pop'); void g.offsetWidth; g.classList.add('pop');
  },
  refreshWords() {
    const b = $('#cmdsBtn');
    b.hidden = known.size === 0;
    b.querySelector('.n').textContent = known.size;
    $('#sayBtn').hidden = known.size === 0;
  },
  showCmds() {
    const row = (id) => { const w = WORDS[id]; return `<li><span class="jp">${w.ja}</span><span class="ro">${w.ro}</span><span class="en">${w.en}</span></li>`; };
    const ph = PHRASES.filter((id) => known.has(id)), cm = COMMANDS.filter((id) => known.has(id));
    $('#cmdsPanel ul').innerHTML = (ph.length ? `<li class="sec">Phrases</li>${ph.map(row).join('')}` : '') + (cm.length ? `<li class="sec">Commands <span>(they make old machines listen)</span></li>${cm.map(row).join('')}` : '');
    $('#cmdsPanel').hidden = false;
  },
  // the Say menu: resolves with a command id or null
  sayMenu(targetName) {
    return new Promise((res) => {
      const m = $('#sayMenu');
      m.querySelector('.head').innerHTML = targetName ? `Say to <b>${targetName}</b>` : 'Say';
      const list = m.querySelector('.list'); list.innerHTML = '';
      let n = 0;
      for (const [title, ids] of [['Phrases', PHRASES], ['Commands', COMMANDS]]) {
        const have = ids.filter((id) => known.has(id)); if (!have.length) continue;
        list.appendChild(el('div', 'sec', title));
        for (const id of have) {
          const b = el('button', 'cmd' + (WORDS[id].phrase ? ' phrase' : ''), `<span class="k">${++n}</span>${cmdHTML(id)}`); b.type = 'button';
          b.onclick = (e) => { e.stopPropagation(); m.hidden = true; this._sayKeys = null; res(id); };
          list.appendChild(b);
        }
      }
      this._sayKeys = [...list.querySelectorAll('button.cmd')];
      this._sayRes = (v) => { this._sayKeys = null; res(v); };
      m.hidden = false;
    });
  },
  // the first time Eric knows a word: the Say button pulses and a short tip points at it
  introSay(text) {
    const b = $('#sayBtn'), tip = $('#sayTip');
    b.hidden = false;
    if (text) tip.firstChild.textContent !== undefined && (tip.innerHTML = `${lineHTML(text)}<button type="button">Got it</button>`);
    b.classList.add('pulse'); tip.hidden = false;
    const off = () => { tip.hidden = true; b.classList.remove('pulse'); };
    tip.querySelector('button').onclick = (e) => { e.stopPropagation(); off(); };
    b.addEventListener('click', off, { once: true });
    setTimeout(off, 14000);
  },
  sayReady(on) { $('#sayBtn').classList.toggle('ready', !!on); },
  setSayTarget(name) { const t = $('#sayBtn .to'); if (t.textContent !== (name || '')) t.textContent = name || ''; },
  hint(html, ms = 0) {
    const h = $('#hint'); h.innerHTML = html; h.hidden = !html;
    clearTimeout(this._ht); if (ms) this._ht = setTimeout(() => { h.hidden = true; }, ms);
  },
  toast(html, ms = 2200) {
    const t = $('#toast'); t.innerHTML = html; t.hidden = false; t.classList.remove('in'); void t.offsetWidth; t.classList.add('in');
    clearTimeout(this._tt); this._tt = setTimeout(() => { t.hidden = true; }, ms);
  },
  board(text, { voiceKey } = {}) {
    const b = $('#board');
    if (!text) { b.classList.remove('in'); setTimeout(() => { if (!b.classList.contains('in')) b.hidden = true; }, 400); return; }
    b.hidden = false; b.querySelector('.led').innerHTML = lineHTML(text);
    b.classList.remove('in'); void b.offsetWidth; b.classList.add('in');
    this.refreshWords();
    if (voiceKey) voice(voiceKey);
  },
  // Show a line and wait for a tap. speaker: {name, role, color} or null for narration.
  say(speaker, text, { voiceKey, auto, overheard, clear } = {}) {
    return new Promise((res) => {
      const t = $('#talk');
      t.classList.toggle('heard', !!overheard);
      t.hidden = false; t.classList.toggle('narr', !speaker); t.classList.toggle('phone', !!(speaker && speaker.phone));
      const who = t.querySelector('.who');
      who.innerHTML = speaker ? `<span class="nm" style="--c:${speaker.color || '#8fa3c0'}">${speaker.name}</span>${speaker.role ? `<span class="rl">${speaker.role}</span>` : ''}` : '';
      t.querySelector('.line').innerHTML = overheard ? heardHTML(text, clear) : lineHTML(text);
      t.querySelector('.chips').innerHTML = '';
      t.querySelector('.more').hidden = false;
      t.classList.remove('in'); void t.offsetWidth; t.classList.add('in');
      this.refreshWords();
      if (overheard) scramble(t.querySelector('.line'));
      if (voiceKey) voice(voiceKey, { muffle: !!overheard });
      const started = performance.now();
      if (this.auto) { setTimeout(() => { this._advance = null; res(); }, 15); return; }
      this._advance = () => { if (performance.now() - started < 250) return; this._advance = null; sfx('tap'); res(); };
      if (auto) setTimeout(() => { if (this._advance) { this._advance = null; res(); } }, auto);
    });
  },
  // Show a line with reply chips; resolves with the chip index. chips: [{html}]
  choose(speaker, text, chips, { voiceKey, glow = -1, keepLine = false } = {}) {
    return new Promise((res) => {
      const t = $('#talk');
      t.hidden = false; t.classList.toggle('narr', !speaker);
      const who = t.querySelector('.who');
      who.innerHTML = speaker ? `<span class="nm" style="--c:${speaker.color || '#8fa3c0'}">${speaker.name}</span>${speaker.role ? `<span class="rl">${speaker.role}</span>` : ''}` : '';
      if (!keepLine) t.querySelector('.line').innerHTML = text ? lineHTML(text) : '';
      t.querySelector('.more').hidden = true;
      const box = t.querySelector('.chips'); box.innerHTML = '';
      const shown = performance.now();   // a tap that revealed the chips must not also pick one
      const btns = chips.map((c, i) => {
        const b = el('button', 'chip' + (i === glow ? ' glow' : '') + (c.cls ? ' ' + c.cls : ''), `<span class="k">${i + 1}</span><span class="c">${c.html}</span>`);
        b.type = 'button';
        b.onclick = (e) => { e.stopPropagation(); if (performance.now() - shown < 350) return; this._chipKeys = null; box.querySelectorAll('.chip').forEach((x) => { x.disabled = true; }); b.classList.add('picked'); res(i); };
        box.appendChild(b); return b;
      });
      this._chipKeys = btns;
      this._advance = null;
      if (this.auto) setTimeout(() => { const i = Math.min(btns.length - 1, this.autoPick ? this.autoPick(chips) : 0); box.querySelectorAll('.chip').forEach((x) => { x.disabled = true; }); this._chipKeys = null; res(i); }, 15);
      t.classList.remove('in'); void t.offsetWidth; t.classList.add('in');
      this.refreshWords();
      if (voiceKey) voice(voiceKey);
    });
  },
  caption(sp, text) {
    const c = $('#caption');
    if (!text) { c.hidden = true; return; }
    c.hidden = false;
    c.querySelector('.nm').innerHTML = sp ? sp.name : '';
    c.querySelector('.nm').style.color = sp ? (sp.color || '') : '';
    c.querySelector('.tx').innerHTML = lineHTML(text);
    c.classList.remove('in'); void c.offsetWidth; c.classList.add('in');
  },
  lift(floor, dir) { const l = $('#liftInd'); if (floor == null) { l.hidden = true; return; } l.hidden = false; l.querySelector('.fl').textContent = floor; l.querySelector('.arrow').textContent = dir === 'down' ? '▼' : '▲'; },
  menuClosed() { return $('#sayMenu').hidden && $('#cmdsPanel').hidden && $('#peoplePanel').hidden && $('#bagPanel').hidden; },
  clock(date, period) { const c = $('#clock'); c.hidden = false; c.querySelector('.d').textContent = date; c.querySelector('.p').textContent = period; },
  refreshPeople(n) { const b = $('#peopleBtn'); b.hidden = !n; b.querySelector('.n').textContent = n; },
  refreshBag(sim) {
    const b = $('#bagBtn'); b.hidden = !sim.inv.length; b.querySelector('.n').textContent = sim.inv.length;
    $('#bagPanel .yen').textContent = `¥${sim.yen} left`;
    $('#bagPanel ul').innerHTML = sim.inv.map((i) => `<li>${(this.items && this.items[i] && this.items[i].name) || i}</li>`).join('');
  },
  setGiveTarget(name, on) { const g = $('#giveBtn'); g.hidden = !on; const t = g.querySelector('.to'); if (t.textContent !== (name || '')) t.textContent = name || ''; },
  // pick an item to give: resolves with the item id or null
  giveMenu(targetName, inv, items) {
    return new Promise((res) => {
      const m = $('#sayMenu');
      m.querySelector('.head').innerHTML = `Give to <b>${targetName}</b>`;
      const list = m.querySelector('.list'); list.innerHTML = '';
      [...new Set(inv)].forEach((id, i) => { const b = el('button', 'cmd', `<span class="k">${i + 1}</span><span class="en">${items[id] ? items[id].name : id}</span>`); b.type = 'button'; b.onclick = (e) => { e.stopPropagation(); m.hidden = true; this._sayKeys = null; res(id); }; list.appendChild(b); });
      this._sayKeys = [...list.children];
      this._sayRes = (v) => { this._sayKeys = null; res(v); };
      m.hidden = false;
    });
  },
  // Type the romaji of a word. Forgiving: case, spaces, hyphens and long vowels (ō = ou = oo = o) don't matter.
  // Each letter lights up as it's typed; a wrong try shows where it went off. Resolves when it's right.
  typePrompt(id, prompt) {
    return new Promise((res) => {
      const w = WORDS[id];
      const canon = (s) => s.toLowerCase().normalize('NFC').replace(/[āâ]/g, 'a').replace(/[īî]/g, 'i').replace(/[ūû]/g, 'u').replace(/[ēê]/g, 'e').replace(/[ōô]/g, 'o')
        .replace(/[^a-z]/g, '').replace(/ou/g, 'o').replace(/oo/g, 'o').replace(/uu/g, 'u').replace(/aa/g, 'a').replace(/ii/g, 'i');
      const target = canon(w.ro);
      // display tokens: each romaji letter of the word, with long vowels as one token
      const toks = []; for (const ch of w.ro) { if (/\s|-/.test(ch)) toks.push({ ch, sp: true }); else toks.push({ ch }); }
      const t = $('#talk'); t.hidden = false; t.classList.remove('narr', 'heard', 'phone'); t.classList.add('typing');
      t.querySelector('.who').innerHTML = '';
      t.querySelector('.line').innerHTML = (prompt ? `<div class="tp-prompt">${prompt.who ? `<span class="tp-who" style="color:${prompt.who.color || '#8fa3c0'}">${prompt.who.name}</span> ` : ''}${lineHTML(prompt.text)}</div>` : '') +
        `<div class="tp"><div class="tp-jp jp">${w.ja}</div><div class="tp-ro">${toks.map((k) => (k.sp ? '<span class="sp"> </span>' : `<span class="lt">${k.ch}</span>`)).join('')}</div><div class="tp-en">${w.en}</div>` +
        `<input class="tp-in" type="text" inputmode="latin" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Type it in romaji" aria-label="Type ${w.ro}"><div class="tp-hint"></div></div>`;
      t.querySelector('.chips').innerHTML = ''; t.querySelector('.more').hidden = true;
      t.classList.remove('in'); void t.offsetWidth; t.classList.add('in');
      this._advance = null; this._chipKeys = null;
      const inp = t.querySelector('.tp-in'), hint = t.querySelector('.tp-hint');
      const letters = [...t.querySelectorAll('.tp-ro .lt')];
      // which display letters each canonical position covers
      const map = []; { let c = ''; letters.forEach((el, i) => { const before = canon(c); c += el.textContent; const after = canon(c); for (let k = before.length; k < after.length; k++) map[k] = i; if (after.length === before.length) map[before.length - 1] = i; }); }
      let tries = 0;
      const paint = () => {
        const v = canon(inp.value); let ok = 0; while (ok < v.length && v[ok] === target[ok]) ok++;
        const lit = ok ? map[ok - 1] : -1;
        letters.forEach((el, i) => { el.classList.toggle('on', i <= lit); el.classList.toggle('bad', v.length > ok && i === (ok < target.length ? map[ok] : -1)); });
        return v === target;
      };
      const done = () => { t.classList.remove('typing'); sfx('ok'); res(); };
      inp.addEventListener('input', () => { if (paint()) setTimeout(done, 250); });
      inp.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key !== 'Enter') return;
        if (paint()) { done(); return; }
        tries++; sfx('no');
        const v = canon(inp.value); let ok = 0; while (ok < v.length && v[ok] === target[ok]) ok++;
        const next = letters[map[Math.min(ok, target.length - 1)]];
        hint.innerHTML = tries < 3 ? `Close. Next letter: <b>${next ? next.textContent : ''}</b>. Follow the letters under the word.` : `Type it just as shown: <b>${w.ro}</b>`;
      });
      if (this.auto) { setTimeout(() => { inp.value = w.ro; paint(); done(); }, 20); return; }
      setTimeout(() => inp.focus(), 60);
    });
  },
  closeTalk() { const t = $('#talk'); t.hidden = true; this._advance = null; this._chipKeys = null; },
  get talking() { return !$('#talk').hidden; },
  fade(title, sub = '', hold = 1400) {
    const f = $('#fade');
    f.querySelector('.title').textContent = title || '';
    f.querySelector('.sub').innerHTML = sub || '';
    f.classList.add('on');
    return new Promise((res) => setTimeout(res, 650 + hold));
  },
  unfade() { $('#fade').classList.remove('on'); return new Promise((res) => setTimeout(res, 600)); },
  showEnd(html) { const e = $('#end'); e.innerHTML = html; e.hidden = false; requestAnimationFrame(() => e.classList.add('in')); },
};
