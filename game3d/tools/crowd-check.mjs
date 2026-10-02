// The ambient crowd in each outdoor place and period (game3d/js/crowd/): loads the place, sets the period, lets the
// crowd run a while, and reports what it has (walkers, sitters, pairs, queue; ends and routes that didn't resolve),
// the draw calls and triangles (the recorder, ?perf), overlaps and spins (the fast test's movement check), and any page
// error. Shots in game3d/shots/crowd/<size>/.
//   node game3d/tools/crowd-check.mjs [w h]       PLACES=plaza,forecourt PERIODS=early,evening SECS=6 Q=1
//   BASE=.claude/worktrees/<name>/game3d for a worktree. Exits 1 on a page error, an overlap or spin, or a route that doesn't resolve.
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
            const { startMoveCheck } = await import('./js/move.js');
            globalThis.__run = true; // ?cap holds the world still until told to run
            startMoveCheck(globalThis.__game); // overlaps and spins, as in the fast test
            const g = globalThis.__game,
              P = g.place,
              A = P.ambient;
            sim.period = period;
            P.onPeriod?.(period);
            A?.enter(period);
            // Eric stands a while near two of the street ends and back where he came in, so the numbers cover more
            // than one view, the same views with and without the crowd (jumps: the opening scene can hold his walking)
            const put = ([x, z]) => {
              g.player.root.position.set(x, g.player.root.position.y, z);
              g.walker.sync();
              P.cam?.snap?.(g.player.root.position);
            };
            const { CROWD } = await import('./js/crowd/data.js');
            const s0 = [g.player.root.position.x, g.player.root.position.z];
            const ends = Object.values(CROWD[P.name].ends).filter(Array.isArray);
            // never into an exit zone (the running game would take the trip)
            const inZone = ([x, z]) => Object.values(P.zones || {}).some((f) => f(x, z));
            // on floor he can walk to from where he came in
            const { reachableNear } = await import('./js/movement/navigation.js');
            const near = (e) => {
              for (const k of [0.45, 0.35, 0.25, 0.15]) {
                const p = reachableNear(P.nav, ...s0, s0[0] + (e[0] - s0[0]) * k, s0[1] + (e[1] - s0[1]) * k);
                if (p && !inZone(p)) return p;
              }
              return s0;
            };
            const stops = [...ends.slice(0, 2).map(near), s0];
            for (const e of stops) {
              put(e);
              await new Promise((res) => setTimeout(res, (SECS * 1000) / stops.length));
            }
            const rep = globalThis.__perfReport?.().places[P.name] || {};
            // for the shot: Eric where most of the crowd is in sight (the busiest point among them, not near the edge)
            if (A && SHOT) {
              const on = A.pool.filter((b) => b.state !== 'off').map((b) => b.r.root.position);
              let best = null,
                bn = -1;
              for (const p of on) {
                const n = on.filter((q) => Math.hypot(q.x - p.x, q.z - p.z) < 6).length;
                // a step from them toward where he came in, on open floor
                const l = Math.hypot(s0[0] - p.x, s0[1] - p.z) || 1,
                  at = [p.x + ((s0[0] - p.x) / l) * 1.2, p.z + ((s0[1] - p.z) / l) * 1.2];
                if (n > bn && A.clearAt(...at) > 0.5 && !inZone(at)) {
                  bn = n;
                  best = at;
                }
              }
              if (best) {
                // there at once, then a step, so whatever fades or turns as he walks (the arcade's roof) catches up
                put(best);
                g.walker.goTo(best[0] + 0.3, best[1] + 0.3);
                await new Promise((res) => setTimeout(res, 3000));
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
              overlaps: globalThis.__moveCheck?.overlaps || [],
              spins: globalThis.__moveCheck?.spins || [],
            };
          },
          { period, SECS, SHOT: !off },
        );
        if (!off) await page.screenshot({ path: `${out}/${place}-${period}.png` });
        await page.close();
        rows.push({ place, period, ...r });
        fs.writeFileSync(`${out}/result.json`, JSON.stringify(rows, null, 1)); // kept as it goes: a run can hit its time limit
        if (r.overlaps?.length || r.spins?.length)
          bad.push(`${place} ${period}: movement ${[...r.overlaps, ...r.spins].join('; ')}`);
        if (r.missing?.length || r.noRoute?.length)
          bad.push(`${place} ${period}: ends ${r.missing} routes ${r.noRoute}`);
        console.log(place.padEnd(15), period.padEnd(8), JSON.stringify(r));
      }
});
fs.writeFileSync(`${out}/result.json`, JSON.stringify(rows, null, 1));
for (const b of bad) console.log('FAIL', b);
console.log(bad.length ? 'FAIL' : 'PASS', out);
process.exit(bad.length ? 1 : 0);
