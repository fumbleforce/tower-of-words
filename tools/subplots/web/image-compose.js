// Uses the existing image dashboard's preset records and request format. Pose, setting (`environment`) and light are
// blocks like the rest (kinds pose, location, light in blocks.js); a composition keeps the block's id, and an older
// one that kept the words themselves still reads (blockText).
const {structuredClone} = globalThis;
import {blockId} from '../../imagegen/web/blocks.js';
import {blockData, directionText} from './image-block-words.js';
import {personWords} from './image-people.js';
import {stageWords, personOf} from './image-stage.js';
import {compositionSchema} from './image-composition-schema.js';
import {sectionNegativeWords} from './image-section-negatives.js';
import ALWAYS_NEGATIVE from '../../imagegen/web/always-negative.json' with {type: 'json'};
export const DIRECTION_KINDS = [['pose', 'pose', 'Pose'], ['environment', 'location', 'Setting'], ['light', 'light', 'Light']];
export const DEFAULT_COMPOSITION = {
  characters: [], outfit: {}, useShort: true, cameras: [], sceneRefs: [], negatives: null,
  rating: 'safe', count: 1, seedMode: 'random', seed: '', scene: '', pose: '', angle: '', environment: '', light: '',
  extra: '', details: '', hard: false,
  // Use my text exactly (#704): the Prompt and Negative boxes are sent as typed, with only the fixed rating exclusions
  // (fixedFor) and the always-on words added; no style, preset or default exclusion words
  freeText: false,
  // a reward picture (CLAUDE.md, Reward tiers by mode): its soft-scene exclusion is on unless hard
  reward: false,
  reference: '', referenceOn: false, referenceStrength: 0.6, referenceCutout: false, faceFix: false, faceStrength: 0.65,
};
// One typed field contract for compositions; agent validation leaves the browser's editing policy intact.
export const COMPOSITION_SCHEMA = compositionSchema(DEFAULT_COMPOSITION);
export const COMPOSITION_FIELDS = Object.freeze(Object.keys(COMPOSITION_SCHEMA.properties));
// What an empty composition gets from the presets: the first model, style and framing, and the default negatives.
// The composer and the recipe command (tools/subplots/compose.mjs) both call this, so a recipe means what the editor shows.
export function applyDefaults(c, presets) {
  const active = type => (presets?.[type] || []).filter(p => !p.archived);
  for (const type of ['model', 'style', 'framing']) if (!c[type]) c[type] = active(type)[0]?.id || '';
  if (c.negatives === null) c.negatives = defaultNegatives(presets, tierOf(c, presets));
  return c;
}
// The rating tier of a shot (CLAUDE.md, Reward tiers by mode): a nonadult shot is 'nonadult' at every content level;
// an Adult-mode shot (hard) is 'safe' at General, 'skimpy' at Mature and 'hard' at Adult.
export const TIER_NAMES = {nonadult: 'nonadult', safe: 'Adult mode at General', skimpy: 'Adult mode at Mature, skimpy', hard: 'Adult mode at Adult, hard'};
export const ratingTier = (c, rating) => !c.hard ? 'nonadult' : rating === 'nsfw' ? 'hard' : rating === 'sensitive' ? 'skimpy' : 'safe';
const RATINGS = ['safe', 'sensitive', 'nsfw'];
// who is in the shot: the picked characters and, when asked for, the generic man
function castOf(c, presets) {
  const selected = (Array.isArray(c.characters) ? c.characters : []).map(id => (presets.character || []).find(p => p.id === id)).filter(Boolean);
  const generic = c.man && (presets.character || []).find(p => p.data.generic && !p.archived);
  return {chars: generic && !selected.includes(generic) ? [...selected, generic] : selected, generic};
}
// the content level asked for, capped by any character preset's rating cap; an Adult-mode shot (hard) is not capped,
// so a capped character still gets the Adult level there (#700); the cap holds for nonadult and public shots
function ratingOf(c, chars) {
  let i = Math.max(0, RATINGS.indexOf(c.rating));
  if (!c.hard) chars.forEach(p => { const cap = RATINGS.indexOf(p.data.rating_cap); if (cap >= 0) i = Math.min(i, cap); });
  return RATINGS[i];
}
export const tierOf = (c, presets) => ratingTier(c, ratingOf(c, castOf(c, presets || {}).chars));
// A negative preset marked `limit` is a rating exclusion that follows the tier instead of its default switch (#700):
// 'full' (nipples, genitals, sex) for nonadult shots and Adult General ones, 'skimpy' (genitals and sex, nipples
// allowed) for Adult Mature; Adult hard keeps neither. The always-on words (always-negative.json) stay in every tier.
const TIER_LIMITS = {nonadult: ['full'], safe: ['full'], skimpy: ['skimpy'], hard: []};
const tierKeeps = (p, tier) => p.data?.limit ? TIER_LIMITS[tier].includes(p.data.limit) : !!p.data?.default;
const liveNegatives = presets => (presets?.negative || []).filter(p => !p.archived);
const defaultNegatives = (presets, tier) => liveNegatives(presets).filter(p => tierKeeps(p, tier)).map(p => p.id);
// When a shot's tier changes (the Shot mode, the content level, a rating cap), its limit presets follow: the ones the
// new tier drops come off the selection and the ones it keeps go on. Every other pick stays as it was.
export function followTier(c, presets, before) {
  const tier = tierOf(c, presets);
  if (tier === before || !Array.isArray(c.negatives)) return c;
  const limits = liveNegatives(presets).filter(p => p.data?.limit);
  c.negatives = [...c.negatives.filter(id => !limits.some(p => p.id === id)), ...limits.filter(p => tierKeeps(p, tier)).map(p => p.id)];
  return c;
}
export function normalizeComposition(value = {}) {
  const c = {...structuredClone(DEFAULT_COMPOSITION), ...value};
  c.characters = value.characters || value.chars || [];
  c.cameras = value.cameras || value.cams || (value.camera ? [value.camera] : []);
  c.negatives = value.negatives ?? value.negs ?? null;
  if (value.blockOverrides) c.blockOverrides = structuredClone(value.blockOverrides);
  if (value.people) c.people = structuredClone(value.people);
  if (value.stage) c.stage = structuredClone(value.stage);
  c.seedMode = value.seedMode || (value.seed === '' || value.seed == null ? 'random' : 'fixed');
  if (value.ipa) Object.assign(c, {reference: value.ipa.ref || value.omRef || '', referenceOn: value.ipa.on, referenceStrength: value.ipa.strength, referenceCutout: value.ipa.cutout});
  if (value.fix) Object.assign(c, {faceFix: value.fix.on, faceStrength: value.fix.denoise});
  return c;
}
const smartJoin = parts => parts.filter(Boolean).map(String).map(s => s.trim()).filter(Boolean).reduce((out, s) => out ? out + (/[.!?;:]$/.test(out) ? ' ' : ', ') + s : s, '');
const dedupe = parts => [...new Map(parts.filter(Boolean).join(', ').split(',').map(s => s.trim()).filter(Boolean).map(s => [s.toLowerCase(), s])).values()].join(', ');
export function portraitUrl(path) {
  if (!path || path.includes('..') || path.includes('\\')) return '';
  const root = '/api/subplots/image/';
  const portraits = 'island/private/imagegen/portraits/';
  const outputs = 'island/private/imagegen/outputs/';
  if (path.startsWith(portraits)) return root + 'priv/portraits/' + path.slice(portraits.length);
  if (path.startsWith(outputs)) return root + 'out/' + path.slice(outputs.length);
  if (path.startsWith('island/private/')) return '';
  return root + 'repo/' + path.replace(/^\//, '');
}
// The prompt and the job, and which block wrote each stretch of the prompt (parts).
function build(c, presets, subplotId) {
  const byId = (type, id) => (presets[type] || []).find(p => p.id === id);
  const {chars, generic} = castOf(c, presets);
  const style = blockData(c, presets, 'style', c.style);
  const rating = ratingOf(c, chars);
  const countGender = gender => chars.filter(p => (p.data.gender || 'female') === gender).length;
  const countTag = (n, single) => n ? n + single + (n > 1 ? 's' : '') : '';
  const cast = [countTag(countGender('female'), 'girl'), countTag(countGender('male'), 'boy')].filter(Boolean).join(', ');
  const people = chars.map(p => personWords(c, p, presets));
  const blocks = people.map(p => [chars.length > 1 && c.useShort ? p.short : p.appearance, p.clothing].filter(Boolean).join(', '));
  // the staging (image-stage.js): who stands where, facing and looking at what, heights, contact; then the light's
  // direction and the mood after the setting and light blocks
  const staged = stageWords(c, chars.map(personOf));
  const sentence = x => String(x || '').trim().replace(/[.]+$/, '');
  const directionParts = [['action', 'What happens', c.scene], ['pose', 'Pose', directionText(c, presets, 'pose', c.pose)], ['stage', 'Staging', staged.people], ['camera', 'Older camera angle', c.angle],
    ['place', 'Setting', directionText(c, presets, 'location', c.environment)], ['light', 'Light', directionText(c, presets, 'light', c.light)], ['light', 'Light from', staged.light], ['mood', 'Mood', staged.mood]]
    .map(([kind, label, text]) => [kind, label, sentence(text)]).filter(x => x[2]);
  const direction = directionParts.map(x => x[2]).join('. ');
  const head = [style.quality, rating, cast, style.anchors].filter(Boolean).join(', ');
  const cameraWords = c.cameras.map(id => blockData(c, presets, 'camera', id).prompt).filter(Boolean).join(', ');
  const positive = smartJoin([head, blocks.join('; '), direction, cameraWords, blockData(c, presets, 'framing', c.framing).prompt, c.extra, style.suffix]);
  // which block each stretch of the prompt comes from, in order, for the composer's coloured prompt (promptParts)
  const parts = [['style', 'Quality and style', [style.quality, rating].filter(Boolean).join(', ')], ['cast', 'Who is in it', cast], ['style', 'Style', style.anchors],
    ...blocks.map((text, i) => ['person', chars[i].data.generic ? 'The other person' : chars[i].data.name || chars[i].id, text]), ...directionParts,
    ['camera', 'Camera', cameraWords], ['camera', 'Picture shape', blockData(c, presets, 'framing', c.framing).prompt], ['details', 'More details', c.extra], ['style', 'Style', style.suffix]]
    .map(([kind, label, text]) => ({kind, label, text: String(text || '').trim()})).filter(x => x.text);
  // The negative, in this order: the selected exclusion presets, the style's, each person's appearance and clothing
  // exclusions, the section exclusions (image-section-negatives.js) and the older free words, the always-on base, then
  // the locked rating exclusions not already in. Content exclusions are manual; rating exclusions are fixed (#616):
  // the soft-scene exclusion is the negative preset marked soft, never typed words (CLAUDE.md, Reward tiers by mode),
  // on for every nonadult reward and for a nonadult Mature or Adult picture; a reward (nonadult or Adult) also keeps
  // the tier's limit presets (fixedFor). Nothing typed removes them.
  const fixed = fixedFor(c, presets, rating);
  const free = c.freeText === true;
  const negatives = c.negatives || defaultNegatives(presets, fixed.tier);
  const lockedIds = fixed.ids;
  const lockedAdded = lockedIds.filter(id => !negatives.includes(id));
  const lockedTexts = lockedIds.map(id => blockData(c, presets, 'negative', id).text);
  const typed = typedText(c);
  const composedNegative = dedupe([...negatives.map(id => blockData(c, presets, 'negative', id).text), c.blockOverrides?.style?.[c.style]?.negative ?? (c.styleNegOff ? '' : style.negative),
    ...people.map(p => p.appearanceNegative), ...people.map(p => p.clothingNegative), ...sectionNegativeWords(c), c.negative, ...ALWAYS_NEGATIVE,
    ...lockedAdded.map(id => blockData(c, presets, 'negative', id).text)]);
  // a box typed by hand is sent as typed, plus the fixed rating exclusions (the server adds the always-on words); with
  // Use my text exactly, a box never typed in still sends only what it shows (the composed words, less the fixed ones)
  const bare = bareNegative(composedNegative, lockedTexts);
  const negative = typed.negative != null ? (lockedIds.length ? dedupe([typed.negative, ...lockedTexts]) : typed.negative)
    : free ? dedupe([bare, ...lockedTexts]) : composedNegative;
  const md = byId('model', c.model)?.data || {};
  const fr = byId('framing', c.framing)?.data || {};
  const ref = (type, id) => { const p = byId(type, id); return p ? {id: p.id, v: p.v} : null; };
  const portrait = c.reference || (chars.length === 1 ? chars[0].data.portrait : '');
  const canReference = chars.length === 1 && portrait;
  const ownTemplate = chars[0]?.data || {};
  const own = c.people?.[chars[0]?.id]?.appearance ?? [ownTemplate.name, ownTemplate.age, ownTemplate.look, ownTemplate.signature].filter(Boolean).join(', ');
  const repaintPrompt = smartJoin([style.quality, rating, 'Two panels side by side showing the same person, a close-up of their head.', 'Both panels show the same face, hairstyle, hair colour and eyes.', own]);
  return {parts, composed: {positive, negative: composedNegative, bare}, body: {
    positive: free ? typed.positive ?? positive : typed.positive?.trim() || positive,
    negative, overridden: !!c.override || free, free_text: free,
    model_file: md.file, steps: +c.steps || md.steps || 30, cfg: c.cfg != null && c.cfg !== '' ? +c.cfg : (md.cfg ?? 5),
    sampler: c.sampler || md.sampler || 'euler_ancestral', scheduler: c.scheduler || md.scheduler || 'normal',
    ...(md.clip_skip ? {clip_skip: +md.clip_skip} : {}), ...(md.vae ? {vae: md.vae} : {}),
    w: +c.width || fr.w || 1152, h: +c.height || fr.h || 896, count: Math.min(8, Math.max(1, +c.count || 1)),
    seed_mode: c.seedMode, seed: +c.seed || 0, rating, characters: chars.map(p => p.id), scene_text: direction,
    compose: {...structuredClone({...c, original: undefined}), chars: c.characters, cams: c.cameras, subplotId},
    start: c.start?.image ? {image: c.start.image, denoise: +c.start.denoise || 0.35, ...(c.start.mask ? {mask: c.start.mask} : {})} : null,
    loras: withStyleLoras(free ? '' : style.loras, c.loras), control: c.control?.file && c.control.image ? {...c.control} : null,
    huefix: (c.huefix || []).map(h => ({...h})),
    presets: {characters: c.characters.map(id => ref('character', id)).filter(Boolean), man: generic ? ref('character', generic.id) : null,
      model: ref('model', c.model), style: free ? null : ref('style', c.style), framing: ref('framing', c.framing),
      cameras: c.cameras.map(id => ref('camera', id)).filter(Boolean), scenes: c.sceneRefs.map(id => ref('scene', id)).filter(Boolean), negatives: (free ? lockedIds : [...negatives, ...lockedAdded]).map(id => ref('negative', id)).filter(Boolean),
      pose: ref('pose', blockId(presets, 'pose', c.pose)), location: ref('location', blockId(presets, 'location', c.environment)), light: ref('light', blockId(presets, 'light', c.light)),
      outfits: Object.values(c.outfit).filter(v => typeof v === 'string').map(id => ref('outfit', id)).filter(Boolean)},
    ipa: canReference && c.referenceOn ? {ref: portrait, strength: +c.referenceStrength, cutout: !!c.referenceCutout} : null,
    repaint: canReference && c.faceFix ? {ref: portrait, denoise: +c.faceStrength, prompt: repaintPrompt} : null,
    autostart: true,
  }, locked: fixed};
}
// What was typed in the Prompt and Negative boxes ({positive?, negative?}); an older override is the prompt alone.
const typedText = c => typeof c.override === 'string' ? {positive: c.override} : c.override || {};
// The composed negative without the fixed rating exclusions and the always-on words, which are added on sending anyway:
// the words a free-text Negative box starts from.
function bareNegative(negative, fixedTexts) {
  const drop = new Set(dedupe([...fixedTexts, ...ALWAYS_NEGATIVE]).split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
  return negative.split(',').map(s => s.trim()).filter(s => s && !drop.has(s.toLowerCase())).join(', ');
}
// The two prompt boxes of the image workspace (#704): the text each shows, the text the controls would put there
// (Reset brings it back), and whether it was edited by hand, which colours the box. With Use my text exactly the
// Negative box holds only the typed words; the fixed rating exclusions are listed beside it (fixed).
export function promptBoxes(c, presets, subplotId) {
  const {body, composed, locked} = build(c, presets || {}, subplotId);
  const typed = typedText(c), free = c.freeText === true;
  const fromControls = {positive: composed.positive, negative: free ? composed.bare : composed.negative};
  const text = {positive: body.positive, negative: typed.negative ?? fromControls.negative};
  const edited = Object.fromEntries(['positive', 'negative'].map(k => [k, typed[k] != null && typed[k].trim() !== fromControls[k].trim()]));
  return {text, fromControls, edited, free, fixed: locked};
}
// Turning Use my text exactly on keeps what the boxes show and makes it the text sent; turning it off keeps the typed
// words as hand edits. Reset of one box puts back what the controls make (in free mode as the typed text).
export function setFreeText(c, presets, on, subplotId) {
  if (on) {
    const {text} = promptBoxes({...c, freeText: true}, presets, subplotId);
    const fixedTexts = fixedFor(c, presets || {}, ratingOf(c, castOf(c, presets || {}).chars)).ids.map(id => blockData(c, presets || {}, 'negative', id).text);
    c.override = {positive: text.positive, negative: bareNegative(text.negative, fixedTexts)};
  }
  c.freeText = !!on;
  return c;
}
export function resetPromptBox(c, presets, key, subplotId) {
  const typed = {...typedText(c)};
  if (c.freeText === true) typed[key] = promptBoxes(c, presets, subplotId).fromControls[key];
  else delete typed[key];
  c.override = typed.positive != null || typed.negative != null ? typed : null;
  return c;
}
// The style's LoRAs ("file:weight, file:weight") first, then the composition's own; a file the composition also picks
// keeps the composition's weight.
export function withStyleLoras(text, own) {
  const mine = (own || []).map(l => ({file: l.file, weight: +l.weight}));
  const fromStyle = String(text || '').split(',').map(x => x.trim()).filter(Boolean).map(x => {
    const i = x.lastIndexOf(':');
    return i > 0 && x.slice(i + 1).trim() !== '' && !isNaN(+x.slice(i + 1)) ? {file: x.slice(0, i).trim(), weight: +x.slice(i + 1)} : {file: x, weight: 1};
  }).filter(l => !mine.some(m => m.file === l.file));
  return [...fromStyle, ...mine];
}
export const assembleComposition = (c, presets, subplotId) => build(c, presets, subplotId).body;
// The rating exclusions for this shot (ids): the soft preset where it applies (soft: true) and, for a reward, the limit
// presets its tier keeps (#700). They are kept on whatever is selected or typed; the composer shows them on and locked,
// and names them (images.js). Body heavy, low quality and the other plain defaults are only defaults, which Jørgen can
// switch off (#704). defaults is a reward's default selection for the tier, which an agent's reward recipe must keep
// (tools/subplots/agent-recipe.mjs); the composer doesn't lock it.
function fixedFor(c, presets, rating) {
  const tier = ratingTier(c, rating);
  const soft = tier === 'nonadult' && (c.reward === true || rating !== 'safe');
  const defaults = c.reward === true ? defaultNegatives(presets, tier) : [];
  const limits = defaults.filter(id => liveNegatives(presets).find(p => p.id === id)?.data?.limit);
  const softIds = soft ? liveNegatives(presets).filter(p => p.data?.soft === true).map(p => p.id) : [];
  return {tier, soft, defaults, ids: [...limits, ...softIds.filter(id => !limits.includes(id))]};
}
export const lockedExclusions = (c, presets) => fixedFor(c, presets || {}, ratingOf(c, castOf(c, presets || {}).chars));
// The built prompt cut into the stretches each block wrote, for display only: [{kind, label, text}] with the plain
// separators between them as {text}. A prompt copied from history (override) is one plain stretch.
export function promptParts(c, presets, subplotId) {
  const {body, parts} = build(c, presets, subplotId);
  if (body.overridden && (body.free_text || typedText(c).positive != null)) return [{text: body.positive}];
  const out = [];
  let at = 0;
  for (const part of parts) {
    const i = body.positive.indexOf(part.text, at);
    if (i < 0) continue;
    if (i > at) out.push({text: body.positive.slice(at, i)});
    out.push(part);
    at = i + part.text.length;
  }
  if (at < body.positive.length) out.push({text: body.positive.slice(at)});
  return out;
}
