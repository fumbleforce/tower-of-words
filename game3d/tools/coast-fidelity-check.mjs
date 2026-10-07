// Matched coast finish captures and real walking, using isolated public-only storage.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { blockedSource } from '../../tools/bible/check-scope.mjs';
const out = process.argv[2];
assert.ok(out, 'provide an evidence directory');
fs.mkdirSync(out, { recursive: true });
const base = process.env.BASE || 'game3d';
const defaults = [
  ['terrace', 'east_coast', 0, 0],
  ['promenade', 'east_coast', 2, -12],
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
  'coast-fidelity',
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
        await page.evaluate(
          (period) => globalThis.__game.hooks.period({ to: period }),
          process.env.PERIOD || 'afternoon',
        );
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
        if (process.env.WALK && name === 'promenade') {
          await page.evaluate(() => { globalThis.__run = true; });
          const target = await page.evaluate(() => {
            const g = globalThis.__game,
              p = g.player.root.position,
              end = p.clone();
            end.z -= 3;
            if (!g.place.nav.free(end.x, end.z)) throw Error('walk target blocked');
            const screen = g.player.root.parent.localToWorld(end.clone()).project(g.place.camera);
            return {
              x: end.x,
              z: end.z,
              start: [p.x, p.z],
              px: ((screen.x + 1) * globalThis.innerWidth) / 2,
              py: ((1 - screen.y) * globalThis.innerHeight) / 2,
            };
          });
          await page.mouse.click(target.px, target.py);
          await page.waitForFunction(
            (t) => {
              const g = globalThis.__game,
                p = g.player.root.position;
              return Math.hypot(p.x - t.x, p.z - t.z) < 0.24 && !g.walker.moving;
            },
            target,
            { timeout: 15000 },
          );
          const final = await page.evaluate(() => {
            const g = globalThis.__game,
              p = g.player.root.position;
            return { x: p.x, z: p.z, free: g.place.nav.free(p.x, p.z) };
          });
          assert.ok(final.free && Math.hypot(final.x - target.start[0], final.z - target.start[1]) > 2.5);
          reports.at(-1).walk = { target, final };
          await page.screenshot({
            path: `${out}/walk-${width < 700 ? 'phone' : 'desk'}.png`,
          });
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
