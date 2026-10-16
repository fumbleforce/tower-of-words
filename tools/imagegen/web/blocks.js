/* The kinds of blocks (presets) and their fields: one definition for the image gen dashboard (app.js) and the scene
   editor's composer (tools/subplots/web/block-editor.js). Served at /web/blocks.js on 8772 and at
   /tools/imagegen/web/blocks.js on 8771. Storage, versions and privacy are server-side (store.py). */

export const RATINGS = ['safe', 'sensitive', 'nsfw'];

// [kind, plural label, singular label, the field that holds the prompt words]
export const KINDS = [
  ['character', 'Characters', 'Character', 'look'],
  ['outfit', 'Outfits', 'Outfit', 'text'],
  ['style', 'Styles', 'Style', 'quality'],
  ['negative', 'Negatives', 'Negative', 'text'],
  ['framing', 'Framings', 'Picture shape', 'prompt'],
  ['camera', 'Cameras', 'Camera', 'prompt'],
  ['location', 'Settings', 'Setting', 'text'],
  ['pose', 'Poses', 'Pose', 'text'],
  ['light', 'Light', 'Light', 'text'],
  ['scene', 'Scenes', 'Saved scene direction', 'text'],
  ['model', 'Models', 'Model', 'file'],
];
export const kindLabel = (kind, singular = false) => (KINDS.find(k => k[0] === kind) || [kind, kind, kind])[singular ? 2 : 1];
export const mainField = kind => (KINDS.find(k => k[0] === kind) || [])[3] || 'text';

// [key, label, kind of input (a number is a textarea's rows), options]
export const FIELDS = {
  character: [['name', 'Name'], ['gender', 'Gender', 'select', ['female', 'male']], ['portrait', 'Portrait', 'portrait'], ['age', 'Age wording', 2],
    ['look', 'Look: hair, eyes, face', 3], ['signature', 'Signature details', 2], ['build', 'Build line', 1], ['rating_cap', 'Rating cap', 'select', ['', 'safe', 'sensitive']],
    ['outfit', 'Default outfit (a toggle in Compose)', 2], ['short', 'Short form, used in group shots', 2], ['negative', 'Her negatives', 2], ['notes', 'Notes', 3]],
  outfit: [['name', 'Name'], ['character', 'For', 'ref', 'character'], ['text', 'What she wears (after "wearing")', 3], ['negative', 'Extra negative', 1], ['notes', 'Notes', 2]],
  style: [['name', 'Name'], ['quality', 'Quality tags', 2], ['anchors', 'Style anchors', 2], ['suffix', 'Ends with', 1], ['negative', 'Extra negative', 2],
    ['defaults.rating', 'Default rating', 'select', ['', ...RATINGS]], ['defaults.framing', 'Default framing', 'ref', 'framing'],
    ['defaults.model', 'Default model', 'ref', 'model'], ['defaults.negatives', 'Default negative sets', 'negs'], ['notes', 'Notes', 3]],
  negative: [['name', 'Name'], ['text', 'Negative text', 3], ['default', 'On by default', 'check'],
    ['soft', 'On for every nonadult reward', 'check'], ['notes', 'Notes', 2]],
  framing: [['name', 'Name'], ['w', 'Width', 'num'], ['h', 'Height', 'num'], ['prompt', 'Added to the prompt (optional)', 2], ['notes', 'Notes', 2]],
  // group and diagram place a camera block in the scene editor's composer: its row (shot size, angle, lens; empty is
  // the other camera words) and the small drawing on its tile (tools/subplots/web/image-stage.js DIAGRAMS)
  camera: [['name', 'Name'], ['prompt', 'Added to the prompt', 2], ['group', 'Row in the composer', 'select', ['', 'shot', 'angle', 'lens']],
    ['diagram', 'Drawn as', 'select', ['', 'face', 'head', 'chest', 'thighs', 'full', 'wide', 'eye', 'high', 'low', 'top', 'wide-lens', 'normal', 'long', 'shallow', 'tilt', 'behind', 'side', 'pov', 'selfie', 'shoulder', 'viewer']],
    ['notes', 'Notes', 2]],
  location: [['name', 'Name'], ['text', 'Added to the prompt', 3], ['notes', 'Notes', 2]],
  pose: [['name', 'Name'], ['text', 'Added to the prompt', 3], ['notes', 'Notes', 2]],
  light: [['name', 'Name'], ['text', 'Added to the prompt', 2], ['notes', 'Notes', 2]],
  scene: [['name', 'Name'], ['text', 'Scene text', 5], ['rating', 'Rating it sets', 'select', ['', ...RATINGS]], ['notes', 'Notes', 2]],
  model: [['name', 'Name'], ['file', 'File', 'file'], ['steps', 'Steps', 'num'], ['cfg', 'CFG', 'num'], ['sampler', 'Sampler', 1], ['scheduler', 'Scheduler', 1], ['notes', 'Notes', 3]],
};
export const PAIRS = { character: [['name', 'gender'], ['build', 'rating_cap']], framing: [['w', 'h']], camera: [['group', 'diagram']], model: [['steps', 'cfg'], ['sampler', 'scheduler']],
  style: [['defaults.rating', 'defaults.framing']], scene: [['name', 'rating']] };

