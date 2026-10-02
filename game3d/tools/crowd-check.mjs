// The ambient crowd in each outdoor place and period (game3d/js/crowd/): loads the place, sets the period, lets the
// crowd run a while, and reports what it has (walkers, sitters, pairs, queue; ends and routes that didn't resolve),
// the draw calls and triangles of a frame, and any page error. Shots in game3d/shots/crowd/<size>/.
//   node game3d/tools/crowd-check.mjs [w h]       PLACES=plaza,forecourt PERIODS=early,evening SECS=6 Q=1
//   BASE=.claude/worktrees/<name>/game3d for a worktree. Exits 1 on a page error or a route that doesn't resolve.
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';

const [W, H] = [+(process.argv[2] || 1366), +(process.argv[3] || 860)];
const base = process.env.BASE || 'game3d';
const PLACES = (
  process.env.PLACES || 'forecourt,plaza,shotengai,east_lane,east_coast,sports,office_quarter,harbour'
).split(',');
const PERIODS = (process.env.PERIODS || 'early,lunch,evening').split(',');
const SECS = +(process.env.SECS || 6);
const q = process.env.Q || '1';
const COMPARE = !!process.env.COMPARE; // also each place with ?nocrowd, for the before/after draw calls
const out = `game3d/shots/crowd/${W}x${H}-q${q}${process.env.TAG ? '-' + process.env.TAG : ''}`;
fs.mkdirSync(out, { recursive: true });
const rows = [],
  bad = [];
await withBrowserJob('crowd-check', async (browser) => {
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
  });
  for (const place of PLACES)
    for (const period of PERIODS)
      for (const off of COMPARE ? [true, false] : [false]) {
        const page = await ctx.newPage();
        page.on('pageerror', (e) => bad.push(`${place} ${period}: ${e.message}`));
        const url = `http://127.0.0.1:8771/${base}/index.html?cap&perf&q=${q}&place=${place}${off ? '&nocrowd' : ''}`;
        await page.goto(url, { timeout: 60000 });
        await page.waitForFunction(() => globalThis.__done, null, {
          timeout: 120000,
        });
        const r = await page.evaluate(
          async ({ period, SECS, SHOT }) => {
            const { sim } = await import('./js/sim.js');
            const g = globalThis.__game,
              P = g.place,
              A = P.ambient;
            sim.period = period;
            P.onPeriod?.(period);
            A?.enter(period);
            // Eric walks toward the first two ends and back, so the numbers cover more than where he came in
            const { CROWD } = await import('./js/crowd/data.js');
            const ends = Object.values(CROWD[P.name].ends).filter(Array.isArray);
            const s0 = [g.player.root.position.x, g.player.root.position.z];
            for (const e of [ends[0], ends[1], s0].filter(Boolean)) {
              g.walker.goTo(e[0], e[1]);
              await new Promise((res) => setTimeout(res, (SECS * 1000) / 3));
            }
            const rep = globalThis.__perfReport?.().places[P.name] || {};
            // for the shot: Eric where most of the crowd is in sight (the busiest point among them, not near the edge)
            if (A && SHOT) {
              const on = A.pool.filter((b) => b.state !== 'off').map((b) => b.r.root.position);
              let best = null,
                bn = -1;
              for (const p of on) {
                const n = on.filter((q) => Math.hypot(q.x - p.x, q.z - p.z) < 6).length;
                if (n > bn && A.clearAt(p.x + 1, p.z + 1) > 0.4) {
                  bn = n;
                  best = [p.x + 1, p.z + 1];
                }
              }
              if (best) {
                g.walker.goTo(best[0], best[1]);
                await new Promise((res) => setTimeout(res, 4000));
              }
            }
            if (!A)
              return {
                off: true,
                calls: rep.calls,
                callsMax: rep.callsMax,
                tris: rep.tris,
                trisMax: rep.trisMax,
              };
            const missing = Object.keys((await import('./js/crowd/data.js')).CROWD[P.name].ends).filter(
              (e) => !A.ends[e],
            );
            const noRoute = [...A.routes].filter(([, l]) => !l).map(([k]) => k);
            return {
              ...A.counts(),
              seats: A.spots.seats.length,
              chats: A.spots.chats.length,
              pool: A.pool.length,
              calls: rep.calls,
              callsMax: rep.callsMax,
              tris: rep.tris,
              trisMax: rep.trisMax,
              missing,
              noRoute,
              move: globalThis.__moveCheck ? globalThis.__moveCheck.overlaps.length : null,
            };
          },
          { period, SECS, SHOT: !off },
        );
        if (!off) await page.screenshot({ path: `${out}/${place}-${period}.png` });
        await page.close();
        rows.push({ place, period, ...r });
        if (r.missing?.length || r.noRoute?.length)
          bad.push(`${place} ${period}: ends ${r.missing} routes ${r.noRoute}`);
        console.log(place.padEnd(15), period.padEnd(8), JSON.stringify(r));
      }
});
fs.writeFileSync(`${out}/result.json`, JSON.stringify(rows, null, 1));
for (const b of bad) console.log('FAIL', b);
console.log(bad.length ? 'FAIL' : 'PASS', out);
process.exit(bad.length ? 1 : 0);
