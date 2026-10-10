// Add or edit a block (an image gen preset) without leaving the composer (Jørgen, 2026-10-11: "should make it easy to
// add new entries to these options as well, like I want outside sento, not bathhouse for example, or if I want to make
// a new pose"). A new block starts from a similar one, saves as a real preset through the image gen dashboard's own
// store (versions, Note to Claude, retire), and is in every scene's pickers at once. Fields come from blocks.js, the
// one definition the dashboard uses too.
const {document} = globalThis;
import {FIELDS, kindLabel, mainField, fieldsHtml, setp, getp, blank, wordDiff, esc} from '../../imagegen/web/blocks.js';
import {api} from './common.js';

const clone = o => JSON.parse(JSON.stringify(o ?? {}));
const imageApi = (path, body) => api('image/api/' + path, body);

function dialog() {
  let d = document.getElementById('blockDialog');
  if (!d) {
    d = document.createElement('dialog');
    d.id = 'blockDialog';
    d.className = 'block-dialog';
    d.setAttribute('aria-label', 'Block');
    (document.getElementById('composeDialog') || document.body).append(d);
  }
  return d;
}

// opts: {kind, id (edit) | null (new), from (id to start from), prefill {field: value}, presets, privateMode, files,
//        portraitUrl(path), onDone(id)}
export async function openBlockEditor(opts) {
  const {kind, presets, privateMode} = opts;
  const list = (presets[kind] || []);
  const live = k => (presets[k] || []).filter(p => !p.archived);
  const d = dialog();
  const state = {id: opts.id || null, from: opts.from ?? (opts.id ? '' : list.find(p => !p.archived)?.id || ''), rec: null, draft: null, note: '', isPrivate: false, diff: null};
  const portrait = (key, v, label) => `<label>${label}<span class="block-portrait">${v && opts.portraitUrl?.(v) ? `<img src="${esc(opts.portraitUrl(v))}" alt="">` : ''}<input type="text" class="mono" data-f="${key}" value="${esc(v ?? '')}"></span></label>`;
  const ctx = {live, files: opts.files || [], portrait};

  function startFrom(id) {
    const p = list.find(x => x.id === id);
    const name = state.draft?.name || '';
    state.draft = p ? clone(p.data) : blank(kind, opts.files);
    state.draft.name = name;
    state.isPrivate = !!p?.private;
    for (const [k, v] of Object.entries(opts.prefill || {})) if (v) setp(state.draft, k, v);
  }
  async function load(id) {
    state.id = id; state.diff = null;
    state.rec = await imageApi(`preset/${kind}/${id}`);
    if (!state.rec?.versions) throw Error('That block is not available here.');
    state.draft = clone(state.rec.versions.at(-1).data);
    state.note = state.rec.claude_note || '';
    state.isPrivate = !!state.rec.private;
  }
  if (state.id) await load(state.id); else startFrom(state.from);

  function render() {
    const editing = !!state.rec;
    const cur = state.rec?.versions.at(-1);
    const main = mainField(kind);
    const head = editing
      ? `<label>${esc(kindLabel(kind, true))}<select data-switch>${list.map(p => `<option value="${esc(p.id)}" ${p.id === state.id ? 'selected' : ''}>${esc(p.data.name || p.id)}${p.archived ? ' (retired)' : ''}</option>`).join('')}</select></label>
         <p class="hint">v${cur.v}, saved ${esc(cur.at.replace('T', ' ').slice(0, 16))}. Saving makes v${cur.v + 1}; old versions stay.</p>`
      : `<label>Start from<select data-from><option value="">Blank</option>${list.filter(p => !p.archived).map(p => `<option value="${esc(p.id)}" ${p.id === state.from ? 'selected' : ''}>${esc(p.data.name || p.id)}</option>`).join('')}</select></label>
         <p class="hint">The words of the block you start from are filled in below. Give it a name and change what differs.</p>`;
    const fields = fieldsHtml(kind, state.draft, ctx).replace(`data-f="name"`, `data-f="name" placeholder="${esc(editing ? '' : 'e.g. ' + exampleName(kind))}"`);
    const versions = editing ? `<details class="block-versions"><summary>Versions (${state.rec.versions.length})</summary>${state.rec.versions.slice().reverse().map(v => `<div class="block-version"><span>v${v.v}</span><span>${esc(v.at.slice(5, 16).replace('T', ' '))} ${esc(v.message || '')}</span>${v.v === cur.v ? '<span class="hint">current</span>' : `<span><button type="button" class="small" data-diff="${v.v}">Diff</button><button type="button" class="small" data-restore="${v.v}">Restore</button></span>`}</div>`).join('')}${state.diff ? diffHtml(state.rec, state.diff) : ''}</details>` : '';
    d.innerHTML = `<form method="dialog" class="block-form">
      <div class="block-head"><h3>${editing ? 'Edit' : 'New'} ${esc(kindLabel(kind, true).toLowerCase())}</h3><button type="button" class="ghost" data-close aria-label="Close">Close</button></div>
      ${head}
      <div class="block-fields" data-main="${esc(main)}">${fields}</div>
      ${editing ? `<label>Note to Claude<textarea rows="2" data-note placeholder="What's wrong with it, or what to try next">${esc(state.note)}</textarea></label>` : ''}
      ${privateMode ? `<label class="image-check"><input type="checkbox" data-private ${state.isPrivate ? 'checked' : ''}>Only in private mode</label>` : ''}
      ${versions}
      <p class="block-error" role="alert" hidden></p>
      <div class="block-actions">${editing ? `<button type="button" class="ghost danger" data-retire>${state.rec.archived ? 'Bring back' : 'Retire'}</button>` : ''}<span></span>
        <button type="button" data-cancel>Cancel</button><button type="submit" class="primary" data-save>${editing ? 'Save as v' + (cur.v + 1) : 'Add ' + esc(kindLabel(kind, true).toLowerCase())}</button></div>
    </form>`;
    bind();
  }
  function error(text) { const e = d.querySelector('.block-error'); e.textContent = text; e.hidden = !text; }
  const done = id => { d.close(); opts.onDone?.(id); };
  function bind() {
    const form = d.querySelector('form');
    form.addEventListener('input', e => {
      const t = e.target;
      if (t.dataset.note !== undefined) { state.note = t.value; return; }
      if (t.dataset.private !== undefined) { state.isPrivate = t.checked; return; }
      const f = t.dataset.f; if (!f) return;
      let v = t.type === 'checkbox' ? t.checked : t.value;
      if (t.dataset.num) v = v === '' ? '' : +v;
      setp(state.draft, f, v);
    });
    form.addEventListener('change', async e => {
      const t = e.target;
      if (t.dataset.from !== undefined) { state.from = t.value; startFrom(t.value); render(); }
      if (t.dataset.switch !== undefined) { await load(t.value); render(); }
    });
    form.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      try {
        if (b.dataset.close !== undefined || b.dataset.cancel !== undefined) { d.close(); return; }
        if (b.dataset.negf) {
          const cur = getp(state.draft, 'defaults.negatives') || [];
          setp(state.draft, 'defaults.negatives', cur.includes(b.dataset.negf) ? cur.filter(x => x !== b.dataset.negf) : cur.concat(b.dataset.negf));
          render(); return;
        }
        if (b.dataset.diff) { state.diff = +b.dataset.diff; render(); d.querySelector('.block-versions').open = true; return; }
        if (b.dataset.restore) { state.rec = await imageApi(`preset/${kind}/${state.id}/restore`, {v: +b.dataset.restore}); done(state.id); return; }
        if (b.dataset.retire !== undefined) { await imageApi(`preset/${kind}/${state.id}/archive`, {archived: !state.rec.archived}); done(state.id); return; }
      } catch (err) { error(err.message); }
    });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      try {
        if (!String(state.draft.name || '').trim()) throw Error('Give it a name.');
        const main = mainField(kind);
        if (FIELDS[kind]?.some(f => f[0] === main) && kind !== 'model' && !String(getp(state.draft, main) || '').trim()) throw Error('Add the words that go into the prompt.');
        if (state.rec) {
          const cur = state.rec.versions.at(-1).data;
          if (JSON.stringify(cur) !== JSON.stringify(state.draft)) await imageApi(`preset/${kind}/${state.id}`, {data: state.draft, message: 'edited in the scene editor'});
          if ((state.rec.claude_note || '') !== state.note) await imageApi(`preset/${kind}/${state.id}/note`, {text: state.note});
          if (privateMode && !!state.rec.private !== state.isPrivate) await imageApi(`preset/${kind}/${state.id}/private`, {private: state.isPrivate});
          done(state.id);
        } else {
          const from = list.find(p => p.id === state.from);
          const rec = await imageApi(`preset/${kind}/${state.from || 'new'}/create`, {name: state.draft.name, data: state.draft, private: privateMode && state.isPrivate,
            message: from ? `made in the scene editor from ${from.data.name || from.id} v${from.v}` : 'made in the scene editor'});
          done(rec.id);
        }
      } catch (err) { error(err.message); }
    });
  }
  render();
  if (!d.open) d.showModal();
  d.querySelector('[data-f="name"]')?.focus();
}

function diffHtml(rec, v) {
  const old = rec.versions.find(x => x.v === v)?.data || {}, cur = rec.versions.at(-1).data;
  const keys = [...new Set([...Object.keys(old), ...Object.keys(cur)])].filter(k => JSON.stringify(old[k]) !== JSON.stringify(cur[k]));
  const text = x => typeof x === 'string' ? x : JSON.stringify(x ?? '');
  return `<div class="block-diff"><p class="hint">v${v} to the current version</p>${keys.map(k => `<div><strong>${esc(k)}</strong><p class="prompt-box">${wordDiff(text(old[k]), text(cur[k]))}</p></div>`).join('') || '<p class="hint">No differences.</p>'}</div>`;
}

const EXAMPLES = {location: 'Outside the sento', pose: 'Sitting on the edge of the bath', light: 'Lantern light', camera: 'From the doorway',
  outfit: 'Summer yukata', negative: 'No umbrellas', scene: 'Waiting at the bus stop', character: 'New person', framing: 'Tall', style: 'Watercolour', model: 'New model'};
const exampleName = kind => EXAMPLES[kind] || 'A name';
