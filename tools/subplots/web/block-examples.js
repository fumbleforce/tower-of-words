// Example pictures for blocks, shown on the composer's tiles (Jørgen, 2026-10-11: "I want previews for positioning").
// A block's example is a render that used it, from the image gen history's own `preset` filter: its example render
// first (made by "Make examples": a small render of a plain stand-in figure with the block), then a starred one, then
// the newest. Nothing is fetched for a block twice in a session.
const {URLSearchParams} = globalThis;
import {applyDefaults, normalizeComposition, assembleComposition} from './image-compose.js';

const found = new Map();    // 'kind:id' -> thumbnail url, or '' when there is none
const asking = new Map();   // 'kind:id' -> promise
const thumb = r => r.thumb ? '/api/subplots/image/thumb/' + r.thumb.split('/').map(encodeURIComponent).join('/') : '';

export const exampleOf = (kind, id) => found.get(kind + ':' + id) || '';
export const exampleKnown = (kind, id) => found.has(kind + ':' + id);

// Look up the examples for these blocks; done() runs once when any new one has arrived.
export function loadExamples(api, blocks, done) {
  const want = blocks.filter(([kind, id]) => id && !found.has(kind + ':' + id) && !asking.has(kind + ':' + id));
  if (!want.length) return Promise.resolve();
  return Promise.all(want.map(([kind, id]) => {
    const key = kind + ':' + id;
    const p = api('image/api/history?' + new URLSearchParams({preset: key, limit: '30'}))
      .then(runs => {
        const renders = runs.flatMap(run => (run.renders || []).filter(r => !r.reject).map(r => ({...r, example: run.compose?.example || r.compose?.example})));
        const pick = renders.find(r => r.example === key) || renders.find(r => r.star || r.fav) || renders[0];
        found.set(key, pick ? thumb(pick) : '');
      })
      .catch(() => found.set(key, ''))
      .finally(() => asking.delete(key));
    asking.set(key, p);
    return p;
  })).then(() => done?.());
}

// A small render of a plain stand-in figure with one block, through the image gen queue: the setting on its own, a
// pose or a camera on a mannequin against a plain wall, a light on a mannequin in a plain room.
const SUBJECT = {
  location: 'an empty place, no people',
  pose: 'a plain grey wooden artist mannequin, faceless, against a plain light wall',
  camera: 'a plain grey wooden artist mannequin standing, faceless, in a plain room',
  light: 'a plain grey wooden artist mannequin standing in a plain room with a window',
};
export function exampleJob(kind, id, presets) {
  const c = applyDefaults(normalizeComposition({scene: SUBJECT[kind], count: 1, rating: 'safe', negatives: null, castInitialized: true}), presets);
  if (kind === 'location') c.environment = id;
  if (kind === 'pose') c.pose = id;
  if (kind === 'light') c.light = id;
  if (kind === 'camera') c.cameras = [id];
  const body = assembleComposition(c, presets, '');
  const [w, h] = kind === 'pose' || kind === 'camera' ? [512, 640] : [640, 512];
  Object.assign(body, {w, h, steps: 20, count: 1, seed_mode: 'random', ipa: null, repaint: null, start: null, control: null, loras: [], huefix: []});
  body.compose = {...body.compose, example: kind + ':' + id, subplotId: ''};
  return body;
}
// After Make examples: forget what was missing so the new pictures are fetched when they are done.
export function forgetMissing(blocks) { for (const [kind, id] of blocks) if (found.get(kind + ':' + id) === '') found.delete(kind + ':' + id); }

// A place preview (Jørgen, 2026-10-11: "it would be nice to be able to gen that background scene as a preview ther and
// then to see if it matches expectations, and not get a blank preview as now"): the shot's setting in its light, with
// no people, small and quick, in the shot's style and shape. Kept by its setting and light, so the tile and the empty
// picture slot can show it until the shot itself is made.
export const placeKey = (setting, light) => 'place:' + setting + '|' + (light || '');
export const placeOf = (setting, light) => found.get(placeKey(setting, light)) || '';
export function placeJob(c, presets) {
  const fr = (presets.framing || []).find(p => p.id === c.framing)?.data || {};
  const w0 = +c.width || fr.w || 1216, h0 = +c.height || fr.h || 832, k = 640 / Math.max(w0, h0);
  const p = applyDefaults(normalizeComposition({scene: SUBJECT.location, environment: c.environment, light: c.light, style: c.style, model: c.model,
    framing: c.framing, count: 1, rating: 'safe', negatives: null, castInitialized: true}), presets);
  const body = assembleComposition(p, presets, '');
  const snap = n => Math.max(320, Math.round(n * k / 64) * 64);
  Object.assign(body, {w: snap(w0), h: snap(h0), steps: 20, count: 1, seed_mode: 'random', ipa: null, repaint: null, start: null, control: null, loras: [], huefix: []});
  body.compose = {...body.compose, placePreview: placeKey(c.environment, c.light), subplotId: '', ...(c.light ? {} : {example: 'location:' + c.environment})};
  return body;
}
// A finished example or place preview from the queue becomes the newest picture for its block or place at once.
export function noteDone(job) {
  const url = thumb(job); if (!url) return false;
  let changed = false;
  for (const key of [job.compose?.example, job.compose?.placePreview].filter(Boolean)) if (found.get(key) !== url) { found.set(key, url); changed = true; }
  return changed;
}
// The newest place preview for this setting and light in the history (once a session).
export function loadPlace(api, setting, light, done) {
  const key = placeKey(setting, light);
  if (!setting || found.has(key) || asking.has(key)) return;
  const p = api('image/api/history?' + new URLSearchParams({preset: 'location:' + setting, limit: '60'}))
    .then(runs => {
      const r = runs.flatMap(run => (run.renders || []).filter(x => !x.reject && (x.compose?.placePreview || run.compose?.placePreview) === key))[0];
      found.set(key, r ? thumb(r) : '');
    })
    .catch(() => found.set(key, ''))
    .finally(() => { asking.delete(key); done?.(); });
  asking.set(key, p);
}
