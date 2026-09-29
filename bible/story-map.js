// The story map section of the bible (#story-map): every node of the day as a graph, read live from the story
// files through bible/story-graph.js. Nothing here holds a copy of the story.
import { loadStoryGraph, lineOf, parseCond } from './story-graph.js';

const DAGRE = 'https://cdnjs.cloudflare.com/ajax/libs/dagre/0.8.5/dagre.min.js';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const words = (html) => html.replace(/\{(\w+)\}/g, '<span class="sm-w">$1</span>');
const short = (t, n = 90) => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
const PLACE_NAME = { train: 'Train', gate: 'Gate', office: 'Office', transitions: 'Between places' };
const TRANS_NAME = { train_to_gate: 'Walk to the lobby', gate_to_office: 'Lift down to B2' };
const PERIOD_NAME = { early: 'Early', morning: 'Morning', lunch: 'Lunch', afternoon: 'Afternoon', evening: 'After work' };
const W = 216, H = 108;

let dagreP = null;
function loadDagre() {
  if (window.dagre) return Promise.resolve(window.dagre);
  if (!dagreP) dagreP = new Promise((res, rej) => { const s = document.createElement('script'); s.src = DAGRE; s.onload = () => res(window.dagre); s.onerror = () => rej(new Error('dagre did not load')); document.head.appendChild(s); });
  return dagreP;
}
function css(here) {
  if (document.getElementById('smap-css')) return;
  const l = document.createElement('link'); l.id = 'smap-css'; l.rel = 'stylesheet'; l.href = new URL('story-map.css', here).href; document.head.appendChild(l);
}

// ------------------------------------------------------------------ state
const S = { place: 'all', view: null, side: false, unlock: true, flag: null, node: null, tab: 'drift', zoom: null };
let G = null, ctx = null, root = null;

export async function mount(el, opts) {
  ctx = opts; root = el;
  css(opts.here);
  const [place, ...rest] = (opts.arg || '').split('/');
  if (place && (place === 'all' || PLACE_NAME[place])) S.place = place;
  if (rest.length) { S.node = decodeURIComponent(rest.join('/')); if (!S.node.includes(':')) S.node = `${S.place}:${S.node}`; S.tab = 'node'; }
  if (S.view === null) S.view = matchMedia('(max-width: 760px)').matches ? 'list' : 'graph';
  G = await loadStoryGraph(opts.ROOT);
  let dagreOk = true;
  try { await loadDagre(); } catch (_) { dagreOk = false; S.view = 'list'; }
  S.dagreOk = dagreOk;
  render();
}

function setHash() {
  history.replaceState(null, '', `#story-map${S.place !== 'all' || S.node ? '/' + S.place : ''}${S.node ? '/' + S.node : ''}`);
}

// ------------------------------------------------------------------ helpers over the graph
const nodesIn = () => [...G.nodes.values()].filter((n) => (S.place === 'all' || n.place === S.place || (n.transition && (n.transition.from === S.place || n.transition.to === S.place)))
  && (S.side || !n.side || n.id === S.node));
const speakerName = (place, id) => { const sp = (G.speakers[place] || {})[id]; return sp ? sp.name : id; };
function trigLabel(e) {
  if (e.start) return 'place starts';
  const m = /^(talk|say|near|zone|event|give):(?:(\w+|\*):)?(.+)$/.exec(e.trigger);
  if (!m) return e.trigger;
  const [, k, a, b] = m;
  if (k === 'talk') return `talk to ${b}`;
  if (k === 'say') return `say ${a} to ${b === '*' ? 'anything' : b}`;
  if (k === 'give') return `give ${a === '*' ? 'anything' : a} to ${b}`;
  if (k === 'event') return `event ${b}`;
  return `${k} ${b}`;
}
const flagsSetBy = (n) => [...new Set(n.sets.filter((s) => s.how !== 'unset' && !/^know_/.test(s.flag)).map((s) => s.flag))];
function readsOf(n) {
  const out = new Set();
  for (const F of G.flags.values()) if (F.read.some((r) => r.node === n.id)) out.add(F.name);
  return [...out];
}
const driftOf = (id) => {
  const D = G.drift, out = [];
  if (D.unreachable.some((u) => u.node === id)) out.push('unreachable');
  if (D.blocked.some((u) => u.node === id)) out.push('blocked');
  if (D.deadEnds.some((u) => u.node === id)) out.push('dead end');
  return out;
};

