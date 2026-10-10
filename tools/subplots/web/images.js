const {setInterval, clearInterval, document, URLSearchParams, CustomEvent} = globalThis;
import {$, esc, api, guarded, notice} from './common.js';
import {DIRECTIONS, normalizeComposition, assembleComposition, portraitUrl} from './image-compose.js';

const options = (items, value) => items.map(item => {
  const id = item.id ?? item;
  return `<option value="${esc(id)}" ${id === value ? 'selected' : ''}>${esc(item.label ?? item)}</option>`;
}).join('');
const field = (name, title, items, value, empty = 'No preference') => `<label>${esc(title)}<select data-compose="${name}">${empty === null ? '' : `<option value="">${esc(empty)}</option>`}${options(items, value)}</select></label>`;
const check = (name, title, value, disabled = false) => `<label class="image-check"><input data-compose="${name}" type="checkbox" ${value ? 'checked' : ''} ${disabled ? 'disabled' : ''}>${esc(title)}</label>`;
const number = (name, title, value, min, max, step = 1, placeholder = '') => `<label>${esc(title)}<input data-compose="${name}" type="number" min="${min}" max="${max}" step="${step}" value="${esc(value ?? '')}" placeholder="${esc(placeholder)}"></label>`;
const chip = (label, selected, data) => `<button type="button" ${data} aria-pressed="${!!selected}">${esc(label)}</button>`;
const asset = (kind, path) => '/api/subplots/image/' + kind + '/' + String(path).split('/').map(encodeURIComponent).join('/');

