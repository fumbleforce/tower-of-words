// The backlog: the most recent conversation entries (spoken lines, narration, texts, replies), and the panel that
// shows it. Opened from the dialogue box's Log button, PageUp, the mouse wheel up or a swipe down on the box
// (ui/vn-controls.js). Raw lines ride in the save across days and render with the player's current vocabulary.
// Read state: which lines have been on screen before, by line id, kept in the browser across saves; Skip uses it.
import { lineHTML, known } from '../lang.js';
import { stopVoice, voice } from '../audio/core.js';
import { heardHTML, addPlayButtons } from './dialogue-text.js';
import { thumbStyle } from './portraits.js';
import { el } from './dom.js';
import { conversationMemory, rememberEntry, rememberedLines } from '../conversations/state.js';
import { LOG_LIMIT, restoreLog, recordEntry, sameLine } from './backlog-records.js';
import { earlierReading } from './backlog-comparison.js';

const READ_KEY = 'amakawa-read';
let items = [];
let day = 1; // the current save's day; individual entries retain their original day

// ---------- read state ----------
// a line's id: its speaker and its text (a rewritten line counts as new)
export function lineId(who, text) {
  const s = `${who || '-'}|${text || ''}`;
  let a = 2166136261,
    b = 5381;
  for (let i = 0; i < s.length; i++) {
    a = Math.imul(a ^ s.charCodeAt(i), 16777619) >>> 0;
    b = (Math.imul(b, 33) ^ s.charCodeAt(i)) >>> 0;
  }
  return a.toString(36) + b.toString(36).slice(0, 3);
}
const read = (() => {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]'));
  } catch {
    return new Set();
  }
})();
let readDirty = 0;
export const wasRead = (id) => read.has(id);
export function markRead(id) {
  if (read.has(id)) return;
  read.add(id);
  clearTimeout(readDirty);
  readDirty = setTimeout(() => {
    try {
      localStorage.setItem(READ_KEY, JSON.stringify([...read]));
    } catch {
      /* storage off */
    }
  }, 400);
}

// ---------- the list ----------
// e: { k: 'line' | 'pick', who, name, role, color, phone, text, en, ov, clear, vk, face, seen, html }
export function logLine(e) {
  const game = globalThis.window?.__game;
  e = recordEntry(e, {
    day: game?.sim?.day || day,
    period: game?.sim?.period,
    place: game?.place?.name,
    node: game?.runner?.currentNode,
    known,
  });
  rememberEntry(e);
  const last = items[items.length - 1];
  // a choice keeps its line on screen: the same line again is not a new entry
  if (sameLine(last, e)) return;
  items.push(e);
  if (items.length > LOG_LIMIT) items.splice(0, items.length - LOG_LIMIT);
  if (panel && !panel.hidden) render();
}
export const logSize = () => items.length;
export function logToJSON() {
  return { v: 2, day, items, memories: conversationMemory.toJSON() };
}
export function logLoad(d, saveDay) {
  items = restoreLog(d, saveDay);
  conversationMemory.load(d?.memories);
  for (const entry of items) rememberEntry(entry);
  day = saveDay || 1;
  remembered = false;
}

// ---------- the panel ----------
let panel = null,
  list = null,
  openedAt = 0,
  onClose = null,
  remembered = false,
  displayed = [];
const esc = (s) =>
  String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;');
