import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeComposition, assembleComposition, portraitUrl, lockedExclusions, promptParts} from '../web/image-compose.js';
import ALWAYS_NEGATIVE from '../../imagegen/web/always-negative.json' with {type: 'json'};

const rec = (id, data) => ({id, v: 3, data});
// the soft negative preset's words (the store's "implied" preset, marked soft); the composer never types them itself
const SOFT = 'visible nipples, visible genitals, uncovered crotch, frontal explicit view, explicit sexual action, transparent unobstructed body';
// the always-on words every picture avoids (#667), read from web/always-negative.json; the first test pins that list
const ALWAYS = ALWAYS_NEGATIVE.join(', ');
test('the always-on words are the permanent list: child, loli and the shaved-side hair terms (#667)', () => {
  assert.deepEqual(ALWAYS_NEGATIVE, ['child', 'loli', 'undercut', 'shaved sides', 'side shave', 'buzzed sides', 'sidecut']);
});
const presets = {
  character: [rec('alice', {name: 'Alice', age: 'adult woman', look: 'black hair', outfit: 'blue coat', gender: 'female', portrait: 'art/approved/alice.webp', rating_cap: 'safe'}), rec('extra', {name: 'Extra', generic: true, gender: 'male', look: 'brown hair'})],
  style: [rec('soft', {name: 'Soft', quality: 'high quality', anchors: 'painted illustration', suffix: 'soft edges', negative: 'blur'})],
  model: [rec('model', {name: 'Model', file: 'fixture.safetensors', steps: 25, cfg: 4, sampler: 'euler', scheduler: 'normal'})],
  framing: [rec('wide', {prompt: 'wide shot', w: 1200, h: 800})],
  camera: [rec('near', {prompt: 'close camera'}), rec('left', {prompt: 'from the left'})],
  negative: [rec('clean', {name: 'Clean', default: true, text: 'blur, watermark'}), rec('soft', {name: 'Soft (nonadult rewards)', default: false, text: SOFT, soft: true})],
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
  assert.equal(body.negative, `blur, watermark, ${ALWAYS}`);
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
});

test('the soft-scene exclusion comes only from the soft preset: a marker in its place is the only soft text', () => {
  const marked = structuredClone(presets);
  marked.negative.find(p => p.id === 'soft').data.text = 'MARKER';
  const c = composition({characters: [], rating: 'sensitive', hard: false, reward: true, negatives: []});
  const body = assembleComposition(c, marked);
  assert.match(body.negative, /MARKER/);
  assert.doesNotMatch(body.negative, /visible nipples|visible genitals/);
  assert.equal(body.negative, `blur, ${ALWAYS}, watermark, MARKER`);
  assert.doesNotMatch(assembleComposition({...c, override: {negative: 'blur'}}, marked).negative, /visible nipples/);
});