export function installImages(getScene, changed) {
  let presets = null, jobs = [], runs = [], poll = null, pendingConnect = null;
  let historyScope = 'scene', historyCharacter = '', historyStar = false, historyEnd = false, historyBusy = false;
  let selected = [], referenceChoices = [], referenceOwner = '', activeScene = '', activeSlot = '', loadingHistory = 0;
  const active = type => (presets?.[type] || []).filter(p => !p.archived);
  const preset = (type, id) => (presets?.[type] || []).find(p => p.id === id);
  const presetOptions = type => active(type).map(p => ({id: p.id, label: p.data.name || p.data.title || p.id}));
  const slots = () => getScene()?.images || [];
  function compose() {
    const scene = getScene();
    if (!scene) return null;
    scene.metadata ||= {};
    if (activeScene !== scene.id) {
      activeScene = scene.id;
      activeSlot = slots()[0]?.id || '';
      referenceChoices = [];
      referenceOwner = '';
    }
    if (!slots().some(s => s.id === activeSlot)) activeSlot = slots()[0]?.id || '';
    scene.metadata.compositions ||= {};
    const key = activeSlot || 'scene';
    let c = scene.metadata.compositions[key];
    if (!c) {
      const seed = scene.metadata.composition || {};
      c = scene.metadata.compositions[key] = normalizeComposition(seed);
      c.imageSlot = activeSlot;
    }
    if (presets) {
      for (const type of ['model', 'style', 'framing']) if (!c[type]) c[type] = active(type)[0]?.id || '';
      if (c.negatives === null) c.negatives = active('negative').filter(p => p.data.default).map(p => p.id);
      if (!c.castInitialized) {
        const speakers = new Set();
        const visit = value => {
          if (Array.isArray(value)) value.forEach(visit);
          else if (value && typeof value === 'object') {
            if (typeof value.say === 'string') speakers.add(value.say.toLowerCase());
            for (const name of ['then', 'else', 'seq', 'steps']) visit(value[name]);
          }
        };
        visit(scene.steps);
        if (!c.characters.length) c.characters = active('character').filter(p => !p.data.generic && (speakers.has(p.id.toLowerCase()) || speakers.has((p.data.name || '').toLowerCase()))).map(p => p.id);
        c.castInitialized = true;
      }
    }
    return c;
  }
  const assemble = () => assembleComposition(compose() || normalizeComposition(), presets || {}, getScene()?.id);
  const selectedImage = slot => getScene()?.metadata.images?.[slot] || (getScene()?.metadata.image?.slot === slot ? getScene().metadata.image : null);
  function updatePrompt() {
    const body = assemble();
    if ($('#assembled')) $('#assembled').textContent = body.positive;
    if ($('#imageRatingNote')) $('#imageRatingNote').textContent = body.rating === compose()?.rating ? '' : 'The selected character preset limits this image to ' + body.rating + '.';
  }
  function render() {
    const host = $('#composition');
    if (!host) return;
    const c = compose();
    if (!c) { host.innerHTML = '<p class="hint">Choose a scene first.</p>'; return; }
    const slot = slots().find(s => s.id === activeSlot);
    const picked = selectedImage(activeSlot);
    const cast = c.characters.map(id => preset('character', id)).filter(Boolean);
    const oneCharacter = cast.length === 1 && !c.man;
    const refPath = c.reference || (oneCharacter ? cast[0].data.portrait : '');
    const md = preset('model', c.model)?.data || {};
    const imageTitle = slot ? 'Shot ' + (slots().indexOf(slot) + 1) : 'Scene image';
    const previewUrl = picked?.url || (slot?.available === false ? '' : slot?.url);
    host.innerHTML = `
      <p class="hint image-scene-name">${esc(getScene().metadata.title||getScene().title)}</p><div class="image-current">${previewUrl ? `<a href="${esc(previewUrl)}" target="_blank" rel="noopener"><img class="selected-image" src="${esc(previewUrl)}" alt="${esc(imageTitle)}"></a>` : `<div class="image-empty">${slot ? 'This shot’s picture is unavailable. Generate a replacement or choose one from the picture library below.' : 'Choose a shot in the storyboard to replace its image.'}</div>`}
        ${slots().length > 1 ? field('imageSlot', 'Image in this scene', slots().map((s, i) => ({id: s.id, label: 'Shot ' + (i + 1)})), activeSlot, null) : `<strong>${esc(imageTitle)}</strong>`}
        ${slot?.storage === 'archive' && !picked ? '<p class="hint">Showing the earlier picture from the archive.</p>' : ''}
        ${picked&&!picked.applied ? '<p class="hint">Replacement selected. Save the scene to use it in the story.</p><button data-clear-image>Keep the current story image</button>' : ''}
      </div>
      <section class="image-section"><h3>People in the picture</h3><div class="image-cast">${active('character').filter(p => !p.data.generic).map(p => `<button type="button" data-char="${esc(p.id)}" aria-pressed="${c.characters.includes(p.id)}">${portraitUrl(p.data.portrait) ? `<img loading="lazy" src="${esc(portraitUrl(p.data.portrait))}" alt="">` : '<span class="image-person-placeholder">${esc((p.data.name||p.id).slice(0,1))}</span>'}<span>${esc(p.data.name || p.id)}</span></button>`).join('') || '<p class="hint">Your image-generation character presets appear here when connected.</p>'}</div>
      <div class="chips">${active('character').some(p => p.data.generic) ? chip('Include an unnamed person', c.man, 'data-toggle="man"') : ''}${cast.filter(p => p.data.outfit).map(p => chip(p.data.name + '’s usual outfit', c.outfit[p.id], `data-outfit="${esc(p.id)}"`)).join('')}${cast.length + (c.man ? 1 : 0) > 1 ? chip('Short descriptions for a group', c.useShort, 'data-toggle="useShort"') : ''}</div></section>
      <section class="image-section"><h3>Direct the shot</h3>
      ${field('scenePreset', 'Saved scene direction', presetOptions('scene'), '', 'Choose a saved direction…')}
      <div class="two">${field('pose', 'Pose', DIRECTIONS.pose, c.pose)}${field('angle', 'Camera angle', DIRECTIONS.angle, c.angle)}</div>
      <div class="two">${field('environment', 'Environment', DIRECTIONS.environment, c.environment)}${field('light', 'Light', DIRECTIONS.light, c.light)}</div>
      <label>What happens in this picture?<textarea data-compose="scene" rows="4" placeholder="Choose a saved direction above, or describe the action in your own words.">${esc(c.scene)}</textarea></label>
      <h4>Camera and composition</h4><div class="chips">${active('camera').map(p => chip(p.data.name, c.cameras.includes(p.id), `data-camera="${esc(p.id)}"`)).join('')}</div>
      <div class="two">${field('framing', 'Picture shape', presetOptions('framing'), c.framing, null)}${field('style', 'Art style', presetOptions('style'), c.style, null)}</div>
      ${field('rating', 'Content level', [{id: 'safe', label: 'General'}, {id: 'sensitive', label: 'Mature'}, {id: 'nsfw', label: 'Adult'}], c.rating, null)}<p id="imageRatingNote" class="hint"></p></section>
      <details class="image-section"><summary>Keep the character consistent</summary>
      ${oneCharacter ? `<div class="image-reference">${portraitUrl(refPath) ? `<img src="${esc(portraitUrl(refPath))}" alt="Character reference">` : ''}<div><strong>${esc(c.reference ? 'Selected reference' : cast[0].data.name + '’s portrait')}</strong><button data-pick-reference>Choose a reference picture</button>${c.reference ? '<button data-reset-reference>Use character portrait</button>' : ''}</div></div><div id="imageReferenceChoices"></div>` : '<p class="hint">Choose one character to use a portrait reference or face correction.</p>'}
      ${check('referenceOn', 'Use the reference while generating', c.referenceOn, !oneCharacter || !refPath)}
      ${number('referenceStrength', 'Reference strength', c.referenceStrength, 0, 2, 0.05)}
      ${check('referenceCutout', 'Remove the portrait background', c.referenceCutout, !oneCharacter)}
      ${check('faceFix', 'Correct the face after generating', c.faceFix, !oneCharacter || !refPath)}
      ${number('faceStrength', 'Face correction strength', c.faceStrength, 0.1, 1, 0.05)}</details>
      <details class="image-section"><summary>Generation settings</summary>
      ${field('model', 'Model', presetOptions('model'), c.model, null)}
      <div class="two">${number('count', 'Number of pictures', c.count, 1, 8)}${field('seedMode', 'Variation', [{id: 'random', label: 'New variations'}, {id: 'fixed', label: 'Repeat a seed'}], c.seedMode, null)}</div>
      ${number('seed', 'Seed', c.seed, 0, 9007199254740991)}
      <div class="two">${number('steps', 'Steps', c.steps, 1, 100, 1, md.steps || 30)}${number('cfg', 'Prompt strength', c.cfg, 0.1, 30, 0.1, md.cfg || 5)}</div>
      <h4>Exclude from the picture</h4><div class="chips">${active('negative').map(p => chip(p.data.name, c.negatives?.includes(p.id), `data-negative="${esc(p.id)}"`)).join('')}</div>
      <label>Anything else to avoid?<textarea data-compose="negative" rows="2">${esc(c.negative || '')}</textarea></label>
      </details>
      <button id="generate" class="primary" ${presets ? '' : 'disabled'}>Generate ${+c.count > 1 ? c.count + ' pictures' : 'a picture'}</button>
      <p class="hint">Uses your existing image-generation queue. Choose a result from the Picture library to add it to this shot.</p>
      <details class="image-section"><summary>Generated prompt</summary><p id="assembled" class="hint"></p>${c.override ? '<p class="hint">This picture uses a prompt copied from history.</p><button data-reset-prompt>Build the prompt from these controls</button>' : ''}</details>`;
    bindComposition();
    updatePrompt();
    renderReferenceChoices();
    renderJobs();
  }
  function edit(mutator, repaint = true) {
    const c = compose(); if (!c) return;
    mutator(c); changed();
    if (repaint) render(); else updatePrompt();
  }
  function toggleList(c, key, id) { c[key] = c[key].includes(id) ? c[key].filter(x => x !== id) : [...c[key], id]; }
  function bindComposition() {
    const host = $('#composition');
    host.querySelectorAll('[data-compose]').forEach(el => {
      el.oninput = () => {
        const name = el.dataset.compose;
        if (name === 'imageSlot') { activeSlot = el.value; render(); return; }
        if (name === 'scenePreset') {
          const p = preset('scene', el.value); if (!p) return;
          edit(c => { c.scene = p.data.text || ''; c.sceneRefs = [p.id]; if (p.data.rating) c.rating = p.data.rating; c.override = null; }); return;
        }
        edit(c => {
          c[name] = el.type === 'checkbox' ? el.checked : el.value;
          if (name === 'framing') { delete c.width; delete c.height; }
          c.override = null;
        }, ['model', 'count', 'referenceOn', 'faceFix'].includes(name));
      };
    });
    host.querySelectorAll('[data-char]').forEach(b => b.onclick = () => edit(c => { toggleList(c, 'characters', b.dataset.char); c.reference = ''; c.override = null; }));
    host.querySelectorAll('[data-camera]').forEach(b => b.onclick = () => edit(c => { toggleList(c, 'cameras', b.dataset.camera); c.override = null; }));
    host.querySelectorAll('[data-negative]').forEach(b => b.onclick = () => edit(c => { toggleList(c, 'negatives', b.dataset.negative); c.override = null; }));
    host.querySelectorAll('[data-toggle]').forEach(b => b.onclick = () => edit(c => { c[b.dataset.toggle] = !c[b.dataset.toggle]; c.override = null; }));
    host.querySelectorAll('[data-outfit]').forEach(b => b.onclick = () => edit(c => { c.outfit[b.dataset.outfit] = !c.outfit[b.dataset.outfit]; c.override = null; }));
    const bind = (selector, fn) => { const el = $(selector, host); if (el) el.onclick = fn; };
    bind('[data-clear-image]', () => { const s = getScene(); if (s.metadata.images) delete s.metadata.images[activeSlot]; if (s.metadata.image?.slot === activeSlot) delete s.metadata.image; changed(); render(); announceImage(); });
    bind('[data-reset-reference]', () => edit(c => { c.reference = ''; }));
    bind('[data-pick-reference]', guarded(loadReferences));
    bind('[data-reset-prompt]', () => edit(c => { c.override = null; }));
    bind('#generate', guarded(generate));
  }
  async function loadReferences() {
    const c = compose(), id = c.characters[0];
    const rows = await api('image/api/portraits?character=' + encodeURIComponent(id));
    if (compose()?.characters[0] !== id) return;
    referenceChoices = rows; referenceOwner = id; renderReferenceChoices();
  }
  function renderReferenceChoices() {
    const host = $('#imageReferenceChoices'); if (!host) return;
    const valid = referenceOwner === compose()?.characters[0] ? referenceChoices.filter(p => portraitUrl(p.path)) : [];
    host.innerHTML = valid.length ? '<div class="image-reference-grid">' + valid.map((p, i) => `<button data-reference="${i}" title="${esc(p.group || 'Reference picture')}"><img loading="lazy" src="${esc(p.thumb ? asset('thumb', p.thumb) : portraitUrl(p.path))}" alt="${esc(p.group || 'Reference picture')}"></button>`).join('') + '</div>' : '';
    host.querySelectorAll('[data-reference]').forEach(b => b.onclick = () => edit(c => { c.reference = valid[+b.dataset.reference].path; c.referenceOn = true; referenceChoices = []; }));
  }
  async function connect() {
    if (pendingConnect) return pendingConnect;
    pendingConnect = (async () => {
      $('#imageStatus').textContent = 'Loading your image presets…';
      try {
        presets = await api('image/api/presets');
        if ($('#loadPresets')) $('#loadPresets').textContent = 'Refresh presets';
        $('#imageStatus').textContent = 'Connected to your image-generation service.';
        render(); await Promise.all([loadHistory(), refresh()]);
        if (!poll) poll = setInterval(() => { if (!document.hidden && !$('#images')?.hidden) refresh().catch(e => { $('#imageStatus').textContent = e.message; }); }, 4000);
      } catch (e) { $('#imageStatus').textContent = e.message; throw e; }
      finally { pendingConnect = null; }
    })();
    return pendingConnect;
  }
  async function generate() {
    const body = assemble();
    if (!body.model_file) throw Error('Choose a generation model first.');
    $('#generate').disabled = true;if($('#quickGenerate'))$('#quickGenerate').disabled=true;
    try { await api('image/api/generate', body); notice('Picture queued. You can keep editing while it generates.'); await refresh(); }
    finally { if ($('#generate')) $('#generate').disabled = false;if($('#quickGenerate'))$('#quickGenerate').disabled=false; }
  }
  async function refresh() { jobs = await api('image/api/jobs'); renderJobs(); }
  function historyQuery(before) {
    const q = new URLSearchParams({limit: '100', who: 'all'});
    if (historyCharacter) q.set('character', historyCharacter);
    if (historyStar) q.set('star', '1');
    if (before) q.set('before', before);
    return q;
  }
  async function loadHistory(more = false) {
    if (more && (historyBusy || historyEnd)) return;
    const request = ++loadingHistory;
    historyBusy = true;
    try {
      const rows = await api('image/api/history?' + historyQuery(more ? runs.at(-1)?.at : ''));
      if (request !== loadingHistory) return;
      runs = more ? [...runs, ...rows] : rows; historyEnd = rows.length < 100;
    } finally { if (request === loadingHistory) { historyBusy = false; renderJobs(); } }
  }
  function renderJobs() {
    const host = $('#renders'); if (!host) return;
    if (!getScene()) { host.replaceChildren(); return; }
    const all = new Map(runs.flatMap(run => (run.renders || []).map(j => [j.id, {...run, ...j, status: 'done'}])));
    for (const job of jobs) all.set(job.id, {...all.get(job.id), ...job});
    selected = [...all.values()].filter(j => !j.deleted && (historyScope !== 'scene' || j.compose?.subplotId === getScene().id)
      && (!historyCharacter || j.characters?.includes(historyCharacter)) && (!historyStar || j.star || j.fav))
      .sort((a, b) => (b.at || '9999').localeCompare(a.at || '9999'));
    host.innerHTML = `<section class="image-section image-library"><div class="pane-title"><h3>Picture library</h3><button data-refresh-images>Refresh</button></div>
      <div class="segmented"><button data-library="scene" aria-pressed="${historyScope === 'scene'}">This scene</button><button data-library="all" aria-pressed="${historyScope === 'all'}">All generated pictures</button></div>
      <div class="two"><label>Character<select id="imageHistoryCharacter"><option value="">Anyone</option>${options(presetOptions('character'), historyCharacter)}</select></label><label class="image-check"><input id="imageHistoryStar" type="checkbox" ${historyStar ? 'checked' : ''}>Starred pictures</label></div>
      ${selected.length ? '<div class="render-grid">' + selected.map((j, i) => `<article class="render-card">${j.thumb || j.file ? `<a href="${esc(j.file ? asset('out', j.file) : asset('thumb', j.thumb))}" target="_blank" rel="noopener"><img loading="lazy" src="${esc(j.thumb ? asset('thumb', j.thumb) : asset('out', j.file))}" alt="Generated picture ${i + 1}"></a>` : ''}<small>${esc(j.status === 'done' ? j.at?.slice(0, 10) || 'Ready' : j.status)}${j.status === 'running' ? ` · ${Math.round((j.progress || 0) * 100)}%` : ''}${j.star || j.fav ? ' · ★' : ''}</small>${j.error ? `<small>${esc(j.error)}</small>` : ''}${j.file ? `<button data-use="${i}" ${activeSlot ? '' : 'disabled'}>Use for this shot</button>` : ''}${j.positive ? `<button data-reuse="${i}">Reuse settings</button>` : ''}</article>`).join('') + '</div>' : `<p class="hint">${historyScope === 'scene' ? 'No pictures generated for this scene yet. Browse all generated pictures to use an existing one.' : 'No pictures match these filters.'}</p>`}
      ${!historyEnd ? `<button data-more-images ${historyBusy ? 'disabled' : ''}>${historyBusy ? 'Loading…' : 'Load older pictures'}</button>` : ''}</section>`;
    host.querySelectorAll('[data-library]').forEach(b => b.onclick = () => { historyScope = b.dataset.library; renderJobs(); });
    $('#imageHistoryCharacter').onchange = guarded(async e => { historyCharacter = e.target.value; await loadHistory(); });
    $('#imageHistoryStar').onchange = guarded(async e => { historyStar = e.target.checked; await loadHistory(); });
    $('[data-refresh-images]', host).onclick = guarded(async () => { await Promise.all([loadHistory(), refresh()]); });
    const more = $('[data-more-images]', host); if (more) more.onclick = guarded(() => loadHistory(true));
    host.querySelectorAll('[data-use]').forEach(b => b.onclick = () => useImage(selected[+b.dataset.use]));
    host.querySelectorAll('[data-reuse]').forEach(b => b.onclick = () => reuseImage(selected[+b.dataset.reuse]));
  }
  function useImage(j) {
    const s = getScene(); if (!s || !activeSlot) return;
    s.metadata.images ||= {};
    s.metadata.images[activeSlot] = {slot: activeSlot, id: j.id, url: asset('out', j.file), file: j.file, seed: j.seed, positive: j.positive};
    changed(); render(); announceImage(); notice('Picture selected for this shot. Save the scene to use it in the story.');
  }
  function announceImage() { globalThis.dispatchEvent(new CustomEvent('subplot-image-changed', {detail: {slotId: activeSlot}})); }
  function reuseImage(j) {
    const s = getScene(); if (!s) return;
    const current = compose();
    const c = normalizeComposition(j.compose || {});
    for (const type of ['model', 'style', 'framing']) c[type] = j.presets?.[type]?.id || c[type] || current[type];
    if (!c.characters.length) c.characters = (j.characters || []).filter(id => preset('character', id));
    c.model = active('model').find(p => p.data.file === j.model_file)?.id || c.model;
    Object.assign(c, {imageSlot: activeSlot, seedMode: 'fixed', seed: j.seed, count: 1, width: j.w, height: j.h,
      steps: j.steps || c.steps, cfg: j.cfg || c.cfg, override: {positive: j.positive, negative: j.negative || ''}});
    if (j.ipa) Object.assign(c, {reference: j.ipa.ref, referenceOn: true, referenceStrength: j.ipa.strength, referenceCutout: j.ipa.cutout});
    if (j.repaint) Object.assign(c, {reference: j.repaint.ref, faceFix: true, faceStrength: j.repaint.denoise});
    s.metadata.compositions[activeSlot || 'scene'] = c;
    changed(); render(); notice('Picture settings loaded. Change the direction or generate another version.');
  }
  function focus(slotId) {
    compose();
    if (slotId) activeSlot = slotId;
    $('[data-inspect="images"]')?.click();
    render();
    if (!presets) guarded(connect)();
    if (globalThis.innerWidth < 1000) ($('#inspector') || $('#images'))?.scrollIntoView({behavior: 'smooth', block: 'start'});
  }
  if ($('#loadPresets')) $('#loadPresets').onclick = guarded(connect);
  $('[data-inspect="images"]')?.addEventListener('click', () => { if (!presets) guarded(connect)(); });
  globalThis.addEventListener('pagehide', () => { if (poll) clearInterval(poll); });
  return {render, focus, connect};
}
