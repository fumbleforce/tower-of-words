// Kotodama's interface around the room: the top bar, the talk strip, the sentence rail, the pad of
// particles with the verb as the fire button, and the cards between shifts and at the end.

import { THINGS, VERBS, PARTICLES, POWERS, LINES, STARS, GOAL } from './data.js';
import { jp } from '../common/jp.js';
import { portrait } from '../common/cast.js';
import { word } from '../common/sound.js';
import { english } from './grammar.js';
import { ms } from './fx.js';
import { cat } from './art.js';
import { sfx } from './audio.js';

export const $ = (sel, root = document) => root.querySelector(sel);

export function skeleton() {
  document.body.innerHTML = `
  <div class="kd">
    <header class="hud">
      <div class="h-time"><b class="h-clock">17:00</b><span class="h-shift"></span></div>
      <div class="h-score"><div class="h-main"><b class="score">0</b><span class="streak" hidden></span></div><span class="last"></span></div>
      <div class="h-right"><span class="hearts"></span><button class="chip en" aria-pressed="false" title="English (E)">EN</button><button class="chip snd" aria-pressed="true" title="Sound">♪</button></div>
      <div class="goal"></div>
    </header>
    <main class="room"></main>
    <div class="talk" aria-live="polite"></div>
    <section class="console">
      <div class="rail"><div class="tiles"></div><div class="hint"></div></div>
      <div class="pad"><div class="parts"></div><button class="fire" disabled></button></div>
    </section>
    <div class="banner" hidden></div>
  </div>
  <div class="overlay" hidden></div>
  <div class="hand" hidden>${HAND}</div>
  <div class="pop" hidden></div>`;
  wirePopover();
}

/** A pointing hand, its fingertip at (14, 2). Outline first, then the white fill on top. */
const HAND_SHAPES = '<rect x="10" y="2" width="8" height="26" rx="4"/><rect x="17" y="14" width="7" height="14" rx="3.5"/><rect x="23" y="16" width="7" height="13" rx="3.5"/><rect x="29" y="19" width="6" height="12" rx="3"/><rect x="3" y="24" width="12" height="7" rx="3.5" transform="rotate(35 9 27)"/><rect x="8" y="20" width="27" height="24" rx="9"/>';
const HAND = `<svg viewBox="0 0 40 48" aria-hidden="true"><g fill="#0b1218" stroke="#0b1218" stroke-width="5" stroke-linejoin="round">${HAND_SHAPES}</g><g fill="#fff">${HAND_SHAPES}</g></svg>`;

/** Puts the hand's fingertip on the middle of an element, or hides it (el null). */
export function pointAt(el) {
  const h = $('.hand');
  if (!el) return (h.hidden = true);
  const r = el.getBoundingClientRect();
  h.hidden = false;
  // Near the bottom of the screen the hand comes from above instead, turned round on its fingertip.
  const y = r.top + r.height * 0.55;
  const flip = y + 50 > innerHeight;
  h.style.transform = `translate(${Math.round(r.left + r.width / 2 - 14)}px, ${Math.round((flip ? r.top + Math.min(r.height * 0.3, 16) : y) - 2)}px)${flip ? ' rotate(180deg)' : ''}`;
}

/** The goal on the wall: what a shift asks of you, and how many commands are left in it. */
export function goal(run, shift) {
  const el = $('.goal');
  if (!el || !shift) return;
  const left = Math.max(0, shift.turns - run.turn);
  // On the phone it is a line under the top bar; on the desktop a sign on the wall.
  const phone = document.body.classList.contains('phone');
  const host = phone ? $('.hud') : $('.room .wall');
  if (host && el.parentNode !== host) host.append(el);
  el.innerHTML = `<span>${GOAL.replace('dots', '<span class="mini-pips"><i></i><i></i><i></i></span>')}</span><b>${phone ? '· ' : ''}${left} ${left === 1 ? 'command' : 'commands'} left</b>`;
}

/** Tap any dotted Japanese word for its reading and meaning (and Mio's clip, if there is one). */
function wirePopover() {
  const pop = $('.pop');
  const hide = () => (pop.hidden = true);
  document.addEventListener('click', e => {
    const w = e.target.closest('.w');
    if (!w || w.closest('button')) return hide();
    e.stopPropagation();
    pop.innerHTML = `<b>${w.dataset.r}</b><span>${w.dataset.g}</span>`;
    pop.hidden = false;
    const r = w.getBoundingClientRect();
    const pw = pop.offsetWidth;
    pop.style.left = `${Math.max(8, Math.min(innerWidth - pw - 8, r.left + r.width / 2 - pw / 2))}px`;
    pop.style.top = `${Math.max(8, r.top - pop.offsetHeight - 8)}px`;
    if (w.dataset.clip) word(w.dataset.clip);
  }, true);
}