// ------------------------------------------------------------------ render
function render() {
  const places = G.places;
  const count = (p) => [...G.nodes.values()].filter((n) => n.place === p).length;
  const D = G.drift;
  const nDrift = D.unreachable.length + D.blocked.length + D.readNeverSet.length + D.deadEnds.length + D.missing.length + D.badConds.length + G.errors.length;
  const periods = [];
  for (const P of places) for (const id of P.nodes.slice().sort((a, b) => G.nodes.get(a).order - G.nodes.get(b).order)) for (const p of G.nodes.get(id).periods) if (!periods.some((x) => x.to === p)) periods.push({ to: p, node: id });
  const ends = [...G.nodes.values()].filter((n) => n.exit === 'end');
  // the day, left to right: places, the trips between them, periods, the end
  const strip = [];
  places.forEach((P, i) => {
    const pp = periods.filter((x) => G.nodes.get(x.node).place === P.id);
    strip.push(`<button class="sm-stop${S.place === P.id ? ' on' : ''}" data-place="${P.id}" style="--pc:var(--sm-${P.id})">
      <b>${esc(PLACE_NAME[P.id] || P.id)}</b><span>${count(P.id)} nodes</span>
      ${pp.length ? `<span class="sm-periods">${pp.map((x) => `<i>${esc(PERIOD_NAME[x.to] || x.to)}</i>`).join('')}</span>` : ''}</button>`);
    const tn = P.next && G.nodes.get(`transitions:${P.id}_to_${P.next}`);
    if (P.next) strip.push(`<button class="sm-trip" ${tn ? `data-node="${tn.id}"` : ''} title="${esc(tn ? tn.name : 'no transition slot')}"><span>${esc(tn ? (TRANS_NAME[tn.name] || tn.name) : 'straight on')}</span></button>`);
  });
  if (ends.length) strip.push(`<button class="sm-stop sm-end" data-node="${ends[0].id}"><b>Day ends</b><span>${esc(ends.map((n) => n.name).join(', '))}</span></button>`);

  const allFlags = [...G.flags.keys()].sort();
  root.innerHTML = `
  <h1>Story map</h1>
  <p class="lede">Every node of day one, drawn from the story files when this page loads. Edges are jumps, choices, place changes and the flags that open the next trigger. ${ctx.liveTag('game3d/story/', 'live')} ${ctx.liveTag('game3d/js/main.js', 'place order')}</p>
  ${G.errors.length ? `<div class="sm-err"><b>Some sources didn't load or don't fit:</b><ul>${G.errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>` : ''}
  <div class="sm-day" role="group" aria-label="The day">${strip.join('')}</div>
  <div class="sm-bar">
    <div class="sm-seg" role="group" aria-label="Place">
      ${['all', ...places.map((p) => p.id)].map((p) => `<button data-place="${p}" class="${S.place === p ? 'on' : ''}">${esc(p === 'all' ? 'Whole day' : PLACE_NAME[p] || p)}</button>`).join('')}
    </div>
    <div class="sm-seg" role="group" aria-label="View">
      <button data-view="graph" class="${S.view === 'graph' ? 'on' : ''}" ${S.dagreOk ? '' : 'disabled title="The layout library did not load"'}>Graph</button>
      <button data-view="list" class="${S.view === 'list' ? 'on' : ''}">List</button>
    </div>
    <label class="sm-check"><input type="checkbox" data-opt="side" ${S.side ? 'checked' : ''}> Side talk</label>
    <label class="sm-check"><input type="checkbox" data-opt="unlock" ${S.unlock ? 'checked' : ''}> Flag links</label>
    <label class="sm-flag">Flag <input list="sm-flags" data-flag value="${esc(S.flag || '')}" placeholder="any flag" autocomplete="off" spellcheck="false">
      <datalist id="sm-flags">${allFlags.map((f) => `<option value="${esc(f)}">`).join('')}</datalist></label>
    ${S.flag ? `<button class="sm-clear" data-flagclear>Clear</button>` : ''}
    ${S.view === 'graph' ? `<div class="sm-zoom" role="group" aria-label="Zoom"><button data-zoom="-" aria-label="Zoom out">−</button><button data-zoom="fit">Fit</button><button data-zoom="+" aria-label="Zoom in">+</button></div>` : ''}
  </div>
  <div class="sm-main">
    <div class="sm-canvas-wrap">${S.view === 'graph' ? `<div class="sm-canvas" tabindex="0" aria-label="Story graph"><div class="sm-sizer"><div class="sm-inner"></div></div></div>${legend()}` : listView()}</div>
    <aside class="sm-aside">
      <div class="sm-tabs" role="tablist">
        <button role="tab" data-tab="drift" class="${S.tab === 'drift' ? 'on' : ''}">Drift <small class="${nDrift ? 'bad' : ''}">${nDrift}</small></button>
        <button role="tab" data-tab="node" class="${S.tab === 'node' ? 'on' : ''}" ${S.node ? '' : 'disabled'}>Node</button>
        <button role="tab" data-tab="flag" class="${S.tab === 'flag' ? 'on' : ''}" ${S.flag ? '' : 'disabled'}>Flag</button>
      </div>
      <div class="sm-panel">${S.tab === 'node' && S.node ? nodePanel(G.nodes.get(S.node)) : S.tab === 'flag' && S.flag ? flagPanel(S.flag) : driftPanel()}</div>
    </aside>
  </div>
  ${sideList()}`;
  bind();
  if (S.view === 'graph') drawGraph();
  else if (S.node) { const c = root.querySelector(`.sm-row[data-node="${CSS.escape(S.node)}"]`); if (c) c.classList.add('sel'); }
}

function legend() {
  return `<div class="sm-legend" aria-label="Legend">
    <span><svg width="34" height="10"><line x1="1" y1="5" x2="33" y2="5" class="e-go"/></svg>go, call</span>
    <span><svg width="34" height="10"><line x1="1" y1="5" x2="33" y2="5" class="e-choice"/></svg>choice (with its text)</span>
    <span><svg width="34" height="10"><line x1="1" y1="5" x2="33" y2="5" class="e-unlock"/></svg>sets a flag the next trigger needs</span>
    <span><svg width="34" height="10"><line x1="1" y1="5" x2="33" y2="5" class="e-next"/></svg>next place, engine event</span>
    ${G.places.map((p) => `<span><i class="sm-sw" style="background:var(--sm-${p.id})"></i>${esc(PLACE_NAME[p.id])}</span>`).join('')}
    <span><i class="sm-sw sm-sw-bad"></i>drift</span></div>`;
}

function badges(n) {
  const b = [];
  if (n.exit === 'next') b.push(`<span class="b b-next">to ${esc(PLACE_NAME[G.engine.next[n.place]] || G.engine.next[n.place])}</span>`);
  if (n.exit === 'end') b.push(`<span class="b b-end">day ends</span>`);
  for (const p of n.periods) b.push(`<span class="b b-per">${esc(PERIOD_NAME[p] || p)}</span>`);
  for (const t of n.teaches) b.push(`<span class="b b-word" title="${esc(t.how)}">${esc(t.word)}</span>`);
  const sets = flagsSetBy(n).filter((f) => f !== 'period' && !/^typed_/.test(f));
  for (const f of sets.slice(0, 3)) b.push(`<span class="b b-set${S.flag === f ? ' hl' : ''}">+${esc(f)}</span>`);
  if (sets.length > 3) b.push(`<span class="b">+${sets.length - 3}</span>`);
  for (const d of driftOf(n.id)) b.push(`<span class="b b-bad">${esc(d)}</span>`);
  return b.join('');
}
function cardHTML(n) {
  const e = n.entries[0];
  const trig = n.transition ? `${PLACE_NAME[n.transition.from]} to ${PLACE_NAME[n.transition.to]}` : e ? trigLabel(e) + (n.entries.length > 1 ? ` +${n.entries.length - 1}` : '') : G.edges.some((x) => x.to === n.id && x.kind !== 'unlock') ? 'reached by a jump' : 'nothing leads here';
  const cond = e && e.cond && !n.transition ? ` · if ${e.cond}` : '';
  const f = n.first;
  const first = f ? `${f.who ? `<b>${esc(f.name || speakerName(n.place, f.who))}</b> ` : ''}${f.overheard ? '<span class="jp">' : ''}${words(esc(short(f.text, 110)))}${f.overheard ? '</span>' : ''}` : `<span class="muted">${n.lines ? '' : 'no lines'}${n.hooks.size ? ' · ' + esc([...n.hooks].slice(0, 4).join(', ')) : ''}</span>`;
  return `<div class="t"><span class="nm">${esc(n.transition ? TRANS_NAME[n.name] || n.name : n.name)}</span><span class="ct">${n.lines ? n.lines + ' ln' : ''}</span></div>
    <div class="tr" title="${esc(trig + cond)}">${esc(trig)}<span class="cd">${esc(cond)}</span></div>
    <div class="ln">${first}</div>
    <div class="bs">${badges(n)}</div>`;
}
function cls(n) {
  const c = ['sm-node'];
  if (!n.reachable) c.push('unreach');
  if (driftOf(n.id).length) c.push('drift');
  if (n.side) c.push('side');
  if (S.node === n.id) c.push('sel');
  if (S.flag) {
    const F = G.flags.get(S.flag);
    const sets = F && F.set.some((s) => s.node === n.id), reads = F && F.read.some((r) => r.node === n.id);
    if (sets) c.push('fl-set'); if (reads) c.push('fl-read'); if (!sets && !reads) c.push('dim');
  }
  return c.join(' ');
}

// ------------------------------------------------------------------ graph
function drawGraph() {
  const inner = root.querySelector('.sm-inner'), canvas = root.querySelector('.sm-canvas');
  const nodes = nodesIn(), ids = new Set(nodes.map((n) => n.id));
  const g = new window.dagre.graphlib.Graph({ multigraph: true });
  g.setGraph({ rankdir: 'TB', nodesep: 22, ranksep: 46, edgesep: 8, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of nodes) g.setNode(n.id, { width: W, height: H });
  const edges = G.edges.filter((e) => ids.has(e.from) && ids.has(e.to) && (S.unlock || e.kind !== 'unlock' || (S.flag && e.labels.includes(S.flag))));
  // flag links shape the layout less than real jumps
  edges.forEach((e, i) => {
    const lab = e.kind === 'choice' ? short(e.labels[0] || '', 30) : e.kind === 'unlock' ? short(e.labels.join(', '), 26) : '';
    g.setEdge(e.from, e.to, { weight: e.kind === 'unlock' ? 1 : e.kind === 'next' ? 6 : 3, minlen: 1, width: lab ? Math.min(190, lab.length * 6.2 + 10) : 0, height: lab ? 16 : 0, labelpos: 'c', lab, e }, 'e' + i);
  });
  window.dagre.layout(g);
  const gw = g.graph().width, gh = g.graph().height;
  const pts = (p) => { let d = `M${p[0].x},${p[0].y}`; if (p.length === 2) return d + ` L${p[1].x},${p[1].y}`; for (let i = 1; i < p.length - 1; i++) { const m = { x: (p[i].x + p[i + 1].x) / 2, y: (p[i].y + p[i + 1].y) / 2 }; d += ` Q${p[i].x},${p[i].y} ${i === p.length - 2 ? p[i + 1].x + ',' + p[i + 1].y : m.x + ',' + m.y}`; } return d; };
  let svg = `<svg class="sm-edges" width="${gw}" height="${gh}" viewBox="0 0 ${gw} ${gh}" aria-hidden="true"><defs>
    ${['go', 'choice', 'unlock', 'next'].map((k) => `<marker id="ar-${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,1 L9,5 L0,9 z" class="m-${k}"/></marker>`).join('')}</defs>`;
  const labels = [];
  for (const ek of g.edges()) {
    const d = g.edge(ek), e = d.e;
    const k = e.kind === 'call' ? 'go' : e.kind === 'event' ? 'next' : e.kind;
    const hl = S.flag && e.kind === 'unlock' && e.labels.includes(S.flag) ? ' hl' : S.flag ? ' dimmed' : '';
    const sel = S.node && (e.from === S.node || e.to === S.node) ? ' sel' : '';
    svg += `<path d="${pts(d.points)}" class="e-${k}${e.call ? ' call' : ''}${hl}${sel}" marker-end="url(#ar-${k})"><title>${esc(`${e.from} → ${e.to} (${e.kind}${e.labels.length ? ': ' + e.labels.join(', ') : ''})`)}</title></path>`;
    if (d.lab) labels.push(`<div class="sm-elab l-${k}${hl}${sel}" style="left:${d.x}px;top:${d.y}px" title="${esc(e.labels.join(', '))}">${esc(d.lab)}</div>`);
  }
  svg += '</svg>';
  const cards = nodes.map((n) => { const p = g.node(n.id); return `<button class="${cls(n)}" data-node="${esc(n.id)}" style="left:${p.x - W / 2}px;top:${p.y - H / 2}px;--pc:var(--sm-${n.place})">${cardHTML(n)}</button>`; }).join('');
  inner.style.width = gw + 'px'; inner.style.height = gh + 'px';
  inner.innerHTML = svg + labels.join('') + cards;
  S.gw = gw; S.gh = gh;
  // readable by default: fit the width only when that keeps the cards legible, else start at the place's start node
  if (S.zoom === null) S.zoom = Math.min(1, Math.max(0.8, (canvas.clientWidth - 8) / gw));
  applyZoom();
  const first = G.places.find((p) => S.place === 'all' || p.id === S.place);
  const focus = S.node || (first && first.start ? `${first.id}:${first.start}` : null);
  const el = focus && inner.querySelector(`[data-node="${CSS.escape(focus)}"]`);
  if (el) { center(el); if (!S.node) canvas.scrollTop = Math.max(0, parseFloat(el.style.top) * S.zoom - 24); }
}
function applyZoom() {
  const inner = root.querySelector('.sm-inner'), sizer = root.querySelector('.sm-canvas');
  if (!inner) return;
  inner.style.transform = `scale(${S.zoom})`;
  inner.parentElement.style.width = S.gw * S.zoom + 'px';
  inner.parentElement.style.height = S.gh * S.zoom + 'px';
  sizer.dataset.zoom = Math.round(S.zoom * 100);
}
function center(el) {
  const c = root.querySelector('.sm-canvas');
  const x = (parseFloat(el.style.left) + W / 2) * S.zoom, y = (parseFloat(el.style.top) + H / 2) * S.zoom;
  c.scrollTo({ left: x - c.clientWidth / 2, top: y - c.clientHeight / 2 });
}

// ------------------------------------------------------------------ list
function listView() {
  const byPlace = {};
  for (const n of nodesIn()) (byPlace[n.place] = byPlace[n.place] || []).push(n);
  const order = [...G.places.map((p) => p.id), 'transitions'];
  return `<div class="sm-list">${order.filter((p) => byPlace[p]).map((p) => `<section><h2>${esc(PLACE_NAME[p])} <small>${byPlace[p].length}</small></h2>
    ${byPlace[p].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)).map((n) => `<button class="${cls(n)} sm-row" data-node="${esc(n.id)}" style="--pc:var(--sm-${n.place})">${cardHTML(n)}</button>`).join('')}</section>`).join('')}</div>`;
}
function sideList() {
  const side = [...G.nodes.values()].filter((n) => n.side && (S.place === 'all' || n.place === S.place));
  if (!side.length || S.side) return '';
  const by = {};
  for (const n of side) (by[n.place] = by[n.place] || []).push(n);
  return `<details class="sm-sidetalk"><summary>Side talk not drawn: ${side.length} small replies that change nothing the story reads</summary>
    ${Object.entries(by).map(([p, list]) => `<div><b>${esc(PLACE_NAME[p])}</b> ${list.map((n) => `<button class="sm-chip" data-node="${esc(n.id)}" title="${esc(n.entries.map(trigLabel).join(', '))}">${esc(n.name)}</button>`).join('')}</div>`).join('')}</details>`;
}

