// The story map for one day and place: the scenes that start there in rows by time of day, each card saying how it
// starts and when, with the routes between them drawn (choices and jumps to another scene here) and the routes that
// leave (to another place). A card is dragged onto another time of day, or a private scene onto another place or
// day, and the editor opens that scene with the change made, ready to save with its checks.
const { document, requestAnimationFrame, CSS } = globalThis;
import { esc } from './common.js';
import { S } from './store.js';
import { titleOf, placeName, humanize } from './names.js';
import { PERIODS, periodsOf } from './restrictions.js';
import { areasOf, dayTitle } from './storymap.js';

const LANES = [{ id: '', label: 'Any time' }, ...PERIODS.map(p => ({ id: p.id, label: p.label }))];
let drag = null; // the item being dragged

// host: the board element. opts: {items, day, area, filter, onOpen(id), onArea(id), onMove(item, change)}
export function paintBoard(host, opts) {
  const areas = areasOf(opts.items.filter(i => opts.filter === 'all' || i.row.audience === opts.filter), opts.day);
  const area = areas.find(a => a.id === opts.area) || areas[0];
  if (!area) {
    host.innerHTML = `<div class="board-empty"><h2>${esc(dayTitle(opts.day))}</h2><p>Nothing plays on this day yet.</p></div>`;
    return;
  }
  const items = area.items.filter(i => i.kind !== 'loose');
  const lane = it => periodsOf(it.model)[0] || '';
  host.innerHTML = `
    <div class="board-head">
      <h2>${esc(dayTitle(opts.day))} · ${esc(area.title)}</h2>
      <p class="quiet">Drag a scene to another time of day. A private scene can also go to another place, or another day on the left.</p>
      <div class="board-places">${areas.map(a => `<button class="place-chip${a === area ? ' on' : ''}" aria-pressed="${a === area}" data-area="${esc(a.id)}" ${a.place ? `data-place="${esc(a.place)}"` : ''}>${esc(a.title)}<span>${a.items.filter(i => i.kind !== 'loose').length}</span></button>`).join('')}</div>
    </div>
    <div class="lanes">
      ${LANES.map(l => `<section class="lane" data-lane="${l.id}"><h3>${esc(l.label)}</h3><div class="cards">${items.filter(it => lane(it) === l.id).map(card).join('') || '<p class="lane-empty">Drop a scene here</p>'}</div></section>`).join('')}
      <svg class="routes" aria-hidden="true"></svg>
    </div>`;
  for (const b of host.querySelectorAll('.place-chip')) b.onclick = () => opts.onArea(b.dataset.area);
  for (const c of host.querySelectorAll('.card')) {
    const item = items.find(i => i.row.id === c.dataset.id);
    c.onclick = e => { if (!e.target.closest('[data-go]')) opts.onOpen(item.row.id); };
    c.addEventListener('dragstart', e => { drag = item; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', item.row.id); c.classList.add('dragging'); document.body.classList.add('dragging-card', item.kind === 'private' ? 'drag-private' : 'drag-public'); });
    c.addEventListener('dragend', () => { drag = null; c.classList.remove('dragging'); document.body.classList.remove('dragging-card', 'drag-private', 'drag-public'); });
  }
  for (const g of host.querySelectorAll('[data-go]')) g.onclick = () => opts.onArea(g.dataset.go);
  // drop on a time of day
  for (const l of host.querySelectorAll('.lane')) dropZone(l, () => drag && lane(drag) !== l.dataset.lane, () => opts.onMove(drag, { periods: l.dataset.lane ? [l.dataset.lane] : [] }));
  // drop on another place: private scenes only (a public one lives in its place's story file)
  for (const b of host.querySelectorAll('.place-chip[data-place]')) dropZone(b, () => drag?.kind === 'private' && drag.place !== b.dataset.place, () => opts.onMove(drag, { place: b.dataset.place }));
  host.querySelector('.place-chip.on')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  requestAnimationFrame(() => drawRoutes(host, items));
}

// Make an element take a dropped card when `can()` says so.
export function dropZone(el, can, drop) {
  el.addEventListener('dragover', e => { if (!can()) return; e.preventDefault(); el.classList.add('drop-here'); });
  el.addEventListener('dragleave', () => el.classList.remove('drop-here'));
  el.addEventListener('drop', e => { el.classList.remove('drop-here'); if (!can()) return; e.preventDefault(); drop(); });
}
export const dragging = () => drag;

function card(it) {
  const r = it.row, priv = r.audience === 'private';
  const leaves = [...new Set((it.routes || []).filter(x => x.kind === 'trip').map(x => x.to))];
  const way = it.way || 'Started from another scene';
  return `<article class="card${priv ? ' private' : ''}${it.pending ? ' pending' : ''}${r.id === S.scene?.id ? ' current' : ''}" draggable="true" data-id="${esc(r.id)}">
    <h4>${esc(titleOf(r).replace(/^Day \d+ · /, ''))}${priv ? ' <span class="tag private mini">Private</span>' : ''}</h4>
    <p class="card-way">${esc(way)}</p>
    ${it.note ? `<p class="card-when">${esc(it.note)}</p>` : ''}
    ${it.parts.length ? `<p class="card-parts">${it.parts.length} part${it.parts.length > 1 ? 's' : ''}: ${esc(it.parts.slice(0, 3).map(p => humanize(p.node)).join(', '))}${it.parts.length > 3 ? '…' : ''}</p>` : ''}
    ${leaves.length ? `<p class="card-leaves">${leaves.map(p => `<button class="leave" data-go="${esc(p)}">→ ${esc(placeName(p))}</button>`).join('')}</p>` : ''}
    ${it.pending ? '<p class="card-pending">Moved, not saved yet</p>' : ''}
  </article>`;
}

// Lines for the choices and jumps that lead from one scene on the board to another (from the scene or its parts).
function drawRoutes(host, items) {
  const svg = host.querySelector('svg.routes');
  if (!svg) return;
  const box = svg.parentElement.getBoundingClientRect();
  const byNode = new Map(items.map(i => [i.row.node, i]));
  const at = id => host.querySelector(`.card[data-id="${CSS.escape(id)}"]`)?.getBoundingClientRect();
  const paths = [];
  for (const it of items) {
    const targets = new Map();
    for (const r of [...(it.routes || []), ...(it.partRoutes || [])]) {
      if (!['choice', 'jump', 'call'].includes(r.kind)) continue;
      const to = byNode.get(r.to);
      if (to && to !== it && to.row.id.split('#')[0] === it.row.id.split('#')[0]) targets.set(to.row.id, r);
    }
    for (const [id, r] of targets) {
      const a = at(it.row.id), b = at(id);
      if (!a || !b) continue;
      const x1 = a.right - box.left, y1 = a.top + a.height / 2 - box.top, x2 = b.left - box.left, y2 = b.top + b.height / 2 - box.top;
      const back = x2 < x1 + 10;
      const sx = back ? a.left + a.width / 2 - box.left : x1, sy = back ? a.bottom - box.top : y1;
      const ex = back ? b.left + b.width / 2 - box.left : x2, ey = back ? b.top - box.top : y2;
      const d = back ? `M${sx},${sy} C${sx},${sy + 40} ${ex},${ey - 40} ${ex},${ey}` : `M${sx},${sy} C${sx + 40},${sy} ${ex - 40},${ey} ${ex},${ey}`;
      paths.push(`<path d="${d}" class="route ${r.kind}" marker-end="url(#arrow)"><title>${esc(r.kind === 'choice' ? `Choice: ${r.label || ''}` : 'Goes on to')}</title></path>`);
    }
  }
  svg.setAttribute('width', box.width);
  svg.setAttribute('height', svg.parentElement.scrollHeight);
  svg.innerHTML = `<defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z"/></marker></defs>${paths.join('')}`;
}
