/* Image gen dashboard front end. No build step. Talks to server.py on the same origin. Block kinds, their fields and
   the prompt diff are shared with the scene editor's composer (blocks.js). */
import { KINDS, RATINGS, fieldsHtml as sharedFieldsHtml, getp, setp, blank, wordDiff } from './blocks.js';
import { isAgent, fullUrl, rateFields, lightboxKey, lightboxHtml, compareHtml } from './gallery.js';
import {isExternal, externalReplayNotice, providerLabel} from './provenance.js';
import ALWAYS_NEGATIVE from './always-negative.json' with {type: 'json'};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = o => JSON.parse(JSON.stringify(o));
$('[data-always-neg]').textContent = `${ALWAYS_NEGATIVE.join(', ')} always stays in`;

async function api(path, body) {
  const opt = body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
  const r = await fetch(path, opt);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || r.statusText); e.data = j; e.status = r.status; throw e; }
  return j;
}
function portraitUrl(path) {
  if (!path) return '';
  if (path.startsWith('island/private/imagegen/portraits/')) return '/priv/portraits/' + path.slice(34);
  if (path.startsWith('island/private/imagegen/outputs/')) return '/thumb/' + path.slice(32).replace(/\.png$/, '.webp');
  return '/repo/' + path;
}
function toastUndo(msg, onUndo, ms = 5000) {
  const t = $('#toast'); t.hidden = false;
  t.innerHTML = `<span>${esc(msg)}</span> <button class="btn sm" id="undoBtn">Undo</button>`;
  $('#undoBtn').onclick = () => { t.hidden = true; onUndo(); };
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, ms);
}
function toast(msg, ms = 2600) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, ms);
}
const store = {
  get(k, d) { try { const v = localStorage.getItem('imagegen.' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('imagegen.' + k, JSON.stringify(v)); } catch { /* private mode */ } },
};

/* ------------------------------------------------------------ presets */
let P = {};
const TYPES = KINDS.map(([t, label]) => [t, label]);
const byId = (t, id) => (P[t] || []).find(x => x.id === id);
const live = t => (P[t] || []).filter(x => !x.archived);
const ref = (t, id) => { const p = byId(t, id); return p ? { id, v: p.v } : null; };
const manPreset = () => live('character').find(c => c.data.generic);
async function loadPresets() { P = await api('/api/presets'); }

/* ------------------------------------------------------------ compose state */
const DEFAULT = {
  chars: [], man: false, outfit: {}, useShort: true, castTag: '', style: 'background', rating: 'safe', model: 'rdbt',
  steps: '', cfg: '', framing: 'portrait', cams: [], scene: '', sceneRefs: [], negs: null, charNegOff: {}, styleNegOff: false,
  seedMode: 'random', seed: '', count: 4, override: null,
  ipa: { on: false, strength: 0.6, cutout: false }, fix: { on: false, denoise: 0.65 }, omRef: '',
};
let st = Object.assign(clone(DEFAULT), store.get('compose', {}));
st.ipa = Object.assign(clone(DEFAULT.ipa), st.ipa || {}); st.fix = Object.assign(clone(DEFAULT.fix), st.fix || {});
const save = () => store.set('compose', st);

function activeNegs() {
  if (!st.negs) st.negs = live('negative').filter(n => n.data.default).map(n => n.id);
  return st.negs.filter(id => byId('negative', id));
}
function ratingCap() {
  let cap = 2, who = '';
  for (const id of st.chars) {
    const c = byId('character', id); const k = c ? RATINGS.indexOf(c.data.rating_cap) : -1;
    if (k >= 0 && k < cap) { cap = k; who = c.data.name; }
  }
  return { cap, who };
}
function effRating() { const { cap } = ratingCap(); return RATINGS[Math.min(RATINGS.indexOf(st.rating), cap)] || 'safe'; }
function autoCast() {
  const girls = st.chars.filter(id => (byId('character', id)?.data.gender || 'female') === 'female').length;
  const boys = st.chars.filter(id => byId('character', id)?.data.gender === 'male').length + (st.man ? 1 : 0);
  const t = [];
  if (girls) t.push(girls === 1 ? '1girl' : `${girls}girls`);
  if (boys) t.push(boys === 1 ? '1boy' : `${boys}boys`);
  return t.join(', ');
}
function charBlock(c, group) {
  const d = c.data;
  if (group && st.useShort && d.short) return d.short + (st.outfit[c.id] && d.outfit ? `, wearing ${d.outfit}` : '');
  return [d.generic ? '' : d.name, d.age, d.look, d.signature, d.build, st.outfit[c.id] && d.outfit ? `wearing ${d.outfit}` : '']
    .map(s => (s || '').trim()).filter(Boolean).join(', ');
}
function joinSmart(parts) {
  let out = '';
  for (let p of parts) {
    p = (p || '').trim(); if (!p) continue;
    if (!out) { out = p; continue; }
    out += /[.!?;:]$/.test(out) ? ' ' + p : ', ' + p;
  }
  return out;
}
function dedupeTags(list) {
  const seen = new Set(), out = [];
  for (const t of list.join(', ').split(',')) {
    const s = t.trim(); const k = s.toLowerCase();
    if (s && !seen.has(k)) { seen.add(k); out.push(s); }
  }
  return out.join(', ');
}
function assemble() {
  const style = byId('style', st.style)?.data || {};
  const chars = st.chars.map(id => byId('character', id)).filter(Boolean);
  const group = chars.length + (st.man ? 1 : 0) > 1;
  const blocks = chars.map(c => charBlock(c, group));
  const man = manPreset();
  if (st.man && man) blocks.push(charBlock(man, false));
  const head = [style.quality, effRating(), st.castTag.trim() || autoCast(), style.anchors].filter(Boolean).join(', ');
  const body = blocks.join('; ');
  const cams = st.cams.map(id => byId('camera', id)?.data.prompt).filter(Boolean).join(', ');
  const fr = byId('framing', st.framing)?.data.prompt || '';
  const pos = joinSmart([head, body, st.scene, cams, fr, style.suffix]);
  const negList = activeNegs().map(id => byId('negative', id).data.text);
  if (style.negative && !st.styleNegOff) negList.push(style.negative);
  for (const c of chars.concat(st.man && man ? [man] : [])) if (c.data.negative && !st.charNegOff[c.id]) negList.push(c.data.negative);
  negList.push(ALWAYS_NEGATIVE.join(', '));
  return { positive: pos, negative: dedupeTags(negList) };
}

/* ------------------------------------------------------------ compose UI */
function chip(label, on, attrs = '', extra = '') {
  return `<button class="chip${on ? ' on' : ''}" ${attrs}>${esc(label)}${extra}</button>`;
}
function renderControls() {
  const cast = live('character').filter(c => !c.data.generic);
  $('#charCards').innerHTML = cast.map(c => {
    const k = st.chars.indexOf(c.id);
    const img = c.data.portrait ? `<img src="${esc(portraitUrl(c.data.portrait))}" alt="" loading="lazy">` : `<div class="noport"><i class="ph ph-user"></i></div>`;
    return `<button class="card${k >= 0 ? ' on' : ''}${CE.id === c.id ? ' editing' : ''}" data-char="${esc(c.id)}" title="${esc(charBlock(c, false))}">${img}${k >= 0 ? `<i class="n">${k + 1}</i>` : ''}<span>${esc(c.data.name)}</span><em class="edit" data-edit="${esc(c.id)}" role="button" aria-label="Edit ${esc(c.data.name)}" title="Edit ${esc(c.data.name)}"><i class="ph ph-pencil-simple"></i></em></button>`;
  }).join('') + `<button class="card newcard${CE.isNew ? ' editing' : ''}" data-newchar="1" title="New character"><div class="noport"><i class="ph ph-plus"></i></div><span>New</span></button>`;
  const man = manPreset();
  const sel = st.chars.map(id => byId('character', id)).filter(Boolean);
  let ex = '';
  if (man) ex += chip('+ unnamed man', st.man, 'data-man="1"', '');
  ex += sel.filter(c => c.data.outfit).map(c => chip(`${c.data.name}'s outfit`, !!st.outfit[c.id], `data-outfit="${esc(c.id)}"`)).join('');
  if (sel.length + (st.man ? 1 : 0) > 1) ex += chip('Short looks in groups', st.useShort, 'data-short="1"');
  ex += `<input id="castIn" type="text" class="mono" style="width:150px;padding:4px 8px" aria-label="Cast tag" placeholder="${esc(autoCast() || 'cast tag')}" value="${esc(st.castTag)}" title="Cast tag. Leave empty to fill it in from the picks.">`;
  $('#charExtras').innerHTML = ex;
  $('#castHint').textContent = st.chars.length ? `${st.chars.length} of 3 picked` : 'pick 1 to 3';

  $('#styleChips').innerHTML = live('style').map(s => chip(s.data.name, s.id === st.style, `data-style="${esc(s.id)}" title="${esc(s.data.notes || '')}"`)).join('');
  const { cap, who } = ratingCap();
  $('#ratingSeg').innerHTML = RATINGS.map((r, i) => `<button data-rating="${r}" class="${effRating() === r ? 'on' : ''}" ${i > cap ? 'disabled' : ''}>${r}</button>`).join('');
  $('#ratingNote').textContent = cap < 2 ? `${who}'s preset caps the rating at ${RATINGS[cap]}.` : '';
  const models = live('model');
  $('#modelSel').innerHTML = models.map(m => `<option value="${esc(m.id)}" ${m.id === st.model ? 'selected' : ''}>${esc(m.data.name)}</option>`).join('');
  $('#framingChips').innerHTML = live('framing').map(f => chip(f.data.name, f.id === st.framing, `data-framing="${esc(f.id)}"`, `<small>${f.data.w}×${f.data.h}</small>`)).join('');
  const fr = byId('framing', st.framing)?.data;
  $('#sizeHint').textContent = fr ? `${fr.w} × ${fr.h}` : '';
  $('#camChips').innerHTML = live('camera').map(c => chip(c.data.name, st.cams.includes(c.id), `data-cam="${esc(c.id)}" title="${esc(c.data.prompt + (c.data.notes ? '. ' + c.data.notes : ''))}"`)).join('');

  const scenes = live('scene');
  const mine = scenes.filter(s => st.chars.some(id => s.data.name.toLowerCase().includes(`(${id})`)));
  const opt = s => `<option value="${esc(s.id)}">${esc(s.data.name)}</option>`;
  $('#snippetSel').innerHTML = `<option value="">Insert a saved scene</option>` +
    (mine.length ? `<optgroup label="For your picks">${mine.map(opt).join('')}</optgroup>` : '') +
    `<optgroup label="All scenes">${scenes.map(opt).join('')}</optgroup>`;

  const negs = activeNegs();
  let nc = `<span class="chip on locked" title="Always on">${esc(ALWAYS_NEGATIVE.join(', '))}</span>`;
  nc += live('negative').map(n => chip(n.data.name, negs.includes(n.id), `data-neg="${esc(n.id)}" title="${esc(n.data.text)}"`)).join('');
  const style = byId('style', st.style)?.data;
  if (style?.negative) nc += chip('Style: ' + style.negative, !st.styleNegOff, 'data-styleneg="1"');
  for (const c of sel.concat(st.man && man ? [man] : [])) if (c.data.negative) nc += chip(`${c.data.generic ? 'Man' : c.data.name}: ${c.data.negative}`, !st.charNegOff[c.id], `data-charneg="${esc(c.id)}"`);
  $('#negChips').innerHTML = nc;

  renderOnModel();
  $('#seedSeg').innerHTML = ['random', 'fixed'].map(m => `<button data-seedmode="${m}" class="${st.seedMode === m ? 'on' : ''}">${m}</button>`).join('');
  $('#seedIn').disabled = st.seedMode !== 'fixed';
  $('#seedIn').value = st.seed;
  $('#cntVal').textContent = st.count;
  const md = byId('model', st.model)?.data || {};
  $('#stepsIn').placeholder = md.steps ?? 30; $('#cfgIn').placeholder = md.cfg ?? 5;
  $('#stepsIn').value = st.steps; $('#cfgIn').value = st.cfg;
  updatePreview();
  updateGenButton();
}
function updatePreview() {
  const a = assemble();
  const pos = st.override ? st.override.positive : a.positive;
  const neg = st.override ? st.override.negative : a.negative;
  if (document.activeElement !== $('#posOut')) $('#posOut').value = pos;
  if (document.activeElement !== $('#negOut')) $('#negOut').value = neg;
  $('#editedBadge').hidden = $('#resetPrompt').hidden = !st.override;
  const n = pos.length;
  $('#posLen').textContent = `${n} characters`;
  const w = $('#lenWarn');
  if (n > 950) { w.hidden = false; w.textContent = 'This is long. The flat round-27 renders came from prompts of about 850 characters. Try cutting what the camera doesn\'t need.'; }
  else if (n > 750) { w.hidden = false; w.textContent = 'Getting long. Round-28 prompts ran 500 to 650 characters; short prompts about her worked best.'; }
  else w.hidden = true;
  save();
}
function wireCompose() {
  $('#controls').addEventListener('click', e => {
    const ed = e.target.closest('[data-edit]');
    if (ed) { e.stopPropagation(); return openCharEditor(ed.dataset.edit); }
    if (e.target.closest('#charEditor')) return;
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset;
    if (d.newchar) return openCharEditor(null);
    if (d.ipaon) { st.ipa.on = d.ipaon === 'on'; return renderControls(); }
    if (d.fixon) { st.fix.on = d.fixon === 'on'; return renderControls(); }
    if (d.ipacut) { st.ipa.cutout = !st.ipa.cutout; return renderControls(); }
    if (d.omreset) { st.omRef = ''; return renderControls(); }
    if (d.omref) return openPortraitPicker(st.chars[0], path => { st.omRef = path; renderControls(); });
    if (d.char) {
      st.omRef = '';
      const k = st.chars.indexOf(d.char);
      if (k >= 0) st.chars.splice(k, 1);
      else if (st.chars.length >= 3) return toast('Up to 3 characters.');
      else st.chars.push(d.char);
    } else if (d.man) st.man = !st.man;
    else if (d.outfit) st.outfit[d.outfit] = !st.outfit[d.outfit];
    else if (d.short) st.useShort = !st.useShort;
    else if (d.style) applyStyle(d.style);
    else if (d.rating) st.rating = d.rating;
    else if (d.framing) st.framing = d.framing;
    else if (d.cam) st.cams = st.cams.includes(d.cam) ? st.cams.filter(x => x !== d.cam) : st.cams.concat(d.cam);
    else if (d.neg) { const n = activeNegs(); st.negs = n.includes(d.neg) ? n.filter(x => x !== d.neg) : n.concat(d.neg); }
    else if (d.styleneg) st.styleNegOff = !st.styleNegOff;
    else if (d.charneg) st.charNegOff[d.charneg] = !st.charNegOff[d.charneg];
    else if (d.seedmode) { st.seedMode = d.seedmode; if (d.seedmode === 'fixed' && !st.seed) st.seed = Math.floor(Math.random() * 2 ** 31); }
    else return;
    renderControls();
  });
  $('#controls').addEventListener('input', e => {
    if (e.target.id === 'castIn') { st.castTag = e.target.value; updatePreview(); }
    if (e.target.id === 'ipaStr') { st.ipa.strength = +e.target.value; $('#ipaStrVal').textContent = st.ipa.strength.toFixed(2); save(); }
    if (e.target.id === 'fixDen') { st.fix.denoise = +e.target.value; $('#fixDenVal').textContent = st.fix.denoise.toFixed(2); save(); }
  });
  $('#modelSel').onchange = e => { st.model = e.target.value; renderControls(); };
  $('#sceneText').value = st.scene;
  $('#sceneText').oninput = e => { st.scene = e.target.value; updatePreview(); };
  $('#snippetSel').onchange = e => {
    const s = byId('scene', e.target.value); e.target.value = ''; if (!s) return;
    st.scene = st.scene.trim() ? st.scene.trim() + ' ' + s.data.text : s.data.text;
    if (!st.sceneRefs.includes(s.id)) st.sceneRefs.push(s.id);
    if (s.data.rating) st.rating = s.data.rating;
    $('#sceneText').value = st.scene; renderControls();
  };
  $('#saveSnippet').onclick = async () => {
    if (!st.scene.trim()) return toast('Write some scene text first.');
    const name = prompt('Name for this scene snippet', st.chars.length ? `New scene (${st.chars[0]})` : 'New scene');
    if (!name) return;
    const rec = await api('/api/preset/scene/new/create', { name, data: { name, text: st.scene.trim(), rating: effRating(), notes: '' } });
    await loadPresets(); st.sceneRefs.push(rec.id); renderControls(); toast('Scene saved.');
  };
  $('#seedIn').oninput = e => { st.seed = e.target.value; save(); };
  $('#stepsIn').oninput = e => { st.steps = e.target.value; save(); };
  $('#cfgIn').oninput = e => { st.cfg = e.target.value; save(); };
  $('#cntMinus').onclick = () => { st.count = Math.max(1, st.count - 1); renderControls(); };
  $('#cntPlus').onclick = () => { st.count = Math.min(8, st.count + 1); renderControls(); };
  const onEdit = () => { st.override = { positive: $('#posOut').value, negative: $('#negOut').value }; $('#editedBadge').hidden = $('#resetPrompt').hidden = false; updatePreview(); };
  $('#posOut').oninput = onEdit; $('#negOut').oninput = onEdit;
  $('#resetPrompt').onclick = () => { st.override = null; $('#posOut').blur(); $('#negOut').blur(); updatePreview(); };
  $('#genBtn').onclick = () => generate();
}
function applyStyle(id) {
  st.style = id;
  const d = byId('style', id)?.data.defaults || {};
  if (d.rating) st.rating = d.rating;
  if (d.framing && byId('framing', d.framing)) st.framing = d.framing;
  if (d.model && byId('model', d.model)) st.model = d.model;
  if (Array.isArray(d.negatives)) st.negs = d.negatives.filter(n => byId('negative', n));
}

/* ------------------------------------------------------------ keep on-model (IP-Adapter reference, head repaint) */
function omChar() { return st.chars.length === 1 && !st.man ? byId('character', st.chars[0]) : null; }
function omRefPath() { const c = omChar(); return st.omRef || c?.data.portrait || ''; }
function repaintPrompt() {
  const c = omChar(); if (!c) return '';
  const style = byId('style', st.style)?.data || {};
  const d = c.data;
  // only this character's own features (the consistency test put glasses on Saki with a generic "same glasses" line)
  const own = [d.name, d.age, d.look, d.signature].map(x => (x || '').trim()).filter(Boolean).join(', ');
  return joinSmart([style.quality, effRating(), 'Two panels side by side showing the same woman, a close-up of her head.',
    'Both panels show the same face, the same hairstyle, the same hair colour and the same eyes.', own + '.']);
}
function renderOnModel() {
  const c = omChar(), ok = !!c && !!omRefPath();
  const n = st.chars.length + (st.man ? 1 : 0);
  $('#onModel').classList.toggle('off', !ok);
  $('#omHint').textContent = n === 0 ? 'pick one character' : n > 1 ? 'one character only for now' : !omRefPath() ? 'her preset has no portrait' : '';
  const ref = omRefPath();
  $('#omRef').innerHTML = c ? `${ref ? `<img src="${esc(portraitUrl(ref))}" alt="">` : '<div class="noport"><i class="ph ph-user"></i></div>'}
    <div class="t"><b>Reference image</b><div class="hint">${st.omRef ? 'Picked for this run' : `${esc(c.data.name)}'s portrait`}</div></div>
    <div class="row gap8" style="margin-left:auto"><button class="btn ghost sm" data-omref="1">Change</button>${st.omRef ? '<button class="btn ghost sm" data-omreset="1">Use portrait</button>' : ''}</div>`
    : `<div class="hint">${n > 1 ? 'With two or more people these are off for now. Pick one character to use them.' : 'Pick one character to use her portrait as the reference.'}</div>`;
  $('#ipaSeg').innerHTML = ['off', 'on'].map(v => `<button data-ipaon="${v}" class="${(st.ipa.on && ok) === (v === 'on') ? 'on' : ''}" ${ok ? '' : 'disabled'}>${v}</button>`).join('');
  $('#fixSeg').innerHTML = ['off', 'on'].map(v => `<button data-fixon="${v}" class="${(st.fix.on && ok) === (v === 'on') ? 'on' : ''}" ${ok ? '' : 'disabled'}>${v}</button>`).join('');
  $('#ipaCtl').hidden = !(st.ipa.on && ok); $('#fixCtl').hidden = !(st.fix.on && ok);
  $('#ipaStr').value = st.ipa.strength; $('#ipaStrVal').textContent = (+st.ipa.strength).toFixed(2);
  $('#ipaCut').innerHTML = chip('Cut out onto white', st.ipa.cutout, 'data-ipacut="1" title="Uses the portrait cut out onto white, so the mint background doesn\'t leak in (the background tends to go white instead)."');
  $('#fixDen').value = st.fix.denoise; $('#fixDenVal').textContent = (+st.fix.denoise).toFixed(2);
  $('#fixPrompt').textContent = repaintPrompt();
}
function omBody() {
  const c = omChar(), ref = omRefPath();
  if (!c || !ref) return { ipa: null, repaint: null };
  return {
    ipa: st.ipa.on ? { ref, strength: +st.ipa.strength, cutout: !!st.ipa.cutout } : null,
    repaint: st.fix.on ? { ref, denoise: +st.fix.denoise, prompt: repaintPrompt() } : null,
  };
}
function omBadges(x) {
  const b = [];
  if (x?.ipa) b.push(`reference ${(+x.ipa.strength).toFixed(2)}${x.ipa.cutout ? ', cut-out' : ''}`);
  if (x?.repaint) b.push(x.repaint.skipped ? 'face fix skipped' : `face fix ${(+x.repaint.denoise).toFixed(2)}`);
  return b.length ? `<span class="omb">${b.map(t => `<span class="badge">${esc(t)}</span>`).join('')}</span>` : '';
}

/* ------------------------------------------------------------ generate */
function genBody(over = {}) {
  const a = assemble();
  const md = byId('model', st.model)?.data || {};
  const fr = byId('framing', st.framing)?.data || { w: 896, h: 1152 };
  const sceneRefs = st.sceneRefs.filter(id => { const s = byId('scene', id); return s && st.scene.includes(s.data.text.slice(0, 40)); });
  return Object.assign({
    positive: st.override ? st.override.positive : a.positive,
    negative: st.override ? st.override.negative : a.negative,
    overridden: !!st.override,
    model_file: md.file, steps: +st.steps || md.steps || 30, cfg: +st.cfg || md.cfg || 5, sampler: md.sampler, scheduler: md.scheduler,
    w: fr.w, h: fr.h, count: st.count, seed_mode: st.seedMode, seed: +st.seed || 0,
    rating: effRating(), scene_text: st.scene, characters: st.chars.concat(st.man ? ['man'] : []),
    presets: {
      characters: st.chars.map(id => ref('character', id)).filter(Boolean), man: st.man && manPreset() ? ref('character', manPreset().id) : null,
      style: ref('style', st.style), framing: ref('framing', st.framing), cameras: st.cams.map(id => ref('camera', id)).filter(Boolean),
      negatives: activeNegs().map(id => ref('negative', id)), scenes: sceneRefs.map(id => ref('scene', id)), model: ref('model', st.model),
    },
    compose: clone(st), autostart: true, ...omBody(),
  }, over);
}
async function generate(body) {
  $('#genErr').hidden = true;
  body = body || genBody();
  if (!body.positive.trim()) return toast('The prompt is empty.');
  try {
    await api('/api/generate', body);
    lastJobs = 0; pollJobs(); pollState();
  } catch (e) {
    $('#genErr').hidden = false; $('#genErr').textContent = e.message;
  }
}

/* ------------------------------------------------------------ GPU session */
let S = null;
async function pollState() {
  try { S = (await api('/api/state')).session; } catch { S = null; }
  renderGpu(); updateGenButton();
}
function renderGpu() {
  const g = $('#gpu');
  if (!S) { g.innerHTML = `<div class="st bad"><b>Dashboard server not reachable</b></div>`; return; }
  const L = S.lock || {}; const v = S.vram ? `VRAM ${(S.vram.used / 1024).toFixed(1)} / ${(S.vram.total / 1024).toFixed(0)} GB` : '';
  let cls = '', b = '', sub = '', btn = '';
  if (S.state === 'on') {
    cls = 'on'; b = S.who ? `Rendering for ${S.who}` : 'GPU session on'; sub = `${Math.ceil((S.idle_left || 0) / 60)} idle min left · ${v}`;
    btn = `<button class="btn sm" id="endBtn"><i class="ph ph-stop"></i> End session</button>`;
  } else if (S.state === 'starting') {
    const taking = L.held && !L.mine;
    cls = 'on'; b = taking ? 'Taking the GPU' : 'Starting ComfyUI'; sub = taking ? S.message : v; btn = `<button class="btn sm" id="endBtn">Cancel</button>`;
  } else if (S.state === 'ending') {
    b = 'Ending session'; sub = v;
  } else if (S.state === 'lost') {
    cls = 'bad'; b = 'GPU lock lost'; sub = S.message; btn = `<button class="btn sm" id="endBtn">Close session</button>`;
  } else if (L.held && !L.mine) {
    cls = 'held'; b = `GPU in use: ${L.owner}`; sub = `since ${L.since}; your session goes first and asks it to stop · ${v}`;
    btn = `<button class="btn sm" id="startBtn"><i class="ph ph-play"></i> Start GPU session</button>`;
  } else {
    cls = S.state === 'error' ? 'bad' : ''; b = S.state === 'error' ? S.message : 'GPU free'; sub = (S.state !== 'error' && S.message ? S.message + ' · ' : '') + v;
    btn = `<button class="btn sm" id="startBtn"><i class="ph ph-play"></i> Start GPU session</button>`;
  }
  g.innerHTML = `<div class="st ${cls}"><b title="${esc(b)}">${esc(b)}</b><span>${esc(sub)}</span></div>${btn}`;
  const sb = $('#startBtn'); if (sb) sb.onclick = async () => { try { await api('/api/session/start', {}); } catch (e) { toast(e.message, 5000); } pollState(); };
  const eb = $('#endBtn'); if (eb) eb.onclick = async () => { await api('/api/session/end', {}); toast('Ending the session and freeing the GPU.'); setTimeout(pollState, 800); };
}
function updateGenButton() {
  const b = $('#genBtn'); if (!b || !S) return;
  const L = S.lock || {};
  const on = S.state === 'on' || S.state === 'starting';
  const held = !on && L.held && !L.mine;
  b.disabled = S.state === 'ending' || S.state === 'lost';
  b.textContent = `Generate ${st.count}`;
  $('#genHint').textContent = held ? `${L.owner} has the GPU; generating asks it to stop first.` : on ? '' : 'Starts a GPU session first (about a minute).';
}

/* ------------------------------------------------------------ results */
let JOBS = [], RECENT = [], lastJobs = 0, openInline = null;
const T = new Map(); // id -> tile object (merged job and log info)
function agentBadges(x) {
  if (!isAgent(x)) return '';
  const b = ['agent', x.owner, x.round, x.mode && x.mode !== 'txt2img' ? x.mode : ''].filter(Boolean).concat(x.extras || []);
  return `<span class="omb">${b.map((t, i) => `<span class="badge${i ? '' : ' agent'}">${esc(t)}</span>`).join('')}</span>`;
}
function tileFrom(o) { const t = T.get(o.id) || {}; Object.assign(t, o); T.set(o.id, t); return t; }
async function pollJobs() {
  try {
    const js = await api('/api/jobs?since=0');
    JOBS = js.map(tileFrom);
    const active = JOBS.some(j => j.status === 'queued' || j.status === 'running');
    const sig = JSON.stringify(JOBS.map(j => [j.id, j.status, Math.round((j.progress || 0) * 20), j.star, j.fav, j.reject, j.note]));
    if (sig !== pollJobs.sig) { pollJobs.sig = sig; renderRuns(); }
    renderProgress();
    clearTimeout(pollJobs.t); pollJobs.t = setTimeout(pollJobs, active ? 900 : 5000);
    if (!active && lastJobs) { lastJobs = 0; }
    if (active) lastJobs = 1;
  } catch { clearTimeout(pollJobs.t); pollJobs.t = setTimeout(pollJobs, 5000); }
}
function renderProgress() {
  const act = JOBS.filter(j => j.status === 'queued' || j.status === 'running');
  const p = $('#progress');
  if (!act.length) { p.innerHTML = ''; return; }
  const run = act[0].run_id; const all = JOBS.filter(j => j.run_id === run);
  const done = all.filter(j => j.status === 'done' || j.status === 'error').length;
  const cur = all.find(j => j.status === 'running');
  const frac = (done + (cur ? cur.progress || 0 : 0)) / all.length;
  const waiting = S && S.state !== 'on' ? (S.state === 'starting' ? (S.lock && S.lock.held && !S.lock.mine ? 'Waiting for the GPU. ' : 'Starting ComfyUI first. ') : 'Waiting for a GPU session. ') : '';
  p.innerHTML = `<span>${waiting}${done} of ${all.length} done${act.length > all.length - done ? '' : ''}</span><div class="bar"><i style="width:${(frac * 100).toFixed(0)}%"></i></div>
    <button class="btn ghost sm" id="cancelBtn">Cancel</button>`;
  $('#cancelBtn').onclick = async () => { await api('/api/cancel', {}); toast('Cancelled the rest of the queue.'); pollJobs(); };
}
function runsForResults() {
  const groups = new Map();
  for (const j of JOBS) { if (j.deleted) continue; if (!groups.has(j.run_id)) groups.set(j.run_id, []); groups.get(j.run_id).push(j); }
  const live = [...groups.entries()].reverse().map(([id, tiles]) => ({ run_id: id, tiles, live: true }));
  const seen = new Set(live.map(r => r.run_id));
  const old = RECENT.filter(r => !seen.has(r.run_id)).map(r => ({ run_id: r.run_id, tiles: r.renders.map(x => tileFrom(Object.assign({ run_id: r.run_id, status: 'done', compose: r.compose, overridden: r.overridden, presets: r.presets, characters: r.characters, rating: r.rating, ipa: r.ipa, repaint: r.repaint }, x))), at: r.at, live: false }));
  old.forEach(r => { r.tiles = r.tiles.filter(t => !t.deleted); });
  return live.concat(old.filter(r => r.tiles.length)).slice(0, 12);
}
function markIcons(t) {
  return `${t.fav ? '<i class="ph-fill ph-heart"></i>' : t.star ? '<i class="ph-fill ph-star"></i>' : ''}${t.reject ? '<i class="ph-fill ph-x-circle r"></i>' : ''}`;
}
function tileHtml(t) {
  const ar = `${t.w || 896} / ${t.h || 1152}`;
  let shot;
  if (t.status === 'done' && (t.thumb || t.file)) shot = `<img src="${t.thumb ? '/thumb/' + esc(t.thumb) : '/out/' + esc(t.file)}" alt="Seed ${t.seed}" loading="lazy">`;
  else if (t.status === 'error') shot = `<div class="ph-wait" style="aspect-ratio:${ar};padding:14px;color:var(--bad)">Failed: ${esc((t.error || '').slice(0, 160))}</div>`;
  else if (t.status === 'cancelled') shot = `<div class="ph-wait" style="aspect-ratio:${ar}">Cancelled</div>`;
  else shot = `<div class="ph-wait skel" style="aspect-ratio:${ar}">${t.status === 'running' ? (t.phase === 'repaint' ? 'Fixing face ' : '') + Math.round((t.progress || 0) * 100) + '%' : 'Queued'}</div><div class="pbar"><i style="width:${Math.round((t.progress || 0) * 100)}%"></i></div>`;
  const done = t.status === 'done';
  const inl = openInline && openInline.id === t.id ? `<div class="inline"><input type="text" id="inl" placeholder="${openInline.kind === 'reject' ? 'Why reject it? (optional)' : 'Note'}" value="${esc(openInline.kind === 'reject' ? t.reject_reason || '' : t.note || '')}"><button class="btn sm" data-a="inlsave" data-id="${esc(t.id)}">Save</button></div>` : '';
  const notes = (t.reject && t.reject_reason ? `<b>Rejected:</b> ${esc(t.reject_reason)} ` : '') + (t.note ? esc(t.note) : '');
  return `<div class="tile${t.reject ? ' rej' : ''}${t.fav ? ' fav' : ''}" data-id="${esc(t.id)}">
    <div class="shot" ${done ? `data-a="open" data-id="${esc(t.id)}"` : ''}>${shot}<div class="mark">${markIcons(t)}</div></div>
    ${done ? `<div class="tbar">${t.n ? `<span class="seed num" data-a="copyn" data-id="${esc(t.id)}" title="Picture number: name it in chat (click to copy)">#${t.n}</span>` : ''}${isExternal(t) ? `<span class="seed" title="${esc(t.provenance.engine)}">${esc(providerLabel(t))}</span>` : `<span class="seed" data-a="copyseed" data-id="${esc(t.id)}" title="Copy seed">s${t.seed}</span>`}
      <button class="ib${t.star ? ' on' : ''}" data-a="star" data-id="${esc(t.id)}" title="Star (s)"><i class="${t.star ? 'ph-fill' : 'ph'} ph-star"></i></button>
      <button class="ib${t.fav ? ' on' : ''}" data-a="fav" data-id="${esc(t.id)}" title="Favourite (f)"><i class="${t.fav ? 'ph-fill' : 'ph'} ph-heart"></i></button>
      <button class="ib r${t.reject ? ' on' : ''}" data-a="reject" data-id="${esc(t.id)}" title="Reject with a reason (x)"><i class="ph ph-x-circle"></i></button>
      <button class="ib${t.note ? ' on' : ''}" data-a="note" data-id="${esc(t.id)}" title="Note"><i class="ph ph-note-pencil"></i></button>
      <button class="ib${pins.some(p => p.id === t.id) ? ' on' : ''}" data-a="pin" data-id="${esc(t.id)}" title="Pin to compare"><i class="ph ph-columns"></i></button>
      <button class="ib" data-a="del" data-id="${esc(t.id)}" title="Delete (moves it to the trash)"><i class="ph ph-trash"></i></button>
      <button class="ib" data-a="more" data-id="${esc(t.id)}" title="More"><i class="ph ph-dots-three"></i></button></div>` : ''}
    ${inl}${notes ? `<div class="tnote">${notes}</div>` : ''}</div>`;
}
function runMeta(r) {
  const t = r.tiles[0] || {}; const c = t.compose || {};
  const names = (c.chars || []).map(id => byId('character', id)?.data.name || id).concat(c.man ? ['man'] : []).join(', ') || 'no characters';
  const style = byId('style', c.style)?.data.name || c.style || '';
  const when = r.live ? (r.run_id.slice(8, 10) + ':' + r.run_id.slice(10, 12)) : (r.at || '').slice(5, 16).replace('T', ' ');
  return `<div class="runmeta"><b>${esc(names)}</b><span>${esc(style)}</span><span>${esc((t.model_file || '').replace('.safetensors', ''))}</span><span>${t.w}×${t.h}</span><span>${esc(when)}</span>${t.overridden ? '<span class="badge">edited by hand</span>' : ''}${omBadges(t)}</div>`;
}
function renderRuns() {
  if (document.activeElement && document.activeElement.id === 'inl') return;
  const runs = runsForResults();
  $('#runs').innerHTML = runs.length ? runs.map(r => `<div class="run">${runMeta(r)}<div class="grid">${r.tiles.map(tileHtml).join('')}</div></div>`).join('')
    : `<div class="empty"><b>No pictures yet.</b>Pick a character, check the prompt above, and press Generate. The first run starts the GPU session and ComfyUI, which takes about a minute.</div>`;
  const inl = $('#inl'); if (inl) { inl.focus(); inl.onkeydown = e => { if (e.key === 'Enter') saveInline(); if (e.key === 'Escape') { openInline = null; renderRuns(); } }; }
}
async function rate(id, fields) {
  const t = T.get(id); if (!t) return;
  Object.assign(t, fields);
  try { await api('/api/render/' + encodeURIComponent(id), fields); } catch (e) { toast('Could not save: ' + e.message); }
  renderRuns(); renderTray(); if (!$('#lightbox').hidden) renderLightbox();
  if ($('#tab-history').classList.contains('on')) renderHistory();
}
async function saveInline() {
  const id = openInline.id, kind = openInline.kind, v = $('#inl').value.trim();
  openInline = null;
  if (kind === 'reject') await rate(id, rateFields('reject', { reject: false }, v));
  else await rate(id, { note: v });
}
function tileAction(a, id, btn) {
  const t = T.get(id); if (!t) return;
  if (isExternal(t) && ['sameseed', 'newseeds', 'copyseed'].includes(a)) return toast(externalReplayNotice);
  if (a === 'open') return openLightbox(id);
  if (a === 'star' || a === 'fav') return rate(id, rateFields(a, t));
  if (a === 'reject') { if (t.reject) return rate(id, rateFields(a, t)); openInline = { id, kind: 'reject' }; return renderRuns(); }
  if (a === 'note') { openInline = { id, kind: 'note' }; return renderRuns(); }
  if (a === 'inlsave') return saveInline();
  if (a === 'pin') return togglePin(t);
  if (a === 'copyn') { navigator.clipboard?.writeText('#' + t.n); return toast(`#${t.n} copied.`); }
  if (a === 'copyseed') { navigator.clipboard?.writeText(String(t.seed)); return toast(`Seed ${t.seed} copied.`); }
  if (a === 'more') return showMenu(btn, t);
  if (a === 'del') return deleteRender(id);
  if (a === 'sameseed') return sameSeed(t);
  if (a === 'newseeds') return newSeeds(t);
}
function showMenu(btn, t) {
  closeMenu();
  const m = document.createElement('div'); m.className = 'menu'; m.id = 'menu';
  m.innerHTML = `${isExternal(t) ? `<button data-a="open" data-id="${esc(t.id)}">View original settings</button>` : `<button data-a="sameseed" data-id="${esc(t.id)}"><i class="ph ph-pencil-simple"></i> Same seed, edit prompt</button>
    <button data-a="newseeds" data-id="${esc(t.id)}"><i class="ph ph-shuffle"></i> New seeds, same prompt</button>`}
    <button data-a="fullsize" data-id="${esc(t.id)}"><i class="ph ph-arrow-square-out"></i> Open the full-size PNG</button>`;
  document.body.appendChild(m);
  const r = btn.getBoundingClientRect();
  m.style.top = (window.scrollY + r.bottom + 4) + 'px';
  m.style.left = Math.max(8, Math.min(window.innerWidth - 230, r.right - 220)) + 'px';
  m.onclick = e => {
    const b = e.target.closest('button'); if (!b) return; closeMenu();
    if (b.dataset.a === 'fullsize') return window.open(fullUrl(t), '_blank');
    tileAction(b.dataset.a, b.dataset.id);
  };
}
function closeMenu() { $('#menu')?.remove(); }
// The character picks of a history run: its compose, else the ids it was saved with, else (agent renders, saved without
// picks) the cast names its prompt mentions, so Load into Compose always brings the cast along.
function castOf(r) {
  if (r.compose?.chars?.length) return {};
  let ids = (r.characters || []).filter(id => id !== 'man' && byId('character', id));
  if (!ids.length) {
    const text = (r.positive || '').toLowerCase();
    ids = (P.character || []).filter(c => c.id !== 'man' && c.data?.name && new RegExp(`\\b${c.data.name.toLowerCase().replace(/^mr\.\s*/, '')}\\b`).test(text)).map(c => c.id);
  }
  return ids.length ? { chars: ids.slice(0, 3) } : {};
}
function loadCompose(c, over) {
  st = Object.assign(clone(DEFAULT), clone(c || {}), over || {});
  $('#sceneText').value = st.scene;
  showTab('compose'); renderControls();
}
function sameSeed(t) {
  if (isExternal(t)) return toast(externalReplayNotice);
  closeOverlays();
  loadCompose(t.compose, { seedMode: 'fixed', seed: t.seed, count: 1, override: { positive: t.positive, negative: t.negative } });
  $('#posOut').focus();
  toast('Loaded with the same seed. Edit the prompt, then Generate.');
}
function newSeeds(t) {
  if (isExternal(t)) return toast(externalReplayNotice);
  closeOverlays();
  const body = genBody({
    positive: t.positive, negative: t.negative, overridden: !!t.overridden, model_file: t.model_file, w: t.w, h: t.h, seed_mode: 'random',
    compose: Object.assign(clone(t.compose || {}), { override: t.overridden ? { positive: t.positive, negative: t.negative } : null }),
  });
  if (t.presets) Object.assign(body, { presets: t.presets, characters: t.characters || [], rating: t.rating, scene_text: t.compose?.scene || '' });
  body.ipa = t.ipa || null;
  body.repaint = t.repaint ? { ref: t.repaint.ref, denoise: t.repaint.denoise, prompt: t.repaint.prompt } : null;
  generate(body);
  toast(`Queued ${body.count} new seeds with the same prompt.`);
}
function wireResults() {
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-a]');
    if (!$('#menu')?.contains(e.target) && !(b && b.dataset.a === 'more')) closeMenu();
    if (!b || !b.dataset.id || b.closest('.menu')) return;
    if (b.closest('#runs') || b.closest('#histList') || b.closest('#lightbox') || b.closest('.tgroup')) tileAction(b.dataset.a, b.dataset.id, b);
  });
}

