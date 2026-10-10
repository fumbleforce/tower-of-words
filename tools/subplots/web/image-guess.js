// "Fill from prompt": a best-effort guess at the blocks behind a picture made before the composer existed.
// Pure and read-only. It returns a composition and never touches the old record; nothing is saved unless the
// user generates from it. Whatever no block explains goes into the free text (scene) and the extra negative.
import {normalizeComposition, SOFT_NEGATIVE} from './image-compose.js';

const tokens = text => String(text || '').split(',').map(s => s.trim()).filter(Boolean);
const key = s => s.toLowerCase().replace(/\.$/, '');

export function guessComposition(job, presets) {
  const list = type => (presets?.[type] || []).filter(p => !p.archived);
  const c = normalizeComposition({});
  const found = [];
  const positive = tokens(job.positive);
  const used = new Set();
  const take = ts => ts.forEach(t => used.add(key(t)));
  const has = text => text && tokens(text).length && tokens(text).every(t => positive.some(x => key(x) === key(t)));
  const contains = text => text && String(job.positive || '').toLowerCase().includes(String(text).toLowerCase());

  const model = list('model').find(p => p.data.file === job.model_file);
  if (model) { c.model = model.id; found.push('model'); }

  // style: the quality line and suffix that the style preset puts in
  const style = list('style').find(p => p.data.quality && contains(p.data.quality));
  if (style) { c.style = style.id; take(tokens(style.data.quality)); take(tokens(style.data.anchors)); take(tokens(style.data.suffix)); found.push('style'); }

  const rating = ['nsfw', 'sensitive', 'safe'].find(r => positive.some(t => key(t) === r));
  if (rating) { c.rating = rating; take([rating]); found.push('rating'); }
  take(positive.filter(t => /^\d+(girl|boy)s?$/i.test(t)));

  // characters: the ones the job recorded, plus any preset whose name is a word of the prompt
  const pool = (job.characters || []).map(id => list('character').find(p => p.id === id)).filter(Boolean);
  const named = list('character').filter(p => !p.data.generic && p.data.name && new RegExp('(^|[^a-z])' + p.data.name.toLowerCase() + '([^a-z]|$)').test(String(job.positive || '').toLowerCase()));
  const chars = [...new Map([...pool, ...named].map(p => [p.id, p])).values()];
  if (chars.length) {
    c.characters = chars.map(p => p.id); found.push('characters');
    for (const p of chars) {
      const d = p.data;
      const wearing = d.outfit && contains('wearing ' + d.outfit);
      if (wearing) c.outfit[p.id] = true;
      [d.name, d.age, d.look, d.signature, d.build, d.short, wearing ? 'wearing ' + d.outfit : ''].forEach(t => take(tokens(t)));
    }
    c.useShort = chars.length > 1 && chars.every(p => p.data.short && contains(p.data.short));
  }

  // camera and framing tags
  const cameras = list('camera').filter(p => p.data.prompt && has(p.data.prompt));
  if (cameras.length) { c.cameras = cameras.map(p => p.id); cameras.forEach(p => take(tokens(p.data.prompt))); found.push('camera'); }
  const framing = list('framing').find(p => p.data.w === job.w && p.data.h === job.h) || list('framing').find(p => p.data.prompt && has(p.data.prompt));
  if (framing) { c.framing = framing.id; take(tokens(framing.data.prompt)); found.push('picture shape'); }
  if (job.w && job.h && !(framing && framing.data.w === job.w && framing.data.h === job.h)) Object.assign(c, {width: job.w, height: job.h});

  // the rest of the positive prompt is the scene's free text
  c.scene = positive.filter(t => !used.has(key(t))).join(', ');

  // negatives: whole presets that are contained, then the leftover as the extra negative
  const negTokens = tokens(job.negative);
  const negSet = new Set(negTokens.map(key));
  const negPresets = list('negative').filter(p => p.data.text && tokens(p.data.text).every(t => negSet.has(key(t))));
  const covered = new Set(negPresets.flatMap(p => tokens(p.data.text).map(key)));
  c.negatives = negPresets.filter(p => p.id !== 'implied').map(p => p.id);
  tokens(SOFT_NEGATIVE).forEach(t => covered.add(key(t)));
  tokens('child, loli').forEach(t => covered.add(key(t)));
  const own = new Set(chars.flatMap(p => tokens(p.data.negative).map(key)).concat(tokens(style?.data.negative).map(key)));
  c.negative = negTokens.filter(t => !covered.has(key(t)) && !own.has(key(t))).join(', ');
  if (negPresets.length) found.push('negatives');

  // the original settings stay what they were
  Object.assign(c, {seedMode: 'fixed', seed: job.seed ?? '', count: 1});
  if (job.steps) c.steps = job.steps;
  if (job.cfg) c.cfg = job.cfg;
  c.details = 'Filled from an older prompt by guesswork. Check the blocks before generating.';
  return {composition: c, found};
}
