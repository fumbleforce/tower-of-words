// The gait check on its own (js/movement/gait-watch.js; Jørgen, 2026-10-03: "Why are all the animations wrong, people
// walk on the spot, and slide when they move"): loads a place at lunch with its crowd, walks Eric round, walks Mio
// (walkRig) and one of the place's people (the story's walkPerson) past him, stops them and turns them on the spot,
// and reports everyone in view who stepped on the spot or slid. Real time (the fast test runs the same check sped up).
//   node game3d/tools/gait-check.mjs [w h]     PLACES=plaza,forecourt SECS=14 QS=&chibi=0 BASE=<worktree>/game3d
//   RUN=1: Eric runs his legs (as a double tap does) instead of walking them.
// Exits 1 when anyone is reported, or on a page error.
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';

const [W, H] = [+(process.argv[2] || 390), +(process.argv[3] || 844)];
const base = process.env.BASE || 'game3d';
const PLACES = (process.env.PLACES || 'plaza,forecourt').split(',');
const SECS = +(process.env.SECS || 14);
const QS = process.env.QS || '';
const RUN = process.env.RUN === '1';
const tag = `${W}x${H}${QS.replace(/[^a-z0-9=]/gi, '-')}${RUN ? '-run' : ''}${process.env.TAG ? '-' + process.env.TAG : ''}`;
const out = `game3d/shots/gait/${tag}`;
fs.mkdirSync(out, { recursive: true });
const errors = [];
let fails = 0;
await withBrowserJob('gait-check', async (browser) => {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  for (const place of PLACES) {
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`${place}: ${e.message}`));
    await page.goto(`http://127.0.0.1:8771/${base}/index.html?cap&q=1&place=${place}${QS}`, { timeout: 60000 });
    await page.waitForFunction(() => globalThis.__done, null, { timeout: 120000 });
    const r = await page.evaluate(
      async ({ SECS, RUN }) => {
        const g = globalThis.__game,
          P = g.place;
        const { sim } = await import('./js/sim.js');
        const { startGaitCheck } = await import('./js/movement/gait-watch.js');
        const { walkRig, faceRig } = await import('./js/move.js');
        const { walkPerson } = await import('./js/story.js');
        const { reachableNear } = await import('./js/movement/navigation.js');
        globalThis.__run = true;
        sim.period = 'lunch';
        P.onPeriod?.('lunch');
        P.ambient?.enter('lunch');
        const sleep = (s) => new Promise((res) => setTimeout(res, s * 1000));
        const K = P.charScale || 1,
          e = g.player.root.position,
          s0 = [e.x, e.z];
        const near = (dx, dz) => reachableNear(P.nav, ...s0, s0[0] + dx * K, s0[1] + dz * K) || s0;
        // Mio and one of the place's people beside Eric, to be walked
        const mio = g.mioNpc;
        if (!mio.root.parent) P.space.add(mio.root);
        mio.root.visible = true;
        mio.root.scale.setScalar(K);
        const m0 = near(1.2, 0.6);
        mio.root.position.set(m0[0], 0, m0[1]);
        const other = Object.entries(P.people || {}).find(([, r]) => r?.root?.visible && !r.seated && r.root.parent === P.space);
        const C = startGaitCheck(g);
        const legs = [];
        // Eric: out and back, a stop, a turn on the spot
        legs.push(
          (async () => {
            for (const [dx, dz] of [[3, 0], [3, 3], [0, 0]]) {
              const [x, z] = near(dx, dz);
              await new Promise((res) => {
                g.walker.goTo(x, z, res);
                g.walker.runTo = RUN;
              });
              await sleep(0.8);
            }
            g.walker.faceTo?.(e.x - 3, e.z);
          })(),
        );
        legs.push(
          (async () => {
            await sleep(0.5);
            for (const [dx, dz] of [[-2, 2], [1, 2.5], [1.2, 0.6]]) {
              await walkRig(g, mio, near(dx, dz), { speed: 1.1 });
              await sleep(0.7);
              await faceRig(g, mio, [e.x, e.z]);
            }
          })(),
        );
        if (other)
          legs.push(
            (async () => {
              const r = other[1],
                p = r.root.position,
                q0 = [p.x, p.z];
              await walkPerson(r, [reachableNear(P.nav, ...q0, q0[0] + 2 * K, q0[1] + 1.5 * K) || q0], { speed: 1.2 });
              await sleep(0.8);
              await walkPerson(r, [q0], { speed: 1.2 });
            })(),
          );
        const until = g.t + SECS;
        while (g.t < until) await sleep(0.25);
        await Promise.race([Promise.all(legs), sleep(1)]);
        const people = Object.fromEntries(
          Object.entries(C.people).map(([id, p]) => {
            const s = [...p.ratio].sort((a, b) => a - b);
            return [id, { win: p.windows, walk: p.walking, bad: p.bad, ratio: s.length ? s[s.length >> 1] : null }];
          }),
        );
        return { reports: C.reports(), windows: C.windows, people, other: other?.[0] };
      },
      { SECS, RUN },
    );
    const walkers = Object.entries(r.people).filter(([, p]) => p.walk);
    console.log(
      `${place} ${tag}: ${r.windows} windows, ${Object.keys(r.people).length} people in view, ${walkers.length} walked; walked: ${r.other || 'nobody'}`,
    );
    for (const [id, p] of walkers) console.log(`  ${id}: ${p.walk} walking windows, median ratio ${p.ratio}, bad ${p.bad}`);
    for (const l of r.reports) console.log('  BAD', l);
    if (r.reports.length) fails++;
    await page.screenshot({ path: `${out}/${place}.png` });
    await page.close();
  }
});
for (const e of errors) console.log('ERROR', e);
console.log(fails || errors.length ? 'FAIL' : 'PASS', tag, out);
process.exitCode = fails || errors.length ? 1 : 0;
