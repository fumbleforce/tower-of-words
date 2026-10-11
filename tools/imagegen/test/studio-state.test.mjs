import test from 'node:test';
import assert from 'node:assert/strict';
import {standaloneComposition, standaloneJob} from '../../subplots/web/image-standalone.js';
import {assembleComposition} from '../../subplots/web/image-compose.js';
import {STUDIO_STORAGE_KEY, loadStudioComposition, saveStudioComposition} from '../web/studio-state.js';

const memory = entries => {
  const data = new Map(entries);
  return {getItem: key => data.get(key), setItem: (key, value) => data.set(key, value)};
};
test('scene composition can be reused without retaining a scene attachment or changing the source', () => {
  const source = {subplotId: 'scene:one', imageSlot: 'slot-1', characters: ['alice'], people: {alice: {appearance: 'short hair'}}, stage: {contact: 'holding a cup'}, override: {positive: 'Exact prompt', negative: 'watermark'}, seed: 27};
  const before = structuredClone(source);
  const composition = standaloneComposition(source);
  const body = standaloneJob(assembleComposition(composition, {model: [{id: 'm', data: {file: 'fixture.safetensors'}}]}));
  assert.equal(body.positive, 'Exact prompt');
  assert.equal(body.negative, 'watermark');
  assert.equal(body.seed, 27);
  assert.ok(!Object.hasOwn(body.compose, 'subplotId'));
  assert.ok(!Object.hasOwn(body.compose, 'imageSlot'));
  composition.people.alice.appearance = 'changed';
  assert.deepEqual(source, before);
});
test('legacy cast, camera, references and direct prompts migrate in private mode, preserving the rollback key', () => {
  const value = {chars: ['alice'], cams: ['close'], negs: ['clean'], ipa: {on: true, strength: 0.5}, omRef: 'art/portrait.webp', override: {positive: 'Kept words', negative: 'blur'}};
  const storage = memory([['imagegen.compose', JSON.stringify(value)]]);
  const composition = loadStudioComposition(storage, true);
  assert.deepEqual(composition.characters, ['alice']);
  assert.deepEqual(composition.cameras, ['close']);
  assert.equal(composition.reference, 'art/portrait.webp');
  assert.deepEqual(composition.override, value.override);
  saveStudioComposition(storage, composition, true);
  assert.equal(storage.getItem('imagegen.compose'), JSON.stringify(value));
  assert.deepEqual(loadStudioComposition(storage, true), composition);
});
test('public mode never restores private or legacy shared drafts', () => {
  const storage = memory([['imagegen.compose', JSON.stringify({scene: 'legacy private'})], [STUDIO_STORAGE_KEY + '.private', JSON.stringify({scene: 'private'})]]);
  assert.equal(loadStudioComposition(storage).scene, '');
  saveStudioComposition(storage, standaloneComposition({scene: 'public'}));
  assert.equal(loadStudioComposition(storage).scene, 'public');
  assert.equal(loadStudioComposition(storage, true).scene, 'private');
});
test('a corrupt draft falls back without preventing the composer from opening', () => {
  const storage = memory([[STUDIO_STORAGE_KEY + '.public', '{broken']]);
  assert.deepEqual(loadStudioComposition(storage).characters, []);
  assert.equal(loadStudioComposition({getItem() { throw Error('blocked'); }}).scene, '');
});
