// Matching public southeast views in the native phone and desktop cameras.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
import { sampleFrames } from './perf/place-measure.mjs';

const base = process.env.BASE || 'game3d';
const before = process.env.BEFORE === '1';
const out = process.env.OUT || new URL('../shots/island-southeast/after/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const errors = [],
  rows = [];
const views = [
  ['approach', [93.5, 10.2], Math.PI / 2],
  ['garden', [89.45, 16], 0],
  ['shore', [102, 24], Math.PI / 2],
  ['rest-court', [108, 26.2], 0],
  ['building-join', [118, 16.5], Math.PI],
  ['terrace', [126.5, 11.2], 0],
  ['horizon', [109, 27.5], -0.4],
];
await withBrowserJob(
  'southeast-garden',
  async (browser) => {
    for (const width of [1366, 390]) {
      const phone = width < 600;
      const context = await browser.newContext({
        viewport: { width, height: phone ? 844 : 860 },
        isMobile: phone,
        hasTouch: phone,
      });
      let closing = false;
      await context.route(
        '**/*',
        scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: (e) => errors.push(String(e)) }),
      );
      await context.addInitScript(
        (mode) =>
          globalThis.localStorage.setItem(
            'amakawa-settings',
            JSON.stringify({ privateMode: false, voiceOn: false, cameraMode: mode }),
          ),
        phone ? 'overview' : 'follow',
      );
      const page = await context.newPage();
      page.on('pageerror', (e) => errors.push(e.message));
      try {
        await waitForGame(
          page,
          120000,
          () => page.goto(`http://127.0.0.1:8771/${base}/index.html?day=3&place=east_coast&q=${phone ? 0 : 2}`),
          'play',
        );
        await page.waitForFunction(() => globalThis.__done && !globalThis.__game.busy);
        for (const period of ['morning', 'evening']) {
          await page.evaluate((to) => globalThis.__game.hooks.period({ to }), period);
          for (const [name, point, yaw] of views) {
            await page.evaluate(
              ({ point, yaw, phone }) => {
                const g = globalThis.__game;
                g.player.root.position.set(point[0] - 126.5, 0, point[1] - 10.5);
                g.walker.sync();
                g.place.cam.snap(g.player.root.position);
                if (!phone) g.followCamera.aim(yaw, -0.12);
              },
              { point, yaw, phone },
            );
            await page.waitForTimeout(650);
            const frame = await page.evaluate(sampleFrames, 4);
            const camera = await page.evaluate(() => ({
              blocked: globalThis.__game.followCamera?.blocked,
              distance: globalThis.__game.followCamera?.distance,
              player: globalThis.__game.player.root.position.toArray(),
              navFree: globalThis.__game.place.nav.free(
                globalThis.__game.player.root.position.x,
                globalThis.__game.player.root.position.z,
              ),
            }));
            const file = `${width}-${period}-${name}.png`;
            await page.screenshot({ path: `${out}/${file}` });
            rows.push({ file, point, frame, camera });
          }
        }
        assert.equal(await page.evaluate(() => globalThis.__settings.privateMode), false);
      } finally {
        closing = true;
        await context.close();
      }
    }
  },
  { timeoutMs: 300000, gpuWaitMs: 900000 },
);
fs.writeFileSync(`${out}/report.json`, JSON.stringify({ before, rows, errors }, null, 2));
assert.deepEqual(errors, []);
console.log(`PASS ${rows.length} southeast views: ${out}`);
