// A shot's versions, on the beat: New version (its own settings, a new seed), Repaint a part (paint a mask over the
// picture and describe what goes there; the image gen queue's inpaint, tools/imagegen/server.py start_image), and
// Compare, where two versions sit side by side and "Use this one" picks the one the beat shows. Every render goes
// through the image gen queue; a pick goes live on Save like any other (pictures.js).
//
// A version of a shot is a render made for it here or in the composer (its job's compose names the scene and the
// shot), the render picked for it, the record its live picture came from (api.py picture_source), or a render that
// started from its picture.
const { document, setTimeout, clearTimeout, URLSearchParams } = globalThis;
import { esc, api, notice } from './common.js';
import { S, edit } from './store.js';
import { openPainter } from './image-tools.js';

const OUT = 'island/private/imagegen/outputs/';
const asset = (kind, path) => '/api/subplots/image/' + kind + '/' + String(path).split('/').map(encodeURIComponent).join('/');

// The picture the beat shows now as a repo path the queue can start from: a pick waiting for Save, else the live file.
export function picturePath(pic) {
  if (pic.chosen && !pic.chosen.applied && pic.chosen.file) return OUT + pic.chosen.file;
  return pic.url && !pic.url.startsWith('data:') && !pic.url.startsWith('/api/') ? decodeURIComponent(pic.url.replace(/^\//, '')) : '';
}

// What the editor knows per scene: its image gen runs, the queue's recent jobs and each shot's source record.
const known = new Map(); // scene id -> {runs, stale, sources: {slot: job id}}
let jobs = [], timer = null, repaint = () => {};

function load(id, slot) {
  let k = known.get(id);
  if (!k) known.set(id, k = { runs: null, sources: {} });
  if (k.loading) return k.loading;
  const tasks = [refreshJobs()];
  if (!k.runs || k.stale) {
    k.stale = false;
    tasks.push(api('pictures?id=' + encodeURIComponent(id)).then(d => { k.runs = d.runs || []; }).catch(e => { k.runs ||= []; notice(e.message, true); }));
  }
  if (slot && !(slot in k.sources)) {
    k.sources[slot] = null;
    tasks.push(api('picture-source?' + new URLSearchParams({ id, slot })).then(d => { k.sources[slot] = d.job?.id || null; }).catch(() => {}));
  }
  return (k.loading = Promise.all(tasks).finally(() => { k.loading = null; }));
}
async function refreshJobs() {
  try { jobs = await api('image/api/jobs'); } catch { jobs = []; }
}

const made = r => r.compose?.made === 'repaint' ? 'Repainted part' + (r.compose.repaintText ? ': “' + r.compose.repaintText + '”' : '')
  : r.compose?.made === 'new-version' ? 'New version'
    : r.start?.mask ? 'Repainted part' : r.start ? 'Small change' : 'Render';

// Every version of one shot, newest first, the queue's live state laid over the history.
export function versionsOf(id, slot, pic) {
  const k = known.get(id);
  if (!k?.runs) return null;
  const current = picturePath(pic), picked = pic.chosen?.id, source = k.sources[slot];
  const mine = r => (r.compose?.subplotId === id && (r.compose?.imageSlot || '') === slot) || (picked && r.id === picked)
    || (source && r.id === source) || (current && r.start?.image === current);
  const all = new Map();
  for (const run of k.runs) for (const r of run.renders || []) {
    const v = { ...run, ...r, status: 'done' };
    if (mine(v) && !v.deleted && !v.reject && v.file) all.set(v.id, v);
  }
  // the queue's state over the history's record; a job has no picture number until the render log gives it one
  const set = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v != null));
  for (const j of jobs) if (mine(j) && !j.deleted && j.status !== 'cancelled') all.set(j.id, { ...all.get(j.id), ...set(j) });
  return [...all.values()].map(v => ({ ...v, how: v.id === source ? 'Where the picture came from' : made(v) }))
    .sort((a, b) => String(b.at || b.created || '9999').localeCompare(String(a.at || a.created || '9999')));
}

