// Sustained live-review motion and layout checks; no GPU performance claims when GL=soft.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scopedRoute } from '../../../tools/bible/check-scope.mjs';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const relative = path.relative('/home/jorgen/repo/japanese', root);
const base = process.env.BASE_URL || `http://127.0.0.1:8771/${relative ? relative + '/' : ''}`;
const out = process.argv[2] || path.join(root, 'art/parts/pool-swimwear-1/motion');
fs.mkdirSync(out, { recursive: true });
const results = [];
await withBrowserJob(
  'pool-swimwear-motion',
  async (browser) => {
    for (const [width, height] of [
      [1366, 860],
      [390, 844],
    ]) {
      const page = await browser.newPage({ viewport: { width, height } });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.route('**/*', scopedRoute({ publicOnly: true, onFailure: (e) => errors.push(e) }));
      await page.addInitScript(() => localStorage.setItem('amakawa-settings', JSON.stringify({ privateMode: false })));
      await page.goto(base + 'reviews/pool-swimwear-1/viewer.html?s=pair');
      await page.waitForFunction(() => window.__viewer?.ready);
      for (const way of ['treadmill', 'loop']) {
        await page.evaluate((way) => window.__viewer.setWay(way), way);
        for (const motion of ['idle', 'walk', 'run', 'idle', 'sit', 'walk']) {
          const sampled = await page.evaluate((motion) => {
            const v = window.__viewer;
            v.freeze(true);
            v.setMotion(motion);
            const frames = [];
            for (let i = 0; i < 40; i++) {
              v.advance(15);
              frames.push(
                v.figures().map((f) => {
                  const pose = [];
                  f.m.root.traverse((o) => {
                    if (o.isBone && /leg|thigh|calf|foot/i.test(o.name)) pose.push(...o.quaternion.toArray());
                  });
                  const p = f.m.root.position;
                  return { key: f.key, state: f.m.state, pose, root: [p.x, p.y, p.z] };
                }),
              );
            }
            return frames;
          }, motion);
          for (let person = 0; person < sampled[0].length; person++) {
            if (['walk', 'run'].includes(motion))
              for (const start of [8, 16, 24, 32]) {
                const chunk = sampled.slice(start, start + 8).map((f) => f[person]);
                if (
                  chunk.some((f) => f.state !== 'walk') ||
                  new Set(chunk.map((f) => f.pose.map((n) => n.toFixed(4)).join(','))).size < 5
                )
                  throw Error(`${width} ${way} ${motion}: ${person} frozen after ${start / 4}s`);
              }
          }
          results.push({ width, way, motion, seconds: 10, states: sampled.at(-1).map((f) => f.state) });
          if (motion === 'walk' || motion === 'run') {
            await page.evaluate(() => window.__viewer.view('from the side'));
            for (let i = 0; i < 8; i++) {
              await page.evaluate(() => window.__viewer.advance(8));
              await page.screenshot({ path: `${out}/${width}-${way}-${motion}-${i}.png` });
            }
          }
        }
      }
      await page.evaluate(() => {
        const v = window.__viewer;
        v.setWay('treadmill');
        v.setMotion('walk');
        v.view('whole row');
        v.freeze(false);
      });
      await page.waitForTimeout(8000);
      const states = await page.evaluate(() => window.__viewer.figures().map((f) => f.m.state));
      if (states.some((s) => s !== 'walk')) throw Error(`wall-clock gait stopped: ${states}`);
      await page.screenshot({ path: `${out}/${width}-pair.png` });
      await page.evaluate(() => window.__viewer.show('kuro'));
      await page.screenshot({ path: `${out}/${width}-cast.png` });
      if (errors.length) throw Error(errors.join('\n'));
      await page.close();
    }
  },
  { timeoutMs: 240000 },
);
fs.writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
console.log(
  'PASS Meshy swimwear candidates,',
  results.length,
  '10-second state runs; desktop + phone; treadmill + loop; sustained real-time walking',
);