/** The last command's points, kept by the score until the next one (the banner only flashes). */
export function lastPoints(res) {
  const el = $('.last');
  if (!res || !res.points) return (el.textContent = '');
  const bits = [`+${res.points}`];
  if (res.n > 1) bits.push(`${res.n}×${res.n}`);
  if (res.streakMult > 1) bits.push(`×${res.streakMult}`);
  if (res.politeMult > 1) bits.push('×2');
  el.textContent = bits.join(' · ');
}

export function hud(run, shift, opts) {
  $('.h-clock').textContent = shift?.story ? 'B2' : shift ? shift.time : '17:00';
  $('.h-shift').textContent = run.shift >= 0 ? `${shift?.story ? 'Round' : 'shift'} ${run.shift + 1} of 3` : '';
  $('.hearts').innerHTML = Array.from({ length: 3 }, (_, i) => `<i class="${i < run.hearts ? 'on' : ''}"></i>`).join('');
  const st = $('.streak');
  st.hidden = run.streak < 1;
  st.textContent = `streak ×${1 + Math.min(run.streak, 3)}`;
  $('.en').setAttribute('aria-pressed', String(opts.en));
}

/** Counts the score up with ticking notes. */
export function countScore(from, to) {
  const el = $('.score');
  const steps = Math.min(16, Math.max(1, Math.round((to - from) / 10)));
  for (let i = 1; i <= steps; i++)
    setTimeout(() => {
      el.textContent = String(Math.round(from + ((to - from) * i) / steps));
      sfx.count(i);
      if (i === steps) el.animate([{ transform: 'scale(1.35)', color: '#ffd36b' }, { transform: 'none' }], { duration: ms(300) });
    }, ms(i * 45));
}

/** One line in the talk strip: a person, Mio coaching, or the narrator (who: null). */
export const line = (who, markup, en, kind = '') => ({ who, markup, en, kind });

// Which lines go first when the strip is full: chatter, then notes, then requests. Steps and Mio's
// coaching always stay.
const DROP = ['', 'note', 'req'];

function lineHtml(l, en) {
  const face = l.kind === 'step' ? `<span class="t-face t-step">${l.badge || '▶'}</span>` : l.who && THINGS[l.who].kind === 'person' ? `<img class="t-face" alt="" src="${portrait(l.who, l.face)}">` : l.who === 'tama' ? `<span class="t-face t-cat">${cat()}</span>` : '<span class="t-face t-note">!</span>';
  const showEn = en || l.kind === 'coach' || l.kind === 'note' || l.kind === 'step';
  return `<div class="t-line ${l.kind}">${face}<div class="t-text">${l.markup ? `<div class="t-jp">${jp(l.markup)}</div>` : ''}<div class="t-en"${showEn ? '' : ' hidden'}>${l.en}</div></div></div>`;
}

/**
 * Shows lines in the strip under the room. Every line is shown whole: when they don't all fit the
 * strip's height, the least important go, and a single line that is still too tall grows the strip.
 */
export function talk(lines, en) {
  const box = $('.talk');
  let shown = lines.slice();
  const fit = () => (box.innerHTML = shown.map(l => lineHtml(l, en)).join(''));
  fit();
  const room = parseFloat(getComputedStyle(box).minHeight) || 0;
  while (box.scrollHeight > room + 1 && shown.length > 1) {
    let drop = -1;
    for (const k of DROP) {
      drop = shown.map(l => l.kind).lastIndexOf(k);
      if (drop >= 0) break;
    }
    if (drop < 0) break;
    shown.splice(drop, 1);
    fit();
  }
  box.querySelectorAll('.t-line').forEach((e, i) => e.animate([{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { duration: ms(260), delay: ms(i * 90), fill: 'backwards' }));
  box.onclick = e => {
    const t = e.target.closest('.t-line');
    if (t && !e.target.closest('.w')) t.querySelector('.t-en').hidden = false;
  };
}

/** A person's own line, from data.js LINES. */
export function says(kind, who, item) {
  const set = LINES[kind][who];
  const l = item ? set[item] : set;
  return l ? line(who, l[0], l[1], kind === 'ask' ? 'req' : '') : null;
}

/** The sentence rail: who you talk to, the tiles so far, and the hint or the English under it. */
export function rail(tokens, machine, status, opts) {
  const tiles = [];
  if (machine) tiles.push(`<span class="tile voc"><span class="tj">${jp(THINGS[machine].jp)}、</span><small>${THINGS[machine].r}</small></span>`);
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok.t !== 'n') continue;
    const t = THINGS[tok.id];
    const nx = tokens[i + 1];
    const p = nx && nx.t === 'p' ? nx.p : null;
    const pj = p ? `<b class="pt p-${p}">${PARTICLES[p].jp}</b>` : '<b class="pt empty">?</b>';
    tiles.push(`<span class="tile n${p ? '' : ' open'}"><span class="tj">${jp(t.jp)}${pj}</span><small>${t.r}${p ? ` ${PARTICLES[p].r}` : ''}</small>${opts.en ? `<em>${t.en}${p ? ` · ${PARTICLES[p].en}` : ''}</em>` : ''}</span>`);
  }
  if (!tiles.length) tiles.push('<span class="tile ghost">your command</span>');
  const box = $('.tiles');
  box.innerHTML = tiles.join('');
  // One row always: shrink the tiles until a long command fits.
  let k = 1;
  box.style.setProperty('--k', k);
  while (box.scrollWidth > box.clientWidth + 1 && k > 0.55) box.style.setProperty('--k', (k -= 0.07));
  const last = $('.tiles').lastElementChild;
  if (opts.bump && last) last.animate([{ transform: 'translateY(-14px) scale(1.15)', opacity: 0.4 }, { transform: 'none', opacity: 1 }], { duration: ms(220), easing: 'cubic-bezier(.2,.9,.3,1.3)' });
  const hint = $('.hint');
  hint.className = `hint${status.ok ? ' ok' : ''}`;
  if (status.ok) hint.innerHTML = opts.en ? english(status, opts.polite) : '<span class="dim">Ready. Tap the verb to say it, or EN for the English.</span>';
  else hint.textContent = opts.draft != null ? opts.draft : status.need;
}