const pending = list => (list || []).filter(v => v.status === 'queued' || v.status === 'running');
// For the timeline: what the queue is doing for a shot, in a few words.
export function makingLabel(id, slot) {
  const k = known.get(id);
  const busy = k?.runs ? pending(jobs.filter(j => j.compose?.subplotId === id && (j.compose?.imageSlot || '') === slot)) : [];
  if (!busy.length) return '';
  const run = busy.find(j => j.status === 'running');
  return run ? `Making a new version, ${Math.round((run.progress || 0) * 100)}%` : 'A new version is waiting in the queue';
}

// Poll the queue while something for the open scene is queued or rendering.
function watch() {
  clearTimeout(timer);
  const id = S.scene?.id;
  if (!id || !jobs.some(j => (j.status === 'queued' || j.status === 'running') && j.compose?.subplotId)) return;
  timer = setTimeout(async () => {
    const before = new Set(jobs.filter(j => j.status === 'done').map(j => j.id));
    await refreshJobs();
    const finished = jobs.filter(j => j.status === 'done' && !before.has(j.id) && j.compose?.subplotId);
    if (finished.length) {
      for (const k of known.values()) k.stale = true; // the history has them now; read it again on the next paint
      notice(finished.length > 1 ? `${finished.length} new versions are ready. Compare them on the shot.` : 'A new version is ready. Compare it with the one in the scene.');
    }
    if (jobs.some(j => j.status === 'error' && j.compose?.subplotId && !before.has(j.id) && !j.reported)) {
      const bad = jobs.find(j => j.status === 'error' && !j.reported); bad.reported = true;
      notice('The image generator could not make that version: ' + (bad.error || 'unknown error'), true);
    }
    paintBadges();
    repaint();
    watch();
  }, 3000);
}
function paintBadges() {
  for (const el of document.querySelectorAll('[data-making]')) {
    const [id, slot] = JSON.parse(el.dataset.making);
    const text = makingLabel(id, slot);
    el.textContent = text;
    el.hidden = !text;
  }
}

// The shot's settings as a job with a new seed; `extra` changes it (a repaint). Needs the composer (images.js shotJob).
async function queue(composer, slot, extra) {
  const body = await composer.shotJob(slot, { anyway: !!extra?.start });
  if (!body) throw Error('There is no record of how this picture was made, so there is nothing to make again. Repaint a part, or compose a new picture.');
  Object.assign(body, { seed_mode: 'random', count: 1, autostart: true });
  body.compose = { ...body.compose, imageSlot: slot, made: extra ? 'repaint' : 'new-version' };
  if (extra) {
    const text = extra.text.trim();
    if (text) {
      body.positive = body.positive.replace(/[\s,.]*$/, '') + ', ' + text;
      body.compose.repaintText = text;
      if (body.compose.override) body.compose.override = { ...body.compose.override, positive: body.positive };
      else body.compose.extra = [body.compose.extra, text].filter(Boolean).join(', ');
    }
    body.start = extra.start;
    body.compose.start = { image: extra.start.image, denoise: extra.start.denoise };
    // the picture's own size when the record's is a different shape, so the repaint lines up with the picture
    const { w, h } = extra.size;
    if (w && h && Math.abs(w / h - body.w / body.h) > 0.02) {
      const scale = Math.sqrt((body.w * body.h) / (w * h));
      body.w = Math.round((w * scale) / 64) * 64; body.h = Math.round((h * scale) / 64) * 64;
    }
  }
  await api('image/api/generate', body);
  await refreshJobs();
  paintBadges();
  watch();
}

const STRENGTHS = [['0.45', 'A light touch'], ['0.75', 'Redo it'], ['1', 'Replace it']];

