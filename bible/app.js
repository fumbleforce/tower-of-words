// World bible: a hash-routed page over two kinds of data.
//  - Live (bible/live.js): read from the repo at load time: the game facts docs (docs/game/), story files, words,
//    portraits, GUIDE quotes, approved art, design notes, build ids. These can't go stale.
//  - Static (bible/data.json, from tools/bible/build.py): the hand-kept facts in bible/facts.yaml, review pages
//    (needs git), prompts, and island/private/bible/private.json on the private page.
// Review (reviews/) and Showcase (showcase/) are read live too, and Jørgen's answers are saved through tools/review_server.py.
// Work (bible/work.js) lists the work tracker's GitHub issues, read through the server's /api/work.
// Paths in the data are relative to the repo root. Plain JS, no build step; ./start serves the repo.
const ROOT = window.BIBLE_ROOT || '../';
const PRIVATE_URL = window.BIBLE_PRIVATE || null;
const DATA_URL = window.BIBLE_DATA || 'data.json';
const HERE = document.currentScript ? document.currentScript.src : location.href;
let D = null, P = null, L = null, LIVE = null, INDEX = null, WORK = null;

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const url = (p) => /^https?:/.test(p) ? p : ROOT + p.split('/').map(encodeURIComponent).join('/');
const STATUS_LABEL = { approved: 'approved', draft: 'draft', rejected: 'rejected', decided: 'decided', open: 'open', review: 'under review', legacy: 'legacy', live: 'live' };
const clean = (t) => String(t || '').replace(/\s*[—–]\s*/g, ': ');
const chip = (s) => s ? `<span class="st ${esc(s)}">${esc(STATUS_LABEL[s] || s)}</span>` : '';
const liveTag = (path, what = 'live') => `<span class="live" title="Read from ${esc(path)} when this page loaded">${esc(what)} · ${/\/$/.test(path) ? `<span class="src">${esc(path)}</span>` : `<a href="#src/${esc(path)}">${esc(path)}</a>`}</span>`;
const sum = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);

function srcHref(src) {
  if (!src || !src.path) return null;
  if (/^https?:/.test(src.path)) return src.path;
  if (/\.(html?|webp|png|jpg|wav|mp3)$/.test(src.path)) return url(src.path);
  return `#src/${src.path}${src.line ? ':' + src.line : ''}`;
}
function srcLink(src) {
  const h = srcHref(src);
  if (!h) return '';
  return `<a class="src" href="${esc(h)}" title="Source: ${esc(src.label || src.path)}">${esc(src.label || src.path)}</a>`;
}
// Relative links in a markdown file resolve against that file's folder (docs/game/cast.md links to places.md).
let MDBASE = '';
function atBase(path, fn) { const was = MDBASE; MDBASE = path ? path.replace(/[^/]*$/, '') : ''; try { return fn(); } finally { MDBASE = was; } }
function docHref(h) {
  if (/^https?:|^#/.test(h)) return h;
  const p = h.split('#')[0];
  let full = new URL(p, 'http://x/' + MDBASE).pathname.slice(1);
  if (full === 'docs/game/stories/') return '#stories';
  if (/\/$/.test(full)) return url(full);
  const st = L && L.stories && L.stories.find((x) => x.file === full);
  if (st) return `#story/${st.id}`;
  return '#doc/' + full;
}
function inline(t) {
  return esc(t)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:!?]|$)/g, '$1<i>$2</i>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t2, h) => `<a href="${esc(docHref(h.replace(/&amp;/g, '&')))}">${t2}</a>`);
}

// A quote fact: the sentence is read live from the file, so the bible never holds a copy.
function quote(src) {
  if (!src) return { text: '', src };
  if (!LIVE || !src.phrase || !L.files[src.path]) return { text: null, src };
  const q = LIVE.quoteText(L.files, src.path, src.phrase, src.n || 0);
  if (!q) return { text: null, src };
  return { text: q.text, phrase: src.phrase, src: { ...src, line: q.line, label: `${src.path}:${q.line}` } };
}
// underline the phrase the fact points at, so a long GUIDE sentence shows which part matters
function markPhrase(html, phrase) {
  if (!phrase || phrase.length < 6) return html;
  const e = esc(phrase).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.replace(new RegExp(e, 'i'), (m) => `<mark class="qp">${m}</mark>`);
}
function factRow(f) {
  if (f.q) {
    const q = quote(f.src);
    const body = q.text == null ? `<span class="missing-q">Quote not found: “${esc(f.src && f.src.phrase)}” in ${esc(f.src && f.src.path)}</span>` : markPhrase(atBase(f.src.path, () => inline(q.text)), q.phrase);
    return `<div class="fact quote ${esc(f.s)}"><div class="t"><span class="qmark" aria-hidden="true">“</span>${body}</div><div class="meta">${chip(f.s)}${srcLink(q.src)}</div></div>`;
  }
  return `<div class="fact ${esc(f.s)}"><div class="t">${f.k ? `<span class="k">${esc(f.k)}</span>` : ''}${inline(f.t)}</div><div class="meta">${chip(f.s)}${srcLink(f.src)}</div></div>`;
}
function factRows(list, opts = {}) {
  if (!list || !list.length) return opts.empty ? `<p class="muted">${esc(opts.empty)}</p>` : '';
  return `<div class="facts">${list.map(factRow).join('')}</div>`;
}
const legacyBox = (title, inner, n) => inner ? `<details class="legacy"><summary><span class="st legacy">legacy</span> ${esc(title)}${n != null ? ` <span class="muted">(${n})</span>` : ''}</summary><div class="inner">${inner}</div></details>` : '';

// ------------------------------------------------------------------ markdown (small, enough for our notes)
function md(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const out = []; let i = 0;
  const para = [];
  const flush = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para.length = 0; } };
  while (i < lines.length) {
    const l = lines[i];
    if (/^```/.test(l)) {
      flush(); const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      out.push(`<pre class="code">${esc(buf.join('\n'))}</pre>`); i++; continue;
    }
    let m;
    if ((m = l.match(/^(#{1,6})\s+(.*)/))) { flush(); const n = Math.min(m[1].length + 1, 5); out.push(`<h${n}>${inline(m[2])}</h${n}>`); i++; continue; }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(l)) { flush(); out.push('<hr>'); i++; continue; }
    if (/^\|/.test(l)) {
      flush(); const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
      const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const body = rows.filter((r, k) => !(k === 1 && /^\|[\s:|-]+\|?$/.test(r)));
      out.push('<div class="tablewrap"><table>' + body.map((r, k) => `<tr>${cells(r).map((c) => k === 0 ? `<th>${inline(c)}</th>` : `<td>${inline(c)}</td>`).join('')}</tr>`).join('') + '</table></div>');
      continue;
    }
    if (/^>\s?/.test(l)) {
      flush(); const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${md(buf.join('\n'))}</blockquote>`); continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(l)) {
      flush(); const block = [];
      const isItem = (x) => /^\s*([-*]|\d+\.)\s+/.test(x);
      while (i < lines.length) {
        const x = lines[i];
        if (!x.trim()) {
          let k = i; while (k < lines.length && !lines[k].trim()) k++;
          if (k < lines.length && (isItem(lines[k]) || /^\s{2,}\S/.test(lines[k]))) { i = k; continue; }
          break;
        }
        if (/^(#{1,6}\s|\||```|>)/.test(x)) break;
        block.push(x); i++;
      }
      out.push(list(block)); continue;
    }
    if (!l.trim()) { flush(); i++; continue; }
    para.push(l.trim()); i++;
  }
  flush();
  return out.join('\n');
}
function list(block) {
  const ind = (l) => l.match(/^\s*/)[0].length;
  const base = ind(block[0]);
  const ordered = /^\s*\d+\./.test(block[0]);
  const startN = ordered ? parseInt(block[0].trim(), 10) : 1;
  let html = ordered ? `<ol${startN > 1 ? ` start="${startN}"` : ''}>` : '<ul>', cur = null, sub = [];
  const close = () => { if (cur !== null) html += `<li>${inline(cur).replace(/\n/g, '<br>')}${sub.length ? list(sub) : ''}</li>`; cur = null; sub = []; };
  for (const l of block) {
    if (ind(l) <= base && /^\s*([-*]|\d+\.)\s+/.test(l)) { close(); cur = l.replace(/^\s*([-*]|\d+\.)\s+/, ''); }
    else if (ind(l) > base && /^\s*([-*]|\d+\.)\s+/.test(l)) sub.push(l);
    else if (sub.length && ind(l) > base) sub.push(l);
    else cur = (cur || '') + '\n' + l.trim();
  }
  close();
  return html + (ordered ? '</ol>' : '</ul>');
}

// ------------------------------------------------------------------ images and lightbox
function img(src, alt, cls = '', attrs = '') {
  return `<img src="${esc(url(src))}" alt="${esc(alt)}" loading="lazy" decoding="async" class="${cls}" data-lb="${esc(url(src))}" data-cap="${esc(alt)}" ${attrs}>`;
}
const LB = { list: [], i: 0 };
function openLB(el) {
  const group = el.closest('[data-lbg]') || document.body;
  LB.list = [...group.querySelectorAll('[data-lb]')];
  LB.i = LB.list.indexOf(el);
  showLB();
  $('#lb').classList.add('on');
}
function showLB() { const el = LB.list[LB.i]; if (!el) return; $('#lb img').src = el.dataset.lb; $('#lb .c').textContent = el.dataset.cap || ''; }
function closeLB() { $('#lb').classList.remove('on'); $('#lb img').removeAttribute('src'); }

// ------------------------------------------------------------------ live character helpers
function charById(id) { return D.characters.find((c) => c.id === id); }
function game(c) {
  if (!c || !c.game || !L) return null;
  const g = c.game, S = L.story;
  const lines = S.lines[g] || {};
  const faces = (L.portraits[g] || []).filter((f) => L.portraitFiles.includes(`${g}-${f}.webp`) || !L.portraitFiles.length);
  const vp = Object.keys(L.voicePeople).find((k) => c.story_name && k.startsWith(c.story_name));
  return {
    id: g, lines, total: sum(lines), faces, listedFaces: L.portraits[g] || [],
    names: (S.speakers[g] || {}).names || {}, roles: (S.speakers[g] || {}).roles || {},
    people: S.people[g], cast: (L.castPeople.find((p) => p.id === g) || {}).body, voice: vp && L.voicePeople[vp],
    stories: L.stories.filter((st) => st.cast.includes(g)),
    taught: S.taught.filter((t) => t.by === g), samples: S.samples[g] || [],
    fmt: L.portraitStatus[g], model3d: g in L.cast3d ? (L.cast3dOn.includes(g) ? 'in the game' : 'test only') : null,
  };
}
const inGame = (c) => { const g = game(c); return !!(g && (g.total || g.listedFaces.length)); };
function portraitOf(c) {
  const g = game(c);
  if (g && g.listedFaces.includes('neutral')) return `game3d/assets/portraits/${g.id}-neutral.webp`;
  return c.portrait ? c.portrait.src : null;
}
// A face's status: the character's own portrait status wins when it is under review or rejected; otherwise
// docs/game/art-and-sound.md decides (approved, under review, or provisional = draft), and a face that cast.md
// doesn't list (or marks "to build"), or that has no file, is draft.
function faceStatus(c, g, face) {
  if (c.portrait_status === 'review' || c.portrait_status === 'rejected') return c.portrait_status;
  if (face && L.portraitFiles.length && !L.portraitFiles.includes(`${g.id}-${face}.webp`)) return 'draft';
  if (face && g && g.fmt && g.fmt.faces.length && !g.fmt.faces.includes(face)) return 'draft';
  return g && g.fmt ? g.fmt.s : (c.portrait_status || 'draft');
}
function wordLabel(id) {
  const w = L && L.words[id];
  return w ? `<span class="jp">${esc(w.ja)}</span> <span class="muted">${esc(w.ro)}, ${esc(w.en)}</span>` : `<code>${esc(id)}</code>`;
}