/** The pad: particle buttons, power words, undo, and the verb as the fire button. */
export function pad(run, machine, status, opts) {
  const parts = ['o', 'ni', 'to'].concat(run.powers.has('mo') ? ['nimo'] : []);
  let html = parts.map(p => `<button class="pbtn p-${p}" data-p="${p}" title="${PARTICLES[p].en} (${PARTICLES[p].key})"><b>${PARTICLES[p].jp}</b><small>${PARTICLES[p].en}</small></button>`).join('');
  if (run.powers.has('minna')) html += `<button class="pbtn power" data-thing="minna" ${run.charges.minna ? '' : 'disabled'}><b>みんな</b><small>everyone ×${run.charges.minna}</small></button>`;
  if (run.powers.has('matte')) html += `<button class="pbtn power" data-act="matte" ${run.charges.matte ? '' : 'disabled'}><b>まって</b><small>wait ×${run.charges.matte}</small></button>`;
  html += '<button class="pbtn undo" data-act="undo" title="Undo (Backspace)"><b>⌫</b><small>undo</small></button>';
  $('.parts').innerHTML = html;
  const fire = $('.fire');
  const v = machine ? VERBS[THINGS[machine].verb] : null;
  fire.disabled = !status.ok;
  fire.classList.toggle('ready', !!status.ok);
  fire.innerHTML = v ? `<b>${v.jp}${opts.polite ? 'ください' : ''}</b><small>${v.r}${opts.polite ? ' kudasai' : ''} · ${v.en}${opts.polite ? ', please' : ''}</small>` : '<b>…</b><small>tap a machine or a drink</small>';
}

/** The big multiplier read-out after a command. Stays until the next tap. */
export function banner(res) {
  const b = $('.banner');
  if (!res.points) return (b.hidden = true);
  const parts = [`<b class="b-n">${res.n} × ${res.n}</b>`];
  if (res.streakMult > 1) parts.push(`<span class="b-x">streak ×${res.streakMult}</span>`);
  if (res.politeMult > 1) parts.push('<span class="b-x">ください ×2</span>');
  parts.push(`<span class="b-pts">+${res.points}</span>`);
  b.innerHTML = parts.join('');
  b.hidden = false;
  b.classList.toggle('big', res.n >= 3);
  b.animate([{ transform: 'translate(-50%, -50%) scale(.4)', opacity: 0 }, { transform: 'translate(-50%, -50%) scale(1.15)', opacity: 1, offset: 0.12 }, { transform: 'translate(-50%, -50%) scale(1)', offset: 0.2 }, { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0.8 }, { transform: 'translate(-50%, -160%) scale(.5)', opacity: 0 }], { duration: ms(1900), easing: 'ease-out' }).onfinish = () => (b.hidden = true);
}

export function overlay(html, cls = '') {
  const o = $('.overlay');
  o.className = `overlay ${cls}`;
  o.innerHTML = html;
  o.hidden = !html;
  if (html) o.firstElementChild.animate([{ opacity: 0, transform: 'translateY(30px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: ms(360), easing: 'cubic-bezier(.2,.9,.3,1.1)' });
  return o;
}

export const powerCard = id => {
  const p = POWERS[id];
  return `<button class="card" data-power="${id}"><span class="c-jp">${p.jp}</span><span class="c-r">${p.r} · ${p.en}</span><span class="c-what">${p.what}</span><span class="c-ex">${jp(p.ex)}</span></button>`;
};

export function stars(score) {
  return STARS.map(t => `<i class="${score >= t ? 'on' : ''}">★</i>`).join('');
}
