// Matched normal-play-camera material captures. Fresh storage and public sources only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { blockedSource } from '../../tools/bible/check-scope.mjs';
const out = process.argv[2];
assert.ok(out, 'provide an evidence directory');
fs.mkdirSync(out, { recursive: true });
const base = process.env.BASE || 'game3d';
const defaults = [
  ['park', 'east_lane', 0, 0],
  ['dorm', 'dorm_court', 0, 0],
  ['coast', 'east_coast', 0, 0],
  ['plaza', 'plaza', 0, 0],
];
const cases = process.env.CASES
  ? process.env.CASES.split(',').map((s) => {
      const [name, place, x, z] = s.split(':');
      return [name, place, +x, +z];
    })
  : defaults;
const errors = [],
  reports = [];
await withBrowserJob(
  'island-materials',
  async (browser) => {
    for (const [width, height] of [
      [1366, 860],
      [390, 844],
    ]) {
      const context = await browser.newContext({
        viewport: { width, height },
        isMobile: width < 700,
        hasTouch: width < 700,
        ...(process.env.MOTION ? { recordVideo: { dir: out, size: { width, height } } } : {}),
      });
      await context.addInitScript(() =>
        globalThis.localStorage.setItem(
          'amakawa-settings',
          JSON.stringify({ v: 99, privateMode: false, voiceOn: false }),
        ),
      );
      await context.route('**/*', (route) => {
        if (blockedSource(route.request().url(), true)) {
          errors.push('protected source requested');
          return route.abort();
        }
        return route.continue();
      });
      for (const [name, place, x, z] of cases) {
        const page = await context.newPage();
        page.on('pageerror', (e) => errors.push(e.message));
        page.on('console', (m) => {
          if (m.type() === 'error' && !/404/.test(m.text())) errors.push(m.text());
        });
        await page.goto(`http://127.0.0.1:8771/${base}/index.html?cap&perf&q=1&place=${place}&mx=${x}&mz=${z}`);
        await page.waitForFunction(() => globalThis.__done, null, {
          timeout: 120000,
        });
        const position = await page.evaluate(() => {
          const g = globalThis.__game,
            p = g.player.root.position,
            nav = g.place.nav;
          if (!nav.free(p.x, p.z)) {
            if (!nav.grid) nav.build();
            const cell = nav.nearestFree(...nav.cellOf(p.x, p.z));
            if (!cell) throw Error('no valid capture position');
            const [x, z] = [nav.x0 + (cell[0] + 0.5) * nav.cell, nav.z0 + (cell[1] + 0.5) * nav.cell];
            p.set(x, p.y, z);
            g.place.cam.snap(p);
          }
          if (!nav.free(p.x, p.z)) throw Error('capture position is blocked');
          return { x: p.x, z: p.z };
        });
        await page.waitForTimeout(1500);
        const stats = await page.evaluate(() => {
          if (globalThis.__settings.privateMode) throw Error('private mode enabled');
          const g = globalThis.__game;
          return {
            geometries: g.renderer.info.memory.geometries,
            textures: g.renderer.info.memory.textures,
            perf: globalThis.__perfReport?.(),
          };
        });
        const file = `${out}/${name}-${width < 700 ? 'phone' : 'desk'}.png`;
        await page.screenshot({ path: file });
        reports.push({ name, width, height, position, ...stats });
        if (process.env.MOTION) {
          await page.evaluate(async () => {
            const c = globalThis.__game.place.cam,
              yaw = c.yaw;
            for (let i = 0; i < 120; i++) {
              c.yaw = yaw + Math.sin((i / 119) * Math.PI * 2) * 0.025;
              c.place();
              await new Promise(globalThis.requestAnimationFrame);
            }
            c.yaw = yaw;
            c.place();
          });
          const video = page.video();
          await page.close();
          await video.saveAs(`${out}/${name}-${width < 700 ? 'phone' : 'desk'}.webm`);
        }
        console.log(file);
        await page.close();
      }
      await context.close();
    }
  },
  { timeoutMs: 280000 },
);
fs.writeFileSync(`${out}/report.json`, JSON.stringify({ errors, reports }, null, 2));
assert.deepEqual(errors, []);