// ------------------------------------------------------------------ pages
const NAV = [
  ['review', 'Review'], ['showcase', 'Showcase'], ['work', 'Work'], ['home', 'Home'], ['characters', 'Characters'], ['places', 'Places'], ['place-map', 'Places diagram'], ['story', 'Stories'], ['story-map', 'Story map'],
  ['words', 'Words and commands'], ['rules', 'Rules and decisions'], ['art', 'Art and style'], ['audio', 'Audio'],
  ['reviews', 'Review pages'], ['questions', 'Open questions'], ['sources', 'Sources'],
];

function buildLine() {
  const loc = L.build && L.build.id, pub = L.pushed && L.pushed.id;
  const same = loc && pub && loc === pub;
  return `<div class="builds">
    <div><span class="lab">Local build</span><b class="mono">${esc(loc || 'unknown')}</b>${liveTag('game3d/build.json')}</div>
    <div><span class="lab">Pushed build</span><b class="mono">${esc(pub || (L.ok['https://fumbleforce.github.io/tower-of-words/game3d/build.json'] === false ? 'could not load' : 'unknown'))}</b>
      <span class="live">live · <a href="https://fumbleforce.github.io/tower-of-words/game3d/">GitHub Pages</a></span></div>
    <div class="muted">${loc && pub ? (same ? 'The pushed build is the local one.' : 'The local build is ahead of or different from the pushed one.') : ''}</div></div>`;
}

