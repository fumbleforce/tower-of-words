import { characterRoutes, calendarStories, excerpt } from './story-timeline-model.js';
import { section } from './live.js';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const labels = { plan: 'Planned', written: 'Script written', built: 'Built in docs', documented: 'Documented' };
const colors = ['#267f78', '#6b7e38', '#476da8', '#996075', '#657889', '#956140', '#6e64a2', '#427a95', '#8a693a', '#758143'];
const dayFiles = ['day2/service.md', 'day2/welcome.md', 'day2/visits.md', 'day3/README.md', 'day4/README.md', 'day5/README.md'];
export async function mount(root, { ROOT, here, live, arg = '' }) {
  if (!document.getElementById('story-timeline-css')) {
    const css = document.createElement('link'); css.id = 'story-timeline-css'; css.rel = 'stylesheet'; css.href = new URL('story-timeline.css', here);
    await new Promise((resolve, reject) => { css.onload = resolve; css.onerror = () => reject(new Error('Timeline styles could not load')); document.head.append(css); });
  }
  const base = new URL(ROOT, location.href), failures = [];
  const [mode, who, selected] = arg.split('/');
  const state = { mode: mode === 'days' ? 'days' : 'routes', who: who || 'all', selected: selected ? decodeURIComponent(selected) : '', query: '' };
  const files = { ...live.files };
  const text = async path => { try { const r = await fetch(new URL(path, base), { cache: 'no-cache' }); if (!r.ok) throw new Error(r.status); return files[path] = await r.text(); } catch { failures.push(path); return ''; } };
  const [milestones, bonds] = await Promise.all([
    import(new URL('game3d/story/milestones/index.js', base)).catch(() => { failures.push('Milestone scripts'); return { SCENES: [] }; }),
    import(new URL('game3d/js/bonds/model.js', base)),
    ...dayFiles.map(path => text(`docs/game/stories/${path}`)),
  ]);
  const routes = characterRoutes(files['docs/game/cast.md'] || '', milestones.SCENES);
  if (!routes.length) throw new Error('Character plans could not be read from cast.md');
  if (state.who !== 'all' && !routes.some(r => r.id === state.who)) state.who = 'all';
  const stories = live.stories.filter(s => s.file.startsWith('docs/game/stories/') && !s.file.slice(18).includes('/')).map(s => ({ ...s, day: 1 }));
  for (const path of dayFiles) {
    const file = `docs/game/stories/${path}`, doc = files[file] || '';
    if (!doc) continue;
    stories.push({ id: path.replaceAll('/', '-').replace('.md', ''), day: +path.match(/^day(\d)/)[1], file,
      title: doc.match(/^# (.+)$/m)?.[1] || path, status: 'documented', cast: [...section(doc, 'Cast').matchAll(/`([a-z_]+)`/g)].map(m => m[1]) });
  }
  const calendar = calendarStories(stories, files, routes);
  const persist = () => history.replaceState(null, '', `#story-timeline/${state.mode}/${state.who}${state.selected ? '/' + encodeURIComponent(state.selected) : ''}`);
  const data = () => (state.mode === 'routes' ? routes : calendar).filter(r => (state.who === 'all' || r.id === state.who) && (!state.query || `${r.name} ${r.title} ${r.steps.map(s => s.text).join(' ')}`.toLowerCase().includes(state.query.toLowerCase())));
  const columns = () => state.mode === 'routes' ? bonds.STEPS.map(s => ({ title: `${s.n} · ${s.name}`, sub: s.pts ? `${s.pts} points${s.scene ? ' + scene' : ''}` : s.n ? 'First introduction' : 'Before meeting' })) : Array.from({ length: 5 }, (_, i) => ({ title: `Day ${i + 1}`, sub: ['Thu 1 Oct', 'Fri 2 Oct', 'Sat 3 Oct', 'Sun 4 Oct', 'Mon 5 Oct'][i] }));
  function detail() {
    const route = data().find(r => r.steps.some(s => s.key === state.selected));
    const item = route?.steps.find(s => s.key === state.selected);
    if (!item) return '<div class="tl-empty"><h2>Follow a character</h2><p>Select a story beat to see its choices, meeting conditions and source.</p><p>Relationship stages show progression, not a fixed number of days.</p></div>';
    return `<div class="tl-detail-head"><span>${esc(route.name)}</span><span class="tl-status ${item.status}">${labels[item.status]}</span></div>
      <h2>${esc(state.mode === 'routes' ? bonds.STEPS[item.column].name : item.sourceLabel)}</h2>
      <p class="tl-full">${esc(item.text)}</p>
      ${state.mode === 'routes' ? `<h3>Where it continues</h3><p>${esc(route.meeting)}</p><h3>Progression</h3><p>${item.column ? `Follows step ${item.column - 1}. ` : ''}${item.column >= 3 ? `${bonds.STEPS[item.column].pts} points and the character’s completed milestone scene are required. Leaving a planned milestone early keeps it available.` : 'This describes the character plan. Points and introductions use the existing bond rules.'}</p>
      ${item.written.length ? `<h3>Written scene conditions</h3>${item.written.map(s => `<p>From day ${s.from}; ${esc(s.period)} in ${esc(s.place.replaceAll('_', ' '))}${s.weekdays?.length ? ` (${esc(s.weekdays.join(', '))})` : ''}.</p><details><summary>Exact condition</summary><code>${esc(s.if || 'None')}</code></details>`).join('')}<p class="tl-caution">A script exists. This does not establish that its staging or game entry is connected.</p>` : '<p class="tl-caution">This is a planned milestone, not a claim that the scene is playable.</p>'}` : `<h3>Story beats</h3><p class="tl-story-text">${esc(item.detail || 'Read the linked story document for the scene sequence.')}</p><p class="tl-caution">Day placement comes from the story index. Optional stories in the same day are not prerequisites for one another.</p>`}
      <a class="tl-source" href="#doc/${esc(item.source)}">Read ${esc(item.sourceLabel)} ↗</a>`;
  }
  function revealSelected() {
    const selected = root.querySelector(`[data-beat="${CSS.escape(state.selected)}"]`);
    if (!selected) return;
    const frame = root.querySelector('.tl-chart'), edge = frame.getBoundingClientRect(), rect = selected.getBoundingClientRect();
    const inset = root.querySelector('.tl-character').getBoundingClientRect().width + 10;
    const top = root.querySelector('.tl-column').getBoundingClientRect().height + 10;
    if (rect.left < edge.left + inset) frame.scrollLeft -= edge.left + inset - rect.left;
    else if (rect.right > edge.right) frame.scrollLeft += rect.right - edge.right + 10;
    if (rect.top < edge.top + top) frame.scrollTop -= edge.top + top - rect.top;
    else if (rect.bottom > edge.bottom) frame.scrollTop += rect.bottom - edge.bottom + 10;
  }
  function chart() {
    const cols = columns(), rows = data();
    root.querySelector('.tl-count').textContent = `${rows.length} characters · ${state.mode === 'routes' ? '6 relationship stages' : '5 opening days'}`;
    root.querySelector('.tl-chart').innerHTML = `<div class="tl-grid" style="--tl-cols:${cols.length}"><div class="tl-corner">Character</div>${cols.map(c => `<div class="tl-column"><b>${esc(c.title)}</b><span>${esc(c.sub)}</span></div>`).join('')}
      ${rows.map(r => `<div class="tl-character" style="--route:${colors[routes.findIndex(x => x.id === r.id) % colors.length]}"><b>${esc(r.name)}</b><span>${esc(r.title)}</span></div>${cols.map((_, i) => `<div class="tl-cell ${state.mode}" style="--route:${colors[routes.findIndex(x => x.id === r.id) % colors.length]}">${r.steps.filter(s => s.column === i).map(s => `<button class="tl-beat ${s.status}${s.key === state.selected ? ' selected' : ''}" data-beat="${esc(s.key)}" aria-pressed="${s.key === state.selected}" aria-label="${esc(`${r.name}, ${cols[i].title}: ${s.text}`)}"><span class="tl-status ${s.status}">${labels[s.status]}</span><span>${esc(excerpt(s.text))}</span></button>`).join('') || '<span class="tl-gap" aria-label="No documented beat">—</span>'}</div>`).join('')}`).join('')}</div>${rows.length ? '' : '<p class="tl-no-results">No matching characters. Clear the search or choose another character.</p>'}`;
    root.querySelector('.tl-detail').innerHTML = detail();
    root.querySelector('.tl-legend').textContent = state.mode === 'routes' ? 'Solid: script written · Dashed: planned' : 'Solid: built in docs · Dashed: documented story';
    revealSelected();
  }
  root.innerHTML = `<header class="tl-header"><div><p class="tl-crumb"><a href="#story">Stories</a> / Character progression</p><h1>Story timelines</h1><p class="lede">Follow each character from an introduction to later choices. The route plans and written scenes stay distinct from the opening days.</p></div></header>
    ${failures.length ? `<p class="tl-caution" role="status">Some sources could not load: ${failures.map(esc).join(', ')}. Their entries are omitted.</p>` : ''}
    <div class="tl-toolbar"><div class="tl-tabs" role="group" aria-label="Timeline scale"><button data-mode="routes" aria-pressed="${state.mode === 'routes'}">Relationship stages</button><button data-mode="days" aria-pressed="${state.mode === 'days'}">Opening days</button></div><label>Character <select data-character><option value="all">Everyone</option>${routes.map(r => `<option value="${r.id}"${state.who === r.id ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}</select></label><label class="tl-search">Find <input type="search" placeholder="Character or story beat" value="" data-search></label></div>
    <div class="tl-key"><span class="tl-count"></span><span class="tl-legend"></span><span class="tl-scroll-hint">Scroll across to follow the route →</span></div>
    <div class="tl-layout"><div class="tl-chart" tabindex="0" role="region" aria-label="Character storyline timeline"></div><aside class="tl-detail" aria-label="Selected story beat" aria-live="polite"></aside></div>
    <p class="tl-foot">Read live from <a href="#doc/docs/game/cast.md">character plans</a>, <a href="#doc/docs/game/README.md">story documents</a> and <a href="#src/game3d/story/milestones/index.js">written milestone scenes</a>. Optional friendships and dates follow the choices in their source; the diagram does not select an ending.</p>`;
  root.onclick = e => {
    const beat = e.target.closest('[data-beat]'), mode = e.target.closest('[data-mode]');
    if (beat) { state.selected = beat.dataset.beat; persist(); chart();
      const selected = root.querySelector(`[data-beat="${CSS.escape(state.selected)}"]`);
      selected?.focus({ preventScroll: true });
 }
    if (mode) { state.mode = mode.dataset.mode; state.selected = ''; root.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === state.mode)); persist(); chart(); root.querySelector('.tl-chart').scrollTo(0, 0); }
  };
  root.querySelector('[data-character]').onchange = e => { state.who = e.target.value; state.selected = ''; persist(); chart(); };
  root.querySelector('[data-search]').oninput = e => { state.query = e.target.value; chart(); };
  chart();
}
