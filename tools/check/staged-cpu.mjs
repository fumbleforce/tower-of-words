import { fileURLToPath } from 'node:url';
import { withGitSnapshot } from '../lib/git-snapshot.mjs';
import { stagedSnapshot, assertSnapshotCurrent } from '../lib/staged-tree.mjs';
import { boundedCommand } from '../lib/bounded-command.mjs';

export async function checkStagedCpu(cwd, {
  env = process.env, snapshot = stagedSnapshot(cwd, { env }),
  timeoutMs = 300000, signal, stdio = 'inherit',
} = {}) {
  const deadline = Date.now() + timeoutMs;
  assertSnapshotCurrent(cwd, snapshot, { env });
  await withGitSnapshot(cwd, snapshot.tree, async ({ directory, env: cleanEnv }) => {
    const options = () => ({ cwd: directory, env: { ...cleanEnv, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1' },
      timeoutMs: deadline - Date.now(), signal, stdio });
    // Install the captured lockfile in isolation; shared node_modules may be changing.
    await boundedCommand('npm', ['ci', '--ignore-scripts', '--include=dev', '--no-audit', '--no-fund'], options());
    await boundedCommand('npm', ['run', '--ignore-scripts', 'check'], options());
  }, { env, timeoutMs: Math.min(timeoutMs, 60000), signal });
  assertSnapshotCurrent(cwd, snapshot, { env });
  return snapshot;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const controller = new AbortController();
  const stop = signal => controller.abort(new Error(`Staged CPU interrupted by ${signal}`));
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  try {
    const snapshot = await checkStagedCpu(process.cwd(), { signal: controller.signal });
    console.log(`staged CPU: PASS; tree ${snapshot.tree}; diff ${snapshot.diffHash}`);
  } catch (error) {
    console.error(`staged CPU: FAIL; ${error.message}`);
    process.exitCode = 1;
  } finally { process.off('SIGINT', stop); process.off('SIGTERM', stop); }
}
