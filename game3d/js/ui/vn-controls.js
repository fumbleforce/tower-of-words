// The dialogue box's own controls, as in a visual novel (docs/game/controls-and-ui.md, The dialogue box): a row of
// small buttons on the box (Log, Auto, Skip, Hide, Replay) and their keys, gestures and controller buttons.
//   Log     the backlog (ui/backlog.js): L, PageUp, the wheel up, a swipe down on the box; Y on a controller
//   Auto    lines move on once spoken (or after a reading time, Settings > Auto speed). Off at every start; any tap
//           or key stops it; it waits at replies and word prompts. A key or X on a controller
//   Skip    runs through lines already seen (Settings > Skip unread too), and hurries the walks between them; stops
//           at replies, word prompts and new lines. Ctrl held (RB on a controller) skips while held
//   Hide    the dialogue box and the HUD go, to look at the scene; any tap or key brings them back. H, a long press
//           on the box on a phone, Back/View on a controller
//   Replay  the current line's voice again. R, LB on a controller
// The row comes in after the first few lines of a new player's first session (GUIDE, First screen).
// dialogue.js calls skipLine() and autoLine() for every line and choiceShown() for every set of replies.
import { settings, AUTO_WAIT } from '../settings.js';
import { voice, muted } from '../audio/core.js';
import { openLog, closeLog, logOpen, logSize, scrollLog } from './backlog.js';
import { whileUnpaused } from './dialogue-text.js';
import { $, el } from './dom.js';

export const vn = { auto: false, skip: false, ctrl: false, hidden: false };
let ui = null;
const SEEN_KEY = 'amakawa-vnbar';
const KEYS = { log: 'KeyL', auto: 'KeyY', hide: 'KeyH', replay: 'KeyR' };
const I = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const BTNS = [
  ['log', 'Backlog (L)', I('<path d="M5 6.5h14M5 11h14M5 15.5h9"/><path d="M17 14.5v5l3-2.5z" class="f"/>')],
  ['auto', 'Auto (Y)', I('<path d="M8 6.5v11l9-5.5z" class="f"/>'), 'Auto'],
  ['skip', 'Skip seen lines (hold Ctrl)', I('<path d="M5 6.5v11l7-5.5zM12.5 6.5v11l7-5.5z" class="f"/>'), 'Skip'],
  [
    'hide',
    'Hide the text (H)',
    I(
      '<path d="M3 12s3.3-5.5 9-5.5S21 12 21 12s-3.3 5.5-9 5.5S3 12 3 12z"/><circle cx="12" cy="12" r="2.6"/><path d="M4.5 19.5l15-15"/>',
    ),
  ],
  [
    'replay',
    'Hear this line again (R)',
    I(
      '<path d="M4 9.5v5h3.2L12 18.6V5.4L7.2 9.5H4z" class="f"/><path d="M15.2 9.2a4 4 0 0 1 0 5.6M17.8 6.6a7.6 7.6 0 0 1 0 10.8"/>',
    ),
  ],
];

const game = () => window.__game;
const shell = () => window.__shell;
const talk = () => $('#talk');
const talkOpen = () => !!talk() && !talk().hidden;
const typing = () => talkOpen() && talk().classList.contains('typing');
const choosing = () => !!ui?._chipKeys;
const blocked = () =>
  document.body.classList.contains('at-title') ||
  !!shell()?.isPaused?.() ||
  !!document.querySelector('.layer.in, #ui .panel:not([hidden]), #cmdsPanel:not([hidden]), #sayMenu:not([hidden])');

// ---------- the modes ----------
function sync() {
  const bar = $('#vnbar');
  if (!bar) return;
  for (const k of ['auto', 'skip']) {
    const b = bar.querySelector(`.${k}`),
      on = vn[k] || (k === 'skip' && vn.ctrl);
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  }
  bar.querySelector('.replay').disabled = !ui?._cur?.voiceKey;
  document.body.classList.toggle('vn-auto', vn.auto);
  document.body.classList.toggle('vn-skip', vn.skip || vn.ctrl);
}
export function setAuto(on) {
  vn.auto = !!on;
  if (on) vn.skip = false;
  sync();
  if (on) ui?._autoGo?.();
}
export function setSkip(on) {
  vn.skip = !!on;
  if (on) vn.auto = false;
  sync();
  if (on) ui?._skipGo?.();
}
// a line was shown: true when Skip moves it on at once (it was seen before, or Skip unread too is on)
export function skipLine(seen) {
  const want = vn.skip || vn.ctrl;
  if (!want) return false;
  if (seen || settings.skipUnread) return true;
  if (vn.skip) setSkip(false); // a new line: Skip stops here
  return false;
}
// Auto: once the line is written out and the voice is over (or its reading time has passed), and the box isn't hidden
export async function autoLine({ revealed, spoken, chars, still }) {
  await revealed;
  const [base, per] = AUTO_WAIT[settings.autoSpeed] || AUTO_WAIT.normal;
  if (spoken && settings.voiceOn && !muted) await spoken.then(() => whileUnpaused(600));
  else await whileUnpaused(base + chars * per);
  while (vn.hidden || logOpen()) await whileUnpaused(200);
  await whileUnpaused(150);
  return vn.auto && still();
}
export function choiceShown() {
  if (vn.skip) setSkip(false);
}

