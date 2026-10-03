// Screenshots tools/cat-sheet.html (the rigged cat in every pose and her walk) to game3d/shots/cat-sheet/<coat>.png.
//   node game3d/tools/cat-sheet.mjs [coat]     BASE=<worktree>/game3d
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';

const coat = process.argv[2] || 'calico',
  base = process.env.BASE || 'game3d',
  out = 'game3d/shots/cat-sheet';
fs.mkdirSync(out, { recursive: true });
const errors = [];
await withBrowserJob('cat-sheet', async (browser) => {
  const page = await browser.newPage({
    viewport: { width: 2080, height: 1300 },
  });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`http://127.0.0.1:8771/${base}/tools/cat-sheet.html?coat=${coat}`);
  await page.waitForFunction(() => globalThis.__ready, null, { timeout: 30000 }).catch(() => {});
  await page.screenshot({ path: `${out}/${coat}.png` });
  await page.close();
});
for (const e of errors) console.log('ERROR', e);
console.log(errors.length ? 'FAIL' : 'done', `${out}/${coat}.png`);
