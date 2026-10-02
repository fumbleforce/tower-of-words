// The frame every minigame shares: top bar, stage, the talk box with portraits (the game's
// dialogue look), choices, sentences with slots to fill, the word popover and the end card.
// Nothing here runs on a timer: every line waits for the player (GUIDE, Visual design).

import { jp } from './jp.js';
import { PEOPLE, portrait } from './cast.js';
import { sfx, word, muted, setMuted } from './sound.js';

const $ = (sel, root = document) => root.querySelector(sel);
const h = (tag, cls, html = '') => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  el.innerHTML = html;
  return el;
};

// The test driver reads what the game waits for here (game3d/minigames/tools/play.mjs).
const mg = (window.mg = { expect: null, done: false, steps: 0, rounds: [] });
const expect = e => {
  mg.expect = e;
  mg.steps++;
};

let root, stage, talk, english = localStorage.getItem('mg-english') || 'auto';

/** Builds the page frame. Returns the stage element for the game to draw in. */
export function shell({ title, place }) {
  root = h('div', 'mg');
  root.innerHTML = `
    <header class="bar">
      <div class="where"><b>${title}</b><span>${place}</span></div>
      <ol class="pips" aria-label="Rounds"></ol>
      <button class="chip en-btn" type="button" aria-pressed="false">English</button>
      <button class="chip mute" type="button" aria-label="Sound"></button>
    </header>
    <main class="stage"></main>
    <section class="talk" aria-live="polite">
      <img class="por" alt="">
      <div class="box">
        <div class="who"></div>
        <div class="line"></div>
        <div class="en"></div>
        <div class="task"></div>
        <div class="next">Tap to continue</div>
      </div>
    </section>
    <div class="pop" role="tooltip" hidden></div>`;
  document.body.append(root);
  stage = $('.stage', root);
  talk = $('.talk', root);
  const layout = () => document.body.classList.toggle('phone', innerWidth / innerHeight < 0.8 || innerWidth < 640);
  layout();
  addEventListener('resize', layout);
  wireButtons();
  wireGloss();
  return stage;
}

function wireButtons() {
  const m = $('.mute', root), e = $('.en-btn', root);
  const paint = () => {
    m.textContent = muted() ? 'Sound off' : 'Sound on';
    e.setAttribute('aria-pressed', String(english === 'always'));
    root.classList.toggle('en-always', english === 'always');
  };
  m.onclick = () => (setMuted(!muted()), paint());
  e.onclick = () => {
    english = english === 'always' ? 'auto' : 'always';
    localStorage.setItem('mg-english', english);
    paint();
  };
  paint();
}

// Tapping a glossed word shows its reading and meaning until the next tap (and plays Mio's clip if
// there is one). The tap never moves the story on.
function wireGloss() {
  const pop = $('.pop', root);
  addEventListener(
    'pointerdown',
    e => {
      const w = e.target.closest && e.target.closest('.w');
      if (!w) return (pop.hidden = true);
      e.stopPropagation();
      pop.innerHTML = `<b>${w.dataset.r}</b><span>${w.dataset.g}</span>`;
      pop.hidden = false;
      const r = w.getBoundingClientRect(), pr = pop.getBoundingClientRect();
      pop.style.left = `${Math.max(8, Math.min(innerWidth - pr.width - 8, r.left + r.width / 2 - pr.width / 2))}px`;
      pop.style.top = `${r.top - pr.height - 8 < 8 ? r.bottom + 8 : r.top - pr.height - 8}px`;
      if (w.dataset.clip) word(w.dataset.clip);
    },
    true,
  );
}

/** Round pips: one per round; played ones filled (first-try ones in the accent), the current one outlined. */
export function pips(total, results) {
  const at = results.length;
  $('.pips', root).innerHTML = Array.from({ length: total }, (_, i) => `<li class="${i < at ? (results[i] ? 'won' : 'done') : i === at ? 'now' : ''}"></li>`).join('');
}

function speaker(who, face, side) {
  const por = $('.por', talk);
  const src = who && portrait(who, face);
  talk.classList.toggle('narration', !src);
  talk.classList.toggle('right', side === 'right');
  if (src) {
    por.src = src;
    por.alt = PEOPLE[who].en;
  }
  $('.who', talk).textContent = who ? PEOPLE[who].en : '';
}

function lineHtml(text, opts) {
  $('.line', talk).innerHTML = opts.jp ? jp(text) : text;
  $('.line', talk).classList.toggle('jp', !!opts.jp);
  const en = $('.en', talk);
  en.innerHTML = '';
  if (!opts.en) return;
  // English carries the text early on; later it stays one tap away (or always, with the English button).
  if (opts.showEn || english === 'always') en.innerHTML = `<span class="gloss">${opts.en}</span>`;
  else {
    const b = h('button', 'chip reveal', 'English');
    b.type = 'button';
    b.onclick = ev => {
      ev.stopPropagation();
      en.innerHTML = `<span class="gloss">${opts.en}</span>`;
    };
    en.append(b);
  }
}

let shownNext = 0;
/**
 * A line. who: a PEOPLE id, or null for narration. opts: { jp, en, showEn, face, side }.
 * Resolves when the player taps the box (or presses Space or Enter).
 */
