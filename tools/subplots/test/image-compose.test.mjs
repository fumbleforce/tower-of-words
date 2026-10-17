import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeComposition, assembleComposition, applyDefaults, portraitUrl, lockedExclusions, followTier, ratingTier, promptParts, withStyleLoras, promptBoxes, setFreeText, resetPromptBox} from '../web/image-compose.js';
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
  assert.equal(body.negative, `blur, ${ALWAYS}, MARKER`);
  assert.doesNotMatch(assembleComposition({...c, override: {negative: 'blur'}}, marked).negative, /visible nipples/);
});

test('a nonadult reward keeps the soft preset on at every content level, selected or not', () => {
  for (const rating of ['safe', 'sensitive', 'nsfw']) for (const negatives of [null, ['clean'], ['soft', 'clean']]) {
    const body = assembleComposition(composition({characters: [], rating, reward: true, negatives}), presets);
    assert.match(body.negative, new RegExp(SOFT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${rating} ${negatives}`);
    assert.equal(body.presets.negatives.filter(p => p.id === 'soft').length, 1, `${rating} ${negatives}`);
  }
  assert.deepEqual(lockedExclusions(composition({characters: [], reward: true}), presets), {tier: 'nonadult', soft: true, defaults: ['clean'], ids: ['soft']});
});

test('Adult (hard) rewards lock no plain default, and a safe picture that is not a reward gets none', () => {
  for (const rating of ['safe', 'sensitive', 'nsfw']) {
    const adult = assembleComposition(composition({characters: [], rating, reward: true, hard: true, negatives: ['clean']}), presets);
    assert.doesNotMatch(adult.negative, /visible/);
    assert.deepEqual(adult.presets.negatives, [{id: 'clean', v: 3}]);
    assert.deepEqual(lockedExclusions(composition({characters: [], rating, reward: true, hard: true}), presets), {tier: ratingTier({hard: true}, rating), soft: false, defaults: ['clean'], ids: []});
    // a plain default (body heavy, low quality) is only a default: a shot that switches it off goes without (#704);
    // an agent's reward recipe still can't (agent-recipe.mjs)
    const bare = assembleComposition(composition({characters: [], rating, reward: true, hard: true, negatives: []}), presets);
    assert.deepEqual(bare.presets.negatives, []);
    assert.equal(bare.negative, `blur, ${ALWAYS}`);
  }
  assert.doesNotMatch(assembleComposition(composition({characters: [], rating: 'safe'}), presets).negative, /visible/);
  assert.deepEqual(lockedExclusions(composition({characters: [], rating: 'safe'}), presets), {tier: 'nonadult', soft: false, defaults: [], ids: []});
});

// #700: the limit presets follow the tier. The store's `limits` (full) and a skimpy one without the nipple words.
const LIMITS = 'nipples, areolae, genitals, pussy, penis, sex, explicit';
const SKIMPY = 'genitals, pussy, penis, sex, explicit';
const limited = structuredClone(presets);
limited.negative.push(rec('limits', {name: 'Limits', default: true, limit: 'full', text: LIMITS}), rec('limits-skimpy', {name: 'Limits, skimpy', default: false, limit: 'skimpy', text: SKIMPY}));
const words = negative => negative.split(', ');
test('the fixed rating exclusions of a reward follow its tier: limits for nonadult and Adult General, the skimpy limits for Adult Mature, none for Adult hard (#700)', () => {
  const fixed = (rating, hard) => lockedExclusions(composition({characters: [], rating, hard, reward: true}), limited);
  for (const rating of ['safe', 'sensitive', 'nsfw']) assert.deepEqual(fixed(rating, false), {tier: 'nonadult', soft: true, defaults: ['clean', 'limits'], ids: ['limits', 'soft']});
  assert.deepEqual(fixed('safe', true), {tier: 'safe', soft: false, defaults: ['clean', 'limits'], ids: ['limits']});
  assert.deepEqual(fixed('sensitive', true), {tier: 'skimpy', soft: false, defaults: ['clean', 'limits-skimpy'], ids: ['limits-skimpy']});
  assert.deepEqual(fixed('nsfw', true), {tier: 'hard', soft: false, defaults: ['clean'], ids: []});
});
test('the composed negative per rating and mode: nipples only leave in Adult Mature, genitals and sex only in Adult hard; child and loli never (#700)', () => {
  const negative = (rating, hard, negatives = null) => assembleComposition(composition({characters: [], rating, hard, reward: true, negatives}), limited).negative;
  for (const rating of ['safe', 'sensitive', 'nsfw']) assert.equal(negative(rating, false), `blur, watermark, ${LIMITS}, ${ALWAYS}, ${SOFT}`);
  assert.equal(negative('safe', true), `blur, watermark, ${LIMITS}, ${ALWAYS}`);
  assert.equal(negative('sensitive', true), `blur, watermark, ${SKIMPY}, ${ALWAYS}`);
  assert.equal(negative('nsfw', true), `blur, watermark, ${ALWAYS}`);
  // a shot that leaves the limits out gets them back where its tier keeps them, and an Adult hard one may still add them by hand
  assert.equal(negative('safe', true, ['clean']), `blur, watermark, ${ALWAYS}, ${LIMITS}`);
  assert.equal(negative('nsfw', true, ['clean', 'limits']), `blur, watermark, ${LIMITS}, ${ALWAYS}`);
  for (const rating of ['safe', 'sensitive', 'nsfw']) for (const hard of [false, true])
    for (const word of ['child', 'loli', 'blur']) assert.ok(words(negative(rating, hard)).includes(word), `${rating} ${hard} ${word}`);
  assert.ok(!words(negative('sensitive', true)).includes('nipples'));
  assert.ok(!['nipples', 'genitals', 'sex', 'explicit'].some(w => words(negative('nsfw', true)).includes(w)));
  // a picture that is not a reward starts from the same tier's default selection, and a nonadult safe one still gets limits
  assert.deepEqual(applyDefaults(composition({characters: [], rating: 'safe'}), limited).negatives, ['clean', 'limits']);
  assert.deepEqual(applyDefaults(composition({characters: [], rating: 'nsfw', hard: true}), limited).negatives, ['clean']);
  assert.deepEqual(applyDefaults(composition({characters: [], rating: 'sensitive', hard: true}), limited).negatives, ['clean', 'limits-skimpy']);
  // a character's rating cap holds for a nonadult shot and never lowers an Adult-mode one
  assert.equal(lockedExclusions(composition({characters: ['alice'], rating: 'nsfw', hard: true, reward: true}), limited).tier, 'hard');
  const adult = assembleComposition(composition({characters: ['alice'], rating: 'nsfw', hard: true, reward: true}), limited);
  assert.equal(adult.rating, 'nsfw');
  assert.match(adult.positive, /^high quality, nsfw, 1girl/);
  assert.equal(assembleComposition(composition({characters: ['alice'], rating: 'nsfw', reward: true}), limited).rating, 'safe');
});
test('switching the tier in the composer moves the limit presets and leaves every other pick alone (#700)', () => {
  const c = composition({characters: [], rating: 'safe', negatives: ['clean', 'limits', 'soft']});
  const step = change => { const before = lockedExclusions(c, limited).tier; Object.assign(c, change); followTier(c, limited, before); return [...c.negatives]; };
  assert.deepEqual(step({hard: true, rating: 'nsfw'}), ['clean', 'soft']);
  assert.deepEqual(step({rating: 'sensitive'}), ['clean', 'soft', 'limits-skimpy']);
  assert.deepEqual(step({rating: 'safe'}), ['clean', 'soft', 'limits']);
  assert.deepEqual(step({extra: 'no tier change'}), ['clean', 'soft', 'limits']);
  assert.deepEqual(step({hard: false, rating: 'nsfw'}), ['clean', 'soft', 'limits']);
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
  assert.equal(copied.negative, `original, ${SOFT}`);
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
  assert.equal(body.negative, `blur, ${SOFT}, ${ALWAYS}`);
  assert.deepEqual(body.presets.negatives, [{id: 'soft', v: 3}]);
});
test("a style's LoRAs come first and the composition's own pick of the same file keeps its weight", () => {
  assert.deepEqual(withStyleLoras('booster.safetensors:0.5, slider.safetensors:-1.1, eyes.safetensors', [{file: 'slider.safetensors', weight: '-0.5'}]),
    [{file: 'booster.safetensors', weight: 0.5}, {file: 'eyes.safetensors', weight: 1}, {file: 'slider.safetensors', weight: -0.5}]);
  assert.deepEqual(withStyleLoras('', null), []);
});

// #704: plain defaults switch off, a box typed by hand is its own text, and Use my text exactly sends the boxes as typed
const heavy = structuredClone(limited);
heavy.negative.push(rec('heavy', {name: 'Body: heavy', default: true, text: 'fat, obese'}));
heavy.style[0].data.loras = 'style-lora.safetensors:0.7';
test('body heavy and low quality are defaults a shot can switch off, also on a reward; only the rating exclusions stay (#704)', () => {
  for (const [rating, hard] of [['safe', false], ['nsfw', false], ['safe', true], ['sensitive', true], ['nsfw', true]]) {
    const body = assembleComposition(composition({characters: [], rating, hard, reward: true, negatives: []}), heavy);
    assert.ok(!words(body.negative).includes('fat') && !words(body.negative).includes('watermark'), `${rating} ${hard}`);
    assert.deepEqual(body.presets.negatives.map(p => p.id), lockedExclusions(composition({characters: [], rating, hard, reward: true}), heavy).ids);
  }
  assert.deepEqual(applyDefaults(composition({characters: [], rating: 'safe'}), heavy).negatives, ['clean', 'limits', 'heavy']);
});
test('a box typed by hand is sent as typed with the fixed rating exclusions; the other box follows the controls (#704)', () => {
  const c = composition({characters: [], rating: 'safe', reward: true, negatives: ['clean', 'heavy'], override: {positive: 'my words'}});
  const body = assembleComposition(c, heavy);
  assert.equal(body.positive, 'my words');
  assert.equal(body.negative, `blur, watermark, fat, obese, ${ALWAYS}, ${LIMITS}, ${SOFT}`);
  assert.equal(body.free_text, false);
  const neg = assembleComposition({...c, override: {negative: 'only mine'}}, heavy);
  assert.match(neg.positive, /^high quality, safe/);
  assert.equal(neg.negative, `only mine, ${LIMITS}, ${SOFT}`);
  const boxes = promptBoxes({...c, override: {negative: 'only mine'}}, heavy);
  assert.deepEqual(boxes.edited, {positive: false, negative: true});
  assert.equal(boxes.text.negative, 'only mine');
  // Reset drops the hand edit; with none left the prompt is built from the controls again
  assert.equal(resetPromptBox({...c, override: {negative: 'only mine'}}, heavy, 'negative').override, null);
  assert.deepEqual(resetPromptBox({...c, override: {positive: 'a', negative: 'b'}}, heavy, 'negative').override, {positive: 'a'});
  // typing the composed words back is not an edit
  assert.deepEqual(promptBoxes({...c, override: {positive: assembleComposition({...c, override: null}, heavy).positive}}, heavy).edited, {positive: false, negative: false});
});
test('Use my text exactly sends the typed words with only the fixed rating exclusions, per mode and tier (#704)', () => {
  const free = (extra = {}) => composition({characters: ['alice'], negatives: ['clean', 'heavy'], loras: [{file: 'mine.safetensors', weight: 0.5}], freeText: true, override: {positive: 'typed prompt', negative: 'typed neg'}, ...extra});
  for (const [rating, hard, reward, fixed] of [['safe', false, false, ''], ['sensitive', false, false, ''], ['safe', false, true, `${LIMITS}, ${SOFT}`],
    ['safe', true, true, LIMITS], ['sensitive', true, true, SKIMPY], ['nsfw', true, true, ''], ['nsfw', true, false, '']]) {
    const body = assembleComposition(free({rating, hard, reward}), heavy);
    const at = `${rating} ${hard} ${reward}`;
    assert.equal(body.positive, 'typed prompt', at);
    assert.equal(body.negative, ['typed neg', fixed].filter(Boolean).join(', '), at);
    assert.equal(body.free_text, true);
    assert.equal(body.overridden, true);
    assert.deepEqual(body.loras, [{file: 'mine.safetensors', weight: 0.5}], 'no style LoRAs');
    assert.equal(body.presets.style, null);
    assert.deepEqual(body.presets.negatives.map(p => p.id), lockedExclusions(free({rating, hard, reward}), heavy).ids, at);
    assert.equal(body.compose.freeText, true);
    assert.deepEqual(body.compose.override, {positive: 'typed prompt', negative: 'typed neg'});
  }
  // a nonadult Mature shot with no character cap keeps the soft preset
  assert.equal(assembleComposition(free({characters: [], rating: 'sensitive'}), heavy).negative, `typed neg, ${SOFT}`);
  // an empty typed prompt stays empty: nothing from the controls fills it
  assert.equal(assembleComposition(free({override: {positive: '', negative: ''}}), heavy).positive, '');
  // the free Negative box holds only typed words; Reset puts back the composed words less the fixed and always-on ones
  const c = free({characters: [], rating: 'safe', reward: true});
  const boxes = promptBoxes(c, heavy);
  assert.equal(boxes.text.negative, 'typed neg');
  assert.equal(boxes.fromControls.negative, 'blur, watermark, fat, obese');
  assert.deepEqual(resetPromptBox(structuredClone(c), heavy, 'negative').override, {positive: 'typed prompt', negative: 'blur, watermark, fat, obese'});
  assert.ok(resetPromptBox(structuredClone(c), heavy, 'positive').override.positive.startsWith('high quality, safe'));
});
test('turning Use my text exactly on keeps what the boxes show, less the fixed words; off keeps them as hand edits (#704)', () => {
  const c = composition({characters: [], rating: 'safe', reward: true, negatives: ['clean', 'heavy']});
  const shown = assembleComposition(c, heavy);
  setFreeText(c, heavy, true);
  assert.equal(c.freeText, true);
  assert.deepEqual(c.override, {positive: shown.positive, negative: 'blur, watermark, fat, obese'});
  assert.equal(assembleComposition(c, heavy).negative, `blur, watermark, fat, obese, ${LIMITS}, ${SOFT}`);
  c.override.negative = 'blur';
  setFreeText(c, heavy, false);
  assert.equal(c.freeText, false);
  assert.equal(assembleComposition(c, heavy).negative, `blur, ${LIMITS}, ${SOFT}`);
  // a hand-edited negative that still has the fixed and always-on words loses them on the way in, as they are added anyway
  const typed = composition({characters: [], rating: 'sensitive', negatives: [], override: {negative: `mine, ${SOFT}, child, loli`}});
  setFreeText(typed, heavy, true);
  assert.equal(typed.override.negative, 'mine');
  assert.ok(normalizeComposition(JSON.parse(JSON.stringify(typed))).freeText);
});
