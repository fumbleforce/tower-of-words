import { checkStagedSyntax } from './staged.mjs';
import { checkStagedAssets } from './staged-assets.mjs';
import { checkStagedCpu } from './staged-cpu.mjs';
import { checkAssetSync } from './locked-assets.mjs';

const controller = new AbortController();
const stop = signal => controller.abort(new Error(`Commit checks interrupted by ${signal}`));
process.on('SIGINT', stop); process.on('SIGTERM', stop);
try {
  const cwd = process.cwd(), snapshot = checkStagedSyntax(cwd);
  if (snapshot.failures.length) throw new Error(snapshot.failures.map(failure => `${failure.file}: ${failure.error}`).join('\n'));
  checkStagedAssets(cwd, snapshot);
  checkAssetSync(cwd);
  console.log(`staged syntax/assets: PASS; ${snapshot.changes.length} changed files`);
  await checkStagedCpu(cwd, { snapshot, signal: controller.signal });
  console.log(`pre-commit: PASS; tree ${snapshot.tree}`);
} catch (error) { console.error(`pre-commit: FAIL; ${error.message}`); process.exitCode = 1; }
finally { process.off('SIGINT', stop); process.off('SIGTERM', stop); }
