// B2's reduced work pod, walkable east aisle and corridor-facing restroom signs.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const base = process.env.BASE || 'game3d';
const out = new URL('../shots/b2-layout-532/final/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
await withBrowserJob('b2-layout-check', async browser => {
  for (const width of [1366, 390]) {
    const page = await browser.newPage({ viewport: { width, height: width < 600 ? 844 : 860 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => new URL(route.request().url()).pathname.includes('/private/')
      ? route.fulfill({ status: 404, body: '' }) : route.continue());
    await page.addInitScript(() => globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({
      v: 99, privateMode: false, voiceOn: false, cameraMode: 'follow', textSpeed: 'instant',
    })));
    await waitForGame(page, 60000, () => page.goto(`http://127.0.0.1:8771/${base}/?place=office&perf&cap&q=2`), 'any');
    await page.waitForFunction(() => globalThis.__done);
    await page.evaluate(async () => {
      globalThis.__run = true;
      globalThis.document.body.classList.remove('cap');
      const { sim, setPeriod } = await import('./js/sim.js');
      sim.day = 3;
      setPeriod('evening', globalThis.__game);
    });
    await page.locator('#boot').waitFor({ state: 'hidden' });
    await page.waitForFunction(() => !globalThis.__game.busy && !globalThis.__game.walker.path);
    const aisle = await page.evaluate(() => {
      const { nav, things } = globalThis.__game.place;
      return { free: [-4.5, -3.72, -3, -2.2].every(z => nav.free(0.4, z)),
        eric: things.my_desk.spot(), covered: things.covered_monitor.spot() };
    });
    assert.equal(aisle.free, true, 'Removed desks must leave a walkable aisle');
    assert.equal(aisle.covered[0], -0.8);
    for (const [name, x, z, yaw] of [
      ['desks', 0.12, -1.93, Math.PI],
      ['men', 2.6, 0.8, 0], ['women', 5.2, 0.8, 0],
    ]) {
      await page.evaluate(({ x, z, yaw }) => {
        const game = globalThis.__game;
        game.player.root.position.set(x, 0, z);
        game.walker.sync();
        game.followCamera.aim(yaw, 0.06);
      }, { x, z, yaw });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${out}/${width}-${name}.png` });
    }
    await page.evaluate(async () => {
      const g = globalThis.__game;
      g.player.root.position.set(0.4, 0, -2.2);
      g.walker.sync();
      await g.walkTo(0.4, -4.5);
    });
    const z = await page.evaluate(() => globalThis.__game.player.root.position.z);
    assert.ok(Math.abs(z + 4.5) < 0.15, `Walk reaches other end of cleared aisle: ${z}`);
    await page.evaluate(async () => (await import('./js/settings.js')).setSetting('cameraMode', 'overview'));
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${out}/${width}-overview.png` });
    assert.deepEqual(errors, []);
    console.log('PASS B2 layout', width, JSON.stringify(aisle));
    await page.close();
  }
}, { timeoutMs: 240000, gpuWaitMs: 900000 });