// ------------------------------------------------------------------ panels
const nodeLink = (id, label) => { const n = G.nodes.get(id); return `<button class="sm-link" data-node="${esc(id)}">${esc(label || (n ? (n.place !== S.place && S.place !== 'all' ? `${PLACE_NAME[n.place]}: ` : '') + (n.transition ? TRANS_NAME[n.name] || n.name : n.name) : id))}</button>`; };
const flagLink = (f) => `<button class="sm-flaglink${S.flag === f ? ' on' : ''}" data-setflag="${esc(f)}">${esc(f)}</button>`;
const srcLink = (n) => (n.line || n.place) ? `<a class="src" href="#src/${esc(n.transition ? 'game3d/story/transitions.js' : `game3d/story/${n.place}.js`)}${n.line ? ':' + n.line : ''}">${esc(n.transition ? 'transitions.js' : n.place + '.js')}${n.line ? ':' + n.line : ''}</a>` : '';

function driftPanel() {
  const D = G.drift;
  const sec = (title, help, rows) => `<section class="sm-dr"><h3>${esc(title)} <small class="${rows.length ? 'bad' : 'ok'}">${rows.length}</small></h3><p class="muted small">${esc(help)}</p>${rows.length ? `<ul>${rows.join('')}</ul>` : '<p class="small ok">None.</p>'}</section>`;
  return `
    ${G.errors.length ? sec('Files that did not load', 'The map can only show what loads.', G.errors.map((e) => `<li>${esc(e)}</li>`)) : ''}
    ${D.missing.length || D.badConds.length ? sec('Broken references', 'Jumps or triggers to nodes that do not exist, and conditions that do not parse.', [...D.missing.map((m) => `<li>${esc(m.place)} ${esc(m.where)} → <code>${esc(m.to)}</code></li>`), ...D.badConds.map((c) => `<li>${esc(c.where)}: <code>${esc(c.cond)}</code> ${esc(c.why)}</li>`)]) : ''}
    ${sec('Unreachable nodes', 'No start, trigger, go or call leads to them (or only triggers that can never run).', D.unreachable.map((u) => `<li>${nodeLink(u.node, u.node)}<span class="why">${esc(u.why)}</span></li>`))}
    ${sec('Triggers that can never run', 'An entry needs a flag nothing sets, contradicts the entries before it, or sits behind an entry that always matches.', D.blocked.map((b) => `<li>${nodeLink(b.node, b.node)} <code>${esc(b.trigger)}</code><span class="why">${esc(b.why)}</span></li>`))}
    ${sec('Flags read but never set', 'A condition waits on a flag no story step or engine file sets.', D.readNeverSet.map((f) => `<li>${flagLink(f.flag)}<span class="why">read at ${f.read.map((r) => r.node ? nodeLink(r.node, r.node) : esc(`${r.place} ${r.where}`)).join(', ')}</span></li>`))}
    ${sec('Dead ends', 'A node that leaves an empty goal line and opens nothing next, or a place with no way on.', D.deadEnds.map((d) => `<li>${G.nodes.has(d.node) ? nodeLink(d.node, d.node) : esc(d.node)}<span class="why">${esc(d.why)}</span></li>`))}
    ${sec('Flags set but never read', 'Not a bug by itself: nothing checks them yet.', D.setNeverRead.map((f) => `<li>${flagLink(f.flag)}<span class="why">set in ${[...new Set(f.set.map((s) => s.node))].map((id) => nodeLink(id, id)).join(', ')}</span></li>`))}
    <p class="muted small">Counted by <code>bible/story-graph.js</code>; <code>node tools/bible/story-map-check.mjs</code> prints the same list.</p>`;
}

