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

export function standalonePromptHtml(c, body, ready) {
  return `<section class="studio-prompts" aria-label="Image prompts"><div class="studio-prompt-heading"><h2>Current prompt</h2><button type="button" class="small" data-studio-reset ${c.override ? '' : 'hidden'}>Build from controls</button></div>
    <div class="studio-prompt-pair"><label>Prompt<textarea id="posOut" data-studio-prompt="positive" rows="7" spellcheck="false">${esc(body.positive)}</textarea></label>
    <label>Negative<textarea id="negOut" data-studio-prompt="negative" rows="7" spellcheck="false">${esc(body.negative)}</textarea></label></div>
    <div class="studio-generate"><span class="hint">Editing a prompt uses your words. Changing a control builds it again.</span><button type="button" id="generate" class="primary" ${ready ? '' : 'disabled'}>Generate ${+c.count > 1 ? c.count + ' pictures' : 'a picture'}</button></div></section>`;
}
