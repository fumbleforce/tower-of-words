const {setInterval, clearInterval, document, URLSearchParams, CustomEvent} = globalThis;
import {$, esc, api, guarded, notice} from './common.js';
import {guessComposition} from './image-guess.js';
import {DIRECTION_KINDS, applyDefaults, normalizeComposition, assembleComposition, portraitUrl} from './image-compose.js';
import {blockId} from '../../imagegen/web/blocks.js';
import {openBlockEditor} from './block-editor.js';
import {createLibrary} from './library.js';
import {toolsHtml, bindTools} from './image-tools.js';

const options = (items, value) => items.map(item => {
  const id = item.id ?? item;
  return `<option value="${esc(id)}" ${id === value ? 'selected' : ''}>${esc(item.label ?? item)}</option>`;
}).join('');
const field = (name, title, items, value, empty = 'No preference') => `<label>${esc(title)}<select data-compose="${name}">${empty === null ? '' : `<option value="">${esc(empty)}</option>`}${options(items, value)}</select></label>`;
const check = (name, title, value, disabled = false) => `<label class="image-check"><input data-compose="${name}" type="checkbox" ${value ? 'checked' : ''} ${disabled ? 'disabled' : ''}>${esc(title)}</label>`;
const number = (name, title, value, min, max, step = 1, placeholder = '') => `<label>${esc(title)}<input data-compose="${name}" type="number" min="${min}" max="${max}" step="${step}" value="${esc(value ?? '')}" placeholder="${esc(placeholder)}"></label>`;
const chip = (label, selected, data) => `<button type="button" ${data} aria-pressed="${!!selected}">${esc(label)}</button>`;
const NEW = '__new__';
const SETTINGS = ['model', 'count', 'seed', 'steps', 'cfg', 'width', 'height'];
// A block picker: the block's entries, "+ New…" to add one right here, and Edit for the chosen one (block-editor.js).
const pickerHtml = (name, kind, title, items, value, empty = 'No preference') => `<label>${esc(title)}<span class="block-pick"><select data-compose="${name}" data-kind="${kind}">${empty === null ? '' : `<option value="">${esc(empty)}</option>`}${options(items, value)}<option value="${NEW}">+ New…</option></select><button type="button" class="small ghost" data-edit-block="${kind}" data-edit-field="${name}" title="Edit, retire or restore an older version">Edit</button></span></label>`;
const asset = (kind, path) => '/api/subplots/image/' + kind + '/' + String(path).split('/').map(encodeURIComponent).join('/');

