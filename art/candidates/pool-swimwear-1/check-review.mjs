import fs from 'node:fs';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../../tools/bible/check-scope.mjs';
const base = 'http://127.0.0.1:8771/.claude/worktrees/codex-pool-swimwear/';
await withBrowserJob(
  'pool-swimwear-review',
  async (browser) => {
    for (const [width, height] of [
      [1366, 860],
      [390, 844],
    ]) {
      const page = await browser.newPage({ viewport: { width, height } }),
        errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.route('**/*', scopedRoute({ publicOnly: true, onFailure: (e) => errors.push(e) }));
      await page.addInitScript(() =>
        globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ privateMode: false })),
      );
      await page.goto(base + 'bible/#review/pool-swimwear-1');
      await page
        .getByRole('heading', { name: 'Pool swimwear: four actual Meshy candidates', exact: true })
        .waitFor({ timeout: 45000 });
      const anchor = page.getByRole('link', {
        name: 'Live 3D: compare current outfits, turn, walk, run and sit',
        exact: true,
      });
      await anchor.waitFor();
      if (!(await anchor.getAttribute('href')).endsWith('reviews/pool-swimwear-1/viewer.html?s=pair'))
        throw Error('Viewer link missing');
      await page.locator('img').first().waitFor();
      await page.evaluate(() =>
        document.querySelectorAll('img[src]').forEach((image) => {
          image.loading = 'eager';
        }),
      );
      await page
        .waitForFunction(
          () => Array.from(document.querySelectorAll('img[src]')).every((i) => i.complete && i.naturalWidth > 0),
          null,
          { timeout: 60000 },
        )
        .catch(async (error) => {
          console.error(
            await page.evaluate(() =>
              Array.from(document.querySelectorAll('img[src]'))
                .filter((i) => !i.complete || !i.naturalWidth)
                .map((i) => i.src),
            ),
          );
          throw error;
        });
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2))
        throw Error('Horizontal overflow');
      const out = '/home/jorgen/repo/japanese/art/parts/pool-swimwear-1/review-check';
      fs.mkdirSync(out, { recursive: true });
      await page.screenshot({ path: out + '/' + width + '.png' });
      if (errors.length) throw Error(errors.join('\n'));
      await page.close();
    }
    console.log('PASS actual review page, all images, direct viewer link, desktop + phone, public-only');
  },
  { timeoutMs: 180000 },
);
