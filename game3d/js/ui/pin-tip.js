// The pins' symbols and their tooltip (docs/game/controls-and-ui.md, The HUD, Markers). Jørgen, 2026-10-05: "when I
// hover an interactive eye / heart element it should have a description, and navigation points that take you
// between areas should not have an eye icon, something else". What each pin is and says: gameplay/pin-kinds.js.
//
// The tooltip shows the verb and what it is ("Look: Vending machine", "Go to the plaza") while the mouse is on a pin,
// or after a long press on one on a phone. A tap still acts as before; the long press only previews, and its preview
// stays until the next tap anywhere. Hidden while the action menu is open on the same target (the menu has the name).
import '../full.js';
import { pinTip } from '../gameplay/pin-kinds.js';
import { flags } from '../narrative/state.js';
import { pinTipPosition } from './pin-tip-layout.js';

// the symbols, in a 24 px box, drawn in the pin's colour (css/marks.css); whole literals, so the asset library lists them
export const PIN_GLYPHS = {
  talk: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7l-4 3.5V16H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/></svg>',
  look: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6c4.4 0 7.8 3.3 9 6-1.2 2.7-4.6 6-9 6s-7.8-3.3-9-6c1.2-2.7 4.6-6 9-6zm0 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg>',
  paw: '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="15.5" rx="5" ry="4.2"/><circle cx="6.2" cy="10" r="2"/><circle cx="9.6" cy="6.8" r="2"/><circle cx="14.4" cy="6.8" r="2"/><circle cx="17.8" cy="10" r="2"/></svg>',
  // a door ajar on its frame, with the floor line
  door: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M5 2h14v19h2v2H3v-2h2zM7 4v17h10V4zM8.5 5.6L15.5 4v17h-7zm4.6 6.1a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2z"/></svg>',
  // a bold arrow along the way out
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9.5h9.5V4.5L21 12l-8.5 7.5v-5H3z"/></svg>',
  // three steps going up
  stairs: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21v-5h5v-5h5V6h5V3h3v18z"/></svg>',
  // the lift's doors with up and down
  lift: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M4 2h16v20H4zm2 2v16h12V4zm6 1.8l4 4.4H8zm0 12.4l-4-4.4h8z"/></svg>',
  // a place marker for a spot to walk to
  walk: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 4.4a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2z"/></svg>',
};
// the heart a local plugin can put on a private scene's pin (engine.js setIcon), private mode only
export const HEART =
  '<svg class="heart" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5C5.2 15.6 3 12.2 3 8.8 3 6.3 5 4.5 7.3 4.5c1.9 0 3.5 1 4.7 2.8 1.2-1.8 2.8-2.8 4.7-2.8C19 4.5 21 6.3 21 8.8c0 3.4-2.2 6.8-9 11.7z"/></svg>';

// private mode from window.__settings (settings.js), so engine.js, which walker tests load in Node, doesn't need it.
// Full builds only (js/full.js).
export const optionalOn = () => __FULL__ && !!globalThis.__settings?.privateMode;
// the same heart in front of a reply a local plugin marked as a private scene's (a choice option's `icon`, runner.js):
// purple for soft, red for hard, as on the pins (css/marks.css). Private mode only; any other name draws nothing.
const HEART_FILL = { 'heart-soft': '#c9a0ff', 'heart-hard': '#ff5468' };
export const choiceIcon = (name) =>
  __FULL__ && optionalOn() && HEART_FILL[name]
    ? HEART.replace(
        'class="heart"',
        `class="heart" style="width:1em;height:1em;fill:${HEART_FILL[name]};vertical-align:-0.14em;margin-right:0.35em"`,
      )
    : '';
export const tipOf = (item) => pinTip(item, __FULL__ ? { privateMode: optionalOn(), flags } : { flags });

const LONG_PRESS = 450; // ms held still on a pin before its tooltip shows (a phone's long press)
const MOVE = 10; // px a finger may move and still count as held

