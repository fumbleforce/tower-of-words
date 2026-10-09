// Public-only interaction and native-size captures. Never sends feedback.
// BIBLE_BASE=http://127.0.0.1:8794/ node tools/bible/showcase-check.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../lib/browser-job.mjs';
import { scopedRoute } from './check-scope.mjs';

const base = process.env.BIBLE_BASE || 'http://127.0.0.1:8771/';
const output = process.env.SHOWCASE_SHOTS || '/tmp/codex-showcase-browse';
fs.mkdirSync(output, { recursive: true });
const expected = fs.readdirSync(new URL('../../showcase/', import.meta.url)).flatMap(id => {
  const file = new URL(`../../showcase/${id}/entry.json`, import.meta.url);
  return fs.existsSync(file) ? [JSON.parse(fs.readFileSync(file))] : [];
});
const withPictures = expected.filter(entry => (entry.images || []).length || (entry.sections || []).some(sec => (sec.images || []).length)).length;
const report = [];
await withBrowserJob('showcase-browse', async browser => {
  for (const [width, height] of [[2560, 1440], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, serviceWorkers: 'block' });
    const errors = [];
    let closing = false;
    await context.route('**/*', scopedRoute({ publicOnly: true, cache: new Map(), isClosing: () => closing,
      onFailure: message => errors.push(message) }));
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(base + 'bible/#showcase');
      await page.waitForFunction(() => document.body.dataset.ready === '1');
      const entries = page.locator('.scentry');
      const count = await entries.count();
      const ids = await entries.evaluateAll(els => els.map(el => el.dataset.showcase));
      assert.equal(count, expected.length);
      assert.ok(ids.indexOf('pool-swimwear-20261007') < ids.indexOf('bakery-interior-1'));
      assert.equal(await page.locator('.scdetails:visible').count(), 0);
      const previews = await page.locator('.scpreview:visible').count();
      assert.equal(previews, withPictures);
      assert.equal(await page.locator('.scimg:visible').count(), 0);
      await entries.first().locator('.scpreview img').evaluate(img => img.decode());
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow');
      await page.screenshot({ path: `${output}/${width}-collapsed.png` });
      const entry = page.locator('[data-showcase="pool-swimwear-20261007"]');
      const toggle = entry.locator('.sctoggle');
      await entry.locator('.scpreview').focus();
      await page.keyboard.press('Enter');
      assert.equal(await toggle.evaluate(button => button === document.activeElement), true);
      await page.keyboard.press('Space');
      await toggle.focus();
      await page.keyboard.press('Enter');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
      assert.equal(await entry.locator('.scdetails').isVisible(), true);
      assert.equal(await entry.locator('.scsec[open]').count(), 0);
      await page.screenshot({ path: `${output}/${width}-sections.png` });
      const section = entry.locator('.scsec').first();
      await section.locator('summary').focus();
      await page.keyboard.press('Space');
      assert.equal(await section.getAttribute('open'), '');
      const comment = section.locator('[data-act="comment"]').first();
      await comment.fill('Draft retained after collapsing');
      await section.locator('[data-act="flag"]').first().click();
      await toggle.focus();
      await page.keyboard.press('Space');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
      await page.keyboard.press('Enter');
      assert.equal(await comment.inputValue(), 'Draft retained after collapsing');
      assert.equal(await section.locator('[data-act="flag"]').first().getAttribute('aria-pressed'), 'true');
      await section.scrollIntoViewIfNeeded();
      await section.locator('.scimg img').first().evaluate(img => img.decode());
      await page.screenshot({ path: `${output}/${width}-expanded.png` });
      await section.locator('.scimg img').first().click();
      assert.equal(await page.locator('#lb').isVisible(), true);
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Escape');
      await page.goto(base + 'bible/#showcase/pool-swimwear-20261007');
      await page.waitForFunction(() => document.querySelectorAll('.scentry').length === 1 && document.querySelector('.sctoggle')?.getAttribute('aria-expanded') === 'true');
      await page.locator('.scsec').first().locator('summary').click();
      assert.equal(await page.locator('.scsec').first().locator('[data-act="comment"]').first().inputValue(), 'Draft retained after collapsing');
      assert.ok(await page.locator('.rsendbtn').isVisible());
      await page.goto(base + 'bible/#review');
      await page.waitForFunction(() => document.body.dataset.ready === '1' && !document.querySelector('.sctoggle'));
      assert.equal(await page.locator('.sctoggle').count(), 0);
      report.push({ width, height, count, previews, top: ids.slice(0, 5), errors });
      assert.deepEqual(errors, []);
    } finally {
      closing = true;
      await context.close();
    }
  }
});
fs.writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
