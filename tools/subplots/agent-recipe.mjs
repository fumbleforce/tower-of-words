// Agent recipes use the editor's assembler, but cannot rewrite its preset blocks.
// The browser editor remains free to edit shot words; this policy applies to compose.mjs only.
// Exclusion words are manual per section (sectionNegatives, a person's clothingNegative/appearanceNegative, and the
// older free `negative`); they only add to the presets' exclusions, never replace them (#616).
import {applyDefaults, normalizeComposition, assembleComposition, lockedExclusions, TIER_NAMES, COMPOSITION_SCHEMA} from './web/image-compose.js';
import {validateCompositionShape, SCENE_ID_PATTERN, IMAGE_SLOT_PATTERN} from './web/image-composition-schema.js';
import {blockId} from '../imagegen/web/blocks.js';
import {personWords} from './web/image-people.js';

const PERSON_NEGATIVES = ['clothingNegative', 'appearanceNegative'];
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
  if (recipe.styleNegOff) fail('style exclusions cannot be disabled.');
  if (Object.values(recipe.charNegOff || {}).some(Boolean)) fail('character exclusions cannot be disabled.');
  if (Object.values(recipe.people || {}).some(person => keys(person).some(key => !PERSON_NEGATIVES.includes(key))))
    fail('appearance and clothing words must come from character and outfit presets; a person takes only clothingNegative and appearanceNegative.');
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
  // a person's exclusion words add to the template's and the outfit's, as if typed after them in the editor
  for (const [id, words] of Object.entries(c.people || {})) {
    if (!keys(words).length) continue;
    if (!cast.includes(id)) fail('person exclusions name a character absent from the shot.');
    const template = personWords({...c, people: {}}, preset(presets, 'character', id), presets);
    for (const key of keys(words)) words[key] = [template[key], words[key]].map(s => s.trim()).filter(Boolean).join(', ');
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

// Reward calls use the same composition contract and assembler. The rating exclusions are fixed per tier
// (lockedExclusions in web/image-compose.js): the default selection, whose limit presets follow the tier (Adult hard
// keeps none, Adult Mature only the skimpy one, #700), and for a nonadult reward (soft, CLAUDE.md "Reward tiers by
// mode") also the negative preset marked `soft`. A recipe may add other negative presets and section words, never
// remove these.
// The composition is marked reward: true, so the shared assembler (web/image-compose.js) keeps them on, the same as
// the browser composers do for a reward shot.
const sameSet = (a, b) => a.length === b.length && b.every(id => a.includes(id));
export function prepareRewardGeneration(recipe, presets, name = 'recipe') {
  if (!object(recipe)) fail('the composition must be an object.');
  if (recipe.hard != null && typeof recipe.hard !== 'boolean') fail('hard must be true (Adult mode) or false (nonadult, soft).');
  const adult = recipe.hard === true;
  const soft = adult ? [] : (presets.negative || []).filter(p => !p.archived && p.data?.soft === true).map(p => p.id);
  if (!adult && !soft.length) fail('nonadult (soft) reward pictures need the soft negative preset; none is configured.');
  const fixed = lockedExclusions(normalizeComposition({...recipe, negatives: [], reward: true}), presets);
  const {defaults, ids: locked} = fixed;
  const given = recipe.negatives ?? recipe.negs;
  if (given != null && !Array.isArray(given)) fail('negatives must be a list of preset ids.');
  const removed = given ? defaults.filter(id => !given.includes(id)) : [];
  if (removed.length) fail(`reward exclusions keep the configured default selection for ${TIER_NAMES[fixed.tier]}; add presets, never remove them (missing ${removed.join(', ')}).`);
  const negatives = [...new Set([...locked, ...given || []])];
  const rest = {...recipe};
  delete rest.negs;
  const body = prepareAgentGeneration({...rest, negatives, reward: true}, presets, name);
  if (!sameSet(body.compose.negatives, negatives) || locked.some(id => !body.presets.negatives.some(p => p.id === id)))
    fail('reward exclusions changed while assembling.');
  return body;
}

// The established reward recipe directory is enforced even when the caller forgets --reward.
export const isRewardRecipePath = file => /(?:^|[/\\])island[/\\]private[/\\]rewards(?:[/\\]|$)/.test(file);
