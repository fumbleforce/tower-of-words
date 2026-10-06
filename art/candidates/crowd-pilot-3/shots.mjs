// Stills from the round's live viewer (reviews/crowd-pilot-3/viewer.html) for the sheets, into <out>/: every face close
// at one zoom (A, B and the cast: Kenji, Kuro, Aoi, Emi), straight on and turned, idle rows, and walk and run on the
// treadmill stepped exactly (viewer freeze + advance: 0.1 s of motion between frames).
//   node art/candidates/crowd-pilot-3/shots.mjs <out dir> [faces]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const WT = 'http://127.0.0.1:8771/' + path.relative('/home/jorgen/repo/japanese', ROOT) + '/';
const [out, only] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
await withBrowserJob('crowd-pilot-3-shots', async (browser) => {
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${WT}reviews/crowd-pilot-3/viewer.html?s=cast`);
  await page.waitForFunction(() => window.__viewer?.ready, null, { timeout: 240000 });
  const V = (f, ...a) => page.evaluate(([f, a]) => window.__viewer[f](...a), [f, a]);
  const shot = (name) => page.screenshot({ path: `${out}/${name}.png`, clip: { x: 0, y: 0, width: 1140, height: 900 } });
  let n = 0;
  // faces, everyone in the cast scene at one zoom: straight on, then turned to show their left side a little
  await V('freeze', false);
  await V('setMotion', 'idle');
  for (const k of ['a', 'b', 'kenji', 'kuro', 'aoi', 'emi']) {
    for (const [tag, turn] of [['front', 0], ['turn', -0.6]]) {
      await V('closeOn', k, 'face', turn);
      await page.waitForTimeout(900);
      await shot(`face-${k}-${tag}`); n++;
    }
  }
  if (only !== 'faces') {
    for (const sc of ['pair', 'cast']) {
      await V('show', sc);
      await V('setMotion', 'idle');
      for (const v of ['whole row', 'three-quarter', 'from the side', 'from behind']) {
        await V('view', v);
        await page.waitForTimeout(1200);
        await shot(`${sc}-idle-${v.replace(/ /g, '_')}`); n++;
      }
    }
    await V('show', 'pair');
    for (const m of ['walk', 'run']) {
      await V('setWay', 'treadmill');
      await V('setMotion', m);
      await V('freeze', true);
      await V('advance', 60);
      await V('view', 'whole row');
      for (let i = 0; i < 8; i++) {
        await V('advance', 6);
        await page.waitForTimeout(120);
        await shot(`pair-${m}-front-${i}`); n++;
      }
      await V('freeze', false);
    }
  }
  console.log(n, 'stills in', out);
  console.log(errors.length ? 'ERRORS ' + errors.join(' | ') : 'no page errors');
}, { timeoutMs: 1500000, loadWaitMs: 900000, gpuWaitMs: 900000 });
