// Stills from the round's live viewer (reviews/crowd-pilot-1/viewer.html) for the sheets: every scene, motion and
// view listed below. Errors are printed. GL=soft runs it on the CPU (software GL) while the GPU is someone else's.
//   node art/candidates/crowd-pilot-1/shots.mjs <out dir> [base url]
import fs from 'node:fs';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';

const [out, base = 'http://127.0.0.1:8771/.claude/worktrees/agent-a5d25623c92a5028b/'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const PLAN = [
  ['rigs', ['idle', 'walk', 'run', 'sit'], ['whole row', 'three-quarter', 'A: shoulders and elbows', 'A: hips and knees', 'B: shoulders and elbows', 'B: hips and knees', 'from the side', 'A from the side, hips and knees', 'B from the side, hips and knees', 'from behind']],
  ['cast', ['idle', 'walk'], ['whole row', 'from the side']],
  ['variety', ['idle', 'walk'], ['whole row', 'three-quarter', 'A: shoulders and elbows', 'B: shoulders and elbows']],
];
await withBrowserJob('crowd-pilot-shots', async (browser) => {
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${base}reviews/crowd-pilot-1/viewer.html`);
  await page.waitForFunction(() => window.__viewer?.ready, null, { timeout: 240000 });
  let n = 0;
  for (const [sc, motions, views] of PLAN) {
    const rigs = sc === 'variety' ? ['?-own', '?-meshy'] : [null];
    await page.evaluate((s) => window.__viewer.show(s), sc);
    for (const rig of rigs) {
      if (rig) await page.evaluate((r) => window.__viewer.setRig(r), rig);
      for (const m of motions) {
        await page.evaluate((m) => window.__viewer.setMotion(m), m);
        for (const v of views) {
          await page.evaluate((v) => window.__viewer.view(v), v);
          await page.waitForTimeout(m === 'idle' || m === 'sit' ? 900 : 1300);
          const f = `${out}/${sc}${rig ? '-' + rig.slice(2) : ''}-${m}-${v.replace(/[ ,:]+/g, '_')}.png`;
          await page.screenshot({ path: f, clip: { x: 0, y: 0, width: 1140, height: 900 } });
          n++;
        }
      }
    }
  }
  console.log(n, 'stills in', out);
  console.log(errors.length ? 'ERRORS ' + errors.join(' | ') : 'no page errors');
}, { timeoutMs: 600000 });