/* ------------------------------------------------------------ lightbox */
let LB = { list: [], i: 0 };
function contextFor(id) {
  for (const r of runsForResults()) if (r.tiles.some(t => t.id === id)) return r.tiles.filter(t => t.status === 'done');
  for (const r of HIST) if (r.renders.some(x => x.id === id)) return r.renders.map(x => T.get(x.id)).filter(Boolean);
  return [T.get(id)];
}
function openLightbox(id, list) {
  LB.list = list || contextFor(id); LB.i = Math.max(0, LB.list.findIndex(t => t.id === id));
  $('#lightbox').hidden = false; renderLightbox();
}
function renderLightbox() {
  const t = LB.list[LB.i]; if (!t) return;
  $('#lightbox').innerHTML = lightboxHtml(t, { i: LB.i, n: LB.list.length, pinned: pins.some(p => p.id === t.id), raw: LB.raw, styleName: byId('style', t.compose?.style)?.data.name });
  const lbSave = () => {
    const note = $('#lbNote').value.trim(), reason = $('#lbReason').value.trim();
    const f = {}; if (note !== (t.note || '')) f.note = note; if (reason !== (t.reject_reason || '')) f.reject_reason = reason;
    if (Object.keys(f).length) rate(t.id, f);
  };
  $('#lbNote').onchange = lbSave; $('#lbReason').onchange = lbSave;
}
function wireLightbox() {
  $('#lightbox').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (e.target.classList.contains('pic') || (b && b.dataset.close)) return closeOverlays();
    if (b && b.dataset.lb) { LB.i = (LB.i + +b.dataset.lb + LB.list.length) % LB.list.length; LB.raw = false; renderLightbox(); }
    if (b && b.dataset.lbraw) { LB.raw = !LB.raw; renderLightbox(); }
    if (b && b.dataset.lbrej) { const t = LB.list[LB.i]; rate(t.id, rateFields('reject', t, $('#lbReason').value.trim())); }
  });
  document.addEventListener('keydown', e => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) { if (e.key === 'Escape') document.activeElement.blur(); return; }
    if (!$('#compare').hidden && e.key === 'Escape') return closeOverlays();
    if ($('#lightbox').hidden) return;
    const t = LB.list[LB.i], k = lightboxKey(e);
    if (k === 'close') closeOverlays();
    else if (k === 'next') { LB.i = (LB.i + 1) % LB.list.length; renderLightbox(); }
    else if (k === 'prev') { LB.i = (LB.i - 1 + LB.list.length) % LB.list.length; renderLightbox(); }
    else if (k === 'star' || k === 'fav' || k === 'reject') rate(t.id, rateFields(k, t));
    else if (k === 'del') deleteRender(t.id);
  });
}
function closeOverlays() { $('#lightbox').hidden = true; $('#compare').hidden = true; $('#lightbox').innerHTML = ''; }

