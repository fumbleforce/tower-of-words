// Walks the outdoor chunks through their trips, the way a player does: the first loop round the south-east of the
// island (up the east lane's north street into the sports ground, east along the courts walk into the east coast,
// back west into the sports ground and down the north street into the east lane; on the way, out west to the office
// quarter, on west to the harbour, round the loop through the old works (up the works lane, down the works street,
// up it again, down the lane) and back), along the dorm row to the east coast and back, into the shotengai, to the
// plaza and east again.
// Each leg walks Eric (the game's own walkTo) into the next exit zone and waits for the next place; it prints each
// arrival with where Eric stands, saves a shot per arrival, and FAILs on a leg that doesn't arrive, on any page
// error, or when Eric leaves the frame at any moment of the walk in and the camera letting go (his feet and head,
// sampled every frame for ARRIVE_MS after the new place is up; GUIDE: the player always sees Eric).
// With the recorder on (?perf), it ends with each place's frame times, draw calls and triangles over the walk.
//   node game3d/tools/loop-check.mjs [outdir] [w] [h]      BASE=<worktree>/game3d for a worktree; Q=0|1|2 the tier
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import fs from 'node:fs';

const [out = 'game3d/shots/loop', W = '1366', H = '860'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const base = process.env.BASE || 'game3d';
// [place we start the leg in, the points Eric walks through (that place's own frame) or the way out he walks to (a
// thing of that place), the place it should take him to]; in the sports ground: the north street, the lane's corner,
// the pool walk's corner, the courts walk's end
const LEGS = [
  ['east_lane', [[0, -35.4]], 'sports'],
  ['sports', 'office_street', 'office_quarter'],
  ['office_quarter', 'harbour', 'harbour'],
  ['harbour', 'works_lane', 'works'],
  ['works', 'office_street', 'harbour'],
  ['harbour', 'works_street', 'works'],
  ['works', 'harbour_lane', 'harbour'],
  ['harbour', 'office_street', 'office_quarter'],
  ['office_quarter', 'sports_lane', 'sports'],
  [
    'sports',
    [
      [0, 9.5],
      [0, 0],
      [43.2, 0],
    ],
    'east_coast',
  ],
  ['east_coast', [[-28.4, -68]], 'sports'],
  [
    'sports',
    [
      [0, 0],
      [0, 9.5],
      [11.07, 9.5],
      [11.07, 20.3],
    ],
    'east_lane',
  ],
  ['east_lane', 'dorm_row', 'east_coast'],
  ['east_coast', 'dorm_street', 'east_lane'],
  ['east_lane', 'shop_street', 'shotengai'],
  ['shotengai', 'plaza_lane', 'plaza'],
  ['plaza', 'dorm_lane', 'east_lane'],
];
const ARRIVE_MS = 5000; // the walk in (about 3 s) and the camera letting go
const errors = [];
let fails = 0;
await withBrowserJob(
  'loop-check',
  async (browser) => {
    const phone = +W < 700;
    const page = await browser.newPage({ viewport: { width: +W, height: +H }, isMobile: phone, hasTouch: phone });
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && !/404/.test(m.text()) && errors.push(m.text()));
    await page.goto(
      `http://127.0.0.1:8771/${base}/index.html?cap&perf&q=${process.env.Q ?? 1}&place=east_lane&mx=0&mz=-31`,
    );
    await page.waitForFunction(() => document.body.dataset.place === 'east_lane' && window.__game?.player, null, {
      timeout: 120000,
    });
    await page.evaluate(() => (window.__run = true)); // ?cap holds the world still until told to run
    await page.waitForTimeout(1500);
    for (const [i, [from, points, to]] of LEGS.entries()) {
      // the place's arrival beat over (it stops a walk begun under it), as a player gets control back
      await page.waitForFunction(() => !window.__game.busy, null, { timeout: 30000 }).catch(() => {});
      const here = await page.evaluate(() => document.body.dataset.place);
      if (here !== from) {
        console.log(`FAIL leg ${i + 1}: in ${here}, expected ${from}`);
        fails++;
        break;
      }
      void page
        .evaluate(async (points) => {
          const g = window.__game;
          // a way out: to where he stands to use it, then on toward its edge (the plaza's zone starts past the spot)
          if (typeof points === 'string') points = [g.place.things[points].spot(), g.place.things[points].face()];
          for (const [x, z] of points) await g.walkTo(x, z);
        }, points)
        .catch(() => {}); // the page moves on to the next place mid-walk
      const ok = await page
        .waitForFunction((to) => document.body.dataset.place === to, to, { timeout: 90000 }) // the longest legs walk about 75 m
        .then(() => true)
        .catch(() => false);
      if (!ok) {
        const p = await page.evaluate(() => window.__game.player.root.position.toArray().map((v) => +v.toFixed(2)));
        console.log(`FAIL leg ${i + 1}: ${from} -> ${to} never arrived; Eric at ${p}`);
        fails++;
        break;
      }
      // the walk in and the camera letting go: where his feet and head are on screen, every frame (-1..1 is in)
      const worst = await page.evaluate(
        (ms) =>
          new Promise((done) => {
            const g = window.__game,
              t0 = performance.now();
            let w = { out: 0, at: 0, x: 0, y: 0 };
            const look = () => {
              const t = performance.now() - t0,
                root = g.player.root,
                feet = root.getWorldPosition(root.position.clone());
              const head = feet.clone();
              head.y += 1.6 * (root.scale.y || 1);
              for (const v of [feet, head]) {
                v.project(g.place.camera);
                const out = Math.max(Math.abs(v.x), Math.abs(v.y));
                if (out > w.out) w = { out, at: Math.round(t), x: +v.x.toFixed(2), y: +v.y.toFixed(2) };
              }
              if (t < ms) requestAnimationFrame(look);
              else done(w);
            };
            look();
          }),
        ARRIVE_MS,
      );
      if (worst.out > 1) {
        console.log(
          `FAIL leg ${i + 1}: Eric out of frame in ${to} ${worst.at} ms after arriving (at ${worst.x}, ${worst.y})`,
        );
        fails++;
      }
      const p = await page.evaluate(() => window.__game.player.root.position.toArray().map((v) => +v.toFixed(2)));
      console.log(
        `leg ${i + 1}: ${from} -> ${to}, Eric at ${p}, furthest out ${worst.out.toFixed(2)} at ${worst.at} ms`,
      );
      await page.screenshot({ path: `${out}/leg${i + 1}-${to}-${phone ? 'phone' : 'desk'}.png` });
    }
    const report = await page.evaluate(() => window.__perfReport?.()).catch(() => null);
    for (const [name, r] of Object.entries(report?.places || report || {}))
      console.log(
        `perf ${name}: median ${r.medianMs} ms, 1% ${r.p99Ms} ms, calls ${r.calls} (max ${r.callsMax}), tris ${r.tris}`,
      );
  },
  { timeoutMs: 900000 },
);
for (const e of errors) console.log('page error: ' + e);
console.log(fails || errors.length ? 'FAIL' : 'PASS');
process.exitCode = fails || errors.length ? 1 : 0;
