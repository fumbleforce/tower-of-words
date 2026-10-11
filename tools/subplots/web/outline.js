// The scene list as the story map's outline: pick a day, then each place in play order with the scenes that start
// there (how they start, and when), and under each scene the parts its choices lead to. Search looks across every day.
import { esc } from './common.js';
import { S } from './store.js';
import { titleOf } from './names.js';
import { DAYS, dayTitle, areasOf, locate } from './storymap.js';

const openAreas = new Set(), openParts = new Set();
// the title without "Day 4 · " when the list already shows day 4
const shortTitle = (row, day) => titleOf(row).replace(new RegExp(`^Day ${day} · `), '').replace(/^./, c => c.toUpperCase());
let shownScene = null;

function row(item, current, marks) {
  const r = item.row;
  const priv = r.audience === 'private';
  const sub = [item.way, item.note].filter(Boolean).join(' · ');
  const partsOpen = openParts.has(r.id) || item.parts.some(p => p.id === current);
  const parts = item.parts.length
    ? `<button class="parts-toggle" data-parts="${esc(r.id)}" aria-expanded="${partsOpen}">${item.parts.length} part${item.parts.length > 1 ? 's' : ''}</button>`
    : '';
  return `<div class="scene-item${item.kind === 'loose' ? ' loose' : ''}">
    <button class="scene-row${r.id === current ? ' current' : ''}" data-id="${esc(r.id)}">
      <span class="t">${esc(shortTitle(r, item.day))}${priv ? ' <span class="tag private mini">Private</span>' : ''}</span>${marks(r.id)}
      ${sub ? `<span class="sub">${esc(sub)}</span>` : ''}
    </button>${parts}
    ${partsOpen ? `<div class="parts">${item.parts.map(p => `<button class="scene-row part${p.id === current ? ' current' : ''}" data-id="${esc(p.id)}"><span class="t">${esc(shortTitle(p, item.day))}</span>${marks(p.id)}</button>`).join('')}</div>` : ''}
  </div>`;
}

// host: the list element. opts: {items, day, filter, query, marks(id), onOpen(id), onDay(day), onArea(area)}
export function paintOutline(host, opts) {
  const { items, filter, query, marks } = opts;
  const current = S.scene?.id;
  const q = query.trim().toLowerCase();
  const shown = items.filter(i => (filter === 'all' || i.row.audience === filter)
    && (!q || [titleOf(i.row), i.areaTitle, i.row.node, i.row.where, i.way, ...i.parts.map(p => titleOf(p))].join(' ').toLowerCase().includes(q)));
  let html;
  if (q) {
    // results from every day, under "Day 2 · Office"
    const groups = new Map();
    for (const it of shown) {
      const key = `${dayTitle(it.day)} · ${it.areaTitle}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(it);
    }
    html = [...groups].map(([title, list]) => `<section class="area open"><div class="area-head static"><span class="area-name">${esc(title)}</span><span class="count">${list.length}</span></div><div class="area-items">${list.map(i => row(i, current, marks)).join('')}</div></section>`).join('');
  } else {
    html = areasOf(shown, opts.day).map(area => {
      const open = openAreas.has(opts.day + '|' + area.id) || area.items.some(i => i.row.id === current || i.parts.some(p => p.id === current));
      const started = area.items.filter(i => i.kind !== 'loose'), loose = area.items.filter(i => i.kind === 'loose');
      const priv = area.items.filter(i => i.kind === 'private').length;
      return `<section class="area${open ? ' open' : ''}" data-area="${esc(area.id)}">
        <button class="area-head"><span class="chev">›</span><span class="area-name">${esc(area.title)}</span>${priv ? `<span class="tag private mini">${priv} private</span>` : ''}<span class="count">${started.length}</span></button>
        ${open ? `<div class="area-items">${started.map(i => row(i, current, marks)).join('')}${loose.length ? `<p class="loose-head">Started from elsewhere</p>${loose.map(i => row(i, current, marks)).join('')}` : ''}</div>` : ''}
      </section>`;
    }).join('');
  }
  host.innerHTML = html || `<p class="quiet pad">${q ? 'No scene matches.' : `Nothing plays on ${dayTitle(opts.day).toLowerCase()} yet.`}</p>`;
  for (const b of host.querySelectorAll('.area-head:not(.static)')) b.onclick = () => {
    const key = opts.day + '|' + b.parentElement.dataset.area;
    if (openAreas.has(key)) openAreas.delete(key); else openAreas.add(key);
    opts.onArea?.(b.parentElement.dataset.area);
    paintOutline(host, opts);
  };
  for (const b of host.querySelectorAll('[data-parts]')) b.onclick = () => {
    const id = b.dataset.parts;
    if (openParts.has(id)) openParts.delete(id); else openParts.add(id);
    paintOutline(host, opts);
  };
  for (const b of host.querySelectorAll('.scene-row')) b.onclick = () => opts.onOpen(b.dataset.id);
  // bring the open scene into view only when it changes, never when a group is opened or closed
  if (current !== shownScene) {
    shownScene = current;
    host.querySelector('.scene-row.current')?.scrollIntoView({ block: 'nearest' });
  }
}

export function paintDays(host, day, onDay) {
  host.innerHTML = DAYS.map(d => `<button data-day="${d.id}" aria-pressed="${d.id === day}" title="${esc(d.title)}">${esc(d.label)}</button>`).join('');
  for (const b of host.querySelectorAll('button')) b.onclick = () => onDay(DAYS.find(d => String(d.id) === b.dataset.day).id);
}

// The day the open scene plays on, so opening a scene from a link shows its day.
export const dayOfScene = (items, id) => locate(items, id)?.day ?? null;
