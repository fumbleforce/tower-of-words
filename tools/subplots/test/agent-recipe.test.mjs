import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareAgentGeneration, prepareRewardGeneration, isRewardRecipePath} from '../agent-recipe.mjs';
import {applyDefaults, normalizeComposition, assembleComposition} from '../web/image-compose.js';

// Synthetic versioned presets; no local preset, cast or image data enters these tests.
const rec = (id, data, v = 1) => ({id, v, data});
const presets = {
  character: [rec('alice', {name: 'Alice', age: 'adult', look: 'black hair', outfit: 'blue uniform', negative: 'wrong eye colour'})],
  outfit: [rec('coat', {text: 'raincoat', negative: 'wrong coat'})],
  style: [rec('paint', {quality: 'quality words', anchors: 'painted', suffix: 'finishing words', negative: 'style exclusions'}, 4)],
  model: [rec('model', {file: 'fixture.safetensors'})],
  framing: [rec('wide', {prompt: 'wide view', w: 64, h: 64})],
  camera: [rec('eye', {prompt: 'eye level'})],
  negative: [rec('clean', {text: 'preset exclusions', default: true}, 3)],
  location: [rec('room', {text: 'quiet office'})], pose: [rec('sit', {text: 'sitting'})],
  light: [rec('day', {text: 'daylight'})], scene: [rec('meeting', {text: 'meeting'})],
};
const base = {characters: ['alice'], outfit: {alice: 'coat'}, cameras: ['eye'], style: 'paint', model: 'model', framing: 'wide'};
const build = (changes = {}, blocks = presets) => prepareAgentGeneration({...base, ...changes}, blocks, 'test');

test('agent command uses the exact normal assembler and preserves selected versioned exclusions', () => {
  const recipe = {...base, scene: 'Alice reads a report'};
  const expected = assembleComposition(applyDefaults(normalizeComposition(recipe), presets), presets, 'recipe:test');
  expected.compose.recipe = 'test';
  assert.deepEqual(prepareAgentGeneration(recipe, presets, 'test'), expected);
  assert.equal(expected.positive, 'quality words, safe, 1girl, painted, Alice, adult, black hair, wearing raincoat, Alice reads a report, eye level, wide view, finishing words');
  assert.equal(expected.negative, 'preset exclusions, style exclusions, wrong eye colour, wrong coat, child, loli');
  assert.deepEqual(expected.presets.style, {id: 'paint', v: 4});
  assert.deepEqual(expected.presets.negatives, [{id: 'clean', v: 3}]);
});

test('updated configured preset words and versions flow through without a hardcoded tag list', () => {
  const changed = structuredClone(presets);
  changed.negative[0] = rec('clean', {default: true, text: 'new configured exclusions'}, 5);
  changed.style[0].data.negative = 'new style exclusions';
  const body = build({}, changed);
  assert.match(body.negative, /^new configured exclusions, new style exclusions,/);
  assert.deepEqual(body.presets.negatives, [{id: 'clean', v: 5}]);
});

for (const override of [{positive: 'replacement'}, {negative: 'replacement'}, 'replacement', {}])
  test('refuses whole-prompt override ' + JSON.stringify(override), () => assert.throws(() => build({override}), /whole prompt overrides/));
for (const [kind, id, data] of [
  ['style', 'paint', {quality: '', anchors: '', suffix: ''}], ['style', 'paint', {negative: ''}],
  ['negative', 'clean', {text: 'invented replacement'}], ['negative', 'clean', {text: ''}],
  ['camera', 'eye', {prompt: 'different'}], ['framing', 'wide', {prompt: ''}],
  ['character', 'alice', {look: 'different'}], ['model', 'model', {file: 'different'}],
]) test('refuses rewriting ' + kind + ' preset ' + JSON.stringify(data), () => {
  assert.throws(() => build({blockOverrides: {[kind]: {[id]: data}}}), /block words must come from the selected preset/);
});
for (const key of ['appearance', 'clothing', 'appearanceNegative', 'clothingNegative'])
  test('refuses manual person ' + key + ', including empty words', () => {
    for (const text of ['replacement', '']) assert.throws(() => build({people: {alice: {[key]: text}}}), /appearance and clothing words/);
  });
