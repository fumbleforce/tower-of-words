import fs from 'node:fs';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../../tools/bible/check-scope.mjs';
const base = 'http://127.0.0.1:8771/.claude/worktrees/codex-pool-swimwear/';
const out = process.env.CAPTURE_OUT || '/home/jorgen/repo/japanese/art/parts/pool-swimwear-1/captures';
fs.mkdirSync(out, { recursive: true });
const ids = process.argv.slice(2);
if (!ids.length) throw Error('Specify candidates');
await withBrowserJob(
  'pool-swimwear-captures',
  async (browser) => {
    for (const [width, height] of [
      [1366, 860],
      [390, 844],
    ]) {
      const page = await browser.newPage({ viewport: { width, height } }),
        errors = [];
      page.on('pageerror', (e) => {
        errors.push(e.message);
        console.error('PAGE', e.message);
      });
      await page.route('**/*', scopedRoute({ publicOnly: true, onFailure: (e) => errors.push(e) }));
      if (process.env.CLIP_VARIANT)
        await page.route('**/pool-swimwear-1/game/*/*.json', async (route) => {
          const url = new URL(route.request().url()),
            match = url.pathname.match(/game\/([^/]+)\/(idle|sit)\.json$/);
          const file =
            match &&
            '/home/jorgen/repo/japanese/art/parts/pool-swimwear-1/game/' +
              match[1] +
              '/' +
              match[2] +
              '-' +
              process.env.CLIP_VARIANT +
              '.json';
          if (file && fs.existsSync(file)) return route.fulfill({ path: file, contentType: 'application/json' });
          return route.fallback();
        });
      await page.addInitScript(() => localStorage.setItem('amakawa-settings', JSON.stringify({ privateMode: false })));
      await page.goto(base + 'reviews/pool-swimwear-1/viewer.html');
      await page.waitForFunction(() => window.__viewer?.ready, null, { timeout: 45000 });
      for (const id of ids) {
        await page.evaluate(async (id) => {
          const v = window.__viewer;
          v.freeze(true);
          await v.show(id.split('-')[0]);
          v.setMotion('idle');
          v.advance(90);
          v.view('whole row');
        }, id);
        await page.screenshot({ path: `${out}/${width}-${id}-comparison.png` });
        const shots = process.env.SEAT_ONLY
          ? [['body', 1.57, 'sit']]
          : [
              ['face', 0, 'idle'],
              ['body', 0, 'idle'],
              ['body', 1.57, 'idle'],
              ['body', 1.57, 'walk'],
              ['body', 1.57, 'sit'],
            ];
        for (const [part, yaw, motion] of shots) {
          await page.evaluate(
            ({ id, part, yaw, motion }) => {
              const v = window.__viewer;
              v.setMotion(motion);
              v.advance(95);
              v.closeOn(id, part, yaw);
            },
            { id, part, yaw, motion },
          );
          await page.waitForTimeout(100);
          await page.locator('#c').screenshot({ path: `${out}/${width}-${id}-${motion}-${part}-${yaw}.png` });
        }
      }
      if (errors.length) throw Error(errors.join('\n'));
      await page.close();
    }
    console.log('PASS native viewer captures', ids.join(','), 'desktop + phone');
  },
  { timeoutMs: 180000 },
);