export function say(who, text, opts = {}) {
  speaker(who, opts.face, opts.side);
  lineHtml(text, opts);
  $('.task', talk).innerHTML = '';
  talk.classList.add('waiting');
  $('.next', talk).hidden = shownNext++ > 4;
  return new Promise(resolve => {
    const go = e => {
      if (e.type === 'keydown' && e.key !== ' ' && e.key !== 'Enter') return;
      if (e.target.closest && (e.target.closest('.w') || e.target.closest('button'))) return;
      e.preventDefault();
      talk.removeEventListener('click', go);
      removeEventListener('keydown', go);
      talk.classList.remove('waiting');
      sfx('tap', 0.25);
      resolve();
    };
    talk.addEventListener('click', go);
    addEventListener('keydown', go);
    expect({ kind: 'tap', sel: '.talk .box' });
  });
}

/** Shows a line with a task under it and no tap-to-continue. */
export function ask(who, text, opts = {}) {
  speaker(who, opts.face, opts.side);
  lineHtml(text, opts);
  talk.classList.remove('waiting');
  $('.next', talk).hidden = true;
  const task = $('.task', talk);
  task.innerHTML = '';
  return task;
}

/**
 * Choice chips under the current line. options: [{ html (markup), value, right }].
 * Resolves with the chosen option.
 */
export function choose(options, { jpText = true } = {}) {
  const task = $('.task', talk);
  const row = h('div', 'choices');
  task.append(row);
  return new Promise(resolve => {
    options.forEach((o, i) => {
      const b = h('button', 'choice', jpText ? jp(o.html) : o.html);
      b.type = 'button';
      b.dataset.i = i;
      b.onclick = () => resolve(o);
      row.append(b);
    });
    const at = test => options.findIndex(test);
    expect({
      kind: 'tap',
      sel: `.choices .choice[data-i="${at(o => o.right)}"]`,
      wrong: at(o => !o.right) < 0 ? null : `.choices .choice[data-i="${at(o => !o.right)}"]`,
    });
  });
}

/**
 * A sentence with gaps. parts: markup strings and { slot: true }. bank: [{ id, html }].
 * Tapping a chip puts it in the first empty gap, tapping a filled gap takes it back out.
 * answer: the bank ids in gap order, for the test driver. Resolves with the ids when every gap is filled.
 */
export function fill(parts, bank, answer) {
  const task = $('.task', talk);
  const sent = h('div', 'sentence');
  const chips = h('div', 'choices bank');
  task.append(sent, chips);
  const gaps = [];
  parts.forEach(p => {
    if (typeof p === 'string') sent.insertAdjacentHTML('beforeend', `<span>${jp(p)}</span>`);
    else {
      const g = h('button', 'gap', '');
      g.type = 'button';
      gaps.push(g);
      sent.append(g);
    }
  });
  const held = gaps.map(() => null);
  return new Promise(resolve => {
    const paint = () => {
      gaps.forEach((g, i) => {
        g.innerHTML = held[i] ? jp(held[i].html) : '';
        g.classList.toggle('filled', !!held[i]);
      });
      chips.querySelectorAll('.choice').forEach(c => (c.disabled = held.some(x => x && x.id === c.dataset.id)));
      const next = gaps[held.indexOf(null)];
      gaps.forEach(g => g.classList.toggle('cur', g === next));
    };
    bank.forEach(b => {
      const c = h('button', 'choice', jp(b.html));
      c.type = 'button';
      c.dataset.id = b.id;
      c.onclick = () => {
        const i = held.indexOf(null);
        if (i < 0) return;
        held[i] = b;
        sfx('tap', 0.3);
        paint();
        if (!held.includes(null)) resolve(held.map(x => x.id));
      };
      chips.append(c);
    });
    gaps.forEach((g, i) => (g.onclick = () => ((held[i] = null), paint())));
    paint();
    const wrong = bank.map(b => b.id).filter(id => !answer.includes(id));
    expect({
      kind: 'fill',
      seq: answer.map(id => `.bank .choice[data-id="${id}"]`),
      wrong: wrong.length ? [...answer.slice(0, -1), wrong[0]].map(id => `.bank .choice[data-id="${id}"]`) : null,
    });
  });
}

/** Waits for a tap on one of the elements; right and wrong are selectors for the test driver. */
export function tapOne(els, right, wrong) {
  return new Promise(resolve => {
    const off = () => els.forEach(el => (el.onclick = null));
    els.forEach(el => (el.onclick = () => (off(), resolve(el))));
    expect({ kind: 'tap', sel: right, wrong });
  });
}

/** Waits for a drag or tap-tap; the game passes what is right for the test driver. */
export function expectLink(from, to, wrongTo = null) {
  expect({ kind: 'link', from, to, wrong: wrongTo && { from, to: wrongTo } });
}

/** A quiet mark on the stage for a right answer (no text; the next line says what happened). */
export function stamp(ok) {
  sfx(ok ? 'ok' : 'no', 0.45);
  stage.classList.remove('good', 'bad');
  void stage.offsetWidth;
  stage.classList.add(ok ? 'good' : 'bad');
}

/** The end card. rows: [{ jp, en }] lines to look back on. */
export function end({ title, sub, rows, again }) {
  sfx('bond', 0.5);
  const card = h('div', 'endcard');
  card.innerHTML = `<div class="sheet"><h2>${title}</h2><p class="sub">${sub}</p>
    <ul>${rows.map(r => `<li><span class="jp">${jp(r.jp)}</span><span class="gloss">${r.en}</span></li>`).join('')}</ul>
    <button class="primary again" type="button">Play again</button></div>`;
  root.append(card);
  $('.again', card).onclick = again;
  mg.done = true;
  expect({ kind: 'end' });
}
