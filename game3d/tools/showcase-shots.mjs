// Stills of the texture-avenues showcase room (game3d/showcase.html) from the game camera, one per look, on desktop
// and phone, plus a close view and the desktop game's zoom (cropped to the room). Also times each look.
//   node game3d/tools/showcase-shots.mjs <outdir> [looks=0,2,3,4,7,8] [--base http://127.0.0.1:8771] [--only desk,phone,close,far]
// Run under the shared browser lock (and the GPU lock with GL=gpu):
//   sh game3d/tools/with-browser-lock.sh showcase node game3d/tools/showcase-shots.mjs <outdir>
// Output: <outdir>/look<n>-<view>.jpg and <outdir>/stats.json
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const BASE = opt('base', 'http://127.0.0.1:8771'), ONLY = opt('only', 'desk,phone,close,far').split(',');
const [out, list = '0,2,3,4,7,8'] = argv;
const looks = list.split(',').map(Number);
fs.mkdirSync(out, { recursive: true });
const gl = process.env.GL === 'gpu' ? ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const b = await chromium.launch({ headless: true, args: gl });
const stats = {};

async function page(w, h, dpr, q) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
  await p.goto(`${BASE}/game3d/showcase.html?cap&q=${q}&look=${looks[0]}`);
  await p.waitForFunction(() => window.__done, null, { timeout: 180000 }).catch(() => errs.push('timeout'));
  return { p, errs };
}

const jobs = [];
if (ONLY.some((v) => v !== 'phone')) jobs.push({ tag: 'desk', w: 1366, h: 860, dpr: 1, q: 2, views: ['game', 'close', 'far'].filter((v) => ONLY.includes(v === 'game' ? 'desk' : v)) });
if (ONLY.includes('phone')) jobs.push({ tag: 'phone', w: 390, h: 844, dpr: 2, q: 1, views: ['game'] });

for (const j of jobs) {
  const { p, errs } = await page(j.w, j.h, j.dpr, j.q);
  for (const n of looks) {
    for (const v of j.views) {
      const s = await p.evaluate(async ([n, v]) => window.__show(n, v), [n, v]).catch((e) => { errs.push(e.message); return null; });
      await p.waitForTimeout(150);
      const name = `look${n}-${v === 'game' ? j.tag : v}`;
      let clip;
      if (v === 'far') {
        // crop to the room (its corners on screen, with a margin)
        clip = await p.evaluate(() => window.__roomRect && window.__roomRect());
      }
      await p.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 90, clip, timeout: 120000 });
      if (v === 'game') {
        const bench = await p.evaluate(() => window.__bench(40));
        stats[`${n}-${j.tag}`] = { ...bench, build: s && s.build, extra: s && s.extra };
      }
      console.log(name, errs.length ? 'ERR ' + errs.splice(0).slice(0, 3).join(' | ') : 'ok');
    }
  }
  await p.close();
}
fs.writeFileSync(`${out}/stats.json`, JSON.stringify(stats, null, 1));
await b.close();