/* ------------------------------------------------------------ compare */
let pins = [];
function togglePin(t) {
  pins = pins.some(p => p.id === t.id) ? pins.filter(p => p.id !== t.id) : pins.concat(t).slice(-6);
  renderTray(); renderRuns(); if (!$('#lightbox').hidden) renderLightbox();
}
function renderTray() {
  const tr = $('#tray');
  if (!pins.length) { tr.hidden = true; return; }
  tr.hidden = false;
  tr.innerHTML = pins.map(p => `<img src="/thumb/${esc(p.thumb)}" alt="">`).join('') +
    `<button class="btn primary sm" id="cmpGo" ${pins.length < 2 ? 'disabled' : ''}>Compare ${pins.length}</button><button class="btn ghost sm" id="cmpClear">Clear</button>`;
  $('#cmpGo').onclick = openCompare;
  $('#cmpClear').onclick = () => { pins = []; renderTray(); renderRuns(); };
}
function openCompare() {
  $('#compare').hidden = false;
  $('#compare').innerHTML = compareHtml(pins);
  $('#compare').onclick = e => {
    if (e.target.closest('[data-close]')) closeOverlays();
    const o = e.target.dataset.open; if (o) { $('#compare').hidden = true; openLightbox(o, pins); }
    const cd = e.target.closest('[data-cdel]'); if (cd) deleteRender(cd.dataset.cdel);
    const up = e.target.closest('[data-unpin]'); if (up) { pins = pins.filter(p => p.id !== up.dataset.unpin); renderTray(); pins.length > 1 ? openCompare() : closeOverlays(); }
  };
}

