// Stills from the round's live viewer (reviews/crowd-pilot-2/viewer.html) for the sheets, into <out>/. Walk and run
// sequences are stepped exactly (viewer freeze + advance: 0.1 s of motion between frames) so a strip shows one stride.
//   node art/candidates/crowd-pilot-2/shots.mjs <out dir>
import fs from 'node:fs';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';

const WT = 'http://127.0.0.1:8771/.claude/worktrees/agent-a65d0e4170275dcf7/';
const [out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
await withBrowserJob('crowd-pilot-2-shots', async (browser) => {
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${WT}reviews/crowd-pilot-2/viewer.html`);
  await page.waitForFunction(() => window.__viewer?.ready, null, { timeout: 240000 });
  const V = (f, ...a) => page.evaluate(([f, a]) => window.__viewer[f](...a), [f, a]);
  const shot = (name) => page.screenshot({ path: `${out}/${name}.png`, clip: { x: 0, y: 0, width: 1140, height: 900 } });
  let n = 0;
  for (const sc of ['pair', 'cast']) {
    await V('show', sc);
    await V('freeze', false);
    await V('setMotion', 'idle');
    for (const v of ['whole row', 'three-quarter', 'from the side', 'from behind']) {
      await V('view', v);
      await page.waitForTimeout(1200);
      await shot(`${sc}-idle-${v.replace(/ /g, '_')}`); n++;
    }
    if (sc === 'pair') {
      for (const k of ['a', 'b']) {
        await V('closeOn', k, 'face', false);
        await page.waitForTimeout(800);
        await shot(`face-${k}`); n++;
      }
    }
    // walk and run on the treadmill, stepped: whole row from the side, and each one's legs close (pair only)
    for (const m of ['walk', 'run']) {
      await V('setWay', 'treadmill');
      await V('setMotion', m);
      await V('freeze', true);
      await V('advance', 60);
      const views = sc === 'pair' ? [['side', () => V('view', 'from the side')], ['legs-a', () => V('closeOn', 'a', 'legs', true)],
        ['legs-b', () => V('closeOn', 'b', 'legs', true)], ['front', () => V('view', 'whole row')]] : [['side', () => V('view', 'from the side')]];
      for (const [vn, set] of views) {
        await set();
        for (let i = 0; i < 8; i++) {
          await V('advance', 6);
          await page.waitForTimeout(120);
          await shot(`${sc}-${m}-${vn}-${i}`); n++;
        }
      }
      await V('freeze', false);
    }
    // the loop, live, a wide frame
    await V('setWay', 'loop');
    await V('setMotion', 'walk');
    await page.waitForTimeout(2500);
    await shot(`${sc}-walk-loop`); n++;
    await V('setWay', 'treadmill');
    await V('setMotion', 'sit');
    for (const v of ['whole row', 'from the side']) {
      await V('view', v);
      await page.waitForTimeout(900);
      await shot(`${sc}-sit-${v.replace(/ /g, '_')}`); n++;
    }
  }
  console.log(n, 'stills in', out);
  console.log(errors.length ? 'ERRORS ' + errors.join(' | ') : 'no page errors');
}, { timeoutMs: 1500000, loadWaitMs: 900000, gpuWaitMs: 900000 });
