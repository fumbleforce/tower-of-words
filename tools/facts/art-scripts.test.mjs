// art-scripts.mjs: which files under art/ are scripts, and which of them fail the check.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isScript, checkScripts } from './art-scripts.mjs';

function verdict(files, base) {
  const bad = [], notes = [];
  checkScripts(files, base, (where, msg) => bad.push([where, msg]), (msg) => notes.push(msg));
  return { bad, notes };
}

test('a script is a .py, .mjs, .js or .sh file directly under art/', () => {
  assert.equal(isScript('art/candidates/x/gen.py'), true);
  assert.equal(isScript('art/parts/mio/build.mjs'), true);
  assert.equal(isScript('art/parts/mio/tool.js'), true);
  assert.equal(isScript('art/candidates/x/measure.sh'), true);
  assert.equal(isScript('art/candidates/x/meta.json'), false);
  assert.equal(isScript('art/candidates/x/ref.webp'), false);
  assert.equal(isScript('tools/characters/meshy.py'), false);
  assert.equal(isScript('artwork/x.py'), false);
});

test('a script that is not in the baseline fails, with the instruction', () => {
  const { bad } = verdict(['art/candidates/new/gen.py'], { files: [] });
  assert.equal(bad.length, 1);
  assert.equal(bad[0][0], 'art/candidates/new/gen.py');
  assert.ok(bad[0][1].includes("put reusable steps in tools/characters/steps/ and the model's settings in its recipe"));
});

test('a baselined script passes; a baselined script that is gone is a note, not a failure', () => {
  const { bad, notes } = verdict(['art/a/gen.py'], { files: ['art/a/gen.py', 'art/gone/gen.py'] });
  assert.equal(bad.length, 0);
  assert.equal(notes.length, 1);
  assert.match(notes[0], /art\/gone\/gen\.py .*prune/);
});

test('moving a script counts as adding one: the new path fails and the old one is a note', () => {
  const { bad, notes } = verdict(['art/b/gen.py'], { files: ['art/a/gen.py'] });
  assert.equal(bad.length, 1);
  assert.equal(bad[0][0], 'art/b/gen.py');
  assert.equal(notes.length, 1);
});

test('the recorded baseline is well formed: art/ scripts only, sorted, no repeats', () => {
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), 'art-scripts-baseline.json');
  const base = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.match(base.about, /can be deleted, never added/);
  assert.ok(base.files.length > 0);
  assert.deepEqual(base.files, [...new Set(base.files)].sort());
  for (const f of base.files) assert.ok(isScript(f), f);
});
