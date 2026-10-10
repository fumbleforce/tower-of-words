// Scene editor: the scene list, opening and saving, the top bar and the keyboard. The panels live in
// timeline.js (beats), inspector.js (details, placement, revisions), pictures.js and preview.js.
const { document, window, location, history, confirm } = globalThis;
import { esc, api } from './common.js';
import { S, load, markSaved, isDirty, undo, redo, select, on, scheduleDraft, cancelDraft, edit } from './store.js';
import { renderTimeline, markSelection, installDrag, nudge, insert, remove } from './timeline.js';
import { renderBeatTab, renderSceneTab } from './inspector.js';
import { renderPictureTab } from './pictures.js';
import { openPreview, installPreview } from './preview.js';
import { areaOf, titleOf, playUrl } from './names.js';
import { setConditionLabels } from './conditions.js';
import { installImages } from './images.js';
import { kindOf } from './model.js';

const $ = id => document.getElementById(id);
let filter = 'all', tab = 'beat', saving = false, openAreas = new Set();

function status(text, kind = '') {
  $('status').textContent = text;
  $('status').dataset.kind = kind;
}

// ---------- scene list ----------
function paintList() {
  const q = $('search').value.trim().toLowerCase();
  const rows = S.catalog.filter(r => (filter === 'all' || r.audience === filter)
    && (!q || `${titleOf(r)} ${areaOf(r)} ${r.node} ${r.where}`.toLowerCase().includes(q)));
  const groups = new Map();
  for (const r of rows) {
    const a = (r.audience === 'private' ? 'P|' : 'G|') + areaOf(r);
    if (!groups.has(a)) groups.set(a, []);
    groups.get(a).push(r);
  }
  const current = S.scene?.id;
  const html = [...groups].map(([area, list]) => {
    const priv = area.startsWith('P|'), name = area.slice(2);
    const open = q || openAreas.has(area) || list.some(r => r.id === current);
    return `<section class="area${open ? ' open' : ''}" data-area="${esc(area)}"><button class="area-head"><span class="chev">›</span><span class="area-name">${esc(name)}</span>${priv ? '<span class="tag private mini">Private</span>' : ''}<span class="count">${list.length}</span></button>
      ${open ? `<div class="area-items">${list.map(r => `<button class="scene-row${r.id === current ? ' current' : ''}" data-id="${esc(r.id)}"><span class="t">${esc(titleOf(r))}</span><span class="n">${r.count ?? ''}</span></button>`).join('')}</div>` : ''}</section>`;
  }).join('');
  $('sceneList').innerHTML = html || '<p class="quiet pad">No scene matches.</p>';
  for (const b of $('sceneList').querySelectorAll('.area-head')) b.onclick = () => {
    const a = b.parentElement.dataset.area;
    if (openAreas.has(a)) openAreas.delete(a); else openAreas.add(a);
    paintList();
  };
  for (const b of $('sceneList').querySelectorAll('.scene-row')) b.onclick = () => open(b.dataset.id);
  $('sceneList').querySelector('.scene-row.current')?.scrollIntoView({ block: 'nearest' });
}

// ---------- open, save, drafts ----------
async function open(id, { skipCheck = false } = {}) {
  if (!skipCheck && isDirty() && !confirm('This scene has changes that aren’t saved. Leave it anyway? A draft is kept.')) return;
  cancelDraft();
  status('Opening…');
  try {
    const scene = await api('read?id=' + encodeURIComponent(id));
    load(scene);
    history.replaceState(null, '', '#' + encodeURIComponent(id));
    status('Saved', 'ok');
    if (scene.draft?.steps) offerDraft(scene.draft);
    else hideBanner();
  } catch (e) {
    status(e.message, 'error');
  }
}