export const getp = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
export function setp(o, path, v) { const ks = path.split('.'); let a = o; ks.slice(0, -1).forEach(k => { a[k] = a[k] || {}; a = a[k]; }); a[ks.at(-1)] = v; }
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// An empty block of a kind, with the sensible defaults the dashboard has always used.
export function blank(kind, files = []) {
  const b = {};
  (FIELDS[kind] || []).forEach(([k, , input]) => setp(b, k, input === 'num' ? 0 : input === 'check' ? false : input === 'negs' ? [] : ''));
  if (kind === 'character') b.gender = 'female';
  if (kind === 'model') Object.assign(b, { steps: 30, cfg: 5, sampler: 'euler_ancestral', scheduler: 'normal', file: files[0] || '' });
  if (kind === 'framing') Object.assign(b, { w: 896, h: 1152 });
  return b;
}

// The block's prompt words resolved: a stored id gives its text; anything else is literal words (older compositions
// kept the label itself, "Seated", so a block named that counts too).
export function blockText(presets, kind, value) {
  if (!value) return '';
  const list = presets?.[kind] || [];
  const p = list.find(x => x.id === value) || list.find(x => (x.data?.name || '').toLowerCase() === String(value).toLowerCase());
  return p ? (p.data[mainField(kind)] ?? '') : String(value);
}
export function blockId(presets, kind, value) {
  const list = presets?.[kind] || [];
  return (list.find(x => x.id === value) || list.find(x => (x.data?.name || '').toLowerCase() === String(value || '').toLowerCase()))?.id || '';
}

// One field's input. ctx: {live(kind) -> active blocks, files: model files, portrait(field, value) -> html, chip(label, on, attrs)}
export function fieldHtml([key, label, input, opts], draft, ctx = {}) {
  const v = getp(draft, key);
  if (input === 'portrait' && ctx.portrait) return ctx.portrait(key, v, label);
  const id = 'pf-' + key.replace('.', '-');
  const live = ctx.live || (() => []);
  if (input === 'select') return `<label>${label}<select id="${id}" data-f="${key}">${opts.map(o => `<option value="${o}" ${o === (v || '') ? 'selected' : ''}>${o || 'none'}</option>`).join('')}</select></label>`;
  if (input === 'ref') return `<label>${label}<select id="${id}" data-f="${key}"><option value="">${key === 'character' ? 'anyone' : 'none'}</option>${live(opts).map(o => `<option value="${esc(o.id)}" ${o.id === v ? 'selected' : ''}>${esc(o.data.name)}</option>`).join('')}</select></label>`;
  if (input === 'file') return `<label>${label}<select id="${id}" data-f="${key}">${[...new Set([v, ...(ctx.files || [])])].filter(Boolean).map(f => `<option ${f === v ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select></label>`;
  if (input === 'check') return `<label class="check"><input type="checkbox" data-f="${key}" ${v ? 'checked' : ''}> ${label}</label>`;
  if (input === 'num') return `<label>${label}<input type="number" step="any" class="mono" data-f="${key}" data-num="1" value="${esc(v ?? '')}"></label>`;
  if (input === 'negs') {
    const chip = ctx.chip || ((l, on, attrs) => `<button type="button" class="chip${on ? ' on' : ''}" aria-pressed="${!!on}" ${attrs}>${esc(l)}</button>`);
    return `<div><div class="lbl">${label}</div><div class="chips">${live('negative').map(n => chip(n.data.name, (v || []).includes(n.id), `data-negf="${esc(n.id)}"`)).join('')}</div></div>`;
  }
  if (input === 'portrait') return `<label>${label}<input type="text" class="mono" data-f="${key}" value="${esc(v ?? '')}"></label>`;
  if (typeof input === 'number' && input > 1) return `<label>${label}<textarea rows="${input}" data-f="${key}">${esc(v ?? '')}</textarea></label>`;
  return `<label>${label}<input type="text" data-f="${key}" value="${esc(v ?? '')}"></label>`;
}
export function fieldsHtml(kind, draft, ctx = {}) {
  const F = FIELDS[kind] || [], pairs = PAIRS[kind] || [], skip = new Set(pairs.map(p => p[1]));
  return F.filter(f => !skip.has(f[0])).map(f => {
    const pr = pairs.find(p => p[0] === f[0]);
    return pr ? `<div class="f2">${fieldHtml(f, draft, ctx)}${fieldHtml(F.find(x => x[0] === pr[1]), draft, ctx)}</div>` : fieldHtml(f, draft, ctx);
  }).join('');
}

// A word-level diff of two prompts, as HTML: the words of b marked against a, <ins> for words not in a, then <del>
// for words of a missing in b.
export function wordDiff(a, b) {
  const A = (a || '').split(/\s+/), B = (b || '').split(/\s+/);
  const n = A.length, m = B.length, L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  let i = 0, j = 0; const out = [];
  while (i < n || j < m) {
    if (i < n && j < m && A[i] === B[j]) { out.push(esc(B[j])); i++; j++; }
    else if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) { out.push(`<ins>${esc(B[j])}</ins>`); j++; }
    else { out.push(`<del>${esc(A[i])}</del>`); i++; }
  }
  return out.join(' ');
}
