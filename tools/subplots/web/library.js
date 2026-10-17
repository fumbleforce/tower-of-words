// The composer's picture library actions: star, favourite, reject with a reason, Note to Claude, delete with trash and
// restore, the lightbox ("n of N", arrows and the s, f, x and Delete keys), pins with side-by-side compare and the
// prompt diff, "New seeds, same prompt", and copying a picture's number or seed. The markup, rating rules and keys are
// the image gen dashboard's own (tools/imagegen/web/gallery.js); the writes go to its API through the editor's proxy.
const {document, navigator} = globalThis;
import {esc} from './common.js';
import {rateFields, lightboxKey, lightboxHtml, compareHtml, thumbUrl, fullUrl, isAgent, draftPictureUrl} from '../../imagegen/web/gallery.js';
import {isExternal, externalReplayNotice, providerLabel} from '../../imagegen/web/provenance.js';

const BASE = '/api/subplots/image';

// hooks: {api(action, body), notice(text, error), changed() (repaint the library), use(j), reuse(j) (prompt and settings,
//         never a start picture, #702), startImage(j), generate(body),
//         styleName(id), count() (pictures per run)}
export function createLibrary(hooks) {
  let pins = [], lb = {list: [], i: 0, raw: false}, trash = null;
  const overlay = id => {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id; el.className = 'lib-overlay'; el.hidden = true;
      (document.getElementById('composeDialog') || document.body).append(el);
    }
    return el;
  };
  const write = (path, body = {}) => hooks.api('image/api/' + path, body);

  async function rate(t, fields) {
    Object.assign(t, fields); hooks.rated?.(t, fields);
    try { await write('render/' + encodeURIComponent(t.id), fields); }
    catch (e) { hooks.notice('Could not save: ' + e.message, true); }
    hooks.changed(); if (!overlay('libLightbox').hidden) renderLightbox();
  }
  async function del(t) {
    await write('render/' + encodeURIComponent(t.id) + '/delete');
    t.deleted = true; hooks.rated?.(t, {deleted: true});
    pins = pins.filter(p => p.id !== t.id);
    lb.list = lb.list.filter(x => x.id !== t.id);
    if (!lb.list.length) closeLightbox(); else { lb.i = Math.min(lb.i, lb.list.length - 1); if (!overlay('libLightbox').hidden) renderLightbox(); }
    hooks.changed();
    hooks.notice(`Moved #${t.n || ''} to the trash. Restore it from Trash in the library.`.replace('# ', ''));
  }
  function copy(text, what) { navigator.clipboard?.writeText(text); hooks.notice(what + ' copied.'); }
  function newSeeds(t) {
    if (isExternal(t)) { hooks.notice(externalReplayNotice, true); return Promise.resolve(); }
    const body = {positive: t.positive, negative: t.negative || '', overridden: !!t.overridden, free_text: !!t.free_text, model_file: t.model_file, w: t.w, h: t.h,
      steps: t.steps, cfg: t.cfg, sampler: t.sampler, scheduler: t.scheduler, count: hooks.count(), seed_mode: 'random',
      compose: t.compose || {}, presets: t.presets || {}, characters: t.characters || [], rating: t.rating, scene_text: t.compose?.scene || '',
      ipa: t.ipa || null, repaint: t.repaint ? {ref: t.repaint.ref, denoise: t.repaint.denoise, prompt: t.repaint.prompt} : null,
      start: t.start || null, loras: t.loras || [], control: t.control || null, huefix: t.huefix || [], autostart: true};
    return hooks.generate(body).then(() => hooks.notice(`Queued ${body.count} new seeds with the same prompt.`));
  }
  // one handler for the card buttons and the lightbox buttons
  function act(action, t, btn) {
    if (!t) return;
    if (isExternal(t) && ['sameseed', 'newseeds', 'reuse', 'copyseed'].includes(action)) return hooks.notice(externalReplayNotice, true);
    if (action === 'open') return openLightbox(t.id);
    if (action === 'star' || action === 'fav') return rate(t, rateFields(action, t));
    if (action === 'reject') {
      if (t.reject) return rate(t, rateFields('reject', t));
      const reason = globalThis.prompt?.('Why reject it? (optional)', t.reject_reason || '');
      if (reason === null || reason === undefined) return;
      return rate(t, rateFields('reject', t, reason.trim()));
    }
    if (action === 'note') { const note = globalThis.prompt?.('Note to Claude', t.note || ''); if (note != null) rate(t, {note: note.trim()}); return; }
    if (action === 'pin') { pins = pins.some(p => p.id === t.id) ? pins.filter(p => p.id !== t.id) : pins.concat(t).slice(-6); hooks.changed(); if (!overlay('libLightbox').hidden) renderLightbox(); return; }
    if (action === 'del') return del(t).catch(e => hooks.notice(e.message, true));
    if (action === 'copyn') return copy('#' + t.n, '#' + t.n);
    if (action === 'copyseed') return copy(String(t.seed), 'Seed ' + t.seed);
    if (action === 'sameseed') { closeLightbox(); return hooks.reuse(t); }
    if (action === 'newseeds') { closeLightbox(); return newSeeds(t).catch(e => hooks.notice(e.message, true)); }
    if (action === 'scene' || action === 'character') { closeLightbox(); hooks.select?.(t); return Promise.resolve(hooks.actions?.[action]?.(t)).catch(e => hooks.notice(e.message, true)); }
    if (action === 'use') { if (hooks.select) closeLightbox(); return hooks.use(t); }
    if (action === 'reuse') return hooks.reuse(t);
    if (action === 'startimage') { closeLightbox(); return hooks.startImage?.(t); }
    void btn;
  }

  function createButtons(attrs) {
    return ['scene', 'character'].filter(kind => hooks.actions?.[kind]).map(kind => `<button type="button" ${attrs(kind)}>Create ${kind}</button>`).join('');
  }
  function cardHtml(j, i) {
    const done = j.status === 'done' && (j.thumb || j.file || draftPictureUrl(j.url) || isAgent(j));
    const canUse = !!j.file || !!draftPictureUrl(j.url) || !!hooks.actions && isAgent(j);
    const marks = `${j.fav ? '♥' : j.star ? '★' : ''}${j.reject ? ' ✕' : ''}`;
    const tools = done ? `<div class="lib-tools">
        <button type="button" data-lib="star" data-i="${i}" aria-pressed="${!!j.star}" title="Star (s)">★</button>
        <button type="button" data-lib="fav" data-i="${i}" aria-pressed="${!!j.fav}" title="Favourite (f)">♥</button>
        <button type="button" data-lib="reject" data-i="${i}" aria-pressed="${!!j.reject}" title="Reject with a reason (x)">✕</button>
        <button type="button" data-lib="note" data-i="${i}" aria-pressed="${!!j.note}" title="Note to Claude">Note</button>
        <button type="button" data-lib="pin" data-i="${i}" aria-pressed="${pins.some(p => p.id === j.id)}" title="Pin to compare side by side">Pin</button>
        <button type="button" data-lib="del" data-i="${i}" title="Delete (moves it to the trash)">Del</button></div>` : '';
    const meta = [j.n ? `<button type="button" class="link" data-lib="copyn" data-i="${i}" title="Copy the picture number">#${j.n}</button>` : '',
      j.seed != null ? `<button type="button" class="link" data-lib="copyseed" data-i="${i}" title="Copy the seed">s${j.seed}</button>` : '',
      esc(j.status === 'done' ? isExternal(j) ? 'Imported ' + (j.imported_at?.slice(0, 10) || '(time not recorded)') : j.at?.slice(0, 10) || 'Ready' : j.status + (j.status === 'running' ? ` · ${Math.round((j.progress || 0) * 100)}%` : '')),
      isExternal(j) ? `<span title="${esc(j.provenance.engine)}">${esc(providerLabel(j))}</span>` : isAgent(j) ? `<span title="${esc(j.owner || '')}">agent</span>` : '', marks ? `<span class="lib-marks">${marks}</span>` : ''].filter(Boolean).join(' · ');
    return `<article class="render-card${hooks.selected?.() === j.id ? ' selected' : ''}${j.reject ? ' rejected' : ''}">${done ? `<button type="button" class="lib-shot" data-lib="open" data-i="${i}" title="Open (arrows, s, f, x, Delete)"><img loading="lazy" src="${esc(thumbUrl(j, BASE) || fullUrl(j, BASE))}" alt="Picture ${j.n ? '#' + j.n : i + 1}"></button>` : ''}
      <small>${meta}</small>${j.error ? `<small>${esc(j.error)}</small>` : ''}${j.reject && j.reject_reason ? `<small>Rejected: ${esc(j.reject_reason)}</small>` : ''}${j.note ? `<small>Note: ${esc(j.note)}</small>` : ''}
      ${tools}${canUse ? `<button data-lib="use" data-i="${i}">${esc(hooks.useLabel || 'Use for this shot')}</button>` : ''}${canUse && hooks.actions ? `<div class="lib-create">${createButtons(kind => `data-lib="${kind}" data-i="${i}"`)}</div>` : ''}${isExternal(j) ? `<button data-lib="open" data-i="${i}">View original settings</button>` : j.positive ? `<button data-lib="reuse" data-i="${i}">${esc(hooks.reuseLabel || 'Use in Compose')}</button>` : ''}${canUse && hooks.startImage ? `<button data-lib="startimage" data-i="${i}" title="The next picture starts from this one. The prompt and settings stay as they are.">Use as start image</button>` : ''}</article>`;
  }
  function bind(host, list) {
    lb.all = list;
    host.querySelectorAll('[data-lib]').forEach(b => b.onclick = () => act(b.dataset.lib, list[+b.dataset.i], b));
  }
  function trayHtml() {
    if (!pins.length) return '';
    return `<div class="lib-tray">${pins.map(p => `<img src="${esc(thumbUrl(p, BASE))}" alt="">`).join('')}<button type="button" class="primary" data-compare ${pins.length < 2 ? 'disabled' : ''}>Compare ${pins.length}</button><button type="button" data-unpin-all>Clear</button></div>`;
  }
  function bindTray(host) {
    const go = host.querySelector('[data-compare]'); if (go) go.onclick = openCompare;
    const clear = host.querySelector('[data-unpin-all]'); if (clear) clear.onclick = () => { pins = []; hooks.changed(); };
  }

  function openLightbox(id, list = lb.all || []) {
    lb.list = list.filter(t => t.status === 'done' && !t.deleted && (t.file || t.thumb || draftPictureUrl(t.url) || isAgent(t)));
    lb.i = Math.max(0, lb.list.findIndex(t => t.id === id)); lb.raw = false;
    overlay('libLightbox').hidden = false; renderLightbox();
  }
  function closeLightbox() { const el = overlay('libLightbox'); el.hidden = true; el.innerHTML = ''; }
  function renderLightbox() {
    const t = lb.list[lb.i], el = overlay('libLightbox'); if (!t) return closeLightbox();
    el.innerHTML = lightboxHtml(t, {i: lb.i, n: lb.list.length, pinned: pins.some(p => p.id === t.id), raw: lb.raw, styleName: hooks.styleName(t.compose?.style),
      base: BASE, useLabel: hooks.reuseLabel || 'Use in Compose (same seed)', agentNewSeeds: true});
    if ((t.file || draftPictureUrl(t.url) || isAgent(t)) && hooks.startImage) el.querySelector('[data-a=sameseed]')?.insertAdjacentHTML('afterend', '<button class="btn sm" data-a="startimage" title="The next picture starts from this one. The prompt and settings stay as they are.">Use as start image</button>');
    if ((t.file || isAgent(t)) && hooks.actions) el.querySelector('.side').insertAdjacentHTML('beforeend', `<div class="lib-create"><button type="button" data-a="use">${esc(hooks.useLabel || 'Select image')}</button>${createButtons(kind => `data-a="${kind}"`)}</div>`);
    const save = () => {
      const note = el.querySelector('#lbNote').value.trim(), reason = el.querySelector('#lbReason').value.trim();
      const f = {}; if (note !== (t.note || '')) f.note = note; if (reason !== (t.reject_reason || '')) f.reject_reason = reason;
      if (Object.keys(f).length) rate(t, f);
    };
    el.querySelector('#lbNote').onchange = save; el.querySelector('#lbReason').onchange = save;
    el.onclick = e => {
      const b = e.target.closest('button');
      if (e.target.classList.contains('pic') || b?.dataset.close) return closeLightbox();
      if (!b) return;
      if (b.dataset.lb) { lb.i = (lb.i + +b.dataset.lb + lb.list.length) % lb.list.length; lb.raw = false; return renderLightbox(); }
      if (b.dataset.lbraw) { lb.raw = !lb.raw; return renderLightbox(); }
      if (b.dataset.lbrej) return rate(t, rateFields('reject', t, el.querySelector('#lbReason').value.trim()));
      if (b.dataset.a) act(b.dataset.a, t, b);
    };
  }
  function openCompare() {
    const el = overlay('libCompare');
    el.hidden = false; el.innerHTML = compareHtml(pins, BASE);
    el.onclick = e => {
      if (e.target.closest('[data-close]')) { el.hidden = true; return; }
      const open = e.target.dataset.open; if (open) { el.hidden = true; return openLightbox(open, pins); }
      const cd = e.target.closest('[data-cdel]'); if (cd) return act('del', pins.find(p => p.id === cd.dataset.cdel));
      const up = e.target.closest('[data-unpin]');
      if (up) { pins = pins.filter(p => p.id !== up.dataset.unpin); hooks.changed(); if (pins.length > 1) openCompare(); else el.hidden = true; }
    };
  }
  document.addEventListener('keydown', e => {
    const el = document.getElementById('libLightbox'), cmp = document.getElementById('libCompare');
    if (cmp && !cmp.hidden && e.key === 'Escape') { cmp.hidden = true; e.preventDefault(); return; }
    if (!el || el.hidden || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
    const k = lightboxKey(e), t = lb.list[lb.i]; if (!k || !t) return;
    e.preventDefault(); e.stopPropagation();
    if (k === 'close') closeLightbox();
    else if (k === 'next' || k === 'prev') { lb.i = (lb.i + (k === 'next' ? 1 : -1) + lb.list.length) % lb.list.length; lb.raw = false; renderLightbox(); }
    else if (k === 'del') act('del', t);
    else rate(t, rateFields(k, t));
  }, true);

  // Trash: deleted pictures, newest first, with Restore and Empty trash.
  async function loadTrash() { trash = await hooks.api('image/api/trash'); hooks.changed(); }
  function trashHtml() {
    if (!trash) return '<p class="hint">Loading the trash…</p>';
    return `<div class="pane-title"><h4>Trash (${trash.length})</h4>${trash.length ? '<button type="button" class="danger" data-empty-trash>Empty trash</button>' : ''}</div>
      ${trash.length ? '<div class="render-grid">' + trash.map((t, i) => `<article class="render-card"><img loading="lazy" src="${BASE}/trashthumb/${esc(t.thumb || '')}" alt="Deleted picture"><small>${t.n ? '#' + t.n + ' · ' : ''}deleted ${esc((t.deleted_at || '').slice(0, 16).replace('T', ' '))}</small><button type="button" data-restore="${i}">Restore</button></article>`).join('') + '</div>' : '<p class="hint">The trash is empty.</p>'}`;
  }
  function bindTrash(host) {
    host.querySelectorAll('[data-restore]').forEach(b => b.onclick = async () => {
      const t = trash[+b.dataset.restore];
      await write('render/' + encodeURIComponent(t.id) + '/restore');
      trash = trash.filter(x => x.id !== t.id); hooks.notice('Restored.'); hooks.restored?.(t); hooks.changed();
    });
    const empty = host.querySelector('[data-empty-trash]');
    if (empty) empty.onclick = async () => {
      if (!globalThis.confirm?.(`Delete the ${trash.length} picture(s) in the trash for good?`)) return;
      await write('trash/empty'); trash = []; hooks.changed();
    };
  }
  return {cardHtml, bind, trayHtml, bindTray, openLightbox, loadTrash, trashHtml, bindTrash, act};
}
