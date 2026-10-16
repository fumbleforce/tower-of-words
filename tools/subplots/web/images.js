const {setInterval, clearInterval, document, URLSearchParams, CustomEvent} = globalThis;
import {$, esc, api, guarded, notice} from './common.js';
import {localBlockHtml, bindBlockWords} from './image-block-words.js';
import {newestPictureFirst} from './image-order.js';
import {clearPendingPicture, picturePick, picturePath} from './picture-selection.js';
import {draftPictureUrl, madeByAgent} from '../../imagegen/web/gallery.js';
import {isExternal, externalReplayNotice, provenanceHtml, originalGeneration, externalSourceExplanationHtml, localOriginalPromptHtml} from '../../imagegen/web/provenance.js';
import {standaloneComposition, standaloneJob, standalonePromptHtml} from './image-standalone.js';
import {personWords} from './image-people.js';
import {guessComposition} from './image-guess.js';
import {applyDefaults, normalizeComposition, assembleComposition, softExclusion, promptParts, portraitUrl} from './image-compose.js';
import {blockId} from '../../imagegen/web/blocks.js';
import {openBlockEditor} from './block-editor.js';
import {createLibrary} from './library.js';
import {toolsHtml, bindTools} from './image-tools.js';
import {directHtml, placeHtml, bindDirect} from './image-direct.js';
import {loadExamples, exampleJob, exampleOf, placeJob, placeOf, placeKey, loadPlace, noteDone} from './block-examples.js';

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
const pickerHtml = (name, kind, title, items, value, empty = 'No preference') => `<label>${esc(title)}<span class="block-pick"><select data-compose="${name}" data-kind="${kind}">${empty === null ? '' : `<option value="">${esc(empty)}</option>`}${options(items, value)}<option value="${NEW}">+ New…</option></select><button type="button" class="small ghost" data-edit-block="${kind}" data-edit-field="${name}" title="Edit the template used by all shots">Edit shared template</button></span></label>`;
const asset = (kind, path) => '/api/subplots/image/' + kind + '/' + String(path).split('/').map(encodeURIComponent).join('/');

