// The places diagram of the bible (#place-map): every place in docs/game/places.md as a node with a picture, and
// every trip between them as a labelled edge. Read live from places.md: the built places are its "## Name (`id`)"
// sections, the planned ones the list under "Places decided but not built", the trips the list under "Getting
// between places". Pictures are bible/shots/places/<id>.webp (game captures; island map crops for planned places).
import { section } from './live.js';

const DOC = 'docs/game/places.md';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const pic = (id) => `bible/shots/places/${id}.webp`;

// ------------------------------------------------------------------ reading places.md
export function parsePlaces(doc) {
  const places = [];
  let cur = null;
  for (const l of doc.split('\n')) {
    if (/^## /.test(l)) {
      const m = l.match(/^## (.+?) \(`([a-z0-9_]+)`\)\s*$/);
      cur = m ? { id: m[2], title: m[1], body: '', planned: false } : null;
      if (cur) places.push(cur);
    } else if (cur) cur.body += l + '\n';
  }
  places.forEach((p) => { p.body = p.body.trim(); });
  for (const m of section(doc, 'Places decided but not built').matchAll(/^- (.+?) \(`([a-z0-9_]+)`\): (.+)$/gm)) {
    if (!places.some((p) => p.id === m[2])) places.push({ id: m[2], title: m[1], body: m[3], planned: true });
  }
  const trips = [...section(doc, 'Getting between places').matchAll(/^- `([a-z0-9_]+)` → `([a-z0-9_]+)`, ([^:]+): (.+)$/gm)]
    .map(([, from, to, how, text]) => ({ from, to, how: how.trim(), text }));
  const byId = Object.fromEntries(places.map((p) => [p.id, p]));
  trips.forEach((t) => { t.planned = !byId[t.from] || !byId[t.to] || byId[t.from].planned || byId[t.to].planned; });
  return { places, trips, byId };
}

// Depth = trips from the first place; lane = which branch. The first trip out of a place keeps its lane.
function layout(M) {
  const pos = {};
  const first = M.places[0];
  if (!first) return pos;
  const queue = [[first.id, 0, 0]];
  const used = {};
  while (queue.length) {
    const [id, d, lane] = queue.shift();
    if (pos[id]) continue;
    let l = lane;
    while ((used[d] || new Set()).has(l)) l++;
    (used[d] = used[d] || new Set()).add(l);
    pos[id] = { d, l };
    M.trips.filter((t) => t.from === id).forEach((t, i) => queue.push([t.to, d + 1, l + i]));
  }
  const maxD = Math.max(0, ...Object.values(pos).map((p) => p.d));
  const lane = 1 + Math.max(0, ...Object.values(pos).map((q) => q.l));   // places with no trip yet: one extra row
  M.places.filter((p) => !pos[p.id]).forEach((p, i) => { pos[p.id] = { d: i % (maxD + 1), l: lane + Math.floor(i / (maxD + 1)) }; });
  return pos;
}

// ------------------------------------------------------------------ page
const S = { sel: null };
let M = null, ctx = null, root = null, ro = null;

export async function mount(el, opts) {
  ctx = opts; root = el;
  if (!document.getElementById('pmap-css')) { const l = document.createElement('link'); l.id = 'pmap-css'; l.rel = 'stylesheet'; l.href = new URL('places-map.css', opts.here).href; document.head.appendChild(l); }
  M = parsePlaces(opts.doc || '');
  S.sel = M.byId[opts.arg] ? opts.arg : null;
  render();
  if (ro) ro.disconnect();
  ro = new ResizeObserver(() => { if (document.body.contains(root)) drawEdges(); else ro.disconnect(); });
  ro.observe(root);
}

function node(p, pos, vertical) {
  const [col, row] = vertical ? [pos.l + 1, pos.d + 1] : [pos.d + 1, pos.l + 1];
  return `<button type="button" class="pm-node${p.planned ? ' planned' : ''}${S.sel === p.id ? ' on' : ''}" data-id="${esc(p.id)}" style="grid-column:${col};grid-row:${row}" aria-pressed="${S.sel === p.id}">
    <span class="pm-ph"><img src="${esc(ctx.url(pic(p.id)))}" alt="" loading="lazy" decoding="async" onerror="this.remove()"></span>
    <span class="pm-t"><b>${esc(p.title)}</b><span><code>${esc(p.id)}</code>${p.planned ? '<i>planned</i>' : ''}</span></span></button>`;
}

function render() {
  const vertical = root.clientWidth < 640;
  const pos = layout(M);
  const cols = 1 + Math.max(0, ...Object.values(pos).map((p) => (vertical ? p.l : p.d)));
  const orphans = M.trips.filter((t) => !M.byId[t.from] || !M.byId[t.to]);
  root.dataset.vertical = vertical;
  root.innerHTML = `<h1>Places diagram</h1>
    <p class="lede">Every place and how you get from one to the next, read from ${ctx.link(DOC)} each time this page loads ${ctx.liveTag(DOC)}. Built places show a capture from the game; dashed ones are planned, shown with a crop of the island map (island-03), not the game. Click a place for its picture and its section.</p>
    ${orphans.length ? `<p class="pm-err">Trips naming a place that places.md doesn't have: ${orphans.map((t) => `<code>${esc(t.from)} → ${esc(t.to)}</code>`).join(', ')}</p>` : ''}
    <div class="pm-wrap"><div class="pm-grid" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">
      ${M.places.map((p) => node(p, pos[p.id], vertical)).join('')}
    </div><svg class="pm-edges" aria-hidden="true"></svg><div class="pm-labels"></div></div>
    <div class="pm-key"><span><i class="k-built"></i>built</span><span><i class="k-plan"></i>planned</span></div>
    <div class="pm-panel" id="pm-panel">${panel()}</div>`;
  root.querySelectorAll('.pm-node').forEach((b) => b.addEventListener('click', () => select(b.dataset.id)));
  root._vertical = vertical;
  requestAnimationFrame(drawEdges);
}

function select(id) {
  S.sel = S.sel === id ? null : id;
  history.replaceState(null, '', `#place-map${S.sel ? '/' + S.sel : ''}`);
  root.querySelectorAll('.pm-node').forEach((b) => { b.classList.toggle('on', b.dataset.id === S.sel); b.setAttribute('aria-pressed', b.dataset.id === S.sel); });
  const el = root.querySelector('#pm-panel');
  el.innerHTML = panel();
  if (S.sel && el.getBoundingClientRect().top > innerHeight - 120) el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}

function panel() {
  const p = M.byId[S.sel];
  if (!p) return '<p class="muted">No place picked. Click one above.</p>';
  const name = (id) => (M.byId[id] ? M.byId[id].title : id);
  const trips = M.trips.filter((t) => t.from === p.id || t.to === p.id);
  const [first, ...rest] = p.body.split(/\n\n/);
  return `<div class="pm-detail">
    <figure data-lbg>${ctx.img(pic(p.id), `${p.title}${p.planned ? ' (island map crop, planned)' : ' (in the game)'}`)}<figcaption>${p.planned ? 'Planned. Crop of the island map island-03, not the game.' : 'In the game.'} <span class="src">${esc(pic(p.id))}</span></figcaption></figure>
    <div><h2>${esc(p.title)} <code class="pid">${esc(p.id)}</code>${p.planned ? ' <span class="st draft">planned</span>' : ''}</h2>
      <div class="md">${ctx.md(cap(first))}</div>
      ${rest.length ? `<details class="prompt"><summary><span class="tt">The rest of the section: things, spots, who is there when, small moments</span></summary><div class="inner md">${ctx.md(rest.join('\n\n'))}</div></details>` : ''}
      ${trips.length ? `<h3>Trips</h3><ul class="pm-trips">${trips.map((t) => `<li><b>${esc(name(t.from))} → ${esc(name(t.to))}</b>, ${esc(t.how)}${t.planned ? ' <span class="st draft">planned</span>' : ''}<div class="md">${ctx.md(cap(t.text))}</div></li>`).join('')}</ul>` : ''}
      <p class="muted small">From ${ctx.link(DOC)}${p.planned ? ', Places decided but not built' : ''}.</p></div></div>`;
}

// ------------------------------------------------------------------ edges
function drawEdges() {
  if (!root || !root.querySelector('.pm-wrap')) return;
  if ((root.clientWidth < 640) !== root._vertical) { render(); return; }
  const wrap = root.querySelector('.pm-wrap'), svg = wrap.querySelector('.pm-edges'), labels = wrap.querySelector('.pm-labels');
  const W = wrap.getBoundingClientRect();
  svg.setAttribute('viewBox', `0 0 ${W.width} ${W.height}`);
  svg.setAttribute('width', W.width); svg.setAttribute('height', W.height);
  const box = (id) => { const b = wrap.querySelector(`.pm-node[data-id="${CSS.escape(id)}"]`); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left - W.left, y: r.top - W.top, w: r.width, h: r.height }; };
  const v = root._vertical;
  let paths = '', tags = '';
  for (const t of M.trips) {
    const a = box(t.from), b = box(t.to);
    if (!a || !b) continue;
    let x1, y1, x2, y2, d;
    if (v) { x1 = a.x + a.w / 2; y1 = a.y + a.h; x2 = b.x + b.w / 2; y2 = b.y - 6; const m = (y1 + y2) / 2; d = `M${x1},${y1} C${x1},${m} ${x2},${m} ${x2},${y2}`; }
    else { x1 = a.x + a.w; y1 = a.y + a.h / 2; x2 = b.x - 6; y2 = b.y + b.h / 2; const m = (x1 + x2) / 2; d = `M${x1},${y1} C${m},${y1} ${m},${y2} ${x2},${y2}`; }
    paths += `<path d="${d}" class="${t.planned ? 'planned' : ''}" marker-end="url(#pm-arrow${t.planned ? '-p' : ''})"/>`;
    tags += `<span class="pm-how${t.planned ? ' planned' : ''}" style="left:${(x1 + x2) / 2}px;top:${(y1 + y2) / 2}px" title="${esc(t.text)}">${esc(t.how)}</span>`;
  }
  svg.innerHTML = `<defs>${['', '-p'].map((s) => `<marker id="pm-arrow${s}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="pm-tip${s ? ' planned' : ''}"/></marker>`).join('')}</defs>${paths}`;
  labels.innerHTML = tags;
}
