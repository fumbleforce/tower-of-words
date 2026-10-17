// Both image hosts show the recorded recipe. External providers do not expose local sampler controls.
import {esc} from './blocks.js';

export const isExternal = t => t?.provenance?.kind === 'external';
export const externalReplayNotice = 'This provider does not expose seed replay or local generation settings. See Original generation settings for the recorded request.';
export const providerLabel = t => ({'image_gen.imagegen': 'OpenAI image generator', 'image_gen__imagegen': 'OpenAI image generator'}[t?.provenance?.engine] || 'External image generator');
const timestampLabel = source => ({source_file_mtime: 'Source file modification time', tool_receipt: 'Tool receipt', not_recorded: 'Not recorded'}[source] || 'Other recorded source') + ` (${source || 'not_recorded'})`;
const json = value => `<pre class="ptext" style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(JSON.stringify(value, null, 2))}</pre>`;
const fact = (name, value) => `<span>${esc(name)}</span><span class="mono" style="overflow-wrap:anywhere;min-width:0">${esc(value ?? 'Not recorded')}</span>`;

// Preserve the whole source record, including settings added by either host, without retaining mutable aliases.
export function originalGeneration(j, context = {}) {
  const original = structuredClone(j);
  return {...original, generation: structuredClone(j), ...context};
}

export function provenanceHtml(t) {
  const p = t?.provenance;
  if (!isExternal(t)) return '';
  const output = p.output || {};
  return `<section class="generation-provenance" aria-label="Original generation settings"><h3>Original generation settings</h3>
    <p class="hint">${esc(externalReplayNotice)}</p><div class="kv">${fact('Provider', providerLabel(t))}${fact('Engine identifier', p.engine)}${fact('Import', p.import_id)}
      ${fact('Generation time', p.timestamp_source === 'tool_receipt' ? p.generated_at : null)}
      ${p.timestamp_source === 'source_file_mtime' ? fact('Source file timestamp', p.generated_at) : ''}
      ${fact('Timestamp source', timestampLabel(p.timestamp_source))}${fact('Imported at', t.imported_at)}
      ${fact('Original file', output.path)}${fact('SHA-256', output.sha256)}${fact('Original size', `${output.width ?? '?'} × ${output.height ?? '?'}`)}</div>
    ${p.observed?.request_completeness === 'partial' ? '<p class="hint" data-partial-history>This historical record is incomplete. Settings and image references show only what was recorded.</p>' : ''}
    <details open><summary>Requested settings</summary>${json(p.requested)}</details>
    <details><summary>Observed provider result</summary>${json(p.observed)}</details>
    <p class="hint">Not exposed by this provider: ${esc((p.unavailable || []).join(', ') || 'None recorded')}.</p>
    <h4>Recorded references (in order)</h4>${p.references?.length ? `<ol>${p.references.map(r => `<li><div class="kv">${fact('File', r.path)}${fact('SHA-256', r.sha256)}${fact('Size', `${r.width ?? '?'} × ${r.height ?? '?'}`)}</div></li>`).join('')}</ol>` : '<p class="hint">No image references recorded.</p>'}</section>`;
}

export function externalSourceExplanationHtml(t) {
  return `<section class="image-section external-source-notice"><h3>Made with ${esc(providerLabel(t))}</h3>
    <p class="hint">This provider does not expose seed replay, so its original settings are read-only. See Original generation settings for the recorded request.</p>
    <p class="hint">To switch to the local generator, start a new generation below. It will be queued when you press Generate.</p>
    <button type="button" data-new-local-generation>Start a new local generation</button></section>`;
}

export function localSettingsHtml(t) {
  if (isExternal(t)) return '';
  const keys = ['positive', 'negative', 'model_file', 'seed', 'steps', 'cfg', 'sampler', 'scheduler', 'w', 'h', 'rating', 'overridden', 'free_text', 'compose', 'presets', 'start', 'ipa', 'repaint', 'loras', 'control', 'huefix'];
  const settings = Object.fromEntries(keys.filter(k => Object.hasOwn(t, k)).map(k => [k, t[k]]));
  return `<details class="adv generation-settings"><summary>Recorded generation settings</summary>${json(settings)}</details>`;
}

export function localOriginalPromptHtml(c, {readOnly = false, tools = ''} = {}) {
  const o = c.original, title = readOnly ? 'Original prompt' : 'Loaded prompt';
  const positive = readOnly ? o.positive : c.override?.positive ?? o.positive;
  const negative = readOnly ? o.negative : c.override?.negative ?? o.negative;
  const attributes = key => readOnly ? `data-recorded-prompt="${key}" readonly` : `data-original="${key}"`;
  const facts = ['Seed ' + (o.seed ?? '?'), o.w && o.h ? o.w + '×' + o.h : '', o.steps != null ? o.steps + ' steps' : '', o.cfg != null ? 'CFG ' + o.cfg : ''];
  return `<section class="image-section image-original"><div class="section-head"><h3>${title}</h3><span class="hint original-facts">${esc(facts.filter(Boolean).join(' · '))}</span>${tools}</div>
    <details data-original-open ${c.originalOpen ? 'open' : ''}><summary><span class="original-peek" title="Show the whole ${title.toLowerCase()}">${esc(positive || '')}</span><span class="original-less">Hide the ${title.toLowerCase()}</span></summary>
    <p class="hint">${esc([...facts, o.model_file, o.sampler, o.scheduler].filter(Boolean).join(' · '))}. From ${esc(o.how || 'the picture')}.</p>
    ${readOnly ? '<p class="hint">This is the recorded original. Edit Current prompt beside Generate to make a new version.</p>' : '<p class="hint">These fields edit the current prompt. The recorded original is kept in Recorded generation settings.</p>'}
    ${localSettingsHtml(o.generation || o)}
    <label>Prompt<textarea ${attributes('positive')} rows="3">${esc(positive || '')}</textarea></label>
    <label>Negative<textarea ${attributes('negative')} rows="2">${esc(negative || '')}</textarea></label>
    <button type="button" data-use-original>Use original prompt</button></details></section>`;
}
