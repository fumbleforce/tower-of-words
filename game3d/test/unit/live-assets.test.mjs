// The live public assets match the game (tools/assets/live.mjs check; notes/asset-lifecycle.md): every file in
// game3d/assets, game3d/audio and game3d/fonts is registered in tools/assets/live.json, every registered file exists,
// everything the game asks for is registered, nothing registered goes unused, and no voice clip is an old take.
import assert from 'node:assert/strict';
import test from 'node:test';
import { checkPublic } from '../../../tools/assets/live.mjs';

test('live public assets match tools/assets/live.json', async () => {
  const { errors } = await checkPublic();
  assert.deepEqual(errors.slice(0, 20), [], `${errors.length} problem(s); fix with node tools/assets/live.mjs (notes/asset-lifecycle.md)`);
});
