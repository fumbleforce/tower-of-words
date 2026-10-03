import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { checkStagedCpu } from '../../../tools/check/staged-cpu.mjs';
import { isolatedGitEnvironment } from '../../../tools/lib/git-environment.mjs';

test('CPU checks run staged files and lockfile in their own repository, preserving working files and index', async t => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-staged-cpu-fixture-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  const env = isolatedGitEnvironment();
  const git = (...args) => execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
    '-c', 'core.hooksPath=/dev/null', ...args], { cwd, env, encoding: 'utf8' });
  git('init', '--quiet'); git('commit', '--quiet', '--allow-empty', '-m', 'fixture');
  fs.mkdirSync(path.join(cwd, 'tools/check'), { recursive: true });
  fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ name: 'fixture', version: '1.0.0',
    scripts: { install: 'node -e "process.exit(1)"', check: 'node tools/check/run.mjs' } }));
  fs.writeFileSync(path.join(cwd, 'package-lock.json'), JSON.stringify({ name: 'fixture', version: '1.0.0',
    lockfileVersion: 3, packages: { '': { name: 'fixture', version: '1.0.0', hasInstallScript: true } } }));
  const check = path.join(cwd, 'tools/check/run.mjs');
  fs.writeFileSync(check, 'process.exit(1);');
  git('add', '--', 'package.json', 'package-lock.json', 'tools/check/run.mjs');
  fs.writeFileSync(check, 'process.exit(0);');
  const index = fs.readFileSync(path.join(cwd, '.git/index'));
  const options = { env: { ...env, GIT_DIR: path.join(cwd, '.git'), GIT_INDEX_FILE: path.join(cwd, '.git/index') },
    timeoutMs: 20000, stdio: 'ignore' };
  await assert.rejects(checkStagedCpu(cwd, options), /failed \(1\)/);
  assert.deepEqual(fs.readFileSync(path.join(cwd, '.git/index')), index);
  assert.equal(fs.readFileSync(check, 'utf8'), 'process.exit(0);');
  fs.writeFileSync(check, `import assert from 'node:assert/strict';
    import fs from 'node:fs'; import {execFileSync} from 'node:child_process';
    const tracked = execFileSync('git', ['ls-files'], {encoding: 'utf8'});
    assert(tracked.includes('tools/check/run.mjs'));
    assert(!process.env.GIT_INDEX_FILE); assert(!process.env.GIT_DIR);
    fs.writeFileSync('scratch.txt', 'isolated');
    execFileSync('git', ['add', '--', 'scratch.txt']);
  `);
  git('add', '--', 'tools/check/run.mjs');
  const goodIndex = fs.readFileSync(path.join(cwd, '.git/index'));
  fs.writeFileSync(check, 'process.exit(99);');
  fs.writeFileSync(path.join(cwd, 'package-lock.json'), 'broken working lockfile');
  await checkStagedCpu(cwd, options);
  assert.deepEqual(fs.readFileSync(path.join(cwd, '.git/index')), goodIndex);
  assert.equal(fs.readFileSync(check, 'utf8'), 'process.exit(99);');
  assert(!fs.existsSync(path.join(cwd, 'node_modules')));
  assert(!fs.existsSync(path.join(cwd, 'scratch.txt')));
});
