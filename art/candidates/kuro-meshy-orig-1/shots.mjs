// Stills of the live viewer for reviews/kuro-meshy-orig-1: Kuro beside the in-game Eric and Mio, at rest, idling and
// walking, from the front and her left side, to check the page loads and the moves play. The review links the live page.
//   node art/candidates/kuro-meshy-orig-1/shots.mjs [base url]
import fs from 'node:fs';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';

const base = process.argv[2] || 'http://127.0.0.1:8771/';
const out = '/home/jorgen/repo/japanese/art/parts/kuro-meshy-orig-1/viewer';
fs.mkdirSync(out, { recursive: true });
const cfg = '/reviews/kuro-meshy-orig-1/viewer.json';
const c = encodeURIComponent('Eric and Mio (in game)');
await withBrowserJob('kuro-meshy-orig-viewer', async (browser) => {
  const page = await browser.newPage({ viewport: { width: 1400, height: 860 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${base}tools/characters/parts/viewer.html?cfg=${cfg}&a=kuro-1&m=rest&c=${c}`);
  await page.waitForFunction(() => window.__viewer?.ready, null, { timeout: 120000 });
  await page.waitForTimeout(800);
  for (const [m, yaw, t] of [['rest', 0, 0], ['idle', 0, 1500], ['walk', 0, 700], ['walk', 1.57, 450], ['walk', 0.6, 300]]) {
    await page.evaluate(([m, yaw]) => { if (window.__m !== m) { window.__viewer.setMotion(m); window.__m = m; } window.__viewer.yaw = yaw; }, [m, yaw]);
    await page.waitForTimeout(t);
    await page.screenshot({ path: `${out}/${m}-${Math.round(yaw * 100)}.png` });
  }
  console.log(errors.length ? 'ERRORS ' + errors.join(' | ') : 'no page errors');
}, { timeoutMs: 280000 });
