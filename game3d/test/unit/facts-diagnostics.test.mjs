import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('facts check reports an unknown documented object with its actual place source', () => {
  // Change only the child process's doc reader; shared docs remain untouched.
  const preload = `import fs from 'node:fs';
    const read = fs.readFileSync;
    fs.readFileSync = function(file, ...args) {
      const value = read.call(this, file, ...args);
      return String(file).endsWith('/docs/game/places.md')
        ? value.replace('| \`foodbag\` |', '| \`missing_fixture_bag\` |') : value;
    };`;
  const result = spawnSync(process.execPath, ['--import', 'data:text/javascript,' + encodeURIComponent(preload),
    'tools/facts/check.mjs'], { cwd: fileURLToPath(new URL('../../../', import.meta.url)),
    encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /missing_fixture_bag.*not in game3d\/js\/places\/train\.js/);
  assert.doesNotMatch(result.stdout + result.stderr, /is not defined|ReferenceError/);
});
