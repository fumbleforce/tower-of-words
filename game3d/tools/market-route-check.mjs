// Walk the direct plaza-market-beach route in the running game at both supported cameras.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { blockedSource } from '../../tools/bible/check-scope.mjs';
const base = process.env.BASE || 'game3d';
const out = process.argv[2] || '/tmp/market-route-shots';
fs.mkdirSync(out, { recursive: true });
const reports = [];
await withBrowserJob(
  'market-route',
  async (browser) => {
    for (const [width, height] of [
      [1366, 860],
      [390, 844],
    ]) {
      const context = await browser.newContext({
        viewport: { width, height },
        isMobile: width < 700,
        hasTouch: width < 700,
      });
      await context.addInitScript(() =>
        globalThis.localStorage.setItem(
          'amakawa-settings',
          JSON.stringify({ v: 99, privateMode: false, voiceOn: false, textSpeed: 'instant' }),
        ),
      );
      const page = await context.newPage(),
        errors = [];
      await page.route('**/*', (route) =>
        blockedSource(route.request().url(), true) ? route.abort() : route.continue(),
      );
      await page.route('**/api/plugins', (route) => route.fulfill({ json: [] }));
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`http://127.0.0.1:8771/${base}/index.html?cap&perf&q=1&place=plaza`);
      await page.waitForFunction(() => globalThis.__done, null, { timeout: 120000 });
      await page.evaluate(() => {
        globalThis.__run = true;
        globalThis.document.body.classList.remove('cap');
      });
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${out}/${width}-plaza-default.png` });
      if (width < 700) {
        const landmark = await page.evaluate(async () => {
          const { F } = await import('./js/scenes/plaza/plan.js');
          const { Vector3 } = await import('three');
          return new Vector3(F[0], 1.4, F[1]).project(globalThis.__game.place.camera).toArray();
        });
        assert.ok(Math.abs(landmark[0]) < 0.98 && Math.abs(landmark[1]) < 0.95, 'fountain visible on phone arrival');
      }
      const data = await page.evaluate(async () => {
        const { MARKET_ROUTE: M, splitMarketSpan } = await import('./js/scenes/market-route.js');
        const L = await import('./js/scenes/island-layout.js');
        const { mapFootprints } = await import('./js/ui/map/landmarks.js');
        const { BEACH_ENTRY, SOUTH_COAST } = await import('./js/scenes/island-south.js');
        const g = globalThis.__game,
          P = g.place;
        const rows = mapFootprints(
          L.BUILDINGS.filter((b) => ['shops_north', 'shops_south', 'arcade'].includes(b.id)),
          (b) => b.rect,
        );
        if (rows.some((b) => b.rect[0] < M.x1 - 0.01 && b.rect[2] > M.x0 + 0.01)) throw Error('Map bridges market gap');
        if (
          SOUTH_COAST.some((c) =>
            c.line.some(
              ([x, z], i, a) =>
                i &&
                z === M.shoreZ &&
                a[i - 1][1] === z &&
                Math.min(x, a[i - 1][0]) < M.x &&
                Math.max(x, a[i - 1][0]) > M.x,
            ),
          )
        )
          throw Error('Wall bridges beach entry');
        const start = L.toLocal('plaza', M.x, M.northZ),
          seam = L.toLocal('plaza', M.x, M.seamZ);
        if (!P.nav.clear(start, seam)) throw Error('Plaza south path blocked');
        g.player.root.position.set(start[0], 0, start[1]);
        g.walker.sync();
        g.saveEnabled = true;
        P.cam.snap(g.player.root.position);
        globalThis.__run = true;
        globalThis.document.body.classList.remove('cap');
        return { rows: rows.map((b) => b.rect), split: splitMarketSpan(-3, 64.5), beach: BEACH_ENTRY };
      });
      if (width > 700) {
        await page.evaluate(async () => {
          (await import('./js/settings.js')).setSetting('cameraMode', 'follow');
        });
        await page.waitForFunction(() => globalThis.__game.followCamera.active, null, { timeout: 8000 });
      }
      const shot = async (name) => {
        await page.waitForTimeout(500);
        if (width > 700) {
          await page.waitForFunction(() => globalThis.__game.followCamera.active, null, { timeout: 8000 });
          await page.evaluate(() =>
            globalThis.__game.followCamera.aim(globalThis.__game.place.name === 'plaza' ? 0 : -Math.PI / 2, 0.05),
          );
        }
        await page.screenshot({ path: `${out}/${width}-${name}.png` });
      };
      await shot('plaza-south');
      // Normal walker crosses the automatic region seam. No trip invocation or position skip.
      await page.evaluate(async () => {
        const g = globalThis.__game;
        const { MARKET_ROUTE: M } = await import('./js/scenes/market-route.js');
        const L = await import('./js/scenes/island-layout.js');
        g.walkTo(...L.toLocal('plaza', M.x, M.seamZ - 0.2));
      });
      await page.waitForFunction(() => globalThis.__game.place.name === 'shotengai' && !globalThis.__game.busy, null, {
        timeout: 60000,
      });
      await shot('market-entry');
      for (const [name, z] of [
        ['crossing', 20.15],
        ['promenade', 30],
        ['stairs', 34],
        ['sand', 41],
      ]) {
        const result = await page.evaluate(async (z) => {
          const g = globalThis.__game;
          const L = await import('./js/scenes/island-layout.js');
          const [x, zz] = L.toLocal('shotengai', 37.29, z);
          const from = g.player.root.position;
          if (!g.place.nav.clear([from.x, from.z], [x, zz])) throw Error('Direct route obstructed to ' + z);
          await g.walkTo(x, zz);
          return { wanted: [x, zz], actual: g.player.root.position.toArray(), free: g.place.nav.free(x, zz) };
        }, z);
        assert.ok(
          Math.hypot(result.wanted[0] - result.actual[0], result.wanted[1] - result.actual[2]) < 0.4,
          `${name} reached`,
        );
        data[name] = result;
        await shot(name);
        if (name === 'sand') {
          await page.keyboard.down('Space');
          await page.waitForTimeout(150);
          await page.waitForFunction(() => globalThis.__game.jump.air, null, { timeout: 5000 });
          await page.keyboard.up('Space');
          await page.waitForFunction(() => !globalThis.__game.jump.air, null, { timeout: 5000 });
          data.jump = await page.evaluate(() => ({
            place: globalThis.__game.place.name,
            y: globalThis.__game.player.root.position.y,
          }));
          assert.equal(data.jump.place, 'shotengai');
          assert.ok(Math.abs(data.jump.y + 0.15) < 0.01, 'jump lands on the beach height');
        }
        if (name === 'crossing' && width > 700) {
          await page.evaluate(() => globalThis.__game.followCamera.aim(Math.PI / 2, 0.05));
          await page.waitForTimeout(700);
          await page.screenshot({ path: `${out}/${width}-crossing-north.png` });
        }
      }
      await page.evaluate(async () => {
        const g = globalThis.__game;
        const L = await import('./js/scenes/island-layout.js');
        g.walkTo(...L.toLocal('shotengai', 37.29, 12.8));
      });
      await page.waitForFunction(() => globalThis.__game.place.name === 'plaza' && !globalThis.__game.busy, null, {
        timeout: 60000,
      });
      await shot('plaza-return');
      data.errors = errors;
      data.perf = await page.evaluate(() => globalThis.__perfReport?.());
      assert.deepEqual(errors, []);
      reports.push({ width, ...data });
      await context.close();
    }
  },
  { timeoutMs: 290000, gpuWaitMs: 900000 },
);
fs.writeFileSync(`${out}/report.json`, JSON.stringify(reports, null, 2));
console.log('PASS direct route and both seamless returns at desktop follow and phone overview', out);