// boxes: { thingBox, elBox } from ui/screen-box.js, passed in so the story runner can load choiceIcon without three.js
export function createPinTip(layer, markers, { thingBox, elBox }) {
  const el = document.createElement('div');
  el.id = 'pinTip';
  el.setAttribute('role', 'tooltip');
  el.hidden = true;
  const vb = document.createElement('span'),
    rest = document.createElement('span');
  vb.className = 'vb';
  rest.className = 'nm';
  el.append(vb, rest);
  layer.appendChild(el);
  let cur = null, // the marker whose tooltip shows
    how = '', // 'hover' (the mouse) or 'press' (a long press)
    shown = '',
    press = null,
    swallow = false;
  const markOf = (t) => {
    const pin = t?.closest?.('.pin');
    const b = pin && pin.closest('.mark');
    return (b && markers.list.find((m) => m.el === b)) || null;
  };
  layer.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const m = markOf(e.target);
    if (m) [cur, how] = [m, 'hover'];
  });
  layer.addEventListener('pointerout', (e) => {
    if (how !== 'hover' || !cur || markOf(e.relatedTarget) === cur) return;
    cur = null;
  });
  const cancel = () => {
    if (press) clearTimeout(press.t);
    press = null;
  };
  // any new press ends a long press's preview, and a click after one that never came is not swallowed
  addEventListener(
    'pointerdown',
    () => {
      swallow = false;
      if (how === 'press') cur = null;
    },
    true,
  );
  layer.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    const m = markOf(e.target);
    if (!m) return;
    cancel();
    press = {
      x: e.clientX,
      y: e.clientY,
      t: setTimeout(() => {
        [cur, how, swallow, press] = [m, 'press', true, null];
      }, LONG_PRESS),
    };
  });
  layer.addEventListener('pointermove', (e) => {
    if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > MOVE) cancel();
  });
  addEventListener('pointerup', cancel, true);
  addEventListener('pointercancel', cancel, true);
  // the tap that ends a long press doesn't use the pin (main.js listens for clicks on #marks after this)
  layer.addEventListener(
    'click',
    (e) => {
      if (!swallow) return;
      swallow = false;
      e.stopImmediatePropagation();
      e.preventDefault();
    },
    true,
  );
  layer.addEventListener('contextmenu', (e) => markOf(e.target) && e.preventDefault());

  return {
    get for() {
      return cur;
    },
    // Every frame after the pins move: stay near the pin without covering Eric, its target or the HUD.
    update() {
      const m = cur;
      const ui = window.__game?.ui;
      const pin = m && m.el.isConnected && m.el.style.display !== 'none' && m.el.querySelector('.pin');
      const on = !!pin && !m.el.classList.contains('crowded') && !(ui && ui.actFor === m);
      if (!on) {
        if (!el.hidden) el.hidden = true;
        if (m && !m.el.isConnected) cur = null;
        return;
      }
      const t = tipOf(m);
      if (t.text !== shown) {
        shown = t.text;
        // the verb in the menu's teal, then the rest: "Look" ": Vending machine", "Go" " to the plaza"
        const lead = t.act || t.verb,
          head = t.text.startsWith(lead) ? lead : '';
        vb.textContent = head;
        rest.textContent = t.text.slice(head.length);
      }
      if (el.hidden) el.hidden = false;
      const pinBox = elBox(pin);
      if (!pinBox) {
        el.hidden = true;
        return;
      }
      const g = window.__game;
      const L = layer.getBoundingClientRect();
      const keep = [g?.ericBox?.(), g?.place?.camera ? thingBox(g, m) : null];
      for (const control of [
        m.el.querySelector('.key'),
        m.el.querySelector('.keyq'),
        document.getElementById('goal'),
        document.getElementById('hud'),
      ]) {
        if (control && !control.hidden && getComputedStyle(control).visibility !== 'hidden') keep.push(elBox(control));
      }
      const { x, y } = pinTipPosition(
        pinBox,
        el.offsetWidth,
        el.offsetHeight,
        { x0: L.left, y0: L.top, x1: L.right, y1: L.bottom },
        keep,
      );
      el.style.transform = `translate(${x - L.left}px, ${y - L.top}px)`;
    },
  };
}