function pageHome() {
  const cast = D.characters.filter(inGame);
  const Q = D.questions;
  const tiles = [
    ['review', 'Review', `${openReviews().length} waiting for your pick${(L.reviews || []).filter(unread).length ? `, ${(L.reviews || []).filter(unread).length} answered` : ''}`, openReviews().length],
    ['showcase', 'Showcase', 'Finished work to look at; flag or comment on anything', (L.showcase || []).length],
    ['work', 'Work', `What is being worked on, waiting or stuck (GitHub issues)${(L.workStale || []).length ? `; ${L.workStale.length} stuck` : ''}`, (L.work || []).filter((i) => i.open).length],
    ['characters', 'Characters', `${cast.length} in the game today, ${D.characters.length - cast.length} designed for later`, D.characters.length],
    ['places', 'Places', 'Every place in the game, live from docs/game/places.md', L.places.length],
    ['story', 'Stories', `The storylines in docs/game/stories/, ${L.stories.filter((st) => /^built/.test(st.status)).length} built; design docs marked as not approved`, L.stories.length],
    ['words', 'Words and commands', 'Every Japanese word in the game, from docs/game/words.md', L.docWords.length],
    ['rules', 'Rules and decisions', 'Quoted live from GUIDE.md', D.rules.reduce((a, g) => a + g.quotes.length, 0)],
    ['art', 'Art and style', 'Models, the 3D workflow, what not to do', ''],
    ['audio', 'Audio', 'Music and voices', D.audio.tracks.length + (L ? L.voiceRefs.length : 0)],
    ['reviews', 'Review pages', `${D.reviews.filter((r) => r.group === 'current').length} current, the rest legacy`, D.reviews.length],
    ['questions', 'Open questions', `${Q.conflicts.length} conflicts between files`, openQuestions().length],
  ];
  if (P) tiles.push(['rewards', 'Reward pictures', 'Private: picks per character', Object.values(P.rewards).reduce((a, b) => a + b.length, 0)]);
  const latest = D.reviews.filter((r) => r.group === 'current' && !r.external).slice(0, 6);
  return `<div class="page">
    <div class="home-hero">
      <div>
        <h1>Amakawa world bible${P ? ' <span class="st rejected">private</span>' : ''}</h1>
        <p class="lede">The cast, places, story and rules of the game. Most of it is read from the repo each time this page loads (the game facts in docs/game/, the story files, the portrait table, GUIDE.md, the approved-art list), so it matches the game. The rest is hand-kept in bible/facts.yaml, and every fact links to where it comes from.</p>
        <div class="legend"><span>${chip('approved')} Jørgen decided it</span><span>${chip('review')} decided once, being looked at again</span><span>${chip('draft')} proposed or provisional</span><span>${chip('rejected')} turned down</span><span>${chip('legacy')} from an earlier version of the game</span></div>
      </div>
      <div class="home-strip" data-lbg>${cast.slice(0, 6).map((c) => `<a href="#character/${c.id}" title="${esc(c.name)}"><img src="${esc(url(portraitOf(c)))}" alt="${esc(c.name)}" loading="lazy" decoding="async"></a>`).join('')}</div>
    </div>
    ${buildLine()}
    ${L.errors.length ? `<div class="warnbox"><b>Some live sources didn't load:</b><ul>${L.errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>` : ''}
    <h2>Sections</h2>
    <div class="tiles">${tiles.map(([r, t, s, n]) => `<a class="tile" href="#${r}"><span class="n">${n}</span><b>${esc(t)}</b><span>${esc(s)}</span></a>`).join('')}</div>
    <h2>Latest review pages</h2>
    <div class="list">${latest.map((r) => `<div><span><a href="${esc(url(r.path))}">${esc(clean(r.title))}</a> <span class="muted">${esc(r.what)}</span></span><span class="muted" style="white-space:nowrap">${esc(r.date)} ${chip(r.status)}</span></div>`).join('')}</div>
    <p class="muted" style="margin-top:26px;font-size:13px">Hand-kept part built ${esc(D.generated)} by tools/bible/build.py (./start runs it). Live part read just now. <a href="#sources">What comes from where</a>.${P ? ` Private data built ${esc(P.generated)}. <a href="${esc(ROOT)}bible/">Public bible</a>.` : ''}</p>
  </div>`;
}

function castCard(c) {
  const g = game(c);
  const st = g ? faceStatus(c, g) : (c.idea ? 'draft' : 'approved');
  const role = g ? (Object.values(g.roles)[0] || c.group) : c.group;
  return `<a class="card" href="#character/${c.id}"><div class="ph"><img src="${esc(url(portraitOf(c)))}" alt="${esc(c.name)}" loading="lazy" decoding="async"></div>
    <div class="body"><span class="name">${esc(c.name)}</span>
    <span class="role">${esc(role || '')}</span><span>${chip(st)} ${g && g.total ? `<span class="muted" style="font-size:12px">${g.total} lines</span>` : `<span class="muted" style="font-size:12px">${esc(c.pick || '')}</span>`}</span></div></a>`;
}
function pageCharacters() {
  const now = D.characters.filter(inGame), later = D.characters.filter((c) => !inGame(c));
  const mapped = new Set(D.characters.map((c) => c.game).filter(Boolean));
  const others = Object.keys(L.story.lines).filter((id) => !mapped.has(id)).sort((a, b) => sum(L.story.lines[b]) - sum(L.story.lines[a]));
  return `<div class="page"><h1>Characters</h1>
    <p class="lede">The first group is who the game uses today: who they are comes from docs/game/cast.md, portraits, faces and line counts from the game's own files. The second is the approved designs that aren't in day one.</p>
    <h2>In the game ${liveTag('game3d/js/ui/portrait-data.js', 'live')}</h2>
    <div class="grid">${now.map(castCard).join('')}</div>
    <h3>Others with lines in the story files</h3>
    <p class="muted small">Who they are is from <a href="#doc/docs/game/cast.md">docs/game/cast.md</a>; the line counts are from the story files. An id cast.md doesn't list is marked.</p>
    <div class="tablewrap"><table class="t"><thead><tr><th>Speaker id</th><th>Name</th><th>Who they are</th><th>Lines</th></tr></thead><tbody>
      ${others.map((id) => { const r = L.castRows[id]; return `<tr><td><code>${esc(id)}</code></td><td>${esc(r ? r.name : [...new Set(Object.values((L.story.speakers[id] || {}).names || {}))].join(', ') || '(default)')}</td><td>${r ? atBase('docs/game/cast.md', () => inline(r.who)) : '<span class="st draft">not in cast.md</span>'}</td><td>${Object.entries(L.story.lines[id]).map(([p, n]) => `${esc(p)} ${n}`).join(', ')}</td></tr>`; }).join('')}
    </tbody></table></div>
    <div class="livefoot">${liveTag('docs/game/cast.md')}</div>
    <h2>Designed, not in day one</h2>
    <div class="grid">${later.map(castCard).join('')}</div>
    <h2>Rules for the whole cast</h2>${factRows(D.cast_rules)}
    <h2>Removed and earlier names</h2>${factRows(D.removed)}</div>`;
}

function sectionNav(items) { return `<nav class="toc">${items.filter(Boolean).map(([id, t]) => `<a href="#" data-jump="${id}">${esc(t)}</a>`).join('')}</nav>`; }

function gameSection(c, g) {
  const places = ['train', 'gate', 'office', 'transitions'];
  const nameRows = Object.entries(g.names).map(([p, n]) => `${esc(n)}${g.roles[p] ? ` <span class="muted">(${esc(g.roles[p])})</span>` : ''} <span class="muted">in ${esc(p)}</span>`);
  const samples = g.samples.filter((s) => !s.over).slice(0, 4);
  const over = g.samples.filter((s) => s.over).length;
  return `<div class="livebox">
    <div class="kv"><span>Speaker id</span><span><code>${esc(g.id)}</code>${nameRows.length ? ` · shown as ${nameRows.join('; ')}` : ''}</span></div>
    <div class="kv"><span>Lines</span><span>${g.total ? places.filter((p) => g.lines[p]).map((p) => `<a href="#src/game3d/story/${p}.js">${p}</a> ${g.lines[p]}`).join(' · ') + ` <span class="muted">(${g.total} in all${over ? `, ${over} overheard in Japanese` : ''})</span>` : '<span class="muted">none</span>'}</span></div>
    ${g.taught.length ? `<div class="kv"><span>Teaches</span><span>${[...new Map(g.taught.map((t) => [t.word, t])).values()].map((t) => `${wordLabel(t.word)} <span class="muted">(${esc(t.place)})</span>`).join('<br>')}</span></div>` : ''}
    ${g.stories.length ? `<div class="kv"><span>Storylines</span><span>${g.stories.map((st) => `<a href="#story/${esc(st.id)}">${esc(st.title)}</a>`).join(' · ')}</span></div>` : ''}
    ${g.people ? `<div class="kv"><span>People panel</span><span>${inline(g.people.about || '')}</span></div>` : ''}
    ${g.model3d ? `<div class="kv"><span>3D model</span><span>${g.model3d === 'test only' ? `${chip('draft')} a test that loads only with <code>?cast3d=${esc(g.id)}</code>` : chip('approved') + ' loads in the game'} <a class="src" href="#src/game3d/js/cast.js">game3d/js/cast.js</a></span></div>` : ''}
    <div class="livefoot">${liveTag('game3d/story/', 'live from the story files')}</div>
  </div>
  ${g.cast ? `<h3>Who they are (cast.md)</h3><div class="md quoteblock">${atBase('docs/game/cast.md', () => md(g.cast))}</div><div class="livefoot">${liveTag('docs/game/cast.md')}</div>` : ''}
  ${g.voice ? `<h3>How they talk (VOICE.md)</h3><div class="md quoteblock">${md(g.voice)}</div><div class="livefoot">${liveTag('game3d/story/VOICE.md')}</div>` : ''}
  ${samples.length ? `<h3>First lines</h3><div class="lines">${samples.map((s) => `<div><span class="muted">${esc(s.place)}</span> ${inline(s.text)}</div>`).join('')}</div>` : ''}`;
}

function designSection(c) {
  const out = [];
  const rel = L.files['notes/RELATIONSHIPS.md'] || '';
  const nm = (c.story_name || c.name).replace(/ \(idea\)$/, '');
  const para = rel.split(/\n(?=\*\*)/).find((p) => p.startsWith(`**${nm} (`) || p.startsWith(`**${nm}.`));
  if (para) out.push(`<div class="md quoteblock">${md(para.split(/\n\n/)[0])}</div><div class="livefoot">${liveTag('notes/RELATIONSHIPS.md', 'full arc, live')}</div>`);
  const row = rel.split('\n').find((l) => l.startsWith(`| ${nm} (`) || l.startsWith(`| ${nm} |`));
  if (row) out.push(`<div class="md quoteblock">${md('| Person | Machine | Their story | What they teach |\n|---|---|---|---|\n' + row)}</div><div class="livefoot">${liveTag('notes/RELATIONSHIPS.md', 'keeper story, live')}</div>`);
  const wt = c.walkthrough && c.walkthrough.split('/').pop();
  if (wt && (!L.walkthroughs.length || L.walkthroughs.includes(wt))) {
    const who = LIVE.section(L.files[c.walkthrough] || '', 'Who ');
    out.push(`<p><a href="#doc/${esc(c.walkthrough)}"><b>Full walkthrough</b></a> <span class="src">${esc(c.walkthrough)}</span></p>${who ? `<div class="md quoteblock">${md(who)}</div>` : ''}`);
  }
  if (!out.length) return '';
  return `<h2 id="s-design">Design ${chip('draft')}</h2><p class="muted small">From the design notes. Nothing here is approved or built.</p>${out.join('')}`;
}

function pageCharacter(id) {
  const c = charById(id); if (!c) return notFound();
  const g = game(c);
  const inG = inGame(c);
  const rewards = P && P.rewards[c.id];
  const approvedArt = (c.approved_art && L.approved[c.approved_art]) || [];
  const voices = (c.voice_prefix || []).length ? L.voiceRefs.filter((f) => c.voice_prefix.some((p) => f.startsWith(p + '-') || f.startsWith(p + '.'))) : [];
  const design = designSection(c);
  // quotes from cast.md are already on the page in full under "Who they are"
  const decisions = c.decisions.filter((f) => !(g && g.cast && f.q && f.src && f.src.path === 'docs/game/cast.md'));
  const legacyInner = [
    factRows(c.legacy),
    c.legacy_images.length ? (() => { const gr = {}; c.legacy_images.forEach((s) => (gr[s.note] = gr[s.note] || []).push(s)); return `<div data-lbg>${Object.entries(gr).map(([note, list]) => `<div class="sprite-group">${esc(note)}</div><div class="sprites">${list.map((s) => `<figure>${img(s.src, `${c.name}: ${s.label} (${s.note})`)}<figcaption><span>${esc(s.label)}</span></figcaption></figure>`).join('')}</div>`).join('')}</div>`; })() : '',
    c.legacy_arcs.length ? `<h3>Mini-story arc (Planning 7 era)</h3>${c.legacy_arcs.map((a) => `<div class="arc md"><h4>${inline(a.title)}</h4>${md(a.md)}<p>${srcLink(a.src)}</p></div>`).join('')}` : '',
  ].join('');
  const st = g ? faceStatus(c, g) : (c.idea ? 'draft' : 'approved');
  const toc = [inG && ['s-game', 'In the game'], g && g.listedFaces.length && ['s-faces', 'Portraits in the game'], decisions.length && ['s-dec', 'Decisions'],
    design && ['s-design', 'Design'], (c.images.length || approvedArt.length || c.model) && ['s-art', 'Art'], c.prompts.length && ['s-prompts', 'Prompts'],
    voices.length && ['s-voice', 'Voice'], ['s-history', 'History'], legacyInner && ['s-legacy', 'Legacy'], rewards && ['s-rewards', 'Reward pictures']];
  const parts = [];
  if (inG) parts.push(`<h2 id="s-game">In the game</h2>${gameSection(c, g)}`);
  if (g && g.listedFaces.length) {
    parts.push(`<h2 id="s-faces">Portraits in the game</h2>
      <p class="muted small">The faces listed for <code>${esc(g.id)}</code> in the PORTRAITS table of game3d/js/ui/portrait-data.js, shown from game3d/assets/portraits/. ${g.fmt ? `<a href="#doc/docs/game/art-and-sound.md">art-and-sound.md</a>: “${inline(g.fmt.line)}”` : ''}</p>
      <div class="sprites faces" data-lbg>${g.listedFaces.map((f) => { const has = !L.portraitFiles.length || L.portraitFiles.includes(`${g.id}-${f}.webp`); return `<figure>${has ? img(`game3d/assets/portraits/${g.id}-${f}.webp`, `${c.name}: ${f}`) : '<div class="missing">no file yet</div>'}<figcaption><span>${esc(f)}</span>${chip(faceStatus(c, g, f))}</figcaption></figure>`; }).join('')}</div>
      <div class="livefoot">${liveTag('game3d/js/ui/portrait-data.js', 'live from the PORTRAITS table')}</div>`);
  }
  if (decisions.length) parts.push(`<h2 id="s-dec">Decisions</h2><p class="muted small">Quoted live from the file each one links to.</p>${factRows(decisions)}`);
  if (c.facts && c.facts.length) parts.push(`<h3>Other facts</h3>${factRows(c.facts)}`);
  if (design) parts.push(design);
  if (c.images.length || approvedArt.length || c.model) {
    parts.push(`<h2 id="s-art">Art</h2>
      ${c.images.length ? `<div class="gallery" data-lbg>${c.images.map((e) => `<figure>${img(e.src, e.label)}<figcaption><span>${esc(e.label)}</span>${chip(e.s)}</figcaption></figure>`).join('')}</div>` : ''}
      ${c.model ? `<h3>3D model ${chip(c.model.status)}</h3><div class="model">${c.model.preview ? img(c.model.preview, 'Model preview', '', 'style="width:140px;border-radius:8px;border:1px solid var(--line)"') : ''}<div><p>${inline(c.model.note || '')}</p><p class="src">${esc(c.model.dir)}${c.model.exists ? '' : ' (local only, not on this machine)'}</p>${srcLink(c.model.src)}</div></div>` : ''}
      ${approvedArt.length ? `<h3>In art/approved/${esc(c.approved_art)}/</h3><div class="list">${approvedArt.map((a) => `<div><span><a href="${esc(url(a.path))}">${esc(a.file)}</a> <span class="muted">${inline(a.desc)}</span></span></div>`).join('')}</div><div class="livefoot">${liveTag('art/approved/README.md')}</div>` : ''}`);
  }
  if (c.prompts.length) parts.push(`<h2 id="s-prompts">Prompts</h2>${c.prompts.map((p) => `
    <details class="prompt"><summary><span class="tt">${esc(p.title)}</span>${chip(p.s)}</summary><div class="inner">
      <pre>${esc(p.prompt)}</pre>
      ${p.outfit ? `<div class="lab">Outfit</div><pre>${esc(p.outfit)}</pre>` : ''}
      ${p.negative ? `<div class="lab">Negative</div><pre>${esc(p.negative)}</pre>` : ''}
      ${p.notes ? `<div class="lab">Notes</div><p style="font-size:13.5px;margin:4px 0">${inline(p.notes)}</p>` : ''}
      <div class="lab">${p.model ? `${esc(p.model)}${p.seed ? `, seed ${esc(p.seed)}` : ''} · ` : ''}${srcLink(p.src)}</div>
    </div></details>`).join('')}`);
  if (voices.length) parts.push(`<h2 id="s-voice">Voice</h2><p class="muted small">Reference clips in tools/voice-refs/ whose names start with ${c.voice_prefix.map((p) => `<code>${esc(p)}</code>`).join(' or ')}. Which one is in use is in the decisions above.</p>
    <div class="list">${voices.map((f) => `<div style="flex-wrap:wrap"><span class="src">${esc(f)}</span><audio controls preload="none" src="${esc(url('tools/voice-refs/' + f))}"></audio></div>`).join('')}</div><div class="livefoot">${liveTag('tools/voice-refs/')}</div>`);
  parts.push(`<h2 id="s-history">History</h2>${c.history.length ? `<div class="list hist">${c.history.map((h) => `<div><a href="${esc(url(h.path))}">${esc(h.label)}</a><span>${chip(h.s)} <span class="src">${esc(h.path)}</span></span></div>`).join('')}</div>` : '<p class="muted">Nothing recorded.</p>'}
    ${c.rejected.length ? `<h3>Rejected</h3>${factRows(c.rejected)}` : ''}`);
  if (legacyInner) parts.push(`<div id="s-legacy">${legacyBox('Earlier versions of the game', legacyInner)}</div>`);
  if (rewards) parts.push(`<h2 id="s-rewards">Reward pictures <span class="st rejected">private</span></h2>${rewardCards(rewards)}`);
  const port = portraitOf(c);
  return `<div class="page"><div class="crumbs"><a href="#characters">Characters</a> /</div>
    <div class="char"><aside data-lbg>
      <div class="portrait">${port ? img(port, c.name) : ''}</div>
      <div class="cap">${chip(st)} ${esc(g && g.listedFaces.length ? `${g.id}-neutral.webp (in the game)` : c.pick || '')}</div>
      ${c.portrait_note ? `<div class="pnote">${factRow(c.portrait_note)}</div>` : ''}
    </aside><div>
      <h1 class="namehead">${esc(c.name)}</h1>
      <div class="pill-row">${c.group ? `<span class="pill">${esc(c.group)}</span>` : ''}${inG ? '<span class="pill on">in the game</span>' : '<span class="pill">not in day one</span>'}${c.idea ? '<span class="pill">idea, not designed</span>' : ''}</div>
      ${sectionNav(toc)}
      ${parts.join('\n')}
    </div></div></div>`;
}

function rewardCards(list) {
  return `<div class="rewards" data-lbg>${list.map((r) => {
    const imgs = r.img ? [{ id: r.pick, img: r.img }] : (r.private || []).concat(r.discreet || []);
    const first = imgs.find((x) => x.img);
    return `<div class="rw">${first ? img(first.img, `${r.title}: ${first.id}`) : '<div class="missing">image not on disk</div>'}
      <div class="b"><b>${esc(r.title)}</b><span class="muted">${esc(r.round)}</span>
      <span>${chip(r.s)} ${esc(r.by || '')}</span>
      ${r.pick ? `<span class="src">${esc(r.pick)}</span>` : ''}
      ${(r.private || []).length ? `<span class="muted">private: ${esc(r.private.map((x) => x.id).join(', '))}</span>` : ''}
      ${(r.discreet || []).length ? `<span class="muted">discreet: ${esc(r.discreet.map((x) => x.id).join(', '))}</span>` : ''}
      ${r.stage ? `<span>Stage: ${esc(r.stage)}</span>` : ''}
      ${r.note ? `<span style="color:var(--ink-2)">${esc(r.note)}</span>` : ''}
      ${r.why ? `<span style="color:var(--ink-2)">${esc(r.why)}</span>` : ''}
      <span>${r.page ? `<a href="${esc(url(r.page))}">review page</a>` : ''}${r.src ? ' · ' + srcLink(r.src) : ''}</span></div></div>`;
  }).join('')}</div>`;
}

function pagePlaces() {
  const doc = L.files['docs/game/places.md'] || '';
  const round = L.latestRound;
  const at = (fn) => atBase('docs/game/places.md', fn);
  const between = LIVE.section(doc, 'Getting between places'), unbuilt = LIVE.section(doc, 'Places decided but not built');
  return `<div class="page"><h1>Places</h1>
    <p class="lede">Every place in the game, read from docs/game/places.md: what's there, who is there at each time of day, the small things you can poke. Screenshots are from the latest critic round in game3d/shots/${round ? esc(round) : ''}; the references are Jørgen's images in game3d/ref/. ${liveTag('docs/game/places.md')}</p>
    ${sectionNav([...L.places.map((p) => [`p-${p.id}`, p.title]), between && ['p-between', 'Getting between places'], ['p-later', 'Not built']])}
    ${L.places.map((p) => {
      const D0 = D.places.find((x) => x.id === p.id);
      const [first, ...rest] = p.body.split(/\n\n/);
      const shot = round && D0 ? `game3d/shots/${round}/${D0.shot}` : null;
      const pics = D0 ? `<div data-lbg class="pics">
          ${shot ? `<figure>${img(shot, `${p.title}: ${round}`)}<figcaption>In the game, ${esc(round)} ${liveTag('game3d/shots/', 'latest')}</figcaption></figure>` : ''}
          <figure>${img(D0.ref, `${p.title}: reference`)}<figcaption>Jørgen's reference <span class="src">${esc(D0.ref)}</span></figcaption></figure>
        </div>` : '';
      return `<section class="place" id="p-${esc(p.id)}"><h2>${esc(p.title)} <code class="pid">${esc(p.id)}</code></h2>
        <div class="loc${pics ? '' : ' solo'}">${pics}<div>
          <div class="md quoteblock">${at(() => md(first))}</div>
          ${rest.length ? `<details class="prompt"><summary><span class="tt">Things, spots, who is there when, small moments</span></summary><div class="inner md">${at(() => md(rest.join('\n\n')))}</div></details>` : ''}
          ${D0 && D0.quotes.length ? `<h3>Decisions</h3>${factRows(D0.quotes)}` : ''}
        </div></div></section>`;
    }).join('')}
    ${between ? `<h2 id="p-between">Getting between places</h2><p><a href="#place-map">Places diagram</a></p><div class="md">${at(() => md(between))}</div>` : ''}
    <h2 id="p-later">Decided, not built</h2>${unbuilt ? `<div class="md">${at(() => md(unbuilt))}</div>` : ''}${factRows(D.places_mentioned)}
    ${legacyBox('Painted backgrounds from the VN', `<p class="muted small">Picked for the visual novel. The world is flat-shaded 3D now, so none of these is used.</p>
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr))" data-lbg>${D.locations.map((l) => `
        <div class="card wide"><div class="ph">${img(l.image.src, l.name)}</div><div class="body"><span class="name">${esc(l.name)}</span>
        <span class="muted" style="font-size:12px;font-family:var(--mono)">${esc(l.pick || '')}</span>${factRows(l.facts)}
        <span>${l.pages.map((p) => `<a class="src" href="${esc(url(p.path))}">${esc(p.path)}</a>`).join(' ')}</span></div></div>`).join('')}</div>`, D.locations.length)}
  </div>`;
}

// A storyline's status from docs/game/README.md ("built", "to build", "built (day 1 part)") as chips.
function storyChips(status) {
  const t = String(status || '').trim();
  if (!t) return '<span class="st draft">not in the list</span>';
  return `<span class="st ${/^built/.test(t) ? 'approved' : 'draft'}">${esc(t)}</span>`;
}
function personLink(id) {
  const c = D.characters.find((x) => x.game === id);
  const r = L.castRows[id];
  return c ? `<a href="#character/${c.id}">${esc(c.name)}</a>` : `<span title="${esc(id)}">${esc(r ? r.name : id)}</span>`;
}
function storyCard(st) {
  return `<article class="story-card" id="s-${esc(st.id)}">
    <div class="sc-head"><h3><a href="#story/${esc(st.id)}">${esc(st.title)}</a></h3>${storyChips(st.status)}</div>
    <div class="sc-id"><code>${esc(st.id)}</code>${st.unlisted ? ' <span class="st rejected">missing from README.md</span>' : ''}</div>
    <div class="md">${atBase(st.file, () => md(st.premise))}</div>
    <dl class="sc-meta">
      ${st.cast.length ? `<div><dt>Cast</dt><dd>${st.cast.map(personLink).join(', ')}</dd></div>` : ''}
      ${st.words.length ? `<div><dt>Words</dt><dd>${st.words.map((w) => wordLabel(w.word)).join('<br>')}</dd></div>` : ''}
    </dl></article>`;
}
function pageStory() {
  const docs = [['notes/RELATIONSHIPS.md', 'Relationships: bonds, arcs and keeper stories'], ['notes/ISLAND.md', 'The island beyond B2: machines, districts, days'],
    ...L.walkthroughs.map((f) => [`notes/walkthrough/${f}`, `Walkthrough: ${f.replace(/\.md$/, '').replace(/^00-/, '')}`]),
    ['notes/LANGUAGE-LIBRARY.md', 'Language library']];
  const built = L.stories.filter((st) => /^built/.test(st.status)).length;
  return `<div class="page"><h1>Stories</h1>
    <p class="lede">The game is a set of storylines: a sub-plot, a person's thread, or one situation in one place. Each has its own file in docs/game/stories/, listed with its status in docs/game/README.md. Day one's scenes are storylines too. ${built} of ${L.stories.length} are built. ${liveTag('docs/game/stories/')} ${liveTag('docs/game/README.md')}</p>
    <div class="stories">${L.stories.map(storyCard).join('')}</div>
    <h2>The world they happen in</h2>
    <p><a href="#doc/docs/game/setting.md">The setting</a> (the island, Eric's job, kotodama, what kind of game this is) · <a href="#doc/docs/game/systems.md">Systems</a> · <a href="#doc/docs/game/controls-and-ui.md">Controls and UI</a> · <a href="#doc/docs/game/README.md">About these docs</a></p>
    <h2>The story files</h2>
    <p><a href="#src/game3d/story/train.js">train.js</a> · <a href="#src/game3d/story/gate.js">gate.js</a> · <a href="#src/game3d/story/office.js">office.js</a> · <a href="#src/game3d/story/transitions.js">transitions.js</a> · <a href="#doc/game3d/story/FORMAT.md">FORMAT.md</a> · <a href="#doc/game3d/story/VOICE.md">VOICE.md</a> · <a href="#doc/game3d/story/VOICE-DIRECTION.md">VOICE-DIRECTION.md</a> · <a href="#doc/game3d/story/REVIEW.md">critic scores</a> · <a href="#story-map">Story map</a></p>
    <h2>Design docs ${chip('draft')}</h2>
    <p class="muted small">Written by the design agents. Nothing in them is approved or built; day one comes first.</p>
    <div class="list">${docs.map(([p, t]) => `<div><span><a href="#doc/${esc(p)}">${esc(t)}</a></span><span>${chip('draft')} <span class="src">${esc(p)}</span></span></div>`).join('')}</div>
    <div class="livefoot">${liveTag('notes/walkthrough/', 'file list live')}</div>
    ${legacyBox('Earlier versions of the story', factRows(D.story.legacy) + `<h3>Documents</h3><div class="list">${D.story.legacy_docs.map((d) => `<div><a href="#doc/${esc(d.path)}">${esc(d.title)}</a><span class="src">${esc(d.path)}</span></div>`).join('')}</div>`)}
  </div>`;
}
async function pageStoryline(id) {
  const st = L.stories.find((x) => x.id === id); if (!st) return notFound();
  const t = L.files[st.file] || '';
  return `<div class="page"><div class="crumbs"><a href="#story">Stories</a> / <a href="#src/${esc(st.file)}">view source</a></div>
    <div class="sc-head"><h1>${esc(st.title)}</h1>${storyChips(st.status)}</div>
    <p class="muted small"><code>${esc(st.id)}</code> · ${st.cast.map(personLink).join(', ')} ${liveTag(st.file)}</p>
    <div class="md" style="max-width:82ch">${atBase(st.file, () => md(t.replace(/^# .*\n/, '')))}</div></div>`;
}

function pageWords() {
  const W = L.words, S = L.story, doc = (L.files['docs/game/words.md'] || '').replace(/^# .*\n/, '');
  const byWord = {};
  L.stories.forEach((st) => st.words.forEach((w) => (byWord[w.word] = byWord[w.word] || []).push({ ...w, st })));
  const ids = new Set(L.docWords.map((w) => w.id));
  const notInDoc = Object.keys(W).filter((id) => !ids.has(id)), notInGame = [...ids].filter((id) => !W[id]);
  const at = (fn) => atBase('docs/game/words.md', fn);
  const wsec = LIVE.section(doc, 'Words').split('\n');
  const t0 = wsec.findIndex((l) => /^\|/.test(l)), t1 = t0 < 0 ? -1 : t0 + wsec.slice(t0).findIndex((l) => !/^\|/.test(l));
  const before = t0 < 0 ? '' : wsec.slice(0, t0).join('\n'), after = t0 < 0 ? '' : wsec.slice(t1 < t0 ? wsec.length : t1).join('\n');
  return `<div class="page"><h1>Words and commands</h1>
    <p class="lede">Every Japanese word the game knows, from docs/game/words.md, with the storylines that teach each one and who teaches it. The audio and "shown in" come from the game (game3d/js/lang.js and the story files). ${liveTag('docs/game/words.md')}</p>
    ${notInDoc.length || notInGame.length ? `<div class="warnbox"><b>words.md and the game differ.</b> ${notInDoc.length ? `In lang.js, not in words.md: ${notInDoc.map((x) => `<code>${esc(x)}</code>`).join(', ')}. ` : ''}${notInGame.length ? `In words.md, not in lang.js: ${notInGame.map((x) => `<code>${esc(x)}</code>`).join(', ')}.` : ''} <span class="muted">node tools/facts/check.mjs says which side is wrong.</span></div>` : ''}
    ${before.trim() ? `<div class="md">${at(() => md(before))}</div>` : ''}
    <div class="tablewrap"><table class="t words"><thead><tr><th>Word</th><th>Reading</th><th>Meaning</th><th>Kind</th><th>Taught in</th><th>Shown in</th><th>Eric says it</th></tr></thead><tbody>
      ${L.docWords.map((w) => { const g = W[w.id] || {}; return `<tr><td><span class="jp big">${esc(w.ja)}</span><div class="src block">${esc(w.id)}</div></td><td>${esc(w.ro)}</td><td>${esc(w.en)}</td><td>${esc(w.kind)}</td>
        <td>${(byWord[w.id] || []).map((t) => `<a href="#story/${esc(t.st.id)}">${esc(t.st.title)}</a>: ${personLink(t.by)}`).join('<br>') || `<span class="muted">${S.used[w.id] ? 'glossed in lines, not taught' : 'not used yet'}</span>`}</td>
        <td>${[...(S.used[w.id] || [])].join(', ') || '<span class="muted">none</span>'}</td>
        <td>${g.voice ? `<audio controls preload="none" src="${esc(url('game3d/audio/' + g.voice + '.mp3'))}"></audio>` : ''}</td></tr>`; }).join('')}
    </tbody></table></div>
    ${after.trim() ? `<div class="md">${at(() => md(after))}</div>` : ''}
    <h2>How a word is shown</h2><div class="md">${at(() => md(LIVE.section(doc, 'How a word is shown')))}</div>
    <h2>When a word is known</h2><div class="md">${at(() => md(LIVE.section(doc, 'When a word is known')))}</div>
    <h2>Where it goes next ${chip('draft')}</h2><p><a href="#doc/notes/walkthrough/00-overview.md">Walkthrough overview: commands and words</a> · <a href="#doc/notes/ISLAND.md">The machines (notes/ISLAND.md)</a> · <a href="#doc/notes/LANGUAGE-LIBRARY.md">Language library</a></p>
    ${legacyBox('Older progression and learning rules', factRows(D.legacy_rules), D.legacy_rules.length)}
  </div>`;
}

function pageRules() {
  return `<div class="page"><h1>Rules and decisions</h1>
    <p class="lede">Quoted from GUIDE.md (how we work) and docs/game/ (what the game is) as they read now; when they change, this page changes with them. They are the full lists: <a href="#doc/GUIDE.md">GUIDE.md</a> · <a href="#doc/docs/game/README.md">docs/game/</a>.</p>
    ${D.rules.map((g) => `<h2>${esc(g.group)}</h2>${factRows(g.quotes)}`).join('')}
    ${legacyBox('Rules for earlier versions of the game', factRows(D.legacy_rules), D.legacy_rules.length)}</div>`;
}
function pageArt() {
  const A = D.art;
  return `<div class="page"><h1>Art and style</h1>
    <h2>Models</h2>${factRows(A.models)}
    <h2>How we make things</h2>${factRows(A.quotes)}
    <h2>Don'ts</h2><div class="dont">${factRows(A.donts)}</div>
    <p><a href="#doc/art/PROMPTS.md">art/PROMPTS.md</a>, the full prompt guide · <a href="#doc/art/approved/README.md">art/approved/README.md</a></p></div>`;
}
function pageAudio() {
  const A = D.audio;
  return `<div class="page"><h1>Audio</h1>
    <h2>Music</h2>${factRows(A.music)}
    <div class="list" style="margin-top:12px">${A.tracks.map((t) => `<div style="flex-wrap:wrap"><span><b>${esc(t.label)}</b> <span class="src">${esc(t.src)}</span></span><span>${chip(t.s)}</span>${t.exists ? `<audio controls preload="none" src="${esc(url(t.src))}"></audio>` : '<span class="muted">local only, not on this machine</span>'}</div>`).join('')}</div>
    <h2>Voices</h2>${factRows(A.quotes)}
    <h3>Every reference clip in tools/voice-refs</h3><div class="list">${L.voiceRefs.map((r) => `<div style="flex-wrap:wrap"><span class="src">${esc(r)}</span><audio controls preload="none" src="${esc(url('tools/voice-refs/' + r))}"></audio></div>`).join('')}</div>
    <div class="livefoot">${liveTag('tools/voice-refs/')}</div>
  </div>`;
}

let RV = { status: 'all' };
function reviewTable(rows) {
  return `<div class="tablewrap"><table class="t"><thead><tr><th>Page</th><th>What it is</th><th>Date</th><th>Status</th><th class="hide-phone">Where</th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td><a href="${/\.md$/.test(r.path) ? '#doc/' + esc(r.path) : esc(url(r.path))}"><b>${esc(clean(r.title))}</b></a><div class="src block">${esc(r.path)}</div></td>
      <td>${inline(r.what)}${r.note ? `<div class="muted" style="font-size:12.5px">${inline(r.note)}</div>` : ''}</td>
      <td style="white-space:nowrap">${esc(r.date)}</td><td>${chip(r.status)}</td><td class="muted hide-phone" style="font-size:12.5px">${esc(r.where)}</td></tr>`).join('')}
  </tbody></table></div>`;
}
function pageReviews() {
  const cur = D.reviews.filter((r) => r.group === 'current' && (RV.status === 'all' || r.status === RV.status));
  const leg = D.reviews.filter((r) => r.group === 'legacy');
  const priv = P ? P.pages : [];
  return `<div class="page"><h1>Review pages</h1>
    <p class="lede">Pages and candidate sheets for the game as it is now, newest first. Everything from the VN, the island slice, the MVP and the pixel and low-poly experiments is under Legacy, at its legacy/ path.</p>
    <div class="filters" data-f="status">${['all', 'open', 'decided'].map((s) => `<button class="${RV.status === s ? 'on' : ''}" data-v="${s}">${s}</button>`).join('')}</div>
    ${reviewTable(cur)}
    ${legacyBox('Review pages from earlier versions', reviewTable(leg), leg.length)}
    ${priv.length ? `<h2>Private pages <span class="st rejected">private</span></h2><div class="list">${priv.map((p) => `<div><a href="${esc(url(p.path))}">${esc(p.title)}</a><span class="src">${esc(p.path)}</span></div>`).join('')}</div>` : ''}
  </div>`;
}

// RELATIONSHIPS.md's own open questions, minus the ones GUIDE has answered (facts.yaml `closes`).
function relQuestions() {
  const body = LIVE.section(L.files['notes/RELATIONSHIPS.md'] || '', 'Open questions for Jørgen');
  const line = (L.files['notes/RELATIONSHIPS.md'] || '').split('\n').findIndex((l) => l.startsWith('## Open questions')) + 1;
  return body.split('\n').filter((l) => /^\d+\./.test(l)).map((l) => {
    const t = l.replace(/^\d+\.\s*/, '');
    const cl = D.questions.closes.find((c) => t.includes(c.match));
    return { t, src: { path: 'notes/RELATIONSHIPS.md', line, label: `notes/RELATIONSHIPS.md:${line}` }, closedBy: cl && cl.src };
  });
}
function openQuestions() { return D.questions.open.concat(relQuestions().filter((q) => !q.closedBy)); }
function pageQuestions() {
  const Q = D.questions;
  const rel = relQuestions();
  const row = (q, mark) => `<div class="fact"><div class="t">${mark ? `<span class="conflict-mark">${mark}</span>` : ''}${q.char && charById(q.char) ? `<a href="#character/${q.char}"><b>${esc(charById(q.char).name)}:</b></a> ` : ''}${inline(q.t)}</div><div class="meta">${srcLink(q.src)}</div></div>`;
  const closed = Q.closed.map((q) => ({ t: q.t, src: q.src })).concat(rel.filter((q) => q.closedBy).map((q) => ({ t: q.t, src: q.closedBy })));
  return `<div class="page"><h1>Open questions</h1>
    <p class="lede">Only what is open today. Settled questions show the decision that closed them, quoted live from GUIDE.md or docs/game/. Questions about the VN, Godot, pixel art, the MVP and the island slice are under Legacy.</p>
    <h2>Open</h2><div class="facts qgroup">${Q.open.map((q) => row(q)).join('')}</div>
    <h3>From notes/RELATIONSHIPS.md ${liveTag('notes/RELATIONSHIPS.md')}</h3>
    <div class="facts qgroup">${rel.filter((q) => !q.closedBy).map((q) => row(q)).join('') || '<p class="muted">None open.</p>'}</div>
    <h2>Conflicts between files</h2><div class="facts qgroup">${Q.conflicts.map((q) => row(q, 'CONFLICT')).join('')}</div>
    <h2>Closed</h2><div class="facts qgroup closed">${closed.map((q) => { const d = quote(q.src); return `<div class="fact"><div class="t"><b>${inline(q.t)}</b><div class="answer"><span class="qmark" aria-hidden="true">“</span>${d.text == null ? '<span class="missing-q">quote not found</span>' : markPhrase(atBase(q.src && q.src.path, () => inline(d.text)), d.phrase)}</div></div><div class="meta">${chip('decided')}${srcLink(d.src)}</div></div>`; }).join('')}</div>
    ${legacyBox('Questions from earlier versions of the game', `<div class="facts qgroup">${Q.legacy.map((q) => row(q)).join('')}</div>` +
      Q.legacy_lists.map((g) => `<h3>${esc(g.title)}</h3><div class="facts qgroup">${g.items.map((q) => row(q)).join('')}</div>`).join(''),
      Q.legacy.length + Q.legacy_lists.reduce((a, g) => a + g.items.length, 0))}
  </div>`;
}

function pageSources() {
  const live = LIVE.SOURCES;
  const st = (p) => L.ok[p] === true ? chip('live') : L.ok[p] === 'snapshot' ? '<span class="st draft">from the build snapshot</span>' : L.ok[p] === false ? '<span class="st rejected">failed</span>' : '<span class="st draft">on demand</span>';
  return `<div class="page"><h1>Sources</h1>
    <p class="lede">What the bible reads, and from where. Live sources are fetched every time the page loads; the hand-kept part is bible/facts.yaml, turned into bible/data.json by tools/bible/build.py (./start runs it).</p>
    <h2>Read live</h2><div class="tablewrap"><table class="t"><thead><tr><th>Source</th><th>What it gives the bible</th><th>Status</th></tr></thead><tbody>
      ${live.map(([p, w]) => `<tr><td>${/^https?:/.test(p) ? `<a href="${esc(p)}">${esc(p)}</a>` : /\/$/.test(p) ? `<span class="src">${esc(p)}</span>` : `<a class="src" href="#src/${esc(p)}">${esc(p)}</a>`}</td><td>${esc(w)}</td><td>${st(p)}</td></tr>`).join('')}
    </tbody></table></div>
    <h2>Built by tools/bible/build.py</h2><div class="list">
      <div><span>Hand-kept facts: history, rejections with Jørgen's words, which GUIDE lines to quote, review notes, open questions</span><a class="src" href="#src/bible/facts.yaml">bible/facts.yaml</a></div>
      <div><span>Review page dates and whether they're committed (git)</span><span class="src">git log</span></div>
      <div><span>Approved portrait prompts</span><span class="src">art/production/manifest.json (local only), tools/emi2.py</span></div>
      <div><span>Image dashboard presets</span><a class="src" href="#src/tools/imagegen/seed.py">tools/imagegen/seed.py</a></div>
      <div><span>Old expression sets and mini-story arcs (Legacy sections)</span><span class="src">legacy/proto2/gallery/, legacy/game/img/ch/, notes/mini-stories.md</span></div>
      ${P ? `<div><span>Reward picks (private page only)</span><span class="src">island/private/rewards/</span></div>` : ''}
    </div>
    <p class="muted small">Built ${esc(D.generated)}.</p></div>`;
}

function pageRewards() {
  if (!P) return notFound();
  const chars = D.characters.filter((c) => P.rewards[c.id] && P.rewards[c.id].length);
  return `<div class="page"><h1>Reward pictures <span class="st rejected">private</span></h1>
    <p class="lede">Picks per character from the concept rounds, round 27 and round 28. Local only.</p>
    <h2>Rules</h2>${factRows(P.rules)}
    <h2>Pages</h2><div class="list">${P.pages.map((p) => `<div><a href="${esc(url(p.path))}">${esc(p.title)}</a><span class="src">${esc(p.path)}</span></div>`).join('')}</div>
    <h2>By character</h2><div class="list">${chars.map((c) => `<div><a href="#character/${c.id}"><b>${esc(c.name)}</b></a><span class="muted">${P.rewards[c.id].length} concepts, ${P.rewards[c.id].filter((r) => r.s === 'approved').length} picked by Jørgen</span></div>`).join('')}</div>
    <h2>Group scenes</h2>${rewardCards(P.group)}</div>`;
}

async function pageDoc(path) {
  const r = await fetch(url(path)); if (!r.ok) return notFound();
  const t = await r.text();
  const draft = /^notes\//.test(path) && !/^notes\/(PRODUCTION|VISUAL_QA|PERF)\.md$/.test(path);
  const legacy = /^legacy\//.test(path) || D.story.legacy_docs.some((d) => d.path === path);
  const st = L.stories.find((x) => x.file === path);
  if (st) return pageStoryline(st.id);
  return `<div class="page"><div class="crumbs"><a href="#story">Stories</a> / <a href="#src/${esc(path)}">view source</a> ${legacy ? chip('legacy') : draft ? chip('draft') + ' <span class="muted small">design, not approved</span>' : ''}</div><div class="md" style="max-width:82ch">${atBase(path, () => md(t))}</div></div>`;
}
async function pageSrc(spec) {
  const m = spec.match(/^(.*?)(?::(\d+))?$/); const path = m[1], line = +m[2] || 0;
  const r = await fetch(url(path)); if (!r.ok) return notFound();
  const lines = (await r.text()).split('\n');
  const isMd = /\.md$/.test(path);
  setTimeout(() => { const el = document.getElementById('L' + line); if (el) el.scrollIntoView({ block: 'center' }); }, 30);
  return `<div class="page"><div class="crumbs">Source${isMd ? ` · <a href="#doc/${esc(path)}">read it formatted</a>` : ''}</div><h1 style="font-size:20px;font-family:var(--mono)">${esc(path)}${line ? `:${line}` : ''}</h1>
    <div class="srcview">${lines.map((l, i) => `<div id="L${i + 1}" class="${i + 1 === line ? 'hl' : ''}"><span>${i + 1}</span><span>${esc(l)}</span></div>`).join('')}</div></div>`;
}
function notFound() { return `<div class="page"><h1>Not found</h1><p><a href="#home">Back to the start</a></p></div>`; }


// ------------------------------------------------------------------ review queue
// Items: reviews/<id>/review.json (written by agents, see reviews/README.md). Jørgen's answer: reviews/<id>/feedback.json,
// saved by the Send button through tools/review_server.py (POST /api/review/<id>). Drafts are kept in this browser
// until sent, so a half-written comment survives a reload.
const RSTATUS = { open: 'open', decided: 'decided', superseded: 'superseded' };
const openReviews = () => (L.reviews || []).filter((r) => (r.status || 'open') === 'open');
const unread = (r) => r.feedback && r.feedback.sent && !r.feedback.read;
// Both kinds of answer share the draft, send and status code; `kind` is 'review' or 'showcase'.
const FOLDER = { review: 'reviews', showcase: 'showcase' };
const FROM_SENT = {
  review: (f) => ({ picked: [...(f.picked || [])], options: JSON.parse(JSON.stringify(f.options || {})), comment: f.comment || '' }),
  showcase: (f) => ({ flag: !!f.flag, items: JSON.parse(JSON.stringify(f.items || {})), comment: f.comment || '' }),
};
function draftKey(kind, id) { return `bible-${kind}-draft-${id}`; }
function loadDraft(kind, r) {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(draftKey(kind, r.id)) || 'null'); } catch (_) { d = null; }
  if (d) return d;
  const f = r.feedback || {};
  return { ...FROM_SENT[kind](f), fromSent: !!f.sent };
}
function saveDraft(kind, id, d) { try { localStorage.setItem(draftKey(kind, id), JSON.stringify(d)); } catch (_) {} }
function clearDraft(kind, id) { try { localStorage.removeItem(draftKey(kind, id)); } catch (_) {} }
const sentLine = (fb) => fb && fb.sent ? `Last sent ${esc(fb.sent.replace('T', ' ').slice(0, 16))}${fb.read ? ', read by the agents' : ', not read yet'}.` : 'Not sent yet.';
function markChanged(box) { const st = box.querySelector('.rstate'); st.textContent = 'Changed, not sent yet.'; st.className = 'rstate muted small'; }
// POST the answer to tools/review_server.py; `box` holds the Send button (.rsendbtn) and the status line (.rstate).
async function sendAnswer(kind, id, d, box) {
  const b = box.querySelector('.rsendbtn'), st = box.querySelector('.rstate');
  b.disabled = true; st.textContent = 'Sending…';
  try {
    const res = await fetch(new URL(`api/${kind}/` + encodeURIComponent(id), new URL(ROOT, location.href)).href, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.ok) throw new Error(j.error || `the server said ${res.status}`);
    clearDraft(kind, id);
    await (kind === 'review' ? L.reloadReviews() : L.reloadShowcase());
    renderNav();
    st.textContent = `Sent ${j.sent.replace('T', ' ').slice(0, 16)}. Saved to ${FOLDER[kind]}/${id}/feedback.json.`;
    st.className = 'rstate ok small';
  } catch (err) {
    st.textContent = `Not sent: ${err.message}. Saving needs the server from ./start (tools/review_server.py). Your draft is kept in this browser.`;
    st.className = 'rstate err small';
  } finally { b.disabled = false; }
}
const media = (m, cap) => m.audio
  ? `<figure class="raudio"><audio controls preload="none" src="${esc(url(m.audio))}"></audio><figcaption>${esc(cap || m.caption || m.audio)}</figcaption></figure>`
  : m.image ? `<figure>${img(m.image, cap || m.caption || m.image)}${(cap || m.caption) ? `<figcaption>${inline(cap || m.caption)}</figcaption>` : ''}</figure>` : '';
function pickedText(r) {
  const ids = r.decided || (r.feedback && r.feedback.picked) || [];
  return ids.map((id) => { const o = (r.options || []).find((x) => x.id === id); return o ? o.label : id; }).join(', ');
}
function reviewRow(r) {
  const st = r.status || 'open';
  const opt = r.options || [];
  const thumb = (r.media || []).concat(opt).find((m) => m.image);
  const fb = r.feedback;
  return `<a class="rrow" href="#review/${esc(r.id)}">
    <div class="rth">${thumb ? `<img src="${esc(url(thumb.image))}" alt="" loading="lazy" decoding="async">` : `<span class="raud" aria-hidden="true">♪</span>`}</div>
    <div class="rbody"><b>${esc(r.title)}</b>
      <span class="muted small">${esc(r.date || '')} · ${esc(r.by || '')} · ${opt.length} options</span>
      ${st === 'decided' ? `<span class="small">Decided: <b>${esc(pickedText(r))}</b>${r.decision ? ` · <span class="muted">${inline(r.decision)}</span>` : ''}</span>` : `<span class="small">${esc(r.question || '')}</span>`}
    </div>
    <div class="rst">${chip(st === 'open' ? 'open' : st === 'decided' ? 'decided' : 'legacy')}${fb && fb.sent ? `<span class="st ${unread(r) ? 'new' : 'draft'}">${unread(r) ? 'sent, not read yet' : 'answered'}</span>` : st === 'open' ? '<span class="st waiting">waiting for you</span>' : ''}</div></a>`;
}
function pageReviewQueue() {
  const R = L.reviews || [];
  const open = R.filter((r) => (r.status || 'open') === 'open');
  const dec = R.filter((r) => r.status === 'decided');
  const sup = R.filter((r) => r.status === 'superseded');
  return `<div class="page"><h1>Review</h1>
    <p class="lede">Things waiting for your pick. Open one, pick what works, star or reject options, comment on any of them, and press Send. Your answer is saved in the repo (reviews/&lt;id&gt;/feedback.json) and the agents read it from there.</p>
    <h2>Open <span class="muted">(${open.length})</span></h2>
    <div class="rlist">${open.map(reviewRow).join('') || '<p class="muted">Nothing waiting.</p>'}</div>
    <h2>Decided <span class="muted">(${dec.length})</span></h2>
    <div class="rlist">${dec.map(reviewRow).join('') || '<p class="muted">Nothing decided here yet.</p>'}</div>
    ${sup.length ? legacyBox('Superseded by a newer round', `<div class="rlist">${sup.map(reviewRow).join('')}</div>`, sup.length) : ''}
    <p class="muted small" style="margin-top:22px">How agents add items: <a href="#doc/reviews/README.md">reviews/README.md</a>.</p></div>`;
}
function pageReviewItem(id) {
  const r = (L.reviews || []).find((x) => x.id === id); if (!r) return notFound();
  const st = r.status || 'open';
  const d = loadDraft('review', r);
  const multi = r.multi !== false;
  const fb = r.feedback;
  const opts = (r.options || []).map((o) => {
    const v = d.options[o.id] || {};
    const on = d.picked.includes(o.id);
    const won = (r.decided || []).includes(o.id);
    return `<div class="ropt${on ? ' picked' : ''}${v.reject ? ' rejected' : ''}${won ? ' won' : ''}" data-opt="${esc(o.id)}">
      ${o.image ? `<div class="rimg">${img(o.image, o.label)}</div>` : ''}
      ${(o.images || []).length ? `<div class="rmore">${o.images.map((p) => img(p, `${o.label}: ${p.split('/').pop()}`)).join('')}</div>` : ''}
      ${o.audio ? `<audio controls preload="none" src="${esc(url(o.audio))}"></audio>` : ''}
      <div class="rlab"><b>${esc(o.label)}</b>${won ? ` ${chip('decided')}` : ''}${o.note ? `<span class="muted small">${inline(o.note)}</span>` : ''}</div>
      <div class="racts">
        <button type="button" class="rpick" data-act="pick" aria-pressed="${on}">${on ? (multi ? '✓ Picked' : '● Picked') : (multi ? 'Pick' : 'Pick this')}</button>
        <button type="button" class="rstar" data-act="star" aria-pressed="${!!v.star}" aria-label="Star">${v.star ? '★' : '☆'}</button>
        <button type="button" class="rrej" data-act="reject" aria-pressed="${!!v.reject}">${v.reject ? 'Rejected' : 'Reject'}</button>
      </div>
      <textarea class="rcom" data-act="comment" rows="2" placeholder="Comment on ${esc(o.label)}" aria-label="Comment on ${esc(o.label)}">${esc(v.comment || '')}</textarea>
    </div>`;
  }).join('');
  return `<div class="page review" data-review="${esc(r.id)}"><div class="crumbs"><a href="#review">Review</a> /</div>
    <h1>${esc(r.title)}</h1>
    <div class="pill-row">${chip(st === 'superseded' ? 'legacy' : st)}<span class="pill">${esc(r.date || '')}</span><span class="pill">by ${esc(r.by || '')}</span><span class="pill">${multi ? 'pick one or more' : 'pick one'}</span></div>
    ${st === 'decided' ? `<div class="rdecision"><b>Decided: ${esc(pickedText(r))}</b>${r.decision ? `<div>${inline(r.decision)}</div>` : ''}${r.issue ? `<div class="small">The work on it: <a href="${esc(WORK.issueUrl(r.issue))}">issue #${esc(r.issue)}</a></div>` : ''}</div>` : ''}
    <p class="rq">${inline(r.question || '')}</p>
    ${(r.media || []).length ? `<div class="rmedia" data-lbg>${r.media.map((m) => media(m)).join('')}</div>` : ''}
    ${(r.links || []).length ? `<p class="small">${r.links.map((l) => `<a href="${esc(/^https?:|^#/.test(l.href) ? l.href : ROOT + l.href)}">${esc(l.label)}</a>`).join(' · ')}</p>` : ''}
    <h2>Options</h2>
    <div class="ropts" data-lbg>${opts}</div>
    <h2>Overall</h2>
    <textarea class="rcom overall" data-act="overall" rows="4" placeholder="Anything about the round as a whole" aria-label="Overall comment">${esc(d.comment || '')}</textarea>
    <div class="rsend"><button type="button" id="rsend" class="rsendbtn">Send</button><span class="rstate muted small" aria-live="polite">${sentLine(fb)}</span></div>
    ${fb && (fb.history || []).length ? legacyBox('Earlier sends', fb.history.slice().reverse().map((h) => `<div class="fact"><div class="t"><b>${esc((h.sent || '').replace('T', ' ').slice(0, 16))}</b> picked ${esc((h.picked || []).join(', ') || 'nothing')}${h.comment ? `<div class="muted">${esc(h.comment)}</div>` : ''}</div></div>`).join(''), fb.history.length) : ''}
  </div>`;
}
function reviewDraftFromDom(page) {
  const d = { picked: [], options: {}, comment: page.querySelector('[data-act=overall]').value };
  page.querySelectorAll('.ropt').forEach((el) => {
    const id = el.dataset.opt;
    if (el.classList.contains('picked')) d.picked.push(id);
    const star = el.querySelector('[data-act=star]').getAttribute('aria-pressed') === 'true';
    const reject = el.querySelector('[data-act=reject]').getAttribute('aria-pressed') === 'true';
    const comment = el.querySelector('[data-act=comment]').value;
    if (star || reject || comment) d.options[id] = { star, reject, comment };
  });
  return d;
}
function reviewClick(e) {
  const page = e.target.closest('.page.review'); if (!page) return false;
  const btn = e.target.closest('button[data-act]');
  const id = page.dataset.review, r = L.reviews.find((x) => x.id === id);
  if (btn) {
    const el = btn.closest('.ropt'), act = btn.dataset.act;
    if (act === 'pick') {
      const on = !el.classList.contains('picked');
      if (on && r.multi === false) page.querySelectorAll('.ropt.picked').forEach((x) => { x.classList.remove('picked'); x.querySelector('[data-act=pick]').setAttribute('aria-pressed', 'false'); x.querySelector('[data-act=pick]').textContent = 'Pick this'; });
      el.classList.toggle('picked', on); btn.setAttribute('aria-pressed', String(on));
      btn.textContent = on ? (r.multi === false ? '● Picked' : '✓ Picked') : (r.multi === false ? 'Pick this' : 'Pick');
      if (on) { el.classList.remove('rejected'); const rj = el.querySelector('[data-act=reject]'); rj.setAttribute('aria-pressed', 'false'); rj.textContent = 'Reject'; }
    } else if (act === 'star') {
      const on = btn.getAttribute('aria-pressed') !== 'true'; btn.setAttribute('aria-pressed', String(on)); btn.textContent = on ? '★' : '☆';
    } else if (act === 'reject') {
      const on = btn.getAttribute('aria-pressed') !== 'true'; btn.setAttribute('aria-pressed', String(on)); btn.textContent = on ? 'Rejected' : 'Reject';
      el.classList.toggle('rejected', on);
      if (on) { el.classList.remove('picked'); const pk = el.querySelector('[data-act=pick]'); pk.setAttribute('aria-pressed', 'false'); pk.textContent = r.multi === false ? 'Pick this' : 'Pick'; }
    }
    saveDraft('review', id, reviewDraftFromDom(page));
    markChanged(page);
    return true;
  }
  if (e.target.id === 'rsend') { sendAnswer('review', r.id, reviewDraftFromDom(page), page); return true; }
  return false;
}

// ------------------------------------------------------------------ showcase log
// Finished visible work, newest first: showcase/<id>/entry.json (format: showcase/README.md). Jørgen can flag and
// comment on an entry and on each image, and Send saves showcase/<id>/feedback.json. No picks: decisions go in Review.
const showcaseSections = (e) => [...((e.images || []).length ? [{ images: e.images }] : []), ...(e.sections || [])];
function showcaseImage(im, v) {
  return `<div class="ropt scimg${v.flag ? ' flagged' : ''}" data-item="${esc(im.id)}">
    <div class="rimg">${img(im.image, im.caption || im.id)}</div>
    ${im.caption ? `<div class="rlab"><span>${inline(im.caption)}</span></div>` : ''}
    <div class="racts"><button type="button" class="rflag" data-act="flag" aria-pressed="${!!v.flag}">${v.flag ? '⚑ Flagged' : '⚑ Flag'}</button></div>
    <textarea class="rcom" data-act="comment" rows="2" placeholder="Comment on this picture" aria-label="Comment on ${esc(im.caption || im.id)}">${esc(v.comment || '')}</textarea>
  </div>`;
}
function showcaseEntry(e, solo) {
  const d = loadDraft('showcase', e), fb = e.feedback;
  const H = solo ? 'h1' : 'h2';
  const commits = [].concat(e.commit || []);
  return `<article class="scentry" data-showcase="${esc(e.id)}" data-lbg>
    <${H} class="sctitle">${solo ? esc(e.title) : `<a href="#showcase/${esc(e.id)}">${esc(e.title)}</a>`}</${H}>
    <div class="pill-row"><span class="pill">${esc(e.date || '')}</span><span class="pill">by ${esc(e.by || '')}</span>${commits.map((c) => `<span class="pill mono" title="${esc(c)}">${esc(String(c).slice(0, 7))}</span>`).join('')}</div>
    ${e.caption ? `<p class="rq">${inline(e.caption)}</p>` : ''}
    ${(e.links || []).length ? `<p class="small">${e.links.map((l) => `<a href="${esc(/^https?:|^#/.test(l.href) ? l.href : ROOT + l.href)}">${esc(l.label)}</a>`).join(' · ')}</p>` : ''}
    ${showcaseSections(e).map((sec) => `<section class="scsec">${sec.title ? `<h3>${esc(sec.title)}</h3>` : ''}${sec.caption ? `<p class="muted">${inline(sec.caption)}</p>` : ''}
      <div class="ropts">${(sec.images || []).map((im) => showcaseImage(im, (d.items || {})[im.id] || {})).join('')}</div></section>`).join('')}
    <div class="scall"><div class="racts"><button type="button" class="rflag" data-act="flag" aria-pressed="${!!d.flag}">${d.flag ? '⚑ Flagged' : '⚑ Flag the whole entry'}</button></div>
      <textarea class="rcom overall" data-act="overall" rows="3" placeholder="Anything about ${esc(e.title)} as a whole" aria-label="Comment on the whole entry">${esc(d.comment || '')}</textarea></div>
    <div class="rsend"><button type="button" class="rsendbtn" data-act="send">Send</button><span class="rstate muted small" aria-live="polite">${sentLine(fb)}</span></div>
    ${fb && (fb.history || []).length ? legacyBox('Earlier sends', fb.history.slice().reverse().map((h) => `<div class="fact"><div class="t"><b>${esc((h.sent || '').replace('T', ' ').slice(0, 16))}</b>${h.flag ? ' flagged' : ''}${h.comment ? `<div class="muted">${esc(h.comment)}</div>` : ''}</div></div>`).join(''), fb.history.length) : ''}
  </article>`;
}
function pageShowcase(id) {
  const all = L.showcase || [];
  if (id) {
    const e = all.find((x) => x.id === id); if (!e) return notFound();
    return `<div class="page showcase"><div class="crumbs"><a href="#showcase">Showcase</a> /</div>${showcaseEntry(e, true)}</div>`;
  }
  return `<div class="page showcase"><h1>Showcase</h1>
    <p class="lede">Finished work you can see, newest first. Nothing here needs a pick; choices go to <a href="#review">Review</a>. Flag anything that looks wrong, comment on an entry or a single picture, and press that entry's Send. Your notes are saved in the repo (showcase/&lt;id&gt;/feedback.json) and the agents read them from there.</p>
    ${all.map((e) => showcaseEntry(e, false)).join('') || '<p class="muted">Nothing here yet.</p>'}
    <p class="muted small" style="margin-top:22px">How agents add entries: <a href="#doc/showcase/README.md">showcase/README.md</a>.</p></div>`;
}
function showcaseDraftFromDom(box) {
  const pressed = (el) => el.querySelector('[data-act=flag]').getAttribute('aria-pressed') === 'true';
  const d = { flag: pressed(box.querySelector('.scall')), comment: box.querySelector('[data-act=overall]').value, items: {} };
  box.querySelectorAll('.scimg').forEach((el) => {
    const flag = pressed(el), comment = el.querySelector('[data-act=comment]').value;
    if (flag || comment) d.items[el.dataset.item] = { flag, comment };
  });
  return d;
}
function showcaseClick(e) {
  const box = e.target.closest('.scentry'), btn = e.target.closest('button[data-act]');
  if (!box || !btn) return false;
  if (btn.dataset.act === 'send') { sendAnswer('showcase', box.dataset.showcase, showcaseDraftFromDom(box), box); return true; }
  const on = btn.getAttribute('aria-pressed') !== 'true', card = btn.closest('.scimg');
  btn.setAttribute('aria-pressed', String(on));
  btn.textContent = on ? '⚑ Flagged' : card ? '⚑ Flag' : '⚑ Flag the whole entry';
  if (card) card.classList.toggle('flagged', on);
  saveDraft('showcase', box.dataset.showcase, showcaseDraftFromDom(box));
  markChanged(box);
  return true;
}

// ------------------------------------------------------------------ search
function buildIndex() {
  const idx = [];
  const add = (title, text, route, kind) => idx.push({ title, text: String(text || ''), route, kind, low: (title + ' ' + text).toLowerCase() });
  const ft = (l) => (l || []).map((f) => f.q ? (quote(f.src).text || '') : f.t).join(' \n ');
  D.characters.forEach((c) => {
    const g = game(c);
    add(c.name, [ft(c.decisions), ft(c.facts), ft(c.legacy), c.pick, g && g.cast, g && g.voice, g && g.people && g.people.about].join(' '), `character/${c.id}`, 'Character');
    if (g) g.samples.forEach((s) => add(`${c.name}: line (${s.place})`, s.text, `character/${c.id}`, 'Line'));
    c.prompts.forEach((p) => add(`${c.name}: ${p.title}`, p.prompt, `character/${c.id}`, 'Prompt'));
  });
  Object.entries(L.words).forEach(([id, w]) => add(`${w.ja} (${w.ro})`, `${w.en} ${id}`, 'words', 'Word'));
  L.places.forEach((p) => add(p.title, p.body + ' ' + ft((D.places.find((x) => x.id === p.id) || {}).quotes), 'places', 'Place'));
  D.locations.forEach((l) => add(`${l.name} (VN painting)`, ft(l.facts), 'places', 'Legacy'));
  L.stories.forEach((st) => add(st.title, L.files[st.file] || st.premise, `story/${st.id}`, 'Storyline'));
  ['docs/game/setting.md', 'docs/game/systems.md', 'docs/game/controls-and-ui.md', 'docs/game/art-and-sound.md'].forEach((p) => (L.files[p] || '').split(/\n(?=#{1,3} )/).forEach((sec) => add(`${p.replace('docs/game/', '')}: ${(sec.match(/^#+\s*(.*)/) || [, ''])[1]}`, sec, `doc/${p}`, 'Game facts')));
  ['notes/RELATIONSHIPS.md', 'notes/ISLAND.md'].forEach((p) => (L.files[p] || '').split(/\n(?=#{1,3} )/).forEach((sec) => add(`${p}: ${(sec.match(/^#+\s*(.*)/) || [, ''])[1]}`, sec, `doc/${p}`, 'Design (draft)')));
  D.rules.forEach((g) => add(`Rules: ${g.group}`, ft(g.quotes), 'rules', 'Rule'));
  D.story.legacy.concat(D.legacy_rules).forEach((f) => add('Legacy', f.t, 'rules', 'Legacy'));
  add('Art and style', ft(D.art.models) + ft(D.art.quotes) + ft(D.art.donts), 'art', 'Art');
  add('Audio', ft(D.audio.music) + ft(D.audio.quotes), 'audio', 'Audio');
  (L.showcase || []).forEach((e) => add(e.title, [e.caption, ...showcaseSections(e).flatMap((sec) => [sec.title, sec.caption, ...(sec.images || []).map((im) => im.caption)])].join(' '), `showcase/${e.id}`, 'Showcase'));
  D.reviews.forEach((r) => add(r.title, `${r.path} ${r.what} ${r.note} ${r.status} ${r.date}`, 'reviews', r.group === 'legacy' ? 'Review page (legacy)' : 'Review page'));
  const Q = D.questions;
  Q.open.concat(Q.conflicts).forEach((q) => add('Open question', q.t, 'questions', 'Question'));
  Q.closed.forEach((q) => add('Closed question', q.t, 'questions', 'Question'));
  Q.legacy.forEach((q) => add('Legacy question', q.t, 'questions', 'Legacy'));
  D.cast_rules.concat(D.removed).forEach((f) => add('Cast', f.t || ft([f]), 'characters', 'Cast'));
  if (P) Object.entries(P.rewards).forEach(([cid, list]) => list.forEach((r) => add(`Reward: ${r.title}`, `${r.pick || ''} ${r.note || ''} ${r.trigger || ''}`, `character/${cid}`, 'Reward (private)')));
  return idx;
}
function snippet(text, terms) {
  const low = text.toLowerCase();
  const at = Math.max(0, low.indexOf(terms[0]) - 60);
  let s = text.slice(at, at + 220).replace(/\s+/g, ' ');
  s = esc((at ? '…' : '') + s + (at + 220 < text.length ? '…' : ''));
  terms.forEach((t) => { if (t) s = s.replace(new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), (m) => `<mark>${m}</mark>`); });
  return s;
}
function pageSearch(q) {
  INDEX = INDEX || buildIndex();
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return `<div class="page"><h1>Search</h1><p class="muted">Type in the box on the left.</p></div>`;
  const hits = INDEX.map((it) => {
    if (!terms.every((t) => it.low.includes(t))) return null;
    let score = terms.reduce((a, t) => a + (it.title.toLowerCase().includes(t) ? 5 : 0) + (it.low.split(t).length - 1), 0);
    if (it.kind === 'Character' || it.kind === 'Place' || it.kind === 'Storyline') score += 4;
    if (/Legacy|legacy/.test(it.kind)) score -= 3;
    return { it, score };
  }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 80);
  return `<div class="page"><h1>Search: ${esc(q)}</h1><p class="muted">${hits.length}${hits.length === 80 ? '+' : ''} results</p>
    <div class="list results">${hits.map(({ it }) => `<a class="r" href="#${esc(it.route)}"><div class="w">${esc(it.kind)}</div><b>${esc(it.title)}</b><div style="font-size:13.5px;color:var(--ink-2)">${snippet(it.text || it.title, terms)}</div></a>`).join('') || '<div>No results.</div>'}</div></div>`;
}

// ------------------------------------------------------------------ router
const OLD = { locations: 'places', location: 'places', jobs: 'words', lore: 'rules', stories: 'story' };
async function route() {
  let h = decodeURIComponent(location.hash.slice(1)) || 'home';
  let [head, ...rest] = h.split('/');
  if (OLD[head]) { head = OLD[head]; rest = []; h = head; }
  const arg = rest.join('/');
  if (head === 'review' && L.reloadReviews) await L.reloadReviews();
  if (head === 'showcase' && L.reloadShowcase) await L.reloadShowcase();
  if (head === 'work' && L.reloadWork) await L.reloadWork();
  let html, after = null;
  switch (head) {
    case 'home': html = pageHome(); break;
    case 'review': html = arg ? pageReviewItem(arg) : pageReviewQueue(); break;
    case 'showcase': html = pageShowcase(arg); break;
    case 'work': html = WORK.pageWork(L, { esc, inline }); break;
    case 'characters': html = pageCharacters(); break;
    case 'character': html = pageCharacter(arg); break;
    case 'places': html = pagePlaces(); break;
    case 'story': html = arg ? await pageStoryline(arg) : pageStory(); break;
    case 'place-map': html = `<div class="page pmap" id="pmap"><h1>Places diagram</h1><p class="muted">Reading places.md…</p></div>`;
      after = async () => {
        const opts = { arg, here: HERE, liveTag, url, img, doc: L.files['docs/game/places.md'] || '', md: (t) => atBase('docs/game/places.md', () => md(t)), link: (p) => `<a href="#doc/${esc(p)}">${esc(p)}</a>` };
        try { await (await import(new URL('places-map.js', HERE).href)).mount($('#pmap'), opts); } catch (e) { $('#pmap').innerHTML = `<h1>Places diagram</h1><p>The diagram didn't load: ${esc(e.message)}</p>`; }
      };
      break;
    case 'story-map': html = `<div class="page smap" id="smap"><h1>Story map</h1><p class="muted">Reading the story files…</p></div>`;
      after = async () => { try { await (await import(new URL('story-map.js', HERE).href)).mount($('#smap'), { ROOT, arg, here: HERE, liveTag }); } catch (e) { $('#smap').innerHTML = `<h1>Story map</h1><p>The map didn't load: ${esc(e.message)}</p>`; } };
      break;
    case 'words': html = pageWords(); break;
    case 'rules': html = pageRules(); break;
    case 'art': html = pageArt(); break;
    case 'audio': html = pageAudio(); break;
    case 'reviews': html = pageReviews(); break;
    case 'questions': html = pageQuestions(); break;
    case 'sources': html = pageSources(); break;
    case 'rewards': html = pageRewards(); break;
    case 'search': html = pageSearch(arg); break;
    case 'doc': html = await pageDoc(arg); break;
    case 'src': html = await pageSrc(arg); break;
    default: html = notFound();
  }
  $('#main').innerHTML = html;
  if (after) await after();
  const navKey = { character: 'characters', doc: 'story', src: '' }[head] ?? head;
  if (head === 'review' || head === 'showcase' || head === 'work') renderNav();
  document.querySelectorAll('.nav li a').forEach((a) => a.classList.toggle('on', a.dataset.r === navKey || a.dataset.r === h));
  $('.nav').classList.remove('open');
  if (head !== 'search') { const s = $('#q'); if (document.activeElement !== s) s.value = ''; }
  if (head !== 'src') window.scrollTo(0, 0);
  const t = $('#main h1'); document.title = (t ? t.textContent.trim() + ' · ' : '') + 'Amakawa bible' + (P ? ' (private)' : '');
  document.body.dataset.ready = '1';
}

function renderNav() {
  const stuck = (L.workStale || []).length;
  const n = { review: openReviews().length, showcase: (L.showcase || []).length, characters: D.characters.length, reviews: D.reviews.filter((r) => r.group === 'current').length, questions: openQuestions().length, words: Object.keys(L.words).length };
  const items = NAV.concat(P ? [['rewards', 'Reward pictures']] : []);
  const newFb = (L.reviews || []).filter(unread).length;
  $('#navlist').innerHTML = items.map(([r, t]) => `<li${r === 'review' ? ' class="navreview"' : ''}><a href="#${r}" data-r="${r}">${esc(t)}${r === 'review' ? `<small class="${n.review ? 'badge' : ''}" title="${n.review} open${newFb ? `, ${newFb} answered but not read yet` : ''}">${n.review}</small>` : r === 'work' ? (stuck ? `<small class="badge stuck" title="${stuck} stuck">${stuck}</small>` : '') : n[r] ? `<small>${n[r]}</small>` : ''}</a></li>`).join('');
  const now = D.characters.filter(inGame), later = D.characters.filter((c) => !inGame(c));
  const li = (c) => `<li class="sub"><a href="#character/${c.id}" data-r="character/${c.id}">${esc(c.name.replace(' (idea)', ''))}</a></li>`;
  $('#cast').innerHTML = `<li class="navhead">In the game</li>${now.map(li).join('')}<li class="navhead">Later</li>${later.map(li).join('')}`;
}

async function init() {
  const [d, p] = await Promise.all([
    fetch(DATA_URL, { cache: 'no-cache' }).then((r) => r.json()),
    PRIVATE_URL ? fetch(PRIVATE_URL, { cache: 'no-cache' }).then((r) => r.ok ? r.json() : null).catch(() => null) : null,
  ]);
  D = d; P = p;
  [LIVE, WORK] = await Promise.all([import(new URL('live.js', HERE).href), import(new URL('work.js', HERE).href)]);
  // every file a quote points at, so quotes can be read synchronously while rendering
  const quoted = new Set();
  JSON.stringify(D).replace(/"q":true,"s":"[a-z]+","src":\{"path":"([^"]+)"/g, (m, path) => quoted.add(path));
  if (P) JSON.stringify(P).replace(/"q":true,"s":"[a-z]+","src":\{"path":"([^"]+)"/g, (m, path) => quoted.add(path));
  D.characters.forEach((c) => c.walkthrough && quoted.add(c.walkthrough));
  L = await LIVE.loadLive(ROOT, D.snapshot, [...quoted].filter((x) => !/^https?:/.test(x)));
  if (P) document.querySelector('.brand span').innerHTML = '<span class="priv">private</span>';
  renderNav();
  L.reloadWork().then(renderNav);  // GitHub issues can take a second; the nav's stuck count follows when they arrive
  let timer;
  $('#q').addEventListener('input', (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const v = e.target.value.trim();
      const target = v ? '#search/' + encodeURIComponent(v) : '#home';
      if (location.hash.startsWith('#search/')) history.replaceState(null, '', target); else history.pushState(null, '', target);
      route();
    }, 140);
  });
  // Single-key shortcuts never fire while typing (Jørgen: "/" jumped to search while he typed a comment), during
  // IME composition (Japanese input), or with a modifier held.
  const typing = (e) => e.isComposing || e.keyCode === 229 || e.ctrlKey || e.metaKey || e.altKey ||
    !!(e.target.closest && e.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])'));
  document.addEventListener('keydown', (e) => {
    if (typing(e)) return;
    if ($('#lb').classList.contains('on')) {
      if (e.key === 'Escape') closeLB();
      if (e.key === 'ArrowRight') { LB.i = (LB.i + 1) % LB.list.length; showLB(); }
      if (e.key === 'ArrowLeft') { LB.i = (LB.i - 1 + LB.list.length) % LB.list.length; showLB(); }
      return;
    }
    if (e.key === '/') { e.preventDefault(); $('#q').focus(); }
  });
  document.addEventListener('input', (e) => {
    if (!e.target.matches('textarea')) return;
    const page = e.target.closest('.page.review'), box = e.target.closest('.scentry');
    if (page) { saveDraft('review', page.dataset.review, reviewDraftFromDom(page)); markChanged(page); }
    if (box) { saveDraft('showcase', box.dataset.showcase, showcaseDraftFromDom(box)); markChanged(box); }
  });
  document.addEventListener('click', (e) => {
    if (reviewClick(e) || showcaseClick(e)) return;
    const im = e.target.closest('[data-lb]');
    if (im) { e.preventDefault(); openLB(im); return; }
    const j = e.target.closest('[data-jump]');
    if (j) { e.preventDefault(); const t = document.getElementById(j.dataset.jump); if (t) { const det = t.querySelector('details'); if (det) det.open = true; t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); } return; }
    const f = e.target.closest('.filters button');
    if (f) { RV[f.parentElement.dataset.f] = f.dataset.v; route(); return; }
  });
  $('#lb .x').onclick = closeLB;
  $('#lb').addEventListener('click', (e) => { if (e.target.id === 'lb') closeLB(); });
  $('#lb .n').onclick = (e) => { e.stopPropagation(); LB.i = (LB.i + 1) % LB.list.length; showLB(); };
  $('#lb .p').onclick = (e) => { e.stopPropagation(); LB.i = (LB.i - 1 + LB.list.length) % LB.list.length; showLB(); };
  $('#menu').onclick = () => $('.nav').classList.toggle('open');
  $('#theme').onclick = () => {
    const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('bible-theme', next); } catch (_) {}
  };
  window.addEventListener('hashchange', route);
  route();
}
try { const t = localStorage.getItem('bible-theme'); if (t) document.documentElement.dataset.theme = t; } catch (_) {}
init().catch((e) => { $('#main').innerHTML = `<div class="page"><h1>The bible didn't load</h1><p>${esc(e.message)}</p><p class="muted">Serve the repo with ./start and open http://127.0.0.1:8771/bible/.</p></div>`; });