// The Picture tab's Versions section for the selected shot. `ctx`: {doc, pic, getPic() (as it is now), composer()
// (installs it), rerender}.
export function paintVersions(box, ctx) {
  const { doc, pic } = ctx, slot = pic.slot, id = doc.id;
  repaint = ctx.rerender;
  const list = versionsOf(id, slot, pic), k = known.get(id);
  if (!k?.loading && (!list || k.stale || !(slot in k.sources))) load(id, slot).then(() => { ctx.rerender(); watch(); });
  if (!list) { box.innerHTML = '<p class="quiet">Looking for this shot’s versions…</p>'; return; }
  const current = picturePath(pic), busy = pending(list);
  // a picture beat added here has nothing to make again until a picture is composed for it
  if (!current && !list.length) { box.innerHTML = '<p class="quiet small">Compose a picture for this beat, or pick one from the image generator below.</p>'; return; }
  box.innerHTML = `<div class="ver-actions">
      <button data-new class="primary-soft" title="The same settings as this picture, with a new seed">New version</button>
      <button data-repaint ${current ? '' : 'disabled'} title="Paint over a part of the picture and say what goes there">Repaint a part</button>
    </div>
    <h3>Versions of this shot <span class="quiet">${list.length + (sceneUrl(doc, slot) ? 1 : 0)}</span></h3>
    <div class="ver-strip">${sceneUrl(doc, slot) ? `<button data-v="" class="${pic.changed ? '' : 'picked'}" title="The picture in the game now"><img src="${esc(sceneUrl(doc, slot))}" alt=""><span>In the game</span></button>` : ''}${list.map((v, i) => versionThumb(v, i, pic)).join('')}</div>
    ${busy.length ? '' : list.length ? '<p class="quiet small">Click a version to compare it with the one in the scene.</p>' : '<p class="quiet small">No other versions yet. New version makes one from this picture’s settings.</p>'}`;
  box.querySelector('[data-new]').onclick = async e => {
    e.currentTarget.disabled = true;
    try { await queue(ctx.composer(), slot); notice('New version queued. It shows here when it is ready, and you can keep editing.'); }
    catch (err) { notice(err.message, true); }
    ctx.rerender();
  };
  box.querySelector('[data-repaint]').onclick = () => openPainter({
    mode: 'mask', picture: current, title: 'Paint over the part to change',
    fields: `<label>What goes there?<input data-what type="text" placeholder="e.g. a closed paper bag" size="28"></label><label>How much<select data-much>${STRENGTHS.map(([v, l]) => `<option value="${v}" ${v === '0.75' ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`,
    doneLabel: 'Repaint',
    onDone: async (mask, el, size) => {
      const text = el.querySelector('[data-what]').value, denoise = +el.querySelector('[data-much]').value;
      try { await queue(ctx.composer(), slot, { text, size, start: { image: current, denoise, mask } }); notice('Repaint queued. The new version shows on the shot when it is ready.'); }
      catch (err) { notice(err.message, true); }
      ctx.rerender();
    },
  });
  box.querySelectorAll('[data-v]').forEach(b => { b.onclick = () => openCompare(ctx, b.dataset.v); });
}

// The live file of a shot, for when a pick is waiting for Save.
const sceneUrl = (doc, slot) => { const image = doc.images?.find(i => i.id === slot); return image?.available === false ? '' : image?.url || ''; };

function versionThumb(v, i, pic) {
  if (v.status !== 'done') {
    const pct = Math.round((v.progress || 0) * 100);
    return `<button disabled class="making" title="${esc(v.how)}"><div class="ver-wait">${v.status === 'error' ? 'Failed' : v.status === 'running' ? pct + '%' : 'Waiting'}</div><span>${esc(v.how.split(':')[0])}</span>${v.status === 'running' ? `<i style="width:${pct}%"></i>` : ''}</button>`;
  }
  const chosen = pic.chosen?.id === v.id && pic.changed;
  return `<button data-v="${esc(v.id)}" class="${chosen ? 'picked' : ''}" title="${esc(v.how)}"><img src="${esc(asset('thumb', v.thumb || v.file))}" alt="" loading="lazy"><span>${v.n ? '#' + esc(v.n) : 'New'}${chosen ? ' · used' : ''}</span></button>`;
}

// ---------- Compare ----------
// The version in the scene on the left, another on the right; the strip below swaps the right one (shift: the left).
function openCompare(ctx, rightId) {
  const dialog = document.getElementById('compareDialog');
  const { doc, pic } = ctx, slot = pic.slot;
  let right = rightId, left = '';
  // every version seen while the dialog is open stays in it, so one picked a moment ago can be picked back
  const seen = new Map();
  const all = () => {
    const live = sceneUrl(doc, slot);
    for (const v of [...(live ? [{ id: '', url: live, how: 'In the game now', live: true }] : []), ...(versionsOf(doc.id, slot, ctx.getPic()) || []).filter(v => v.status === 'done').map(v => ({ ...v, url: asset('out', v.file) }))]) seen.set(v.id, v);
    return [...seen.values()];
  };
  const using = () => { const p = ctx.getPic(); return p.changed ? p.chosen.id : ''; };
  function paint() {
    const list = all(), use = using();
    left = list.some(v => v.id === left) ? left : use;
    const side = (v, which) => !v ? '<figure class="cmp-side empty"><p class="quiet">Pick a version below.</p></figure>' : `<figure class="cmp-side">
        <img src="${esc(v.url)}" alt="">
        <figcaption><strong>${v.id === use ? 'The beat uses this one' : which === 'left' ? 'On the left' : 'On the right'}</strong>
          <span class="quiet">${esc(v.live ? 'The picture in the game now' : `${v.n ? '#' + v.n + ' · ' : ''}${v.how} · seed ${v.seed}`)}</span>
          ${v.id === use ? '' : `<button class="primary" data-use="${esc(v.id)}">Use this one</button>`}</figcaption></figure>`;
    dialog.innerHTML = `<div class="cmp-head"><h2>Compare versions <span class="quiet">Shot ${(doc.images || []).findIndex(i => i.id === slot) + 1}</span></h2>
        <span class="quiet">Click a version to put it on the right, Shift-click for the left. ← → step through them.</span><button data-close>Done</button></div>
      <div class="cmp-pair">${side(list.find(v => v.id === left), 'left')}${side(list.find(v => v.id === right), 'right')}</div>
      <div class="cmp-strip">${list.map(v => `<button data-pick="${esc(v.id)}" class="${v.id === right ? 'right' : ''} ${v.id === left ? 'left' : ''}"><img src="${esc(v.live ? v.url : asset('thumb', v.thumb || v.file))}" alt="" loading="lazy"><span>${v.live ? 'In the game' : v.n ? '#' + esc(v.n) : 'New'}${v.id === use ? ' · used' : ''}</span></button>`).join('')}</div>`;
    dialog.querySelector('[data-close]').onclick = () => dialog.close();
    dialog.querySelectorAll('[data-pick]').forEach(b => { b.onclick = e => { if (e.shiftKey) left = b.dataset.pick; else right = b.dataset.pick; paint(); }; });
    dialog.querySelectorAll('[data-use]').forEach(b => { b.onclick = () => { use_(list.find(v => v.id === b.dataset.use)); paint(); }; });
  }
  function use_(v) {
    edit(() => {
      doc.metadata.images ||= {};
      if (v.live) delete doc.metadata.images[slot];
      else doc.metadata.images[slot] = { slot, id: v.id, n: v.n, url: asset('out', v.file), file: v.file, seed: v.seed, positive: v.positive };
    });
    notice(v.live ? 'The beat keeps the picture it had.' : `The beat uses ${v.n ? '#' + v.n : 'the new version'} now. Save to put it in the game.`);
  }
  dialog.onkeydown = e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const list = all(), i = list.findIndex(v => v.id === right);
    right = list[(i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length]?.id ?? right;
    paint();
  };
  paint();
  dialog.showModal();
}
