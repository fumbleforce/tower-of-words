// A save that changes nothing writes back the exact source, for every scene the editor can open: each public story
// node, and each sequence of the configured private recipes when this checkout has them. Read-only: nothing is
// written, and a private scene shows up only as a count or, on failure, by its id.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { run } from '../source.mjs';
import { recipe } from '../recipes.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));

// The private recipe configuration: this checkout's, or the main checkout's when this is a worktree without island/.
function privateConfig() {
  const rel = 'island/private/rewards/tools/subplot-editor.json';
  const candidates = [process.env.SUBPLOTS_CONFIG, path.join(root, rel)];
  try {
    const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: root, encoding: 'utf8' }).trim();
    candidates.push(path.join(path.dirname(common), rel));
  } catch { /* not a git checkout */ }
  const file = candidates.find(f => f && fs.existsSync(f));
  return file && !process.env.SUBPLOTS_PUBLIC_ONLY ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
}

test('a no-op save of every public story node writes back the exact source', () => {
  const { scenes } = run(root, { action: 'catalog' });
  assert.ok(scenes.length > 100, 'the public story has its nodes');
  const changed = [];
  for (const s of scenes) {
    const read = structuredClone(run(root, { action: 'read', id: s.id }));
    const out = run(root, { ...read, steps: read.steps ?? undefined, action: 'prepare' });
    if (out.changed !== out.source) changed.push(s.id);
  }
  assert.deepEqual(changed, []);
  console.log(`# public sequences round-tripped: ${scenes.length}`);
});

test('a no-op save of every configured private sequence writes back the exact source', t => {
  const config = privateConfig();
  if (!config) { t.skip('no private recipes in this checkout'); return; }
  let count = 0;
  const changed = [];
  for (const c of config.sources) {
    const source = fs.readFileSync(c.file, 'utf8');
    for (const s of recipe(source, c, { action: 'catalog' }).scenes) {
      count++;
      // the read goes through JSON, as it does between the editor and the provider
      const read = JSON.parse(JSON.stringify(recipe(source, c, { action: 'read', id: s.id })));
      if (recipe(source, c, { ...read, action: 'prepare' }).changed !== source) changed.push(s.id);
    }
  }
  assert.ok(count > 0, 'the configured recipes have sequences');
  assert.deepEqual(changed, []);
  console.log(`# private sequences round-tripped: ${count}`);
});
