// Saves the five Photos finds as the game draws them now (game3d/js/finds/pictures-*.js), 640x480 PNG each, so the
// review can show the current drawing next to each generated attempt. Needs the repo served on 8771 (./start).
// Usage: GL=soft node art/candidates/photos-1/capture-current.mjs <out-dir>
import fs from 'node:fs';
import path from 'node:path';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';

const out = process.argv[2] || 'art/production/photos-1/current';
fs.mkdirSync(out, { recursive: true });
await withBrowserJob('photos-capture', async (browser) => {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8771/game3d/js/finds/paint.js');
  const shots = await page.evaluate(async () => {
    const { DAY } = await import('/game3d/js/finds/pictures-day.js');
    const { NIGHT } = await import('/game3d/js/finds/pictures-night.js');
    const res = {};
    for (const [k, draw] of Object.entries({ ...DAY, ...NIGHT })) {
      const cv = document.createElement('canvas');
      cv.width = 640;
      cv.height = 480;
      draw(cv.getContext('2d'), 640, 480);
      res[k] = cv.toDataURL('image/png');
    }
    return res;
  });
  for (const [k, url] of Object.entries(shots))
    fs.writeFileSync(path.join(out, `${k}.png`), Buffer.from(url.split(',')[1], 'base64'));
  console.log(Object.keys(shots).join(' '));
});
