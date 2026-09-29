// The commit checks for one exact commit, used by tools/land.sh: every commit in <base>..<commit> needs a valid
// Facts line (as commit-msg checks), and <commit>'s own tree passes `npm run check` in a disposable snapshot with
// dependencies installed from that commit's lockfile (as pre-commit does for the index). No working tree is read.
// Usage: node tools/check/commit-cpu.mjs <commit> [--since <base>]
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { withGitSnapshot } from '../lib/git-snapshot.mjs';
import { boundedCommand } from '../lib/bounded-command.mjs';
import { checkFactsTrailer } from './commit-message.mjs';

const git = (cwd, args) => execFileSync('git', ['--no-replace-objects', ...args],
  { cwd, encoding: 'utf8', timeout: 10000, maxBuffer: 16 * 1024 * 1024 }).trim();

function changes(cwd, commit) {
  const raw = git(cwd, ['diff-tree', '-r', '-z', '--raw', '--no-abbrev', '--no-renames', '--root', '--no-commit-id', commit]);
  const fields = raw.split('\0').filter(Boolean), list = [];
  for (let index = 0; index < fields.length; index += 2) {
    const match = /^:[0-7]{6} ([0-7]{6}) [a-f0-9]+ [a-f0-9]+ ([A-Z])$/.exec(fields[index]);
    assert(match, `Malformed diff record for ${commit}`);
    list.push({ mode: match[1], status: match[2], file: fields[index + 1] });
  }
  return list;
}

export function checkCommitMessages(cwd, base, commit) {
  const commits = git(cwd, ['rev-list', '--reverse', `${base}..${commit}`]).split('\n').filter(Boolean);
  const failures = [];
  for (const oid of commits) {
    try { checkFactsTrailer(git(cwd, ['log', '-1', '--format=%B', oid]), { changes: changes(cwd, oid) }); }
    catch (error) { failures.push(`${oid.slice(0, 7)} ${git(cwd, ['log', '-1', '--format=%s', oid])}: ${error.message}`); }
  }
  return { commits, failures };
}

export async function checkCommitCpu(cwd, commit, { timeoutMs = 300000, signal, stdio = 'inherit' } = {}) {
  const deadline = Date.now() + timeoutMs, tree = git(cwd, ['rev-parse', `${commit}^{tree}`]);
  await withGitSnapshot(cwd, tree, async ({ directory, env }) => {
    const options = () => ({ cwd: directory, env: { ...env, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1' },
      timeoutMs: deadline - Date.now(), signal, stdio });
    // Binaries aren't in git after the asset move: copy in the commit's locked files, as pre-commit does.
    const locked = await import('./locked-assets.mjs').catch(error => {
      if (error.code === 'ERR_MODULE_NOT_FOUND') return null;
      throw error;
    });
    locked?.materializeLockedAssets(cwd, directory);
    await boundedCommand('npm', ['ci', '--ignore-scripts', '--include=dev', '--no-audit', '--no-fund', '--prefer-offline'], options());
    await boundedCommand('npm', ['run', '--ignore-scripts', 'check'], options());
  }, { timeoutMs: Math.min(timeoutMs, 60000), signal });
  return tree;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const controller = new AbortController();
  const stop = signal => controller.abort(new Error(`Commit checks interrupted by ${signal}`));
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  try {
    const [commitArg, flag, baseArg] = process.argv.slice(2);
    assert(commitArg && (!flag || (flag === '--since' && baseArg)), 'Usage: commit-cpu.mjs <commit> [--since <base>]');
    const cwd = process.cwd(), commit = git(cwd, ['rev-parse', '--verify', `${commitArg}^{commit}`]);
    if (baseArg) {
      const { commits, failures } = checkCommitMessages(cwd, baseArg, commit);
      if (failures.length) throw new Error(`Facts line:\n${failures.join('\n')}`);
      console.log(`commit messages: PASS; ${commits.length} commits`);
    }
    const tree = await checkCommitCpu(cwd, commit, { signal: controller.signal });
    console.log(`commit CPU: PASS; commit ${commit.slice(0, 12)}; tree ${tree.slice(0, 12)}`);
  } catch (error) {
    console.error(`commit CPU: FAIL; ${error.message}`);
    process.exitCode = 1;
  } finally { process.off('SIGINT', stop); process.off('SIGTERM', stop); }
}
