// Play the scene in the editor, laid out like the game's dialogue (game3d/css/style.css, #talk): the picture or
// the place behind, the speaker's portrait, the name in their colour, Japanese words in peach with reading and
// meaning. It plays the reading path the timeline shows (paths.js): a choice offers its options with the picked one
// marked, and picking another switches the path in the timeline too. A jump to another part loads it. Nothing
// touches a save.
const { document } = globalThis;
import { esc, api } from './common.js';
import { S, select, setPick, docFor } from './store.js';
import { kindOf, speakerOf, textsOf, describe } from './model.js';
import { personName, personColor, portrait, nodeTitle } from './names.js';
import { conditionSentence } from './conditions.js';
import { pictureFor } from './pictures.js';
import { flatten } from './paths.js';
import { currentPath } from './timeline.js';

const dlg = () => document.getElementById('previewDialog');
let scene = null, items = [], at = 0;

const pathItems = () => flatten(currentPath());
const docOf = item => (scene === S.scene ? docFor(item.path) : scene);

// Another part read on its own (a jump): every beat in order, branches asked as they come.
function expand(steps, base) {
  const out = [];
  (steps || []).forEach((step, i) => {
    const path = [...base, i];
    if (kindOf(step) === 'group') out.push(...expand(step.sequence, [...path, 'sequence']));
    else out.push({ step, path });
  });
  return out;
}

// The game's word markup: {ohayo} shows as おはよう (ohayo, good morning).
export function words(text) {
  return esc(text).replace(/\{([\w-]+)\}/g, (m, id) => {
    const w = S.authoring.words?.find(x => x.id === id);
    return w ? `<span class="jp">${esc(w.ja)}</span> <span class="gl">(${esc(w.reading)}, ${esc(w.en)})</span>` : `<span class="jp">${esc(id)}</span>`;
  });
}

export function openPreview(fromPath) {
  scene = S.scene;
  items = pathItems();
  const start = fromPath ? items.findIndex(x => x.path.join('.') === fromPath.join('.')) : 0;
  at = Math.max(0, start);
  dlg().showModal();
  paint();
}

function backdrop() {
  for (let i = at; i >= 0; i--) {
    const s = items[i].step;
    if (s?.action === 'hide') return '';
    if (kindOf(s) === 'picture') return pictureFor(s, docOf(items[i])).url;
  }
  const file = (scene.where || '').split('/').at(-1)?.replace(/\.js$/, '');
  return S.authoring.places.find(p => p.id === file)?.image || '';
}