/* ------------------------------------------------------------ history */
let HIST = [];
function fillHistoryFilters() {
  $('#fChar').innerHTML = `<option value="">Anyone</option>` + live('character').map(c => `<option value="${esc(c.id)}">${esc(c.data.name)}</option>`).join('');
  $('#fPreset').innerHTML = `<option value="">Any preset</option>` + TYPES.map(([t, label]) =>
    `<optgroup label="${label}">${(P[t] || []).map(p => `<option value="${t}:${esc(p.id)}">${esc(p.data.name)}</option>`).join('')}</optgroup>`).join('');
}
// Agent renders log one picture per run; a round's runs side by side fill the row instead of one thumbnail per row.
// The row keeps the first run's prompt and settings; each thumbnail still opens its own picture.
function groupAgentRuns(runs) {
  const out = [];
  for (const r of runs) {
    const last = out[out.length - 1];
    if (last && isAgent(r) && isAgent(last) && last.owner === r.owner && (last.round || '') === (r.round || '') && last.renders.length < 24) {
      last.renders = last.renders.concat(r.renders); last.grouped = (last.grouped || 1) + 1;
    } else out.push(Object.assign({}, r, { renders: r.renders.slice() }));
  }
  return out;
}
// Infinite scroll: History asks for the next 150 runs older than the last one shown when the list's end comes near.
let HQ = null, HRAW = [], HEND = false, HMORE = false;
async function loadMoreHistory() {
  if (HEND || HMORE || TRASHVIEW || !HQ || !HRAW.length) return;
  HMORE = true;
  try {
    const last = HRAW[HRAW.length - 1], q = new URLSearchParams(HQ); q.set('before', last.at); q.set('before_n', last.last_n || 0); q.set('before_run', last.run_id);
    const more = await api('/api/history?' + q);
    HEND = more.length < 150;
    for (const r of more) r.renders.forEach(x => tileFrom(Object.assign({ run_id: r.run_id, status: 'done', compose: r.compose, overridden: r.overridden, presets: r.presets, characters: r.characters, rating: r.rating, ipa: r.ipa, repaint: r.repaint }, x)));
    HRAW = HRAW.concat(more);
    HIST = groupAgentRuns(HRAW);
    renderHistory();
  } finally { HMORE = false; }
}
addEventListener('scroll', e => {  // capture: History may scroll in the page or in a panel
  const list = document.querySelector('#histList');
  if (!list || !list.offsetParent) return;
  const el = e.target === document ? document.scrollingElement : e.target;
  if (el.contains(list) && el.scrollTop + el.clientHeight > el.scrollHeight - 1500) loadMoreHistory();
}, { passive: true, capture: true });
async function loadHistory() {
  const q = new URLSearchParams({ limit: 150 });
  if ($('#fChar').value) q.set('character', $('#fChar').value);
  if ($('#fPreset').value) q.set('preset', $('#fPreset').value);
  if ($('#fStar').checked) q.set('star', '1');
  q.set('who', $('#fWho').value);
  TRASHVIEW = false;
  HQ = q; HRAW = await api('/api/history?' + q); HEND = HRAW.length < 150;
  HIST = groupAgentRuns(HRAW);
  for (const r of HIST) r.renders.forEach(x => tileFrom(Object.assign({ run_id: r.run_id, status: 'done', compose: r.compose, overridden: r.overridden, presets: r.presets, characters: r.characters, rating: r.rating, ipa: r.ipa, repaint: r.repaint }, x)));
  renderHistory();
}
function renderHistory() {
  const L = $('#histList');
  HIST = HIST.map(r => Object.assign(r, { renders: r.renders.filter(x => !T.get(x.id)?.deleted) })).filter(r => r.renders.length);
  if (!HIST.length) { L.innerHTML = `<div class="empty"><b>Nothing here yet.</b>Runs show up here once they finish. Filters narrow them by character, preset or star.</div>`; return; }
  L.innerHTML = HIST.map(r => {
    const c = r.compose || {}; const p = r.presets || {};
    const names = isAgent(r) ? 'Agent: ' + (r.owner || '') : (c.chars || []).map(id => byId('character', id)?.data.name || id).concat(c.man ? ['man'] : []).join(', ') || 'No characters';
    const styleName = byId('style', p.style?.id)?.data.name || p.style?.id || '';
    const nStar = r.renders.filter(x => T.get(x.id)?.star || T.get(x.id)?.fav).length;
    return `<div class="hrun"><div class="meta"><b>${esc(names)}</b>
      <span>${isExternal(r) ? 'Imported ' + esc((r.imported_at || '(time not recorded)').replace('T', ' ').slice(0, 19)) : esc(r.at.replace('T', ' ').slice(0, 16))} · ${r.renders.length} picture${r.renders.length === 1 ? '' : 's'}${nStar ? ` · ${nStar} starred` : ''}</span>
      <span>${isExternal(r) ? esc(providerLabel(r)) : isAgent(r) ? `${r.steps ? r.steps + ' steps, CFG ' + r.cfg + ', ' : ''}${esc(r.sampler || '')} ` : `${esc(styleName)}${p.style ? ` v${p.style.v}` : ''} · ${esc(r.rating || '')} · `}${esc((r.model_file || '').replace('.safetensors', ''))} · ${r.w}×${r.h}${isAgent(r) && !isExternal(r) ? ' · s' + r.renders[0].seed : ''}</span>
      ${agentBadges(r)}${r.overridden || r.ipa || r.repaint ? `<span class="omb">${r.overridden ? '<span class="badge">edited by hand</span>' : ''}${omBadges(r)}</span>` : ''}
      <div class="clip">${esc(r.positive)}</div>
      <div class="row gap8 wrap"><button class="btn sm" ${isExternal(r) ? 'data-settings' : 'data-load'}="${esc(r.run_id)}"><i class="ph ph-arrow-bend-up-left"></i> ${isExternal(r) ? 'View original settings' : 'Load into Compose'}</button>
        <button class="btn ghost sm" data-showp="${esc(r.run_id)}">Full prompt</button>
        <button class="btn ghost sm danger" data-delrun="${esc(r.run_id)}"><i class="ph ph-trash"></i> Delete run</button></div>
      <div class="ptext" id="hp-${esc(r.run_id)}" hidden>${esc(r.positive)}\n\nNegative: ${esc(r.negative)}</div></div>
      <div class="strip">${r.renders.filter(x => !T.get(x.id)?.deleted).map(x => { const t = T.get(x.id); return `<div class="th${t.reject ? ' rej' : ''}" data-a="open" data-id="${esc(x.id)}"><img src="/thumb/${esc(x.thumb)}" alt="Seed ${x.seed}" loading="lazy">${x.n ? `<span class="num" title="Picture number: name it in chat">#${x.n}</span>` : ''}<div class="mark">${markIcons(t)}</div><button class="ib tdel" data-a="del" data-id="${esc(x.id)}" title="Delete"><i class="ph ph-trash"></i></button></div>`; }).join('')}</div></div>`;
  }).join('');
}
function wireHistory() {
  ['#fChar', '#fPreset', '#fStar', '#fWho'].forEach(s => { $(s).onchange = loadHistory; });
  $('#fRefresh').onclick = loadHistory;
  $('#fTrash').onclick = loadTrash;
  $('#histList').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.load) {
      const r = HIST.find(x => x.run_id === b.dataset.load);
      if (isExternal(r)) return toast(externalReplayNotice);
      loadCompose(r.compose, { seedMode: 'random', override: r.overridden || isAgent(r) ? { positive: r.positive, negative: r.negative } : null, ...castOf(r) });
      toast(isAgent(r) ? 'Prompt loaded into Compose. Its model and size are not copied.' : 'Settings loaded into Compose.');
    }
    if (b.dataset.settings) { const r = HIST.find(x => x.run_id === b.dataset.settings); if (r?.renders[0]) openLightbox(r.renders[0].id); }
    if (b.dataset.showp) { const el = $('#hp-' + CSS.escape(b.dataset.showp)); el.hidden = !el.hidden; }
    if (b.dataset.delrun) deleteRun(b.dataset.delrun);
    if (b.dataset.trestore) restoreRenders([b.dataset.trestore]);
    if (b.id === 'trashEmpty') emptyTrash();
    if (b.id === 'trashBack') loadHistory();
  });
}

