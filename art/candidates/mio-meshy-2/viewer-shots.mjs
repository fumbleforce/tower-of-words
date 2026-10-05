// Stills of the live viewer for reviews/mio-meshy-2 (reviews/crowd-pilot-1/viewer.html with this round's config), to
// check the page loads and the game's own idle, walk and sit play on the new model, and for the review's sheets.
//   node art/candidates/mio-meshy-2/viewer-shots.mjs      BASE=<path under 8771 to the checkout, ending in />
// Writes the main checkout's art/parts/mio-meshy-2/viewer/<scene>/<motion>-<view>.png (local only).
import fs from 'node:fs';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';

const base = `http://127.0.0.1:8771/${process.env.BASE || ''}`;
const root = '/home/jorgen/repo/japanese/art/parts/mio-meshy-2/viewer';
const views = { front: 'whole row', side: 'from the side', back: 'from behind', q: 'three-quarter' };
const errors = [];
await withBrowserJob('mio-meshy-2-viewer', async (browser) => {
  const page = await browser.newPage({ viewport: { width: 1400, height: 860 } });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  for (const s of ['now', 'green', 'textures', 'cast']) {
    const out = `${root}/${s}`;
    fs.mkdirSync(out, { recursive: true });
    await page.goto(`${base}reviews/crowd-pilot-1/viewer.html?cfg=../mio-meshy-2/viewer.json&s=${s}&m=idle`);
    await page.waitForFunction(() => window.__viewer?.ready && /people/.test(document.getElementById('status').textContent), null, { timeout: 180000 });
    const shots = s === 'cast' ? [['idle', 'front'], ['walk', 'front'], ['walk', 'side']]
      : [['idle', 'front'], ['idle', 'q'], ['idle', 'back'], ['walk', 'front'], ['walk', 'side'], ['sit', 'front'], ['sit', 'side'],
        ['idle', 'face']];
    for (const [m, v] of shots) {
      await page.evaluate(([m, v]) => {
        window.__viewer.setMotion(m);
        if (v === 'face') window.__viewer.view('mio-2: face');
        else window.__viewer.view(v);
      }, [m, v === 'face' ? 'face' : views[v]]);
      await page.waitForTimeout(m === 'walk' ? 900 : 1500);
      await page.screenshot({ path: `${out}/${m}-${v}.png` });
    }
  }
}, { timeoutMs: 600000 });
console.log(errors.length ? 'ERRORS ' + errors.join(' | ') : 'no page errors');
