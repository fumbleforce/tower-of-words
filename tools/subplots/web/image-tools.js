// The composer's steps beyond the prompt, all carried on the composition and sent with the job (the image gen queue
// runs them, tools/imagegen/server.py): a start picture with its change strength and an optional painted mask
// (inpaint), LoRAs with weights, a guide picture through an Anima LLLite control, and colour fixes after the render
// (tools/imagegen/huefix.py), whose boxes are drawn on the picture.
const {document, Image} = globalThis;
import {esc} from './common.js';

// Where the browser can show a stored picture path: the image service's outputs through the editor's proxy, anything
// else in the repo (island/private/ ones in private mode) straight from the project server.
export function pictureUrl(path) {
  if (!path) return '';
  if (path.startsWith('data:')) return path;
  const out = 'island/private/imagegen/outputs/';
  if (path.startsWith(out)) return '/api/subplots/image/out/' + path.slice(out.length).split('/').map(encodeURIComponent).join('/');
  const masks = 'island/private/imagegen/masks/';
  if (path.startsWith(masks)) return '';
  return '/' + path.split('/').map(encodeURIComponent).join('/');
}

const num = (attr, title, value, min, max, step) => `<label>${esc(title)}<input type="number" ${attr} min="${min}" max="${max}" step="${step}" value="${esc(value ?? '')}"></label>`;
const OPS = [['hue', 'Shift the hue'], ['recolour', 'Recolour as dyed cloth'], ['blacken', 'Back to black']];
// a hue (0-360) as a colour swatch, and back
const hueColour = h => `hsl(${Math.round(h || 0)}, 70%, 50%)`;
function hexHue(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn || 1e-9;
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return Math.round((h * 60 + 360) % 360);
}
const hslHex = h => { const c = document.createElement('canvas').getContext('2d'); c.fillStyle = hueColour(h); return c.fillStyle; };

