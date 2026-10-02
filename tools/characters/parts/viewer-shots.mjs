// Screenshots of the parts viewer (tools/characters/parts/viewer.html) at given motions and turns, to check it
// loads and animates. Usage: node tools/characters/parts/viewer-shots.mjs <base url> <out dir> [attempt] [cfg json url]
// Base url serves the repo root (http://127.0.0.1:8771/ normally).
import fs from 'node:fs';
import { withBrowserJob } from '../../lib/browser-job.mjs';

const [base = 'http://127.0.0.1:8771/', out = '/tmp/claude-1000/parts-viewer', attempt = 'a10', cfg = ''] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
await withBrowserJob('parts-viewer', async (browser) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${base}tools/characters/parts/viewer.html?a=${attempt}&m=rest${cfg ? '&cfg=' + cfg : ''}`);
  await page.waitForFunction(() => window.__viewer?.ready, null, { timeout: 120000 });
  await page.waitForTimeout(500);
  for (const [m, yaw, t] of [['rest', 0, 0], ['idle', 0, 1500], ['walk', 0.0, 700], ['walk', 1.57, 400], ['walk', 3.14, 400]]) {
    await page.evaluate(([m, yaw]) => { if (window.__m !== m) { window.__viewer.setMotion(m); window.__m = m; } window.__viewer.yaw = yaw; }, [m, yaw]);
    await page.waitForTimeout(t);
    await page.screenshot({ path: `${out}/${attempt}-${m}-${Math.round(yaw * 100)}.png` });
  }
  console.log(errors.length ? 'ERRORS ' + errors.join(' | ') : 'no page errors');
}, { timeoutMs: 280000 });
