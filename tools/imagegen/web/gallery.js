/* Rating, the lightbox and side-by-side compare: one implementation for the image gen dashboard (app.js) and the scene
   editor's composer (tools/subplots/web/library.js). Each page wires the clicks; the markup, the rating rules and the
   keys are here. `base` is where the image service answers ('' on 8772, '/api/subplots/image' through the editor). */
import { esc, wordDiff } from './blocks.js';

export const isAgent = t => t?.source === 'agent';
// Only this local, content-addressed endpoint may override a render's service URL.
export function draftPictureUrl(value) {
  if (typeof value !== 'string' || !value.startsWith('/api/subplots/draft-picture?') || value.includes('#')) return '';
  const query = new URLSearchParams(value.slice(value.indexOf('?') + 1));
  return [...query].length === 2 && /^studio:(public|private):[a-f0-9]{32}$/.test(query.get('id') || '')
    && /^[a-f0-9]{64}$/.test(query.get('asset') || '') ? value : '';
}
// agent renders from old rounds have no copy in the dashboard, only their original
export const fullUrl = (t, base = '') => draftPictureUrl(t.url) || (t.file ? `${base}/out/${t.file}` : `${base}/agentsrc/${encodeURIComponent(t.id)}`);
export const thumbUrl = (t, base = '') => draftPictureUrl(t.url) || (t.thumb ? `${base}/thumb/${t.thumb}` : t.file ? `${base}/out/${t.file}` : '');

// What a star, favourite or reject sets on a picture (a favourite is also starred; a reject clears both).
export function rateFields(action, t, reason = '') {
  if (action === 'star') return { star: !t.star, reject: false, ...(t.star ? { fav: false } : {}) };
  if (action === 'fav') return { fav: !t.fav, star: !t.fav ? true : t.star, reject: false };
  if (action === 'reject') return t.reject ? { reject: false, reject_reason: '' } : { reject: true, star: false, fav: false, reject_reason: reason };
  return {};
}

// The lightbox's keys: arrows step, s star, f favourite, x reject, Delete deletes, Escape closes.
export function lightboxKey(e) {
  return { ArrowRight: 'next', ArrowLeft: 'prev', Escape: 'close', s: 'star', f: 'fav', x: 'reject', Delete: 'del' }[e.key] || null;
}

