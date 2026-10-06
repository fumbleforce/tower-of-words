// The minimap in the HUD's bottom left corner (docs/game/controls-and-ui.md, The HUD): the streets and buildings
// round Eric, north up, his arrow, the places as dots and the goal as a teal dot, held on the edge when it is
// further away. A tap or a click on it, or M, opens the full map (ui/map/view.js, loaded on first open).
// Hidden on day 1's train, in the first minutes' onboarding, while a line is up, at the title and the end, and with
// the HUD (H). Redrawn at most ten times a second, and only when Eric moves or turns or the goal moves.
import { drawBase, toView } from './map/base.js';
import { ericAt, goalAt } from './map/where.js';
import { PINS } from '../travel/pins.js';
import { openToday, openEver } from '../travel/rules.js';
import { visited } from '../travel/visited.js';
import { sim } from '../sim.js';

const SIZE = { phone: 88, desk: 180 }; // css px at interface size 1
const SCALE = { phone: 1.5, desk: 2.2 }; // css px a unit
const TEAL = '#6fd0c6',
  INK = '#0e2a28';
const body = document.body;
const isPhone = () => body.classList.contains('phone');

export function installMinimap(game) {
  const btn = document.createElement('button');
  btn.id = 'minimap';
  btn.type = 'button';
  btn.hidden = true;
  btn.setAttribute('aria-label', 'Open the map (M)');
  btn.innerHTML =
    '<canvas aria-hidden="true"></canvas><span class="mm-north" aria-hidden="true">N</span><span class="mm-tag" aria-hidden="true"><kbd>M</kbd>Map</span>';
  document.getElementById('ui').appendChild(btn);
  const canvas = btn.querySelector('canvas'),
    ctx = canvas.getContext('2d');
  let view = null,
    loadingView = null,
    last = '',
    lastAt = 0;

  // the full map, loaded the first time it opens
  async function mapView() {
    loadingView ||= import('./map/view.js')
      .then((module) => (view = module.createMapView(game)))
      .catch((error) => {
        loadingView = null;
        throw error;
      });
    return loadingView;
  }
  // the map can open whenever the HUD is up (also during a conversation)
  const canOpen = () =>
    !!game.place &&
    !(game.place.name === 'train' && (sim.day || 1) === 1) &&
    !['at-title', 'title-leaving', 'ob-active', 'paused', 'vn-hide'].some((c) => body.classList.contains(c)) &&
    !game.ended &&
    !document.querySelector('#end:not([hidden])');
  const map = {
    async open() {
      if (!canOpen()) return false;
      await (await mapView()).open();
      return true;
    },
    close: () => view?.close(),
    isOpen: () => !!view?.isOpen(),
    view: () => view,
  };
  game.map = map;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    map.open();
  });
  addEventListener(
    'keydown',
    (e) => {
      if (e.code !== 'KeyM' || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (e.target.closest?.('input, textarea, [contenteditable]')) return;
      if (map.isOpen()) {
        e.preventDefault();
        e.stopImmediatePropagation();
        map.close();
      } else if (canOpen() && !window.__shell?.isPaused?.() && !document.querySelector('.layer.in')) {
        e.preventDefault();
        e.stopImmediatePropagation(); // a closing map can still hold focus until its fade ends
        map.open();
      }
    },
    true,
  );

  const pinDot = (id) =>
    id === game.place?.name
      ? null
      : !openToday(sim.day || 1).includes(id)
        ? openEver(sim.day || 1).has(id)
          ? '#5b6370'
          : null
        : visited.has(id)
          ? '#1d3946'
          : '#667e88';
  function draw(e, goal) {
    const r = btn.getBoundingClientRect();
    const k = isPhone() ? 'phone' : 'desk';
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = Math.round(r.width * dpr),
      h = Math.round(r.height * dpr);
    if (canvas.width !== w || canvas.height !== h) Object.assign(canvas, { width: w, height: h });
    const v = { cx: e.x, cz: e.z, w: r.width, h: r.height, dpr, scale: SCALE[k] * (r.width / SIZE[k]) };
    drawBase(ctx, { ...v, detail: false });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const [id, p] of Object.entries(PINS)) {
      const col = p.at && pinDot(id);
      if (!col) continue;
      const [x, y] = toView(v, ...p.at);
      ctx.fillStyle = col;
      ctx.strokeStyle = '#eef6f1';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(x, y, isPhone() ? 2.6 : 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    if (goal) {
      // the goal, or the point on the edge toward it
      const [gx, gy] = toView(v, ...goal);
      const m = isPhone() ? 7 : 10,
        dx = gx - v.w / 2,
        dy = gy - v.h / 2;
      const f = Math.min(1, (v.w / 2 - m) / Math.max(1e-6, Math.abs(dx)), (v.h / 2 - m) / Math.max(1e-6, Math.abs(dy)));
      ctx.fillStyle = TEAL;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(v.w / 2 + dx * f, v.h / 2 + dy * f, isPhone() ? 4.5 : 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    const s = isPhone() ? 0.8 : 1;
    ctx.translate(v.w / 2, v.h / 2);
    ctx.rotate(e.a);
    ctx.scale(s, s);
    ctx.fillStyle = TEAL;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-6, -7);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  const talking = () => !document.getElementById('talk')?.hidden;
  function loop(t) {
    requestAnimationFrame(loop);
    const show = canOpen() && !talking() && !map.isOpen();
    if (btn.hidden === show) btn.hidden = !show;
    if (!show || t - lastAt < 100) return;
    const e = ericAt(game);
    if (!e) return;
    const goal = goalAt(game);
    const key = [
      game.place.name,
      Math.round(e.x * 2),
      Math.round(e.z * 2),
      Math.round(e.a * 20),
      goal?.map((c) => Math.round(c)).join(','),
      isPhone(),
      btn.offsetWidth,
      visited.size,
      sim.day,
    ].join('|');
    if (key === last) return;
    lastAt = t;
    last = key;
    draw(e, goal);
  }
  requestAnimationFrame(loop);
  return map;
}
