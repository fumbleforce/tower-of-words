// Runs probe.html (the motion probe) headless and prints its numbers as JSON.
//   node art/candidates/crowd-pilot-2/probe.mjs <cfg json url path, from the served root> [out.json]
import fs from 'node:fs';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';
const WT = 'http://127.0.0.1:8771/.claude/worktrees/agent-a65d0e4170275dcf7/';
const [cfg, out] = process.argv.slice(2);
await withBrowserJob('crowd-pilot-2-probe', async (browser) => {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${WT}art/candidates/crowd-pilot-2/probe.html?cfg=${encodeURIComponent(cfg)}`);
  await page.waitForFunction(() => window.__probe, null, { timeout: 240000 });
  const r = await page.evaluate(() => window.__probe);
  const s = JSON.stringify(r, null, 1);
  if (out) fs.writeFileSync(out, s);
  console.log(s);
  if (errors.length) console.log('ERRORS', errors.join(' | '));
}, { timeoutMs: 1200000, loadWaitMs: 900000, gpuWaitMs: 900000 });
