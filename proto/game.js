// Kotodama prototype: one sentence-casting battle + one Scriptorium lesson (人, 木, 休).
const $app = document.getElementById('app');
const SAVE = 'kotodama.proto';
const store = (() => { try { return JSON.parse(localStorage.getItem(SAVE)) || {}; } catch { return {}; } })();
const P = Object.assign({ art: 'anime', sigils: [], music: true }, store);
const persist = () => { try { localStorage.setItem(SAVE, JSON.stringify(P)); } catch {} };
const DESKTOP = matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ---------------- helpers ---------------- */
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style') el.style.cssText = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  return el;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ruby = (base, rt) => rt ? h('ruby', {}, base, h('rt', {}, rt)) : base;

/* ---------------- audio ---------------- */
const fnv = s => { let x = 0x811c9dc5; for (const c of s) { x ^= c.codePointAt(0); x = Math.imul(x, 0x01000193) >>> 0; } return x.toString(16).padStart(8, '0'); };
let voiceEl = null;
function voice(text, v = 'f') {
  const key = fnv(v + '|' + text.replace(/\s+/g, ''));
  if (!(window.AUDIO || {})[key]) return;
  if (voiceEl) voiceEl.pause();
  voiceEl = new Audio(`../audio/${key}.mp3`); voiceEl.play().catch(() => {});
}
const SFX = {};
function sfx(name, vol = .6) {
  const a = (SFX[name] ||= new Audio(`sfx/${name}.mp3`)).cloneNode();
  a.volume = vol; a.play().catch(() => {});
}
let track = null;
function music(name) {
  if (track && track.dataset.name === name) return;
  if (track) { const t = track; fadeOut(t); }
  if (!name || !P.music) { track = null; return; }
  track = new Audio(`music/${name}.mp3`); track.dataset.name = name; track.loop = true; track.volume = 0;
  track.play().then(() => fadeIn(track)).catch(() => {});
}
function fadeIn(t) { const id = setInterval(() => { t.volume = Math.min(.32, t.volume + .02); if (t.volume >= .32) clearInterval(id); }, 60); }
function fadeOut(t) { const id = setInterval(() => { t.volume = Math.max(0, t.volume - .03); if (t.volume <= 0) { clearInterval(id); t.pause(); } }, 50); }