function stepsHTML(n, list, depth = 0) {
  if (!Array.isArray(list)) return '';
  return list.map((s) => {
    const ln = lineOf(s);
    if (ln) {
      if (!ln.who) return `<div class="sx nar">${words(esc(ln.text))}</div>`;
      const who = ln.name || speakerName(n.place, ln.who);
      return `<div class="sx say${ln.who === 'eric' ? ' me' : ''}"><b>${esc(who)}</b>${ln.overheard ? '<span class="oh">overheard</span>' : ''}<span class="${ln.overheard ? 'jp' : ''}">${words(esc(ln.text))}</span></div>`;
    }
    if (!s || typeof s !== 'object') return '';
    const bits = [];
    if (s.choice) bits.push(`<div class="sx ch">${s.prompt ? `<div class="muted small">${esc(s.prompt)}</div>` : ''}${s.choice.map((o) => `<div class="opt"><span class="q">${esc(o.text)}</span>${o.if ? `<code class="if">if ${esc(o.if)}</code>` : ''}${o.set ? ` <span class="b b-set">+${esc(typeof o.set === 'string' ? o.set : Object.keys(o.set).join(', '))}</span>` : ''}${o.go ? ` → ${nodeLink(`${n.place}:${o.go}`, o.go)}` : ''}${o.call ? ` calls ${nodeLink(`${n.place}:${o.call}`, o.call)}` : ''}</div>`).join('')}</div>`);
    if (s.offer) bits.push(`<div class="sx say"><b>${esc(s.line || '')}</b> <span class="b b-word">offers ${esc(s.offer)}</span></div>`);
    if (s.learn) bits.push(`<div class="sx act"><span class="b b-word">learns ${esc(s.learn)}</span></div>`);
    if (s.set !== undefined) bits.push(`<div class="sx act">set ${(typeof s.set === 'string' ? [s.set] : Object.keys(s.set)).map(flagLink).join(' ')}</div>`);
    if (s.unset) bits.push(`<div class="sx act">unset ${flagLink(s.unset)}</div>`);
    if (s.inc) bits.push(`<div class="sx act">add 1 to ${flagLink(s.inc)}</div>`);
    if (s.if !== undefined && (s.then || s.else)) bits.push(`<div class="sx if"><code>if ${esc(s.if)}</code><div class="br">${stepsHTML(n, s.then || [], depth + 1)}</div>${s.else ? `<code>else</code><div class="br">${stepsHTML(n, s.else, depth + 1)}</div>` : ''}</div>`);
    if (s.go) bits.push(`<div class="sx jump">go → ${nodeLink(`${n.place}:${s.go}`, s.go)}</div>`);
    if (s.call) bits.push(`<div class="sx jump">call ${nodeLink(`${n.place}:${s.call}`, s.call)}, then carry on</div>`);
    if (s.wait) bits.push(`<div class="sx act">wait ${esc(s.wait)} ms</div>`);
    if (s.do) {
      const d = s.do;
      if (d === 'type') bits.push(`<div class="sx act"><span class="b b-word">types ${esc(s.word)}</span> ${s.prompt ? esc(s.prompt) : ''}</div>`);
      else if (d === 'goal') bits.push(`<div class="sx goal">goal: ${s.text ? esc(s.text) : '<i>cleared</i>'}${s.side ? ' (side)' : ''}</div>`);
      else if (d === 'next') bits.push(`<div class="sx jump">next place: ${esc(PLACE_NAME[G.engine.next[n.place]] || 'none')}</div>`);
      else if (d === 'end') bits.push(`<div class="sx jump">end card: the day ends</div>`);
      else if (d === 'period') bits.push(`<div class="sx goal">period: ${esc(PERIOD_NAME[s.to] || s.to)}</div>`);
      else { const args = Object.entries(s).filter(([k]) => k !== 'do').map(([k, v]) => `${k} ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(', '); bits.push(`<div class="sx hook">${esc(d)}${args ? ` <span>${esc(short(args, 80))}</span>` : ''}</div>`); }
    }
    if (s.end) bits.push(`<div class="sx jump">stop here</div>`);
    return bits.join('');
  }).join('');
}

function nodePanel(n) {
  if (!n) return `<p class="muted">No node called ${esc(S.node)} in the story files.</p>`;
  const inc = G.edges.filter((e) => e.to === n.id), out = G.edges.filter((e) => e.from === n.id);
  const edgeRow = (e, other) => `<li><span class="k k-${e.kind}">${esc(e.kind === 'unlock' ? 'flag' : e.kind)}</span>${nodeLink(other)}${e.labels.length ? `<span class="why">${e.kind === 'unlock' ? e.labels.map(flagLink).join(' ') : esc(e.labels.join(', '))}</span>` : ''}</li>`;
  const reads = readsOf(n), sets = [...new Set(n.sets.map((s) => (s.how === 'unset' ? '-' : '') + s.flag))];
  const dr = G.drift;
  const why = [...dr.unreachable, ...dr.blocked, ...dr.deadEnds].filter((x) => x.node === n.id).map((x) => x.why);
  return `<div class="sm-nh"><span class="pl" style="--pc:var(--sm-${n.place})">${esc(PLACE_NAME[n.place])}</span><h3>${esc(n.transition ? TRANS_NAME[n.name] || n.name : n.name)}</h3>${srcLink(n)}</div>
    ${why.length ? `<div class="sm-err small">${why.map(esc).join('<br>')}</div>` : ''}
    <div class="bs">${badges(n)}</div>
    <h4>Runs when</h4><ul class="sm-ul">${n.entries.length ? n.entries.map((e) => `<li><code>${esc(e.trigger)}</code>${e.cond ? ` if <code>${esc(e.cond)}</code>` : ''}${e.of > 1 ? `<span class="why">entry ${e.index + 1} of ${e.of}: earlier entries must not match${e.req && e.req.size ? `; needs ${[...e.req].map(([f, v]) => (v ? '' : '!') + f).join(', ')}` : ''}</span>` : e.req && e.req.size ? `<span class="why">needs ${[...e.req].map(([f, v]) => (v ? '' : '!') + f).join(', ')}</span>` : ''}${e.firedBy ? `<span class="why">fired by ${esc(e.firedBy)}</span>` : ''}${e.once ? ' <span class="b">once</span>' : ''}${!e.ok ? `<span class="why bad">${esc(e.why)}</span>` : ''}</li>`).join('') : '<li class="muted">Only through the jumps below.</li>'}</ul>
    ${inc.length ? `<h4>Comes from</h4><ul class="sm-ul">${inc.map((e) => edgeRow(e, e.from)).join('')}</ul>` : ''}
    ${out.length ? `<h4>Leads to</h4><ul class="sm-ul">${out.map((e) => edgeRow(e, e.to)).join('')}</ul>` : ''}
    ${sets.length || reads.length ? `<h4>Flags</h4><p class="sm-fl">${sets.length ? `sets ${sets.map((f) => f.startsWith('-') ? 'unsets ' + flagLink(f.slice(1)) : flagLink(f)).join(' ')}` : ''}${reads.length ? `<br>reads ${reads.map(flagLink).join(' ')}` : ''}</p>` : ''}
    <h4>Script</h4><div class="sm-script">${stepsHTML(n, n.steps) || '<p class="muted small">No steps.</p>'}</div>`;
}

function flagPanel(f) {
  const F = G.flags.get(f);
  if (!F) return `<p class="muted">No flag called <code>${esc(f)}</code> in the story files.</p>`;
  const setRows = F.set.map((s) => `<li>${nodeLink(s.node, s.node)} <span class="k">${esc(s.how)}</span>${s.choice ? `<span class="why">choice “${esc(short(s.choice, 50))}”</span>` : ''}${s.cond ? `<span class="why">when ${esc(s.cond)}</span>` : ''}</li>`);
  const readRows = F.read.map((r) => `<li>${r.node ? nodeLink(r.node, r.node) : esc(r.place)} <code>${esc(r.where)}</code><span class="why">${esc(r.cond)}</span></li>`);
  return `<div class="sm-nh"><h3><code>${esc(f)}</code></h3></div>
    ${F.engine ? `<p class="small">Also set by the engine: ${F.engine.map((p) => `<a class="src" href="#src/${esc(p)}">${esc(p)}</a>`).join(', ')}</p>` : ''}
    <h4>Set by <small>${F.set.length}</small></h4><ul class="sm-ul">${setRows.join('') || `<li class="${F.engine ? 'muted' : 'bad'}">${F.engine ? 'Only the engine.' : 'Nothing sets it.'}</li>`}</ul>
    <h4>Read by <small>${F.read.length}</small></h4><ul class="sm-ul">${readRows.join('') || '<li class="muted">Nothing reads it.</li>'}</ul>`;
}

// ------------------------------------------------------------------ events
function bind() {
  root.onclick = (ev) => {
    const t = ev.target.closest('button, a');
    if (!t || !root.contains(t)) return;
    if (t.dataset.place) { S.place = t.dataset.place; S.zoom = null; setHash(); render(); return; }
    if (t.dataset.view) { S.view = t.dataset.view; S.zoom = null; render(); return; }
    if (t.dataset.tab) { S.tab = t.dataset.tab; render(); return; }
    if (t.dataset.zoom) { S.zoom = t.dataset.zoom === 'fit' ? Math.max(0.2, Math.min(1.4, (root.querySelector('.sm-canvas').clientWidth - 8) / S.gw)) : Math.max(0.2, Math.min(1.6, S.zoom * (t.dataset.zoom === '+' ? 1.2 : 1 / 1.2))); applyZoom(); return; }
    if (t.dataset.setflag) { S.flag = S.flag === t.dataset.setflag && S.tab === 'flag' ? null : t.dataset.setflag; S.tab = S.flag ? 'flag' : 'drift'; S.unlock = true; render(); return; }
    if ('flagclear' in t.dataset) { S.flag = null; if (S.tab === 'flag') S.tab = S.node ? 'node' : 'drift'; render(); return; }
    if (t.dataset.node) {
      const id = t.dataset.node, n = G.nodes.get(id);
      if (!n) return;
      S.node = id; S.tab = 'node';
      // a node outside the current filter: switch to its place so it can be seen
      if (S.place !== 'all' && n.place !== S.place && !(n.transition && (n.transition.from === S.place || n.transition.to === S.place))) { S.place = n.place === 'transitions' ? n.transition.from : n.place; S.zoom = null; }
      setHash(); render();
      const inCanvas = t.closest('.sm-canvas, .sm-list');
      if (!inCanvas || matchMedia('(max-width: 1100px)').matches) root.querySelector('.sm-aside').scrollIntoView({ block: 'start', behavior: 'auto' });
      return;
    }
  };
  root.onchange = (ev) => {
    const t = ev.target;
    if (t.dataset.opt) { S[t.dataset.opt] = t.checked; render(); return; }
    if ('flag' in t.dataset) { const v = t.value.trim(); S.flag = G.flags.has(v) ? v : null; S.tab = S.flag ? 'flag' : (S.node ? 'node' : 'drift'); render(); }
  };
  // ctrl/cmd + wheel zooms the graph around the view; plain wheel scrolls
  const c = root.querySelector('.sm-canvas');
  if (c) c.addEventListener('wheel', (ev) => { if (!ev.ctrlKey && !ev.metaKey) return; ev.preventDefault(); S.zoom = Math.max(0.2, Math.min(1.6, S.zoom * (ev.deltaY < 0 ? 1.1 : 1 / 1.1))); applyZoom(); }, { passive: false });
  // drag to pan with a mouse
  if (c) c.addEventListener('pointerdown', (ev) => { if (ev.pointerType !== 'mouse' || ev.button !== 0 || ev.target.closest('.sm-node')) return; drag = { c, x: ev.clientX, y: ev.clientY, l: c.scrollLeft, t: c.scrollTop }; c.classList.add('drag'); });
}
let drag = null;
window.addEventListener('pointermove', (ev) => { if (!drag) return; drag.c.scrollLeft = drag.l - (ev.clientX - drag.x); drag.c.scrollTop = drag.t - (ev.clientY - drag.y); });
window.addEventListener('pointerup', () => { if (drag) drag.c.classList.remove('drag'); drag = null; });
// keep the parser reachable for the console: StoryMap.parseCond('a && !b')
window.StoryMap = { get graph() { return G; }, parseCond };
