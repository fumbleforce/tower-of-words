// Agent recipes use the editor's assembler, but cannot rewrite its preset blocks.
// The browser editor remains free to edit shot words; this policy applies to compose.mjs only.
import {applyDefaults, normalizeComposition, assembleComposition, COMPOSITION_SCHEMA} from './web/image-compose.js';
import {validateCompositionShape, SCENE_ID_PATTERN, IMAGE_SLOT_PATTERN} from './web/image-composition-schema.js';
import {blockId} from '../imagegen/web/blocks.js';

const fail = message => { throw new Error('Agent recipe refused: ' + message); };
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const keys = value => object(value) ? Object.keys(value) : [];

function preset(presets, type, id) {
  const found = (presets[type] || []).find(p => p.id === id && !p.archived);
  if (!found || !object(found.data) || !Number.isInteger(found.v) || found.v < 1)
    fail(`select a current versioned ${type} preset (${id || 'none'}).`);
  return found;
}

function attachment(recipe) {
  const {subplotId, imageSlot} = recipe;
  if (subplotId == null && imageSlot == null) return;
  if (typeof subplotId !== 'string' || !SCENE_ID_PATTERN.test(subplotId) || subplotId.split(/[\/#]/).includes('..')
      || typeof imageSlot !== 'string' || !IMAGE_SLOT_PATTERN.test(imageSlot))
    fail('an attached picture needs the full scene editor subplotId and its exact imageSlot; standalone recipes omit both.');
}

export function prepareAgentGeneration(recipe, presets, name = 'recipe') {
  if (!object(recipe)) fail('the composition must be an object.');
  try { validateCompositionShape(recipe, COMPOSITION_SCHEMA); } catch (error) { fail(error.message); }
  if (recipe.override != null) fail('whole prompt overrides bypass selected presets.');
  if (recipe.negative != null && recipe.negative !== '') fail('exclusion words must come from selected negative presets.');
  if (recipe.styleNegOff) fail('style exclusions cannot be disabled.');
  if (Object.values(recipe.charNegOff || {}).some(Boolean)) fail('character exclusions cannot be disabled.');
  if (Object.values(recipe.people || {}).some(person => keys(person).length)) fail('appearance and clothing words must come from character and outfit presets.');
  if (recipe.example || recipe.placePreview) fail('block examples and place previews are reserved for editor tools.');
  attachment(recipe);
  const c = applyDefaults(normalizeComposition(recipe), presets);
  for (const field of ['characters', 'cameras', 'sceneRefs', 'negatives'])
    if (!Array.isArray(c[field]) || c[field].some(id => typeof id !== 'string')) fail(`${field} must be a list of preset ids.`);
  for (const type of ['model', 'style', 'framing']) preset(presets, type, c[type]);
  for (const [field, type] of [['characters', 'character'], ['cameras', 'camera'], ['sceneRefs', 'scene'], ['negatives', 'negative']])
    for (const id of c[field]) preset(presets, type, id);
  const cast = [...c.characters];
  if (c.man) {
    const generic = (presets.character || []).find(p => p.data?.generic && !p.archived);
    preset(presets, 'character', generic?.id);
    if (!cast.includes(generic.id)) cast.push(generic.id);
  }
  if (!object(c.outfit)) fail('outfit must select presets by character id.');
  for (const [id, selected] of Object.entries(c.outfit)) {
    if (!cast.includes(id)) fail('outfit selection names a character absent from the shot.');
    if (typeof selected === 'string') preset(presets, 'outfit', selected);
    else if (typeof selected !== 'boolean') fail('outfit must be a preset id or the default outfit toggle.');
  }
  // Pose/place/light retain the editor's documented literal staging words as well as preset ids.
  for (const [field, type] of [['pose', 'pose'], ['environment', 'location'], ['light', 'light']]) {
    const id = blockId(presets, type, c[field]);
    if (id) preset(presets, type, id);
  }
  if (recipe.blockOverrides != null && !object(recipe.blockOverrides)) fail('blockOverrides must be an object.');
  for (const [kind, blocks] of Object.entries(recipe.blockOverrides || {})) {
    if (Object.values(blocks).every(words => keys(words).length === 0)) continue;
    if (!['location', 'light', 'pose'].includes(kind)) fail(`${kind} block words must come from the selected preset.`);
    if (!object(blocks)) fail(`${kind} staging overrides must be an object.`);
    const field = {location: 'environment', light: 'light', pose: 'pose'}[kind];
    for (const [id, words] of Object.entries(blocks)) {
      if (id !== c[field] || !object(words) || keys(words).some(key => key !== 'text') || typeof words.text !== 'string')
        fail(`${kind} staging only supports text for the selected block.`);
    }
  }
  const body = assembleComposition(c, presets, recipe.subplotId || 'recipe:' + name);
  body.compose.recipe = name;
  if (!body.model_file) fail('the selected model preset has no model file.');
  return body;
}
