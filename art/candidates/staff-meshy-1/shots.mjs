// Stills of the live viewer for reviews/<id>-meshy-1 (staff): the person beside the in-game Eric, Mio, Kuro, Aoi and Emi
// , at rest, idling and walking, from the front and her left side, to check the page loads and the moves play.
// The review links the live page.
//   node art/candidates/staff-meshy-1/shots.mjs <id> [base url] [viewer json url]     ATTEMPT=<id> (default <char>-1)
import fs from 'node:fs';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';

const char = process.argv[2];
const base = process.argv[3] || 'http://127.0.0.1:8771/';
const attempt = process.env.ATTEMPT || `${char}-1`;
const out = `/home/jorgen/repo/japanese/art/parts/${char}-meshy-1/viewer/${attempt}`;
fs.mkdirSync(out, { recursive: true });
const cfg = process.argv[4] || `/reviews/${char}-meshy-1/viewer.json`;
const c = encodeURIComponent('Eric, Mio, Kuro, Aoi and Emi');
await withBrowserJob(`${char}-meshy-1-viewer`, async (browser) => {
  const page = await browser.newPage({ viewport: { width: 1400, height: 860 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${base}tools/characters/parts/viewer.html?cfg=${cfg}&a=${encodeURIComponent(attempt)}&m=rest&c=${c}`);
  await page.waitForFunction(() => window.__viewer?.ready, null, { timeout: 120000 });
  await page.waitForTimeout(800);
  for (const [m, yaw, t] of [['rest', 0, 0], ['idle', 0, 1500], ['walk', 0, 700], ['walk', 1.57, 450], ['walk', 0.6, 300]]) {
    await page.evaluate(([m, yaw]) => { if (window.__m !== m) { window.__viewer.setMotion(m); window.__m = m; } window.__viewer.yaw = yaw; }, [m, yaw]);
    await page.waitForTimeout(t);
    await page.screenshot({ path: `${out}/${m}-${Math.round(yaw * 100)}.png` });
  }
  console.log(errors.length ? 'ERRORS ' + errors.join(' | ') : 'no page errors');
}, { timeoutMs: 280000 });