test('refuses ad hoc additive exclusion words', () => {
  assert.throws(() => build({negative: 'custom tags'}), /selected negative presets/);
});
test('refuses exclusion-disable switches', () => {
  assert.throws(() => build({styleNegOff: true}), /style exclusions/);
  assert.throws(() => build({charNegOff: {alice: true}}), /character exclusions/);
});
test('refuses absent, archived and unversioned selected blocks and unrecognised inputs', () => {
  for (const changes of [{characters: ['missing']}, {negatives: ['missing']}, {outfit: {alice: 'missing'}}, {cameras: ['missing']}, {sceneRefs: ['missing']}])
    assert.throws(() => build(changes), /current versioned/);
  for (const patch of [{archived: true}, {v: undefined}]) {
    const changed = structuredClone(presets); Object.assign(changed.style[0], patch);
    assert.throws(() => build({}, changed), /current versioned style/);
  }
  assert.throws(() => build({positive: 'raw prompt'}), /unsupported field positive/);
  assert.throws(() => build({outfit: {absent: true}}), /character absent/);
});
test('preserves supported scene staging, canonical reference and queue settings', () => {
  const body = build({environment: 'room', pose: 'sit', light: 'day', stage: {people: {alice: {facing: 'camera', expression: 'smiling'}}},
    blockOverrides: {location: {room: {text: 'office with a beige CRT monitor'}}, light: {day: {text: 'overhead light'}}},
    reference: 'art/approved/example.webp', referenceOn: true, steps: 20, seed: 17, count: 2});
  assert.match(body.positive, /Alice facing the viewer, smiling/);
  assert.match(body.positive, /office with a beige CRT monitor/);
  assert.match(body.positive, /overhead light/);
  assert.equal(body.ipa.ref, 'art/approved/example.webp');
  assert.equal(body.steps, 20); assert.equal(body.seed, 17); assert.equal(body.count, 2);
  assert.throws(() => build({environment: 'room', blockOverrides: {location: {other: {text: 'somewhere'}}}}), /selected block/);
});
test('attached recipes require full scene editor id and exact shot slot together', () => {
  for (const changes of [{subplotId: 'scene'}, {subplotId: 'local:foo', imageSlot: 'pic:scene.1'}, {subplotId: 'enc_d4_fountain', imageSlot: 'pic:scene.1'}, {subplotId: 'public:foo', imageSlot: 'pic:scene.1'}, {subplotId: 'local:sample:scene:steps'}, {imageSlot: 'pic:scene.1'}, {subplotId: 'scene', imageSlot: 'pic:scene.1'}])
    assert.throws(() => build(changes), /subplotId.*imageSlot/);
  const body = build({subplotId: 'local:sample:scene:steps', imageSlot: 'pic:scene.1#2'});
  assert.equal(body.compose.subplotId, 'local:sample:scene:steps');
  assert.equal(body.compose.imageSlot, 'pic:scene.1#2');
  assert.equal(build().compose.subplotId, 'recipe:test');
});
test('refusal and success leave input recipes and presets unchanged', () => {
  const recipe = {...base, blockOverrides: {negative: {clean: {text: ''}}}};
  const before = structuredClone(recipe), blocksBefore = structuredClone(presets);
  assert.throws(() => prepareAgentGeneration(recipe, presets, 'test'));
  build(); assert.deepEqual(recipe, before); assert.deepEqual(presets, blocksBefore);
});
test('human editor retains its shot overrides', () => {
  const body = assembleComposition(applyDefaults(normalizeComposition({...base,
    override: {positive: 'user words', negative: 'user exclusions'}, people: {alice: {clothing: 'user outfit'}},
  }), presets), presets, 'local:sample:scene:steps');
  assert.equal(body.positive, 'user words'); assert.equal(body.negative, 'user exclusions');
});

