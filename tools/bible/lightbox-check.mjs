// Exercise the real Review renderer with public, in-memory SVG fixtures. Never sends feedback.
// BIBLE_BASE=http://127.0.0.1:8771/.claude/worktrees/<name>/ GL=soft node tools/bible/lightbox-check.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob, gpuWaitOptions } from '../lib/browser-job.mjs';
import { blockedSource, scopedRoute } from './check-scope.mjs';

const base = new URL(process.env.BIBLE_BASE || 'http://127.0.0.1:8771/');
const output = process.env.LIGHTBOX_SHOTS || '/tmp/codex-bible-lightbox';
fs.mkdirSync(output, { recursive: true });
const fixture = {
  id: 'lightbox-fixture', title: 'Image layout check', status: 'open', by: 'QA',
  options: [
    { id: 'wide', label: 'Wide image', image: 'lightbox-fixture/wide.svg', note: 'Source checksum: ' + '0123456789abcdef'.repeat(4) },
    { id: 'tall', label: 'Portrait image', image: 'lightbox-fixture/tall.svg' },
    { id: 'caption', label: 'Long filename', image: 'lightbox-fixture/wide.svg',
      images: ['lightbox-fixture/abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz.svg'] },
  ],
};
const report = { sizes: [], errors: [], blocked: [], writes: [] };
try {
  await withBrowserJob('bible-lightbox-responsive', async browser => {
    for (const [width, height, isMobile] of [[390, 844, true], [1366, 860, false]]) {
      const context = await browser.newContext({ viewport: { width, height }, isMobile, hasTouch: isMobile, serviceWorkers: 'block' });
      let closing = false;
      const scoped = scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: message => report.errors.push(message) });
      await context.addInitScript(() => { window.BIBLE_REMOTE = true; });
      await context.route('**/*', async route => {
        const request = route.request(), target = new URL(request.url());
        if (blockedSource(target.href, true)) { report.blocked.push(target.href); return route.abort(); }
        if (!['GET', 'HEAD'].includes(request.method())) { report.writes.push(target.href); return route.abort(); }
        if (target.hostname === 'fonts.googleapis.com' || target.hostname === 'fonts.gstatic.com') return route.fulfill({ body: '', contentType: 'text/css' });
        if (target.origin !== base.origin || !target.pathname.startsWith(base.pathname)) { report.blocked.push(target.href); return route.abort(); }
        const path = target.pathname.slice(base.pathname.length);
        const json = value => route.fulfill({ json: value });
        if (path === 'bible/data.json') return json({ snapshot: {} });
        if (path === 'reviews/') return route.fulfill({ body: '<a href="lightbox-fixture/">fixture</a>', contentType: 'text/html' });
        if (path === 'reviews/lightbox-fixture/review.json') return json(fixture);
        if (path === 'reviews/lightbox-fixture/feedback.json') return json(null);
        if (path === 'showcase/') return route.fulfill({ body: '', contentType: 'text/html' });
        if (path === 'bible/showcase-dates.json') return json({});
        if (path.startsWith('lightbox-fixture/')) {
          const [w, h] = path.endsWith('/tall.svg') ? [630, 1000] : [2100, 900];
          return route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#1e6470"/><rect x="5" y="5" width="${w - 10}" height="${h - 10}" fill="none" stroke="white" stroke-width="10"/></svg>` });
        }
        return scoped(route);
      });
      const page = await context.newPage();
      page.on('pageerror', error => report.errors.push(error.message));
      const result = { width, height, images: [] };
      report.sizes.push(result);
      try {
        await page.goto(new URL('bible/#review/lightbox-fixture', base).href);
        await page.locator('[data-review="lightbox-fixture"]').waitFor();
        result.before = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
        assert.equal(result.before.innerWidth, width, 'option notes must preserve the requested viewport');
        assert.ok(result.before.scrollWidth <= width, 'option notes must wrap within the requested viewport');
        const measure = () => page.evaluate(() => ({
          innerWidth, scrollWidth: document.documentElement.scrollWidth,
          boxes: [...document.querySelectorAll('#lb, #lb img, #lb .c, #lb button')].map(el => {
            const r = el.getBoundingClientRect(), css = getComputedStyle(el);
            return { element: el.tagName + '.' + el.className, x: r.x, y: r.y, width: r.width, height: r.height, minWidth: css.minWidth, maxWidth: css.maxWidth, overflowWrap: css.overflowWrap };
          }),
        }));
        const check = async name => {
          await page.locator('#lb img').evaluate(el => el.decode());
          const dimensions = await measure();
          result.images.push({ name, ...dimensions });
          await page.screenshot({ path: `${output}/${width}-${name}.png` });
          assert.equal(dimensions.innerWidth, width, 'layout viewport must retain the requested width');
          assert.ok(dimensions.scrollWidth <= width, 'document must fit the requested viewport');
          for (const box of dimensions.boxes) {
            assert.ok(box.x >= -0.5 && box.x + box.width <= width + 0.5, `${box.element} must fit horizontally`);
            assert.ok(box.y >= -0.5 && box.y + box.height <= height + 0.5, `${box.element} must fit vertically`);
          }
        };
        await page.locator('[data-opt="wide"] img').click();
        await check('wide');
        await page.locator('#lb .n').click();
        await check('tall');
        assert.match(await page.locator('#lb img').getAttribute('src'), /tall\.svg$/);
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowRight');
        await check('long-caption');
        await page.locator('#lb .p').click();
        assert.equal(await page.locator('#lb .c').textContent(), 'Long filename');
        await page.locator('#lb .x').click();
        assert.equal(await page.locator('#lb').isVisible(), false);
        await page.locator('[data-opt="tall"] img').click();
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#lb').isVisible(), false);
        assert.deepEqual(await page.locator('[data-act="pick"]').evaluateAll(els => els.map(el => el.getAttribute('aria-pressed'))), ['false', 'false', 'false']);
      } finally { closing = true; await context.close(); }
    }
  }, gpuWaitOptions(600, 90000));
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.blocked, []);
  assert.deepEqual(report.writes, []);
  report.pass = true;
} catch (error) { report.pass = false; report.failure = error.stack; process.exitCode = 1; }
fs.writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ pass: report.pass, sizes: report.sizes.map(({ width, height }) => [width, height]), failure: report.failure, output }));