// The section's HTML. ctx: {loras: [file], controls: [{file, kind}], current: path of the shot's picture}
export function toolsHtml(c, ctx) {
  const s = c.start, loras = c.loras || [], ctl = c.control, fixes = c.huefix || [];
  const startHtml = s?.image ? `<div class="tool-row"><img class="tool-thumb" src="${esc(pictureUrl(s.image))}" alt="Start picture"><div class="tool-col">
      <p class="hint">Starts from ${esc(s.image.split('/').pop())}${s.mask ? ', repainting only the painted part' : ''}. 0.2 to 0.4 is a small change.</p>
      <div class="tool-inline">${num('data-tool="denoise"', 'Change strength', s.denoise, 0.05, 1, 0.05)}<button type="button" data-tool-paint="mask">${s.mask ? 'Edit the mask' : 'Paint a mask (inpaint)'}</button>${s.mask ? '<button type="button" data-tool-clear="mask">Whole picture</button>' : ''}<button type="button" data-tool-clear="start">Start from noise</button></div></div></div>`
    : `<p class="hint">Start from a picture to change it a little, or paint over a part to repaint only that.</p>${ctx.current ? '<button type="button" data-tool-start>Start from this shot’s picture</button>' : ''}`;
  const loraHtml = `${loras.map((l, i) => `<div class="tool-inline"><span class="tool-name">${esc(l.file.replace('.safetensors', ''))}</span>${num(`data-tool="lora-weight" data-i="${i}"`, 'Weight', l.weight, -2, 2, 0.05)}<button type="button" data-tool-remove="lora" data-i="${i}">Remove</button></div>`).join('')}
    ${ctx.loras.length ? `<label>Add a LoRA<select data-tool="lora-add"><option value="">Choose…</option>${ctx.loras.filter(f => !loras.some(l => l.file === f)).map(f => `<option value="${esc(f)}">${esc(f.replace('.safetensors', ''))}</option>`).join('')}</select></label>` : '<p class="hint">No Anima LoRAs in ComfyUI’s loras folder.</p>'}`;
  const ctlHtml = `<div class="tool-inline"><label>Guide<select data-tool="control-file"><option value="">None</option>${ctx.controls.filter(x => x.kind !== 'inpainting').map(x => `<option value="${esc(x.file)}" ${ctl?.file === x.file ? 'selected' : ''}>${esc(x.kind)}</option>`).join('')}</select></label>
    ${ctl ? `${num('data-tool="control-strength"', 'Strength', ctl.strength, 0, 2, 0.05)}${num('data-tool="control-end"', 'Until', ctl.end, 0.05, 1, 0.05)}` : ''}</div>
    ${ctl ? `<p class="hint">Guide picture: ${ctl.image ? esc(ctl.image.split('/').pop()) : 'none yet'}. ${ctx.current ? '<button type="button" class="link" data-tool-guide>Use this shot’s picture</button>' : ''} Lineart and scribble follow outlines, depth follows shapes; there is no pose model for Anima.</p>` : ''}`;
  const fixHtml = `${fixes.map((f, i) => `<div class="tool-inline tool-fix"><select data-tool="fix-op" data-i="${i}">${OPS.map(([v, l]) => `<option value="${v}" ${f.op === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      ${num(`data-tool="fix-hmin" data-i="${i}"`, 'Hue from', f.hmin ?? (f.op === 'blacken' ? 160 : 70), 0, 360, 1)}${num(`data-tool="fix-hmax" data-i="${i}"`, 'to', f.hmax ?? (f.op === 'blacken' ? 260 : 200), 0, 360, 1)}
      ${f.op === 'blacken' ? '' : `<label>Target<input type="color" data-tool="fix-target" data-i="${i}" value="${hslHex(f.target ?? 165)}"></label>`}
      <span class="hint">box ${f.box.map(Math.round).join(', ')}</span><button type="button" data-tool-remove="fix" data-i="${i}">Remove</button></div>`).join('')}
    ${ctx.current || s?.image ? '<button type="button" data-tool-paint="box">Draw a colour-fix box</button>' : '<p class="hint">Colour fixes are drawn on a picture: pick a shot with one, or start from a picture.</p>'}`;
  const count = [s?.image, loras.length, ctl, fixes.length].filter(Boolean).length;
  return `<details class="image-section image-tools" ${c.toolsOpen ? 'open' : ''}><summary>Picture tools${count ? ` (${count} on)` : ''}: start picture and mask, LoRA, guide, colour fix</summary>
    <h4>Start picture</h4>${startHtml}<h4>LoRA</h4>${loraHtml}<h4>Guide picture</h4>${ctlHtml}<h4>Colour fix after the render</h4>${fixHtml}</details>`;
}

// Wire the section. edit(mutator, repaint) is the composer's; current is the shot's picture path.
export function bindTools(host, {edit, compose, current, size}) {
  const root = host.querySelector('.image-tools'); if (!root) return;
  root.ontoggle = () => edit(c => { c.toolsOpen = root.open; }, false);
  const i = el => +el.dataset.i;
  root.querySelectorAll('[data-tool]').forEach(el => el.onchange = () => {
    const v = el.value, k = el.dataset.tool;
    edit(c => {
      if (k === 'denoise') c.start.denoise = +v;
      if (k === 'lora-add' && v) c.loras = [...(c.loras || []), {file: v, weight: 0.8}];
      if (k === 'lora-weight') c.loras[i(el)].weight = +v;
      if (k === 'control-file') c.control = v ? {...(c.control || {strength: 0.7, end: 0.8, image: c.start?.image || current || ''}), file: v} : null;
      if (k === 'control-strength') c.control.strength = +v;
      if (k === 'control-end') c.control.end = +v;
      if (k === 'fix-op') c.huefix[i(el)].op = v;
      if (k === 'fix-hmin') c.huefix[i(el)].hmin = +v;
      if (k === 'fix-hmax') c.huefix[i(el)].hmax = +v;
      if (k === 'fix-target') c.huefix[i(el)].target = hexHue(v);
    }, ['lora-add', 'control-file', 'fix-op'].includes(k));
  });
  root.querySelectorAll('[data-tool-remove]').forEach(b => b.onclick = () => edit(c => {
    if (b.dataset.toolRemove === 'lora') c.loras.splice(i(b), 1); else c.huefix.splice(i(b), 1);
  }));
  root.querySelectorAll('[data-tool-clear]').forEach(b => b.onclick = () => edit(c => { if (b.dataset.toolClear === 'mask') delete c.start.mask; else delete c.start; }));
  root.querySelector('[data-tool-start]')?.addEventListener('click', () => edit(c => { c.start = {image: current, denoise: 0.35}; }));
  root.querySelector('[data-tool-guide]')?.addEventListener('click', () => edit(c => { c.control.image = current; }));
  root.querySelectorAll('[data-tool-paint]').forEach(b => b.onclick = () => {
    const mode = b.dataset.toolPaint;
    const c0 = compose(), picture = c0.start?.image || current;
    openPainter({mode, picture, mask: c0.start?.mask, size, onDone: result => edit(c => {
      if (mode === 'mask') c.start.mask = result;
      else c.huefix = [...(c.huefix || []), {op: 'hue', box: result, hmin: 70, hmax: 200, target: 165}];
    })});
  });
}

// A full-screen painter over the picture: a round brush for the mask (white = repaint), or one dragged box for a
// colour fix. The mask comes back as a PNG data URL at the picture's own size; a box in the picture's pixels, scaled
// to the render size (`size`) when the picture is a different size. `fields` adds controls to the bar (Repaint a part
// on the beat, versions.js); onDone gets the overlay too, to read them, and the picture's own size.
export function openPainter({mode, picture, mask, size, onDone, title = '', fields = '', doneLabel = 'Done'}) {
  const el = document.createElement('div');
  el.className = 'lib-overlay painter';
  el.innerHTML = `<div class="painter-bar"><strong>${esc(title || (mode === 'mask' ? 'Paint over what should change' : 'Drag a box round what needs its colour fixed'))}</strong>
    ${mode === 'mask' ? '<label>Brush<input type="range" min="8" max="160" value="48" data-brush></label><button type="button" data-erase aria-pressed="false">Erase</button><button type="button" data-clear>Clear</button>' : ''}
    ${fields}<span></span><button type="button" data-cancel>Cancel</button><button type="button" class="primary" data-done>${esc(doneLabel)}</button></div>
    <div class="painter-stage"><canvas></canvas></div>`;
  const dialog = document.getElementById('composeDialog');
  (dialog?.open ? dialog : document.body).append(el);  // inside the composer when it is open (top layer), else on the page
  const canvas = el.querySelector('canvas'), ctx = canvas.getContext('2d');
  const img = new Image();
  const maskCanvas = document.createElement('canvas'), mctx = maskCanvas.getContext('2d');
  let box = null, drawing = false, erase = false, start = null;
  img.onload = () => {
    canvas.width = maskCanvas.width = img.naturalWidth; canvas.height = maskCanvas.height = img.naturalHeight;
    canvas.dataset.ready = '1';
    mctx.fillStyle = '#000'; mctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    if (mask && mask.startsWith('data:')) { const m = new Image(); m.onload = () => { mctx.drawImage(m, 0, 0, maskCanvas.width, maskCanvas.height); draw(); }; m.src = mask; }
    draw();
  };
  img.onerror = () => { el.querySelector('strong').textContent = 'The picture could not be loaded.'; };
  img.src = pictureUrl(picture);
  function draw() {
    ctx.drawImage(img, 0, 0);
    if (mode === 'mask') {
      ctx.save(); ctx.globalAlpha = 0.45; ctx.globalCompositeOperation = 'source-over';
      const tint = document.createElement('canvas'); tint.width = maskCanvas.width; tint.height = maskCanvas.height;
      const t = tint.getContext('2d'); t.drawImage(maskCanvas, 0, 0); t.globalCompositeOperation = 'multiply'; t.fillStyle = '#ff5a5a'; t.fillRect(0, 0, tint.width, tint.height);
      t.globalCompositeOperation = 'destination-in'; t.drawImage(maskCanvas, 0, 0);
      ctx.drawImage(tint, 0, 0); ctx.restore();
    } else if (box) {
      ctx.strokeStyle = '#6fd0c6'; ctx.lineWidth = Math.max(2, canvas.width / 400); ctx.strokeRect(box[0], box[1], box[2] - box[0], box[3] - box[1]);
    }
  }
  const at = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * canvas.width / r.width, (e.clientY - r.top) * canvas.height / r.height]; };
  function dab(e) {
    const [x, y] = at(e), r = +el.querySelector('[data-brush]').value * canvas.width / canvas.getBoundingClientRect().width / 2;
    mctx.fillStyle = erase ? '#000' : '#fff'; mctx.beginPath(); mctx.arc(x, y, r, 0, Math.PI * 2); mctx.fill(); draw();
  }
  canvas.onpointerdown = e => { drawing = true; canvas.setPointerCapture(e.pointerId); if (mode === 'mask') dab(e); else { start = at(e); box = [...start, ...start]; draw(); } };
  canvas.onpointermove = e => { if (!drawing) return; if (mode === 'mask') dab(e); else { const p = at(e); box = [Math.min(start[0], p[0]), Math.min(start[1], p[1]), Math.max(start[0], p[0]), Math.max(start[1], p[1])]; draw(); } };
  canvas.onpointerup = () => { drawing = false; };
  el.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.erase !== undefined) { erase = !erase; b.setAttribute('aria-pressed', String(erase)); }
    if (b.dataset.clear !== undefined) { mctx.fillStyle = '#000'; mctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height); draw(); }
    if (b.dataset.cancel !== undefined) el.remove();
    if (b.dataset.done !== undefined) {
      if (mode === 'mask') {
        if (fields && !mctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data.some((v, k) => k % 4 === 0 && v > 0)) {
          el.querySelector('strong').textContent = 'Paint over the part to change first.'; return;
        }
        onDone(maskCanvas.toDataURL('image/png'), el, {w: canvas.width, h: canvas.height});
      }
      else if (box && box[2] - box[0] > 2) {
        const sx = size?.w ? size.w / canvas.width : 1, sy = size?.h ? size.h / canvas.height : 1;
        onDone([box[0] * sx, box[1] * sy, box[2] * sx, box[3] * sy].map(Math.round));
      }
      el.remove();
    }
  };
}
