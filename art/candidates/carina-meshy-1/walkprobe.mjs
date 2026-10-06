// Carina's walk measured as the game plays it (crowd-pilot-2's motion probe, art/candidates/crowd-pilot-2/probe.js:
// planted-foot slip, thigh swing, thigh splay and the rest), against Emi and Kuro. Served from this worktree.
//   node art/candidates/carina-meshy-1/walkprobe.mjs <cfg json path from the served root> [out.json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const rel = path.relative('/home/jorgen/repo/japanese', ROOT);
const WT = `http://127.0.0.1:8771/${rel ? rel + '/' : ''}`;
const [cfg, out] = process.argv.slice(2);
await withBrowserJob('carina-walkprobe', async (browser) => {
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
}, { timeoutMs: 285000, loadWaitMs: 60000, gpuWaitMs: 60000 });