/* ------------------------------------------------------------ presets editor */
const portraitField = (key, v, label) => `<div class="portfield"><div class="lbl">${label}</div><div class="row gap8">
    ${v ? `<img class="pthumb" src="${esc(portraitUrl(v))}" alt="">` : `<div class="pthumb noport"><i class="ph ph-user"></i></div>`}
    <div class="col"><div class="row gap8 wrap"><button class="btn sm" data-pickport="1"><i class="ph ph-images"></i> Choose</button>
    <label class="btn sm upl"><i class="ph ph-upload-simple"></i> Upload<input type="file" accept="image/png,image/webp,image/jpeg" data-upport="1" hidden></label></div>
    <div class="hint mono mt4 path">${esc(v || 'no portrait')}</div></div></div></div>`;
const fieldCtx = () => ({ live, files: PE.files, portrait: portraitField, chip });
function fieldsHtml(type, draft = PE.draft) { return sharedFieldsHtml(type, draft, fieldCtx()); }
let PE = { type: store.get('ptype', 'character'), id: null, rec: null, draft: null, diffV: null, files: [] };
function renderPList() {
  $('#ptypes').innerHTML = TYPES.map(([t, l]) => chip(l, t === PE.type, `data-ptype="${t}"`)).join('');
  const items = (P[PE.type] || []).slice().sort((a, b) => a.archived - b.archived);
  if (!PE.id || !byId(PE.type, PE.id)) PE.id = items[0]?.id || null;
  $('#pitems').innerHTML = items.map(p => `<button class="pitem${p.id === PE.id ? ' on' : ''}" data-pid="${esc(p.id)}">
    ${PE.type === 'character' ? (p.data.portrait ? `<img src="${esc(portraitUrl(p.data.portrait))}" alt="">` : `<i class="ph ph-user noimg"></i>`) : ''}
    <span>${esc(p.data.name)}${p.archived ? ' (archived)' : ''}${p.private ? ' · private' : ''}</span>${p.claude_note ? '<span class="dot" title="Has a note to Claude"><i class="ph-fill ph-chat-circle"></i></span>' : ''}<small>v${p.v}</small></button>`).join('');
  $('#pSelMobile').innerHTML = items.map(p => `<option value="${esc(p.id)}" ${p.id === PE.id ? 'selected' : ''}>${esc(p.data.name)} (v${p.v})</option>`).join('');
}
function peDirty() { return !!(PE.rec && PE.draft && (JSON.stringify(PE.draft) !== JSON.stringify(PE.rec.versions.at(-1).data) || (PE.note ?? '') !== (PE.rec.claude_note || ''))); }
async function openPreset(id, force) {
  if (!force && id !== PE.id && peDirty() && !confirm(`Discard your unsaved changes to ${PE.draft.name || PE.id}?`)) { renderPList(); return; }
  PE.id = id; PE.diffV = null; renderPList();
  if (!id) { $('#peditor').innerHTML = `<div class="empty"><b>No presets of this type.</b>Use New preset to add one.</div>`; return; }
  PE.rec = await api(`/api/preset/${PE.type}/${id}`);
  PE.draft = clone(PE.rec.versions.at(-1).data); PE.note = PE.rec.claude_note || '';
  renderPEditor(); loadTuning();
}
function renderPEditor() {
  const rec = PE.rec; const cur = rec.versions.at(-1);
  const changed = peDirty();
  const port = PE.type === 'character' && PE.draft.portrait ? `<img class="pport" src="${esc(portraitUrl(PE.draft.portrait))}" alt="">` : '';
  let preview = '';
  if (PE.type === 'character') preview = `<div><div class="lbl">How it goes into the prompt</div><div class="ptext">${esc(charBlock({ id: rec.id, data: PE.draft }, false))}</div></div>`;
  $('#peditor').innerHTML = `<div class="pe"><div>
    <div class="row gap8" style="align-items:flex-start"><div style="margin-right:auto"><h2>${esc(PE.draft.name || rec.id)}</h2>
      <div class="hint">${esc(TYPES.find(t => t[0] === PE.type)[1].replace(/s$/, ''))} · id ${esc(rec.id)} · v${cur.v} saved ${esc(cur.at.replace('T', ' '))}</div>
      <div class="row gap8 wrap mt8"><button class="btn ghost sm" id="pUse">Use in Compose</button><button class="btn ghost sm" id="pDup">Duplicate</button>
      <button class="btn ghost sm danger" id="pArch">${rec.archived ? 'Unarchive' : 'Archive'}</button></div></div>${PE.type === 'character' ? '' : port}</div>
    <div class="pfields mt8">${fieldsHtml(PE.type)}${preview}</div>
    <div class="psave row gap8 wrap">
      <input type="text" id="pMsg" placeholder="What changed (optional)" style="max-width:320px">
      <button class="btn primary" id="pSave" ${changed ? '' : 'disabled'}>${peSaveLabel()}</button>
      <button class="btn ghost" id="pRevert" ${changed ? '' : 'disabled'}>Discard changes</button>
    </div></div>
    <div class="pside">
      <div class="box"><h3>Note to Claude</h3><div class="hint" style="margin-bottom:6px">What's wrong with this preset, or what to try next. Claude reads these when tuning. Saved with the Save button.</div>
        <textarea id="cNote" rows="4">${esc(PE.note ?? rec.claude_note ?? '')}</textarea>
        <div class="hint mt4">${rec.claude_note_at ? 'last saved ' + esc(rec.claude_note_at.replace('T', ' ')) : ''}</div></div>
      <div class="box"><h3>Versions</h3><div class="vers">${rec.versions.slice().reverse().map(v => `<div class="ver"><span class="v">v${v.v}</span>
        <span class="m" title="${esc(v.message || '')}">${esc(v.at.slice(5, 16).replace('T', ' '))} ${esc(v.message || '')}</span>
        <span>${v.v !== cur.v ? `<button class="btn ghost sm" data-diff="${v.v}">Diff</button> <button class="btn ghost sm" data-restore="${v.v}">Restore</button>` : '<span class="hint">current</span>'}</span></div>`).join('')}</div>
        <div class="diff" id="pDiff"></div></div>
      <div class="box"><h3>Tuning</h3><div id="tuning" class="hint">Loading renders...</div></div>
    </div></div>`;
  if (PE.diffV) showDiff(PE.diffV);
}
function showDiff(v) {
  PE.diffV = v;
  const old = PE.rec.versions.find(x => x.v === v).data, cur = PE.rec.versions.at(-1).data;
  const keys = [...new Set([...Object.keys(old), ...Object.keys(cur)])];
  const rows = keys.filter(k => JSON.stringify(old[k]) !== JSON.stringify(cur[k])).map(k => {
    const a = typeof old[k] === 'string' ? old[k] : JSON.stringify(old[k] ?? ''), b = typeof cur[k] === 'string' ? cur[k] : JSON.stringify(cur[k] ?? '');
    return `<div><div class="dk">${esc(k)}</div><div class="ptext">${wordDiff(a, b)}</div></div>`;
  });
  $('#pDiff').innerHTML = `<div class="hint">v${v} to current (v${PE.rec.versions.at(-1).v})</div>` + (rows.join('') || '<div class="hint">No differences.</div>');
}
async function loadTuning() {
  const groups = await api(`/api/tuning/${PE.type}/${PE.id}`);
  const el = $('#tuning'); if (!el) return;
  if (!groups.length) { el.innerHTML = 'No renders with this preset yet.'; return; }
  if (!groups.some(g => g.renders)) { el.innerHTML = groups.map(g => `<div class="stat"><b>v${g.v}</b> · ${g.deleted} deleted</div>`).join(''); return; }
  const cur = PE.rec.versions.at(-1).v;
  el.innerHTML = groups.map(g => {
    g.items.forEach(x => tileFrom(Object.assign({ status: 'done' }, x)));
    return `<div class="tgroup"><div class="stat"><b>v${g.v}</b>${g.v === cur ? ' (current)' : ''} · ${g.renders} renders · <b>${g.stars}</b> starred${g.favs ? `, ${g.favs} favourite` : ''} · ${g.rejects} rejected${g.edited ? ` · ${g.edited} hand-edited` : ''}${g.deleted ? ` · ${g.deleted} deleted` : ''}</div>
      <div class="th">${g.items.map(x => `<div class="t" data-a="open" data-id="${esc(x.id)}"><img src="/thumb/${esc(x.thumb)}" alt="Seed ${x.seed}" loading="lazy">${x.fav ? '<i class="ph-fill ph-heart"></i>' : x.star ? '<i class="ph-fill ph-star"></i>' : x.reject ? '<i class="ph-fill ph-x-circle r"></i>' : ''}</div>`).join('')}</div></div>`;
  }).join('');
  $$('.tgroup [data-a="open"]').forEach(n => { n.onclick = e => { e.stopPropagation(); const list = groups.find(g => g.items.some(x => x.id === n.dataset.id)).items.map(x => T.get(x.id)); openLightbox(n.dataset.id, list); }; });
}
function wirePresets() {
  $('#ptypes').onclick = e => { const b = e.target.closest('[data-ptype]'); if (!b) return; PE.type = b.dataset.ptype; store.set('ptype', PE.type); PE.id = null; renderPList(); openPreset(PE.id); };
  $('#pitems').onclick = e => { const b = e.target.closest('[data-pid]'); if (b) openPreset(b.dataset.pid); };
  $('#pSelMobile').onchange = e => openPreset(e.target.value);
  $('#pNew').onclick = async () => {
    const data = blank(PE.type, PE.files);
    data.name = 'New ' + TYPES.find(t => t[0] === PE.type)[1].replace(/s$/, '').toLowerCase();
    const rec = await api(`/api/preset/${PE.type}/new/create`, { name: data.name, data });
    await loadPresets(); refreshAll(); openPreset(rec.id);
  };
  const ed = $('#peditor');
  ed.addEventListener('input', e => {
    if (e.target.id === 'cNote') { PE.note = e.target.value; return updateDirty(); }
    const f = e.target.dataset.f; if (!f) return;
    let v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (e.target.dataset.num) v = v === '' ? '' : +v;
    setp(PE.draft, f, v); updateDirty();
  });
  ed.addEventListener('change', async e => {
    if (e.target.dataset.upport) { const path = await uploadPortrait(e.target); if (path) { PE.draft.portrait = path; renderPEditor(); loadTuning(); } return; }
    if (e.target.tagName === 'SELECT' && e.target.dataset.f) { setp(PE.draft, e.target.dataset.f, e.target.value); updateDirty(); }
  });
  ed.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.negf) {
      const cur = getp(PE.draft, 'defaults.negatives') || []; const id = b.dataset.negf;
      setp(PE.draft, 'defaults.negatives', cur.includes(id) ? cur.filter(x => x !== id) : cur.concat(id));
      b.classList.toggle('on'); updateDirty(); return;
    }
    if (b.dataset.pickport) return openPortraitPicker(PE.id, path => { PE.draft.portrait = path; renderPEditor(); loadTuning(); });
    if (b.id === 'pSave') {
      const dataCh = JSON.stringify(PE.draft) !== JSON.stringify(PE.rec.versions.at(-1).data);
      if (dataCh) PE.rec = await api(`/api/preset/${PE.type}/${PE.id}`, { data: PE.draft, message: $('#pMsg').value.trim() });
      if ((PE.note ?? '') !== (PE.rec.claude_note || '')) PE.rec = await api(`/api/preset/${PE.type}/${PE.id}/note`, { text: PE.note });
      await loadPresets(); refreshAll(false); PE.draft = clone(PE.rec.versions.at(-1).data); PE.note = PE.rec.claude_note || ''; renderPEditor(); loadTuning();
      toast(dataCh ? `Saved as v${PE.rec.versions.at(-1).v}.` : 'Note saved.');
      if (CE.id === PE.id && !ceDirty()) openCharEditor(PE.id, true);
    }
    if (b.id === 'pRevert') { PE.draft = clone(PE.rec.versions.at(-1).data); PE.note = PE.rec.claude_note || ''; renderPEditor(); loadTuning(); }
    if (b.id === 'pUse') usePreset();
    if (b.id === 'pDup') {
      const data = clone(PE.draft); data.name = (data.name || PE.id) + ' copy';
      const rec = await api(`/api/preset/${PE.type}/${PE.id}/create`, { name: data.name, data, message: `copied from ${PE.id} v${PE.rec.versions.at(-1).v}` });
      await loadPresets(); refreshAll(false); openPreset(rec.id, true);
    }
    if (b.id === 'pArch') { await api(`/api/preset/${PE.type}/${PE.id}/archive`, { archived: !PE.rec.archived }); await loadPresets(); refreshAll(); openPreset(PE.id); }
    if (b.dataset.diff) showDiff(+b.dataset.diff);
    if (b.dataset.restore) {
      if (JSON.stringify(PE.draft) !== JSON.stringify(PE.rec.versions.at(-1).data) && !confirm('Discard your unsaved changes?')) return;
      PE.rec = await api(`/api/preset/${PE.type}/${PE.id}/restore`, { v: +b.dataset.restore });
      await loadPresets(); refreshAll(false); PE.draft = clone(PE.rec.versions.at(-1).data); PE.note = PE.rec.claude_note || ''; renderPEditor(); loadTuning();
      toast(`Restored v${b.dataset.restore} as v${PE.rec.versions.at(-1).v}.`);
    }
  });
}
function peSaveLabel() {
  const dataCh = PE.rec && JSON.stringify(PE.draft) !== JSON.stringify(PE.rec.versions.at(-1).data);
  const noteCh = PE.rec && (PE.note ?? '') !== (PE.rec.claude_note || '');
  return dataCh ? `Save as v${PE.rec.versions.at(-1).v + 1}` : noteCh ? 'Save note' : 'Saved';
}
function updateDirty() {
  const changed = peDirty();
  $('#pSave').disabled = $('#pRevert').disabled = !changed;
  $('#pSave').textContent = peSaveLabel();
  if (PE.type === 'character') { const p = $('#peditor .pfields .ptext'); if (p) p.textContent = charBlock({ id: PE.id, data: PE.draft }, false); }
}
function usePreset() {
  const id = PE.id, t = PE.type;
  if (t === 'character') { if (PE.draft.generic) st.man = true; else if (!st.chars.includes(id)) { if (st.chars.length >= 3) return toast('Up to 3 characters.'); st.chars.push(id); } }
  if (t === 'style') applyStyle(id);
  if (t === 'framing') st.framing = id;
  if (t === 'model') st.model = id;
  if (t === 'camera' && !st.cams.includes(id)) st.cams.push(id);
  if (t === 'negative') st.negs = [...new Set(activeNegs().concat(id))];
  if (t === 'scene') { const s = byId('scene', id); st.scene = s.data.text; st.sceneRefs = [id]; if (s.data.rating) st.rating = s.data.rating; $('#sceneText').value = st.scene; }
  showTab('compose'); renderControls();
}

