import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { moduleSize, checkBudgets, runtimeSizes } from '../../../tools/check/module-budgets.mjs';

const baseline = () => ({ defaultLines: 400, exceptions: {
  'game3d/js/main.js': { lines: 500, bytes: 10000, owner: 'codex-tui', review: 'fixture', reason: 'Existing startup and orchestration' },
} });

test('module limits catch new oversized files and growth by either lines or bytes', () => {
  const sizes = { 'game3d/js/main.js': { lines: 500, bytes: 10000 } };
  assert.deepEqual(checkBudgets(sizes, baseline()), []);
  assert.equal(checkBudgets({ ...sizes, 'game3d/js/new.js': { lines: 401, bytes: 100 } }, baseline()).length, 1);
  assert.equal(checkBudgets({ 'game3d/js/main.js': { lines: 501, bytes: 9999 } }, baseline()).length, 1);
  assert.equal(checkBudgets({ 'game3d/js/main.js': { lines: 500, bytes: 10001 } }, baseline()).length, 1);
  assert.deepEqual(moduleSize('あ\nb\n'), { lines: 2, bytes: 6 });
});

test('exceptions require provenance and disappear when the module fits or is removed', () => {
  assert.match(checkBudgets({}, baseline())[0], /stale budget/);
  assert.match(checkBudgets({ 'game3d/js/main.js': { lines: 400, bytes: 8000 } }, baseline())[0], /obsolete exception/);
  assert.match(checkBudgets({ 'game3d/js/main.js': { lines: 450, bytes: 9000 } }, baseline())[0], /lower the ceiling/);
  const invalid = baseline();
  delete invalid.exceptions['game3d/js/main.js'].review;
  assert.throws(() => checkBudgets({ 'game3d/js/main.js': { lines: 450, bytes: 9000 } }, invalid), /must name reason, owner and review/);
});

test('runtime budgets include modules regardless of JavaScript extension', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-budget-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'game3d/js'), { recursive: true });
  for (const extension of ['js', 'mjs', 'cjs'])
    fs.writeFileSync(path.join(root, `game3d/js/oversized.${extension}`), '// line\n'.repeat(450));
  const failures = checkBudgets(runtimeSizes(root), { defaultLines: 400, exceptions: {} });
  assert.equal(failures.length, 3);
});
