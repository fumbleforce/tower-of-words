// Direct the shot and Place and light, the staging half of the composer (notes/tools/scene-editor.md, Composer).
// Jørgen, 2026-10-11: "Direct the shot needs a lot more customizability, it is super under-utilized, just a couple of
// fields. I want previews for positioning. the camera and composition belongs wit hthis."
// The stage shows where each person stands at the shot's size, angle, lens and pose, and they are dragged into place.
// Shot size, angle and lens are camera blocks shown as diagram tiles; setting and light are blocks shown with an
// example picture. Every tile row has + New and Edit, as the other pickers do. The staging itself is kept in the
// composition's `stage` (image-stage.js), which image-compose.js turns into prompt words.
const {structuredClone, CSS} = globalThis;
import {esc} from './common.js';
import {stageCast as stagePeople, stageOf, placeOf, FACING, GAZE, HEIGHTS, LIGHT_FROM, MOODS, EXPRESSIONS, CAMERA_ROWS, DIAGRAMS, cameraKind, cameraSetup, stageSummary} from './image-stage.js';
import {stageSvg, bindStage, diagramSvg, PERSON_COLOURS} from './stage-view.js';
import {exampleOf, exampleKnown} from './block-examples.js';

const readStage = c => stageOf({stage: c.stage});  // without adding a stage to a composition that has none
const tile = ({attrs, pressed, art, label, title = '', cls = ''}) =>
  `<button type="button" class="tile ${cls}${art ? '' : ' tile-text'}" ${attrs} aria-pressed="${!!pressed}" title="${esc(title || label)}"><span class="tile-art">${art}</span><span class="tile-label">${esc(label)}</span></button>`;
// a row's name with + New and Edit under it, so the tiles get the row's whole width
const rowHead = (title, attrs) => `<span class="row-head"><span class="row-label">${esc(title)}</span><span class="tile-tools"><button type="button" class="tile-tool" ${attrs.add} title="A new block in this row">+ New</button>${attrs.edit ? `<button type="button" class="tile-tool" ${attrs.edit} title="Edit the chosen block">Edit</button>` : ''}</span></span>`;
const initial = () => '';  // no picture yet: the tile shows its name only (tile-text)
const order = (group, d) => { const i = (DIAGRAMS[group] || []).findIndex(x => x[0] === d); return i < 0 ? 99 : i; };

// The camera rows: Shot, Angle (with the other camera words after a divider) and Lens.
// The camera: Shot, Angle and Lens as tabs over one row of tiles. Each tab names its choice, so all three read at a
// glance while the row keeps the column's height for the prompt (Jørgen, 2026-10-11: "The generated prompt needs
// larger default surface area").
let cameraTab = 'shot';
function cameraRows(c, ctx) {
  const blocks = ctx.active('camera').map(b => ({b, ...cameraKind(b)}));
  const ofRow = group => [...blocks.filter(x => x.group === group).sort((a, b) => order(group, a.diagram) - order(group, b.diagram)),
    ...(group === 'angle' ? blocks.filter(x => x.group === 'other') : [])];
  const one = (x, group) => tile({attrs: `data-cam="${esc(x.b.id)}" data-cam-group="${x.group}"`, pressed: c.cameras.includes(x.b.id), label: x.b.data.name || x.b.id, title: x.b.data.prompt,
    art: diagramSvg(x.group === 'other' ? 'other' : group, x.diagram) || (exampleOf('camera', x.b.id) ? `<img loading="lazy" src="${esc(exampleOf('camera', x.b.id))}" alt="">` : initial(x.b.data.name)), cls: 'tile-dia'});
  const picked = group => ofRow(group).filter(x => c.cameras.includes(x.b.id)).map(x => x.b.data.name || x.b.id);
  const tabs = CAMERA_ROWS.map(([group, title]) => `<button type="button" role="tab" data-cam-tab="${group}" aria-selected="${cameraTab === group}" aria-pressed="${cameraTab === group}">${esc(title)}<span class="cam-choice">${esc(picked(group).join(', ') || 'none')}</span></button>`).join('');
  const own = ofRow(cameraTab).filter(x => x.group === cameraTab), rest = ofRow(cameraTab).filter(x => x.group !== cameraTab);
  const chosen = c.cameras.find(id => own.some(x => x.b.id === id)) || own[0]?.b.id || '';
  return `<div class="cam-tabs" role="tablist" aria-label="Camera">${tabs}<span class="tile-tools"><button type="button" class="tile-tool" data-new-cam="${cameraTab}" title="A new block in this row">+ New</button>${chosen ? `<button type="button" class="tile-tool" data-edit-cam="${esc(chosen)}" title="Edit the chosen block">Edit</button>` : ''}</span></div>
    <div class="tile-row cam-row" data-row="${cameraTab}" role="tabpanel"><div class="tiles">${own.map(x => one(x, cameraTab)).join('')}${rest.length ? '<span class="tile-sep" aria-hidden="true"></span>' + rest.map(x => one(x, cameraTab)).join('') : ''}</div></div>`;
}