/* ------------------------------------------------------------ character editor in Compose */
let CE = { id: null, isNew: false, rec: null, draft: null, base: '', note: '', noteBase: '' };
const blankChar = () => ({ name: '', gender: 'female', age: '', look: '', signature: '', build: '', outfit: '', short: '', negative: '', portrait: '', rating_cap: '', generic: false, notes: '' });
function ceDirty() { return !!CE.draft && (JSON.stringify(CE.draft) !== CE.base || CE.note !== CE.noteBase); }
async function openCharEditor(id, force) {
  if (!force && ceDirty() && !confirm('Discard your unsaved character edits?')) return;
  if (!force && id && CE.id === id && !CE.isNew) return closeCharEditor(true);
  if (id) {
    CE.rec = await api(`/api/preset/character/${id}`);
    Object.assign(CE, { id, isNew: false, draft: clone(CE.rec.versions.at(-1).data), note: CE.rec.claude_note || '' });
  } else Object.assign(CE, { id: null, isNew: true, rec: null, draft: blankChar(), note: '' });
  CE.base = JSON.stringify(CE.draft); CE.noteBase = CE.note;
  renderControls(); renderCharEditor();
  $('#charEditor').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
function closeCharEditor(force) {
  if (!force && ceDirty() && !confirm('Discard your unsaved character edits?')) return;
  CE = { id: null, isNew: false, rec: null, draft: null, base: '', note: '', noteBase: '' };
  $('#charEditor').hidden = true; $('#charEditor').innerHTML = ''; renderControls();
}
function renderCharEditor() {
  const el = $('#charEditor'); el.hidden = false;
  const cur = CE.rec?.versions.at(-1);
  const others = live('character').filter(c => !c.data.generic);
  el.innerHTML = `<div class="ceh"><div><h3>${CE.isNew ? 'New character' : 'Edit ' + esc(CE.draft.name || CE.id)}</h3>
      <div class="hint">${CE.isNew ? 'Saved as a new character preset' : `v${cur.v}, saved ${esc(cur.at.slice(5, 16).replace('T', ' '))}. Saving makes v${cur.v + 1}.`}</div></div>
      <button class="ib" data-ceclose="1" title="Close" aria-label="Close editor"><i class="ph ph-x"></i></button></div>
    ${CE.isNew ? `<label>Start from<select data-cefrom="1"><option value="">Blank</option>${others.map(c => `<option value="${esc(c.id)}">A copy of ${esc(c.data.name)}</option>`).join('')}</select></label>` : ''}
    <div class="pfields mt8">${fieldsHtml('character', CE.draft)}
      <div><div class="lbl">How it goes into the prompt</div><div class="ptext" id="cePrev"></div></div>
      <label>Note to Claude<textarea rows="3" data-cenote="1" placeholder="What's wrong with her, or what to try next">${esc(CE.note)}</textarea></label></div>
    <div class="cesave"><input type="text" id="ceMsg" placeholder="What changed (optional)">
      <div class="row gap8 wrap"><button class="btn primary sm" id="ceSave"></button><button class="btn ghost sm" id="ceDiscard">Discard</button>
      ${CE.isNew ? '' : `<button class="btn ghost sm" id="ceDup">Duplicate</button><button class="btn ghost sm danger" id="ceArch">Archive character</button>`}</div></div>`;
  ceUpdate();
}
function ceUpdate() {
  const dataCh = JSON.stringify(CE.draft) !== CE.base, noteCh = CE.note !== CE.noteBase;
  const b = $('#ceSave'); if (!b) return;
  b.disabled = !(dataCh || noteCh || CE.isNew);
  b.textContent = CE.isNew ? 'Create character' : dataCh ? `Save as v${CE.rec.versions.at(-1).v + 1}` : noteCh ? 'Save note' : 'Saved';
  $('#ceDiscard').disabled = !(dataCh || noteCh);
  $('#cePrev').textContent = charBlock({ id: CE.id || 'new', data: CE.draft }, false);
}
async function ceSave() {
  const msg = $('#ceMsg').value.trim();
  if (!CE.draft.name.trim()) return toast('Give the character a name first.');
  try {
    if (CE.isNew) {
      CE.rec = await api('/api/preset/character/new/create', { name: CE.draft.name, data: CE.draft, message: msg || 'created in Compose' });
      CE.id = CE.rec.id; CE.isNew = false;
    } else if (JSON.stringify(CE.draft) !== CE.base) CE.rec = await api(`/api/preset/character/${CE.id}`, { data: CE.draft, message: msg });
    if (CE.note !== CE.noteBase) CE.rec = await api(`/api/preset/character/${CE.id}/note`, { text: CE.note });
  } catch (e) { return toast('Could not save: ' + e.message, 5000); }
  CE.draft = clone(CE.rec.versions.at(-1).data); CE.base = JSON.stringify(CE.draft); CE.noteBase = CE.note;
  await loadPresets(); refreshAll(false); renderCharEditor();
  toast(`Saved ${CE.draft.name} as v${CE.rec.versions.at(-1).v}. The prompt uses it now.`);
}
async function ceArchive() {
  const id = CE.id, name = CE.draft.name;
  await api(`/api/preset/character/${id}/archive`, { archived: true });
  st.chars = st.chars.filter(x => x !== id);
  closeCharEditor(true); await loadPresets(); refreshAll(false);
  toastUndo(`Archived ${name}.`, async () => { await api(`/api/preset/character/${id}/archive`, { archived: false }); await loadPresets(); refreshAll(false); });
}
function wireCharEditor() {
  const el = $('#charEditor');
  el.addEventListener('input', e => {
    if (e.target.dataset.cenote) { CE.note = e.target.value; return ceUpdate(); }
    const f = e.target.dataset.f; if (!f || e.target.tagName === 'SELECT') return;
    setp(CE.draft, f, e.target.value); ceUpdate();
  });
  el.addEventListener('change', async e => {
    if (e.target.dataset.upport) { const path = await uploadPortrait(e.target); if (path) { CE.draft.portrait = path; renderCharEditor(); } return; }
    if (e.target.dataset.cefrom !== undefined) {
      const src = byId('character', e.target.value);
      CE.draft = src ? Object.assign(clone(src.data), { name: src.data.name + ' copy' }) : blankChar();
      renderCharEditor(); $('[data-cefrom]').value = e.target.value; return;
    }
    if (e.target.tagName === 'SELECT' && e.target.dataset.f) { setp(CE.draft, e.target.dataset.f, e.target.value); ceUpdate(); }
  });
  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.ceclose) closeCharEditor();
    else if (b.dataset.pickport) openPortraitPicker(CE.id, path => { CE.draft.portrait = path; renderCharEditor(); });
    else if (b.id === 'ceSave') ceSave();
    else if (b.id === 'ceDiscard') { CE.draft = JSON.parse(CE.base); CE.note = CE.noteBase; renderCharEditor(); }
    else if (b.id === 'ceDup') { const d = Object.assign(clone(CE.draft), { name: CE.draft.name + ' copy' }); Object.assign(CE, { id: null, isNew: true, rec: null, draft: d, base: JSON.stringify(blankChar()), note: '', noteBase: '' }); renderControls(); renderCharEditor(); }
    else if (b.id === 'ceArch') ceArchive();
  });
}