export function installImages(getScene, changed) {
  let presets = null, jobs = [], runs = [], poll = null, pendingConnect = null, privateMode = false, modelFiles = [], loraFiles = [], controlFiles = [];
  let historyScope = 'scene', historyCharacter = '', historyStar = false, historyEnd = false, historyBusy = false, historyWho = 'all', showTrash = false;
  const edits = new Map();  // ratings and deletes made here since the library loaded: id -> fields
  let selected = [], referenceChoices = [], referenceOwner = '', activeScene = '', activeSlot = '', loadingHistory = 0;
  // how the composer is folded: the full people picker, the generation settings, the width and height fields
  let peopleOpen = false, settingsOpen = false, customSize = false;
  const fold = () => { peopleOpen = false; customSize = false; };
  // "This scene": the runs the editor's server matches to the scene (api.py scene_runs), loaded once per scene
  let sceneRuns = null, sceneRunsFor = '';
  const active = type => (presets?.[type] || []).filter(p => !p.archived);
  const preset = (type, id) => (presets?.[type] || []).find(p => p.id === id);
  const presetOptions = type => active(type).map(p => ({id: p.id, label: p.data.name || p.data.title || p.id}));
  // the scene's picture slots, and picture beats added in the editor that have none yet (model.js newStep)
  const slots = () => {
    const scene = getScene(), added = [];
    const walk = xs => (xs || []).forEach(st => { if (st?.newPicture && st.imageSlot) added.push({id: st.imageSlot, label: 'New picture', available: false}); if (st && typeof st === 'object') for (const k of ['then', 'else', 'sequence']) walk(st[k]); });
    walk(scene?.steps);
    return [...(scene?.images || []), ...added];
  };
  function compose() {
    const scene = getScene();
    if (!scene) return null;
    scene.metadata ||= {};
    if (activeScene !== scene.id) {
      activeScene = scene.id;
      activeSlot = slots()[0]?.id || '';
      fold();
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
      applyDefaults(c, presets);
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
    const peek = $('.settings-peek'); if (peek) peek.textContent = settingsPeek(compose());
    if ($('#imageRatingNote')) $('#imageRatingNote').textContent = body.rating === compose()?.rating ? '' : 'The selected character preset limits this image to ' + body.rating + '.';
  }
  function outfitPicker(c, p) {
    const pick = c.outfit[p.id];
    const value = pick === true ? 'usual' : typeof pick === 'string' ? pick : '';
    const items = [...(p.data.outfit ? [{id: 'usual', label: 'Usual: ' + p.data.outfit}] : []),
      ...active('outfit').filter(o => !o.data.character || o.data.character === p.id).map(o => ({id: o.id, label: o.data.name}))];
    return `<div class="image-outfit"><label>${esc(p.data.name)}’s outfit<span class="block-pick"><select data-outfit-for="${esc(p.id)}"><option value="">No outfit words</option>${options(items, value)}<option value="${NEW}">+ New outfit…</option></select><button type="button" class="small ghost" data-edit-person="${esc(p.id)}" title="Edit ${esc(p.data.name)}’s look">Edit ${esc(p.data.name)}</button></span></label></div>`;
  }
  // Open the block editor; afterwards the blocks reload and `apply` puts the new or edited block in this picture.
  function openBlock(kind, {id = null, from, prefill, apply} = {}) {
    return openBlockEditor({kind, id, from, prefill, presets, privateMode, files: modelFiles, portraitUrl,
      onDone: guarded(async newId => {
        presets = await api('image/api/presets');
        if (apply) edit(c => apply(c, newId)); else render();
        notice(id ? 'Saved. Every scene uses the new version.' : 'Added. It is in every scene’s pickers now.');
      })}).catch(e => notice(e.message, true));
  }
  // The size a shot renders at: the picture shape's preset, or the shot's own width and height when they differ
  // from it (a picture made at a size no preset has). Sizes are presets, as in the image gen dashboard's Framing.
  function sizeOf(c) {
    const fr = preset('framing', c.framing);
    const w = +c.width || fr?.data.w || 1152, h = +c.height || fr?.data.h || 896;
    const own = !fr || w !== +fr.data.w || h !== +fr.data.h;
    return {w, h, own, label: (own ? '' : fr.data.name + ' ') + w + '×' + h};
  }
  // People: once the shot has its cast, only the people in it show, each with their outfit; "Add or change people"
  // opens every character (Jørgen, 2026-10-11: "the people section takes up too much room, when you have already
  // decided on the character. maybe collapsable while showing only the currently included characters").
  function peopleHtml(c, cast) {
    const generic = c.man && active('character').find(p => p.data.generic);
    const any = cast.length || generic;
    const face = p => portraitUrl(p.data.portrait) ? `<img loading="lazy" src="${esc(portraitUrl(p.data.portrait))}" alt="">` : `<span class="image-person-placeholder">${esc((p.data.name || p.id).slice(0, 1))}</span>`;
    const groupChip = cast.length + (c.man ? 1 : 0) > 1 ? chip('Short descriptions for a group', c.useShort, 'data-toggle="useShort"') : '';
    const head = `<div class="section-head"><h3>People in the picture</h3>${any ? `<button type="button" data-people-open aria-expanded="${peopleOpen}">${peopleOpen ? 'Done' : 'Add or change people'}</button>` : ''}</div>`;
    if (any && !peopleOpen) return `<section class="image-section image-people">${head}<div class="image-included">
      ${cast.map(p => `<div class="image-person-row" data-person="${esc(p.id)}">${face(p)}${outfitPicker(c, p)}</div>`).join('')}
      ${generic ? `<div class="image-person-row" data-person="${esc(generic.id)}">${face(generic)}<span>Unnamed person</span></div>` : ''}</div>
      ${groupChip ? `<div class="chips">${groupChip}</div>` : ''}</section>`;
    return `<section class="image-section image-people">${head}<div class="image-cast">${active('character').filter(p => !p.data.generic).map(p => `<button type="button" data-char="${esc(p.id)}" aria-pressed="${c.characters.includes(p.id)}" title="${esc(p.data.name || p.id)}">${face(p)}<span>${esc(p.data.name || p.id)}</span></button>`).join('') || '<p class="hint">Your image-generation character presets appear here when connected.</p>'}</div>
      <div class="chips">${active('character').some(p => p.data.generic) ? chip('Include an unnamed person', c.man, 'data-toggle="man"') : ''}${groupChip}<button type="button" data-new-block="character">+ New person</button></div>
      ${cast.length ? `<div class="image-outfits">${cast.map(p => outfitPicker(c, p)).join('')}</div>` : ''}</section>`;
  }
  // Generation settings: folded by default with a one-line summary, like the original prompt (Jørgen, 2026-10-11:
  // "the model parameters should also be collapsed, and on the left side"). Seed is Auto or Fixed and size is a
  // preset, as in the image gen dashboard ("seed should have an auto option, learn from the imagegen view").
  function settingsPeek(c) {
    const md = preset('model', c.model)?.data || {}, n = +c.count || 1;
    return [md.name || 'No model', n + (n > 1 ? ' pictures' : ' picture'), c.seedMode === 'fixed' ? 'seed ' + (c.seed || '?') : 'seed auto',
      (+c.steps || md.steps || 30) + ' steps', 'CFG ' + (+c.cfg || md.cfg || 5), sizeOf(c).label].join(' · ');
  }
  function settingsHtml(c) {
    const md = preset('model', c.model)?.data || {}, size = sizeOf(c);
    const fixed = c.seedMode === 'fixed';
    const sizes = active('framing').map(f => chip(f.data.name + ' ' + f.data.w + '×' + f.data.h, f.id === c.framing && !size.own, `data-size="${esc(f.id)}" title="${esc(f.data.prompt || f.data.notes || '')}"`)).join('');
    return `<details class="image-section image-settings" data-settings-open ${settingsOpen ? 'open' : ''}><summary><span class="settings-title">Generation settings</span><span class="hint settings-peek">${esc(settingsPeek(c))}</span></summary>
      <div class="settings-grid">${pickerHtml('model', 'model', 'Model', presetOptions('model'), c.model, null)}${number('count', 'Pictures', c.count, 1, 8)}${number('steps', 'Steps', c.steps, 1, 100, 1, md.steps || 30)}${number('cfg', 'Prompt strength', c.cfg, 0.1, 30, 0.1, md.cfg || 5)}</div>
      <div class="settings-seed"><span class="settings-label">Seed</span><span class="seed-mode">${chip('Auto', !fixed, 'data-seed-mode="random" title="A new random seed for every picture"')}${chip('Fixed', fixed, 'data-seed-mode="fixed" title="Repeat one seed"')}</span>
        <input data-compose="seed" type="number" min="0" max="9007199254740991" step="1" value="${esc(c.seed ?? '')}" placeholder="${fixed ? 'Seed' : 'Random'}" aria-label="Seed" ${fixed ? '' : 'disabled'}></div>
      <div class="chips sizes"><span class="settings-label">Size</span>${sizes}${size.own ? chip('This shot’s size ' + size.w + '×' + size.h, true, 'data-size-own') : ''}${chip('Custom size', customSize, 'data-size-custom')}<button type="button" data-new-block="framing">+ New</button><button type="button" data-edit-block="framing" data-edit-field="framing">Edit…</button></div>
      ${customSize || size.own ? `<div class="two">${number('width', 'Width', c.width, 256, 2048, 64, size.w)}${number('height', 'Height', c.height, 256, 2048, 64, size.h)}</div>` : ''}</details>`;
  }
  function render() {
    const host = $('#composition');
    if (!host) return;
    const c = compose();
    if (!c) { host.innerHTML = '<p class="hint">Choose a scene first.</p>'; return; }
    const slot = slots().find(s => s.id === activeSlot);
    const picked = selectedImage(activeSlot);
    if (presets && !c.sourceChecked && !c.edited && (picked || slot?.available)) loadSource(activeSlot);
    const cast = c.characters.map(id => preset('character', id)).filter(Boolean);
    const oneCharacter = cast.length === 1 && !c.man;
    const refPath = c.reference || (oneCharacter ? cast[0].data.portrait : '');
    const imageTitle = slot ? 'Shot ' + (slots().indexOf(slot) + 1) : 'Scene image';
    const previewUrl = picked?.url || (slot?.available === false ? '' : slot?.url);
    const go = `<div class="image-go"><button id="generate" class="primary" ${presets ? '' : 'disabled'} title="Uses your existing image-generation queue. Choose a result from the Picture library to add it to this shot.">Generate ${+c.count > 1 ? c.count + ' pictures' : 'a picture'}</button></div>`;
    const current = `<div class="image-current"><p class="hint image-scene-name">${esc(getScene().metadata.title||getScene().title)}</p>${previewUrl ? `<a href="${esc(previewUrl)}" target="_blank" rel="noopener"><img class="selected-image" src="${esc(previewUrl)}" alt="${esc(imageTitle)}"></a>` : `<div class="image-empty">${slot?.label === 'New picture' ? 'A new picture beat. Direct the shot and generate it, or choose a picture from the library.' : slot ? 'This shot’s picture is unavailable. Generate a replacement or choose one from the picture library.' : 'Choose a shot in the storyboard to replace its image.'}</div>`}
        <div class="image-current-row">${go}${slots().length > 1 ? field('imageSlot', 'Image in this scene', slots().map((s, i) => ({id: s.id, label: 'Shot ' + (i + 1)})), activeSlot, null) : `<strong>${esc(imageTitle)}</strong>`}
        ${slot?.storage === 'archive' && !picked ? '<p class="hint">Showing the earlier picture from the archive.</p>' : ''}
        ${picked&&!picked.applied ? '<p class="hint" title="Replacement selected. Save the scene to use it in the story.">Replacement selected. Save the scene to use it in the story.</p><button data-clear-image>Keep the current story image</button>' : ''}</div>
      </div>`;
    const blockValue = (kind, value) => blockId(presets, kind, value) || value || '';
    const blockItems = (kind, value) => { const items = presetOptions(kind); return value && !items.some(i => i.id === value) ? [...items, {id: value, label: value + ' (words only)'}] : items; };
    const direction = `<section class="image-section image-direction"><h3>Direct the shot</h3>
      <div class="three">${DIRECTION_KINDS.map(([name, kind, title]) => pickerHtml(name, kind, title, blockItems(kind, blockValue(kind, c[name])), blockValue(kind, c[name]))).join('')}</div>${c.angle ? `<p class="hint">Older camera angle kept: ${esc(c.angle)} <button type="button" class="link" data-clear-angle>Remove</button></p>` : ''}
      <div class="two">${pickerHtml('style', 'style', 'Art style', presetOptions('style'), c.style, null)}${field('rating', 'Content level', [{id: 'safe', label: 'General'}, {id: 'sensitive', label: 'Mature'}, {id: 'nsfw', label: 'Adult'}], c.rating, null)}</div><p id="imageRatingNote" class="hint"></p></section>`;
    const happens = `<section class="image-section image-what"><div class="section-head"><h3>What happens</h3>${pickerHtml('scenePreset', 'scene', 'Saved scene direction', presetOptions('scene'), c.sceneRefs?.[0] || '', 'Choose a saved direction…')}</div>
      <label>What happens in this picture?<textarea data-compose="scene" rows="3" placeholder="Choose a saved direction above, or describe the action in your own words.">${esc(c.scene)}</textarea></label>
      <label>More details for the prompt<textarea data-compose="extra" rows="2" placeholder="Specifics the blocks don't cover: props, clothes, a mood.">${esc(c.extra || '')}</textarea></label>
      <h4>Camera and composition</h4><div class="chips">${active('camera').map(p => chip(p.data.name, c.cameras.includes(p.id), `data-camera="${esc(p.id)}" title="${esc(p.data.prompt)}"`)).join('')}<button type="button" data-new-block="camera">+ New</button><button type="button" data-edit-block="camera" data-edit-list="cameras">Edit…</button></div></section>`;
    const consistency = `<section class="image-section"><h3>Keep the character consistent</h3><div class="image-consistency">
      ${oneCharacter ? `<div class="image-reference">${portraitUrl(refPath) ? `<img src="${esc(portraitUrl(refPath))}" alt="Character reference">` : ''}<div><strong>${esc(c.reference ? 'Selected reference' : cast[0].data.name + '’s portrait')}</strong><button data-pick-reference>Choose a reference picture</button>${c.reference ? '<button data-reset-reference>Use character portrait</button>' : ''}</div></div>` : '<p class="hint">Choose one character to use a portrait reference or face correction.</p>'}
      <div class="image-strengths">${check('referenceOn', 'Use the reference', c.referenceOn, !oneCharacter || !refPath)}${number('referenceStrength', 'Strength', c.referenceStrength, 0, 2, 0.05)}
      ${check('faceFix', 'Correct the face after', c.faceFix, !oneCharacter || !refPath)}${number('faceStrength', 'Strength', c.faceStrength, 0.1, 1, 0.05)}
      ${check('referenceCutout', 'Remove the portrait background', c.referenceCutout, !oneCharacter)}</div></div><div id="imageReferenceChoices"></div></section>`;
    const exclude = `<section class="image-section image-exclude"><h3>Exclude from the picture</h3><div class="chips">${active('negative').map(p => chip(p.data.name, c.negatives?.includes(p.id), `data-negative="${esc(p.id)}" title="${esc(p.data.text)}"`)).join('')}<button type="button" data-new-block="negative">+ New</button><button type="button" data-edit-block="negative" data-edit-list="negatives">Edit…</button></div>
      <div class="two"><label>Anything else to avoid?<textarea data-compose="negative" rows="1">${esc(c.negative || '')}</textarea></label>
      <label>Notes for steps outside the prompt<textarea data-compose="details" rows="1" placeholder="Inpaint, colour fix, LoRA weights. Kept with the picture, not sent to the model.">${esc(c.details || '')}</textarea></label></div>
      ${c.rating !== 'safe' ? check('hard', 'Hard scene: leave out the standing soft-scene exclusions', c.hard) : '<p class="hint">Mature and Adult pictures always exclude visible nipples, visible genitals and an uncovered crotch, unless marked as a hard scene.</p>'}</section>`;
    const o = c.original;
    const smallChanges = o?.start ? '<button data-small-changes title="Start from this shot’s picture with the same seed and change it a little (img2img, low strength).">Small changes to this picture</button>' : '';
    const original = o && o.positive == null ? `<section class="image-section image-original"><div class="section-head"><h3>Original prompt</h3>${smallChanges}</div><p class="hint">There is no record of how this picture was made. Describe it below, or start from it.</p></section>`
      : o ? `<section class="image-section image-original"><div class="section-head"><h3>Original prompt</h3><span class="hint original-facts">${esc(['Seed ' + (o.seed ?? '?'), o.w && o.h ? o.w + '×' + o.h : '', o.steps ? o.steps + ' steps' : '', o.cfg ? 'CFG ' + o.cfg : ''].filter(Boolean).join(' · '))}</span>${smallChanges}</div>
      <details data-original-open ${c.originalOpen ? 'open' : ''}><summary><span class="original-peek" title="Show the whole original prompt">${esc(c.override?.positive ?? o.positive ?? '')}</span><span class="original-less">Hide the original prompt</span></summary>
      <p class="hint">${esc(['Seed ' + (o.seed ?? '?'), o.model_file, o.w && o.h ? o.w + '×' + o.h : '', o.steps ? o.steps + ' steps' : '', o.cfg ? 'CFG ' + o.cfg : '', o.sampler].filter(Boolean).join(' · '))}. From ${esc(o.how || 'the picture')}.</p>
      <label>Prompt<textarea data-original="positive" rows="3">${esc(c.override?.positive ?? o.positive ?? '')}</textarea></label>
      <label>Negative<textarea data-original="negative" rows="2">${esc(c.override?.negative ?? o.negative ?? '')}</textarea></label>
      ${c.override ? '<p class="hint">Generate uses this prompt as it stands. Changing a block builds a new prompt instead.</p>' : '<button data-use-original>Use the original prompt</button>'}</details></section>` : '';
    const currentPicture = picked?.file ? 'island/private/imagegen/outputs/' + picked.file : slot?.available !== false && slot?.url && !slot.url.startsWith('data:') ? slot.url.replace(/^\//, '') : '';
    const tools = toolsHtml(c, {loras: loraFiles, controls: controlFiles, current: currentPicture});
    const prompt = `<section class="image-section image-prompt"><div class="section-head"><h3>Generated prompt</h3>${c.override ? '<button data-reset-prompt>Build the prompt from these controls</button>' : ''}${c.source ? '<button data-fill-prompt title="Guesses the character, camera, shape, style and model blocks from the old prompt and puts the rest in the free text. Nothing is saved until you generate.">Fill from prompt</button>' : ''}</div>${c.override ? '<p class="hint">This picture uses a prompt copied from history.</p>' : ''}<p id="assembled" class="hint prompt-box"></p></section>`;
    // The full-screen composer (index.html) has three columns: who is in the shot, its direction and the generation
    // settings on the left; the prompt in the middle; the picture, Generate and the library on the right (Jørgen,
    // 2026-10-11: "The current image could go on the rightmost column, so we have more room for the prompt in the
    // middle"). Without them (a narrow panel) it all runs down one column.
    const stage = $('#composePreview'), shot = $('#composeShot');
    if (stage && shot) {
      host.innerHTML = peopleHtml(c, cast) + direction + consistency + settingsHtml(c) + tools;
      stage.innerHTML = original + happens + prompt + exclude;
      shot.innerHTML = current;
      if ($('#composeFor')) $('#composeFor').textContent = getScene().metadata.title || getScene().title || '';
    } else host.innerHTML = current + original + peopleHtml(c, cast) + direction + happens + consistency + settingsHtml(c) + tools + exclude + prompt;
    bindComposition();
    updatePrompt();
    renderReferenceChoices();
    renderJobs();
  }
  function edit(mutator, repaint = true) {
    const c = compose(); if (!c) return;
    mutator(c); c.edited = true; changed();
    if (repaint) render(); else updatePrompt();
  }
  function toggleList(c, key, id) { c[key] = c[key].includes(id) ? c[key].filter(x => x !== id) : [...c[key], id]; }
  function bindComposition() {
    const host = $('#composePreview') ? $('#composition').parentElement : $('#composition');
    host.querySelectorAll('[data-compose]').forEach(el => {
      el.oninput = () => {
        const name = el.dataset.compose;
        if (name === 'imageSlot') { activeSlot = el.value; fold(); render(); return; }
        if (el.value === NEW) {
          const kind = el.dataset.kind, current = c => name === 'scenePreset' ? c.sceneRefs?.[0] : c[name];
          el.value = '';
          render();
          const from = blockId(presets, kind, current(compose()));
          if (name === 'scenePreset') openBlock('scene', {from: '', prefill: {text: compose().scene, rating: compose().rating}, apply: (c, id) => { c.sceneRefs = [id]; }});
          else openBlock(kind, {from: from || undefined, apply: (c, id) => { c[name] = id; if (name !== 'model') c.override = null; }});
          return;
        }
        if (name === 'scenePreset') {
          const p = preset('scene', el.value); if (!p) return;
          edit(c => { c.scene = p.data.text || ''; c.sceneRefs = [p.id]; if (p.data.rating) c.rating = p.data.rating; c.override = null; }); return;
        }
        // the generation settings change how the picture is made, not its words: a prompt copied from a picture
        // stays (Small changes keeps its prompt when the seed or size changes)
        edit(c => {
          c[name] = el.type === 'checkbox' ? el.checked : el.value;
          if (!SETTINGS.includes(name)) c.override = null;
        }, ['model', 'count', 'referenceOn', 'faceFix', 'rating'].includes(name));
      };
    });
    // picking people keeps the full picker open until Done
    host.querySelectorAll('[data-char]').forEach(b => b.onclick = () => edit(c => { peopleOpen = true; toggleList(c, 'characters', b.dataset.char); c.reference = ''; c.override = null; }));
    host.querySelectorAll('[data-camera]').forEach(b => b.onclick = () => edit(c => { toggleList(c, 'cameras', b.dataset.camera); c.override = null; }));
    host.querySelectorAll('[data-negative]').forEach(b => b.onclick = () => edit(c => { toggleList(c, 'negatives', b.dataset.negative); c.override = null; }));
    host.querySelectorAll('[data-toggle]').forEach(b => b.onclick = () => edit(c => { if (b.dataset.toggle === 'man') peopleOpen = true; c[b.dataset.toggle] = !c[b.dataset.toggle]; c.override = null; }));
    host.querySelectorAll('[data-outfit-for]').forEach(el => el.onchange = () => {
      const who = el.dataset.outfitFor;
      if (el.value === NEW) {
        const pick = compose().outfit[who];
        const person = preset('character', who);
        render();
        openBlock('outfit', {from: typeof pick === 'string' ? pick : '', prefill: {character: who, text: typeof pick === 'string' ? '' : person?.data.outfit || ''},
          apply: (c, id) => { c.outfit[who] = id; c.override = null; }});
        return;
      }
      edit(c => { c.outfit[who] = el.value === 'usual' ? true : el.value || false; c.override = null; });
    });
    host.querySelectorAll('[data-edit-person]').forEach(b => b.onclick = () => openBlock('character', {id: b.dataset.editPerson}));
    host.querySelectorAll('[data-new-block]').forEach(b => b.onclick = () => {
      const kind = b.dataset.newBlock;
      const add = {character: (c, id) => { c.characters = [...c.characters, id]; c.override = null; }, camera: (c, id) => { c.cameras = [...c.cameras, id]; c.override = null; },
        negative: (c, id) => { c.negatives = [...(c.negatives || []), id]; c.override = null; }, framing: (c, id) => { c.framing = id; delete c.width; delete c.height; }}[kind];
      const c = compose();
      const from = {character: c.characters[0], camera: c.cameras.at(-1), negative: (c.negatives || []).at(-1), framing: c.framing}[kind];
      openBlock(kind, {from: from || undefined, apply: add});
    });
    host.querySelectorAll('[data-edit-block]').forEach(b => b.onclick = () => {
      const kind = b.dataset.editBlock, c = compose();
      const value = b.dataset.editList ? (c[b.dataset.editList] || [])[0] : b.dataset.editField === 'scenePreset' ? c.sceneRefs?.[0] : blockId(presets, kind, c[b.dataset.editField]);
      const id = value || active(kind)[0]?.id;
      if (!id) return openBlock(kind, {});
      openBlock(kind, {id});
    });
    host.querySelectorAll('[data-people-open]').forEach(b => b.onclick = () => { peopleOpen = !peopleOpen; render(); });
    const sd = host.querySelector('[data-settings-open]');
    if (sd) sd.ontoggle = () => { settingsOpen = sd.open; };
    // Seed Auto or Fixed, as in the dashboard: Fixed with no seed yet picks one to repeat
    host.querySelectorAll('[data-seed-mode]').forEach(b => b.onclick = () => edit(c => {
      c.seedMode = b.dataset.seedMode;
      if (c.seedMode === 'fixed' && !c.seed) c.seed = Math.floor(Math.random() * 2 ** 31);
    }));
    host.querySelectorAll('[data-size]').forEach(b => b.onclick = () => { customSize = false; edit(c => { c.framing = b.dataset.size; delete c.width; delete c.height; }); });
    host.querySelectorAll('[data-size-custom]').forEach(b => b.onclick = () => {
      customSize = !customSize;
      if (customSize) render(); else edit(c => { delete c.width; delete c.height; });
    });
    host.querySelectorAll('[data-clear-angle]').forEach(b => b.onclick = () => edit(c => { c.angle = ''; }));
    const bind = (selector, fn) => { const el = $(selector, host); if (el) el.onclick = fn; };
    bind('[data-clear-image]', () => { const s = getScene(); if (s.metadata.images) delete s.metadata.images[activeSlot]; if (s.metadata.image?.slot === activeSlot) delete s.metadata.image; changed(); render(); announceImage(); });
    bind('[data-reset-reference]', () => edit(c => { c.reference = ''; }));
    bind('[data-pick-reference]', guarded(loadReferences));
    bind('[data-fill-prompt]', () => edit(c => {
      const {composition, found} = guessComposition(c.source, presets || {});
      const keep = {imageSlot: c.imageSlot, source: c.source, subplotId: c.subplotId};
      for (const k of Object.keys(c)) delete c[k];
      Object.assign(c, composition, keep, {override: null, castInitialized: true});
      applyDefaults(c, presets || {});
      notice('Guessed ' + (found.join(', ') || 'nothing') + ' from the prompt; the rest is in the free text.');
    }));
    bind('[data-reset-prompt]', () => edit(c => { c.override = null; }));
    host.querySelectorAll('[data-original]').forEach(el => el.oninput = () => edit(c => {
      c.override = {positive: $('[data-original="positive"]', host).value, negative: $('[data-original="negative"]', host).value};
    }, false));
    const od = host.querySelector('[data-original-open]');
    if (od) od.ontoggle = () => edit(c => { c.originalOpen = od.open; }, false);
    bind('[data-use-original]', () => edit(c => { c.override = {positive: c.original.positive, negative: c.original.negative || ''}; }));
    bind('[data-small-changes]', () => edit(c => {
      const o = c.original;
      Object.assign(c, {start: {image: o.start, denoise: 0.35}, seedMode: 'fixed', seed: o.seed ?? c.seed, count: 1, width: o.w || c.width, height: o.h || c.height});
      if (!o.blocks) c.override ||= {positive: o.positive, negative: o.negative || ''};
      notice('Starts from this picture with the same seed. Change the prompt a little, then Generate.');
    }));
    const slot = slots().find(x => x.id === activeSlot), picked = selectedImage(activeSlot);
    const current = picked?.file ? 'island/private/imagegen/outputs/' + picked.file : slot?.available !== false && slot?.url && !slot.url.startsWith('data:') ? slot.url.replace(/^\//, '') : '';
    const cc = compose();
    bindTools(host, {edit, compose, current, size: {w: +cc.width || preset('framing', cc.framing)?.data.w, h: +cc.height || preset('framing', cc.framing)?.data.h}});
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
        [presets, {private: privateMode}, modelFiles, loraFiles, controlFiles] = await Promise.all([api('image/api/presets'), api('image/api/mode').catch(() => ({private: false})),
          api('image/api/models/files').catch(() => []), api('image/api/loras').catch(() => []), api('image/api/controls').catch(() => [])]);
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
    const q = new URLSearchParams({limit: '100', who: historyWho});
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
  async function loadScenePictures() {
    const id = getScene()?.id; if (!id) return;
    sceneRunsFor = id; sceneRuns = null;
    try { const d = await api('pictures?id=' + encodeURIComponent(id)); if (sceneRunsFor === id) sceneRuns = d.runs || []; }
    catch (e) { if (sceneRunsFor === id) sceneRuns = []; notice(e.message, true); }
    renderJobs();
  }
  const library = createLibrary({api, notice, changed: () => renderJobs(), use: j => useImage(j), reuse: j => reuseImage(j),
    generate: body => api('image/api/generate', body).then(refresh), styleName: id => preset('style', id)?.data.name, count: () => +compose()?.count || 1,
    rated: (t, fields) => edits.set(t.id, {...edits.get(t.id), ...fields}), restored: t => { edits.set(t.id, {...edits.get(t.id), deleted: false}); sceneRunsFor = ''; loadHistory(); }});
  function renderJobs() {
    const host = $('#renders'); if (!host) return;
    if (!getScene()) { host.replaceChildren(); return; }
    const sceneScope = historyScope === 'scene';
    if (sceneScope && sceneRunsFor !== getScene().id) { loadScenePictures(); }
    const ownRuns = new Set((sceneRuns || []).map(r => r.run_id));
    const all = new Map((sceneScope ? sceneRuns || [] : runs).flatMap(run => (run.renders || []).map(j => [j.id, {...run, ...j, status: 'done'}])));
    for (const job of jobs) if (!sceneScope || all.has(job.id) || job.compose?.subplotId === getScene().id || ownRuns.has(job.run_id)) all.set(job.id, {...all.get(job.id), ...job});
    for (const [id, f] of edits) if (all.has(id)) Object.assign(all.get(id), f);
    const madeBy = j => historyWho === 'all' || (j.source === 'agent') === (historyWho === 'agents');
    selected = [...all.values()].filter(j => !j.deleted && madeBy(j)
      && (!historyCharacter || j.characters?.includes(historyCharacter)) && (!historyStar || j.star || j.fav))
      .sort((a, b) => (b.at || '9999').localeCompare(a.at || '9999'));
    const empty = `<p class="hint">${sceneScope && !sceneRuns ? 'Finding this scene’s pictures…' : historyScope === 'scene' ? 'No pictures for this scene yet, from the editor or from its picture rounds. Browse all generated pictures to use an existing one.' : 'No pictures match these filters.'}</p>`;
    host.innerHTML = `<section class="image-section image-library"><div class="pane-title"><h3>Picture library</h3><button data-trash aria-pressed="${showTrash}">Trash</button><button data-refresh-images>Refresh</button></div><p class="hint library-hint">Click a picture to look closer (arrows, s, f, x, Delete). “Use for this shot” puts one in the scene.</p>
      ${showTrash ? library.trashHtml() : `<div class="segmented"><button data-library="scene" aria-pressed="${historyScope === 'scene'}">This scene</button><button data-library="all" aria-pressed="${historyScope === 'all'}">All generated pictures</button></div>
      <div class="lib-filters"><label>Character<select id="imageHistoryCharacter"><option value="">Anyone</option>${options(presetOptions('character'), historyCharacter)}</select></label><label>Made by<select id="imageHistoryWho">${options([{id: 'all', label: 'Anyone'}, {id: 'mine', label: 'Jørgen'}, {id: 'agents', label: 'Agents'}], historyWho)}</select></label><label class="image-check"><input id="imageHistoryStar" type="checkbox" ${historyStar ? 'checked' : ''}>Starred</label></div>
      ${library.trayHtml()}
      ${selected.length ? '<div class="render-grid">' + selected.map((j, i) => library.cardHtml(j, i)).join('') + '</div>' : empty}
      ${!historyEnd && !sceneScope ? `<button data-more-images ${historyBusy ? 'disabled' : ''}>${historyBusy ? 'Loading…' : 'Load older pictures'}</button>` : ''}`}</section>`;
    $('[data-trash]', host).onclick = guarded(async () => { showTrash = !showTrash; renderJobs(); if (showTrash) await library.loadTrash(); });
    $('[data-refresh-images]', host).onclick = guarded(async () => { sceneRunsFor = ''; await Promise.all([loadHistory(), refresh()]); if (showTrash) await library.loadTrash(); });
    if (showTrash) { library.bindTrash(host); return; }
    host.querySelectorAll('[data-library]').forEach(b => b.onclick = () => { historyScope = b.dataset.library; renderJobs(); });
    $('#imageHistoryCharacter').onchange = guarded(async e => { historyCharacter = e.target.value; await loadHistory(); });
    $('#imageHistoryWho').onchange = guarded(async e => { historyWho = e.target.value; await loadHistory(); });
    $('#imageHistoryStar').onchange = guarded(async e => { historyStar = e.target.checked; await loadHistory(); });
    const more = $('[data-more-images]', host); if (more) more.onclick = guarded(() => loadHistory(true));
    library.bind(host, selected);
    library.bindTray(host);
  }
  function useImage(j) {
    const s = getScene(); if (!s || !activeSlot) return;
    s.metadata.images ||= {};
    s.metadata.images[activeSlot] = {slot: activeSlot, id: j.id, url: asset('out', j.file), file: j.file, seed: j.seed, positive: j.positive};
    changed(); render(); announceImage(); notice('Picture selected for this shot. Save the scene to use it in the story.');
  }
  function announceImage() { globalThis.dispatchEvent(new CustomEvent('subplot-image-changed', {detail: {slotId: activeSlot}})); }
  // A shot's picture opens with what made it (Jørgen, 2026-10-11: "when opening to re-gen a picture for a scene, we
  // need the fields filled out, and if the "format" is not fully compatible, we need at least the prompt to be filled"):
  // the editor's server finds the render (api.py picture_source), its blocks fill the composer, and the original
  // prompt and settings are always kept beside them.
  const sourcesLoading = new Map();
  function loadSource(slotId) {
    const scene = getScene(); const key = scene.id + '|' + slotId;
    if (!sourcesLoading.has(key)) sourcesLoading.set(key, fetchSource(scene, slotId).finally(() => sourcesLoading.delete(key)));
    return sourcesLoading.get(key);
  }
  async function fetchSource(scene, slotId) {
    try {
      const r = await api('picture-source?' + new URLSearchParams({id: scene.id, slot: slotId}));
      const c = scene.metadata.compositions?.[slotId || 'scene'];
      if (getScene() !== scene || !c || c.sourceChecked || c.edited) return;
      if (r.job) fillFromJob(r.job, {how: r.how, start: r.start?.image || '', slot: slotId, quiet: true});
      else { c.sourceChecked = true; if (r.start?.image) c.original = {how: 'no record of how it was made', start: r.start.image}; render(); }
    } catch (e) { notice(e.message, true); }
  }
  const hasBlocks = compose => !!compose && ['characters', 'chars', 'cameras', 'cams'].some(k => compose[k]?.length) || !!compose?.scene;
  // One way to open a picture's settings, for "Reuse settings" and for a shot's own picture: its blocks when it has
  // them, else Fill from prompt; the original prompt and settings ride along either way.
  function fillFromJob(j, {how = '', start = '', slot = activeSlot, quiet = false} = {}) {
    const s = getScene(); if (!s) return;
    const current = compose() || normalizeComposition();
    const blocks = hasBlocks(j.compose);
    let c;
    if (blocks) {
      c = normalizeComposition(j.compose);
      for (const type of ['model', 'style', 'framing']) c[type] = j.presets?.[type]?.id || c[type] || current[type];
      if (!c.characters.length) c.characters = (j.characters || []).filter(id => preset('character', id));
    } else c = guessComposition(j, presets || {}).composition;
    c.model = active('model').find(p => p.data.file === j.model_file)?.id || c.model || current.model;
    Object.assign(c, {imageSlot: slot, seedMode: 'fixed', seed: j.seed, count: 1, width: j.w, height: j.h,
      steps: j.steps || c.steps, cfg: j.cfg || c.cfg, sampler: j.sampler || undefined, scheduler: j.scheduler || undefined,
      castInitialized: true, sourceChecked: true, edited: false,
      original: {positive: j.positive || '', negative: j.negative || '', seed: j.seed, model_file: j.model_file, w: j.w, h: j.h,
        steps: j.steps, cfg: j.cfg, sampler: j.sampler, how: how || (j.n ? 'picture #' + j.n : 'the picture'), start: start || (j.file ? 'island/private/imagegen/outputs/' + j.file : ''), blocks},
      override: blocks ? null : {positive: j.positive || '', negative: j.negative || ''}});
    if (j.ipa) Object.assign(c, {reference: j.ipa.ref, referenceOn: true, referenceStrength: j.ipa.strength, referenceCutout: j.ipa.cutout});
    if (j.repaint) Object.assign(c, {reference: j.repaint.ref, faceFix: true, faceStrength: j.repaint.denoise});
    if (j.start?.image) c.start = {image: j.start.image, denoise: j.start.denoise, ...(j.start.mask ? {mask: j.start.mask} : {})};
    if (j.loras?.length) c.loras = j.loras.map(l => ({...l}));
    if (j.control) c.control = {...j.control};
    if (j.huefix?.length) c.huefix = j.huefix.map(h => ({...h}));
    if (c.start || c.loras || c.control || c.huefix) c.toolsOpen = true;
    applyDefaults(c, presets || {});
    s.metadata.compositions[slot || 'scene'] = c;
    if (!quiet) changed();
    render();
  }
  function reuseImage(j) {
    fillFromJob(j);
    notice('Picture settings loaded. Change the direction or generate another version.');
  }
  // The shot's own settings as a queue job, for New version and Repaint a part on the beat (versions.js): the
  // composition the composer keeps for the shot, filled from the picture's source the first time. null when nothing
  // says how the picture was made, unless `anyway` (a repaint keeps most of the picture, so the cast's blocks will do).
  async function shotJob(slotId, {anyway = false} = {}) {
    if (!presets) await connect();
    compose();
    activeSlot = slotId;
    let c = compose();
    if (!c.sourceChecked && !c.edited) { await loadSource(slotId); c = compose(); }
    if (!anyway && !c.edited && !c.original?.positive) return null;
    return assemble();
  }
  function focus(slotId) {
    compose();
    if (slotId) activeSlot = slotId;
    fold();
    $('[data-inspect="images"]')?.click();
    render();
    if (!presets) guarded(connect)();
    if (globalThis.innerWidth < 1000) ($('#inspector') || $('#images'))?.scrollIntoView({behavior: 'smooth', block: 'start'});
  }
  if ($('#loadPresets')) $('#loadPresets').onclick = guarded(connect);
  $('[data-inspect="images"]')?.addEventListener('click', () => { if (!presets) guarded(connect)(); });
  globalThis.addEventListener('pagehide', () => { if (poll) clearInterval(poll); });
  return {render, focus, connect, shotJob};
}
