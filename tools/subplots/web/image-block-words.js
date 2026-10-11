// A selected template supplies defaults. This shot may replace individual text fields, including with no words.
import {blockText} from '../../imagegen/web/blocks.js';
import {esc} from './common.js';

export function blockData(c, presets, kind, id) {
  const data = presets?.[kind]?.find(p => p.id === id)?.data || {};
  return {...data, ...c.blockOverrides?.[kind]?.[id || '']};
}
export function directionText(c, presets, kind, value) {
  return c.blockOverrides?.[kind]?.[value || '']?.text ?? blockText(presets, kind, value);
}
const FIELDS = {
  style: [['quality', 'Quality'], ['anchors', 'Style'], ['suffix', 'Finishing words'], ['negative', 'Style exclusions']],
  camera: [['prompt', 'Camera words']], framing: [['prompt', 'Framing words']],
  location: [['text', 'Setting words']], light: [['text', 'Lighting words']], pose: [['text', 'Pose words']],
  negative: [['text', 'Words to exclude']],
};
export function localBlockHtml(c, presets, kind, id, title) {
  const data = blockData(c, presets, kind, id), local = c.blockOverrides?.[kind]?.[id || ''];
  const fields = FIELDS[kind] || [];
  if (!fields.length) return '';
  return `<details class="local-block-words" data-local-block="${kind}" data-local-id="${esc(id || '')}"><summary>${esc(title || data.name || kind)}: words in this shot${local && Object.keys(local).length ? ' · edited' : ''}</summary>
    <p class="hint">Changes here apply only to this shot.</p>${fields.map(([key, label]) => {
      const value = key === 'text' && ['location', 'light', 'pose'].includes(kind) ? directionText(c, presets, kind, id) : data[key] || '';
      return `<label>${label}<textarea rows="2" data-block-word="${key}" data-block-kind="${kind}" data-block-id="${esc(id || '')}">${esc(value)}</textarea></label>`;
    }).join('')}<button type="button" class="small" data-reset-block-words="${kind}" data-block-id="${esc(id || '')}">Reset to template</button></details>`;
}
export function bindBlockWords(host, edit) {
  host.querySelectorAll('[data-block-word]').forEach(el => el.oninput = () => {
    edit(c => {
      const {blockKind: kind, blockId: id, blockWord: field} = el.dataset;
      c.blockOverrides ||= {}; c.blockOverrides[kind] ||= {}; c.blockOverrides[kind][id] ||= {};
      c.blockOverrides[kind][id][field] = el.value;
      c.override = null;
    }, false);
    const summary = el.closest('details').querySelector('summary');
    if (!summary.textContent.endsWith(' · edited')) summary.textContent += ' · edited';
  });
  host.querySelectorAll('[data-reset-block-words]').forEach(b => b.onclick = () => edit(c => {
    if (c.blockOverrides?.[b.dataset.resetBlockWords]) delete c.blockOverrides[b.dataset.resetBlockWords][b.dataset.blockId];
    c.override = null;
  }));
}
