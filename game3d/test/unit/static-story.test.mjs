import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { staticStory } from '../../../tools/lib/static-story.mjs';
const root = new URL('../../../', import.meta.url);
const read = name => fs.readFileSync(new URL(name, root), 'utf8');
const shared = 'game3d/story/conversations/station-worker.js';
test('asset reader resolves the actual imported garden wrapper, shared branches and unchanged place nodes', async () => {
  const file = 'game3d/story/shotengai.js';
  assert.deepEqual(staticStory(file, read), (await import(new URL(file, root))).default);
});
test('unresolved imports, dynamic wrapper bodies and dynamic story values fail visibly', () => {
  const file = 'game3d/story/shotengai.js';
  assert.throws(() => staticStory(file, name => read(name).replace('withStationGarden(', 'unknownComposition(')), /Unsupported story composition/);
  assert.throws(() => staticStory(file, name => name === shared ? read(name).replace('return {', 'sideEffect(); return {') : read(name)), /Dynamic story composition/);
  assert.throws(() => staticStory(file, name => name === shared ? read(name).replace("text: 'Oh, thanks.'", 'text: dynamicText()') : read(name)), /Unsupported story composition/);
  assert.throws(() => staticStory(file, name => name === shared ? read(name).replace('...GARDEN.nodes', '...missing.nodes') : read(name)), /Unresolved story binding/);
});