// The selected person's controls beside the stage.
function personControls(c, people, who) {
  if (!who) return '<p class="hint stage-empty">Add people in People to stage them.</p>';
  const stage = readStage(c), i = people.findIndex(p => p.id === who.id), at = placeOf(stage, who.id, i, people.length);
  const others = people.filter(p => p.id !== who.id);
  const facing = [...FACING.filter(([k]) => k !== 'partner').map(([k, label]) => ({k, label, target: ''})),
    ...others.map(o => ({k: 'partner', label: o.name, target: o.id}))];
  const gaze = [...GAZE.filter(([k]) => k !== 'partner').map(([k, label]) => ({k, label, target: ''})), ...others.map(o => ({k: 'partner', label: o.name, target: o.id}))];
  const isFacing = x => at.facing === x.k && (x.k !== 'partner' || (at.toward || others[0]?.id) === x.target);
  const isGaze = x => at.gaze === x.k && (x.k !== 'partner' || (at.lookAt || others[0]?.id) === x.target);
  return `<div class="who">${people.map((p, n) => `<button type="button" title="Arrow keys move ${esc(p.name)} on the stage" data-who="${esc(p.id)}" aria-pressed="${p.id === who.id}"><span class="who-dot" style="background:${PERSON_COLOURS[n % PERSON_COLOURS.length]}"></span>${esc(p.name)}</button>`).join('')}</div>
    <div class="ctl ctl-row"><span class="ctl-label">Faces</span><div class="facing">${facing.map(x => tile({attrs: `data-facing="${x.k}" data-target="${esc(x.target)}"`, pressed: isFacing(x), label: x.label, art: diagramSvg('facing', x.k), cls: 'tile-mini'})).join('')}</div></div>
    <div class="ctl ctl-row"><span class="ctl-label">Looks at</span><div class="chips gaze">${gaze.map(x => `<button type="button" data-gaze="${x.k}" data-target="${esc(x.target)}" aria-pressed="${isGaze(x)}">${esc(x.label)}</button>`).join('')}</div></div>
    <div class="ctl-pair"><label class="ctl">Expression<input data-person-field="expression" list="stageExpressions" value="${esc(at.expression)}" placeholder="smiling…"></label>
      ${people.length > 1 ? `<label class="ctl">Height<select data-person-field="height">${HEIGHTS.map(([k, label]) => `<option value="${k}" ${at.height === k ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label>` : ''}</div>`;
}

// Direct the shot (the middle column): the stage with the selected person's controls, what the stage says, the camera
// rows, then pose, touching and the guide.
export function directHtml(c, ctx) {
  const people = stagePeople(c, ctx.presets), stage = readStage(c);
  const who = people.find(p => p.id === ctx.selected()) || people[0];
  const {w, h} = ctx.size(c);
  const say = stageSummary(c, people) || (people.length && !cameraSetup(c, ctx.presets).chosen ? 'No shot size chosen, so the stage shows a cowboy shot.' : '');
  return `<section class="image-section image-direction"><div class="section-head"><h3>Direct the shot</h3><span class="hint">Drag a figure: sideways to place it, up to move it back.</span></div>
    <div class="stage-wrap"><div class="stage-box" data-stage style="aspect-ratio:${w} / ${h}">${stageSvg(c, ctx.presets, people, {aspect: w / h, selected: who?.id})}</div>
      <div class="stage-side">${personControls(c, people, who)}</div></div>
    ${say ? `<p class="stage-say hint">${esc(say)}${who && placeOf(stage, who.id, people.indexOf(who), people.length).placed ? ` <button type="button" class="link" data-unplace>Forget ${esc(who.name)}’s place</button>` : ''}</p>` : ''}
    ${cameraRows(c, ctx)}
    ${c.angle ? `<p class="hint">Older camera angle kept: ${esc(c.angle)} <button type="button" class="link" data-clear-angle>Remove</button></p>` : ''}
    <div class="direct-more direct-line">${ctx.picker('pose', 'pose', 'Pose', ctx.blockItems('pose', ctx.blockValue('pose', c.pose)), ctx.blockValue('pose', c.pose))}
      <label>Touching<input data-stage-field="contact" value="${esc(stage.contact)}" placeholder="her hand on his shoulder"></label></div>
    <datalist id="stageExpressions">${EXPRESSIONS.map(x => `<option value="${esc(x)}">`).join('')}</datalist></section>`;
}

// Place and light (the left column): setting and light as picture tiles, where the light comes from, the mood.
// Once a setting, light or light direction is chosen its row folds to that choice and Change (Jørgen, 2026-10-11:
// "upon selecting one, collapse the options, same with the light, so we save space"). The rows that are open again.
const unfolded = new Set();
export function placeHtml(c, ctx) {
  const stage = readStage(c);
  const picture = (kind, id) => exampleOf(kind, id) ? `<img loading="lazy" src="${esc(exampleOf(kind, id))}" alt="">` : initial();
  const blockRow = (kind, field, title) => {
    const value = ctx.blockValue(kind, c[field]);
    const items = ctx.active(kind);
    const missing = items.filter(b => exampleKnown(kind, b.id) && !exampleOf(kind, b.id)).length;
    const words = c[field] && !value ? `<span class="hint">Words only: ${esc(c[field])}</span>` : '';
    const head = rowHead(title, {add: `data-new-tile="${kind}" data-field="${field}"`, edit: value ? `data-edit-tile="${kind}" data-id="${esc(value)}"` : ''});
    const chosen = items.find(b => b.id === value);
    if (chosen && !unfolded.has(kind)) return `<div class="tile-row tile-row-pics folded" data-row="${kind}">${head}<div class="tiles">${tile({attrs: `data-unfold="${kind}" data-chosen="${kind}" data-id="${esc(chosen.id)}" aria-expanded="false"`,
      pressed: true, label: chosen.data.name || chosen.id, title: chosen.data.text, art: picture(kind, chosen.id), cls: 'tile-chosen'})}
      <span class="fold-tools"><button type="button" class="small" data-unfold="${kind}" aria-expanded="false">Change</button>${kind === 'location' ? '<button type="button" class="small" data-preview-place title="A small picture of this place in this light, with no people, to see it before making the shot">Preview this place</button>' : ''}</span></div>${words}</div>`;
    return `<div class="tile-row tile-row-pics" data-row="${kind}">${head}<div class="tiles">${items.map(b => tile({attrs: `data-block-tile="${kind}" data-field="${field}" data-id="${esc(b.id)}"`,
      pressed: b.id === value, label: b.data.name || b.id, title: b.data.text, art: picture(kind, b.id)})).join('')}
      ${missing ? `<button type="button" class="tile-tool" data-make-examples="${kind}" title="Queue a small render of a plain stand-in for each one without a picture">Make examples (${missing})</button>` : ''}</div>${words}</div>`;
  };
  const from = LIGHT_FROM.find(l => l[0] === stage.lightFrom);
  const fromTiles = from && !unfolded.has('lightFrom')
    ? `${tile({attrs: `data-unfold="lightFrom" data-chosen="lightFrom" aria-expanded="false"`, pressed: true, label: from[1], title: from[2], art: diagramSvg('light', from[0]), cls: 'tile-mini'})}<button type="button" class="small" data-unfold="lightFrom" aria-expanded="false">Change</button>`
    : LIGHT_FROM.map(([k, label, words]) => tile({attrs: `data-light-from="${k}"`, pressed: stage.lightFrom === k, label, title: words, art: diagramSvg('light', k), cls: 'tile-mini'})).join('');
  return `<section class="image-section image-place"><h3>Place and light</h3>
    ${blockRow('location', 'environment', 'Setting')}${blockRow('light', 'light', 'Light')}
    <div class="place-more"><div class="ctl"><span class="ctl-label">Light from</span><div class="facing">${fromTiles}</div></div>
      <label class="ctl">Mood<input data-stage-field="mood" list="stageMoods" value="${esc(stage.mood)}" placeholder="calm, tense, romantic…"></label></div>
    <datalist id="stageMoods">${MOODS.map(x => `<option value="${esc(x)}">`).join('')}</datalist></section>`;
}

// Wire both sections. ctx: {presets, active(kind), preset(kind, id), blockValue(kind, value), edit(mutator, repaint), render(), compose(),
// selected(), select(id), size(c), openBlock(kind, opts), makeExamples(kind), previewPlace()}
export function bindDirect(host, ctx) {
  const c0 = ctx.compose(), people = stagePeople(c0, ctx.presets);
  const person = (c, id) => { const s = stageOf(c); return (s.people[id] = {...s.people[id]}); };
  const box = host.querySelector('[data-stage]');
  if (box) {
    const {w, h} = ctx.size(c0);
    const redraw = c => { box.innerHTML = stageSvg(c, ctx.presets, people, {aspect: w / h, selected: ctx.selected() || people[0]?.id}); };
    bindStage(box, {
      get: id => { const i = people.findIndex(p => p.id === id); return placeOf(readStage(ctx.compose()), id, i, people.length); },
      onMove: (id, at) => { const c = structuredClone(ctx.compose()); Object.assign(person(c, id), at, {placed: true}); redraw(c); },
      onDone: (id, at) => { ctx.select(id); ctx.edit(c => { Object.assign(person(c, id), at, {placed: true}); c.override = null; }); },
      onPick: id => { ctx.select(id); ctx.render(); }});
  }
  const who = () => ctx.selected() || people[0]?.id;
  host.querySelectorAll('[data-who]').forEach(b => {
    b.onclick = () => { ctx.select(b.dataset.who); ctx.render(); };
    // with a person's button focused, the arrow keys move them on the stage (Shift for bigger steps)
    b.onkeydown = e => {
      const id = b.dataset.who, step = e.shiftKey ? 0.1 : 0.03, i = people.findIndex(p => p.id === id);
      const delta = {ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step]}[e.key];
      if (!delta) return;
      e.preventDefault();
      ctx.select(id);
      ctx.edit(c => { const at = placeOf(stageOf(c), id, i, people.length); Object.assign(person(c, id), {x: Math.max(0.04, Math.min(0.96, at.x + delta[0])), d: Math.max(0, Math.min(1, at.d + delta[1])), placed: true}); c.override = null; });
      host.querySelector(`[data-who="${CSS.escape(id)}"]`)?.focus();
    };
  });
  host.querySelectorAll('[data-facing]').forEach(b => b.onclick = () => ctx.edit(c => {
    const p = person(c, who()), same = p.facing === b.dataset.facing && (p.toward || '') === (b.dataset.target || p.toward || '');
    p.facing = same ? '' : b.dataset.facing; p.toward = same ? '' : b.dataset.target; c.override = null;
  }));
  host.querySelectorAll('[data-gaze]').forEach(b => b.onclick = () => ctx.edit(c => {
    const p = person(c, who()), same = p.gaze === b.dataset.gaze && (p.lookAt || '') === (b.dataset.target || p.lookAt || '');
    p.gaze = same ? '' : b.dataset.gaze; p.lookAt = same ? '' : b.dataset.target; c.override = null;
  }));
    host.querySelectorAll('[data-unplace]').forEach(b => b.onclick = () => ctx.edit(c => { const p = person(c, who()); delete p.x; delete p.d; p.placed = false; c.override = null; }));
  host.querySelectorAll('[data-person-field]').forEach(el => el.oninput = () => ctx.edit(c => { person(c, who())[el.dataset.personField] = el.value; c.override = null; }, el.tagName === 'SELECT'));
  host.querySelectorAll('[data-stage-field]').forEach(el => el.oninput = () => ctx.edit(c => { stageOf(c)[el.dataset.stageField] = el.value; c.override = null; }, false));
  host.querySelectorAll('[data-light-from]').forEach(b => b.onclick = () => ctx.edit(c => { const s = stageOf(c); unfolded.delete('lightFrom'); s.lightFrom = s.lightFrom === b.dataset.lightFrom ? '' : b.dataset.lightFrom; c.override = null; }));
  // camera tiles: one shot size, one angle and one lens at a time; the other camera words go on and off
  host.querySelectorAll('[data-cam]').forEach(b => b.onclick = () => ctx.edit(c => {
    const id = b.dataset.cam, group = b.dataset.camGroup;
    if (c.cameras.includes(id)) c.cameras = c.cameras.filter(x => x !== id);
    else {
      const same = group === 'other' ? [] : ctx.active('camera').filter(x => cameraKind(x).group === group).map(x => x.id);
      c.cameras = [...c.cameras.filter(x => !same.includes(x)), id];
    }
    c.override = null;
  }));
  host.querySelectorAll('[data-new-cam]').forEach(b => b.onclick = () => {
    const group = b.dataset.newCam, from = ctx.compose().cameras.find(id => cameraKind(ctx.preset('camera', id)).group === group);
    ctx.openBlock('camera', {from: from || undefined, prefill: {group}, apply: (c, id) => {
      const same = ctx.active('camera').filter(x => x.id !== id && cameraKind(x).group === group).map(x => x.id);
      c.cameras = [...c.cameras.filter(x => !same.includes(x)), id]; c.override = null;
    }});
  });
  host.querySelectorAll('[data-edit-cam]').forEach(b => b.onclick = () => ctx.openBlock('camera', {id: b.dataset.editCam}));
  host.querySelectorAll('[data-cam-tab]').forEach(b => b.onclick = () => { cameraTab = b.dataset.camTab; ctx.render(); });
  host.querySelectorAll('[data-unfold]').forEach(b => b.onclick = () => { unfolded.add(b.dataset.unfold); ctx.render(); });
  host.querySelectorAll('[data-preview-place]').forEach(b => b.onclick = () => ctx.previewPlace());
  host.querySelectorAll('[data-block-tile]').forEach(b => b.onclick = () => ctx.edit(c => {
    const field = b.dataset.field;
    unfolded.delete(b.dataset.blockTile);
    c[field] = ctx.blockValue(b.dataset.blockTile, c[field]) === b.dataset.id ? '' : b.dataset.id; c.override = null;
  }));
  host.querySelectorAll('[data-new-tile]').forEach(b => b.onclick = () => {
    const kind = b.dataset.newTile, field = b.dataset.field;
    ctx.openBlock(kind, {from: ctx.blockValue(kind, ctx.compose()[field]) || undefined, apply: (c, id) => { c[field] = id; c.override = null; }});
  });
  host.querySelectorAll('[data-edit-tile]').forEach(b => b.onclick = () => ctx.openBlock(b.dataset.editTile, {id: b.dataset.id}));
  host.querySelectorAll('[data-make-examples]').forEach(b => b.onclick = () => ctx.makeExamples(b.dataset.makeExamples));
  host.querySelectorAll('[data-clear-angle]').forEach(b => b.onclick = () => ctx.edit(c => { c.angle = ''; }));
}
