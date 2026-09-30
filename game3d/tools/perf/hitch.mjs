// Preparation hitches: how much a place built in the background stalls the frames of the place being played.
// node game3d/tools/perf/hitch.mjs [w] [h] [from:to ...]   (default 1366 860 forecourt:office forecourt:plaza)
// Opens <from> (its own background preload switched off), lets it settle, then calls game.prepare(<to>) while
// recording every frame and every long task (over 50 ms) until the preparation and the draw-call pass are done.
// Prints per trip: preparation time, longest task, long tasks, worst frame and the 1% low (fps). BASE=<dir> for a
// worktree (default game3d), CPU=4 for a CPU slowed down 4x like perf.mjs's phone. Runs through tools/lib/browser-job.mjs (GPU slot; GL=soft for software rendering).
import fs from 'node:fs';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';

const args = process.argv.slice(2);
const [W, H] = [+(args[0] || 1366), +(args[1] || 860)];
const trips = (args.slice(2).length ? args.slice(2) : ['forecourt:office', 'forecourt:plaza']).map((t) => t.split(':'));
const base = process.env.BASE || 'game3d';
const out = [];
await withBrowserJob('perf-hitch', async (browser) => {
  for (const [from, to] of trips) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    const page = await ctx.newPage();
    if (+process.env.CPU > 1)
      await (await ctx.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: +process.env.CPU });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    // no preload of the next place on start: this tool starts it itself
    await page.route('**/js/main.js*', async (r) => {
      const res = await r.fetch();
      const src = await res.text();
      const line = 'if (NEXT[start]) setTimeout(() => prepare(NEXT[start]), 1500);';
      if (!src.includes(line)) throw new Error('main.js preload line not found');
      await r.fulfill({ response: res, body: src.replace(line, '') });
    });
    await page.addInitScript(() => {
      window.__lt = [];
      new PerformanceObserver((l) => window.__lt.push(...l.getEntries().map((e) => [e.startTime, e.duration]))).observe({
        type: 'longtask',
        buffered: true,
      });
      window.__fr = [];
      const f = (t) => (window.__fr.push(t), requestAnimationFrame(f));
      requestAnimationFrame(f);
    });
    await page.goto(`http://127.0.0.1:8771/${base}/index.html?place=${from}&skip&q=1`);
    await page.waitForFunction(() => window.__game?.place && window.__game.walker, null, { timeout: 60000 });
    await page.waitForTimeout(4000); // shaders compiled, start scene under way
    const r = await page.evaluate(async (to) => {
      const g = window.__game;
      if (g.prepared[to]) return { error: `${to} already prepared` };
      const t0 = performance.now();
      await g.prepare(to);
      const t1 = performance.now();
      // the draw-call pass (office) works in slices after prepare; wait until it's idle, then 1 s more
      await new Promise((res) => setTimeout(res, 2500));
      const t2 = performance.now();
      const fr = window.__fr.filter((t) => t >= t0 && t <= t2);
      const dts = fr.slice(1).map((t, i) => t - fr[i]).sort((a, b) => a - b);
      const lt = window.__lt.filter(([s, d]) => s + d >= t0 && s <= t2).map(([, d]) => d);
      const p99 = dts[Math.min(dts.length - 1, Math.floor(dts.length * 0.99))];
      return {
        prepMs: Math.round(t1 - t0),
        longest: Math.round(Math.max(0, ...lt)),
        longTasks: lt.length,
        worstFrame: Math.round(dts[dts.length - 1]),
        p99: +p99.toFixed(1),
        low1: +(1000 / p99).toFixed(1),
        median: +dts[dts.length >> 1].toFixed(1),
        frames: dts.length,
        slow: dts.filter((d) => d > 1.5 * dts[dts.length >> 1]).length,
        slowAt: fr.slice(1).map((t, i) => [Math.round(fr[i] - t0), Math.round(t - fr[i])]).filter(([, d]) => d > 25),
        prepEnd: Math.round(t1 - t0),
        look: g.prepared[to] && (await g.prepared[to]).place.look,
      };
    }, to);
    const row = { size: `${W}x${H}${+process.env.CPU > 1 ? ' cpu' + process.env.CPU + 'x' : ''}`, trip: `${from}->${to}`, ...r, errors };
    out.push(row);
    console.log(
      `${row.size} ${row.trip}: prepare ${r.prepMs} ms, longest task ${r.longest} ms, ${r.longTasks} long tasks, ` +
        `worst frame ${r.worstFrame} ms, ${r.slow}/${r.frames} slow frames, 1% low ${r.low1} fps (p99 ${r.p99} ms), median ${r.median} ms` +
        (r.look ? `, look ${r.look.ms} ms` : '') +
        (r.error ? ` ERROR ${r.error}` : '') +
        (errors.length ? ` page errors: ${errors.join(' | ')}` : ''),
    );
    await ctx.close();
  }
});
const dir = new URL('../../shots/perf/', import.meta.url);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(new URL(`hitch-${W}x${H}-cpu${process.env.CPU || 1}-${Date.now()}.json`, dir), JSON.stringify(out, null, 2));
