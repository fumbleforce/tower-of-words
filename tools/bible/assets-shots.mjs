// Screenshots of the bible's Asset library (bible/assets.js) at desktop and phone size, for checking its layout:
//   GL=soft node tools/bible/assets-shots.mjs [outdir]    (default game3d/shots/asset-library)
// Serves the repo on a private port, so it doesn't need ./start.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { withBrowserJob } from '../lib/browser-job.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUT = path.resolve(ROOT, process.argv[2] || 'game3d/shots/asset-library');
fs.mkdirSync(OUT, { recursive: true });
const PORT = 8781;
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
process.on('exit', () => srv.kill());
await new Promise((r) => setTimeout(r, 700));

const SIZES = { desktop: { width: 1440, height: 1000 }, phone: { width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 } };
const PAGES = { list: 'assets', piece: 'asset/outdoor/furniture/bench', building: 'asset/outdoor/block/officeBlock',
  faceted: 'asset/outdoor/planting/keyaki', street: 'asset/diorama/planting/streetPlanting' };
await withBrowserJob('asset-library-shots', async (browser) => {
  for (const [size, vp] of Object.entries(SIZES)) {
    const { isMobile, deviceScaleFactor, ...viewport } = vp;
    const page = await browser.newPage({ viewport, isMobile: !!isMobile, deviceScaleFactor: deviceScaleFactor || 1 });
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    for (const [name, hash] of Object.entries(PAGES)) {
      await page.goto(`http://127.0.0.1:${PORT}/bible/#${hash}`);
      await page.waitForSelector('.alib h1 + *', { timeout: 30000 });
      await page.waitForTimeout(800);
      const file = path.join(OUT, `${name}-${size}.png`);
      await page.screenshot({ path: file, fullPage: name === 'list' ? false : true });
      if (name === 'list') {
        await page.screenshot({ path: path.join(OUT, `${name}-${size}-full.png`), fullPage: true });
        await page.locator('#alooks').screenshot({ path: path.join(OUT, `looks-${size}.png`) }); // street style and faceted
      }
      console.log(file);
    }
    if (errs.length) console.log('page errors:', errs.join('\n'));
    await page.close();
  }
});
srv.kill();
