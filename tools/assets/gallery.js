// The asset gallery: reads assets.json (written by scan.py) and shows every asset with its status, where the status
// comes from, how it was made and where the game uses it. 3D models open in a turntable built by the game's own
// code (viewer.js); audio plays in place. Filters and the open asset live in the URL hash, so a view can be linked.
const $ = (s, el = document) => el.querySelector(s);
const R = (p) => (/^https?:/.test(p) ? p : '../../' + p);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const STATUS_LABEL = { approved: 'Approved', provisional: 'Provisional', candidate: 'Candidate', legacy: 'Legacy', rejected: 'Rejected' };
const STATUS_NOTE = {
  approved: 'Jørgen picked it', provisional: 'In the game, not approved yet', candidate: 'Waiting for a pick',
  legacy: 'From an earlier version', rejected: 'Not picked or turned down',
};
const is3d = (v) => ['meshy', 'mio', 'glb', 'chibi', 'kit', 'room'].includes(v && v.type);

let D, all = [], shown = [];
const F = { status: new Set(), kind: new Set(), who: '', place: '', q: '', sort: 'kind' };

// ------------------------------------------------------------------ state in the URL hash
function readHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  F.status = new Set((h.get('status') || '').split(',').filter(Boolean));
  F.kind = new Set((h.get('kind') || '').split(',').filter(Boolean));
  F.who = h.get('who') || ''; F.place = h.get('place') || ''; F.q = h.get('q') || ''; F.sort = h.get('sort') || 'kind';
  return h.get('a');
}
function writeHash(open) {
  const h = new URLSearchParams();
  if (F.status.size) h.set('status', [...F.status].join(','));
  if (F.kind.size) h.set('kind', [...F.kind].join(','));
  for (const k of ['who', 'place', 'q']) if (F[k]) h.set(k, F[k]);
  if (F.sort !== 'kind') h.set('sort', F.sort);
  if (open) h.set('a', open);
  const s = h.toString();
  history.replaceState(null, '', s ? '#' + s : location.pathname + location.search);
}

// ------------------------------------------------------------------ filtering
function hay(e) {
  return (e._hay = e._hay || [e.id, e.name, e.kind, e.status, e.who, D.names[e.who], e.place, e.source, e.text, e.note, ...(e.used || []), ...(e.paths || []), ...(e.tags || [])].join(' ').toLowerCase());
}
function matches(e, skip) {
  if (skip !== 'status' && F.status.size && !F.status.has(e.status)) return false;
  if (skip !== 'kind' && F.kind.size && !F.kind.has(e.kind)) return false;
  if (skip !== 'who' && F.who && e.who !== F.who) return false;
  if (skip !== 'place' && F.place && e.place !== F.place) return false;
  if (F.q) for (const w of F.q.toLowerCase().split(/\s+/).filter(Boolean)) if (!hay(e).includes(w)) return false;
  return true;
}
const KORDER = () => Object.keys(D.kinds);
function sortList(list) {
  const ko = KORDER(), so = D.statuses;
  const by = {
    kind: (a, b) => ko.indexOf(a.kind) - ko.indexOf(b.kind) || so.indexOf(a.status) - so.indexOf(b.status) || (a.who || '~').localeCompare(b.who || '~') || a.id.localeCompare(b.id),
    status: (a, b) => so.indexOf(a.status) - so.indexOf(b.status) || ko.indexOf(a.kind) - ko.indexOf(b.kind) || a.id.localeCompare(b.id),
    name: (a, b) => a.name.localeCompare(b.name),
    who: (a, b) => (D.names[a.who] || a.who || '~').localeCompare(D.names[b.who] || b.who || '~') || ko.indexOf(a.kind) - ko.indexOf(b.kind) || a.id.localeCompare(b.id),
  }[F.sort] || (() => 0);
  return list.sort(by);
}