const PLAY =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.2L12 18.6V5.4L7.2 9.5H4z"/><path class="w" d="M15.2 9.2a4 4 0 0 1 0 5.6M17.8 6.6a7.6 7.6 0 0 1 0 10.8"/></svg>';
function itemHTML(e, i) {
  if (e.k === 'pick')
    return `<li class="pick${e.seen ? ' seen' : ''}"><span class="tag">You chose</span><span class="c">${e.html}</span></li>`;
  const thumb = e.who ? thumbStyle(e.who, e.face) : '';
  const body = e.ov ? heardHTML(e.text, e.clear) : lineHTML(e.en || e.text);
  const name = e.name
    ? `<div class="who"><span class="nm" style="--c:${e.color || '#8fa3c0'}">${esc(e.name)}</span>${e.phone ? '<span class="rl txt">message</span>' : e.role ? `<span class="rl">${esc(e.role)}</span>` : ''}${e.en ? '<span class="rl">in Japanese</span>' : ''}</div>`
    : '';
  const origin = `<div class="who"><span class="rl">Day ${e.day}${e.period ? ' · ' + esc(e.period) : ''}</span></div>`;
  return `<li class="${e.name ? 'say' : 'narr'}${e.ov ? ' heard' : ''}${e.phone ? ' text' : ''}${e.seen ? ' seen' : ''}">
    ${thumb ? `<span class="th" style="${thumb}"></span>` : '<span class="th none"></span>'}
    <div class="bd">${origin}${name}<div class="tx">${body}</div>${earlierReading(e, body)}</div>
    ${e.vk ? `<button type="button" class="rp" data-i="${i}" aria-label="Play this line again">${PLAY}</button>` : ''}
  </li>`;
}
function render() {
  displayed = remembered ? rememberedLines() : items;
  if (remembered) for (const entry of displayed) conversationMemory.revisit(entry.memoryId, known);
  list.innerHTML = displayed.length
    ? displayed.map(itemHTML).join('')
    : '<li class="empty">No conversations recorded yet.</li>';
  const toggle = panel.querySelector('.memories');
  toggle.hidden = rememberedLines().length === 0;
  toggle.textContent = remembered ? 'All conversations' : 'Remembered remarks';
  toggle.setAttribute('aria-pressed', String(remembered));
  panel.querySelector('.n').textContent = `${displayed.length} ${displayed.length === 1 ? 'entry' : 'entries'}`;
  for (const tx of list.querySelectorAll('li:not(.heard) .tx')) addPlayButtons(tx);
}
function build(sayWord) {
  panel = el(
    'div',
    'vnlog',
    `<div class="sheet" role="dialog" aria-label="Backlog">
      <div class="hd"><span class="t">Backlog</span><span class="n"></span><button type="button" class="x" aria-label="Close the backlog"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
      <button type="button" class="memories" aria-pressed="false">Remembered remarks</button>
      <ol class="ls" tabindex="-1"></ol>
      <div class="ft"></div>
    </div>`,
  );
  panel.hidden = true;
  list = panel.querySelector('.ls');
  panel.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    if (!e.target.closest('.sheet') || e.target.closest('.x')) {
      e.preventDefault();
      closeLog();
    }
  });
  panel.addEventListener('click', (e) => {
    e.stopPropagation();
    if (e.target.closest('.x')) return closeLog();
    if (e.target.closest('.memories')) {
      remembered = !remembered;
      render();
      return;
    }
    const rp = e.target.closest('.rp');
    if (rp) {
      const it = displayed[+rp.dataset.i];
      for (const b of list.querySelectorAll('.rp.on')) b.classList.remove('on');
      rp.classList.add('on');
      voice(it.vk, { muffle: !!it.ov }).then(() => rp.classList.remove('on'));
      return;
    }
    const w = e.target.closest('.wplay, .jp[data-w]');
    if (w) sayWord(w.dataset.w, w);
  });
  // scrolling down past the end closes it (not in the first moments: the wheel that opened it may still be rolling)
  panel.addEventListener(
    'wheel',
    (e) => {
      e.stopPropagation();
      const atEnd = list.scrollTop + list.clientHeight >= list.scrollHeight - 2;
      if (e.deltaY > 0 && atEnd && performance.now() - openedAt > 450) closeLog();
    },
    { passive: true },
  );
  panel.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowDown' || e.code === 'ArrowUp') {
      list.scrollBy({ top: e.code === 'ArrowDown' ? 60 : -60 });
      e.preventDefault();
    }
  });
  document.body.append(panel);
}
export const logOpen = () => !!panel && !panel.hidden;
export function focusLog(direction = 1) {
  if (!logOpen()) return;
  const controls = [...panel.querySelectorAll('button, summary')].filter((node) => node.getClientRects().length);
  if (!controls.length) return;
  const current = controls.indexOf(document.activeElement);
  const index =
    current < 0 ? (direction > 0 ? 0 : controls.length - 1) : (current + direction + controls.length) % controls.length;
  const next = controls[index];
  next.focus({ preventScroll: true });
  next.scrollIntoView({ block: 'nearest' });
}
export function activateLog() {
  const target = document.activeElement;
  if (logOpen() && panel.contains(target) && target.matches('button, summary')) target.click();
  else focusLog();
}
export function openLog({ sayWord, closed }) {
  if (!panel) build(sayWord);
  onClose = closed;
  render();

  panel.querySelector('.ft').textContent = document.body.classList.contains('phone')
    ? 'Tap outside the list to go back'
    : 'Esc, a click outside or scrolling down past the end goes back';
  panel.hidden = false;
  openedAt = performance.now();
  requestAnimationFrame(() => {
    list.scrollTop = list.scrollHeight;
    panel.classList.add('in');
    list.focus({ preventScroll: true });
  });
}
export function closeLog() {
  if (!logOpen()) return;
  panel.classList.remove('in');
  panel.hidden = true;
  stopVoice();
  onClose && onClose();
}
// scroll the open list (keys and the controller)
export function scrollLog(dy) {
  if (!logOpen()) return;
  const atEnd = list.scrollTop + list.clientHeight >= list.scrollHeight - 2;
  if (dy > 0 && atEnd && performance.now() - openedAt > 450) return closeLog();
  list.scrollBy({ top: dy });
}
