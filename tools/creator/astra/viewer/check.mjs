// Live comparison control and framing checks; one bounded browser job.
// BASE=.claude/worktrees/codex-astra-viewer node tools/creator/astra/viewer/check.mjs
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../../lib/browser-job.mjs';

const out = process.argv[2] || 'game3d/shots/astra-comparison';
fs.mkdirSync(out, { recursive: true });
const base = (process.env.BASE || '').replace(/^\/+|\/+$/g, '');
const url = `http://127.0.0.1:8771/${base ? base + '/' : ''}tools/creator/astra/viewer/index.html${process.env.ATTEMPT ? '?attempt=' + encodeURIComponent(process.env.ATTEMPT) : ''}`;
const errors = [], results = [];
await withBrowserJob('astra-comparison', async browser => {
  for (const [width, height] of [[2560, 1440], [390, 844]]) {
    const tag = `${width}x${height}`;
    const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 700, hasTouch: width < 700 });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(`${tag}: ${error.message}`));
    page.on('response', response => { if (response.status() >= 400) errors.push(`${tag}: ${response.status()} ${response.url()}`); });
    await page.goto(url);
    await page.waitForFunction(() => globalThis.__astraComparison?.ready || globalThis.__astraComparison?.error);
    assert.equal(await page.evaluate(() => globalThis.__astraComparison.error), null, `${tag}: model load`);
    assert(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth), `${tag}: page overflows horizontally`);
    for (const body of ['mio', 'eric']) {
      await page.selectOption('#body', body);
      await page.waitForFunction(body => globalThis.__astraComparison.ready && globalThis.__astraComparison.body === body, body);
      await page.evaluate(() => { globalThis.__astraComparison.pose('neutral', .8); globalThis.__astraComparison.camera(0); });
      await page.screenshot({ path: path.join(out, `${body}-idle-${tag}.png`), fullPage: true });
      await page.evaluate(() => { globalThis.__astraComparison.pose('walk', .3); globalThis.__astraComparison.camera(.7); });
      await page.screenshot({ path: path.join(out, `${body}-walk-${tag}.png`), fullPage: true });
      if (width > 700) for (const time of [0, .6, .9]) {
        await page.evaluate(time => globalThis.__astraComparison.pose('walk', time), time);
        await page.locator('.views').screenshot({ path: path.join(out, `${body}-walk-${time}-${tag}.png`) });
      }
      if (width > 700) for (const time of [.3, .9]) {
        await page.evaluate(time => { globalThis.__astraComparison.pose('walk', time); globalThis.__astraComparison.camera(Math.PI); }, time);
        await page.locator('.views').screenshot({ path: path.join(out, `${body}-walk-back-${time}-${tag}.png`) });
      }
      const times = await page.evaluate(() => globalThis.__astraComparison.characters.map(character => character.cur.time));
      assert(Math.abs(times[0] - times[1]) < .001, `${body}/${tag}: different animation phase`);
      await page.selectOption('#clothes', 'none'); await page.uncheck('#hair');
      const exposed = await page.evaluate(() => {
        const visible = [];
        globalThis.__astraComparison.characters[1].root.traverse(mesh => {
          if (mesh.isMesh && mesh.visible && /-(hoodie|hood|zip|trousers|pockets|sneakers)(?:[-_]|$)/.test(mesh.name)) visible.push(mesh.name);
        });
        return visible;
      });
      assert.deepEqual(exposed, [], `${body}/${tag}: clothes stay visible in bare view`);
      await page.evaluate(() => { globalThis.__astraComparison.pose('neutral', .8); globalThis.__astraComparison.camera(0); });
      await page.screenshot({ path: path.join(out, `${body}-bare-${tag}.png`), fullPage: true });
      await page.selectOption('#clothes', 'hoodie'); await page.check('#hair');
      for (const focus of ['face', 'neck', 'hood', 'cuffs', 'feet']) {
        await page.selectOption('#focus', focus);
        await page.locator('.views').screenshot({ path: path.join(out, `${body}-${focus}-${tag}.png`) });
      }
      await page.selectOption('#focus', 'whole'); await page.check('#hair');
      await page.selectOption('#reference', 'original');
      await page.waitForFunction(() => globalThis.__astraComparison.ready);
      await page.evaluate(() => { globalThis.__astraComparison.pose('neutral', .8); globalThis.__astraComparison.camera(0); });
      await page.locator('.views').screenshot({ path: path.join(out, `${body}-original-${tag}.png`) });
      await page.selectOption('#reference', 'claude');
      await page.waitForFunction(() => globalThis.__astraComparison.ready);
      results.push({ body, size: tag, controls: 'PASS' });
    }
    await context.close();
  }
}, { timeoutMs: 285000, gpuWaitMs: 1000, loadWaitMs: 1000 });
fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ results, errors }, null, 2) + '\n');
assert.deepEqual(errors, [], 'runtime and asset errors');
console.log('PASS Astra comparison: both bodies, both sizes, layer controls, original, close-ups, matched animation phase');