/* ---------------- romaji → kana (for typing on desktop) ---------------- */
const ROMA = (() => {
  const m = { a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お', n: 'ん', '-': 'ー', "n'": 'ん' };
  const rows = { k: 'かきくけこ', s: 'さしすせそ', t: 'たちつてと', n: 'なにぬねの', h: 'はひふへほ', m: 'まみむめも', y: 'や.ゆ.よ', r: 'らりるれろ', w: 'わ...を', g: 'がぎぐげご', z: 'ざじずぜぞ', d: 'だぢづでど', b: 'ばびぶべぼ', p: 'ぱぴぷぺぽ' };
  for (const [c, ks] of Object.entries(rows)) [...'aiueo'].forEach((v, i) => { if (ks[i] !== '.') m[c + v] = ks[i]; });
  Object.assign(m, { shi: 'し', chi: 'ち', tsu: 'つ', fu: 'ふ', ji: 'じ', wo: 'を' });
  const yo = { ky: 'き', sh: 'し', ch: 'ち', ny: 'に', hy: 'ひ', my: 'み', ry: 'り', gy: 'ぎ', j: 'じ', by: 'び', py: 'ぴ' };
  for (const [c, k] of Object.entries(yo)) { m[c + 'a'] = k + 'ゃ'; m[c + 'u'] = k + 'ゅ'; m[c + 'o'] = k + 'ょ'; }
  return m;
})();
function toKana(s) {
  s = s.toLowerCase(); let out = '';
  for (let i = 0; i < s.length;) {
    const c = s[i];
    if (/[a-z'-]/.test(c)) {
      if (c === s[i + 1] && !'aiueon'.includes(c)) { out += 'っ'; i++; continue; }
      if (c === 'n' && (i + 1 >= s.length || !/[aiueoy']/.test(s[i + 1]))) { out += 'ん'; i++; continue; }
      let hit = false;
      for (const len of [3, 2, 1]) { const k = s.slice(i, i + len); if (ROMA[k]) { out += ROMA[k]; i += len; hit = true; break; } }
      if (!hit) { out += c; i++; }
    } else { out += c; i++; }
  }
  return out;
}
const hira = s => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));

/* ---------------- battle lexicon ---------------- */
// kind: actor | tool | verb | adv. Verbs carry their ない form for negation.
const LEX = {
  わたし: { kind: 'actor', id: 'me', en: 'I' },
  リン: { kind: 'actor', id: 'rin', en: 'Rin' },
  ゴーレム: { kind: 'actor', id: 'golem', en: 'the golem', alias: ['ごれむ'] },
  剣: { kind: 'tool', r: 'けん', en: 'a sword', pow: 3 },
  火: { kind: 'tool', r: 'ひ', en: 'fire', pow: 2, burn: true },
  石: { kind: 'tool', r: 'いし', en: 'a stone', pow: 2, throwable: true },
  木: { kind: 'tool', r: 'き', en: 'wood', pow: 1, throwable: true, sigil: '木' },
  切る: { kind: 'verb', r: 'きる', neg: '切らない', negr: 'きらない', en: 'cut', act: 'attack', base: 4 },
  たたく: { kind: 'verb', neg: 'たたかない', en: 'strike', act: 'attack', base: 3 },
  守る: { kind: 'verb', r: 'まもる', neg: '守らない', negr: 'まもらない', en: 'protect', act: 'guard', base: 6 },
  休む: { kind: 'verb', r: 'やすむ', neg: '休まない', negr: 'やすまない', en: 'rest', act: 'heal', base: 5, sigil: '休' },
  投げる: { kind: 'verb', r: 'なげる', neg: '投げない', negr: 'なげない', en: 'throw', act: 'throw', base: 3 },
  燃やす: { kind: 'verb', r: 'もやす', neg: '燃やさない', negr: 'もやさない', en: 'burn', act: 'burn', base: 3 },
  強く: { kind: 'adv', r: 'つよく', en: 'strongly', mult: 1.5 },
  速く: { kind: 'adv', r: 'はやく', en: 'quickly', refund: 1 },
};
const PARTS = { は: 'marks who acts (topic)', を: 'marks the object', に: 'marks the target / direction', で: 'marks the tool / means' };
const ACTORS = ['わたし', 'リン', 'ゴーレム'];
const DECK = ['剣', '火', '石', '木', '切る', 'たたく', '守る', '休む', '投げる', '燃やす', '強く', '速く'];
const hasSigil = w => LEX[w]?.sigil && P.sigils.includes(LEX[w].sigil);

// Enemy intents: always shown in Japanese; each word can be tapped for a gloss.
const INTENTS = [
  { verb: 'たたく', target: 'rin', dmg: 6, words: [['ゴーレム', 'the golem'], ['は', PARTS.は], ['リン', 'Rin'], ['を', PARTS.を], ['たたく', 'strike, hit']] },
  { verb: '投げる', target: 'me', dmg: 5, words: [['ゴーレム', 'the golem'], ['は', PARTS.は], ['あなた', 'you'], ['に', PARTS.に], ['石', 'stone', 'いし'], ['を', PARTS.を], ['投げる', 'throw', 'なげる']] },
  { verb: '休む', heal: 8, words: [['ゴーレム', 'the golem'], ['は', PARTS.は], ['休む', 'rest (and recover)', 'やすむ']] },
  { verb: 'たたく', target: 'rin', dmg: 11, words: [['ゴーレム', 'the golem'], ['は', PARTS.は], ['リン', 'Rin'], ['を', PARTS.を], ['強く', 'strongly, hard', 'つよく'], ['たたく', 'strike, hit']] },
  { verb: 'たたく', target: 'me', dmg: 6, words: [['ゴーレム', 'the golem'], ['は', PARTS.は], ['あなた', 'you'], ['を', PARTS.を], ['たたく', 'strike, hit']] },
];
const intentText = it => it.words.map(w => w[0]).join('') + '。';
const NAME = { me: 'you', rin: 'Rin', golem: 'the golem' };

/* ---------------- sentence parser (grammar = spell syntax) ---------------- */
function parse(tokens) {
  if (!tokens.length) return null;
  const n = tokens.length;
  const first = tokens[0];
  if (first.kind !== 'actor') return { err: 'Start with who acts: わたし, リン or ゴーレム.' };
  if (tokens[1]?.w !== 'は') return { err: n === 1 ? `Now mark the actor with は: 「${first.w}は…」` : `Mark who acts with は: 「${first.w}は…」` };
  const roles = {};
  let i = 2;
  for (; i < n - 1; i++) {
    const t = tokens[i];
    if (t.kind === 'adv') { if (roles.adv) return { err: 'Only one adverb per spell.' }; roles.adv = t; continue; }
    if (t.kind === 'actor' || t.kind === 'tool') {
      const p = tokens[i + 1];
      if (!p || p.kind !== 'part') return { err: `「${t.w}」 needs a particle after it: を, に or で.` };
      if (p.w === 'は') return { err: 'は marks who acts, and this sentence already has one.' };
      const role = { を: 'obj', に: 'target', で: 'tool' }[p.w];
      if (roles[role]) return { err: `Two 「${p.w}」 in one sentence.` };
      roles[role] = t; i++; continue;
    }
    if (t.kind === 'verb') return { err: 'The verb goes at the very end.' };
    if (t.kind === 'part') return { err: `「${t.w}」 has to come right after a word.` };
  }
  const last = tokens[n - 1];
  if (last.kind !== 'verb') return { err: last.kind === 'part' ? 'Finish with a verb.' : `「${last.w}」 needs a particle, then finish with a verb.`, partial: true };
  const V = LEX[last.w]; const neg = !!last.neg;
  const subj = LEX[first.w].id;
  const obj = roles.obj && LEX[roles.obj.w];
  if (roles.tool && LEX[roles.tool.w].kind !== 'tool') return { err: 'で marks a tool here: 剣, 火, 石 or 木.' };
  if (!neg) {
    if (V.act === 'heal' && roles.obj) return { err: '休む doesn\'t take を. Just 「〇〇は休む」.' };
    if (['attack', 'guard', 'burn'].includes(V.act)) {
      if (!obj) return { err: `${last.w} needs an object: 「〇〇を${last.w}」.` };
      if (obj.kind !== 'actor') return { err: `You can only ${V.en} someone: わたし, リン or ゴーレム.` };
    }
    if (V.act === 'throw') {
      if (!obj || !obj.throwable) return { err: '投げる: say what you throw (石を or 木を).' };
      if (!roles.target || LEX[roles.target.w].kind !== 'actor') return { err: '投げる: say who at, with に (ゴーレムに).' };
    }
    if (roles.target && V.act !== 'throw') return { err: `に isn't used with ${last.w} here.` };
    if (V.act === 'burn' && roles.tool?.w !== '火') return { err: '燃やす needs fire: add 火で.' };
  }
  return { subj, V, verb: last.w, neg, roles, tokens };
}

function english(p) {
  const s = NAME[p.subj] === 'you' ? 'I' : NAME[p.subj][0].toUpperCase() + NAME[p.subj].slice(1);
  const third = p.subj !== 'me';
  const v = p.neg ? `${third ? 'doesn\'t' : 'don\'t'} ${p.V.en}` : third ? p.V.en.replace(/(ch|sh|s)$/, '$1e') + 's' : p.V.en;
  const o = p.roles.obj ? ' ' + (LEX[p.roles.obj.w].id ? (NAME[LEX[p.roles.obj.w].id] === 'you' ? 'me' : NAME[LEX[p.roles.obj.w].id]) : LEX[p.roles.obj.w].en) : '';
  const t = p.roles.target ? ' at ' + (NAME[LEX[p.roles.target.w].id] === 'you' ? 'me' : NAME[LEX[p.roles.target.w].id]) : '';
  const tool = p.roles.tool ? ' with ' + LEX[p.roles.tool.w].en : '';
  const adv = p.roles.adv ? ' ' + LEX[p.roles.adv.w].en : '';
  return `${s} ${v}${o}${t}${tool}${adv}.`;
}

/* ---------------- battle ---------------- */
function battle() {
  music('battle');
  const B = {
    hp: { me: 20, rin: 20, golem: 42 }, max: { me: 20, rin: 20, golem: 42 }, shield: { me: 0, rin: 0, golem: 0 },
    burn: 0, ink: 5, hand: [], spell: [], intent: null, prevIntent: -1, cancelled: false, busy: false,
    stats: { casts: 0, fizzles: 0, peeks: 0, cancels: 0, words: new Set(), restored: 0 },
  };
  const art = P.art;
  const src = art === 'pixel'
    ? { bg: 'img/px-bg-shrine.png', erased: 'img/px-bg-shrine-erased.png', rin: 'img/px-rin.png', golem: 'img/px-golem.png' }
    : { bg: 'img/bg-shrine.webp', erased: 'img/bg-shrine-erased.webp', rin: 'img/rin-battle.webp', golem: 'img/golem.webp' };

  const bgImg = h('img', { class: 'bg', src: src.bg, alt: '' });
  const veil = h('canvas', { class: 'bg' });
  const golem = h('div', { class: 'unit golem' }, h('img', { src: src.golem, alt: 'Stone golem' }));
  const rin = h('div', { class: 'unit rin' }, h('img', { src: src.rin, alt: 'Rin' }));
  const intentBox = h('div', { class: 'intent' });
  const hpEl = id => h('div', { class: 'hp' + (id === 'golem' ? '' : ' ally'), 'data-id': id });
  const golemHp = hpEl('golem'), meHp = hpEl('me'), rinHp = hpEl('rin');
  const stage = h('div', { class: 'stage' + (art === 'pixel' ? ' pixel' : '') }, bgImg, veil, golem, rin,
    h('div', { class: 'hud-top' }, h('button', { class: 'icon-btn', onclick: menu, 'aria-label': 'Back' }, '←'), golemHp,
      h('button', { class: 'icon-btn', onclick: () => { P.music = !P.music; persist(); music(P.music ? 'battle' : null); }, 'aria-label': 'Music' }, '♪')),
    intentBox, h('div', { class: 'ally-hp' }, meHp, rinHp));
  const spellEl = h('div', { class: 'spell' });
  const preview = h('div', { class: 'preview' });
  const actorRow = h('div', { class: 'row' });
  const handRow = h('div', { class: 'row' });
  const inkEl = h('div', { class: 'ink' });
  const castBtn = h('button', { class: 'act cast', onclick: cast }, 'Cast');
  const endBtn = h('button', { class: 'act', onclick: endTurn }, 'End turn');
  const typer = h('input', { type: 'text', placeholder: 'Type a spell: rin wa ken de go-remu wo kiru ⏎', autocomplete: 'off', spellcheck: 'false' });
  const panel = h('div', { class: 'panel' }, spellEl, preview, h('div', { class: 'rows' }, actorRow, handRow),
    h('div', { class: 'typer' }, typer), h('div', { class: 'actions' }, inkEl, endBtn, castBtn));
  $app.replaceChildren(h('div', { class: 'battle' }, stage, panel));

  // Unpainted veil: the erased sketch sits over the painting; valid spells ink the world back in.
  const erased = new Image(); erased.src = src.erased;
  function sizeVeil() {
    const r = stage.getBoundingClientRect(); veil.width = r.width * devicePixelRatio; veil.height = r.height * devicePixelRatio;
    const ctx = veil.getContext('2d'); ctx.imageSmoothingEnabled = art !== 'pixel';
    const s = Math.max(veil.width / erased.width, veil.height / erased.height);
    ctx.drawImage(erased, (veil.width - erased.width * s) / 2, (veil.height - erased.height * s) / 2, erased.width * s, erased.height * s);
  }
  erased.onload = sizeVeil;
  function restore(amount = 1) {
    const ctx = veil.getContext('2d'); ctx.globalCompositeOperation = 'destination-out';
    const W = veil.width, H = veil.height;
    for (let k = 0; k < amount; k++) {
      const x = W * (.15 + Math.random() * .7), y = H * (.2 + Math.random() * .7), R = W * (.22 + Math.random() * .12);
      let r = 0; const grow = () => {
        r += R / 12;
        const g = ctx.createRadialGradient(x, y, r * .55, x, y, r);
        g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        if (r < R) requestAnimationFrame(grow);
      };
      grow();
    }
    B.stats.restored++;
  }
  function restoreAll() { let a = 1; const id = setInterval(() => { veil.style.opacity = a -= .04; if (a <= 0) clearInterval(id); }, 40); }

  /* ----- rendering ----- */
  function drawHp() {
    for (const [el, id, label] of [[golemHp, 'golem', 'Stone Golem 石の番人'], [meHp, 'me', 'You'], [rinHp, 'rin', 'Rin']]) {
      el.replaceChildren(h('div', { class: 'lbl' }, h('span', {}, label, B.shield[id] ? h('span', { class: 'shield' }, `◈${B.shield[id]}`) : null, id === 'golem' && B.burn ? h('span', { class: 'shield', style: 'color:#ff9c5a' }, ` 火${B.burn}`) : null),
        h('b', {}, `${Math.max(0, B.hp[id])}`)), h('div', { class: 'bar' }, h('i', { style: `width:${100 * Math.max(0, B.hp[id]) / B.max[id]}%` })));
    }
    rin.classList.toggle('down', B.hp.rin <= 0);
  }
  function drawIntent() {
    const it = B.intent;
    const line = h('div', { class: 'jp' });
    it.words.forEach(([w, g, r]) => {
      const known = LEX[w]?.sigil && P.sigils.includes(LEX[w].sigil);
      const el = h('span', { class: 'w' }, ruby(w, known ? null : r));
      el.onclick = e => { e.stopPropagation(); if (!el.classList.contains('peeked')) { el.classList.add('peeked'); B.stats.peeks++; } gloss(el, w, g, r); };
      line.append(el);
    });
    line.append('。');
    intentBox.replaceChildren(
      h('div', { class: 'who' }, 'Enemy intent', h('span', { class: 'spacer' }), B.cancelled ? h('span', { style: 'color:var(--spirit)' }, 'CANCELLED') : null,
        h('button', { class: 'say', onclick: () => voice(intentText(it), 'g') }, '▶')),
      line);
    intentBox.style.opacity = B.cancelled ? .45 : 1;
  }
  function gloss(el, w, g, r) {
    document.querySelectorAll('.gloss').forEach(x => x.remove());
    const box = h('div', { class: 'gloss' }, h('b', {}, w), r ? ` ${r}` : '', ` · ${g}`);
    stage.append(box);
    const a = el.getBoundingClientRect(), s = stage.getBoundingClientRect();
    box.style.left = Math.max(6, Math.min(s.width - box.offsetWidth - 6, a.left - s.left)) + 'px';
    box.style.top = (a.bottom - s.top + 4) + 'px';
    setTimeout(() => box.remove(), 2200);
  }
  function tileEl(w, opts = {}) {
    const L = LEX[w];
    const kind = L ? L.kind : 'part';
    const sig = hasSigil(w);
    const label = opts.neg ? ruby(L.neg, sig ? null : L.negr) : kind === 'part' ? w : ruby(w, sig ? null : L.r);
    return h('button', { class: `tile ${kind}${sig ? ' sigil' : ''}${opts.used ? ' used' : ''}${opts.neg ? ' neg' : ''}`, onclick: opts.onclick, title: L ? L.en : PARTS[w] },
      opts.key ? h('span', { class: 'key' }, opts.key) : null, label);
  }
  function tokens() { return B.spell.map(s => ({ ...s, kind: LEX[s.w]?.kind || 'part' })); }
  function cost(p) { return B.spell.filter(s => s.fromHand).length + (p && p.neg ? 1 : 0) - (p && p.roles?.adv && LEX[p.roles.adv.w].refund ? 1 : 0); }
  function drawPanel() {
    spellEl.replaceChildren(...B.spell.map((s, idx) => tileEl(s.w, { neg: s.neg, onclick: () => {
      sfx('tap', .4);
      if (LEX[s.w]?.kind === 'verb' && !s.neg) { s.neg = true; } else { if (s.fromHand) B.hand[s.handIdx].used = false; B.spell.splice(idx, 1); }
      drawPanel();
    } })));
    actorRow.replaceChildren(...ACTORS.map(w => tileEl(w, { onclick: () => add(w) })), ...Object.keys(PARTS).map(w => tileEl(w, { onclick: () => add(w) })));
    handRow.replaceChildren(...B.hand.map((c, k) => tileEl(c.w, { used: c.used, key: DESKTOP ? String(k + 1) : null, onclick: () => add(c.w, k) })));
    const p = parse(tokens());
    const c = cost(p);
    inkEl.replaceChildren('Ink', ...Array.from({ length: 5 }, (_, k) => h('i', { class: k < B.ink ? '' : 'spent' })));
    castBtn.textContent = B.spell.length ? `Cast · ${Math.max(0, c)}` : 'Cast';
    castBtn.disabled = !p || p.err || c > B.ink || B.busy;
    endBtn.disabled = B.busy;
    preview.replaceChildren();
    if (!p) preview.append(h('span', { class: 'tr' }, DESKTOP ? 'Tap tiles, press 1–5, or type below. Tap a verb twice for its ない form.' : 'Tap a verb in your spell again for its ない form.'));
    else if (p.err) preview.append(h('span', { class: p.partial ? 'tr' : 'err' }, p.err));
    else {
      const fx = effects(p, true);
      fx.forEach(f => preview.append(h('span', { class: 'fx' }, f.label)));
      preview.append(h('span', { class: 'spacer' }), h('button', { class: 'tr', onclick: e => { e.target.textContent = english(p); } }, 'meaning?'));
      if (c > B.ink) preview.append(h('span', { class: 'err' }, ' not enough ink'));
    }
  }
  function add(w, handIdx) {
    if (B.busy) return;
    sfx('place', .35);
    if (handIdx != null) { if (B.hand[handIdx].used) return; B.hand[handIdx].used = true; B.spell.push({ w, fromHand: true, handIdx }); }
    else B.spell.push({ w });
    drawPanel();
  }

  /* ----- effects ----- */
  function effects(p, dry) {
    const out = [];
    const mult = p.roles.adv && LEX[p.roles.adv.w].mult || 1;
    const tool = p.roles.tool && LEX[p.roles.tool.w];
    const toolPow = tool ? tool.pow + (hasSigil(p.roles.tool.w) ? 2 : 0) : 0;
    const objId = p.roles.obj && LEX[p.roles.obj.w].id;
    const verbBonus = hasSigil(p.verb) ? 3 : 0;
    if (p.neg) {
      const it = B.intent;
      const match = p.subj === 'golem' && it.verb === p.verb && (!objId || objId === it.target || (it.verb === '投げる'));
      out.push(match ? { label: 'Cancel intent', cancel: true } : { label: 'No effect', none: true, why: p.subj === 'golem' ? 'The golem wasn\'t going to do that.' : 'Saying someone won\'t act changes nothing.' });
      return out;
    }
    if (B.hp[p.subj] <= 0) return [{ label: `${NAME[p.subj]} is down`, none: true, why: 'Rin is down and cannot act.' }];
    switch (p.V.act) {
      case 'attack': {
        const dmg = Math.round((p.V.base + toolPow + (p.subj === 'rin' ? 1 : 0)) * mult);
        out.push({ label: `⚔ ${dmg} → ${NAME[objId]}`, dmg, to: objId });
        if (tool?.burn) out.push({ label: `火 burn ${objId === 'golem' ? '+2' : ''}`, burn: 2, to: objId });
        break;
      }
      case 'guard': out.push({ label: `◈ ${Math.round((p.V.base + toolPow) * mult)} → ${NAME[objId]}`, shield: Math.round((p.V.base + toolPow) * mult), to: objId }); break;
      case 'heal': out.push({ label: `✚ ${Math.round((p.V.base + verbBonus) * mult)} → ${NAME[p.subj]}`, heal: Math.round((p.V.base + verbBonus) * mult), to: p.subj }); break;
      case 'throw': { const t = LEX[p.roles.target.w].id; const dmg = Math.round((p.V.base + tool0(p) ) * mult); out.push({ label: `⚔ ${dmg} → ${NAME[t]}`, dmg, to: t }); break; }
      case 'burn': out.push({ label: `火 ${Math.round(p.V.base * mult)} + burn 3 → ${NAME[objId]}`, dmg: Math.round(p.V.base * mult), burn: 3, to: objId }); break;
    }
    return out;
  }
  const tool0 = p => { const o = LEX[p.roles.obj.w]; return o.pow + (hasSigil(p.roles.obj.w) ? 2 : 0); };

  function float(target, text, cls) {
    const el = target === 'golem' ? golem : target === 'rin' ? rin : null;
    const s = stage.getBoundingClientRect();
    const r = el ? el.getBoundingClientRect() : { left: s.left + s.width * .4, top: s.top + s.height * .75, width: 60 };
    const n = h('div', { class: 'num ' + cls }, text);
    n.style.left = (r.left - s.left + r.width / 2 - 20) + 'px'; n.style.top = (r.top - s.top + 30) + 'px';
    stage.append(n); setTimeout(() => n.remove(), 1000);
  }
  function banner(text, ms = 1400) { const b = h('div', { class: 'log' }, text); stage.append(b); setTimeout(() => b.remove(), ms); }
  function damage(to, amt) {
    const blocked = Math.min(B.shield[to], amt); B.shield[to] -= blocked; const real = amt - blocked;
    B.hp[to] -= real;
    float(to, blocked ? `${real} (◈${blocked})` : `${real}`, to === 'golem' ? 'dmg' : 'hurt');
    const el = to === 'golem' ? golem : to === 'rin' ? rin : null;
    if (el) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); }
    if (to === 'me') { stage.classList.remove('flash-red', 'shake'); void stage.offsetWidth; stage.classList.add('flash-red', 'shake'); }
  }

  async function cast() {
    const p = parse(tokens());
    if (!p || p.err || B.busy) return;
    const c = cost(p); if (c > B.ink) return;
    B.busy = true; B.ink -= Math.max(0, c);
    const fx = effects(p);
    B.stats.casts++;
    B.spell.forEach(s => LEX[s.w] && B.stats.words.add(s.w));
    const actorEl = p.subj === 'rin' ? rin : p.subj === 'golem' ? golem : null;
    sfx('cast', .5);
    if (fx[0].none) { banner(fx[0].why); B.stats.fizzles++; }
    else {
      restore();
      if (actorEl && !p.neg) { actorEl.classList.add(p.subj === 'rin' ? 'lunge-r' : 'lunge-l'); await sleep(220); actorEl.classList.remove('lunge-r', 'lunge-l'); }
      for (const f of fx) {
        if (f.cancel) { B.cancelled = true; B.stats.cancels++; float('golem', 'CANCELLED', 'info'); sfx('bell', .5); banner('Your words bind the golem. It won\'t act.'); }
        if (f.dmg) { if (f.to === 'golem') { const s = h('div', { class: 'slash' }); stage.append(s); setTimeout(() => s.remove(), 400); sfx(p.verb === '切る' ? 'slash' : 'stone', .7); } else sfx('hurt', .6); damage(f.to, f.dmg); }
        if (f.burn) { if (f.to === 'golem') B.burn += f.burn; float(f.to, '火', 'info'); }
        if (f.shield) { B.shield[f.to] += f.shield; float(f.to, `◈${f.shield}`, 'info'); sfx('shield', .6); }
        if (f.heal) { B.hp[f.to] = Math.min(B.max[f.to], B.hp[f.to] + f.heal); float(f.to, `+${f.heal}`, 'heal'); sfx('heal', .5); }
        if (f.to && f.to !== 'golem' && f.dmg) banner(`Careful: you told ${NAME[p.subj] === 'you' ? 'yourself' : NAME[p.subj]} to ${p.V.en} ${NAME[f.to] === 'you' ? 'you' : NAME[f.to]}.`);
        if (f.to === 'golem' && (f.heal || f.shield)) banner('Kotodama: you said it, so it happened. The golem is stronger.');
      }
    }
    B.hand.forEach(c => { if (c.used) c.gone = true; });
    B.hand = B.hand.filter(c => !c.gone);
    B.spell = []; drawIntent(); drawHp();
    await sleep(350); B.busy = false; drawPanel();
    check();
  }

  async function endTurn() {
    if (B.busy) return;
    B.busy = true; B.spell.forEach(s => { if (s.fromHand) B.hand[s.handIdx].used = false; }); B.spell = []; drawPanel();
    if (B.burn > 0) { damage('golem', B.burn); B.burn = Math.max(0, B.burn - 1); drawHp(); await sleep(500); if (check()) return; }
    const it = B.intent;
    if (B.cancelled) { banner('The golem stands still, bound by your words.'); await sleep(900); }
    else {
      golem.classList.add('lunge-l'); await sleep(250); golem.classList.remove('lunge-l');
      if (it.heal) { B.hp.golem = Math.min(B.max.golem, B.hp.golem + it.heal); float('golem', `+${it.heal}`, 'heal'); sfx('heal', .5); }
      else {
        let to = it.target; if (to === 'rin' && B.hp.rin <= 0) to = 'me';
        sfx(it.verb === '投げる' ? 'stone' : 'hurt', .7); damage(to, it.dmg);
        if (to === 'rin' && B.hp.rin <= 0) voice('いたい…');
      }
      await sleep(700);
    }
    B.shield = { me: 0, rin: 0, golem: 0 };
    drawHp();
    if (check()) return;
    newTurn();
  }

  function newTurn() {
    let k; do { k = Math.floor(Math.random() * INTENTS.length); } while (k === B.prevIntent);
    if (B.intent === null) k = 0;
    B.prevIntent = k; B.intent = INTENTS[k]; B.cancelled = false;
    // Deal 5: at least one attack verb and one other verb, rest random.
    const verbs = DECK.filter(w => LEX[w].kind === 'verb');
    const hand = [pick(['切る', 'たたく']), pick(verbs.filter(v => !['切る', 'たたく'].includes(v)))];
    const rest = shuffle(DECK.filter(w => !hand.includes(w)));
    while (hand.length < 5) hand.push(rest.pop());
    B.hand = shuffle(hand).map(w => ({ w }));
    B.ink = 5; B.busy = false;
    drawIntent(); drawHp(); drawPanel();
    setTimeout(() => voice(intentText(B.intent), 'g'), 300);
  }

  function check() {
    if (B.hp.golem <= 0) { win(); return true; }
    if (B.hp.me <= 0) { lose(); return true; }
    return false;
  }
  async function win() {
    B.busy = true; drawPanel(); restoreAll(); music(null); sfx('win', .7);
    golem.style.transition = 'opacity 1.4s, filter 1.4s'; golem.style.opacity = 0; golem.style.filter = 'brightness(3) blur(6px)';
    await sleep(1500); voice('言葉が、戻ってきた。');
    const s = B.stats;
    stage.parentElement.append(h('div', { class: 'end' },
      h('h1', {}, '言霊'), h('div', { class: 'quote' }, '「言葉が、戻ってきた。」'), h('div', { style: 'color:var(--dim);margin-bottom:16px' }, '"The words… they\'ve come back." The shrine is painted in again.'),
      h('div', { class: 'stat' }, h('span', {}, 'Spells cast'), h('b', {}, s.casts)),
      h('div', { class: 'stat' }, h('span', {}, 'Intents read without peeking'), h('b', {}, s.peeks ? `${s.peeks} words peeked` : 'all of them')),
      h('div', { class: 'stat' }, h('span', {}, 'Attacks cancelled with ない'), h('b', {}, s.cancels)),
      h('div', { class: 'stat' }, h('span', {}, 'Different words used'), h('b', {}, s.words.size)),
      h('button', { class: 'act cast', onclick: battle }, 'Fight again'), h('button', { class: 'act', onclick: menu }, 'Back')));
  }
  function lose() {
    B.busy = true; music(null);
    stage.parentElement.append(h('div', { class: 'end' }, h('h1', {}, '沈黙'), h('div', { class: 'quote' }, 'Silence takes you.'),
      h('p', { style: 'color:var(--dim)' }, 'Read the intent first, then answer it: protect whoever is targeted with 守る, or bind the golem with 「ゴーレムは〜ない」.'),
      h('button', { class: 'act cast', onclick: battle }, 'Try again'), h('button', { class: 'act', onclick: menu }, 'Back')));
  }

  // Desktop: type the spell in romaji or kana, or use number keys for hand tiles.
  typer.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const txt = typer.value.trim();
    if (!txt) { endTurn(); return; }
    const toks = tokenize(txt);
    if (toks.err) { preview.replaceChildren(h('span', { class: 'err' }, toks.err)); sfx('fizzle', .4); return; }
    B.hand.forEach(c => { c.used = false; });
    B.spell = toks.map(t => {
      if (LEX[t.w] && LEX[t.w].kind !== 'actor') { const idx = B.hand.findIndex(c => c.w === t.w && !c.used); if (idx >= 0) { B.hand[idx].used = true; return { ...t, fromHand: true, handIdx: idx }; } t.missing = true; }
      return t;
    });
    const missing = B.spell.find(t => t.missing);
    drawPanel();
    if (missing) { preview.replaceChildren(h('span', { class: 'err' }, `「${missing.w}」 isn't in your hand this turn.`)); return; }
    typer.value = '';
    const p = parse(tokens());
    if (p && !p.err) cast(); else sfx('fizzle', .4);
  });
  document.onkeydown = e => {
    if (document.activeElement === typer) return;
    const n = +e.key; if (n >= 1 && n <= B.hand.length) add(B.hand[n - 1].w, n - 1);
    if (e.key === 'Enter') cast();
  };

  newTurn();
  setTimeout(() => { voice('ゴーレムです。気をつけて。'); banner('Rin: 「ゴーレムです。気をつけて。」', 2200); }, 900);
  addEventListener('resize', sizeVeil, { once: true });
}