test('a nonadult reward keeps the soft preset on at every content level, selected or not', () => {
  for (const rating of ['safe', 'sensitive', 'nsfw']) for (const negatives of [null, ['clean'], ['soft', 'clean']]) {
    const body = assembleComposition(composition({characters: [], rating, reward: true, negatives}), presets);
    assert.match(body.negative, new RegExp(SOFT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${rating} ${negatives}`);
    assert.equal(body.presets.negatives.filter(p => p.id === 'soft').length, 1, `${rating} ${negatives}`);
  }
  assert.deepEqual(lockedExclusions(composition({characters: [], reward: true}), presets), {soft: true, ids: ['clean', 'soft']});
});

test('Adult (hard) rewards get only their configured exclusions, and a safe picture that is not a reward gets none', () => {
  for (const rating of ['safe', 'sensitive', 'nsfw']) {
    const adult = assembleComposition(composition({characters: [], rating, reward: true, hard: true, negatives: ['clean']}), presets);
    assert.doesNotMatch(adult.negative, /visible/);
    assert.deepEqual(adult.presets.negatives, [{id: 'clean', v: 3}]);
    assert.deepEqual(lockedExclusions(composition({characters: [], rating, reward: true, hard: true}), presets), {soft: false, ids: ['clean']});
    // the configured default selection stays on for an Adult reward even when the shot leaves it out
    const bare = assembleComposition(composition({characters: [], rating, reward: true, hard: true, negatives: []}), presets);
    assert.deepEqual(bare.presets.negatives, [{id: 'clean', v: 3}]);
    assert.equal(bare.negative, `blur, ${ALWAYS}, watermark`);
  }
  assert.doesNotMatch(assembleComposition(composition({characters: [], rating: 'safe'}), presets).negative, /visible/);
  assert.deepEqual(lockedExclusions(composition({characters: [], rating: 'safe'}), presets), {soft: false, ids: []});
});

test('a Mature or Adult picture gets the soft preset after its other words, even when it is not selected', () => {
  const body = assembleComposition(composition({characters: [], rating: 'sensitive', negatives: ['clean'], negative: 'custom words'}), presets);
  assert.equal(body.negative, `blur, watermark, custom words, ${ALWAYS}, ${SOFT}`);
  assert.deepEqual(body.presets.negatives, [{id: 'clean', v: 3}, {id: 'soft', v: 3}]);
});

test('without a soft preset (or with it archived) no soft words are added; a copied prompt is not changed', () => {
  const none = {...presets, negative: presets.negative.filter(p => p.id !== 'soft')};
  assert.doesNotMatch(assembleComposition(composition({characters: [], rating: 'nsfw', reward: true}), none).negative, /visible/);
  const archived = {...presets, negative: presets.negative.map(p => p.id === 'soft' ? {...p, archived: true} : p)};
  assert.doesNotMatch(assembleComposition(composition({characters: [], rating: 'nsfw'}), archived).negative, /visible/);
  const copied = assembleComposition(composition({characters: [], rating: 'nsfw', reward: true, override: {positive: 'x', negative: 'original'}}), presets);
  assert.equal(copied.negative, `original, blur, watermark, ${SOFT}`);
});

test('reusing a recorded zero CFG does not replace it with model defaults', () => {
  const c = composition({cfg: 0, sampler: 'dpmpp_2m', scheduler: 'karras'});
  const body = assembleComposition(c, presets, 'fixture');
  assert.equal(body.cfg, 0);
  assert.equal(body.sampler, 'dpmpp_2m');
  assert.equal(body.scheduler, 'karras');
});

test('section exclusions join the negative in section order, after the people and before the older free words (#616)', () => {
  const ps = structuredClone(presets);
  ps.outfit = [rec('coat', {text: 'blue coat', negative: 'red coat'})];
  const c = composition({characters: ['alice'], outfit: {alice: 'coat'}, negatives: ['clean'], negative: 'older words',
    sectionNegatives: {details: 'details words', camera: 'dutch angle', light: 'harsh shadows', setting: 'crowd, signs', pose: 'crossed arms', scene: 'running'}});
  assert.equal(assembleComposition(c, ps).negative,
    `blur, watermark, red coat, running, crossed arms, crowd, signs, harsh shadows, dutch angle, details words, older words, ${ALWAYS}`);
  assert.equal(assembleComposition(composition({negative: 'older words'}), ps).negative, `blur, watermark, older words, ${ALWAYS}`);
});

test('nothing typed in a section removes the rating exclusions of a reward', () => {
  const c = composition({characters: [], rating: 'nsfw', reward: true, negatives: [], sectionNegatives: {setting: SOFT}, negative: 'blur'});
  const body = assembleComposition(c, presets);
  assert.equal(body.negative, `blur, ${SOFT}, ${ALWAYS}, watermark`);
  assert.deepEqual(body.presets.negatives, [{id: 'clean', v: 3}, {id: 'soft', v: 3}]);
});
