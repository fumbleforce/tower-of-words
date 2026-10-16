import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkLayouts, layoutFindings } from '../../../tools/check/layout.mjs';

const layout = { folders: ['imagegen'], scripts: ['comfy.py', 'layout.json'] };

test('a new top-level file fails with the pipeline message', () => {
  const found = layoutFindings('tools', { folders: ['imagegen'], scripts: ['comfy.py', 'layout.json', 'scratch.py'] },
    layout);
  assert.deepEqual(found, ["tools/scratch.py: put it in its pipeline's folder, or in the scratchpad if it's a one-off"]);
});

test('a new top-level folder must be listed as a pipeline folder', () => {
  const found = layoutFindings('tools', { folders: ['imagegen', 'newpipe'], scripts: ['comfy.py', 'layout.json'] }, layout);
  assert.equal(found.length, 1);
  assert.match(found[0], /^tools\/newpipe\/: a new top-level folder. List it under "folders"/);
});

test('a listed entry that is gone fails until it is removed', () => {
  const found = layoutFindings('tools', { folders: ['imagegen'], scripts: ['layout.json'] }, layout);
  assert.deepEqual(found, ['tools/layout.json: "comfy.py" is listed under scripts but is gone, so remove it.']);
});

test('a folder listed under scripts is refused', () => {
  const found = layoutFindings('tools', { folders: ['imagegen'], scripts: ['layout.json'] },
    { folders: [], scripts: ['imagegen', 'layout.json'] });
  assert.deepEqual(found, [
    'tools/imagegen/: a new top-level folder. List it under "folders" in tools/layout.json if it is a pipeline or service.',
    'tools/layout.json: "imagegen" is listed under scripts, but it is a folder. Move it to folders.',
  ]);
});

test('tools/ and game3d/tools/ match their layout.json files', () => {
  const { findings, checked } = checkLayouts();
  assert.deepEqual(findings, []);
  assert.ok(checked > 300, 'the trees have their top-level entries');
});
