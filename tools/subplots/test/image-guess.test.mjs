import test from 'node:test';
import assert from 'node:assert/strict';
import {guessComposition} from '../web/image-guess.js';
import {assembleComposition, normalizeComposition, applyDefaults, SOFT_NEGATIVE} from '../web/image-compose.js';

const rec = (id, data) => ({id, v: 1, data});
const presets = {
  character: [rec('tess', {name: 'Tess', age: 'adult woman', look: 'grey cloak', outfit: 'wool scarf', short: 'Tess, cloak', gender: 'female'})],
  style: [rec('reward', {name: 'R', quality: 'masterpiece, best quality', suffix: 'short fingernails.'})],
  model: [rec('rdbt', {name: 'RDBT', file: 'rdbt.safetensors'})],
  framing: [rec('portrait', {w: 896, h: 1152, prompt: ''})],
  camera: [rec('close', {prompt: 'close-up'}), rec('pov', {prompt: 'pov'})],
  negative: [rec('base', {text: 'worst quality, blurry', default: true}), rec('implied', {text: SOFT_NEGATIVE})],
};
test('guesses blocks from an old prompt and leaves the rest as free text', () => {
  const old = {positive: 'masterpiece, best quality, sensitive, 1girl, Tess, adult woman, grey cloak, close-up, sitting on a rug, holding a mug, short fingernails.',
    negative: 'worst quality, blurry, duckface', model_file: 'rdbt.safetensors', w: 896, h: 1152, seed: 5};
  const {composition: c} = guessComposition(old, presets);
  assert.deepEqual(c.characters, ['tess']);
  assert.deepEqual(c.cameras, ['close']);
  assert.equal(c.model, 'rdbt'); assert.equal(c.style, 'reward'); assert.equal(c.framing, 'portrait'); assert.equal(c.rating, 'sensitive');
  assert.equal(c.scene, 'sitting on a rug, holding a mug');
  assert.equal(c.negative, 'duckface');
  assert.deepEqual(c.negatives, ['base']);
});
test('soft negative is always added for Mature and Adult, unless hard', () => {
  const c = applyDefaults(normalizeComposition({characters: ['tess'], rating: 'sensitive'}), presets);
  assert.ok(assembleComposition(c, presets, 's').negative.includes('visible nipples'));
  assert.ok(!assembleComposition({...c, rating: 'safe'}, presets, 's').negative.includes('visible nipples'));
  assert.ok(!assembleComposition({...c, rating: 'nsfw', hard: true}, presets, 's').negative.includes('visible nipples'));
  const o = assembleComposition({...c, override: {positive: 'x', negative: 'blur'}}, presets, 's');
  assert.ok(o.negative.includes('transparent unobstructed body'));
});