// ---------- hide ----------
function hide(on) {
  vn.hidden = on;
  document.body.classList.toggle('vn-hide', on);
  let cover = $('#vnShow');
  if (!cover) {
    cover = el('div', '', '');
    cover.id = 'vnShow';
    cover.setAttribute('aria-label', 'Tap to show the text again');
    document.body.append(cover);
  }
  cover.hidden = !on;
}

// ---------- the row on the box ----------
function act(k) {
  if (k === 'log') return showLog();
  if (k === 'auto') return setAuto(!vn.auto);
  if (k === 'skip') return setSkip(!vn.skip);
  if (k === 'hide') return hide(true);
  if (k === 'replay' && ui?._cur?.voiceKey) voice(ui._cur.voiceKey, { muffle: !!ui._cur.overheard });
}
function showLog() {
  if (logOpen() || !logSize()) return;
  setAuto(false);
  setSkip(false);
  openLog({
    sayWord: (id, w) => ui.sayWord(id, w),
    closed: () => $('#vnbar .log')?.focus?.({ preventScroll: true }),
  });
}
let seenBar = (() => {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
})();
export function installVn(theUi) {
  ui = theUi;
  const bar = el(
    'div',
    '',
    BTNS.map(
      ([k, tip, svg, word]) =>
        `<button type="button" class="vb ${k}" title="${tip}" aria-label="${tip}">${svg}${word ? `<span class="w">${word}</span>` : ''}</button>`,
    ).join(''),
  );
  bar.id = 'vnbar';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Dialogue');
  talk().prepend(bar);
  bar.addEventListener('pointerdown', (e) => e.stopPropagation());
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('.vb');
    if (!b) return;
    e.stopPropagation();
    act(BTNS.find(([k]) => b.classList.contains(k))[0]);
    b.blur();
  });
  let freeFor = 0;
  setInterval(() => {
    // the row: after the first few lines, then always; not over a word prompt
    if (!seenBar && (ui._lines || 0) > 4) {
      seenBar = true;
      try {
        localStorage.setItem(SEEN_KEY, '1');
      } catch {
        /* storage off */
      }
    }
    bar.hidden = !seenBar || typing();
    sync();
    const g = game();
    // the player has control again (no line, no scene): Auto and Skip end with the conversation
    freeFor = !talkOpen() && g && !g.busy ? freeFor + 1 : 0;
    if (freeFor > 8 && (vn.auto || vn.skip)) [vn.auto, vn.skip] = [false, false];
    if (typing() && vn.skip) setSkip(false);
    // Skip hurries the walks and moves between lines along
    if ((vn.skip || vn.ctrl) && g?.busy && !ui._advance && !choosing() && !typing() && !g.hurry) g.setHurry?.(true);
  }, 100);
}

// ---------- keys (capture phase, before the game's own: this module loads before main.js and menu.js) ----------
const swallow = (e) => {
  e.preventDefault();
  e.stopImmediatePropagation();
};
window.addEventListener(
  'keydown',
  (e) => {
    if (e.key === 'Control') {
      if (!vn.ctrl && !blocked()) {
        vn.ctrl = true;
        sync();
        ui?._skipGo?.();
      }
      return;
    }
    if (/^(Shift|Alt|Meta|CapsLock)/.test(e.key) || !ui) return;
    if (vn.hidden) return (swallow(e), hide(false));
    if (logOpen()) {
      if (['Escape', 'KeyL', 'PageDown', 'Backspace'].includes(e.code)) closeLog();
      else if (e.code === 'ArrowDown' || e.code === 'ArrowUp' || e.code === 'PageUp')
        scrollLog(e.code === 'ArrowDown' ? 80 : -240);
      if (e.code !== 'F8' && e.code !== 'F3') swallow(e);
      return;
    }
    if (blocked() || e.ctrlKey || e.metaKey || e.altKey) return; // Ctrl+R and the like stay the browser's
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (vn.auto && e.code !== KEYS.auto) {
      setAuto(false);
      if (['Space', 'Enter'].includes(e.code)) return swallow(e);
    }
    if (e.repeat) return;
    if (e.code === 'PageUp' || (e.code === KEYS.log && talkOpen())) {
      if (logSize()) (swallow(e), showLog());
      return;
    }
    if (!talkOpen() || typing() || !seenBar) return;
    const k = Object.keys(KEYS).find((x) => KEYS[x] === e.code);
    if (k && k !== 'log') (swallow(e), act(k));
  },
  true,
);
window.addEventListener(
  'keyup',
  (e) => {
    if (e.key === 'Control' && vn.ctrl) {
      vn.ctrl = false;
      sync();
    }
  },
  true,
);
window.addEventListener('blur', () => {
  vn.ctrl = false;
});

