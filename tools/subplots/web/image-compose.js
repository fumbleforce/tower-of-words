// Uses the existing image dashboard's preset records and request format. Pose, setting (`environment`) and light are
// blocks like the rest (kinds pose, location, light in blocks.js); a composition keeps the block's id, and an older
// one that kept the words themselves still reads (blockText).
const {structuredClone} = globalThis;
import {blockId} from '../../imagegen/web/blocks.js';
import {blockData, directionText} from './image-block-words.js';
import {personWords} from './image-people.js';
import {stageWords, personOf} from './image-stage.js';
import {compositionSchema} from './image-composition-schema.js';
export const DIRECTION_KINDS = [['pose', 'pose', 'Pose'], ['environment', 'location', 'Setting'], ['light', 'light', 'Light']];
export const DEFAULT_COMPOSITION = {
  characters: [], outfit: {}, useShort: true, cameras: [], sceneRefs: [], negatives: null,
  rating: 'safe', count: 1, seedMode: 'random', seed: '', scene: '', pose: '', angle: '', environment: '', light: '',
  extra: '', details: '', hard: false,
  reference: '', referenceOn: false, referenceStrength: 0.6, referenceCutout: false, faceFix: false, faceStrength: 0.65,
};
// One typed field contract for compositions; agent validation leaves the browser's editing policy intact.
export const COMPOSITION_SCHEMA = compositionSchema(DEFAULT_COMPOSITION);
export const COMPOSITION_FIELDS = Object.freeze(Object.keys(COMPOSITION_SCHEMA.properties));
// The negative every Mature or Adult picture must carry unless the scene is marked hard (CLAUDE.md, soft reward scenes).
export const SOFT_NEGATIVE = 'visible nipples, visible genitals, uncovered crotch, frontal explicit view, explicit sexual action, transparent unobstructed body';
// What an empty composition gets from the presets: the first model, style and framing, and the default negatives.
// The composer and the recipe command (tools/subplots/compose.mjs) both call this, so a recipe means what the editor shows.
export function applyDefaults(c, presets) {
  const active = type => (presets?.[type] || []).filter(p => !p.archived);
  for (const type of ['model', 'style', 'framing']) if (!c[type]) c[type] = active(type)[0]?.id || '';
  if (c.negatives === null) c.negatives = active('negative').filter(p => p.data.default).map(p => p.id);
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
  const selected = c.characters.map(id => byId('character', id)).filter(Boolean);
  const generic = c.man && (presets.character || []).find(p => p.data.generic && !p.archived);
  const chars = generic && !selected.includes(generic) ? [...selected, generic] : selected;
  const style = blockData(c, presets, 'style', c.style);
  const ratings = ['safe', 'sensitive', 'nsfw'];
  let ratingIndex = Math.max(0, ratings.indexOf(c.rating));
  chars.forEach(p => { const cap = ratings.indexOf(p.data.rating_cap); if (cap >= 0) ratingIndex = Math.min(ratingIndex, cap); });
  const rating = ratings[ratingIndex];
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
  const negatives = c.negatives || (presets.negative || []).filter(p => !p.archived && p.data.default).map(p => p.id);
  const soft = rating !== 'safe' && !c.hard;
  const withSoft = text => soft ? dedupe([text, SOFT_NEGATIVE]) : text;
  const negative = withSoft(dedupe([...negatives.map(id => blockData(c, presets, 'negative', id).text), c.blockOverrides?.style?.[c.style]?.negative ?? (c.styleNegOff ? '' : style.negative),
    ...people.map(p => p.appearanceNegative), ...people.map(p => p.clothingNegative), c.negative, 'child, loli']));
  const md = byId('model', c.model)?.data || {};
  const fr = byId('framing', c.framing)?.data || {};
  const ref = (type, id) => { const p = byId(type, id); return p ? {id: p.id, v: p.v} : null; };
  const portrait = c.reference || (chars.length === 1 ? chars[0].data.portrait : '');
  const canReference = chars.length === 1 && portrait;
  const ownTemplate = chars[0]?.data || {};
  const own = c.people?.[chars[0]?.id]?.appearance ?? [ownTemplate.name, ownTemplate.age, ownTemplate.look, ownTemplate.signature].filter(Boolean).join(', ');
  const repaintPrompt = smartJoin([style.quality, rating, 'Two panels side by side showing the same person, a close-up of their head.', 'Both panels show the same face, hairstyle, hair colour and eyes.', own]);
  return {parts, body: {
    positive: (typeof c.override === 'string' ? c.override : c.override?.positive)?.trim() || positive,
    negative: c.override?.negative != null ? withSoft(c.override.negative) : negative, overridden: !!c.override,
    model_file: md.file, steps: +c.steps || md.steps || 30, cfg: +c.cfg || md.cfg || 5,
    sampler: c.sampler || md.sampler || 'euler_ancestral', scheduler: c.scheduler || md.scheduler || 'normal',
    w: +c.width || fr.w || 1152, h: +c.height || fr.h || 896, count: Math.min(8, Math.max(1, +c.count || 1)),
    seed_mode: c.seedMode, seed: +c.seed || 0, rating, characters: chars.map(p => p.id), scene_text: direction,
    compose: {...structuredClone({...c, original: undefined}), chars: c.characters, cams: c.cameras, subplotId},
    start: c.start?.image ? {image: c.start.image, denoise: +c.start.denoise || 0.35, ...(c.start.mask ? {mask: c.start.mask} : {})} : null,
    loras: (c.loras || []).map(l => ({file: l.file, weight: +l.weight})), control: c.control?.file && c.control.image ? {...c.control} : null,
    huefix: (c.huefix || []).map(h => ({...h})),
    presets: {characters: c.characters.map(id => ref('character', id)).filter(Boolean), man: generic ? ref('character', generic.id) : null,
      model: ref('model', c.model), style: ref('style', c.style), framing: ref('framing', c.framing),
      cameras: c.cameras.map(id => ref('camera', id)).filter(Boolean), scenes: c.sceneRefs.map(id => ref('scene', id)).filter(Boolean), negatives: negatives.map(id => ref('negative', id)).filter(Boolean),
      pose: ref('pose', blockId(presets, 'pose', c.pose)), location: ref('location', blockId(presets, 'location', c.environment)), light: ref('light', blockId(presets, 'light', c.light)),
      outfits: Object.values(c.outfit).filter(v => typeof v === 'string').map(id => ref('outfit', id)).filter(Boolean)},
    ipa: canReference && c.referenceOn ? {ref: portrait, strength: +c.referenceStrength, cutout: !!c.referenceCutout} : null,
    repaint: canReference && c.faceFix ? {ref: portrait, denoise: +c.faceStrength, prompt: repaintPrompt} : null,
    autostart: true,
  }};
}
export const assembleComposition = (c, presets, subplotId) => build(c, presets, subplotId).body;
// The built prompt cut into the stretches each block wrote, for display only: [{kind, label, text}] with the plain
// separators between them as {text}. A prompt copied from history (override) is one plain stretch.
export function promptParts(c, presets, subplotId) {
  const {body, parts} = build(c, presets, subplotId);
  if (body.overridden) return [{text: body.positive}];
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
