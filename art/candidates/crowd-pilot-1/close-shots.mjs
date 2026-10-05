// Close stills of each of the four rigs (reviews/crowd-pilot-1/viewer.html, scene "rigs"): upper body (shoulders,
// elbows) and lower body (hips, knees), front and side, in idle, walk, run and sit, where rigs usually fail.
// GL=soft runs it on the CPU.
//   node art/candidates/crowd-pilot-1/close-shots.mjs <out dir> [base url]
import fs from 'node:fs';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';

const [out, base = 'http://127.0.0.1:8771/.claude/worktrees/agent-a5d25623c92a5028b/'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const RIGS = ['a-own', 'a-meshy', 'b-own', 'b-meshy'];
await withBrowserJob('crowd-pilot-close', async (browser) => {
  const page = await browser.newPage({ viewport: { width: 1060, height: 700 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}reviews/crowd-pilot-1/viewer.html?s=rigs`);
  await page.waitForFunction(() => window.__viewer?.ready, null, { timeout: 240000 });
  let n = 0;
  for (const m of ['idle', 'walk', 'run', 'sit']) {
    await page.evaluate((m) => window.__viewer.setMotion(m), m);
    for (const part of ['upper', 'lower'])
      for (const side of [false, true])
        for (let i = 0; i < 4; i++) {
          await page.evaluate(([i, p, s]) => window.__viewer.closeOn(i, p, s), [i, part, side]);
          await page.waitForTimeout(m === 'walk' || m === 'run' ? 700 : 400);
          await page.screenshot({ clip: { x: 0, y: 0, width: 700, height: 700 }, path: `${out}/${m}-${part}-${side ? 'side' : 'front'}-${RIGS[i]}.png` });
          n++;
        }
  }
  console.log(n, 'stills in', out);
  console.log(errors.length ? 'ERRORS ' + errors.join(' | ') : 'no page errors');
}, { timeoutMs: 600000 });