test('typed shared contract preserves supported tools, aliases and editor metadata exactly like GUI assembly', () => {
  const recipe = {...base, chars: ['alice'], cams: ['eye'], camera: 'eye', negs: ['clean'],
    sceneRefs: ['meeting'], environment: 'Quiet office', light: 'daylight through the window', pose: 'seated',
    stage: {people: {alice: {x: .4, d: .2, placed: true, facing: 'camera', toward: '', gaze: 'down', lookAt: '', expression: 'focused', height: ''}}, contact: '', lightFrom: 'above', mood: 'calm'},
    start: {image: 'art/approved/example.webp', denoise: .3, mask: 'art/approved/mask.png'},
    loras: [{file: 'fixture.safetensors', weight: .7}], control: {file: 'guide.safetensors', image: 'art/approved/guide.webp', strength: .6, start: 0, end: .8},
    huefix: [{op: 'hue', box: [1, 2, 30, 40], hmin: 70, hmax: 200, target: 165, sat: .2}],
    ipa: {ref: 'art/approved/example.webp', on: true, strength: .6, cutout: false}, omRef: 'art/approved/legacy.webp', fix: {on: true, denoise: .5},
    subplotId: 'local:sample:scene:steps', imageSlot: 'file:encounters/example.webp#2',
    castInitialized: true, sourceChecked: true, edited: true, toolsOpen: true, originalOpen: false, directionOpen: true,
    source: {positive: 'older source'}, original: {positive: 'older source'}, made: 'new-version', repaintText: '',
    width: '64', height: '64', steps: '10', cfg: '4', referenceStrength: '0.6', faceStrength: '0.5', sampler: 'euler', scheduler: 'normal', count: '2', seed: '12', seedMode: 'fixed',
  };
  const expected = assembleComposition(applyDefaults(normalizeComposition(recipe), presets), presets, recipe.subplotId);
  expected.compose.recipe = 'full';
  assert.deepEqual(prepareAgentGeneration(recipe, presets, 'full'), expected);
  assert.deepEqual(expected.start, recipe.start); assert.deepEqual(expected.control, recipe.control);
  assert.deepEqual(expected.loras, recipe.loras); assert.deepEqual(expected.huefix, recipe.huefix);
  assert.deepEqual(expected.compose.source, recipe.source); assert.equal(expected.compose.imageSlot, recipe.imageSlot);
});

test('malformed fields and nested tool shapes fail before assembly without coercion or silent removal', () => {
  for (const changes of [
    {width: 'sixty-four'}, {steps: NaN}, {seed: 'garbage'}, {cfg: 'Infinity'}, {count: false}, {rating: 'unknown'}, {seedMode: 'unknown'},
    {characters: 'alice'}, {stage: {people: {alice: {x: 'left'}}}},
    {start: {image: 'x', custom: true}}, {loras: [{file: 'x', weight: 'heavy'}]},
    {control: {file: 'x', strength: 'strong'}}, {huefix: [{op: 'hue', box: [1, 'two']}]},
  ]) assert.throws(() => build(changes), /Agent recipe refused/);
});

test('preset defaults and explicit empty negative selection keep normal editor semantics', () => {
  assert.deepEqual(build({negatives: null}).presets.negatives, [{id: 'clean', v: 3}]);
  const empty = build({negatives: []});
  assert.deepEqual(empty.presets.negatives, []);
  assert.equal(empty.negative, 'style exclusions, wrong eye colour, wrong coat, child, loli');
});


test('attachments preserve existing public, local, studio and supported shot id families', () => {
  for (const subplotId of ['public:game3d/story/train.js#first', 'local:sample:scene:steps',
    'studio:public:0123456789abcdef0123456789abcdef', 'studio:private:0123456789abcdef0123456789abcdef'])
    for (const imageSlot of ['pic:scene.1#2', 'file:encounters/example.webp#2~2', 'new:abc123', 'image:0']) {
      const body = build({subplotId, imageSlot});
      assert.equal(body.compose.subplotId, subplotId); assert.equal(body.compose.imageSlot, imageSlot);
    }
  for (const imageSlot of ['scene.1', 'pic:', 'file:', 'new:', 'image:wrong'])
    assert.throws(() => build({subplotId: 'local:sample:scene:steps', imageSlot}), /subplotId.*imageSlot/);
});