// Greedy longest-match tokenizer over the lexicon (kanji, kana readings, ない forms, particles).
function tokenize(txt) {
  const s = hira(toKana(txt)).replace(/[\s。、.,!?！？]/g, '');
  const cands = [];
  for (const [w, L] of Object.entries(LEX)) {
    for (const f of [w, hira(w), L.r, ...(L.alias || [])].filter(Boolean)) cands.push({ f, w });
    if (L.neg) for (const f of [L.neg, L.negr].filter(Boolean)) cands.push({ f, w, neg: true });
  }
  for (const p of Object.keys(PARTS)) cands.push({ f: p, w: p });
  cands.push({ f: 'わ', w: 'は' }, { f: 'お', w: 'を' });
  cands.sort((a, b) => b.f.length - a.f.length);
  const out = [];
  for (let i = 0; i < s.length;) {
    const m = cands.find(c => s.startsWith(c.f, i));
    if (!m) return { err: `Couldn't read 「${s.slice(i, i + 4)}…」. Use the words on your tiles.` };
    out.push({ w: m.w, neg: !!m.neg }); i += m.f.length;
  }
  return out;
}

/* ---------------- Scriptorium ---------------- */
const KANJI = [
  {
    k: '人', file: '04eba', key: 'person', img: 'person',
    on: [['じん', 'jin'], ['にん', 'nin']], kun: [['ひと', 'hito']],
    mean: 'Two legs striding down a road, seen from behind: a <em>person</em> walking away.',
    read: 'In a crowd, the one <em>person</em> you notice is <em>Jin</em>. So 人 reads <em>じん</em>, as in 日本人 (にほんじん), "a Japanese person". On its own, a person is <em>ひと</em>.',
    ex: [['あの人は日本人です。', 'That person is Japanese.'], ['にほんじん', 'a Japanese person']],
    accept: { mean: ['person', 'people', 'human'], read: ['じん', 'にん', 'ひと'] },
  },
  {
    k: '木', file: '06728', key: 'tree', img: 'tree',
    on: [['もく', 'moku'], ['ぼく', 'boku']], kun: [['き', 'ki']],
    mean: 'A trunk, branches reaching left and right, roots spreading below: a <em>tree</em>.',
    read: '<em>Moku</em> the woodcarver turns every <em>tree</em> into something. 木 reads <em>もく</em> in compound words, and on its own the tree itself is <em>き</em>.',
    ex: [['大きい木ですね。', 'What a big tree.']],
    accept: { mean: ['tree', 'wood', 'trees'], read: ['もく', 'ぼく', 'き'] },
  },
  {
    k: '休', file: '04f11', key: 'rest', img: 'rest',
    on: [['きゅう', 'kyuu']], kun: [['やすむ', 'yasumu']],
    mean: 'A <em>person</em> (亻, the squeezed form of 人) leaning against a <em>tree</em> (木). They\'re taking a <em>rest</em>.',
    read: '<em>Kyū</em> the archer rests against a tree, until an arrow thunks into the bark above her. 休 reads <em>きゅう</em>, and "to rest" is <em>休む</em> (やすむ).',
    ex: [['少し休みましょう。', 'Let\'s rest a little.'], ['木の下で休む。', 'Rest under a tree.']],
    accept: { mean: ['rest', 'break', 'holiday', 'day off'], read: ['きゅう', 'やすむ', 'やす'] },
  },
];

