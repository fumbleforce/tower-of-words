// The scene-free host keeps the same composition format, but never keeps a story attachment from a reused render.
const {structuredClone} = globalThis;
import {normalizeComposition} from './image-compose.js';
import {esc} from './common.js';

export function standaloneComposition(value = {}) {
  const c = normalizeComposition(structuredClone(value));
  delete c.subplotId;
  delete c.imageSlot;
  c.castInitialized = true;
  return c;
}

export function standaloneJob(body) {
  return {...body, compose: standaloneComposition(body.compose)};
}

// The Current prompt pair (#704): a box edited by hand is coloured, says so and has its own Reset back to what the
// controls make. Use my text exactly sends the boxes as typed, with only the fixed rating exclusions added, listed
// under the Negative box; the section and the Generate button say it's on.
const BOX_IDS = {positive: 'posOut', negative: 'negOut'};
export function standalonePromptHtml(c, boxes, ready) {
  const box = (key, label) => `<div class="studio-prompt-box" data-prompt-box="${key}"><div class="studio-prompt-label"><label for="${BOX_IDS[key]}">${label}</label><span class="edited-tag" data-edited-tag="${key}" hidden></span><button type="button" class="small" data-prompt-reset="${key}" hidden title="Put back the words the selected options make">Reset</button></div>
    <textarea id="${BOX_IDS[key]}" data-studio-prompt="${key}" rows="7" spellcheck="false">${esc(boxes.text[key])}</textarea>${key === 'negative' ? '<p class="hint fixed-note" data-fixed-note></p>' : ''}</div>`;
  return `<section class="studio-prompts${boxes.free ? ' is-free' : ''}" aria-label="Image prompts"><div class="studio-prompt-heading"><h2>Current prompt</h2><label class="free-toggle" title="Send exactly the prompt and negative typed here: no style, preset or default exclusion words. The fixed rating exclusions stay."><input type="checkbox" data-free-text ${boxes.free ? 'checked' : ''}><span>Use my text exactly</span></label></div>
    <p class="free-note" ${boxes.free ? '' : 'hidden'}>Your text exactly. The controls add nothing to these boxes, and changing one leaves your words alone. Model, size, seed and picture tools still apply.</p>
    <div class="studio-prompt-pair">${box('positive', 'Prompt')}${box('negative', 'Negative')}</div>
    <div class="studio-generate"><span class="hint" data-prompt-hint></span><button type="button" id="generate" class="primary" ${ready ? '' : 'disabled'}>${boxes.free ? 'Generate from my text' : 'Generate ' + (+c.count > 1 ? c.count + ' pictures' : 'a picture')}</button></div></section>`;
}
// Brings the boxes up to date without rebuilding them, so typing keeps its place: each box's text (unless it has the
// focus), its edited colour, tag and Reset, and the fixed rating exclusions.
export function paintPromptBoxes(host, c, boxes, fixedText) {
  for (const key of ['positive', 'negative']) {
    const el = host.querySelector(`[data-studio-prompt=${key}]`), wrap = host.querySelector(`[data-prompt-box=${key}]`);
    if (!el || !wrap) continue;
    if (el !== globalThis.document?.activeElement) el.value = boxes.text[key];
    const edited = boxes.edited[key];
    wrap.classList.toggle('is-edited', edited);
    const tag = host.querySelector(`[data-edited-tag=${key}]`);
    tag.hidden = !edited;
    tag.textContent = c.original && !c.edited ? 'As recorded with ' + c.original.how : 'Edited by hand';
    host.querySelector(`[data-prompt-reset=${key}]`).hidden = !edited;
  }
  const note = host.querySelector('[data-fixed-note]');
  if (note) note.textContent = boxes.free || boxes.edited.negative ? fixedText + ' Added when sent.' : '';
  const hint = host.querySelector('[data-prompt-hint]');
  if (hint) hint.textContent = boxes.free ? 'Sent as typed, with the fixed words under Negative.' : 'Typing in a box uses your words there. Changing a control builds it again.';
}