// ctx: { i, n, pinned, raw (show before the face fix), styleName, base }
export function lightboxHtml(t, ctx) {
  const c = t.compose || {}, base = ctx.base || '', agent = isAgent(t);
  return `<div class="lb">
    <div class="pic"><img src="${ctx.raw && t.raw_file ? `${base}/out/${esc(t.raw_file)}` : esc(fullUrl(t, base))}" alt="Seed ${t.seed}">
      ${ctx.n > 1 ? `<button class="btn nav l" data-lb="-1" aria-label="Previous"><i class="ph ph-caret-left"></i></button><button class="btn nav r" data-lb="1" aria-label="Next"><i class="ph ph-caret-right"></i></button>` : ''}</div>
    <div class="side">
      <div class="row gap8"><h2 style="margin-right:auto">${ctx.i + 1} of ${ctx.n}</h2>${t.n ? `<button class="btn sm" data-a="copyn" data-id="${esc(t.id)}" title="Copy the picture number">#${t.n}</button>` : ''}<button class="btn sm" data-close="1"><i class="ph ph-x"></i> Close</button></div>
      <div class="row gap8 wrap">
        <button class="btn sm" data-a="star" data-id="${esc(t.id)}" aria-pressed="${!!t.star}"><i class="${t.star ? 'ph-fill' : 'ph'} ph-star"></i> ${t.star ? 'Starred' : 'Star'}</button>
        <button class="btn sm" data-a="fav" data-id="${esc(t.id)}" aria-pressed="${!!t.fav}"><i class="${t.fav ? 'ph-fill' : 'ph'} ph-heart"></i> Favourite</button>
        <button class="btn sm${t.reject ? ' danger' : ''}" data-lbrej="1" aria-pressed="${!!t.reject}"><i class="ph ph-x-circle"></i> ${t.reject ? 'Rejected' : 'Reject'}</button>
        <button class="btn sm" data-a="pin" data-id="${esc(t.id)}" aria-pressed="${!!ctx.pinned}"><i class="ph ph-columns"></i> ${ctx.pinned ? 'Pinned' : 'Compare'}</button>
        <button class="btn sm danger" data-a="del" data-id="${esc(t.id)}" title="Delete (Delete key)"><i class="ph ph-trash"></i> Delete</button>
      </div>
      <div class="row gap8 wrap">
        <button class="btn sm" data-a="sameseed" data-id="${esc(t.id)}">${ctx.useLabel || (agent ? 'Load prompt and seed into Compose' : 'Same seed, edit prompt')}</button>
        ${agent && !ctx.agentNewSeeds ? '' : `<button class="btn sm" data-a="newseeds" data-id="${esc(t.id)}">New seeds, same prompt</button>`}
        <button class="btn sm" data-a="copyseed" data-id="${esc(t.id)}">Copy seed ${t.seed}</button>
      </div>
      <label>Reject reason<input type="text" id="lbReason" value="${esc(t.reject_reason || '')}" placeholder="Only needed if you reject it"></label>
      <label>Note to Claude<textarea id="lbNote" rows="2" placeholder="What works, what doesn't">${esc(t.note || '')}</textarea></label>
      <div class="kv"><span>Seed</span><span class="mono">${t.seed}</span><span>Model</span><span>${esc((t.model_file || '').replace('.safetensors', ''))}</span>
        <span>Size</span><span>${t.w} × ${t.h}</span>${agent ? '' : `<span>Style</span><span>${esc(ctx.styleName || c.style || '')}</span>`}
        <span>Steps</span><span>${esc(t.steps ?? 'Not recorded')}</span><span>Prompt strength (CFG)</span><span>${esc(t.cfg ?? 'Not recorded')}</span>${t.sampler ? `<span>Sampler</span><span>${esc(t.sampler)}${t.scheduler ? ' ' + esc(t.scheduler) : ''}</span>` : ''}
        ${t.start ? `<span>Started from</span><span class="mono" style="word-break:break-all">${esc(t.start.image)} at ${t.start.denoise}${t.start.mask ? ', masked (inpaint)' : ''}</span>` : ''}
        ${(t.loras || []).length ? `<span>LoRA</span><span>${t.loras.map(l => esc(l.file.replace('.safetensors', '')) + ' ' + l.weight).join('<br>')}</span>` : ''}
        ${t.control ? `<span>Guide</span><span>${esc(t.control.file.replace('.safetensors', ''))} at ${t.control.strength}</span>` : ''}
        ${(t.huefix || []).length ? `<span>Colour fix</span><span>${t.huefix.map(h => esc(h.op)).join(', ')}</span>` : ''}
        ${agent ? `<span>Made by</span><span>${esc(t.owner || '')}</span><span>Round</span><span class="mono" style="word-break:break-all">${esc(t.round || '')}</span>
          <span>Original</span><span class="mono" style="word-break:break-all">${esc(t.out_path || '')}</span>${t.mode && t.mode !== 'txt2img' ? `<span>Mode</span><span>${esc(t.mode)}${t.denoise != null ? ' at ' + t.denoise : ''}${t.src_image ? ', from ' + esc(t.src_image) : ''}</span>` : ''}
          ${(t.extras || []).length ? `<span>Also used</span><span>${t.extras.map(esc).join('<br>')}</span>` : ''}` : '<span>Made by</span><span>Jørgen (dashboard)</span>'}
        <span>Render</span><span class="mono">${esc(t.id)}</span>
        ${agent ? '' : `<span>On-model</span><span>${t.ipa ? `Reference at ${(+t.ipa.strength).toFixed(2)}${t.ipa.cutout ? ' (cut out onto white)' : ''}` : 'No reference'}${t.repaint ? (t.repaint.skipped ? `; face fix skipped: ${esc(t.repaint.skipped)}` : `; face fix at ${(+t.repaint.denoise).toFixed(2)}${t.repaint.secs ? ` (${t.repaint.secs} s)` : ''}`) : ''}</span>
        ${t.ipa || t.repaint ? `<span>Reference</span><span class="mono" style="word-break:break-all">${esc((t.ipa || t.repaint).ref)}</span>` : ''}`}</div>
      ${t.raw_file ? `<div class="row gap8"><button class="btn sm" data-lbraw="1">${ctx.raw ? 'Show the result' : 'Show before the fix'}</button></div>` : ''}
      ${t.repaint && !t.repaint.skipped ? `<details class="adv"><summary>Repaint prompt</summary><div class="ptext mt4">${esc(t.repaint.prompt)}</div></details>` : ''}
      <div><div class="lbl">Positive${t.overridden ? ' <span class="badge">edited by hand</span>' : ''}</div><div class="ptext">${esc(t.positive || '')}</div></div>
      <div><div class="lbl">Negative</div><div class="ptext">${esc(t.negative || '')}</div></div>
    </div></div>`;
}

// Pinned pictures side by side; each prompt after the first shows its words against the first one's.
export function compareHtml(pins, base = '') {
  const first = pins[0];
  return `<button class="btn sm close" data-close="1"><i class="ph ph-x"></i> Close</button><div class="cmp"><div class="cmpgrid">${pins.map((p, k) => `
    <figure><img src="${esc(fullUrl(p, base))}" alt="Seed ${p.seed}" data-open="${esc(p.id)}" style="cursor:zoom-in">
      <figcaption><div class="row gap8" style="margin-bottom:6px"><button class="btn sm" data-unpin="${esc(p.id)}">Unpin</button><button class="btn sm danger" data-cdel="${esc(p.id)}"><i class="ph ph-trash"></i> Delete</button></div><div class="kv"><span>Seed</span><span class="mono">${p.seed}</span><span>Model</span><span>${esc((p.model_file || '').replace('.safetensors', ''))}</span></div>
      <div class="lbl mt8">Positive${k ? ' (changes from the first)' : ''}</div><div class="ptext">${k ? wordDiff(first.positive, p.positive) : esc(p.positive || '')}</div>
      <div class="lbl mt8">Negative</div><div class="ptext">${k ? wordDiff(first.negative, p.negative) : esc(p.negative || '')}</div></figcaption></figure>`).join('')}</div></div>`;
}
