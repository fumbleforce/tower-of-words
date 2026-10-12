// Forecourt tree repair: gameplay and the north-bed branch joins, roots, curb and benches.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const width = +(process.argv[2] || 1366), phone = width < 600;
const base = process.env.BASE || 'game3d';
const out = new URL(`../shots/forecourt-trees-523/${width}/`, import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const errors = [];
await withBrowserJob(`forecourt-trees-${width}`, async browser => {
  const context = await browser.newContext({ viewport: { width, height: phone ? 844 : 860 }, isMobile: phone, hasTouch: phone });
  let closing = false;
  await context.route('**/*', scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: e => errors.push(String(e)) }));
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ privateMode: false, voiceOn: false })));
  try {
    await waitForGame(page, 120000, () => page.goto(`http://127.0.0.1:8771/${base}/index.html?day=2&place=forecourt&q=${phone ? 0 : 2}`), 'play');
    await page.waitForFunction(() => globalThis.__done && !globalThis.__game.busy);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: out + 'game.png' });
    const bed = await page.evaluate(async () => (await import(new URL('js/scenes/forecourt/plan.js', globalThis.location.href).href)).NORTH_BED);
    const [x0, x1, z0, z1] = bed, z = (z0 + z1) / 2, x = (x0 + x1) / 2 + 3;
    for (const [name, eye, at] of [
      ['user-angle', phone ? [x - 1, 2.5, z + 8] : [x - 2.6, 2.4, z + 5], [phone ? x : x - 1.5, 1.3, z]],
      ['joins-front', [x + 0.2, 1.6, z + 3], [x, 1.5, z]],
      ['joins-side', [x - 2.1, 1.4, z + 0.5], [x, 1.5, z]],
      ['roots-curb', [x - 0.7, 2.1, z + 2.3], [x, 0.4, z]],
      ['bed-clearance', [(x0 + x1) / 2, 7.5, z + 2], [(x0 + x1) / 2, 0, z]],
    ]) {
      await page.evaluate(({ eye, at }) => {
        const cam = globalThis.__game.place.cam;
        cam.update = () => { cam.camera.position.set(...eye); cam.camera.lookAt(...at); cam.camera.updateMatrixWorld(); };
      }, { eye, at });
      await page.waitForTimeout(500);
      await page.screenshot({ path: out + name + '.png' });
    }
    fs.writeFileSync(out + 'report.json', JSON.stringify({ width, bed, errors }, null, 2));
    assert.deepEqual(errors, []);
    console.log('PASS', width, out);
  } finally { closing = true; await context.close(); }
}, { timeoutMs: 180000, gpuWaitMs: 900000 });
