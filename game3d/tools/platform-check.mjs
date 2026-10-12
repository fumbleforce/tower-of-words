import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
const base = process.env.URL || 'http://127.0.0.1:8771/game3d';
const out = process.env.OUT || new URL('../shots/platform-526/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
await withBrowserJob(
  'platform-526',
  async (browser) => {
    for (const [width, height] of [
      [1366, 860],
      [390, 844],
    ]) {
      const page = await browser.newPage({ viewport: { width, height } });
      await page.route('**/*', (r) =>
        new URL(r.request().url()).pathname.includes('/private/') ? r.fulfill({ status: 404, body: '' }) : r.continue(),
      );
      await page.addInitScript(() =>
        globalThis.localStorage.setItem(
          'amakawa-settings',
          JSON.stringify({ v: 99, privateMode: false, voiceOn: false, cameraMode: 'follow' }),
        ),
      );
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(base + '/?cap&perf&place=train&day=3&q=2');
      await page.waitForFunction(() => globalThis.__done);
      await page.evaluate(() => {
        globalThis.__run = true;
        globalThis.document.body.classList.remove('cap');
        const g = globalThis.__game;
        g.player.root.position.set(-4.4, 0, 2.72);
        g.player.root.rotation.y = -1.72;
        g.walker.sync();
      });
      await page.waitForTimeout(1000);
      console.log(
        await page.evaluate(() => ({
          keys: Object.keys(globalThis.__game.followCamera),
          pos: globalThis.__game.player.root.position.toArray(),
          camera: globalThis.__game.place.camera.position.toArray(),
          name: globalThis.__game.place.name,
        })),
      );
      for (const [name, yaw] of [
        ['west', -1.72],
        ['east', 1.4],
        ['train', Math.PI],
        ['platform', 0],
      ]) {
        await page.evaluate((y) => globalThis.__game.followCamera.aim?.(y, 0), yaw);
        await page.waitForTimeout(350);
        await page.screenshot({ path: out + '/' + width + '-' + name + '.png' });
      }
      await page.evaluate(() => {
        const g = globalThis.__game;
        g.followCamera.aim(-Math.PI / 2, 0);
      });
      const before = await page.evaluate(() => globalThis.__game.player.root.position.toArray());
      await page.keyboard.down('w');
      await page.waitForTimeout(700);
      await page.keyboard.up('w');
      const after = await page.evaluate(() => globalThis.__game.player.root.position.toArray());
      console.log({ width, before, after });
      if (width > 700 && Math.hypot(after[0] - before[0], after[2] - before[2]) < 0.3)
        throw Error('platform keyboard walking blocked');
      await page.evaluate(async () => {
        const g = globalThis.__game;
        await g.walkTo(-2.25, 2.3);
        await g.walkTo(-2.25, 0.1);
        g.followCamera.aim(0, 0);
      });
      await page.waitForTimeout(350);
      await page.screenshot({ path: out + '/' + width + '-inside.png' });
      const inside = await page.evaluate(() => ({
        position: globalThis.__game.player.root.position.toArray(),
        camera: globalThis.__game.place.camera.position.toArray(),
      }));
      console.log(inside);
      if (Math.abs(inside.position[2]) > 1 || (width > 700 && inside.camera[1] > 1.3))
        throw Error('open doorway or car ceiling regression');
      if (errors.length) throw Error(errors.join('\n'));
      await page.close();
    }
  },
  { timeoutMs: 90000 },
);

console.log('PASS day3 platform, open doorway and phone overview');
