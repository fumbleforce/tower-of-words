// What round 1's viewer did when walk was pressed (the diagnosis in Review crowd-pilot-2): reviews/crowd-pilot-1/viewer.html,
// its four figures from the side, walk pressed at t=0, screenshots in real time at 0.1, 0.4, 0.8 and 1.6 s, with each
// figure's state as the game's loader reports it.
//   node art/candidates/crowd-pilot-2/r1-viewer-shots.mjs <out dir>
import fs from 'node:fs';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';

const WT = 'http://127.0.0.1:8771/.claude/worktrees/agent-a65d0e4170275dcf7/';
const [out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
await withBrowserJob('crowd-pilot-2-r1viewer', async (browser) => {
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  await page.goto(`${WT}reviews/crowd-pilot-1/viewer.html?s=rigs`);
  await page.waitForFunction(() => window.__viewer?.ready, null, { timeout: 240000 });
  await page.evaluate(() => window.__viewer.view('from the side'));
  await page.waitForTimeout(1500);
  const t0 = Date.now();
  await page.evaluate(() => window.__viewer.setMotion('walk'));
  const states = [];
  for (const t of [100, 400, 800, 1600]) {
    await page.waitForTimeout(Math.max(0, t - (Date.now() - t0)));
    await page.screenshot({ path: `${out}/r1-walk-${t}ms.png`, clip: { x: 0, y: 150, width: 1140, height: 560 } });
  }
  console.log('done', states);
}, { timeoutMs: 600000, loadWaitMs: 500000, gpuWaitMs: 500000 });