function study() {
  music('study');
  sfx('open', .5);
  const pages = [];
  for (const K of KANJI) {
    if (K.k === '休') pages.push(() => combinePage());
    pages.push(() => meetPage(K), () => soundPage(K), () => writePage(K));
  }
  pages.push(() => quizPage());
  let idx = 0;
  const dots = h('div', { class: 'dots' });
  const body = h('div', { class: 'page' });
  const foot = h('div', { class: 'study-foot' });
  $app.replaceChildren(h('div', { class: 'study' },
    h('div', { class: 'study-top' }, h('button', { class: 'icon-btn', onclick: menu }, '←'), dots, h('span', {}, '写字院')), body, foot));
  function show() {
    dots.replaceChildren(...pages.map((_, k) => h('i', { class: k <= idx ? 'on' : '' })));
    body.style.animation = 'none'; void body.offsetWidth; body.style.animation = '';
    body.scrollTop = 0;
    pages[idx]();
  }
  const next = () => { sfx('page', .5); idx++; show(); };
  const footNext = (label = 'Next', enabled = true) => { const b = h('button', { class: 'act cast', onclick: next, disabled: !enabled }, label); foot.replaceChildren(b); return b; };
  onkeydown = e => { if (e.key === 'Enter' && foot.querySelector('.cast:not([disabled])') && document.activeElement?.tagName !== 'INPUT') foot.querySelector('.cast').click(); };

  function meetPage(K) {
    body.replaceChildren(h('div', { class: 'big-kanji' }, K.k), h('div', { class: 'keyword' }, K.key),
      h('img', { class: 'scroll-img', src: `img/k-${K.img}-meaning.webp`, alt: '' }),
      h('div', { class: 'mnemonic', html: K.mean }));
    footNext();
  }
  function soundPage(K) {
    const rd = (label, list) => list.map(([k, r]) => h('div', { class: 'reading' }, h('div', {}, h('small', {}, label), h('br'), h('b', {}, k)), h('button', { class: 'say', onclick: () => voice(k) }, '▶')));
    body.replaceChildren(h('div', { class: 'big-kanji', style: 'font-size:72px' }, K.k),
      h('img', { class: 'scroll-img', src: `img/k-${K.img}-reading.webp`, alt: '' }),
      h('div', { class: 'mnemonic', html: K.read }),
      h('div', { class: 'readings' }, ...rd('ON\'YOMI', K.on), ...rd('KUN\'YOMI', K.kun)),
      ...K.ex.map(([jp, en]) => h('div', { class: 'example' }, h('button', { class: 'say', onclick: () => voice(jp) }, '▶'), h('div', {}, h('div', { class: 'jp' }, jp), h('div', { class: 'en' }, en)))));
    setTimeout(() => voice(K.on[0][0]), 300);
    footNext();
  }
  async function writePage(K) {
    const msg = h('div', { class: 'trace-msg' }, 'Watch the stroke order…');
    const wrap = h('div', { class: 'trace-wrap' });
    body.replaceChildren(h('div', { class: 'keyword', style: 'margin-top:10px' }, `Write ${K.k}`), wrap, msg);
    const btn = footNext('Next', false);
    const svgTxt = await (await fetch(`kanji/${K.file}.svg`)).text();
    const doc = new DOMParser().parseFromString(svgTxt, 'image/svg+xml');
    const ds = [...doc.querySelectorAll('path')].map(p => p.getAttribute('d'));
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 109 109');
    const mk = (d, stroke, w, extra = {}) => { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', stroke); p.setAttribute('stroke-width', w); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round'); for (const [k, v] of Object.entries(extra)) p.setAttribute(k, v); svg.append(p); return p; };
    const guides = ds.map(d => mk(d, '#d9ccb4', 4));
    const inked = ds.map(d => mk(d, '#1f1b16', 5, { opacity: 0 }));
    const dot = document.createElementNS(NS, 'circle'); dot.setAttribute('r', 3.2); dot.setAttribute('fill', '#c8503f'); svg.append(dot);
    const canvas = h('canvas');
    wrap.append(svg, canvas);
    // Demo: animate each stroke in order.
    for (const p of inked) {
      const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; p.setAttribute('opacity', 1);
      p.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: 420, fill: 'forwards', easing: 'ease-in-out' });
      await sleep(480);
    }
    await sleep(400);
    inked.forEach(p => { p.getAnimations().forEach(a => a.cancel()); p.setAttribute('opacity', 0); p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; });
    // Trace mode
    let cur = 0, fails = 0;
    const sample = (p, n = 24) => { const L = p.getTotalLength(); return Array.from({ length: n }, (_, i) => { const q = p.getPointAtLength(L * i / (n - 1)); return [q.x, q.y]; }); };
    const targets = guides.map(p => sample(p));
    const placeDot = () => { if (cur < targets.length) { dot.setAttribute('cx', targets[cur][0][0]); dot.setAttribute('cy', targets[cur][0][1]); guides.forEach((g, k) => g.setAttribute('stroke', k === cur ? '#b9a98a' : '#e6dcc8')); } else dot.remove(); };
    placeDot();
    msg.textContent = `Trace stroke 1 of ${ds.length}. Start at the red dot.`;
    const ctx = canvas.getContext('2d');
    const fit = () => { const r = wrap.getBoundingClientRect(); canvas.width = r.width * devicePixelRatio; canvas.height = r.height * devicePixelRatio; };
    fit();
    let pts = null;
    const toV = e => { const r = wrap.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 109, (e.clientY - r.top) / r.height * 109]; };
    canvas.onpointerdown = e => { if (cur >= ds.length) return; canvas.setPointerCapture(e.pointerId); pts = [toV(e)]; };
    canvas.onpointermove = e => {
      if (!pts) return; pts.push(toV(e));
      const s = canvas.width / 109; ctx.lineWidth = 5 * s; ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(31,27,22,.75)';
      ctx.beginPath(); const a = pts[pts.length - 2], b = pts[pts.length - 1]; ctx.moveTo(a[0] * s, a[1] * s); ctx.lineTo(b[0] * s, b[1] * s); ctx.stroke();
    };
    canvas.onpointerup = () => {
      if (!pts) return;
      const drawn = resample(pts, 24); pts = null; ctx.clearRect(0, 0, canvas.width, canvas.height);
      const T = targets[cur];
      const d = drawn.reduce((acc, p, i) => acc + Math.hypot(p[0] - T[i][0], p[1] - T[i][1]), 0) / drawn.length;
      const rev = drawn.reduce((acc, p, i) => acc + Math.hypot(p[0] - T[T.length - 1 - i][0], p[1] - T[T.length - 1 - i][1]), 0) / drawn.length;
      if (d < 15 || fails >= 2) {
        inked[cur].setAttribute('opacity', 1); sfx('stroke', .5); cur++; fails = 0; placeDot();
        if (cur >= ds.length) { msg.textContent = 'Beautiful.'; sfx('bell', .4); voice(K.on[0][0]); btn.disabled = false; }
        else msg.textContent = `Stroke ${cur + 1} of ${ds.length}.`;
      } else {
        fails++; sfx('miss', .4);
        msg.textContent = rev < d ? 'Right shape, but the other direction. Start at the red dot.' : 'Not quite. Follow the highlighted stroke from the red dot.';
        const g = guides[cur]; const L = g.getTotalLength();
        const demo = mk(g.getAttribute('d'), '#c8503f', 3); demo.style.strokeDasharray = L;
        demo.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: 500, fill: 'forwards' }).onfinish = () => setTimeout(() => demo.remove(), 300);
      }
    };
  }
  function combinePage() {
    const c = h('div', { class: 'combine' }, h('span', { class: 'a' }, '人'), h('span', { class: 'plus' }, '+'), h('span', { class: 'b' }, '木'), h('span', { class: 'res' }, '休'));
    body.replaceChildren(h('div', { class: 'keyword', style: 'margin-top:24px' }, 'Put them together'), c,
      h('div', { class: 'mnemonic', html: 'A <em>person</em> next to a <em>tree</em>. What are they doing? Kanji are built from pieces you already know, and this is the next one.' }));
    setTimeout(() => { c.classList.add('go'); sfx('bell', .5); }, 700);
    footNext('Learn 休');
  }
  function quizPage() {
    const qs = shuffle(KANJI.flatMap(K => [{ K, type: 'mean' }, { K, type: 'read' }]));
    let qi = 0, right = 0;
    const ask = () => {
      if (qi >= qs.length) return done(right, qs.length);
      const { K, type } = qs[qi];
      const q = type === 'mean' ? 'What does it mean?' : 'How is it read?';
      const feedback = h('div');
      const verdict = ok => {
        if (ok) { right++; sfx('stroke', .6); voice(K.on[0][0]); qi++; setTimeout(ask, 700); }
        else {
          sfx('miss', .5);
          feedback.replaceChildren(h('div', { class: 'miss' }, h('img', { src: `img/k-${K.img}-${type === 'mean' ? 'meaning' : 'reading'}.webp`, alt: '' }),
            h('div', { class: 'mnemonic', html: type === 'mean' ? K.mean : K.read })));
          qs.push(qs[qi]); qi++;
          foot.replaceChildren(h('button', { class: 'act cast', onclick: () => { foot.replaceChildren(); ask(); } }, 'Got it'));
        }
      };
      let input;
      if (DESKTOP) {
        const inp = h('input', { type: 'text', autocomplete: 'off', spellcheck: 'false', placeholder: type === 'mean' ? 'meaning in English' : 'reading (romaji or kana)' });
        const hint = h('div', { class: 'hint' }, type === 'read' ? 'Type romaji: it turns into kana. Enter to answer.' : 'Enter to answer.');
        if (type === 'read') inp.addEventListener('input', () => { const pos = inp.value; if (/[a-z]$/i.test(pos) === false || /[aiueo]$/i.test(pos)) inp.value = toKana(pos); });
        inp.addEventListener('keydown', e => {
          if (e.key !== 'Enter' || !inp.value.trim()) return;
          const v = type === 'read' ? hira(toKana(inp.value.trim())) : inp.value.trim().toLowerCase();
          inp.disabled = true; verdict(K.accept[type].includes(v));
        });
        input = h('div', { class: 'quiz-type' }, inp, hint);
        setTimeout(() => inp.focus(), 50);
      } else {
        const correct = type === 'mean' ? K.key : K.on[0][0];
        const pool = type === 'mean' ? ['person', 'tree', 'rest', 'fire', 'mountain', 'sword', 'river'] : ['じん', 'もく', 'きゅう', 'かん', 'せん', 'ほん'];
        const opts = shuffle([correct, ...shuffle(pool.filter(x => x !== correct)).slice(0, 3)]);
        input = h('div', { class: 'opts' }, ...opts.map(o => h('button', { class: 'opt', onclick: e => {
          const ok = o === correct; e.target.classList.add(ok ? 'ok' : 'bad');
          [...e.target.parentElement.children].forEach(b => { b.disabled = true; if (b.textContent === correct) b.classList.add('ok'); });
          verdict(ok);
        } }, o)));
      }
      body.replaceChildren(h('div', { class: 'quiz-k' }, K.k), h('div', { class: 'quiz-q' }, q), input, feedback);
      foot.replaceChildren();
    };
    ask();
  }
  function done(right, total) {
    P.sigils = [...new Set([...P.sigils, '人', '木', '休'])]; persist();
    sfx('win', .6);
    body.replaceChildren(h('div', { class: 'keyword', style: 'margin-top:30px' }, 'Learned'),
      h('div', { class: 'combine', style: 'height:140px;font-size:70px' }, '人 木 休'),
      h('div', { class: 'mnemonic', html: `You recalled <em>${right} of ${total}</em> on the first try.<br><br>New <em>sigils</em>: in battle, 木 and 休む now show as kanji with no reading, and they hit harder (木 +2 when thrown, 休む +3 healing). Knowing kanji is literally power.` }));
    foot.replaceChildren(h('button', { class: 'act cast', onclick: battle }, 'Try them in battle'), h('button', { class: 'act', onclick: menu }, 'Menu'));
  }
  show();
}
function resample(pts, n) {
  const d = [0]; for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = d[d.length - 1] || 1; const out = [];
  for (let k = 0; k < n; k++) {
    const t = L * k / (n - 1); let i = d.findIndex(x => x >= t); if (i <= 0) { out.push(pts[Math.max(0, i)]); continue; }
    const f = (t - d[i - 1]) / ((d[i] - d[i - 1]) || 1); out.push([pts[i - 1][0] + f * (pts[i][0] - pts[i - 1][0]), pts[i - 1][1] + f * (pts[i][1] - pts[i - 1][1])]);
  }
  return out;
}

