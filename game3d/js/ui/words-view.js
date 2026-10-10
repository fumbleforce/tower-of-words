// The Words panel (docs/game/controls-and-ui.md, Words), opened by the HUD's Words chip. A layer like Settings: a
// centred panel on desktop and a sheet from the bottom on the phone, never taller or wider than the screen; the list
// scrolls inside it. Play holds while it is open. Header: the count and a close button; under it a search box (Japanese,
// kana, romaji or English, as you type) and By day / By kind. Each row is a button: it plays Mio saying the word
// (audio/word-<id>.mp3), as a tap on a word in dialogue does. Only words Eric knows are listed (words-data.js).
// Keys: Up and Down move from row to row (Down from the search box goes into the list), Home and End, / to search,
// Enter or Space plays, Tab stays inside, Esc or the Words chip closes.
//   const view = wordsView({ keyLabel, settings, sayWord, sfx }); view.open(); view.close(); view.toggle()
import { WORDS, known, learnedAt, baseHTML, FORM_NOTE, BASE } from '../lang.js';
import { pipsHTML } from '../mastery.js';
import { audioKeys } from '../narrative/voice-keys.js';
import { PLACE_NAMES } from '../places/definitions.js';
import { sim, periodName } from '../sim.js';
import { dateOf } from '../bonds/model.js';
import { el } from './dom.js';
import { wordEntries, groupEntries, matches, sayable } from './words-data.js';

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const LENS =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/></svg>';
const PLAY =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9.5v5h3.2L13 18.5v-13L8.2 9.5H5z"/><path class="w" d="M16 9a4 4 0 0 1 0 6"/></svg>';
const NOCLIP =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9.5v5h3.2L13 18.5v-13L8.2 9.5H5z"/><path d="M16.5 9.5l4 5M20.5 9.5l-4 5"/></svg>';
const phone = () => document.body.classList.contains('phone');
const shell = () => window.__shell;
export const hasClip = (id) => audioKeys.has('word-' + id);

