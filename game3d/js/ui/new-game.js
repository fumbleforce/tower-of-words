// The new-game screen (docs/game/controls-and-ui.md, Title): Start on the title opens it before the camera flies into
// the car. The player picks who they play (Eric or Carina, a portrait card each, from data/mc/) and whether the
// Japanese skill checks are on (Settings' skipChecks, the other way round). A local build may add rows from the
// git-ignored plugin newgame.js (plugins.js localPlugin); this file knows nothing about them beyond the row format.
// Continue, loaded slots and Days never come here.
//
// The protagonist is fixed for a page load (mc.js), so picking the other one saves the choices, reloads with ?mc=<id>
// and starts the new game there straight from the title (sessionStorage PENDING).
//
// A row: { key, label, options: [{ id, name, note }], value, apply(id) }. apply runs on Start.
// Automated browsers (navigator.webdriver) skip the screen so the existing tools that press Start keep playing;
// ?newgame=1 shows it to them (game3d/tools/new-game-check.mjs).
import { el } from './dom.js';
import { settings, setSetting } from '../settings.js';
import { MC, PROTAGONISTS } from '../mc.js';
import { localPlugin } from '../plugins.js';
import { sfx } from '../ui.js';

const PENDING = 'amakawa-new-game';
const Q = new URLSearchParams(location.search);
const SKIP = navigator.webdriver && !Q.has('newgame');
const v = () => '?v=' + encodeURIComponent(window.BUILD || '');

const checksRow = () => ({
  key: 'checks',
  label: 'Japanese skill checks',
  options: [
    { id: 'on', name: 'On', note: 'You type each new Japanese word in romaji when you first use it.' },
    { id: 'off', name: 'Off', note: 'New words are shown and pass without typing.' },
  ],
  value: settings.skipChecks ? 'off' : 'on',
  apply: (id) => setSetting('skipChecks', id === 'off'),
});

// rows from the local plugin, if this build has one (never on the published site)
let extra = null;
const extraRows = () =>
  (extra ??= localPlugin('newgame')
    .then((m) => m?.rows?.({ settings, setSetting }) || [])
    .catch(() => []));

const radio = (cls, label, checked) => {
  const b = el('button', cls, label);
  b.setAttribute('role', 'radio');
  b.setAttribute('aria-checked', String(checked));
  b.tabIndex = checked ? 0 : -1;
  return b;
};
// one radio group: arrows move the choice (and the focus), as in Settings
function group(root, buttons, pick) {
  root.addEventListener('keydown', (e) => {
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    const i = buttons.indexOf(document.activeElement);
    if (!d || i < 0) return;
    e.preventDefault();
    e.stopPropagation();
    const n = buttons[(i + d + buttons.length) % buttons.length];
    pick(n);
    n.focus();
  });
  for (const b of buttons) b.addEventListener('click', () => pick(b));
}
const mark = (buttons, on) => {
  for (const b of buttons) {
    b.setAttribute('aria-checked', String(b === on));
    b.tabIndex = b === on ? 0 : -1;
  }
};

function card(mc) {
  const f = mc.portrait.crop?.f || [0, 0, 648, 0];
  const fx = Math.round(((f[0] + f[2]) / 2 / (mc.portrait.crop?.W || 648)) * 100);
  const b = radio(
    'ng-card',
    `<span class="ng-art"><span class="ng-jp" aria-hidden="true">${mc.name_jp}</span>` +
      `<img src="assets/portraits/${mc.portrait.set}-neutral.webp${v()}" alt="" draggable="false"></span>` +
      `<span class="ng-text"><span class="ng-name">${mc.name}</span><span class="ng-line">${mc.pitch || ''}</span></span>`,
    mc.id === MC.id,
  );
  b.dataset.mc = mc.id;
  b.style.setProperty('--fx', fx + '%');
  b.setAttribute('aria-label', `${mc.name}. ${mc.pitch || ''}`);
  return b;
}

