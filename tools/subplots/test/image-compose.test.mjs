import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeComposition, assembleComposition, portraitUrl, SOFT_NEGATIVE, promptParts} from '../web/image-compose.js';

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

test('shot appearance replaces every template constituent and short form without changing presets', () => {
  const ps = structuredClone(presets);
  Object.assign(ps.character[0].data, {signature: 'messy bun', build: 'tall', short: 'Alice with messy bun', negative: 'loose hair'});
  ps.outfit = [rec('coat', {text: 'blue coat', negative: 'red coat'})];
  const before = JSON.stringify(ps);
  const c = composition({characters: ['alice', 'extra'], outfit: {alice: 'coat'}, people: {alice: {
    appearance: 'Alice, adult woman, black hair, tidy bun, tall', clothing: 'blue sweater halfway on, one arm through its sleeve',
    appearanceNegative: 'messy bun', clothingNegative: 'coat',
  }}});
  const b = assembleComposition(c, ps);
  assert.match(b.positive, /tidy bun, tall, blue sweater halfway on/);
  assert.doesNotMatch(b.positive, /messy bun|blue coat/);
  assert.match(b.negative, /messy bun, coat/);
  assert.doesNotMatch(b.negative, /loose hair|red coat/);
  assert.equal(JSON.stringify(ps), before);
  assert.deepEqual(assembleComposition(normalizeComposition(JSON.parse(JSON.stringify(b.compose))), ps).positive, b.positive);
  const single = assembleComposition({...c, characters: ['alice'], faceFix: true}, ps);
  assert.match(single.repaint.prompt, /tidy bun/);
  assert.doesNotMatch(single.repaint.prompt, /messy bun/);
});

test('explicit blank shot words suppress template words while legacy short and full words stay intact', () => {
  const ps = structuredClone(presets);
  Object.assign(ps.character[0].data, {signature: 'messy bun', build: 'tall', short: 'short Alice', negative: 'loose hair'});
  ps.outfit = [rec('coat', {text: 'blue coat', negative: 'red coat'})];
  const c = composition({characters: ['alice', 'extra'], outfit: {alice: 'coat'}});
  assert.match(assembleComposition(c, ps).positive, /short Alice, wearing blue coat/);
  c.useShort = false;
  assert.match(assembleComposition(c, ps).positive, /black hair, messy bun, tall/);
  c.people = {alice: {appearance: '', clothing: '', appearanceNegative: '', clothingNegative: ''}};
  const b = assembleComposition(c, ps);
  assert.doesNotMatch(b.positive, /Alice|blue coat|messy bun/);
  assert.doesNotMatch(b.negative, /loose hair|red coat/);
});

test('local exclusions work even when a legacy composition disabled template exclusions', () => {
  const c = composition({charNegOff: {alice: true}, people: {alice: {appearanceNegative: 'messy bun'}}});
  assert.match(assembleComposition(c, presets).negative, /messy bun/);
});

test('all template text blocks support shot-local words, blanks, and generation metadata round trips', () => {
  const ps = structuredClone(presets);
  ps.pose = [rec('sit', {text: 'template pose'})];
  ps.location = [rec('room', {text: 'template room'})];
  ps.light = [rec('day', {text: 'template light'})];
  const before = JSON.stringify(ps);
  const c = composition({pose: 'sit', environment: 'room', light: 'day', cameras: ['near'], negatives: ['clean'], blockOverrides: {
    pose: {sit: {text: 'leaning forward'}}, location: {room: {text: 'beside an open window'}}, light: {day: {text: 'sunlight through clouds'}},
    style: {soft: {quality: 'ink drawing', anchors: '', suffix: 'fine lines', negative: 'rough lines'}}, camera: {near: {prompt: 'over the shoulder'}},
    framing: {wide: {prompt: ''}}, negative: {clean: {text: 'crooked window'}},
  }});
  const b = assembleComposition(c, ps);
  assert.match(b.positive, /ink drawing.*leaning forward.*beside an open window.*sunlight through clouds.*over the shoulder.*fine lines/);
  assert.doesNotMatch(b.positive, /painted illustration|wide shot|template/);
  assert.match(b.negative, /crooked window, rough lines/);
  assert.doesNotMatch(b.negative, /blur|watermark/);
  assert.equal(promptParts(c, ps).map(p => p.text).join(''), b.positive);
  assert.equal(assembleComposition(normalizeComposition(JSON.parse(JSON.stringify(b.compose))), ps).positive, b.positive);
  assert.equal(JSON.stringify(ps), before);
  c.blockOverrides.negative.clean.text = '';
  assert.doesNotMatch(assembleComposition(c, ps).negative, /crooked window|watermark/);
});

test('shot mode only changes standing exclusions and preserves copied prompts and explicit exclusions', () => {
  const c = composition({characters: [], rating: 'nsfw', negative: 'visible nipples, custom words'});
  const soft = assembleComposition(c, presets);
  assert.match(soft.negative, /visible genitals/);
  c.hard = true;
  const adult = assembleComposition(c, presets);
  assert.equal(adult.positive, soft.positive);
  assert.doesNotMatch(adult.negative, /visible genitals/);
  assert.match(adult.negative, /visible nipples, custom words/);
  c.override = {positive: 'Exact original words', negative: 'visible nipples, original exclusions'};
  c.hard = false;
  assert.match(assembleComposition(c, presets).negative, /visible genitals/);
  c.hard = true;
  const copy = assembleComposition(c, presets);
  assert.equal(copy.positive, c.override.positive);
  assert.equal(copy.negative, c.override.negative);
  assert.deepEqual(normalizeComposition(copy.compose).override, c.override);
  assert.ok(SOFT_NEGATIVE.includes('visible genitals'));
});

test('reusing a recorded zero CFG does not replace it with model defaults', () => {
  const c = composition({cfg: 0, sampler: 'dpmpp_2m', scheduler: 'karras'});
  const body = assembleComposition(c, presets, 'fixture');
  assert.equal(body.cfg, 0);
  assert.equal(body.sampler, 'dpmpp_2m');
  assert.equal(body.scheduler, 'karras');
});