export function wordsView({ keyLabel, settings, sayWord, sfx = () => {} }) {
  let root = null,
    mode = 'day',
    query = '';

  function build() {
    root = el(
      'div',
      'layer',
      `<div class="scrim"></div>
      <section class="pane" role="dialog" aria-modal="true" aria-labelledby="wordsTitle">
        <header class="whead">
          <h2 id="wordsTitle">Words <span class="wn"></span></h2>
          <button class="x" type="button" aria-label="Close">${X}</button>
        </header>
        <div class="wtools">
          <label class="wsearch">${LENS}<input type="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Search Japanese, rōmaji or English" aria-label="Search your words"></label>
          <div class="seg" role="radiogroup" aria-label="Group the words">
            <button type="button" role="radio" data-mode="day">By day</button>
            <button type="button" role="radio" data-mode="kind">By kind</button>
          </div>
        </div>
        <div class="wlist" tabindex="-1"></div>
      </section>`,
    );
    root.id = 'words';
    root.hidden = true;
    root.querySelector('.scrim').onclick = close;
    root.querySelector('.x').onclick = close;
    const input = root.querySelector('input');
    input.addEventListener('input', () => {
      query = input.value;
      draw();
    });
    for (const b of root.querySelectorAll('.seg button'))
      b.onclick = () => {
        mode = b.dataset.mode;
        draw();
      };
    root.querySelector('.wlist').addEventListener('click', (e) => {
      const r = e.target.closest('.wrow');
      if (r) play(r);
    });
    root.addEventListener('keydown', keys);
    document.body.append(root);
  }

  function play(row) {
    const id = row.dataset.w;
    if (!hasClip(id)) return void sfx('tap');
    sayWord(id, row);
  }

  // the target in reach and the words that do something there now (the Q key cap on its pin, controls-and-ui.md)
  function sayHere() {
    const g = window.__game,
      t = g?.near;
    if (!t || g.busy || !g.runner?.has || !g.sayRow?.(t)) return { name: '', ids: new Set() };
    return {
      name: t.label || '',
      ids: new Set([...known].filter((w) => sayable(w) && g.runner.has(`say:${w}:${t.id}`))),
    };
  }

  function where(e, withDay) {
    const bits = [];
    if (withDay && e.day) bits.push(`Day ${e.day}`);
    if (WORDS[e.id].ui === 'tickets') bits.push('Ticket app');
    else if (e.place) bits.push(PLACE_NAMES[e.place] || e.place);
    if (e.period && !withDay) bits.push((periodName(e.period, e.day) || '').toLowerCase());
    return bits.filter(Boolean).join(' · ');
  }

  function row(e, here, showNew) {
    const clip = hasClip(e.id),
      key = keyLabel(settings.keySay || 'KeyQ'),
      at = where(e, mode === 'kind');
    const say = here.ids.has(e.id)
      ? `<span class="wsay">${phone() ? '' : `<span class="key">${esc(key)}</span>`}Say to ${esc(here.name)}</span>`
      : '';
    return (
      `<button type="button" class="wrow${clip ? '' : ' noclip'}" data-w="${e.id}" aria-label="${esc(
        `${e.ja}${e.kana ? ', ' + e.kana : ''}, ${e.ro}, ${e.en}${clip ? '. Play' : '. No recording yet'}`,
      )}">` +
      `<span class="wj"><span class="jp" lang="ja">${esc(e.ja)}</span>${e.kana ? `<span class="kn" lang="ja">${esc(e.kana)}</span>` : ''}</span>` +
      `<span class="wm"><span class="wr"><b>${esc(e.ro)}</b> ${esc(e.en)}</span>${baseHTML(e.id)}` +
      `<span class="wat">${showNew && e.today ? '<span class="wnew">New today</span>' : ''}${esc(at)}</span></span>` +
      `<span class="wside">${say}${sayable(e.id) ? pipsHTML(e.id) : ''}` +
      `<span class="wspk" title="${clip ? 'Play' : 'No recording yet'}">${clip ? PLAY : NOCLIP}</span></span>` +
      '</button>'
    );
  }

  function draw() {
    if (!root) return;
    const today = sim.day || 1;
    const all = wordEntries(known, learnedAt, today);
    const shown = all.filter((e) => matches(e, query));
    // "New today" only means something once there are older words beside them
    const showNew = all.some((e) => !e.today);
    const here = sayHere();
    root.querySelector('.wn').textContent = query.trim() ? `${shown.length} of ${all.length}` : String(all.length);
    for (const b of root.querySelectorAll('.seg button'))
      b.setAttribute('aria-checked', String(b.dataset.mode === mode));
    const groups = groupEntries(
      shown,
      mode,
      (d) => `Day ${d}<span class="wd">${dateOf(d)}${d === today ? ' · today' : ''}</span>`,
    );
    const note = (g) => {
      if (mode !== 'kind') return '';
      const forms = new Set(g.entries.map((e) => BASE[e.id]?.form).filter((f) => FORM_NOTE[f]));
      return `<p class="wnote">${esc(g.note)}${[...forms].map((f) => ` ${FORM_NOTE[f]}`).join('')}</p>`;
    };
    const list = root.querySelector('.wlist');
    list.innerHTML = !all.length
      ? '<p class="wempty">No words yet. People will teach you some.</p>'
      : !shown.length
        ? `<p class="wempty">No word you know matches “${esc(query.trim())}”.</p>`
        : groups
            .map(
              (g) =>
                `<section class="wgrp" data-g="${g.key}"><h3>${g.title}<span class="wc">${g.entries.length}</span></h3>${note(g)}` +
                `<div class="wrows">${g.entries.map((e) => row(e, here, showNew)).join('')}</div></section>`,
            )
            .join('');
  }

  function rows() {
    return [...root.querySelectorAll('.wrow')];
  }
  function focusables() {
    return [...root.querySelectorAll('button, input')].filter((e) => e.offsetParent !== null);
  }
  function keys(e) {
    const input = root.querySelector('input'),
      rs = rows(),
      i = rs.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (document.activeElement === input && e.key === 'ArrowDown' && rs.length) rs[0].focus();
      else if (i >= 0) {
        const n = i + (e.key === 'ArrowDown' ? 1 : -1);
        if (n < 0) input.focus();
        else rs[Math.min(n, rs.length - 1)].focus();
      } else if (rs.length) rs[0].focus();
      e.preventDefault();
    } else if ((e.key === 'Home' || e.key === 'End') && i >= 0) {
      rs[e.key === 'Home' ? 0 : rs.length - 1].focus();
      e.preventDefault();
    } else if (e.key === '/' && document.activeElement !== input) {
      input.focus();
      e.preventDefault();
    } else if (e.key === 'Tab') {
      const f = focusables(),
        k = f.indexOf(document.activeElement);
      f[e.shiftKey ? (k <= 0 ? f.length - 1 : k - 1) : (k + 1) % f.length]?.focus();
      e.preventDefault();
    } else if ((e.key === 'Enter' || e.key === ' ') && i >= 0) {
      play(rs[i]);
      e.preventDefault();
    } else if (e.key === 'Escape') return; // menu.js closes the top layer
    // nothing typed here reaches the game (Space would move a line on, W walk)
    e.stopPropagation();
  }

  function open() {
    if (!root) build();
    if (isOpen()) return;
    const g = window.__game;
    query = '';
    root.querySelector('input').value = '';
    draw();
    if (g) {
      g.paused = true;
      g.walker?.keys?.clear();
    }
    document.body.classList.add('words-open');
    if (shell()?.openLayer) shell().openLayer(root, close);
    else root.hidden = false;
    // the keyboard starts in the search box on desktop; on the phone that would throw up the keyboard over the list
    if (phone()) root.querySelector('.wlist').focus({ preventScroll: true });
    else root.querySelector('input').focus({ preventScroll: true });
    root.querySelector('.wlist').scrollTop = 0;
  }
  function close() {
    if (!isOpen()) return;
    const g = window.__game;
    if (g) g.paused = !!shell()?.isPaused?.() || !!g.mapOpen;
    document.body.classList.remove('words-open');
    if (shell()?.closeLayer) shell().closeLayer(root);
    else root.hidden = true;
  }
  const isOpen = () => !!root && !root.hidden && !root.classList.contains('out');
  return { open, close, isOpen, toggle: () => (isOpen() ? close() : open()), refresh: draw };
}