test('normal reset metadata and generic cast outfits preserve canonical GUI assembly', () => {
  const genericPresets = structuredClone(presets);
  genericPresets.character.push(rec('generic', {generic: true, gender: 'male', look: 'adult man', outfit: 'grey suit'}));
  const recipe = {...base, man: true, outfit: {alice: true, generic: true}, people: {alice: {}},
    charNegOff: {alice: false}, styleNegOff: false, override: null, negative: '',
    blockOverrides: {style: {paint: {}}, negative: {clean: {}}}};
  const expected = assembleComposition(applyDefaults(normalizeComposition(recipe), genericPresets), genericPresets, 'recipe:reset');
  expected.compose.recipe = 'reset';
  assert.deepEqual(prepareAgentGeneration(recipe, genericPresets, 'reset'), expected);
  assert.match(expected.positive, /wearing grey suit/);
});


test('a nonadult reward loads the soft negative preset; Adult mode never does, at any rating', () => {
  const blocks = structuredClone(presets);
  blocks.negative.push(rec('soft', {text: 'soft exclusions', default: false, soft: true}, 2));
  for (const recipe of [{...base}, {...base, rating: 'nsfw'}, {...base, hard: false, rating: 'safe'}, {...base, negatives: ['clean']}, {...base, negatives: ['soft', 'clean']}]) {
    const body = prepareRewardGeneration(recipe, blocks, 'soft');
    assert.equal(body.compose.hard, false);
    assert.deepEqual(body.presets.negatives, [{id: 'clean', v: 3}, {id: 'soft', v: 2}]);
    assert.match(body.negative, /^preset exclusions, soft exclusions, style exclusions,/);
  }
  for (const rating of ['safe', 'nsfw']) {
    const adult = prepareRewardGeneration({...base, hard: true, rating}, blocks);
    assert.deepEqual(adult.presets.negatives, [{id: 'clean', v: 3}]);
    assert.doesNotMatch(adult.negative, /soft exclusions/);
  }
  assert.throws(() => prepareRewardGeneration({...base, hard: true, negatives: ['clean', 'soft']}, blocks), /configured default selection/);
  for (const negatives of [[], ['soft'], ['clean', 'soft', 'soft']])
    assert.throws(() => prepareRewardGeneration({...base, negatives}, blocks), /plus the soft negative preset/);
  assert.throws(() => prepareRewardGeneration({...base}, presets), /need the soft negative preset/);
  assert.throws(() => prepareRewardGeneration({...base, hard: 'yes'}, blocks), /hard must be true/);
});

test('reward entry preserves exactly the configured exclusion selection and normal GUI output', () => {
  const recipe = {...base, hard: true, rating: 'nsfw', subplotId: 'local:sample:scene:steps', imageSlot: 'pic:scene.1'};
  const expected = assembleComposition(applyDefaults(normalizeComposition(recipe), presets), presets, recipe.subplotId);
  expected.compose.recipe = 'reward';
  assert.deepEqual(prepareRewardGeneration(recipe, presets, 'reward'), expected);
  const blocks = structuredClone(presets);
  blocks.negative.push(rec('optional', {text: 'optional exclusions', default: false}));
  for (const negatives of [[], ['clean', 'optional'], ['optional'], ['clean', 'clean']])
    assert.throws(() => prepareRewardGeneration({...recipe, negatives}, blocks), /configured default selection/);
  assert.throws(() => prepareRewardGeneration({...recipe, negative: 'extra words'}, blocks), /selected negative presets/);
  blocks.negative[1].data.default = true;
  const updated = prepareRewardGeneration(recipe, blocks);
  assert.deepEqual(updated.presets.negatives, [{id: 'clean', v: 3}, {id: 'optional', v: 1}]);
  assert.throws(() => prepareRewardGeneration({...recipe, negatives: ['clean']}, blocks), /configured default selection/);
});

test('reward path detection follows the established directory, without matching unrelated names', () => {
  for (const file of ['/tmp/project/island/private/rewards/peeks/example-1/recipes/example.json', 'island/private/rewards/peeks/example-1/recipes/example.json', 'C:\\project\\island\\private\\rewards\\peeks\\example-1\\recipes\\example.json'])
    assert.equal(isRewardRecipePath(file), true, file);
  for (const file of ['/tmp/rewards/example.json', '/tmp/public/rewards-copy/example.json'])
    assert.equal(isRewardRecipePath(file), false, file);
});
