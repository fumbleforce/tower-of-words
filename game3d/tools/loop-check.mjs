// Walks the first loop round the south-east of the island through its trips, the way a player does: up the east
// lane's north street into the sports ground, east along the courts walk into the east coast, back west into the
// sports ground and down the north street into the east lane. Each leg walks Eric (the game's own walkTo) into the
// next exit zone and waits for the next place; it prints each arrival with where Eric stands, saves a shot per
// arrival, and FAILs on a leg that doesn't arrive or on any page error.
// With the recorder on (?perf), it ends with each place's frame times, draw calls and triangles over the walk.
//   node game3d/tools/loop-check.mjs [outdir] [w] [h]      BASE=<worktree>/game3d for a worktree; Q=0|1|2 the tier
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import fs from 'node:fs';

const [out = 'game3d/shots/loop', W = '1366', H = '860'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const base = process.env.BASE || 'game3d';
// [place we start the leg in, the points Eric walks through (that place's own frame), the place it should take him
// to]; in the sports ground: the north street, the lane's corner, the pool walk's corner, the courts walk's end
const LEGS = [
  ['east_lane', [[0, -35.4]], 'sports'],
  ['sports', [[11.07, 9.5], [0, 9.5], [0, 0], [43.2, 0]], 'east_coast'],
  ['east_coast', [[-28.4, -68]], 'sports'],
  ['sports', [[0, 0], [0, 9.5], [11.07, 9.5], [11.07, 20.3]], 'east_lane'],
];
const errors = [];
let fails = 0;
await withBrowserJob(
  'loop-check',
  async (browser) => {
    const phone = +W < 700;
    const page = await browser.newPage({ viewport: { width: +W, height: +H }, isMobile: phone, hasTouch: phone });
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && !/404/.test(m.text()) && errors.push(m.text()));
    await page.goto(`http://127.0.0.1:8771/${base}/index.html?cap&perf&q=${process.env.Q ?? 1}&place=east_lane&mx=0&mz=-31`);
    await page.waitForFunction(() => document.body.dataset.place === 'east_lane' && window.__game?.player, null, {
      timeout: 120000,
    });
    await page.evaluate(() => (window.__run = true)); // ?cap holds the world still until told to run
    await page.waitForTimeout(1500);
    for (const [i, [from, points, to]] of LEGS.entries()) {
      const here = await page.evaluate(() => document.body.dataset.place);
      if (here !== from) {
        console.log(`FAIL leg ${i + 1}: in ${here}, expected ${from}`);
        fails++;
        break;
      }
      void page.evaluate(async (points) => {
        for (const [x, z] of points) await window.__game.walkTo(x, z);
      }, points).catch(() => {}); // the page moves on to the next place mid-walk
      const ok = await page
        .waitForFunction((to) => document.body.dataset.place === to, to, { timeout: 60000 })
        .then(() => true)
        .catch(() => false);
      if (!ok) {
        const p = await page.evaluate(() => window.__game.player.root.position.toArray().map((v) => +v.toFixed(2)));
        console.log(`FAIL leg ${i + 1}: ${from} -> ${to} never arrived; Eric at ${p}`);
        fails++;
        break;
      }
      await page.waitForTimeout(3500); // the walk in and the camera letting go
      const p = await page.evaluate(() => window.__game.player.root.position.toArray().map((v) => +v.toFixed(2)));
      console.log(`leg ${i + 1}: ${from} -> ${to}, Eric at ${p}`);
      await page.screenshot({ path: `${out}/leg${i + 1}-${to}-${phone ? 'phone' : 'desk'}.png` });
    }
    const report = await page.evaluate(() => window.__perfReport?.()).catch(() => null);
    for (const [name, r] of Object.entries(report?.places || report || {}))
      console.log(`perf ${name}: median ${r.medianMs} ms, 1% ${r.p99Ms} ms, calls ${r.calls} (max ${r.callsMax}), tris ${r.tris}`);
  },
  { timeoutMs: 280000 },
);
for (const e of errors) console.log('page error: ' + e);
console.log(fails || errors.length ? 'FAIL' : 'PASS');
process.exitCode = fails || errors.length ? 1 : 0;