// A standalone host supplies its own composition store and selection actions. It never creates a scene document.
export function installImages(getScene, changed, {standalone = null} = {}) {
  let standaloneSelection = null;
  const hasDocument = () => !!standalone || !!getScene();
  let presets = null, jobs = [], runs = [], poll = null, pendingConnect = null, privateMode = false, modelFiles = [], loraFiles = [], controlFiles = [];
  let historyScope = standalone ? 'all' : 'scene', historyCharacter = '', historyStar = false, historyEnd = false, historyBusy = false, historyWho = 'all', showTrash = false;
  const edits = new Map();  // ratings and deletes made here since the library loaded: id -> fields
  let selected = [], referenceChoices = [], referenceOwner = '', activeScene = '', activeSlot = '', loadingHistory = 0;
  // how the composer is folded: the full people picker, the generation settings, the width and height fields
  let peopleOpen = false, settingsOpen = false, customSize = false, excludeOpen = false;
  const fold = () => { peopleOpen = false; customSize = false; };
  // the person the stage's controls are for (Direct the shot)
  let stageWho = '';
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
    if (standalone) {
      const c = standalone.getComposition();
      if (presets && !c.original?.readOnlySource) applyDefaults(c, presets);
      return c;
    }
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
    if (presets && !c.original?.readOnlySource) {
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
    // pictures belong to the private scenes, so every shot of one is a reward (CLAUDE.md, Reward tiers by mode)
    if (scene.audience === 'private') c.reward = true;
    return c;
  }
  const assemble = () => {
    const body = assembleComposition(compose() || normalizeComposition(), presets || {}, getScene()?.id);
    return standalone ? standaloneJob(body) : body;
  };
  const selectedImage = slot => standalone ? standaloneSelection : getScene()?.metadata.images?.[slot] || (getScene()?.metadata.image?.slot === slot ? getScene().metadata.image : null);
  const currentSource = (picked, slot) => standalone && picked?.out_path && !picked.file ? picked.out_path
    : picturePath({chosen: picked, url: picked && !picked.applied ? picked.url : slot?.available !== false ? slot?.url : ''});
  function updatePrompt() {
    const body = assemble();
    for (const el of document.querySelectorAll('[data-studio-prompt]')) if (el !== document.activeElement) el.value = body[el.dataset.studioPrompt];
    const reset = $('[data-studio-reset]'); if (reset) reset.hidden = !compose()?.override;
    if ($('#assembledNegative')) $('#assembledNegative').textContent = body.negative;
    // each block's words on a tint of their own, named on hover (Jørgen, 2026-10-11: "add colored background to
    // separate the different blocks of the prompts visually"); the prompt sent is the same text
    if ($('#assembled')) $('#assembled').innerHTML = promptParts(compose() || normalizeComposition(), presets || {}, getScene()?.id)
      .map(p => p.kind ? `<span class="pp pp-${p.kind}" title="${esc(p.label)}">${esc(p.text)}</span>` : esc(p.text)).join('');
    const peek = $('.image-settings .settings-peek'); if (peek) peek.textContent = settingsPeek(compose());
    if ($('#imageRatingNote')) $('#imageRatingNote').textContent = body.rating === compose()?.rating ? '' : 'The selected character preset limits this image to ' + body.rating + '.';
  }
  function outfitPicker(c, p) {
    const pick = c.outfit[p.id];
    const value = pick === true ? 'usual' : typeof pick === 'string' ? pick : '';
    const items = [...(p.data.outfit ? [{id: 'usual', label: 'Usual: ' + p.data.outfit}] : []),
      ...active('outfit').filter(o => !o.data.character || o.data.character === p.id).map(o => ({id: o.id, label: o.data.name}))];
    const words = personWords(c, p, presets), local = c.people?.[p.id] || {};
    const input = (key, label, rows = 2) => `<label>${label}<textarea rows="${rows}" data-shot-person-field="${key}" data-person-id="${esc(p.id)}">${esc(words[key])}</textarea></label>`;
    return `<div class="image-outfit"><div class="person-title"><strong>${esc(p.data.name || p.id)}</strong><button type="button" class="small ghost" data-edit-person="${esc(p.id)}">Edit shared template…</button></div>
      <p class="hint">These fields apply only to this shot. The shared template stays unchanged.</p>
      <label>Clothing preset<select data-outfit-for="${esc(p.id)}"><option value="">No outfit words</option>${options(items, value)}<option value="${NEW}">+ New shared outfit…</option></select></label>
      ${input('clothing', 'Clothing in this shot')}
      ${input('appearance', 'Appearance in this shot', 3)}
      <div class="person-resets"><button type="button" class="small" data-reset-person="clothing" data-person-id="${esc(p.id)}">Reset clothing to preset</button><button type="button" class="small" data-reset-person="appearance" data-person-id="${esc(p.id)}">Reset appearance to template</button></div>
      <details class="person-exclusions"><summary>Clothing and appearance exclusions</summary>${input('clothingNegative', 'Clothing words to avoid')}${input('appearanceNegative', 'Appearance words to avoid')}
      ${c.charNegOff?.[p.id] && local.appearanceNegative == null ? '<p class="hint">Template exclusions are off. Typing here adds exclusions for this shot.</p>' : ''}</details>
      <span class="hint person-local-status">${Object.keys(local).length ? 'Using changes for this shot.' : 'Using preset and template words.'}</span></div>`;
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
  // decided on the character. maybe collapsable while showing only the currently included characters"). Keeping a
  // person the same sits in their own row (Jørgen, 2026-10-11: "character consistency is also split from the
  // character selection above, those should be combined"): the portrait reference, the face correction after the
  // render and the portrait's background removed. The queue does these for a picture of one person only.
  function sameFaceHtml(c, p, refPath) {
    const ref = c.reference && portraitUrl(c.reference) ? `<img class="same-face-ref" src="${esc(portraitUrl(c.reference))}" alt="Reference picture" title="The reference picture">` : '';
    const strength = (name, title, min, max) => `<input data-compose="${name}" type="number" min="${min}" max="${max}" step="0.05" value="${esc(c[name] ?? '')}" aria-label="${esc(title)}" title="${esc(title)}">`;
    return `<div class="same-face"><span class="same-face-label">Same face</span>${ref}
      <span class="same-face-pair">${check('referenceOn', 'Portrait reference', c.referenceOn, !refPath)}${strength('referenceStrength', 'Portrait reference strength', 0, 2)}</span>
      <span class="same-face-pair">${check('faceFix', 'Fix the face after', c.faceFix, !refPath)}${strength('faceStrength', 'Face fix strength', 0.1, 1)}</span>
      ${check('referenceCutout', 'Cut the portrait out', c.referenceCutout)}
      <span class="same-face-pick"><button type="button" class="small" data-pick-reference title="Use another picture of ${esc(p.data.name || p.id)} as the reference">Reference picture…</button>${c.reference ? '<button type="button" class="small" data-reset-reference>Use the portrait</button>' : ''}</span></div>
      <div id="imageReferenceChoices"></div>`;
  }
  function peopleHtml(c, cast) {
    const generic = c.man && active('character').find(p => p.data.generic);
    const any = cast.length || generic;
    const one = cast.length === 1 && !c.man;
    const refPath = c.reference || (one ? cast[0].data.portrait : '');
    const face = p => portraitUrl(p.data.portrait) ? `<img loading="lazy" src="${esc(portraitUrl(p.data.portrait))}" alt="">` : `<span class="image-person-placeholder">${esc((p.data.name || p.id).slice(0, 1))}</span>`;
    const groupChip = cast.length + (c.man ? 1 : 0) > 1 ? chip('Short descriptions for a group', c.useShort, 'data-toggle="useShort"') : '';
    const head = `<div class="section-head"><h3>People</h3>${any ? `<button type="button" data-people-open aria-expanded="${peopleOpen}">${peopleOpen ? 'Done' : 'Add or change people'}</button>` : ''}</div>`;
    const rows = `<div class="image-included">${cast.map(p => `<div class="image-person-row" data-person="${esc(p.id)}">${face(p)}<div class="person-main">${outfitPicker(c, p)}${one ? sameFaceHtml(c, p, refPath) : ''}</div></div>`).join('')}
      ${generic ? `<div class="image-person-row" data-person="${esc(generic.id)}">${face(generic)}<div class="person-main">${outfitPicker(c, generic)}</div></div>` : ''}</div>
      ${cast.length + (c.man ? 1 : 0) > 1 ? '<p class="hint same-face-note">Keeping a face the same (portrait reference, face fix) works when one person is in the picture.</p>' : ''}`;
    if (any && !peopleOpen) return `<section class="image-section image-people">${head}${rows}${groupChip ? `<div class="chips">${groupChip}</div>` : ''}</section>`;
    return `<section class="image-section image-people">${head}<div class="image-cast">${active('character').filter(p => !p.data.generic).map(p => `<button type="button" data-char="${esc(p.id)}" aria-pressed="${c.characters.includes(p.id)}" title="${esc(p.data.name || p.id)}">${face(p)}<span>${esc(p.data.name || p.id)}</span></button>`).join('') || '<p class="hint">Your image-generation character presets appear here when connected.</p>'}</div>
      <div class="chips">${active('character').some(p => p.data.generic) ? chip('Include an unnamed person', c.man, 'data-toggle="man"') : ''}${groupChip}<button type="button" data-new-block="character">+ New person</button></div>
      ${any ? rows : ''}</section>`;
  }
  // Generation settings: folded by default with a one-line summary, like the original prompt (Jørgen, 2026-10-11:
  // "the model parameters should also be collapsed, and on the left side"). Seed is Auto or Fixed and size is a
  // preset, as in the image gen dashboard ("seed should have an auto option, learn from the imagegen view").
  function settingsPeek(c) {
    const md = preset('model', c.model)?.data || {}, n = +c.count || 1;
    return [md.name || 'No model', n + (n > 1 ? ' pictures' : ' picture'), c.seedMode === 'fixed' ? 'seed ' + (c.seed != null && c.seed !== '' ? c.seed : '?') : 'seed auto',
      (+c.steps || md.steps || 30) + ' steps', 'CFG ' + (c.cfg != null && c.cfg !== '' ? +c.cfg : (md.cfg ?? 5)), sizeOf(c).label].join(' · ');
  }
  function settingsHtml(c) {
    const md = preset('model', c.model)?.data || {}, size = sizeOf(c);
    const fixed = c.seedMode === 'fixed';
    const sizes = active('framing').map(f => chip(f.data.name + ' ' + f.data.w + '×' + f.data.h, f.id === c.framing && !size.own, `data-size="${esc(f.id)}" title="${esc(f.data.prompt || f.data.notes || '')}"`)).join('');
    return `<details class="image-section image-settings" data-settings-open ${settingsOpen ? 'open' : ''}><summary><span class="settings-title">Generation settings</span><span class="hint settings-peek">${esc(settingsPeek(c))}</span></summary>
      <div class="settings-grid">${pickerHtml('model', 'model', 'Model', presetOptions('model'), c.model, null)}${number('count', 'Pictures', c.count, 1, 8)}${number('steps', 'Steps', c.steps, 1, 100, 1, md.steps || 30)}${number('cfg', 'Prompt strength', c.cfg, 0, 30, 0.1, md.cfg ?? 5)}</div>
      <div class="settings-seed"><span class="settings-label">Seed</span><span class="seed-mode">${chip('Auto', !fixed, 'data-seed-mode="random" title="A new random seed for every picture"')}${chip('Fixed', fixed, 'data-seed-mode="fixed" title="Repeat one seed"')}</span>
        <input data-compose="seed" type="number" min="0" max="9007199254740991" step="1" value="${esc(c.seed ?? '')}" placeholder="${fixed ? 'Seed' : 'Random'}" aria-label="Seed" ${fixed ? '' : 'disabled'}></div>
      <div class="chips sizes"><span class="settings-label">Size</span>${sizes}${size.own ? chip('This shot’s size ' + size.w + '×' + size.h, true, 'data-size-own') : ''}${chip('Custom size', customSize, 'data-size-custom')}<button type="button" data-new-block="framing">+ New</button><button type="button" data-edit-block="framing" data-edit-field="framing">Edit shared template…</button></div>${localBlockHtml(c, presets || {}, 'framing', c.framing, 'Picture shape')}
      ${customSize || size.own ? `<div class="two">${number('width', 'Width', c.width, 256, 2048, 64, size.w)}${number('height', 'Height', c.height, 256, 2048, 64, size.h)}</div>` : ''}</details>`;
  }
  const blockValue = (kind, value) => blockId(presets, kind, value) || value || '';
  const blockItems = (kind, value) => { const items = presetOptions(kind); return value && !items.some(i => i.id === value) ? [...items, {id: value, label: value + ' (words only)'}] : items; };
  // what Direct the shot and Place and light need from the composer (image-direct.js)
  const directCtx = () => ({presets: presets || {}, active, preset, blockValue, blockItems, picker: pickerHtml, edit, render, compose, openBlock, makeExamples, previewPlace,
    selected: () => stageWho, select: id => { stageWho = id; }, size: c => sizeOf(c)});
  // Example pictures on the setting, light and camera tiles: fetched once, then painted into the tiles in place so a
  // text box being typed in keeps its focus.
  const examplesSeen = new Set();
  const exampleKinds = () => [...['location', 'light'].flatMap(kind => active(kind).map(b => [kind, b.id])), ...active('camera').map(b => ['camera', b.id])];
  function paintExamples() {
    const typing = document.activeElement?.matches?.('textarea, input:not([type]), input[type=text], input[type=number]');
    if (!typing) return render();
    renderShot();
    for (const el of document.querySelectorAll('[data-block-tile], [data-chosen][data-id]')) {
      const url = exampleOf(el.dataset.blockTile || el.dataset.chosen, el.dataset.id), art = el.querySelector('.tile-art');
      if (url && art && !art.querySelector('img')) art.innerHTML = `<img src="${esc(url)}" alt="">`;
    }
  }
  async function makeExamples(kind) {
    const blocks = active(kind).filter(b => !exampleOf(kind, b.id));
    if (!blocks.length) return;
    for (const b of blocks) { const body = exampleJob(kind, b.id, presets); await api('image/api/generate', standalone ? standaloneJob(body) : body); }
    notice(`Queued ${blocks.length} small example ${blocks.length > 1 ? 'pictures' : 'picture'} of a stand-in figure. They show on the tiles when they are done.`);
    await refresh();
  }
  // Preview this place: the setting in its light, no people, small, through the queue; it shows in the picture slot
  // until the shot has a picture of its own (block-examples.js placeJob).
  async function previewPlace() {
    const c = compose();
    const setting = blockValue('location', c.environment);
    if (!setting) return notice('Choose a setting first.', true);
    const body = placeJob(c, presets);
    await api('image/api/generate', standalone ? standaloneJob(body) : body);
    notice('Making a small picture of the place. It shows on the right when it is done.');
    await refresh();
    renderShot();
  }
  // The right column: the shot's picture, or a picture of its place while it has none, never an empty box
  // (Jørgen, 2026-10-11: "not get a blank preview as now").
  function placeState(c) {
    const setting = blockValue('location', c.environment), light = blockValue('light', c.light);
    if (!setting) return {setting};
    const key = placeKey(setting, light, c, presets);
    const job = jobs.find(j => j.compose?.placePreview === key && ['queued', 'running'].includes(j.status));
    const exact = placeOf(setting, light, c, presets);
    return {setting, light, key, job, url: exact || (c.blockOverrides?.location?.[c.environment] || c.blockOverrides?.light?.[c.light] || c.blockOverrides?.style?.[c.style] || c.blockOverrides?.framing?.[c.framing] ? '' : exampleOf('location', setting)), exact: !!exact};
  }
  function shotHtml(c) {
    const slot = slots().find(s => s.id === activeSlot);
    const picked = selectedImage(activeSlot);
    const imageTitle = slot ? 'Shot ' + (slots().indexOf(slot) + 1) : 'Scene image';
    const previewUrl = picked?.url || (slot?.available === false ? '' : slot?.url);
    const go = `<div class="image-go"><button id="generate" class="primary" ${presets ? '' : 'disabled'} title="Uses your existing image-generation queue. Choose a result from the Picture library to add it to this shot.">Generate ${+c.count > 1 ? c.count + ' pictures' : 'a picture'}</button></div>`;
    const why = slot?.label === 'New picture' ? 'A new picture beat.' : slot ? 'This shot has no picture yet.' : '';
    const place = placeState(c);
    const name = (kind, id) => preset(kind, id)?.data.name || id;
    const progress = place.job ? `Making a picture of the place${place.job.status === 'running' ? ', ' + Math.round(100 * (place.job.progress || 0)) + '%' : ', queued'}.` : '';
    const again = place.setting ? `<button type="button" class="small" data-preview-place ${presets ? '' : 'disabled'}>${place.exact ? 'Preview again' : 'Preview this place'}</button>` : '';
    const empty = place.url
      ? `<figure class="place-preview"><img class="selected-image" src="${esc(place.url)}" alt="The place: ${esc(name('location', place.setting))}"><figcaption><span>Place preview: ${esc([name('location', place.setting), place.exact && place.light ? name('light', place.light) : ''].filter(Boolean).join(', '))}${place.exact ? '' : ' (its example picture)'}. ${esc(why)} Generate to make the shot.</span>${progress ? `<span class="hint">${esc(progress)}</span>` : again}</figcaption></figure>`
      : `<div class="image-empty"><p>${esc(why || 'Choose a shot in the storyboard to replace its image.')} ${place.setting ? (progress || 'Preview its place to see the setting and light before you generate the shot.') : 'Choose a setting on the left, then preview the place here before you generate the shot.'}</p>${progress ? '' : again}</div>`;
    return `<div class="image-current"><p class="hint image-scene-name">${esc(getScene().metadata.title || getScene().title)}</p>${previewUrl ? `<a href="${esc(previewUrl)}" target="_blank" rel="noopener"><img class="selected-image" src="${esc(previewUrl)}" alt="${esc(imageTitle)}"></a>` : empty}
        <div class="image-current-row">${go}${slots().length > 1 ? field('imageSlot', 'Image in this scene', slots().map((s, i) => ({id: s.id, label: 'Shot ' + (i + 1)})), activeSlot, null) : `<strong>${esc(imageTitle)}</strong>`}
        ${slot?.storage === 'archive' && !picked ? '<p class="hint">Showing the earlier picture from the archive.</p>' : ''}
        ${picked && !picked.applied ? `<p class="hint">${getScene().studioDraft ? 'Save draft to keep this picture.' : 'Replacement selected. Save the scene to use it in the story.'}</p><button data-clear-image>${getScene().studioDraft ? 'Keep the saved draft image' : 'Keep the current story image'}</button>` : ''}</div>
      </div>`;
  }
  // redraw only the right column (a place preview finishing must not take the focus from a text box)
  let shotSeen = '';
  function renderShot() {
    if (standalone) {
      const host = $('#studioPlacePreview'), c = compose(); if (!host || !c) return;
      const place = placeState(c); host.hidden = !place.url && !place.job;
      host.innerHTML = `${place.url ? `<img src="${esc(place.url)}" alt="Place preview">` : ''}<span class="hint">${place.job ? 'Making a preview of the place…' : 'Place preview'}</span>`;
      return;
    }
    const shot = $('#composeShot'), c = compose();
    if (!shot || !c || !$('#composePreview')) return;
    shot.innerHTML = shotHtml(c);
    bindShot(shot);
  }
  function bindShot(root) {
    root.querySelectorAll('#generate').forEach(b => { b.onclick = guarded(generate); if (compose()?.original?.readOnlySource) b.disabled = true; });
    root.querySelectorAll('[data-preview-place]').forEach(b => { b.onclick = guarded(previewPlace); });
    const pick = root.querySelector('[data-compose=imageSlot]');
    if (pick) pick.oninput = () => { activeSlot = pick.value; fold(); render(); };
    root.querySelectorAll('[data-clear-image]').forEach(b => { b.onclick = () => { clearPendingPicture(getScene(), activeSlot); changed(); render(); announceImage(); }; });
  }
  function externalOriginalHtml(o) {
    return `<section class="image-section image-original">${provenanceHtml(o)}<label>Original prompt<textarea rows="5" readonly>${esc(o.positive || '')}</textarea></label></section>`;
  }
  function renderExternalSource(c) {
    const host = $('#composition'), stage = $('#composePreview'), shot = $('#composeShot');
    host.innerHTML = externalOriginalHtml(c.original) + (stage ? '' : externalSourceExplanationHtml(c.original));
    if (stage) stage.innerHTML = externalSourceExplanationHtml(c.original);
    if (shot) { shot.innerHTML = shotHtml(c); bindShot(shot); }
    if ($('#studioPrompt')) $('#studioPrompt').innerHTML = '';
    if ($('#quickGenerate')) $('#quickGenerate').disabled = true;
    const startLocal = () => {
      const next = normalizeComposition({sourceChecked: true, castInitialized: true, edited: true,
        original: {...c.original, readOnlySource: false}});
      applyDefaults(next, presets || {});
      if (standalone) standalone.setComposition(standaloneComposition(next));
      else getScene().metadata.compositions[activeSlot || 'scene'] = next;
      changed(); render();
      notice('New local generation. Choose its controls and prompt. The imported original settings are kept below.');
    };
    for (const root of [host, stage]) root?.querySelectorAll('[data-new-local-generation]').forEach(button => { button.onclick = startLocal; });
    renderJobs();
  }
  function render() {
    const host = $('#composition');
    if (!host) return;
    const c = compose();
    if (!c) { host.innerHTML = '<p class="hint">Choose a scene first.</p>'; return; }
    const slot = slots().find(s => s.id === activeSlot);
    const picked = selectedImage(activeSlot);
    if (!standalone && presets && !c.sourceChecked && !c.edited && (picked || slot?.available)) loadSource(activeSlot);
    if (c.original?.readOnlySource && isExternal(c.original)) return renderExternalSource(c);
    if ($('#quickGenerate')) $('#quickGenerate').disabled = false;
    const cast = c.characters.map(id => preset('character', id)).filter(Boolean);
    const current = standalone ? '' : shotHtml(c);
    const look = `<section class="image-section image-look"><div class="two">${pickerHtml('style', 'style', 'Art style', presetOptions('style'), c.style, null)}${field('rating', 'Content level', [{id: 'safe', label: 'General'}, {id: 'sensitive', label: 'Mature'}, {id: 'nsfw', label: 'Adult'}], c.rating, null)}</div><p id="imageRatingNote" class="hint"></p>${localBlockHtml(c, presets || {}, 'style', c.style, 'Art style')}</section>`;
    const happens = `<section class="image-section image-what"><div class="section-head"><h3>What happens</h3>${pickerHtml('scenePreset', 'scene', 'Scene template', presetOptions('scene'), c.sceneRefs?.[0] || '', 'Choose a saved direction…')}</div>
      <label><span class="visually-hidden">What happens in this shot</span><textarea data-compose="scene" rows="2" placeholder="Choose a saved direction above, or describe the action in your own words.">${esc(c.scene)}</textarea></label>${c.sceneRefs?.[0] ? '<button type="button" class="small" data-reset-scene>Reset to template</button>' : ''}</section>`;
    // the soft-scene exclusion (image-compose.js softExclusion): its preset is on and locked while it applies
    const softRule = softExclusion(c, presets || {}, getScene()?.id);
    const lockedOn = id => softRule.on && softRule.ids.includes(id);
    // Exclude folds to one line, like the generation settings: the negative blocks in use and anything else
    const negNames = active('negative').filter(p => c.negatives?.includes(p.id) || lockedOn(p.id)).map(p => p.data.name);
    const excludePeek = [...negNames, c.negative ? 'more words' : '', softRule.on ? 'soft-scene limits' : ''].filter(Boolean).join(', ') || 'nothing';
    const details = `<section class="image-section image-details"><label class="details-line">More details<textarea data-compose="extra" rows="1" placeholder="Props, clothes, anything the blocks don't say">${esc(c.extra || '')}</textarea></label></section>`;
    const exclude = `<details class="image-section image-exclude" data-exclude-open ${excludeOpen ? 'open' : ''}><summary><span class="settings-title">Exclude</span><span class="hint exclude-peek">${esc(excludePeek)}</span></summary><div class="chips">${active('negative').map(p => lockedOn(p.id)
      ? chip(p.data.name, true, `data-negative="${esc(p.id)}" disabled title="${esc('On for this shot: ' + (p.data.text || ''))}"`)
      : chip(p.data.name, c.negatives?.includes(p.id), `data-negative="${esc(p.id)}" title="${esc(p.data.text)}"`)).join('')}<button type="button" data-new-block="negative">+ New</button><button type="button" data-edit-block="negative" data-edit-list="negatives">Edit shared template…</button></div>
      ${(c.negatives || []).map(id => localBlockHtml(c, presets || {}, 'negative', id)).join('')}
      <p class="hint">Generated exclusion prompt:</p><p id="assembledNegative" class="hint prompt-box exclude-prompt"></p>
      <div class="two"><label>Anything else to avoid?<textarea data-compose="negative" rows="1">${esc(c.negative || '')}</textarea></label>
      <label>Notes for steps outside the prompt<textarea data-compose="details" rows="1" placeholder="Inpaint, colour fix, LoRA weights. Kept with the picture, not sent to the model.">${esc(c.details || '')}</textarea></label></div>
      <p class="hint">${c.hard ? 'Adult: standing soft-scene exclusions are off.' : c.reward ? 'Nonadult reward: the soft-scene exclusion is always on, at every content level.' : 'Nonadult: standing soft-scene exclusions apply to Mature and Adult content levels.'} Other exclusion words stay as written.</p></details>`;
    const dctx = directCtx();
    const o = c.original;
    const smallChanges = o?.start ? '<button data-small-changes title="Start from this shot’s picture with the same seed and change it a little (img2img, low strength).">Small changes to this picture</button>' : '';
    const original = isExternal(o) ? externalOriginalHtml(o) : o && o.positive == null ? `<section class="image-section image-original"><div class="section-head"><h3>Original prompt</h3>${smallChanges}</div><p class="hint">There is no record of how this picture was made. Describe it below, or start from it.</p></section>`
      : o ? localOriginalPromptHtml(c, {readOnly: !!standalone, tools: smallChanges}) : '';
    const currentPicture = currentSource(picked, slot);
    const tools = toolsHtml(c, {loras: loraFiles, controls: controlFiles, current: currentPicture});
    const prompt = `<section class="image-section image-prompt"><div class="section-head"><h3>Current prompt</h3>${c.override ? '<button data-reset-prompt>Build the prompt from these controls</button>' : ''}${c.source ? '<button data-fill-prompt title="Guesses the character, camera, shape, style and model blocks from the old prompt and puts the rest in the free text. Nothing is saved until you generate.">Fill from prompt</button>' : ''}</div>${c.override && !c.original ? '<p class="hint">This picture uses a prompt copied from history.</p>' : ''}<p id="assembled" class="hint prompt-box"></p></section>`;
    // The full-screen composer (index.html) reads left to right as a director works: the cast and the place (people
    // with how each keeps their face, setting, light, mood, style; the excludes, generation settings and Picture tools
    // folded), then the shot (What happens, the stage, shot size, angle, lens, pose, the prompt), then the picture with
    // Generate and the library (notes/tools/scene-editor.md, Composer). Without the columns (a narrow panel) it all
    // runs down one column.
    const stage = $('#composePreview'), shot = $('#composeShot');
    const composerHead = standalone ? $('.studio-mode') : $('.compose-dialog .compose-head');
    if (composerHead) {
      let mode = composerHead.querySelector('[data-composer-mode]');
      if (!mode) { mode = document.createElement('div'); mode.dataset.composerMode = ''; mode.className = 'shot-mode'; composerHead.insertBefore(mode, composerHead.querySelector('#closeCompose')); }
      mode.innerHTML = `<span>Shot</span>${['Nonadult', 'Adult'].map((label, i) => `<button type="button" data-shot-mode="${i ? 'adult' : 'nonadult'}" aria-pressed="${!!c.hard === !!i}" title="${i ? 'Leave out' : 'Apply'} standing soft-scene exclusions for this shot">${label}</button>`).join('')}`;
      mode.querySelectorAll('[data-shot-mode]').forEach(b => b.onclick = () => edit(c => { c.hard = b.dataset.shotMode === 'adult'; }));
    }
    const direct = directHtml(c, dctx), place = placeHtml(c, dctx);
    if (standalone) {
      host.innerHTML = peopleHtml(c, cast) + happens + place + look + details + original + exclude + settingsHtml(c) + tools;
      stage.innerHTML = `<details class="studio-direction" data-studio-direction ${c.directionOpen ? 'open' : ''}><summary>Camera and staging<span class="hint">Position people, choose the angle and lens</span></summary>${direct}</details>`;
      $('#studioPrompt').innerHTML = standalonePromptHtml(c, assemble(), !!presets);
    } else if (stage && shot) {
      // Jørgen, 2026-10-11: "put the camera direction and preview on top of the middle lane, moving the orig prompt
      // down together with the other prompt related stuff"; the generated prompt takes what is left
      host.innerHTML = peopleHtml(c, cast) + place + look + settingsHtml(c) + tools;
      stage.innerHTML = direct + happens + details + original + prompt + exclude;
      shot.innerHTML = current;
      if ($('#composeFor')) $('#composeFor').textContent = getScene().metadata.title || getScene().title || '';
    } else host.innerHTML = current + peopleHtml(c, cast) + direct + place + look + happens + details + original + prompt + exclude + settingsHtml(c) + tools;
    bindComposition();
    updatePrompt();
    renderReferenceChoices();
    if (standalone) renderShot();
    renderJobs();
    if (presets) {
      loadExamples(api, exampleKinds(), paintExamples);
      const setting = blockValue('location', c.environment);
      if (setting) loadPlace(api, setting, blockValue('light', c.light), paintExamples, c, presets);
    }
  }
  function edit(mutator, repaint = true) {
    const c = compose(); if (!c) return;
    mutator(c); c.edited = true; changed();
    if (repaint) render(); else updatePrompt();
  }
  function toggleList(c, key, id) { c[key] = c[key].includes(id) ? c[key].filter(x => x !== id) : [...c[key], id]; }
  function bindComposition() {
    const host = standalone ? $('#images') : $('#composePreview') ? $('#composition').parentElement : $('#composition');
    const direction = host.querySelector('[data-studio-direction]');
    if (direction) direction.ontoggle = () => edit(c => { c.directionOpen = direction.open; }, false);
    host.querySelectorAll('[data-studio-prompt]').forEach(el => el.oninput = () => edit(c => {
      c.override = {positive: $('[data-studio-prompt=positive]', host).value, negative: $('[data-studio-prompt=negative]', host).value};
    }, false));
    const reset = host.querySelector('[data-studio-reset]'); if (reset) reset.onclick = () => edit(c => { c.override = null; });
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
        }, ['model', 'count', 'referenceOn', 'faceFix', 'rating', 'pose', 'style', 'framing', 'environment', 'light'].includes(name));
      };
    });
    // picking people keeps the full picker open until Done
    host.querySelectorAll('[data-char]').forEach(b => b.onclick = () => edit(c => { peopleOpen = true; toggleList(c, 'characters', b.dataset.char); c.reference = ''; c.override = null; }));
    host.querySelectorAll('[data-negative]').forEach(b => b.onclick = () => edit(c => { toggleList(c, 'negatives', b.dataset.negative); c.override = null; }));
    host.querySelectorAll('[data-toggle]').forEach(b => b.onclick = () => edit(c => { if (b.dataset.toggle === 'man') peopleOpen = true; c[b.dataset.toggle] = !c[b.dataset.toggle]; c.override = null; }));
    host.querySelectorAll('[data-outfit-for]').forEach(el => el.onchange = () => {
      const who = el.dataset.outfitFor;
      if (el.value === NEW) {
        const pick = compose().outfit[who];
        const person = preset('character', who);
        render();
        openBlock('outfit', {from: typeof pick === 'string' ? pick : '', prefill: {character: who, text: typeof pick === 'string' ? '' : person?.data.outfit || ''},
          apply: (c, id) => { c.outfit[who] = id; if (c.people?.[who]) { delete c.people[who].clothing; delete c.people[who].clothingNegative; } c.override = null; }});
        return;
      }
      edit(c => { c.outfit[who] = el.value === 'usual' ? true : el.value || false; if (c.people?.[who]) { delete c.people[who].clothing; delete c.people[who].clothingNegative; } c.override = null; });
    });
    host.querySelectorAll('[data-shot-person-field]').forEach(el => el.oninput = () => {
      edit(c => {
        c.people ||= {}; c.people[el.dataset.personId] ||= {};
        c.people[el.dataset.personId][el.dataset.shotPersonField] = el.value;
        c.override = null;
      }, false);
      el.closest('.image-outfit').querySelector('.person-local-status').textContent = 'Using changes for this shot.';
    });
    host.querySelectorAll('[data-reset-person]').forEach(b => b.onclick = () => edit(c => {
      const local = c.people?.[b.dataset.personId];
      if (local) { delete local[b.dataset.resetPerson]; delete local[b.dataset.resetPerson + 'Negative']; }
      c.override = null;
    }));
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
    const xd = host.querySelector('[data-exclude-open]');
    if (xd) xd.ontoggle = () => { excludeOpen = xd.open; };
    bindBlockWords(host, (change, repaint) => { edit(change, repaint); if (repaint === false) renderShot(); });
    bindDirect(host, directCtx());
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
    bind('[data-reset-scene]', () => edit(c => { c.scene = preset('scene', c.sceneRefs?.[0])?.data.text || ''; c.override = null; }));
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
    const current = currentSource(picked, slot);
    const cc = compose();
    bindTools(host, {edit, compose, current, size: {w: +cc.width || preset('framing', cc.framing)?.data.w, h: +cc.height || preset('framing', cc.framing)?.data.h}});
    bindShot(host);
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
    if (compose()?.original?.readOnlySource) throw Error(externalReplayNotice);
    const body = assemble();
    if (!body.model_file) throw Error('Choose a generation model first.');
    $('#generate').disabled = true;if($('#quickGenerate'))$('#quickGenerate').disabled=true;
    try { await api('image/api/generate', body); notice('Picture queued. You can keep editing while it generates.'); await refresh(); }
    finally { if ($('#generate')) $('#generate').disabled = false;if($('#quickGenerate'))$('#quickGenerate').disabled=false; }
  }
  async function refresh() {
    jobs = await api('image/api/jobs');
    // example pictures that finished since the tiles last looked (Make examples)
    // example pictures and place previews that finished since the last look go on their tiles and in the picture slot
    let fresh = false;
    for (const j of jobs) if (j.status === 'done' && (j.compose?.example || j.compose?.placePreview) && !examplesSeen.has(j.id)) { examplesSeen.add(j.id); fresh = noteDone(j) || fresh; }
    if (fresh) paintExamples();
    // a place preview's progress
    const sig = jobs.filter(j => j.compose?.placePreview && ['queued', 'running'].includes(j.status)).map(j => j.id + j.status + Math.round(10 * (j.progress || 0))).join();
    if (sig !== shotSeen) { shotSeen = sig; renderShot(); }
    renderJobs();
  }
  function historyQuery(before) {
    const q = new URLSearchParams({limit: '100', who: historyWho, pictures: '1'});
    if (historyCharacter) q.set('character', historyCharacter);
    if (historyStar) q.set('star', '1');
    if (before?.at) { q.set('before', before.at); q.set('before_run', before.run_id); q.set('before_n', before.last_n || 0); }
    return q;
  }
  async function loadHistory(more = false) {
    if (more && (historyBusy || historyEnd)) return;
    const request = ++loadingHistory;
    historyBusy = true;
    try {
      const rows = await api('image/api/history?' + historyQuery(more ? runs.at(-1) : null));
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
  const library = createLibrary({api, notice, actions: standalone?.actions, reuseLabel: standalone ? 'Load prompt and settings' : null, useLabel: standalone ? 'Select image' : 'Use for this shot', selected: () => standaloneSelection?.id, select: standalone ? j => useImage(j) : null, changed: () => renderJobs(), use: j => useImage(j), reuse: j => reuseImage(j),
    generate: body => api('image/api/generate', standalone ? standaloneJob(body) : body).then(refresh), styleName: id => preset('style', id)?.data.name, count: () => +compose()?.count || 1,
    rated: (t, fields) => { edits.set(t.id, {...edits.get(t.id), ...fields}); if (standalone && fields.deleted && standaloneSelection?.id === t.id) { standaloneSelection = null; standalone.onSelect?.(null); } }, restored: t => { edits.set(t.id, {...edits.get(t.id), deleted: false}); sceneRunsFor = ''; loadHistory(); }});
  function renderJobs() {
    const host = $('#renders'); if (!host) return;
    if (!hasDocument()) { host.replaceChildren(); return; }
    const sceneScope = !standalone && historyScope === 'scene';
    if (sceneScope && sceneRunsFor !== getScene().id) { loadScenePictures(); }
    const ownRuns = new Set((sceneRuns || []).map(r => r.run_id));
    const all = new Map((sceneScope ? sceneRuns || [] : runs).flatMap(run => (run.renders || []).map(j => [j.id, {...run, ...j, status: 'done'}])));
    for (const job of jobs) if (!sceneScope || all.has(job.id) || job.compose?.subplotId === getScene().id || ownRuns.has(job.run_id)) {
      const saved = all.get(job.id), durable = draftPictureUrl(saved?.url);
      all.set(job.id, {...saved, ...job, n: job.n ?? saved?.n, ...(durable ? {url: durable, status: 'done', deleted: false, raw_file: null} : {})});
    }
    for (const [id, f] of edits) if (all.has(id)) Object.assign(all.get(id), f);
    const madeBy = j => historyWho === 'all' || madeByAgent(j) === (historyWho === 'agents');
    selected = [...all.values()].filter(j => !j.deleted && madeBy(j) && !j.compose?.example && !j.compose?.placePreview
      && (!historyCharacter || j.characters?.includes(historyCharacter)) && (!historyStar || j.star || j.fav))
      .sort(newestPictureFirst);
    const empty = `<p class="hint">${sceneScope && !sceneRuns ? 'Finding this scene’s pictures…' : historyScope === 'scene' ? 'No pictures for this scene yet, from the editor or from its picture rounds. Browse all generated pictures to use an existing one.' : 'No pictures match these filters.'}</p>`;
    host.innerHTML = `<section class="image-section image-library"><div class="pane-title"><h3>Picture library</h3><button data-trash aria-pressed="${showTrash}">Trash</button><button data-refresh-images>Refresh</button></div><p class="hint library-hint">${standalone ? 'Newest pictures first. Select an image to create a scene or character.' : 'Click a picture to look closer (arrows, s, f, x, Delete). “Use for this shot” puts one in the scene.'}</p>
      ${showTrash ? library.trashHtml() : `${standalone ? '' : `<div class="segmented"><button data-library="scene" aria-pressed="${historyScope === 'scene'}">This scene</button><button data-library="all" aria-pressed="${historyScope === 'all'}">All generated pictures</button></div>`}
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
    if (standalone) { standaloneSelection = {...j, url: j.file ? asset('out', j.file) : asset('agentsrc', j.id)}; standalone.onSelect?.(j); render(); return; }
    const s = getScene(); if (!s || !activeSlot) return;
    s.metadata.images ||= {};
    s.metadata.images[activeSlot] = picturePick(activeSlot, j);
    changed(); render(); announceImage(); notice(s.studioDraft ? 'Picture selected. Save draft to keep this picture.' : 'Picture selected for this shot. Save the scene to use it in the story.');
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
  const hasBlocks = compose => !!compose && ['characters', 'chars', 'cameras', 'cams'].some(k => compose[k]?.length) || !!compose?.scene || !!compose?.man || !!Object.keys(compose?.people || {}).length || !!Object.keys(compose?.blockOverrides || {}).length || ['environment', 'light', 'style', 'framing', 'pose'].some(k => !!compose?.[k]);
  // One way to open a picture's settings, for "Reuse settings" and for a shot's own picture: its blocks when it has
  // them, else Fill from prompt; the original prompt and settings ride along either way.
  function fillFromJob(j, {how = '', start = '', slot = activeSlot, quiet = false} = {}) {
    const s = getScene(); if (!s && !standalone) return;
    if (isExternal(j)) {
      const c = normalizeComposition({imageSlot: slot, castInitialized: true, sourceChecked: true,
        original: originalGeneration(j, {how: how || 'the picture', readOnlySource: true})});
      if (standalone) standalone.setComposition(standaloneComposition(c));
      else s.metadata.compositions[slot || 'scene'] = c;
      if (!quiet) changed();
      render(); return;
    }
    const current = compose() || normalizeComposition();
    const blocks = hasBlocks(j.compose);
    let c;
    if (blocks) {
      c = normalizeComposition(j.compose);
      for (const type of ['model', 'style', 'framing']) c[type] = j.presets?.[type]?.id || c[type] || current[type];
    } else c = guessComposition(j, presets || {}).composition;
    c.model = active('model').find(p => p.data.file === j.model_file)?.id || c.model || current.model;
    Object.assign(c, {imageSlot: slot, seedMode: 'fixed', seed: j.seed, count: 1, width: j.w, height: j.h,
      steps: j.steps ?? c.steps, cfg: j.cfg ?? c.cfg, sampler: j.sampler || undefined, scheduler: j.scheduler || undefined,
      castInitialized: true, sourceChecked: true, edited: false,
      original: originalGeneration(j, {how: how || (j.n ? 'picture #' + j.n : 'the picture'), start: start || draftPictureUrl(j.url) || (j.file ? 'island/private/imagegen/outputs/' + j.file : j.out_path || ''), blocks}),
      override: {positive: j.positive || '', negative: j.negative || ''}});
    if (j.ipa) Object.assign(c, {reference: j.ipa.ref, referenceOn: true, referenceStrength: j.ipa.strength, referenceCutout: j.ipa.cutout});
    if (j.repaint) Object.assign(c, {reference: j.repaint.ref, faceFix: true, faceStrength: j.repaint.denoise});
    if (j.start?.image) c.start = {image: j.start.image, denoise: j.start.denoise, ...(j.start.mask ? {mask: j.start.mask} : {})};
    if (j.loras?.length) c.loras = j.loras.map(l => ({...l}));
    if (j.control) c.control = {...j.control};
    if (j.huefix?.length) c.huefix = j.huefix.map(h => ({...h}));
    if (c.start || c.loras || c.control || c.huefix) c.toolsOpen = true;
    applyDefaults(c, presets || {});
    if (standalone) standalone.setComposition(standaloneComposition(c));
    else s.metadata.compositions[slot || 'scene'] = c;
    if (!quiet) changed();
    render();
  }
  function reuseImage(j) {
    if (isExternal(j)) { notice(externalReplayNotice, true); return; }
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
    if (c.original?.readOnlySource) throw Error(externalReplayNotice);
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
