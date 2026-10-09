// The bible's Asset library (#assets, #asset/<id>): every reusable world piece the game builds in code, so a
// builder looks here before making a new one. Read from tools/assets/kit-library.json, which tools/assets/scan.py
// writes (./start runs it) from the kit files in tools/assets/kit.json; thumbnails come from
// tools/assets/render3d.mjs. Local bible only: the public site has no source to read.

let DATA = null, R = '../';
const F = { family: '', place: '', q: '', dupes: false };

const thumbOf = (v) => v && v.thumb;
const lineLink = (esc, file, line, text) => `<a class="src" href="#src/${esc(file)}:${line}">${esc(text || `${file.replace(/^game3d\/js\//, '')}:${line}`)}</a>`;

async function load(ROOT) {
  const r = await fetch(ROOT + 'tools/assets/kit-library.json', { cache: 'no-cache' });
  if (!r.ok) throw new Error('tools/assets/kit-library.json is missing: run ./start, or python3 tools/assets/scan.py');
  DATA = await r.json();
  DATA.byId = new Map(DATA.pieces.map((e) => [e.piece.id, e]));
  DATA.dupeById = new Map(DATA.dupes.map((d) => [d.id, d]));
  return DATA;
}

function swatches(esc, pal) {
  return `<div class="aswatch">${Object.entries(pal).map(([k, c]) => `<span title="${esc(k)} ${esc(c)}"><i style="background:${esc(c)}"></i>${esc(k)}</span>`).join('')}</div>`;
}

function card(esc, e) {
  const p = e.piece, v = e.variants || [];
  const img = thumbOf(v[0]);
  const ph = img ? `<img src="${R}${esc(img)}" alt="" loading="lazy" decoding="async">`
    : p.palette ? swatches(esc, p.palette) : `<span class="acode">${esc(p.kind === 'const' ? 'data' : 'code only')}</span>`;
  const n = p.places.length;
  return `<a class="acard" href="#asset/${esc(p.id)}">
    <div class="aph">${ph}${v.length > 1 ? `<span class="avn">${v.length} variants</span>` : ''}</div>
    <div class="abody"><b>${esc(e.name)}</b><code>${esc(p.name)}</code>
      <span class="ameta">${n ? `${n} place${n > 1 ? 's' : ''}` : p.usedSelf ? 'only in its own file' : '<span class="st rejected">unused</span>'}
      ${p.dupes.length ? '<span class="st review">built elsewhere too</span>' : ''}</span></div></a>`;
}

function dupeBlock(esc, d, open = false) {
  const shared = d.shared.map((id) => DATA.byId.get(id)).filter(Boolean);
  return `<details class="adupe"${open ? ' open' : ''}><summary><b>${esc(d.title)}</b> <span class="muted">${d.copies.length} other copies, about ${d.lines} lines to merge</span></summary>
    <div class="inner">${shared.length ? `<p class="small">Shared piece: ${shared.map((e) => `<a href="#asset/${esc(e.piece.id)}">${esc(e.name)}</a>`).join(', ')}</p>` : '<p class="small">No shared piece yet.</p>'}
    <ul class="acopies">${d.copies.map((c) => `<li>${lineLink(esc, c.file, c.line)}${c.fn ? ` <code>${esc(c.fn)}</code>` : ''} <span class="muted">${esc(c.note || '')}</span></li>`).join('')}</ul></div></details>`;
}

function listHtml(esc) {
  const fams = DATA.families;
  const shown = DATA.pieces.filter((e) => {
    const p = e.piece;
    if (F.family && p.family !== F.family) return false;
    if (F.place && !p.places.includes(F.place)) return false;
    if (F.dupes && !p.dupes.length) return false;
    if (F.q) {
      const hay = `${e.name} ${p.name} ${e.paths.join(' ')} ${p.doc} ${p.places.join(' ')}`.toLowerCase();
      if (!F.q.toLowerCase().split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  });
  const groups = fams.map(([id, label, about]) => {
    const list = shown.filter((e) => e.piece.family === id);
    return list.length ? `<section class="afam" id="fam-${esc(id)}"><h2>${esc(label)} <span class="muted">(${list.length})</span></h2><p class="muted small">${esc(about)}</p>
      <div class="agrid">${list.map((e) => card(esc, e)).join('')}</div></section>` : '';
  }).join('');
  return groups || '<p>Nothing matches.</p>';
}

function filtersHtml(esc) {
  const places = [...new Set(DATA.pieces.flatMap((e) => e.piece.places))].sort();
  const btn = (v, label) => `<button type="button" data-af="family" data-v="${esc(v)}" class="${F.family === v ? 'on' : ''}">${esc(label)}</button>`;
  return `<div class="afilters">${btn('', 'All')}${DATA.families.map(([id, label]) => btn(id, label)).join('')}</div>
    <div class="afilters arow"><input type="search" data-af="q" placeholder="Search pieces" value="${esc(F.q)}" aria-label="Search pieces">
      <select data-af="place" aria-label="Used in place"><option value="">Used anywhere</option>${places.map((p) => `<option${F.place === p ? ' selected' : ''}>${esc(p)}</option>`).join('')}</select>
      <label class="acheck"><input type="checkbox" data-af="dupes"${F.dupes ? ' checked' : ''}> Built elsewhere too</label></div>`;
}

function pageList(esc) {
  const nv = DATA.pieces.reduce((a, e) => a + (e.variants || []).length, 0);
  const lines = DATA.dupes.reduce((a, d) => a + d.lines, 0);
  const dupes = [...DATA.dupes].sort((a, b) => b.copies.length - a.copies.length);
  return `<h1>Asset library</h1>
    <p class="lede">The world pieces the game builds in code: benches, lamps, trees, kerbs, paving, roofs, doors and the rest, with where each one is used. Look here before building something new. If a piece is close, use it or add a variant to it rather than copying it into a scene.</p>
    <p class="small muted">${DATA.pieces.length} pieces, ${nv} variants shown. Read from the source when ./start ran (${esc(DATA.generated.replace('T', ' ').slice(0, 16))}). Which files count as the kit, and the variants: <a href="#src/tools/assets/kit.json">tools/assets/kit.json</a>. Portraits, voices and art are in the <a href="${R}tools/assets/">asset gallery</a>.</p>
    <nav class="toc"><a href="#" data-jump="apieces">Pieces</a><a href="#" data-jump="adupes">Built more than once (${DATA.dupes.length})</a></nav>
    <div id="apieces"><h2>Pieces</h2>${filtersHtml(esc)}<div id="alist">${listHtml(esc)}</div></div>
    <div id="adupes"><h2>Built more than once</h2>
    <p class="muted small">From the world kit audit (<a href="#doc/notes/architecture/world-kit.md">notes/architecture/world-kit.md</a>): ${DATA.dupes.length} kinds of thing built in more than one place, about ${lines} lines that merging would remove. The pieces they should merge into are marked "built elsewhere too". Open one to see every copy.</p>
    <div class="adupes">${dupes.map((d) => dupeBlock(esc, d)).join('')}</div></div>`;
}

function pagePiece(esc, id) {
  const e = DATA.byId.get(id);
  if (!e) return `<h1>Not in the library</h1><p>No piece <code>${esc(id)}</code>. <a href="#assets">All pieces</a>.</p>`;
  const p = e.piece, v = e.variants || [], fam = DATA.families.find(([f]) => f === p.family);
  const file = e.paths[0];
  const byPlace = {};
  for (const u of p.used) (byPlace[u.file.replace(/^game3d\/js\/(scenes|places)\//, '').split(/[/.]/)[0]] ||= []).push(u);
  const main = thumbOf(v[0]);
  return `<p class="small"><a href="#assets">Asset library</a> · ${esc(fam ? fam[1] : p.family)}</p>
    <h1>${esc(e.name)}</h1>
    <div class="apiece">
      <div class="astage">${main ? `<img id="amain" src="${R}${esc(main)}" alt="${esc(e.name)}">` : p.palette ? swatches(esc, p.palette) : '<div class="acode big">Built in code, no picture</div>'}
        ${v.length > 1 ? `<div class="avars">${v.map((x, i) => `<button type="button" data-avar="${i}" class="${i ? '' : 'on'}" ${x.thumb ? `data-src="${R}${esc(x.thumb)}"` : ''}>${x.thumb ? `<img src="${R}${esc(x.thumb)}" alt="" loading="lazy">` : ''}<span>${esc(x.name)}</span></button>`).join('')}</div>` : v.length ? `<p class="muted small">${esc(v[0].name)}</p>` : ''}
        ${main ? `<p class="small"><a href="${R}tools/assets/#a=${encodeURIComponent(e.id)}">Turn it around in the asset gallery</a></p>` : ''}</div>
      <div class="ainfo">
        <h3>How to call it</h3>
        <pre class="ause">${esc(`import { ${p.name} } from '${file.replace(/^game3d\/js\//, '…/js/')}';\n${p.call}`)}</pre>
        <p class="small">Defined at ${lineLink(esc, file, p.line, `${file}:${p.line}`)}</p>
        ${p.also.length ? `<p class="small">Also: ${p.also.map((a) => `<code>${esc(a.name)}</code> ${lineLink(esc, a.file, a.line)}`).join(', ')}</p>` : ''}
        ${p.doc ? `<p class="adoc">${esc(p.doc)}</p>` : ''}
        ${p.dupes.length ? `<h3>Built elsewhere too</h3>${p.dupes.map((d) => dupeBlock(esc, DATA.dupeById.get(d), true)).join('')}` : ''}
        <h3>Used in ${p.places.length ? `<span class="muted">(${p.used.length} lines in ${p.places.length} places)</span>` : ''}</h3>
        ${p.used.length ? `<div class="aused">${Object.entries(byPlace).sort().map(([pl, us]) => `<div><b>${esc(pl)}</b><span>${us.map((u) => lineLink(esc, u.file, u.line, `${u.file.split('/').at(-1)}:${u.line}`)).join(' ')}</span></div>`).join('')}</div>`
          : `<p>${p.usedSelf ? `Only inside its own file (${p.usedSelf} times).` : 'Nothing uses it.'}</p>`}
      </div></div>`;
}

// mount the page into el; arg is '' for the list or a piece id
export async function mount(el, { ROOT, esc, arg }) {
  // its own stylesheet, loaded here so the public site (which has no library) never asks for it
  if (!document.querySelector('link[data-assets-css]')) {
    const css = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: new URL('assets.css', import.meta.url).href });
    css.dataset.assetsCss = '1';
    const ready = new Promise((r) => { css.onload = css.onerror = r; });
    document.head.append(css);
    await ready;
  }
  R = ROOT;
  if (!DATA) await load(ROOT);
  el.innerHTML = arg ? pagePiece(esc, arg) : pageList(esc);
  const redraw = () => { el.querySelector('#alist').innerHTML = listHtml(esc); };
  el.addEventListener('click', (ev) => {
    const f = ev.target.closest('button[data-af]');
    if (f) { F.family = f.dataset.v; el.querySelectorAll('button[data-af]').forEach((b) => b.classList.toggle('on', b === f)); redraw(); return; }
    const b = ev.target.closest('button[data-avar]');
    if (b && b.dataset.src) { el.querySelector('#amain').src = b.dataset.src; el.querySelectorAll('[data-avar]').forEach((x) => x.classList.toggle('on', x === b)); }
  });
  el.addEventListener('input', (ev) => {
    const k = ev.target.dataset.af;
    if (!k || k === 'family') return;
    F[k] = ev.target.type === 'checkbox' ? ev.target.checked : ev.target.value;
    redraw();
  });
}
