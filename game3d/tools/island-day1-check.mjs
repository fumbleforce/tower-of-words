// Day 1 landscape evidence in the normal desktop follow camera and phone overview.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';

const base = process.env.BASE || 'game3d';
const out = process.env.OUT || new URL('../shots/island-day1/', import.meta.url).pathname;
const places = process.argv.slice(2).length ? process.argv.slice(2) : ['forecourt', 'plaza', 'dorm_court', 'shotengai'];
fs.mkdirSync(out, { recursive: true });
const errors = [], rows = [];
await withBrowserJob('island-day1', async browser => {
  for (const width of [1366, 390]) {
    const phone = width < 600;
    const context = await browser.newContext({ viewport: { width, height: phone ? 844 : 860 }, isMobile: phone, hasTouch: phone });
    let closing = false;
    await context.route('**/*', scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: e => errors.push(String(e)) }));
    await context.addInitScript(mode => globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ privateMode: false, voiceOn: false, cameraMode: mode })), phone ? 'overview' : 'follow');
    try {
      for (const place of places) {
        const page = await context.newPage();
        page.on('pageerror', e => errors.push(`${place}: ${e.message}`));
        await waitForGame(page, 120000, () => page.goto(`http://127.0.0.1:8771/${base}/index.html?day=2&place=${place}&q=${phone ? 0 : 2}`), 'play');
        await page.waitForFunction(() => globalThis.__done && !globalThis.__game.busy);
        await page.waitForTimeout(1200);
        for (const period of ['morning', 'evening']) {
          await page.evaluate(to => globalThis.__game.hooks.period({ to }), period);
          for (const [view, yaw] of phone ? [['overview', 0]] : [['north', Math.PI], ['east', Math.PI / 2], ['south', 0], ['west', -Math.PI / 2]]) {
            if (!phone) await page.evaluate(yaw => globalThis.__game.followCamera.aim(yaw, -0.12), yaw);
            await page.waitForTimeout(450);
            const file = `${place}-${period}-${phone ? 'phone' : view}.png`;
            await page.screenshot({ path: `${out}/${file}` });
            rows.push(await page.evaluate(({ file, place, period, view, width }) => {
              const g = globalThis.__game, r = g.renderer.info;
              assertPublic();
              function assertPublic() { if (globalThis.__settings.privateMode) throw Error('private mode enabled'); }
              return { file, place, period, view, width, position: g.player.root.position.toArray(), calls: r.render.calls, triangles: r.render.triangles, far: g.place.farView?.stats };
            }, { file, place, period, view, width }));
          }
        }
        await page.close();
      }
    } finally { closing = true; await context.close(); }
  }
}, { timeoutMs: 300000, gpuWaitMs: 900000 });
fs.writeFileSync(`${out}/report.json`, JSON.stringify({ rows, errors }, null, 2));
assert.deepEqual(errors, []);
console.log(`PASS ${rows.length} landscape views: ${out}`);
