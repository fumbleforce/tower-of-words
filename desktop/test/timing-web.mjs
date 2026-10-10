// The dev server's numbers for the same measurement as the app's timing scenario (desktop/test/scenarios.mjs):
//   node desktop/test/timing-web.mjs [url]     default http://127.0.0.1:8771/game3d/index.html
// One fresh browser context (nothing cached: cold), then a second load in the same context (warm).
import { withBrowserJob, gpuWaitOptions } from '../../tools/lib/browser-job.mjs';
import { measure } from './scenarios.mjs';

const url = process.argv[2] || 'http://127.0.0.1:8771/game3d/index.html';
const result = await withBrowserJob(
  'desktop-timing-web',
  async (browser) => {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 } });
    // the first visit's opening is not what is timed; webdriver keeps it away in the browser as the game intends
    const page = await ctx.newPage();
    let t0 = Date.now();
    await page.goto(url);
    const cold = await measure(page, t0);
    t0 = Date.now();
    await page.goto(url);
    const warm = await measure(page, t0);
    return { cold, warm };
  },
  gpuWaitOptions(120, 240000),
);
console.log(JSON.stringify(result, null, 1));