function offerDraft(draft) {
  const b = $('banner');
  const when = draft.at ? new Date(draft.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'an earlier session';
  b.innerHTML = `<span>There are unsaved edits to this scene from ${esc(when)}.</span><button data-use class="primary">Bring them back</button><button data-drop>Throw them away</button>`;
  b.hidden = false;
  b.querySelector('[data-use]').onclick = () => {
    edit(s => Object.assign(s, { steps: draft.steps, entries: draft.entries || s.entries, placement: draft.placement ?? s.placement, metadata: draft.metadata || s.metadata }));
    hideBanner();
  };
  b.querySelector('[data-drop]').onclick = async () => {
    hideBanner();
    await api('draft', { id: S.scene.id, discard: true }).catch(() => {});
  };
}
const hideBanner = () => { $('banner').hidden = true; };

function payload() {
  const s = S.scene;
  return { id: s.id, revision: s.revision, steps: s.steps, raw: s.raw, entries: s.entries, placement: s.placement, metadata: s.metadata, restoreVersion: s.restoreVersion };
}

async function saveDraft() {
  if (!isDirty() || saving) return;
  try { await api('draft', { ...payload(), at: Date.now() }); } catch { /* the next edit tries again */ }
}

async function save() {
  if (!S.scene || saving || !isDirty()) return;
  saving = true;
  cancelDraft();
  status(S.scene.audience === 'private' ? 'Saving, rebuilding and checking…' : 'Saving…', 'busy');
  paintBar();
  try {
    const saved = await api('save', payload());
    markSaved(saved);
    status('Saved' + (saved.warnings?.length ? '. ' + saved.warnings.join(' ') : ''), 'ok');
  } catch (e) {
    status(e.message.startsWith('CONFLICT') ? 'Someone changed this scene outside the editor. Reload it to see their version (your edits stay as a draft).' : 'Not saved: ' + e.message, 'error');
    saveDraft();
  } finally {
    saving = false;
    paintBar();
  }
}

// ---------- top bar ----------
function paintBar() {
  const s = S.scene;
  $('doc').hidden = !s;
  if (s) {
    const row = S.catalog.find(r => r.id === s.id) || { ...s, audience: s.audience };
    $('docArea').textContent = areaOf(row);
    $('docTitle').textContent = titleOf(row);
    $('docAudience').textContent = s.audience === 'private' ? 'Private · Adult' : 'Public game';
    $('docAudience').className = 'tag ' + s.audience;
    $('docWhere').textContent = s.where || '';
    document.title = `${titleOf(row)} · Scene editor`;
  }
  const dirty = isDirty();
  $('undo').disabled = !S.undo.length || saving;
  $('redo').disabled = !S.redo.length || saving;
  $('save').disabled = !dirty || saving;
  $('save').textContent = saving ? 'Saving…' : 'Save';
  $('preview').disabled = !s || !Array.isArray(s.steps);
  const url = playUrl(s);
  $('play').href = url || '#';
  $('play').setAttribute('aria-disabled', String(!url));
  $('play').title = url ? 'Open the game here, in a new tab' : 'This part has no place to start from';
  if (s && !saving && $('status').dataset.kind !== 'error') status(dirty ? 'Unsaved changes' : 'Saved', dirty ? 'dirty' : 'ok');
}

function setTab(next) {
  tab = next;
  for (const b of document.querySelectorAll('[data-tab]')) b.setAttribute('aria-selected', String(b.dataset.tab === tab));
  $('tabBeat').hidden = tab !== 'beat';
  $('tabPicture').hidden = tab !== 'picture';
  $('tabScene').hidden = tab !== 'scene';
  paintTab();
}
// The composer changes the scene itself; the undo point was taken when it opened (pictures.js).
const composer = () => installImages(() => S.scene, () => { paintBar(); scheduleDraft(saveDraft); });
function paintTab() {
  if (tab === 'beat') renderBeatTab();
  if (tab === 'picture') renderPictureTab(composer);
  if (tab === 'scene') renderSceneTab();
}

on((type, detail) => {
  if (type === 'load' || type === 'saved') { renderTimeline(); paintTab(); paintList(); }
  if (type === 'edit') { renderTimeline(); paintTab(); scheduleDraft(saveDraft); }
  if (type === 'typing') scheduleDraft(saveDraft);
  if (type === 'select') {
    markSelection();
    const step = S.selected ? S.selected.reduce((x, k) => x?.[k], S.scene.steps) : null;
    if (detail.tab) setTab(detail.tab);
    else if (tab === 'picture' && kindOf(step) !== 'picture' && step !== undefined && step !== null) setTab('beat');
    else paintTab();
  }
  paintBar();
});

// ---------- controls ----------
$('undo').onclick = undo;
$('redo').onclick = redo;
$('save').onclick = save;
$('preview').onclick = () => openPreview(S.selected);
$('play').addEventListener('click', e => { if ($('play').getAttribute('aria-disabled') === 'true') e.preventDefault(); });
$('search').oninput = paintList;
for (const b of document.querySelectorAll('[data-filter]')) b.onclick = () => {
  filter = b.dataset.filter;
  for (const x of document.querySelectorAll('[data-filter]')) x.setAttribute('aria-pressed', String(x === b));
  paintList();
};
for (const b of document.querySelectorAll('[data-tab]')) b.onclick = () => setTab(b.dataset.tab);
$('closeCompose').onclick = () => $('composeDialog').close();
$('composeDialog').addEventListener('close', () => { renderTimeline(); paintTab(); paintBar(); });
$('timeline').parentElement.addEventListener('pointerdown', e => { if (!e.target.closest('.beat, .add-row')) select(null); });
window.addEventListener('subplot-image-changed', () => { renderTimeline(); paintTab(); paintBar(); });

document.addEventListener('keydown', e => {
  if ($('previewDialog').open || $('composeDialog').open) return;
  const mod = e.ctrlKey || e.metaKey, typing = e.target.closest?.('input, textarea, select');
  if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); save(); return; }
  if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
  if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); redo(); return; }
  if (!S.scene) return;
  if (mod && e.key === 'Enter' && S.selected) {
    e.preventDefault();
    insert(S.selected.slice(0, -1), S.selected.at(-1) + 1, 'line');
    return;
  }
  if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && S.selected) { e.preventDefault(); nudge(S.selected, e.key === 'ArrowUp' ? -1 : 1); return; }
  if (typing) return;
  if ((e.key === 'Delete' || e.key === 'Backspace') && S.selected) { e.preventDefault(); remove(S.selected); }
  if (e.key === 'p' || e.key === 'P') { e.preventDefault(); openPreview(S.selected); }
});
window.addEventListener('hashchange', () => {
  const id = decodeURIComponent(location.hash.slice(1));
  if (id && id !== S.scene?.id && S.catalog.some(r => r.id === id)) open(id);
});
window.addEventListener('beforeunload', e => { if (isDirty()) { saveDraft(); e.preventDefault(); e.returnValue = ''; } });

// ---------- start ----------
installDrag();
installPreview();
try {
  S.authoring = { ...S.authoring, ...(await api('authoring')) };
} catch {
  status('The bible data could not be read. Names show as ids.', 'error');
}
setConditionLabels(S.authoring.variables);
try {
  const data = await api('catalog?scope=all');
  S.catalog = data.scenes || [];
  if (!data.local) status('Private scenes are not set up on this computer. Public game scenes are all here.', 'dirty');
} catch (e) {
  status(e.message, 'error');
}
paintList();
paintBar();
setTab('beat');
const wanted = decodeURIComponent(location.hash.slice(1));
if (wanted && S.catalog.some(r => r.id === wanted)) open(wanted, { skipCheck: true });