/* ------------------------------------------------------------ portraits */
async function uploadPortrait(input) {
  const f = input.files[0]; if (!f) return null;
  if (f.size > 20 * 1024 * 1024) { toast('That image is over 20 MB.'); return null; }
  const data = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); });
  try { const r = await api('/api/portraits/upload', { name: f.name, data }); toast('Portrait uploaded. Save to keep it.'); return r.path; }
  catch (e) { toast('Upload failed: ' + e.message, 5000); return null; }
}
async function openPortraitPicker(charId, onPick) {
  const list = await api('/api/portraits?character=' + encodeURIComponent(charId || ''));
  const groups = [...new Set(list.map(x => x.group))];
  const ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'picker';
  ov.innerHTML = `<div class="picker"><div class="row gap8" style="margin-bottom:10px"><h2 style="margin-right:auto">Choose a portrait</h2><button class="btn sm" data-pclose="1"><i class="ph ph-x"></i> Close</button></div>
    ${groups.map(g => `<div class="lbl mt8">${esc(g)}</div><div class="pgrid">${list.filter(x => x.group === g).map(x =>
      `<button class="pick" data-path="${esc(x.path)}" title="${esc(x.path)}"><img src="${esc(x.thumb ? '/thumb/' + x.thumb : portraitUrl(x.path))}" alt="" loading="lazy"></button>`).join('')}</div>`).join('')}</div>`;
  document.body.appendChild(ov);
  ov.onclick = e => {
    const b = e.target.closest('[data-path]');
    if (b) { onPick(b.dataset.path); ov.remove(); }
    else if (e.target === ov || e.target.closest('[data-pclose]')) ov.remove();
  };
}

