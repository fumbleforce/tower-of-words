import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { isolatedGitEnvironment } from '../../../tools/lib/git-environment.mjs';
import { stagedSnapshot } from '../../../tools/lib/staged-tree.mjs';
import { checkStagedAssets } from '../../../tools/check/staged-assets.mjs';
import { checkFactsTrailer } from '../../../tools/check/commit-message.mjs';

test('binary gate uses staged policy/bytes and refuses private or nonregular entries', t => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-commit-gate-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  const env = isolatedGitEnvironment();
  const git = (...args) => execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
    '-c', 'core.hooksPath=/dev/null', ...args], { cwd, env, encoding: 'utf8' });
  git('init', '--quiet'); git('commit', '--quiet', '--allow-empty', '-m', 'fixture');
  fs.mkdirSync(path.join(cwd, 'tools/assets'), { recursive: true });
  const config = { binary_ext: ['png'], commit_allow: [], max_text_kb: 2 };
  const policy = path.join(cwd, 'tools/assets/sync.json');
  fs.writeFileSync(policy, JSON.stringify(config));
  fs.writeFileSync(path.join(cwd, 'data'), 'text\0binary');
  fs.writeFileSync(path.join(cwd, '.gitattributes'), 'data text\n');
  git('add', '--', 'tools/assets/sync.json', 'data', '.gitattributes');
  const snapshot = stagedSnapshot(cwd, { env });
  fs.writeFileSync(path.join(cwd, 'data'), 'working text');
  fs.writeFileSync(policy, JSON.stringify({ ...config, commit_allow: ['data'] }));
  assert.throws(() => checkStagedAssets(cwd, snapshot, { env }), /binary belongs/);
  git('add', '--', 'tools/assets/sync.json');
  checkStagedAssets(cwd, stagedSnapshot(cwd, { env }), { env });
  assert.throws(() => checkStagedAssets(cwd, { ...snapshot, changes: [
    { file: 'private/synthetic', status: 'A', mode: '100644' },
  ] }, { env }), /Private paths/);
  assert.throws(() => checkStagedAssets(cwd, { ...snapshot, changes: [
    { file: 'symlink', status: 'A', mode: '120000' },
  ] }, { env }), /Nonregular/);
});

test('Facts identifies a retained staged document and allows attribution trailers after it', () => {
  const snapshot = { changes: [{ file: 'docs/game/systems.md', status: 'M', mode: '100644' }] };
  checkFactsTrailer('Change\n\nFacts: docs/game/systems.md\nCo-Authored-By: Reviewer\nClaude-Session: fixture', snapshot);
  checkFactsTrailer('Change\n\nFacts: none', snapshot);
  for (const message of ['Change only', 'Facts:none', 'Facts: none\nFacts: none',
    'Facts: docs/game/missing.md', 'Facts: docs/game/../private.md']) {
    assert.throws(() => checkFactsTrailer(message, snapshot));
  }
  assert.throws(() => checkFactsTrailer('Facts: docs/game/systems.md', { changes: [
    { file: 'docs/game/systems.md', status: 'D', mode: '000000' },
  ] }));
});
