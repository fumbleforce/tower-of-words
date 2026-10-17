// Actual title draw rates and CPU render cost, with live frame-limit changes and the Start transition.
// BASE=.claude/worktrees/<name>/game3d node game3d/tools/title-performance.mjs [phone]
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob, exitDeferred } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
const phone = process.argv.includes('phone');
const out = `/tmp/title-performance-${phone ? 'phone' : 'desktop'}-${Date.now()}`;
await withBrowserJob(
  'title-performance',
  async (browser) => {
    const context = await browser.newContext({
      serviceWorkers: 'block',
      viewport: phone ? { width: 390, height: 844 } : { width: 2327, height: 1196 },
      deviceScaleFactor: phone ? 3 : 1.1,
    });
    const page = await context.newPage();
    const scopeErrors = [];
    await context.route('**/*', scopedRoute({ publicOnly: true, onFailure: (e) => scopeErrors.push(String(e)) }));
    await page.addInitScript(() =>
      globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ privateMode: false })),
    );
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`http://127.0.0.1:8771/${process.env.BASE || 'game3d'}/index.html`);
    await page.waitForFunction(() => globalThis.__shellBooted && globalThis.__game?.view?.post);
    await page.waitForTimeout(3000);
    await page.evaluate(() => {
      const g = globalThis.__game,
        old = g.jump.update.bind(g.jump);
      globalThis.__jumpCalls = 0;
      g.jump.update = (...a) => {
        globalThis.__jumpCalls++;
        return old(...a);
      };
    });
    const results = [];
    for (const cap of ['auto', '60', '30', 'off']) {
      await page.evaluate(async (value) => {
        const settings = await import('./js/settings.js');
        settings.setSetting('frameCap', value);
        settings.setSetting('perfOverlay', true);
      }, cap);
      await page.waitForTimeout(1000);
      results.push(
        await page.evaluate(async (setting) => {
          const g = globalThis.__game,
            start = performance.now(),
            draws = g.view.draws;
          await new Promise((resolve) => setTimeout(resolve, 3000));
          return {
            setting,
            limit: g.view.activeCap(),
            fps: ((g.view.draws - draws) * 1000) / (performance.now() - start),
            gpu: g.renderer.userData,
            quality: g.view.quality,
            jumpCalls: globalThis.__jumpCalls,
          };
        }, cap),
      );
      const result = results.at(-1);
      // Auto: the screen's own rate on a desktop graphics card, 30 at the title where Auto saves power (#568)
      const saves = await page.evaluate(async () => (await import('./js/settings.js')).autoSavesPower());
      assert.equal(result.limit, cap === 'off' ? 0 : cap === 'auto' ? (saves ? 30 : 0) : +cap);
      assert.equal(result.jumpCalls, 0, 'title must not update player physics');
      await page.screenshot({
        path: `${out}-${cap}.png`,
        animations: 'disabled',
        timeout: 10000,
      });
    }
    await page.locator('#title .go').click();
    await page.waitForFunction(() => !globalThis.document.body.classList.contains('at-title'));
    await page.waitForTimeout(1500);
    assert.ok(await page.evaluate(() => globalThis.__jumpCalls > 0), 'Start restores player physics');
    await page.screenshot({
      path: `${out}-started.png`,
      animations: 'disabled',
      timeout: 10000,
    });
    for (const override of [15, 60, 0]) {
      await page.goto(`http://127.0.0.1:8771/${process.env.BASE || 'game3d'}/index.html?fps=${override}`);
      await page.waitForFunction(() => globalThis.__shellBooted && globalThis.__game?.view?.post);
      await page.evaluate(async () => (await import('./js/settings.js')).setSetting('frameCap', 'auto'));
      assert.equal(await page.evaluate(() => globalThis.__game.view.activeCap()), override);
    }
    assert.deepEqual(scopeErrors, []);
    assert.deepEqual(errors, []);
    fs.writeFileSync(`${out}.json`, JSON.stringify(results, null, 2));
    console.log(out, JSON.stringify(results, null, 2));
  },
  {
    gpuLock: `title-performance-${process.pid}`,
    gpuWaitMs: 300000,
    timeoutMs: 120000,
  },
).catch(exitDeferred);