/* ------------------------------------------------------------ delete and trash */
let TRASHVIEW = false;
function markDeleted(ids, v) {
  ids.forEach(id => { const t = T.get(id); if (t) t.deleted = v; });
  pins = pins.filter(p => !p.deleted); pollJobs.sig = null; renderRuns(); renderTray();
  if (!$('#lightbox').hidden) {
    LB.list = LB.list.filter(t => !t.deleted);
    if (!LB.list.length) closeOverlays(); else { LB.i = Math.min(LB.i, LB.list.length - 1); renderLightbox(); }
  }
  if (!$('#compare').hidden) { if (pins.length > 1) openCompare(); else closeOverlays(); }
  if ($('#tab-history').classList.contains('on') && !TRASHVIEW) renderHistory();
  if ($('#tab-presets').classList.contains('on') && PE.id) loadTuning();
}
async function deleteRender(id) {
  try { await api(`/api/render/${encodeURIComponent(id)}/delete`, {}); } catch (e) { return toast('Could not delete: ' + e.message); }
  markDeleted([id], true);
  toastUndo('Moved to the trash.', () => restoreRenders([id]));
}
async function deleteRun(runId) {
  const r = HIST.find(x => x.run_id === runId); const n = r ? r.renders.length : 0;
  if (!confirm(`Delete all ${n} picture${n === 1 ? '' : 's'} in this run? They go to the trash, where you can restore them.`)) return;
  const res = await api(`/api/run/${encodeURIComponent(runId)}/delete`, {});
  markDeleted(res.deleted, true);
  toastUndo(`Moved ${res.deleted.length} pictures to the trash.`, () => restoreRenders(res.deleted));
}
async function restoreRenders(ids) {
  for (const id of ids) await api(`/api/render/${encodeURIComponent(id)}/restore`, {});
  markDeleted(ids, false);
  if (TRASHVIEW) loadTrash(); else if ($('#tab-history').classList.contains('on')) loadHistory();
  toast(ids.length > 1 ? `Restored ${ids.length} pictures.` : 'Restored.');
}
async function loadTrash() {
  TRASHVIEW = true;
  const items = await api('/api/trash');
  $('#histList').innerHTML = `<div class="row gap8 wrap" style="margin-bottom:14px"><h2 style="margin-right:auto">Trash, ${items.length} picture${items.length === 1 ? '' : 's'}</h2>
    <button class="btn ghost sm" id="trashBack"><i class="ph ph-arrow-left"></i> Back to history</button>
    <button class="btn sm danger" id="trashEmpty" ${items.length ? '' : 'disabled'}><i class="ph ph-trash"></i> Empty trash</button></div>` +
    (items.length ? `<div class="trashgrid">${items.map(x => `<figure><img src="/trashthumb/${esc(x.thumb)}" alt="Seed ${x.seed}" loading="lazy">
      <figcaption><span class="mono hint">${esc((x.characters || []).join(', ') || 'scene')} s${x.seed}</span><button class="btn sm" data-trestore="${esc(x.id)}">Restore</button></figcaption></figure>`).join('')}</div>`
      : `<div class="empty"><b>The trash is empty.</b>Deleted pictures wait here until you empty it, and can be restored until then.</div>`);
}
async function emptyTrash() {
  if (!confirm('Delete every picture in the trash for good? This cannot be undone.')) return;
  const r = await api('/api/trash/empty', {});
  toast(`Deleted ${r.purged} pictures for good.`); loadTrash();
}

/* ------------------------------------------------------------ tabs and start */
function showTab(name) {
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
  $$('.tab').forEach(s => s.classList.toggle('on', s.id === 'tab-' + name));
  store.set('tab', name);
  document.body.className = 'tab-' + name;
  if (name === 'history') loadHistory();
  if (name === 'presets') { renderPList(); if (!peDirty()) openPreset(PE.id, true); }
  window.scrollTo(0, 0);
}
function refreshAll(reopen = true) {
  renderControls(); fillHistoryFilters(); renderPList();
  if (reopen && $('#tab-presets').classList.contains('on') && PE.id) openPreset(PE.id, true);
}
async function init() {
  await loadPresets();
  PE.files = await api('/api/models/files').catch(() => []);
  $('#tabs').onclick = e => { const b = e.target.closest('[data-tab]'); if (b) showTab(b.dataset.tab); };
  wireCompose(); wireCharEditor(); wireResults(); wireLightbox(); wireHistory(); wirePresets();
  renderControls(); fillHistoryFilters();
  try { RECENT = await api('/api/history?limit=4&who=mine'); } catch { RECENT = []; }
  await pollState(); pollJobs();
  setInterval(pollState, 4000);
  const tab = new URLSearchParams(location.search).get('tab') || store.get('tab', 'compose');
  showTab(tab);
}
init();