function paint() {
  const item = items[at];
  const d = dlg();
  const focused = document.activeElement;
  const focusControl = ['back', 'next', 'edit', 'close'].find(key => focused?.hasAttribute('data-' + key));
  if (!item) {
    d.innerHTML = `<div class="pv-stage"><div class="pv-end"><p>End of “${esc(nodeTitle(scene.node))}”.</p><button data-close class="primary">Back to editing</button></div></div>`;
    d.querySelector('[data-close]').onclick = () => d.close();
    d.querySelector('[data-close]').focus({ preventScroll: true });
    return;
  }
  const { step } = item, kind = kindOf(step);
  const bg = backdrop();
  const who = speakerOf(step);
  const texts = textsOf(step, scene.recipe);
  // The stage directions just before this beat, as small notes at the top.
  const notes = [];
  for (let i = at - 1; i >= 0 && ['direction', 'flag', 'word'].includes(kindOf(items[i].step)); i--) notes.unshift(describe(items[i].step, personName, nodeTitle));
  let box = '';
  if (kind === 'line') {
    const main = texts.recipe ? (texts.second || texts.main) : texts.main;
    const sub = texts.recipe ? (texts.second ? texts.main : '') : texts.second;
    box = `<div class="pv-talk">${portrait(who) ? `<img class="pv-por" src="${esc(portrait(who))}" alt="">` : ''}<div class="pv-who" style="--c:${esc(personColor(who))}">${esc(personName(who))}</div><div class="pv-line">${words(main)}</div>${sub ? `<div class="pv-sub">${words(sub)}</div>` : ''}</div>`;
  } else if (kind === 'narration' || (kind === 'picture' && texts.main)) {
    box = `<div class="pv-talk narr"><div class="pv-line">${words(texts.main)}</div></div>`;
  } else if (kind === 'picture') {
    box = bg ? '' : '<div class="pv-end"><p class="dim">No picture yet</p></div>';
  } else if (kind === 'choice') {
    const picked = item.type === 'choice' ? item.pick : -1;
    box = `<div class="pv-talk">${step.prompt ? `<div class="pv-line">${words(step.prompt)}</div>` : ''}<div class="pv-chips">${step.choice.map((c, j) => `<button data-opt="${j}" class="${j === picked ? 'picked' : ''}" title="${j === picked ? 'The path in the timeline' : 'Switches the path in the timeline too'}">${words(c.text || '…')}${c.if ? `<small>only if ${esc(conditionSentence(c.if))}</small>` : ''}</button>`).join('')}</div></div>`;
  } else if (kind === 'branch') {
    box = `<div class="pv-talk narr"><div class="pv-line">Does this hold? ${esc(conditionSentence(step.if))}</div><div class="pv-chips"><button data-arm="then">Yes</button><button data-arm="else">No</button></div></div>`;
  } else if (kind === 'jump') {
    const dest = step.go || step.destination || step.call;
    box = `<div class="pv-talk narr"><div class="pv-line">${esc(describe(step, personName, nodeTitle))}</div><div class="pv-chips"><button data-follow="${esc(dest)}">Continue there</button></div></div>`;
  } else {
    box = `<div class="pv-talk narr"><div class="pv-line dim">${esc(describe(step, personName, nodeTitle))}</div></div>`;
  }
  d.innerHTML = `<div class="pv-stage">${bg ? `<img class="pv-bg" src="${esc(bg)}" alt="">` : ''}<div class="pv-shade"></div>
    ${notes.length ? `<div class="pv-notes">${notes.map(n => `<span>${esc(n)}</span>`).join('')}</div>` : ''}
    ${box}</div>
    <div class="pv-bar"><button data-back ${at === 0 ? 'disabled' : ''}>Back</button><span class="pv-counter">Beat ${at + 1} of ${items.length}</span><button data-next ${['choice', 'branch', 'jump'].includes(kind) ? 'disabled' : ''}>Next</button><button data-edit>Edit this beat</button><span class="grow"></span><span class="quiet">${scene === S.scene ? '' : 'Showing “' + esc(nodeTitle(scene.node)) + '”. '}Space or → next, ← back, Esc closes</span><button data-close>Close</button></div>`;
  for (const talk of d.querySelectorAll('.pv-talk')) {
    const copy = document.createElement('div');
    copy.className = 'pv-copy';
    copy.tabIndex = 0;
    copy.setAttribute('role', 'region');
    copy.setAttribute('aria-label', 'Scene text');
    for (const child of [...talk.childNodes]) if (!child.classList?.contains('pv-por')) copy.append(child);
    talk.append(copy);
  }
  d.querySelector('.pv-stage').onclick = e => {
    if (e.target.closest('button')) return;
    const copy = e.target.closest('.pv-copy');
    if (!copy || copy.scrollHeight <= copy.clientHeight + 1) next();
  };
  d.querySelector('[data-next]').onclick = next;
  d.querySelector('[data-back]').onclick = () => { at = Math.max(0, at - 1); paint(); };
  d.querySelector('[data-close]').onclick = () => d.close();
  d.querySelector('[data-edit]').onclick = () => {
    d.close();
    if (scene === S.scene) select(item.path);
  };
  d.querySelectorAll('[data-opt]').forEach(b => { b.onclick = () => choose(item, +b.dataset.opt); });
  d.querySelectorAll('[data-arm]').forEach(b => { b.onclick = () => {
    // Replace the previously explored arm, including any nested branches it opened.
    let end = at + 1;
    while (end < items.length && item.path.every((part, i) => items[end].path[i] === part) && ['then', 'else'].includes(items[end].path[item.path.length])) end++;
    items.splice(at + 1, end - at - 1, ...expand(step[b.dataset.arm], [...item.path, b.dataset.arm]));
    at++;
    paint();
  }; });
  d.querySelector('[data-follow]')?.addEventListener('click', e => follow(e.currentTarget.dataset.follow));
  // Repainting replaces the focused control; keep native keyboard input inside the modal.
  const restore = focusControl && d.querySelector(`[data-${focusControl}]:enabled`);
  (restore || d.querySelector('.pv-copy') || d.querySelector('[data-next]:enabled') || d.querySelector('[data-close]')).focus({ preventScroll: true });
}

function next() {
  const kind = kindOf(items[at]?.step);
  if (['choice', 'branch', 'jump'].includes(kind)) return; // waits for a pick
  at = Math.min(items.length, at + 1);
  while (at < items.length && ['direction', 'flag', 'word'].includes(kindOf(items[at].step))) at++;
  paint();
}

function choose(item, j) {
  const option = item.step.choice[j];
  const target = option.go || option.call;
  if (scene === S.scene && item.type === 'choice') {
    if (j !== item.pick) {
      setPick(item.key, j);
      items = pathItems();
      at = items.findIndex(x => x.path.join('.') === item.path.join('.'));
    }
    if (!target || S.linked[target]) { at++; paint(); return; }
  }
  if (target) return follow(target);
  at++;
  paint();
}

async function follow(node) {
  const id = scene.id.startsWith('public:') ? scene.id.split('#')[0] + '#' + node : scene.id.slice(0, scene.id.lastIndexOf(':') + 1) + node;
  if (!S.catalog.some(r => r.id === id)) { at = items.length; paint(); return; }
  scene = id === S.scene.id ? S.scene : await api('read?id=' + encodeURIComponent(id));
  items = expand(scene.steps, []);
  at = 0;
  paint();
}

export function installPreview() {
  dlg().addEventListener('keydown', e => {
    const copy = e.target.closest?.('.pv-copy');
    if (copy && copy.scrollHeight > copy.clientHeight + 1 && [' ', 'PageDown', 'PageUp', 'Home', 'End', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    if (e.key === ' ' || e.key === 'Enter') { if (!e.target.closest?.('button')) { e.preventDefault(); next(); } }
    if (e.key === 'ArrowLeft') { e.preventDefault(); at = Math.max(0, at - 1); paint(); }
  });
}
