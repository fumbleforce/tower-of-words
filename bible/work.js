// The bible's Work section: the work tracker's GitHub issues (tools/work.py), grouped by state, stuck ones on top in
// red. Nothing is copied here: the list and the stale reasons come live from tools/review_server.py (GET /api/work,
// which asks tools/work.py), and every item links to its issue, where Jørgen comments.

const REPO = 'https://github.com/fumbleforce/tower-of-words';
const ALL = `${REPO}/issues?q=label%3Awork`;
const ORDER = [
  ['running', 'Running'], ['blocked', 'Blocked'], ['waiting-jorgen', 'Waiting for you'], ['todo', 'To do'],
  ['parked', 'Parked'], ['done', 'Done'], ['dropped', 'Dropped'],
];
const KIND = { 'decision-followup': 'decision follow-up', request: 'request', task: 'task', parked: 'parked', 'check-for-jorgen': 'check for you' };

export const issueUrl = (n) => `${REPO}/issues/${n}`;

// review:<id>, showcase:<id>, commit:<sha>, msg:<id>, file:<path>[:line], request:L<n>, todo:<file> -> link or text
function refLink(ref, esc) {
  const [kind, ...rest] = String(ref).split(':');
  const v = rest.join(':');
  const a = (href, text) => `<a href="${esc(href)}">${esc(text)}</a>`;
  if (kind === 'review') return a(`#review/${v}`, `Review ${v}`);
  if (kind === 'showcase') return a(`#showcase/${v}`, `Showcase ${v}`);
  if (kind === 'commit') return a(`${REPO}/commit/${v}`, `commit ${v.slice(0, 7)}`);
  if (kind === 'msg') return `<span class="mono">${esc(v)}</span>`;
  if (kind === 'file') return a(`#src/${v}`, v);
  if (kind === 'request') return a(`${REPO}/blob/9391af4/notes/production-requests.md#L${v.replace(/^L/, '')}`, `old request list, line ${v.replace(/^L/, '')}`);
  if (kind === 'todo') return a(`${REPO}/blob/9391af4/TODO.md`, 'the old TODO.md');
  if (/^[0-9a-f]{7,40}$/.test(ref)) return a(`${REPO}/commit/${ref}`, `commit ${ref.slice(0, 7)}`);
  return esc(ref);
}

function card(i, stuck, { esc, inline }) {
  const refs = [].concat(i.source || []).map((s) => refLink(s, esc));
  return `<article class="witem${stuck ? ' stale' : ''}">
    <div class="whead"><a class="wtitle" href="${esc(i.url)}">${esc(i.title)} <span class="muted">#${esc(i.id)}</span></a>
      <span class="wmeta">${stuck ? stuck.reasons.map((r) => `<span class="st stale">${esc(r)}</span>`).join('') : ''}<span class="st ${esc(i.state)}">${esc(i.state.replace('-', ' '))}</span><span class="pill">${esc(KIND[i.kind] || i.kind)}</span><span class="pill">${esc(i.owner)}</span></span></div>
    ${i.next && i.open ? `<p class="wnext"><span class="muted">Next:</span> ${inline(i.next)}</p>` : ''}
    <p class="small muted wrefs">${refs.length ? `From ${refs.join(' · ')} · ` : ''}${i.done_ref ? `Done in ${refLink(i.done_ref, esc)} · ` : ''}updated ${esc(String(i.updated || '').replace('T', ' ').slice(0, 16))}</p>
  </article>`;
}

export function pageWork(L, h) {
  const { esc } = h;
  const head = `<div class="page work"><h1>Work</h1>
    <p class="lede">What is being worked on, what waits, and what is stuck, with who has it and the next step. Each item is a GitHub issue; open it to comment. The agents keep them up to date with tools/work.py.</p>`;
  const foot = `<p class="muted small" style="margin-top:22px"><a href="${ALL}">All work issues on GitHub</a> · how agents keep them: <a href="#src/tools/work.py">tools/work.py</a>.</p></div>`;
  if (!L.work && L.remote) {
    return `${head}<p>On the public site this list is GitHub's own: <a href="${ALL}">open the work issues on GitHub</a>. The local bible (./start) shows them grouped, with the stuck ones on top.</p></div>`;
  }
  if (!L.work) {
    return `${head}<p>The list comes from GitHub through the local server (./start), and it didn't answer${L.workError ? `: ${esc(L.workError)}` : ''}. <a href="${ALL}">Open the issues on GitHub</a>.</p>${foot}`;
  }
  const stale = L.workStale || [];
  const byId = new Map(L.work.map((i) => [i.id, i]));
  const stuckOf = new Map(stale.filter((s) => byId.has(s.id)).map((s) => [s.id, s]));
  const stuckCards = stale.map((s) => byId.has(s.id) ? card(byId.get(s.id), s, h)
    : `<article class="witem stale"><div class="whead"><a class="wtitle" href="#review/${esc(s.id.replace(/^review:/, ''))}">${esc(s.title)}</a><span class="wmeta">${s.reasons.map((r) => `<span class="st stale">${esc(r)}</span>`).join('')}</span></div></article>`).join('');
  const sections = ORDER.map(([state, label]) => {
    const list = L.work.filter((i) => i.state === state && !stuckOf.has(i.id)).sort((a, b) => Number(b.id) - Number(a.id));
    if (!list.length) return '';
    const body = `<div class="wlist">${list.map((i) => card(i, null, h)).join('')}</div>`;
    return state === 'done' || state === 'dropped'
      ? `<details class="legacy wclosed"><summary>${esc(label)} <span class="muted">(${list.length})</span></summary><div class="inner">${body}</div></details>`
      : `<h2>${esc(label)} <span class="muted">(${list.length})</span></h2>${body}`;
  }).join('');
  return `${head}${stale.length ? `<h2 class="wstale">Stuck <span class="muted">(${stale.length})</span></h2><div class="wlist">${stuckCards}</div>` : '<p class="ok">Nothing is stuck.</p>'}
    ${sections}${foot}`;
}

