// The full island map (docs/game/controls-and-ui.md, The map): opened from the minimap or with M, loaded on first
// open (ui/minimap.js imports it then). A 2D canvas (ui/map/base.js) with a pin button per place, Eric's arrow and
// the goal's flag; the picked place's card is a bottom sheet on the phone and a side panel on desktop
// (ui/map/panel.js). Drag to pan, pinch or wheel to zoom; M, Esc or the close button shuts it. While it is open the
// game is paused and the 3D view isn't drawn (main.js tick reads game.mapOpen). The canvas is emptied on close.
import { drawBase, toView, fromView, BOUNDS } from './base.js';
import { ericAt, goalAt } from './where.js';
import { cardHTML, listHTML, pinClass, dot } from './panel.js';
import { PINS, pinOf } from '../../travel/pins.js';
import { travelStates, goTo } from '../../travel/go.js';
import { sim, periodName } from '../../sim.js';

const TEAL = '#6fd0c6',
  INK = '#0e2a28';
const phone = () => document.body.classList.contains('phone');
const shell = () => window.__shell;

export function createMapView(game) {
  const root = document.createElement('div');
  root.id = 'mapView';
  root.className = 'layer';
  root.hidden = true;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Map');
  root.innerHTML = `
    <div class="mv-map" tabindex="-1">
      <canvas aria-hidden="true"></canvas>
      <div class="mv-pins"></div>
      <div class="mv-head"><b>Map</b><span class="mv-when"></span></div>
      <div class="mv-goal" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 21V4"/><path d="M6 4.5h11l-2.5 4 2.5 4H6"/></svg><span></span></div>
      <ul class="mv-legend" aria-hidden="true">
        <li>${dot({ state: 'here' })}You are here</li><li>${dot({ state: 'go', visited: true })}Been here</li>
        <li>${dot({ state: 'go', visited: false })}Not been here yet</li><li>${dot({ state: 'closed' })}Not open today</li>
      </ul>
      <p class="mv-help">Drag to pan · wheel to zoom · M or Esc closes</p>
    </div>
    <aside class="mv-side"><div class="mv-card"></div><nav class="mv-list" aria-label="Places"></nav></aside>
    <button type="button" class="mv-close" aria-label="Close the map" data-first><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>`;
  document.body.appendChild(root);
  const $ = (s) => root.querySelector(s);
  const area = $('.mv-map'),
    canvas = $('canvas'),
    pinsEl = $('.mv-pins'),
    ctx = canvas.getContext('2d');
  const v = { cx: 0, cz: 0, scale: 3, w: 0, h: 0, dpr: 1 };
  let open = false,
    opening = false,
    states = {},
    picked = null,
    raf = 0,
    eric = null,
    goal = null,
    minScale = 1;
  const pins = {}; // id -> button

  // ---------- drawing ----------
  function clampView() {
    v.scale = Math.max(minScale, Math.min(14, v.scale));
    const hw = v.w / 2 / v.scale,
      hh = v.h / 2 / v.scale;
    const fit = (c, lo, hi, half) => (hi - lo < half * 2 ? (lo + hi) / 2 : Math.max(lo + half, Math.min(hi - half, c)));
    v.cx = fit(v.cx, BOUNDS.x0, BOUNDS.x1, hw);
    v.cz = fit(v.cz, BOUNDS.z0, BOUNDS.z1, hh);
  }
  function size() {
    const r = area.getBoundingClientRect();
    v.w = Math.max(1, r.width);
    v.h = Math.max(1, r.height);
    v.dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(v.w * v.dpr);
    canvas.height = Math.round(v.h * v.dpr);
    canvas.style.width = v.w + 'px';
    canvas.style.height = v.h + 'px';
    minScale = Math.min(v.w / (BOUNDS.x1 - BOUNDS.x0), v.h / (BOUNDS.z1 - BOUNDS.z0));
  }
  const redraw = () => {
    if (!raf && open) raf = requestAnimationFrame(draw);
  };
  function draw() {
    raf = 0;
    if (!open) return;
    clampView();
    drawBase(ctx, v);
    ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
    if (goal) flag(...toView(v, ...goal));
    if (eric) arrow(...toView(v, eric.x, eric.z), eric.a);
    placePins();
  }
  function flag(x, y) {
    ctx.fillStyle = 'rgba(111, 208, 198, 0.18)';
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = TEAL;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x - 5, y + 12);
    ctx.lineTo(x - 5, y - 12);
    ctx.lineTo(x + 9, y - 12);
    ctx.lineTo(x + 5, y - 6);
    ctx.lineTo(x + 9, y);
    ctx.lineTo(x - 5, y);
    ctx.fill();
    ctx.stroke();
  }
  function arrow(x, y, a) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(111, 208, 198, 0.22)';
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(a);
    ctx.fillStyle = TEAL;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(11, 0);
    ctx.lineTo(-7, -8);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-7, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  function buildPins() {
    pinsEl.textContent = '';
    for (const k of Object.keys(pins)) delete pins[k];
    for (const s of Object.values(states)) {
      if (!PINS[s.id]?.at || s.state === 'hidden') continue;
      const b = document.createElement('button');
      b.type = 'button';
      // he is inside a place with no pin of its own (his room, the pool deck): its place's pin is where he is
      const here = s.state !== 'here' && pinOf(game.place?.name || '').name === s.id;
      b.className = 'pin ' + (here ? 'here' : pinClass(s));
      b.dataset.pick = s.id;
      b.innerHTML = `${dot(here ? { state: 'here' } : s)}<span class="lb">${s.name}</span>`;
      b.setAttribute('aria-label', `${s.name}${s.state === 'here' ? ', you are here' : ''}`);
      pinsEl.appendChild(b);
      pins[s.id] = b;
    }
  }
  // each pin at its point, its label beside it: on the right, else on the left, else a little above or below.
  // Where no place is free, the pin nearer Eric keeps its label (the picked pin and his own first).
  const SPOTS = [
    [false, 0],
    [true, 0],
    [false, -1],
    [false, 1],
    [true, -1],
    [true, 1],
  ];
  function placePins() {
    const at = (id) => toView(v, ...PINS[id].at);
    const e = eric ? toView(v, eric.x, eric.z) : [v.w / 2, v.h / 2];
    const rank = (id) =>
      id === picked ? -2 : states[id]?.state === 'here' ? -1 : Math.hypot(...at(id).map((c, i) => c - e[i]));
    const order = Object.keys(pins).sort((a, b) => rank(a) - rank(b));
    const taken = order.map((id) => {
      const [x, y] = at(id);
      return { x0: x - 12, x1: x + 12, y0: y - 12, y1: y + 12 };
    });
    for (const id of order) {
      const b = pins[id],
        [x, y] = at(id);
      const lw = (b._lw ||= b.querySelector('.lb').offsetWidth + 10);
      const boxOf = ([l, dy]) => {
        const y0 = y - 13 + dy * 24;
        return l ? { x0: x - 16 - lw, x1: x - 14, y0, y1: y0 + 26 } : { x0: x + 14, x1: x + 16 + lw, y0, y1: y0 + 26 };
      };
      const free = (spot) => {
        const bx = boxOf(spot);
        return (
          bx.x0 > 2 &&
          bx.x1 < v.w - 2 &&
          !taken.some((o) => bx.x0 < o.x1 && bx.x1 > o.x0 && bx.y0 < o.y1 && bx.y1 > o.y0)
        );
      };
      const spot = SPOTS.find(free);
      if (spot) taken.push(boxOf(spot));
      const [left, dy] = spot || [false, 0];
      b.classList.toggle('nolabel', !spot);
      b.classList.toggle('left', left);
      b.dataset.dy = dy;
      b.classList.toggle('on', id === picked);
      b.style.transform = `translate(${Math.round(left && spot ? x + 22 - b.offsetWidth : x - 22)}px, ${Math.round(y - 22)}px)`;
      b.hidden = x < -40 || y < -40 || x > v.w + 40 || y > v.h + 40;
    }
  }

  // ---------- the card and the list ----------
  function side() {
    const s = picked ? states[picked] : null;
    $('.mv-card').innerHTML = cardHTML(s, states, { phone: phone() });
    root.classList.toggle('picked', !!s);
    if (!phone()) $('.mv-list').innerHTML = listHTML(states, picked);
    redraw();
  }
  function pick(id, { focusList = false } = {}) {
    picked = id;
    if (states[id]?.state === 'go') game.prepare?.(id); // built while he reads the card (places/lifecycle.js)
    side();
    if (focusList) root.querySelector(`.mv-list [data-pick="${id}"]`)?.focus({ preventScroll: true });
  }
  async function go() {
    const id = picked;
    if (states[id]?.state !== 'go') return;
    close();
    await goTo(game, id);
  }

  // ---------- open and close ----------
  async function openMap() {
    if (open || opening) return;
    opening = true;
    states = await travelStates(game).finally(() => (opening = false));
    open = true;
    game.mapOpen = true;
    game.paused = true;
    game.walker?.keys.clear();
    document.body.classList.add('map-open');
    $('.mv-when').textContent = [sim.date, periodName(sim.period)].filter(Boolean).join(' · ');
    const gt = game.ui?.goalText || '';
    $('.mv-goal').hidden = !gt;
    $('.mv-goal span').textContent = gt;
    $('.mv-help').textContent = phone()
      ? 'Drag or pinch to move the map'
      : 'Drag to pan · wheel to zoom · M or Esc closes';
    if (shell()?.openLayer) shell().openLayer(root, close);
    else {
      root.hidden = false;
      root.classList.add('in');
      $('.mv-close').focus();
    }
    eric = ericAt(game);
    goal = goalAt(game);
    size();
    const here = eric || { x: 0, z: 0 };
    if (phone()) Object.assign(v, { scale: 3.25, cx: here.x, cz: here.z });
    else
      Object.assign(v, {
        scale: minScale * 1.02,
        cx: (BOUNDS.x0 + BOUNDS.x1) / 2,
        cz: (BOUNDS.z0 + BOUNDS.z1) / 2,
      });
    picked = phone() ? null : game.place?.name || null;
    buildPins();
    side();
    draw();
  }
  function close() {
    if (!open) return;
    open = false;
    cancelAnimationFrame(raf);
    raf = 0;
    game.mapOpen = false;
    game.paused = !!shell()?.isPaused?.();
    document.body.classList.remove('map-open');
    if (shell()?.closeLayer) shell().closeLayer(root);
    else {
      root.classList.remove('in');
      root.hidden = true;
    }
    canvas.width = canvas.height = 0; // the canvas's memory goes back while the map is shut
  }

  // ---------- input ----------
  root.addEventListener('click', (e) => {
    if (dragged) return void ((dragged = false), e.stopPropagation());
    const t = e.target.closest('button');
    if (!t) return;
    e.stopPropagation();
    if (t.classList.contains('mv-close') || t.classList.contains('mv-cancel')) {
      if (t.classList.contains('mv-close')) close();
      else ((picked = null), side());
    } else if (t.classList.contains('mv-go')) go();
    else if (t.dataset.pick) {
      // a second Enter or click on the picked row of the list goes there
      if (t.closest('.mv-list') && picked === t.dataset.pick && states[picked]?.state === 'go') go();
      else pick(t.dataset.pick);
    }
  });
  root.addEventListener('keydown', (e) => {
    e.stopPropagation(); // nothing reaches the game while the map is open
    if (e.code === 'KeyM' && !e.shiftKey) return void (e.preventDefault(), close());
    if (e.code === 'Escape') return void (e.preventDefault(), close());
    const rows = [...root.querySelectorAll('.mv-list [data-pick]')];
    const i = rows.indexOf(document.activeElement);
    if ((e.code === 'ArrowDown' || e.code === 'ArrowUp') && rows.length) {
      e.preventDefault();
      const n = i < 0 ? 0 : (i + (e.code === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length;
      pick(rows[n].dataset.pick, { focusList: true });
    } else if (e.code === 'Tab') {
      const f = [...root.querySelectorAll('button:not([disabled])')].filter((b) => b.offsetParent && !b.hidden);
      const k = f.indexOf(document.activeElement);
      f[(k + (e.shiftKey ? f.length - 1 : 1)) % f.length]?.focus();
      e.preventDefault();
    }
  });
  root.addEventListener('keyup', (e) => e.stopPropagation());
  // drag to pan, pinch or wheel to zoom
  const ptrs = new Map();
  let dragged = false,
    moved = 0,
    pinch = 0;
  area.addEventListener('pointerdown', (e) => {
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    moved = 0;
    if (ptrs.size === 2) pinch = spread();
  });
  const spread = () => {
    const [a, b] = [...ptrs.values()];
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
  };
  area.addEventListener('pointermove', (e) => {
    const p = ptrs.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p[0],
      dy = e.clientY - p[1];
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 1) {
      v.cx -= dx / v.scale;
      v.cz -= dy / v.scale;
    } else if (ptrs.size === 2) {
      const d = spread();
      if (pinch) zoomAt(d / pinch, ...mid());
      pinch = d;
    }
    moved += Math.abs(dx) + Math.abs(dy);
    if (moved > 8) {
      dragged = true;
      if (!area.hasPointerCapture(e.pointerId)) area.setPointerCapture(e.pointerId);
    }
    redraw();
  });
  const mid = () => {
    const r = area.getBoundingClientRect(),
      [a, b] = [...ptrs.values()];
    return [(a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top];
  };
  const up = (e) => {
    ptrs.delete(e.pointerId);
    pinch = 0;
    if (!ptrs.size) setTimeout(() => (dragged = false), 0);
  };
  area.addEventListener('pointerup', up);
  area.addEventListener('pointercancel', up);
  function zoomAt(k, px, py) {
    const [x, z] = fromView(v, px, py);
    v.scale *= k;
    clampView();
    v.cx = x - (px - v.w / 2) / v.scale;
    v.cz = z - (py - v.h / 2) / v.scale;
  }
  area.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const r = area.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
      redraw();
    },
    { passive: false },
  );
  addEventListener('resize', () => {
    if (!open) return;
    size();
    side();
  });

  return { open: openMap, close, isOpen: () => open, pick, states: () => states, root };
}