/* ---------------- menu ---------------- */
function menu() {
  document.onkeydown = null; onkeydown = null;
  music(null);
  const seg = (label, key, opts) => h('div', { class: 'seg' }, label, ...opts.map(([v, l]) => h('button', { class: P[key] === v ? 'on' : '', onclick: () => { P[key] = v; persist(); menu(); } }, l)));
  $app.replaceChildren(h('div', { class: 'menu' },
    h('div', { class: 'bg', style: 'background-image:url(img/rin-hf.webp)' }),
    h('div', { class: 'title' }, '言霊', h('small', {}, 'KOTODAMA · PROTOTYPE')),
    h('p', {}, 'Words you know become real. Two small slices to judge the direction: a spell battle and a kanji lesson.'),
    h('button', { class: 'menu-btn', onclick: study }, h('b', {}, '写'), h('span', {}, 'Scriptorium', h('small', {}, 'Learn 人 · 木 · 休 with mnemonics and stroke tracing (~5 min)'))),
    h('button', { class: 'menu-btn', onclick: battle }, h('b', {}, '戦'), h('span', {}, 'Battle: the Stone Golem', h('small', {}, 'Read its intent in Japanese. Answer with sentences.'))),
    seg('Battle art:', 'art', [['anime', 'Anime'], ['pixel', 'Pixel']]),
    P.sigils.length ? h('div', { class: 'seg' }, `Sigils: ${P.sigils.join(' ')}`) : null));
}
menu();
