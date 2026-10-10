import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeComposition, assembleComposition, portraitUrl} from '../web/image-compose.js';

const rec = (id, data) => ({id, v: 3, data});
const presets = {
  character: [rec('alice', {name: 'Alice', age: 'adult woman', look: 'black hair', outfit: 'blue coat', gender: 'female', portrait: 'art/approved/alice.webp', rating_cap: 'safe'}), rec('extra', {name: 'Extra', generic: true, gender: 'male', look: 'brown hair'})],
  style: [rec('soft', {name: 'Soft', quality: 'high quality', anchors: 'painted illustration', suffix: 'soft edges', negative: 'blur'})],
  model: [rec('model', {name: 'Model', file: 'fixture.safetensors', steps: 25, cfg: 4, sampler: 'euler', scheduler: 'normal'})],
  framing: [rec('wide', {prompt: 'wide shot', w: 1200, h: 800})],
  camera: [rec('near', {prompt: 'close camera'}), rec('left', {prompt: 'from the left'})],
  negative: [rec('clean', {name: 'Clean', default: true, text: 'blur, watermark'})],
  scene: [rec('office', {text: 'Reading a letter'})],
};
function composition(extra = {}) {
  return normalizeComposition({characters: ['alice'], model: 'model', style: 'soft', framing: 'wide', ...extra});
}
test('combines dashboard presets in prompt order and preserves version references', () => {
  const body = assembleComposition(composition({outfit: {alice: true}, cameras: ['near', 'left'], scene: 'Reading a letter', sceneRefs: ['office'], pose: 'Seated', environment: 'Office interior'}), presets, 'fixture:scene');
  assert.match(body.positive, /^high quality, safe, 1girl, painted illustration, Alice/);
  assert.ok(body.positive.indexOf('Reading a letter') < body.positive.indexOf('close camera'));
  assert.ok(body.positive.indexOf('close camera') < body.positive.indexOf('wide shot'));
  assert.match(body.positive, /wearing blue coat/);
  assert.equal(body.negative, 'blur, watermark, child, loli');
  assert.deepEqual(body.presets.cameras, [{id: 'near', v: 3}, {id: 'left', v: 3}]);
  assert.deepEqual(body.presets.scenes, [{id: 'office', v: 3}]);
  assert.equal(body.compose.subplotId, 'fixture:scene');
  assert.equal(body.w, 1200);
  assert.equal(body.seed_mode, 'random');
});
test('respects character rating cap and accounts for generic cast', () => {
  const body = assembleComposition(composition({rating: 'nsfw', man: true}), presets, 'fixture');
  assert.equal(body.rating, 'safe');
  assert.match(body.positive, /1girl, 1boy/);
  assert.deepEqual(body.characters, ['alice', 'extra']);
  assert.doesNotMatch(body.positive, /Extra/);
});
test('portrait reference and face correction use one selected character only', () => {
  const c = composition({referenceOn: true, faceFix: true});
  const body = assembleComposition(c, presets, 'fixture');
  assert.equal(body.ipa.ref, 'art/approved/alice.webp');
  assert.equal(body.repaint.ref, body.ipa.ref);
  assert.match(body.repaint.prompt, /Alice/);
  c.man = true;
  assert.equal(assembleComposition(c, presets, 'fixture').ipa, null);
});
test('dashboard history settings migrate without losing cast, camera, seed or negatives', () => {
  const c = normalizeComposition({chars: ['alice'], cams: ['near'], negs: ['clean'], seedMode: 'fixed', seed: 12, ipa: {on: true, strength: 0.5, cutout: true}, omRef: 'art/approved/reference.webp'});
  assert.deepEqual(c.characters, ['alice']);
  assert.deepEqual(c.cameras, ['near']);
  assert.deepEqual(c.negatives, ['clean']);
  assert.equal(c.reference, 'art/approved/reference.webp');
  assert.equal(c.referenceOn, true);
  assert.equal(c.seedMode, 'fixed');
});
test('reused prompts remain exact until the user changes a control', () => {
  const c = composition({override: {positive: 'An existing composition.', negative: 'watermark'}, seed: 9, seedMode: 'fixed', width: 768, height: 1024});
  const body = assembleComposition(c, presets, 'fixture');
  assert.equal(body.positive, 'An existing composition.');
  assert.equal(body.negative, 'watermark');
  assert.equal(body.seed, 9);
  assert.equal(body.w, 768);
  assert.equal(body.h, 1024);
  c.override = null;
  assert.match(assembleComposition(c, presets, 'fixture').positive, /Alice/);
});
test('portrait paths are limited to image service assets and public repository images', () => {
  assert.equal(portraitUrl('art/approved/alice.webp'), '/api/subplots/image/repo/art/approved/alice.webp');
  assert.equal(portraitUrl('../secret.png'), '');
  assert.equal(portraitUrl(''), '');
});
