// HTML overlay: goal, words, the train's LED board, the talk panel with reply chips, fades and the end card.
import { lineHTML, WORDS, COMMANDS, PHRASES, known, seen, cmdHTML } from './lang.js';

const $ = (s) => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

// ---------- sound ----------
let actx = null, muted = false;
const clips = {};
function ac() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch { actx = null; } } if (actx && actx.state === 'suspended') actx.resume(); return actx; }
export function voice(key, { rate = 1, muffle = false } = {}) {
  if (muted || !key) return;
  if (muffle) {
    // overheard speech: through a low-pass filter, a little quieter, as if from across the room
    const c = ac(); if (!c) return;
    try {
      const a = new Audio(new URL(`../audio/${key}.mp3`, import.meta.url).href); a.crossOrigin = 'anonymous';
      const src = c.createMediaElementSource(a), f = c.createBiquadFilter(), g = c.createGain();
      f.type = 'lowpass'; f.frequency.value = 650; f.Q.value = 0.6; g.gain.value = 0.8;
      src.connect(f); f.connect(g); g.connect(c.destination);
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
  const keep = [];
  for (const id of new Set([...known, ...seen])) if (WORDS[id]) keep.push({ ja: WORDS[id].ja, gl: `${WORDS[id].ro}, ${WORDS[id].en}` });
  for (const c of clear || []) keep.push(typeof c === 'string' ? { ja: c } : { ja: c.ja, gl: [c.ro, c.en].filter(Boolean).join(', ') });
  keep.sort((a, b) => b.ja.length - a.ja.length);
  let out = '', i = 0;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  while (i < text.length) {
    const k = keep.find((w) => text.startsWith(w.ja, i));
    if (k) { out += `<span class="jp clear">${esc(k.ja)}</span>${k.gl ? ` <span class="gl">(${esc(k.gl)})</span>` : ''}`; i += k.ja.length; continue; }
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
      <button id="sayBtn" type="button" hidden><span class="t">Say</span><span class="to"></span></button>
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
  goal(text) {
    const g = $('#goal');
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