// ------------------------------------------------------------------ filter panel
function renderFilters() {
  const count = (key, val) => all.filter((e) => e[key] === val && matches(e, key)).length;
  $('#fStatus').innerHTML = D.statuses.map((s) => `<button type="button" class="opt" data-f="status" data-v="${s}" aria-pressed="${F.status.has(s)}">
    <span class="box"></span><span class="dot" style="background:var(--s-${s})"></span>${STATUS_LABEL[s]}<span class="n">${count('status', s)}</span></button>`).join('');
  $('#fKind').innerHTML = Object.entries(D.kinds).map(([k, label]) => `<button type="button" class="opt" data-f="kind" data-v="${k}" aria-pressed="${F.kind.has(k)}">
    <span class="box"></span>${esc(label)}<span class="n">${count('kind', k)}</span></button>`).join('');
  const whos = [...new Set(all.map((e) => e.who).filter(Boolean))].sort((a, b) => (D.names[a] || a).localeCompare(D.names[b] || b));
  $('#fWho').innerHTML = '<option value="">Everyone</option>' + whos.map((w) => `<option value="${esc(w)}"${F.who === w ? ' selected' : ''}>${esc(D.names[w] || w)} (${count('who', w)})</option>`).join('');
  $('#fPlace').innerHTML = '<option value="">Every place</option>' + Object.entries(D.places).map(([p, label]) => `<option value="${p}"${F.place === p ? ' selected' : ''}>${esc(label)} (${count('place', p)})</option>`).join('');
  const n = F.status.size + F.kind.size + (F.who ? 1 : 0) + (F.place ? 1 : 0);
  $('#fcount').textContent = n || '';
  $('#doneSide').textContent = `Show ${shown.length} asset${shown.length === 1 ? '' : 's'}`;
}

// ------------------------------------------------------------------ grid
const PAGE = 120;
let limit = PAGE;
function thumbHTML(e) {
  if (e.kind === 'icon' && e.svg) return `<div class="thumb icon">${e.svg}</div>`;
  if (e.view && e.view.type === 'audio') {
    return `<div class="thumb">${e.thumb ? `<img src="${R(e.thumb)}" alt="" loading="lazy">` : ''}<button type="button" class="play" data-play="${esc(e.id)}" aria-label="Play ${esc(e.name)}"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg></button></div>`;
  }
  if (e.thumb) return `<div class="thumb"><img src="${R(e.thumb)}" alt="" loading="lazy">${is3d(e.view) ? '<span class="badge3d">3D</span>' : ''}</div>`;
  const glyph = { style: 'Aa', model: '3D', prop: '3D', room: '3D', animation: '3D' }[e.kind] || '·';
  return `<div class="thumb none"><div><b>${glyph}</b>${esc(e.note ? e.note.slice(0, 90) : (e.paths[0] || '').split('/').pop())}</div></div>`;
}
function cardHTML(e, i) {
  const audio = e.view && e.view.type === 'audio';
  return `<div class="card${audio ? ' audio' : ''}" role="listitem" tabindex="0" data-i="${i}">
    ${thumbHTML(e)}
    <div class="meta"><div class="nm">${esc(e.name)}</div>
      ${audio && e.text && !e.text.startsWith(e.name) ? `<div class="text">${esc(e.text)}</div>` : ''}
      <div class="sub"><span class="pill" style="--c:var(--s-${e.status})">${STATUS_LABEL[e.status]}</span><span>${esc(D.names[e.who] || e.who || D.places[e.place] || D.kinds[e.kind])}</span></div>
    </div></div>`;
}
function render() {
  shown = sortList(all.filter((e) => matches(e)));
  $('#count').textContent = `${shown.length} of ${all.length} assets`;
  $('#empty').hidden = shown.length > 0;
  let html = '', last = null;
  shown.slice(0, limit).forEach((e, i) => {
    const g = F.sort === 'kind' ? D.kinds[e.kind] : F.sort === 'status' ? STATUS_LABEL[e.status] : null;
    if (g && g !== last) { html += `<div class="group">${esc(g)}</div>`; last = g; }
    html += cardHTML(e, i);
  });
  $('#grid').innerHTML = html;
  renderFilters();
}
const moreObs = new IntersectionObserver((xs) => { if (xs.some((x) => x.isIntersecting) && limit < shown.length) { limit += PAGE; render(); } }, { rootMargin: '600px' });

// ------------------------------------------------------------------ audio in place
const player = new Audio();
let playingId = null;
function playAudio(e) {
  document.querySelectorAll('.card.playing').forEach((c) => c.classList.remove('playing'));
  if (playingId === e.id && !player.paused) { player.pause(); playingId = null; return; }
  player.src = R(e.view.src); player.play().catch(() => {}); playingId = e.id;
  const c = document.querySelector(`.card [data-play="${CSS.escape(e.id)}"]`); if (c) c.closest('.card').classList.add('playing');
}
player.addEventListener('ended', () => { playingId = null; document.querySelectorAll('.card.playing').forEach((c) => c.classList.remove('playing')); });