// ---------- taps and gestures ----------
// Auto stops on any tap (the tap does nothing else on the dialogue area). On a phone, a press on the box is held back
// until it lifts: a quick tap moves on as before, a swipe down opens the backlog, a long press hides the text.
let press = null;
const PASS = Symbol('vn-pass');
const onBox = (t) => !!t.closest?.('#talk, #talkHit') && !t.closest('button, .chip, input, .jp[data-w], .wplay');
window.addEventListener(
  'pointerdown',
  (e) => {
    if (e[PASS] || !ui) return;
    if (vn.hidden) return (swallow(e), hide(false));
    if (logOpen() || blocked()) return;
    if (vn.auto && !e.target.closest?.('#vnbar .auto')) {
      setAuto(false);
      if (onBox(e.target)) return swallow(e);
    }
    if (e.pointerType !== 'touch' || !onBox(e.target) || !talkOpen() || typing()) return;
    swallow(e);
    const p = (press = {
      x: e.clientX,
      y: e.clientY,
      target: e.target,
      id: e.pointerId,
      done: false,
    });
    p.timer = setTimeout(() => {
      if (press !== p || !seenBar) return;
      p.done = true;
      hide(true);
    }, 550);
  },
  true,
);
window.addEventListener(
  'pointermove',
  (e) => {
    if (press && e.pointerId === press.id && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 12)
      clearTimeout(press.timer);
  },
  true,
);
for (const type of ['pointerup', 'pointercancel'])
  window.addEventListener(
    type,
    (e) => {
      const p = press;
      if (!p || e.pointerId !== p.id) return;
      press = null;
      clearTimeout(p.timer);
      if (p.done || type === 'pointercancel') return;
      const dx = e.clientX - p.x,
        dy = e.clientY - p.y;
      if (dy > 45 && Math.abs(dx) < dy) return showLog();
      if (Math.hypot(dx, dy) > 30) return;
      const ev = new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        clientX: p.x,
        clientY: p.y,
        pointerType: 'touch',
        pointerId: p.id,
      });
      ev[PASS] = true;
      (p.target.isConnected ? p.target : talk()).dispatchEvent(ev);
    },
    true,
  );
// the wheel up opens the backlog (over the game, not over a panel that scrolls)
window.addEventListener(
  'wheel',
  (e) => {
    if (e.deltaY >= 0 || logOpen() || vn.hidden || blocked() || !ui) return;
    if (!e.target.closest?.('#c, #talk, #talkHit, #stage, #marks') && e.target.id !== 'ui') return;
    showLog();
  },
  { passive: true },
);

// ---------- a controller: the same actions as the keys ----------
const PAD = {
  0: 'Space',
  1: 'Escape',
  2: 'auto',
  3: 'log',
  4: 'replay',
  8: 'hide',
  12: 'up',
  13: 'down',
};
const key = (code) =>
  window.dispatchEvent(
    new KeyboardEvent('keydown', {
      code,
      key: code === 'Space' ? ' ' : code,
      bubbles: true,
      cancelable: true,
    }),
  );
let padDown = {};
function pollPad() {
  const pad = [...(navigator.getGamepads?.() || [])].find(Boolean);
  if (!pad) return;
  requestAnimationFrame(pollPad);
  const rb = !!pad.buttons[5]?.pressed;
  if (rb !== vn.ctrl && !blocked()) {
    vn.ctrl = rb;
    sync();
    if (rb) ui?._skipGo?.();
  }
  for (const [i, what] of Object.entries(PAD)) {
    const on = !!pad.buttons[i]?.pressed;
    if (on && !padDown[i]) {
      if (vn.hidden) hide(false);
      else if (logOpen()) {
        if (what === 'up' || what === 'down') scrollLog(what === 'down' ? 80 : -240);
        else if (what === 'Escape' || what === 'log') closeLog();
      } else if (what === 'Space' || what === 'Escape') key(what);
      else if (what === 'log') showLog();
      else if (talkOpen() && !typing() && !['up', 'down'].includes(what)) act(what);
    }
    padDown[i] = on;
  }
}
window.addEventListener('gamepadconnected', () => requestAnimationFrame(pollPad));
