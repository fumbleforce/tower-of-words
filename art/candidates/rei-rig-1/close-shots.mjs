// Stills of one attempt alone in the live viewer (tools/characters/parts/viewer.html, nobody beside it): rest, idle
// and walk from the front, three-quarter (the left side of the image turned to us), side and back, for Rei's new rig
// (Review rei-meshy-1) and Kenji round 3 (kenji-meshy-1). Made from staff-meshy-1/shots.mjs. Errors are printed.
//   node art/candidates/rei-rig-1/close-shots.mjs <viewer json url> <attempt> <out dir> [base url]
import fs from 'node:fs';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';

const [cfg, attempt, out, base = 'http://127.0.0.1:8771/'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
await withBrowserJob('close-shots', async (browser) => {
  const page = await browser.newPage({ viewport: { width: 1000, height: 860 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${base}tools/characters/parts/viewer.html?cfg=${cfg}&a=${encodeURIComponent(attempt)}&m=rest&c=none`);
  await page.waitForFunction(() => window.__viewer?.ready, null, { timeout: 120000 });
  await page.waitForTimeout(800);
  const shots = [];
  for (const m of ['rest', 'idle', 'walk'])
    for (const [yaw, t] of [[0, 900], [0.8, 350], [1.57, 300], [3.14, 300]]) {
      await page.evaluate(([m, yaw]) => { if (window.__m !== m) { window.__viewer.setMotion(m); window.__m = m; } window.__viewer.yaw = yaw; }, [m, yaw]);
      await page.waitForTimeout(t);
      const f = `${out}/${m}-${Math.round(yaw * 100)}.png`;
      await page.screenshot({ path: f, clip: { x: 0, y: 120, width: 575, height: 700 } });
      shots.push(f);
    }
  console.log(shots.length, 'stills in', out);
  console.log(errors.length ? 'ERRORS ' + errors.join(' | ') : 'no page errors');
}, { timeoutMs: 280000 });
