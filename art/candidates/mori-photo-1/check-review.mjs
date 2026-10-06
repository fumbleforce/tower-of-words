import fs from 'node:fs';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../../tools/bible/check-scope.mjs';
const base = 'http://127.0.0.1:8771/.claude/worktrees/codex-mori-photo/';
await withBrowserJob(
  'mori-photo-review',
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
      await page.goto(base + 'bible/#review/mori-photo-1');
      await page.getByRole('heading', { name: 'Mori’s travel photograph', exact: true }).waitFor({ timeout: 45000 });
      await page.evaluate(() =>
        document.querySelectorAll('img[src]').forEach((i) => {
          i.loading = 'eager';
        }),
      );
      await page.waitForFunction(() => {
        const imgs = [...document.querySelectorAll('img[src]')];
        return imgs.length === 2 && imgs.every((i) => i.complete && i.naturalWidth === 1536);
      });
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2))
        throw Error('Horizontal overflow');
      const out = '/home/jorgen/repo/japanese/art/parts/mori-photo-1/review-check';
      fs.mkdirSync(out, { recursive: true });
      await page.screenshot({ path: out + '/' + width + '.png' });
      if (errors.length) throw Error(errors.join('\n'));
      await page.close();
    }
    console.log('PASS two actual candidate images, desktop + phone, public-only');
  },
  { timeoutMs: 90000 },
);