function row(r) {
  const w = el('div', 'ng-row');
  w.dataset.key = r.key;
  const id = 'ng-l-' + r.key;
  w.innerHTML = `<div class="ng-lbl"><span id="${id}">${r.label}</span><small class="ng-note"></small></div>`;
  const seg = el('div', 'seg');
  seg.setAttribute('role', 'radiogroup');
  seg.setAttribute('aria-labelledby', id);
  const bs = r.options.map((o) => {
    const b = radio('', o.name, o.id === r.value);
    b.dataset.id = o.id;
    return b;
  });
  seg.append(...bs);
  w.append(seg);
  const note = w.querySelector('.ng-note');
  const show = () => (note.textContent = r.options.find((o) => o.id === r.value)?.note || '');
  group(seg, bs, (b) => {
    if (r.value !== b.dataset.id) sfx('tap');
    r.value = b.dataset.id;
    mark(bs, b);
    show();
  });
  show();
  return w;
}

// the screen; resolves 'start' or 'back'
async function open(title) {
  const rows = [checksRow(), ...(await extraRows())];
  let mc = MC.id;
  const scr = el('section', 'newgame');
  scr.setAttribute('role', 'dialog');
  scr.setAttribute('aria-modal', 'true');
  scr.setAttribute('aria-labelledby', 'ng-h');
  scr.innerHTML =
    '<div class="ng-scrim" aria-hidden="true"></div><div class="ng-pane"><h2 id="ng-h">New game</h2></div>';
  const pane = scr.querySelector('.ng-pane');
  const cards = el('div', 'ng-cards');
  cards.setAttribute('role', 'radiogroup');
  cards.setAttribute('aria-label', 'Who you play');
  const cs = Object.values(PROTAGONISTS).map(card);
  cards.append(...cs);
  group(cards, cs, (b) => {
    if (mc !== b.dataset.mc) sfx('tap');
    mc = b.dataset.mc;
    mark(cs, b);
  });
  const side = el('div', 'ng-side');
  side.append(...rows.map(row));
  const acts = el('div', 'ng-acts');
  const back = el('button', 'ng-back', 'Back');
  const go = el('button', 'ng-start', '<span>Start</span>');
  acts.append(back, go);
  side.append(acts);
  pane.append(cards, side);

  const inner = title.querySelector('.inner');
  inner.hidden = true;
  title.append(scr);
  requestAnimationFrame(() => scr.classList.add('in'));
  cs.find((b) => b.dataset.mc === mc)?.focus({ preventScroll: true });
  const pick = await new Promise((res) => {
    back.onclick = () => res('back');
    go.onclick = () => res('start');
    scr.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        res('back');
      }
    });
  });
  if (pick === 'back') {
    sfx('tap');
    scr.remove();
    inner.hidden = false;
    title.querySelector('.go')?.focus({ preventScroll: true });
    return { pick };
  }
  for (const r of rows) r.apply(r.value);
  scr.classList.add('out');
  setTimeout(() => scr.remove(), 700);
  return { pick, mc };
}

// Start on the title goes through the screen first; installed once by ui/title.js
let installed = false;
export function gateStart(title) {
  if (installed) return;
  installed = true;
  const go = title.querySelector('.go');
  let pass = false;
  const start = () => {
    pass = true;
    go.click();
  };
  // a reload for the other protagonist: start the game it asked for as soon as the title is up (menu.js at-title)
  let pending = false;
  try {
    pending = !!sessionStorage.getItem(PENDING);
    sessionStorage.removeItem(PENDING);
  } catch {
    /* storage off */
  }
  if (pending) {
    const wait = () => (document.body.classList.contains('at-title') ? start() : requestAnimationFrame(wait));
    wait();
  }
  if (SKIP) pass = true;
  else void extraRows(); // fetched while the title is up
  let busy = false;
  title.addEventListener(
    'click',
    async (e) => {
      if (pass || busy || !e.target.closest?.('.go')) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      busy = true;
      sfx('tap');
      const r = await open(title);
      busy = false;
      if (r.pick !== 'start') return;
      if (r.mc === MC.id) return start();
      try {
        sessionStorage.setItem(PENDING, '1');
      } catch {
        /* storage off: the reload shows the title and Start again */
      }
      const u = new URL(location.href);
      u.searchParams.set('mc', r.mc);
      document.body.classList.add('reloading');
      location.replace(u.href);
    },
    true,
  );
}
