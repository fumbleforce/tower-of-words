// Runs crowd-pilot-2's motion probe (probe.html: the game's own loader, the root moved at a set ground speed, the gait
// timing the clip) on a list of people, served from this worktree, and prints a short table plus the full JSON.
//   node art/candidates/rei-rig-2/probe.mjs <cfg json path from the served root> [out.json]
// PAGE=art/candidates/rei-rig-2/idle-probe.html runs the idle probe instead and prints its JSON.
import fs from 'node:fs';
import path from 'node:path';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const WT = `http://127.0.0.1:8771/${path.relative('/home/jorgen/repo/japanese', ROOT)}/`;
const [cfg, out] = process.argv.slice(2);
const PAGE = process.env.PAGE || 'art/candidates/crowd-pilot-2/probe.html';
await withBrowserJob('rei-rig-2-probe', async (browser) => {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${WT}${PAGE}?cfg=${encodeURIComponent(cfg)}`);
  await page.waitForFunction(() => window.__probe, null, { timeout: 240000 });
  const r = await page.evaluate(() => window.__probe);
  if (out) fs.writeFileSync(out, JSON.stringify(r, null, 1));
  const f = (x) => JSON.stringify(x);
  if (process.env.PAGE) { for (const p of r) console.log(p.label.padEnd(26), f(p.settled), f(p.afterWalk)); return; }
  for (const p of r) {
    if (p.error) { console.log(p.label, 'ERROR', p.error.slice(0, 300)); continue; }
    console.log(`${p.label.padEnd(26)} slip walk ${p.walk.slip} fast ${p.walkFast.slip} run ${p.run.slip} back ${p.walkBack.slip}` +
      ` | meshSlip ${p.walk.meshSlip} | thigh ${f(p.walk.thigh)} knee ${p.walk.knee} | thighOut ${p.lateral.thighOut}` +
      ` feet ${f(p.lateral.feetApart)} | idle hips ${p.idle.hipsMove.toFixed(3)} head ${p.idle.headMove.toFixed(3)}` +
      ` elbow ${f(p.idle.elbow)} armOut ${f(p.idle.armOut)} thighOut ${f(p.idle.thighOut)}`);
  }
  if (errors.length) console.log('ERRORS', errors.join(' | '));
}, { timeoutMs: 1200000, loadWaitMs: 900000, gpuWaitMs: 900000 });
