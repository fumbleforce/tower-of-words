// Uses the existing image dashboard's preset records and request format.
const {structuredClone} = globalThis;
export const DIRECTIONS = {
  pose: ['Standing naturally', 'Seated', 'Walking', 'Leaning against a wall', 'Reaching for an object', 'Turning toward someone', 'Looking over a shoulder', 'Crouching', 'Lying down'],
  angle: ['Eye level', 'Low angle', 'High angle', 'Overhead', 'Side profile', 'Over the shoulder'],
  environment: ['Office reception', 'Office interior', 'Station platform', 'Street', 'Café', 'Apartment', 'Garden', 'Swimming pool', 'Gym', 'Bathhouse'],
  light: ['Soft daylight', 'Morning light', 'Overcast daylight', 'Warm indoor light', 'Evening light', 'Night lighting'],
};
export const DEFAULT_COMPOSITION = {
  characters: [], outfit: {}, useShort: true, cameras: [], sceneRefs: [], negatives: null,
  rating: 'safe', count: 1, seedMode: 'random', seed: '', scene: '', pose: '', angle: '', environment: '', light: '',
  extra: '', details: '', hard: false,
  reference: '', referenceOn: false, referenceStrength: 0.6, referenceCutout: false, faceFix: false, faceStrength: 0.65,
};
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
export function assembleComposition(c, presets, subplotId) {
  const byId = (type, id) => (presets[type] || []).find(p => p.id === id);
  const selected = c.characters.map(id => byId('character', id)).filter(Boolean);
  const generic = c.man && (presets.character || []).find(p => p.data.generic && !p.archived);
  const chars = generic && !selected.includes(generic) ? [...selected, generic] : selected;
  const style = byId('style', c.style)?.data || {};
  const ratings = ['safe', 'sensitive', 'nsfw'];
  let ratingIndex = Math.max(0, ratings.indexOf(c.rating));
  chars.forEach(p => { const cap = ratings.indexOf(p.data.rating_cap); if (cap >= 0) ratingIndex = Math.min(ratingIndex, cap); });
  const rating = ratings[ratingIndex];
  const countGender = gender => chars.filter(p => (p.data.gender || 'female') === gender).length;
  const countTag = (n, single) => n ? n + single + (n > 1 ? 's' : '') : '';
  const cast = [countTag(countGender('female'), 'girl'), countTag(countGender('male'), 'boy')].filter(Boolean).join(', ');
  const blocks = chars.map(p => {
    const d = p.data;
    const outfit = c.outfit[p.id] && d.outfit ? 'wearing ' + d.outfit : '';
    if (chars.length > 1 && c.useShort && d.short) return [d.short, outfit].filter(Boolean).join(', ');
    return [d.generic ? '' : d.name, d.age, d.look, d.signature, d.build, outfit].filter(Boolean).join(', ');
  });
  const direction = [c.scene, c.pose, c.angle, c.environment, c.light].filter(Boolean).join('. ');
  const head = [style.quality, rating, cast, style.anchors].filter(Boolean).join(', ');
  const positive = smartJoin([head, blocks.join('; '), direction, c.cameras.map(id => byId('camera', id)?.data.prompt).filter(Boolean).join(', '), byId('framing', c.framing)?.data.prompt, c.extra, style.suffix]);
  const negatives = c.negatives || (presets.negative || []).filter(p => !p.archived && p.data.default).map(p => p.id);
  const soft = rating !== 'safe' && !c.hard;
  const withSoft = text => soft ? dedupe([text, SOFT_NEGATIVE]) : text;
  const negative = withSoft(dedupe([...negatives.map(id => byId('negative', id)?.data.text), c.styleNegOff ? '' : style.negative, ...chars.filter(p => !c.charNegOff?.[p.id]).map(p => p.data.negative), c.negative, 'child, loli']));
  const md = byId('model', c.model)?.data || {};
  const fr = byId('framing', c.framing)?.data || {};
  const ref = (type, id) => { const p = byId(type, id); return p ? {id: p.id, v: p.v} : null; };
  const portrait = c.reference || (chars.length === 1 ? chars[0].data.portrait : '');
  const canReference = chars.length === 1 && portrait;
  const own = chars[0]?.data || {};
  const repaintPrompt = smartJoin([style.quality, rating, 'Two panels side by side showing the same person, a close-up of their head.', 'Both panels show the same face, hairstyle, hair colour and eyes.', [own.name, own.age, own.look, own.signature].filter(Boolean).join(', ')]);
  return {
    positive: (typeof c.override === 'string' ? c.override : c.override?.positive)?.trim() || positive,
    negative: c.override?.negative != null ? withSoft(c.override.negative) : negative, overridden: !!c.override,
    model_file: md.file, steps: +c.steps || md.steps || 30, cfg: +c.cfg || md.cfg || 5,
    sampler: c.sampler || md.sampler || 'euler_ancestral', scheduler: c.scheduler || md.scheduler || 'normal',
    w: +c.width || fr.w || 1152, h: +c.height || fr.h || 896, count: Math.min(8, Math.max(1, +c.count || 1)),
    seed_mode: c.seedMode, seed: +c.seed || 0, rating, characters: chars.map(p => p.id), scene_text: direction,
    compose: {...structuredClone(c), chars: c.characters, cams: c.cameras, subplotId},
    presets: {characters: c.characters.map(id => ref('character', id)).filter(Boolean), man: generic ? ref('character', generic.id) : null,
      model: ref('model', c.model), style: ref('style', c.style), framing: ref('framing', c.framing),
      cameras: c.cameras.map(id => ref('camera', id)).filter(Boolean), scenes: c.sceneRefs.map(id => ref('scene', id)).filter(Boolean), negatives: negatives.map(id => ref('negative', id)).filter(Boolean)},
    ipa: canReference && c.referenceOn ? {ref: portrait, strength: +c.referenceStrength, cutout: !!c.referenceCutout} : null,
    repaint: canReference && c.faceFix ? {ref: portrait, denoise: +c.faceStrength, prompt: repaintPrompt} : null,
    autostart: true,
  };
}