// ------------------------------------------------------------------ detail
let cur = -1, stage = null, stageToken = 0;
function closeStage() { stageToken++; if (stage) { stage.dispose(); stage = null; } }
function fileLinks(paths) { return paths.map((p) => `<a href="${R(p)}" target="_blank" rel="noopener">${esc(p)}</a>`).join(''); }
function whyHTML(sf) {
  if (!sf) return '';
  const src = sf.path ? ` <a href="${R(sf.path)}" target="_blank" rel="noopener">${esc(sf.path)}${sf.line ? ':' + sf.line : ''}</a>` : '';
  return `<div class="why">${esc(sf.text || '')}${src}</div>`;
}
async function openDetail(i) {
  if (i < 0 || i >= shown.length) return;
  closeStage(); player.pause();
  cur = i; const e = shown[i];
  writeHash(e.id);
  $('#detail').hidden = false; document.body.style.overflow = 'hidden';
  $('#dName').textContent = e.name; $('#dId').textContent = e.id;
  const rev = e.review && D.reviews[e.review];
  const rows = [
    ['Status', `<span class="pill" style="--c:var(--s-${e.status})">${STATUS_LABEL[e.status]}</span> <span class="why" style="display:inline">${STATUS_NOTE[e.status]}</span>${whyHTML(e.status_from)}`],
    ['Kind', esc(D.kinds[e.kind])],
    e.who ? ['Character', esc(D.names[e.who] || e.who)] : null,
    e.place ? ['Place', esc(D.places[e.place] || e.place)] : null,
    e.text && e.text !== e.name ? ['Text', esc(e.text)] : null,
    ['Made with', esc(e.source || 'Not recorded')],
    ['Used in', e.used && e.used.length ? `<ul>${e.used.map((u) => `<li>${esc(u)}</li>`).join('')}</ul>` : '<span class="why" style="margin:0">Not used in the game</span>'],
    e.note && e.note !== e.source ? ['Note', esc(e.note)] : null,
    rev ? ['Review', `<a class="revlink" href="../../bible/#review/${esc(e.review)}" target="amakawa-bible">${esc(rev.title)} <span class="pill" style="--c:var(--s-${rev.status === 'open' ? 'candidate' : rev.status === 'decided' ? 'approved' : 'legacy'})">${esc(rev.status)}</span></a>`] : null,
    e.paths.length ? ['Files', `<div class="files">${fileLinks(e.paths)}</div>`] : null,
    e.tags ? ['Tags', esc(e.tags.join(', '))] : null,
  ].filter(Boolean);
  $('#dBody').innerHTML = `<dl class="dl">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
  const P = $('#dPreview');
  const v = e.view || {};
  if (v.type === 'image') P.innerHTML = `<img src="${R(v.src)}" alt="${esc(e.name)}">`;
  else if (v.type === 'audio') {
    P.innerHTML = `<div class="aud">${e.text ? `<div class="line">${esc(e.text)}</div>` : ''}${e.thumb ? `<img src="${R(e.thumb)}" alt="">` : ''}<audio controls preload="metadata" src="${R(v.src)}"></audio></div>`;
    P.querySelector('audio').play().catch(() => {});
  } else if (e.svg) P.innerHTML = `<div class="svgbig">${e.svg}</div>`;
  else if (is3d(v)) {
    P.innerHTML = `<div class="stage"></div><div class="hint">Drag to turn, scroll or pinch to zoom</div><div class="acts"></div>${e.thumb ? `<img class="poster" src="${R(e.thumb)}" alt="" style="position:absolute;max-width:60%;max-height:60%;opacity:.35">` : ''}<div class="loading" style="position:absolute">Loading the model…</div>`;
    const token = ++stageToken;
    try {
      const { buildAsset, Stage } = await import('./viewer.js');
      if (token !== stageToken) return;
      const b = await buildAsset(v);
      if (token !== stageToken) return;
      P.querySelector('.loading')?.remove(); P.querySelector('.poster')?.remove();
      stage = new Stage(P.querySelector('.stage'));
      stage.show(b); stage.start();
      const acts = P.querySelector('.acts');
      if (b.actions.length) {
        let active = b.current;
        const draw = () => { acts.innerHTML = b.actions.map((a) => `<button type="button" data-act="${esc(a.id)}" aria-pressed="${a.id === active}">${esc(a.label)}</button>`).join('') + (b.scene ? '' : `<button type="button" data-act="__spin" aria-pressed="${stage.auto}">Turntable</button>`); };
        draw();
        acts.onclick = (ev) => { const x = ev.target.closest('[data-act]'); if (!x) return; if (x.dataset.act === '__spin') stage.auto = !stage.auto; else { active = x.dataset.act; b.play(active); } draw(); };
      } else if (!b.scene) {
        acts.innerHTML = `<button type="button" data-act="__spin" aria-pressed="true">Turntable</button>`;
        acts.onclick = () => { stage.auto = !stage.auto; acts.firstChild.setAttribute('aria-pressed', stage.auto); };
      }
    } catch (err) {
      if (token === stageToken) P.innerHTML = `<div class="none">The 3D preview failed to load: ${esc(err.message || err)}</div>`;
    }
  } else P.innerHTML = `<div class="none">${esc(e.note || 'No preview for this one. The files are listed on the right.')}</div>`;
  $('#dPrev').disabled = i === 0; $('#dNext').disabled = i === shown.length - 1;
}
function closeDetail() { closeStage(); $('#detail').hidden = true; document.body.style.overflow = ''; $('#dPreview').innerHTML = ''; cur = -1; writeHash(); }

// ------------------------------------------------------------------ events
function bind() {
  $('#side').addEventListener('click', (ev) => {
    const b = ev.target.closest('.opt'); if (!b) return;
    const set = F[b.dataset.f]; set.has(b.dataset.v) ? set.delete(b.dataset.v) : set.add(b.dataset.v);
    limit = PAGE; render(); writeHash();
  });
  $('#fWho').onchange = (ev) => { F.who = ev.target.value; limit = PAGE; render(); writeHash(); };
  $('#fPlace').onchange = (ev) => { F.place = ev.target.value; limit = PAGE; render(); writeHash(); };
  $('#sort').onchange = (ev) => { F.sort = ev.target.value; render(); writeHash(); };
  let t = 0;
  $('#q').oninput = (ev) => { clearTimeout(t); t = setTimeout(() => { F.q = ev.target.value.trim(); limit = PAGE; render(); writeHash(); }, 120); };
  $('#clear').onclick = () => { F.status.clear(); F.kind.clear(); F.who = F.place = F.q = ''; $('#q').value = ''; limit = PAGE; render(); writeHash(); };
  const side = $('#side');
  $('#filtersBtn').onclick = () => { side.classList.add('open'); $('#filtersBtn').setAttribute('aria-expanded', 'true'); };
  $('#closeSide').onclick = $('#doneSide').onclick = () => { side.classList.remove('open'); $('#filtersBtn').setAttribute('aria-expanded', 'false'); };
  $('#grid').addEventListener('click', (ev) => {
    const pb = ev.target.closest('[data-play]');
    if (pb) { ev.stopPropagation(); playAudio(all.find((e) => e.id === pb.dataset.play)); return; }
    const c = ev.target.closest('.card'); if (c) openDetail(+c.dataset.i);
  });
  $('#grid').addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { const c = ev.target.closest('.card'); if (c) { ev.preventDefault(); openDetail(+c.dataset.i); } } });
  $('#dClose').onclick = closeDetail;
  $('#dPrev').onclick = () => openDetail(cur - 1);
  $('#dNext').onclick = () => openDetail(cur + 1);
  $('#detail').addEventListener('click', (ev) => { if (ev.target.id === 'detail') closeDetail(); });
  document.addEventListener('keydown', (ev) => {
    if ($('#detail').hidden) { if (ev.key === '/' && document.activeElement !== $('#q')) { ev.preventDefault(); $('#q').focus(); } return; }
    if (ev.key === 'Escape') closeDetail();
    else if (ev.key === 'ArrowLeft' && !ev.target.closest('input, select')) openDetail(cur - 1);
    else if (ev.key === 'ArrowRight' && !ev.target.closest('input, select')) openDetail(cur + 1);
  });
  moreObs.observe($('#more'));
}

async function boot() {
  try {
    D = await (await fetch('assets.json', { cache: 'no-cache' })).json();
  } catch (err) {
    $('#grid').innerHTML = `<p class="empty">assets.json is missing. Run: python3 tools/assets/scan.py</p>`; return;
  }
  all = D.assets;
  const open = readHash();
  $('#q').value = F.q; $('#sort').value = F.sort;
  const c = D.counts.status;
  $('#gen').textContent = `${all.length} assets, scanned ${new Date(D.generated).toLocaleString()}. ${c.approved || 0} approved, ${c.provisional || 0} provisional, ${c.candidate || 0} candidates.`;
  bind(); render();
  if (open) {
    let i = shown.findIndex((e) => e.id === open);
    if (i < 0) { F.status.clear(); F.kind.clear(); F.who = F.place = F.q = ''; render(); i = shown.findIndex((e) => e.id === open); }
    if (i >= 0) { if (i >= limit) { limit = i + PAGE; render(); } openDetail(i); }
  }
}
boot();
