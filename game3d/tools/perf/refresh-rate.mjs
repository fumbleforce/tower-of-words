// The frame rate the game draws at on the default settings (#568): the title, B2 standing still, the pause menu over
// B2 and a fullscreen picture with a line under it, each measured for 5 s on the real GPU.
//   BASE=.claude/worktrees/<name>/game3d node game3d/tools/perf/refresh-rate.mjs [width height] [--json out.json]
// Headless Chrome ticks at 60 Hz; this tool unpins it (CHROME_ARGS), so a frame without a cap comes as fast as the
// GPU allows: Auto shows the headroom over a 120 Hz screen, and any cap below it shows as its own rate.
// Per scene: the active limit, frames presented a second, and the median and 95th percentile time between presented
// frames (ms); the screens and the sampling are in frame-measure.mjs, shared with the place budget check's frame tier.
// Settings are the defaults (quality and frame limit Auto); FRAMECAP=60 etc. measures an explicit choice.
import fs from 'node:fs';
import { withBrowserJob, exitDeferred } from '../../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../../tools/bible/check-scope.mjs';
import { UNCAPPED, SCREENS, measureScreens } from './frame-measure.mjs';

process.env.CHROME_ARGS ??= UNCAPPED;
const nums = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);
const [W, H] = nums.length >= 2 ? nums : [2560, 1440];
const jsonAt = process.argv.indexOf('--json');
const jsonOut = jsonAt > 0 ? process.argv[jsonAt + 1] : null;
const index = `http://127.0.0.1:8771/${process.env.BASE || 'game3d'}/index.html`;
const SECONDS = 5;
const stored = { privateMode: false, ...(process.env.FRAMECAP ? { frameCap: process.env.FRAMECAP } : {}) };

let results = {};
await withBrowserJob(
  'refresh-rate',
  async (browser) => {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    const scopeErrors = [], errors = [];
    await context.route('**/*', scopedRoute({ publicOnly: true, onFailure: (e) => scopeErrors.push(String(e)) }));
    await context.addInitScript((s) => globalThis.localStorage.setItem('amakawa-settings', JSON.stringify(s)), stored);
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    results = await measureScreens(page, index, Object.keys(SCREENS), SECONDS, async (name) => {
      console.log(name, JSON.stringify(results[name] ?? ''));
      if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/${name}.png`, timeout: 10000 });
    });
    if (scopeErrors.length || errors.length) console.error('errors', JSON.stringify({ scopeErrors, errors }));
    await context.close();
  },
  { gpuLock: `refresh-rate-${process.pid}`, gpuWaitMs: 1800000, timeoutMs: 240000 },
).catch(exitDeferred);
console.log(`\n${W}x${H}  scene        limit  fps     median  p95 (ms)`);
for (const [k, r] of Object.entries(results))
  console.log(r.error ? `  ${k.padEnd(12)} ${r.error}` : `  ${k.padEnd(12)} ${String(r.limit || 'none').padEnd(6)} ${String(r.fps).padEnd(7)} ${String(r.medianMs).padEnd(7)} ${r.p95Ms}`);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ size: [W, H], results }, null, 2));
