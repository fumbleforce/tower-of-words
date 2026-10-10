// The rack alarm light, on and off, close up on the rack front.
//   node game3d/tools/alarm-shots.mjs [w] [h]     output: game3d/shots/alarm/<w>x<h>/
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { openGame } from '../test/support/open-game.mjs';
import fs from 'node:fs';
import path from 'node:path';
const [W = '1366', H = '860'] = process.argv.slice(2);
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(G, 'shots/alarm', `${W}x${H}`);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
await withBrowserJob('alarm-shots', async (browser) => {
  const url = `http://127.0.0.1:8771/${process.env.BASE || 'game3d'}/index.html?test=fast&q=0`;
  const game = await openGame(browser, { viewport: { width: +W, height: +H }, mode: 'fast', url, touch: +W < 700 });
  const { page } = game;
  await page.waitForFunction(`globalThis.__game.place?.name === 'office' && !!(globalThis.__game.flagsRef || {}).found_chair && !globalThis.__game.busy`, null, { timeout: 250000 });
  await page.evaluate(() => { globalThis.__ended = true; });
  const shot = (n) => page.screenshot({ path: path.join(out, n + '.jpg'), type: 'jpeg', quality: 85 });
  await page.evaluate(([x, y, z, tx, ty, tz]) => {
    globalThis.__ci = setInterval(() => { const c = globalThis.__game.place.cam.camera; c.position.set(x, y, z); c.lookAt(tx, ty, tz); c.updateMatrixWorld(true); }, 5);
  }, [5.12, 1.0, -1.9, 5.12, 0.95, -3.3]);
  await page.waitForTimeout(300);
  await page.evaluate(() => globalThis.__game.place.hooks.rackAlarm({ state: 'off' }));
  await page.waitForTimeout(400);
  await shot('rack-off');
  await page.evaluate(() => globalThis.__game.place.hooks.rackAlarm({ state: 'on' }));
  for (let i = 0; i < 6; i++) { await page.waitForTimeout(137); await shot('rack-on-' + i); }
  await page.evaluate(() => { clearInterval(globalThis.__ci); globalThis.__game.place.hooks.rackAlarm({ state: 'off' }); });
  console.log('done', out);
});
