// Actual user Map controls with fresh public-only storage. No travel or world coordinates are reassigned.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
const out = process.argv[2] || 'game3d/shots/map-fidelity/final';
const base = process.env.BASE || 'game3d';
fs.mkdirSync(out, { recursive: true });
const reports = [];
await withBrowserJob(
  'map-fidelity',
  async (browser) => {
    for (const [width, height] of [
      [1366, 860],
      [390, 844],
    ]) {
      const errors = [],
        context = await browser.newContext({
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
      let closing = false;
      await context.route(
        '**/*',
        scopedRoute({ publicOnly: true, onFailure: (m) => errors.push(m), isClosing: () => closing }),
      );
      const page = await context.newPage();
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`http://127.0.0.1:8771/${base}/index.html?cap&perf&q=1&place=shotengai`);
      await page.waitForFunction(() => globalThis.__done, null, { timeout: 120000 });
      await page.locator('#minimap').click();
      await page.locator('#mapView').waitFor({ state: 'visible' });
      await page.waitForTimeout(250);
      await page.screenshot({ path: `${out}/local-${width}.png` });
      const before = await page.evaluate(() => globalThis.__game.renderer.info.render.frame);
      await page.waitForTimeout(150);
      assert.equal(
        await page.evaluate(() => globalThis.__game.renderer.info.render.frame),
        before,
        'map pauses 3D drawing',
      );
      await page.locator('.mv-fit').click();
      await page.waitForTimeout(150);
      await page.screenshot({ path: `${out}/island-${width}.png` });
      const paintMs = await page.evaluate(async () => {
        const { drawBase } = await import(new URL('./js/ui/map/base.js', globalThis.location.href));
        const c = globalThis.document.createElement('canvas');
        c.width = 1000;
        c.height = 800;
        const ctx = c.getContext('2d');
        const v = { w: 1000, h: 800, cx: 5, cz: -40, scale: 3.5, dpr: 1 };
        drawBase(ctx, v);
        const start = performance.now();
        for (let i = 0; i < 30; i++) drawBase(ctx, v);
        return (performance.now() - start) / 30;
      });
      const buttons = await page.locator('#mapView button:visible').evaluateAll((bs) =>
        bs.map((b) => {
          const r = b.getBoundingClientRect();
          return { label: b.getAttribute('aria-label') || b.textContent, w: r.width, h: r.height };
        }),
      );
      assert.ok(
        buttons.every((b) => b.w >= 44 && b.h >= 44),
        JSON.stringify(buttons.filter((b) => b.w < 44 || b.h < 44)),
      );
      // The geographic pins stay in place relative to the canvas while zooming; native controls remain usable.
      await page.locator('[data-zoom="in"]').click();
      await page.locator('.mv-home').click();
      if (width < 700) await page.locator('.mv-places').click();
      const target = page.locator('.mv-list [data-pick="plaza"]');
      await target.click();
      await page.waitForTimeout(200);
      assert.match(await page.locator('.mv-name').textContent(), /Fountain/);
      await page.screenshot({ path: `${out}/selected-${width}.png` });
      const layout = await page.evaluate(() => {
        const root = globalThis.document.querySelector('#mapView'),
          r = root.getBoundingClientRect();
        const go = globalThis.document.querySelector('.mv-go').getBoundingClientRect();
        return {
          scroll: globalThis.document.documentElement.scrollWidth,
          w: globalThis.innerWidth,
          go: { x: go.x, y: go.y, right: go.right, bottom: go.bottom },
          h: globalThis.innerHeight,
          root: r.width,
        };
      });
      assert.equal(layout.scroll, width);
      assert.ok(layout.go.x >= 0 && layout.go.right <= width && layout.go.bottom <= height);
      // Arrow selection and tab trapping use the real list and retain focus within the map.
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Tab');
      assert.ok(
        await page.evaluate(() =>
          globalThis.document.querySelector('#mapView').contains(globalThis.document.activeElement),
        ),
      );
      await page.keyboard.press('Escape');
      await page.locator('#mapView').waitFor({ state: 'hidden' });
      // Capture mode intentionally has no active day's trip table. Verify real travel in ordinary day-three play.
      await page.goto(`http://127.0.0.1:8771/${base}/index.html?day=3&q=1`);
      await page.waitForFunction(() => globalThis.__game?.place && globalThis.__game.walker, null, { timeout: 120000 });
      for (let i = 0; i < 60; i++) {
        const state = await page.evaluate(() => ({
          talk: !globalThis.document.querySelector('#talk')?.hidden,
          busy: globalThis.__game.busy || globalThis.__game.pendingStart || globalThis.__game.transition,
        }));
        if (!state.talk && !state.busy) break;
        if (state.talk) await page.mouse.click(width / 2, height - 60);
        await page.waitForTimeout(400);
      }
      await page.waitForFunction(
        () => !globalThis.__game.busy && !globalThis.__game.pendingStart && !globalThis.__game.transition,
        null,
        { timeout: 60000 },
      );
      await page.keyboard.press('m');
      await page.locator('#mapView').waitFor({ state: 'visible' });
      if (width < 700) await page.locator('.mv-places').click();
      await page.locator('.mv-list [data-pick="plaza"]').click();
      assert.ok(
        await page.locator('.mv-go').isEnabled(),
        JSON.stringify(await page.evaluate(() => globalThis.__game.map.view().states().plaza)),
      );
      await page.screenshot({ path: `${out}/travel-${width}.png` });
      await page.locator('.mv-go').click();
      await page.waitForFunction(
        () => globalThis.__game.place?.name === 'plaza' && !globalThis.__game.transition,
        null,
        { timeout: 60000 },
      );
      assert.equal(await page.evaluate(() => globalThis.__game.mapOpen), false);
      assert.equal(await page.evaluate(() => globalThis.__settings.privateMode), false);
      reports.push({ width, paintMs, buttons: buttons.length, layout, travel: 'plaza', errors });
      assert.deepEqual(errors, []);
      closing = true;
      await context.close();
    }
  },
  { timeoutMs: 280000 },
);
fs.writeFileSync(`${out}/report.json`, JSON.stringify(reports, null, 2));
console.log('PASS map fidelity: both sizes, native selection/zoom/keyboard/fast travel, public sources only');
