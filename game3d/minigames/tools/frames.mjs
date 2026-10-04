// Frame strips of Kotodama's moments, for checking the animation by eye: the first command, the first
// と combo (shift 2), and a swapped particle. Frames go to game3d/shots/minigames/kotodama-frames-<w>x<h>/.
//   node game3d/minigames/tools/frames.mjs <width> <height> [--port P]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';

const [w = '390', h = '844', ...rest] = process.argv.slice(2);
const port = rest.includes('--port') ? rest[rest.indexOf('--port') + 1] : '8771';
const width = Number(w), height = Number(h), phone = width < 640;
const out = path.join(path.resolve(fileURLToPath(new URL('../../', import.meta.url))), 'shots', 'minigames', `kotodama-frames-${width}x${height}`);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

await withBrowserJob('minigame-kotodama-frames', async browser => {
  const context = await browser.newContext({ viewport: { width, height }, isMobile: phone, hasTouch: phone });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/game3d/minigames/kotodama.html`);
  const expectNow = () => page.evaluate(() => window.mg.expect);
  const waitExpect = async () => {
    for (let i = 0; i < 100; i++) {
      const e = await expectNow();
      if (e && e.kind) return e;
      await page.waitForTimeout(100);
    }
    throw new Error('stuck');
  };
  const strip = async (label, seq) => {
    for (const s of seq.slice(0, -1)) await page.click(s);
    await page.screenshot({ path: path.join(out, `${label}-00-built.png`) });
    await page.click(seq[seq.length - 1]);
    for (let i = 1; i <= 14; i++) {
      await page.waitForTimeout(160);
      await page.screenshot({ path: path.join(out, `${label}-${String(i).padStart(2, '0')}.png`) });
    }
  };
  await page.click('.overlay .go-daily');
  let e = await waitExpect();
  await page.screenshot({ path: path.join(out, 'a-start.png') });
  await strip('b-first', e.seq);
  e = await waitExpect();
  await strip('c-wrong', e.wrong);
  // play on to shift 2 with the planner
  for (let guard = 0; guard < 40; guard++) {
    e = await waitExpect();
    if (e.kind === 'tap') {
      await page.screenshot({ path: path.join(out, 'd-pick.png') });
      await page.click(e.sel);
      break;
    }
    for (const s of e.seq) await page.click(s);
  }
  e = await waitExpect();
  await page.screenshot({ path: path.join(out, 'e-shift2.png') });
  await strip('f-combo', e.seq);
  await context.close();
  console.log(`${errors.length ? 'FAIL' : 'PASS'} frames in ${out}`);
  for (const m of errors) console.log('  page error:', m);
});
