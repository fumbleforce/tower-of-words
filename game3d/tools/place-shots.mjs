// Stills of the outdoor places (and the lobby) with Eric at given spots, desktop and phone, morning or evening, for
// checking geometry close up. One browser job, one page per shot.
//   node game3d/tools/place-shots.mjs <outdir> name:place:x:z[:face][:eve][:lift=<state>] ...
// Sizes: SIZES=1366x860,390x844 (default both); each shot is written as <name>-desk.png / <name>-phone.png.
// BASE=.claude/worktrees/<name>/game3d for a worktree. Quality q=1 unless Q is set.
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import fs from 'node:fs';
import path from 'node:path';

const [out, ...specs] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const base = process.env.BASE || 'game3d';
const sizes = (process.env.SIZES || '1366x860,390x844').split(',').map((s) => s.split('x').map(Number));
const errors = [];
await withBrowserJob(
  'place-shots',
  async (browser) => {
    for (const [w, h] of sizes) {
      const phone = w < 700;
      const context = await browser.newContext({
        viewport: { width: w, height: h },
        isMobile: phone,
        hasTouch: phone,
      });
      for (const spec of specs) {
        const [name, place, x, z, ...rest] = spec.split(':');
        const face = rest.find((r) => /^-?[\d.]+$/.test(r));
        const eve = rest.includes('eve');
        const lift = rest.find((r) => r.startsWith('lift='))?.slice(5);
        const page = await context.newPage();
        page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
        page.on('console', (m) => m.type() === 'error' && !/404/.test(m.text()) && errors.push(`${name}: ${m.text()}`));
        const q = `cap&q=${process.env.Q || 1}&place=${place}&mx=${x}&mz=${z}${face ? '&face=' + face : ''}`;
        await page.goto(`http://127.0.0.1:8771/${base}/index.html?${q}`, {
          timeout: 60000,
        });
        await page
          .waitForFunction(() => globalThis.__done, null, { timeout: 120000 })
          .catch(() => errors.push(`${name}: timeout`));
        if (eve) await page.evaluate(() => globalThis.__game.place.onPeriod?.('evening'));
        if (lift) await page.evaluate((s) => globalThis.__lift?.state(s), lift);
        await page.waitForTimeout(700);
        const file = path.join(out, `${name}-${phone ? 'phone' : 'desk'}.png`);
        await page.screenshot({ path: file });
        console.log('wrote', file);
        await page.close();
      }
      await context.close();
    }
  },
  { timeoutMs: 280000 },
);
if (errors.length) console.log('page errors:\n' + errors.join('\n'));
