// Hitches while walking with the chibi crowd: a phone (393 x 851, DPR 2.75, touch, CPU 4x slower) opens a place at a
// busy time of day, Eric walks from one open spot to another for a minute, and every frame is timed. Prints the
// median, the 1% and 0.1% frame times, the frames over 50 and 100 ms, and for each long frame what happened in it:
// new shader programs, new textures or geometries, long tasks, crowd walkers coming in or going.
//   node game3d/tools/chibi-hitch.mjs [place:period ...]   Q=0,1 SECS=60 CPU=4 SIZE=phone|desktop QS=&chibi=0 PROFILE=1
// BASE=.claude/worktrees/<name>/game3d for a worktree. Writes game3d/shots/chibi/hitch-<tag>.json (TAG=, default run).
import fs from 'node:fs';
import path from 'node:path';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';

const specs = process.argv.slice(2).length ? process.argv.slice(2) : ['plaza:lunch', 'forecourt:morning'];
const QS = (process.env.Q || '0,1').split(',');
const SECS = +(process.env.SECS || 60);
const CPU = +(process.env.CPU || 4);
const phone = (process.env.SIZE || 'phone') === 'phone';
const view = phone
  ? { viewport: { width: 393, height: 851 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true }
  : { viewport: { width: 1366, height: 860 }, deviceScaleFactor: 1 };
const base = `http://127.0.0.1:8771/${process.env.BASE || 'game3d'}/index.html`;
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const rows = [];
const PROFILE = !!process.env.PROFILE; // PROFILE=1: a CPU profile, and where the time went in the long tasks

// the long tasks found in the profile itself (runs of samples outside idle and the program's idle loop over 50 ms),
// and the functions that took the most of their time
function hot(prof) {
  const byId = new Map(prof.nodes.map((n) => [n.id, n]));
  const parent = new Map();
  for (const n of prof.nodes) for (const c of n.children || []) parent.set(c, n);
  const idle = (n) => ['(idle)', '(program)'].includes(n.callFrame.functionName);
  const self = new Map();
  let run = [];
  const flush = () => {
    const ms = run.reduce((a, [, d]) => a + d, 0) / 1000;
    if (ms > 50)
      for (const [n, d] of run) {
        // the function itself, and the nearest game code (js/, not vendor/) that called it
        const name = (f) => `${f.functionName || '(anon)'} ${f.url.split('/').pop().split('?')[0]}:${f.lineNumber + 1}`;
        let c = n;
        while (c && !(/\/js\//.test(c.callFrame.url) && !/vendor/.test(c.callFrame.url))) c = parent.get(c.id);
        let c2 = c && parent.get(c.id);
        while (c2 && !(/\/js\//.test(c2.callFrame.url) && !/vendor/.test(c2.callFrame.url))) c2 = parent.get(c2.id);
        const k = `${name(n.callFrame)} < ${c ? name(c.callFrame) : '-'} < ${c2 ? name(c2.callFrame) : '-'}`;
        self.set(k, (self.get(k) || 0) + d / 1000);
      }
    run = [];
  };
  prof.samples.forEach((id, i) => {
    const d = prof.timeDeltas[i + 1] || 0,
      n = byId.get(id);
    if (idle(n)) flush();
    else run.push([n, d]);
  });
  flush();
  return [...self].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => [k, Math.round(v)]);
}
await withBrowserJob(
  'chibi-hitch',
  async (browser) => {
    for (const q of QS)
      for (const spec of specs) {
        const [place, period] = spec.split(':');
        const ctx = await browser.newContext(view);
        const p = await ctx.newPage();
        const cdp = await ctx.newCDPSession(p);
        if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
        const errs = [];
        p.on('pageerror', (e) => errs.push(e.message));
        await p.addInitScript(() => {
          window.__lt = [];
          new PerformanceObserver((l) => window.__lt.push(...l.getEntries().map((e) => [e.startTime, e.duration]))).observe({
            type: 'longtask',
            buffered: true,
          });
        });
        await p.goto(`${base}?q=${q}&place=${place}&skip${process.env.QS || ''}`);
        await p.waitForFunction(() => window.__game?.place && window.__done, null, { timeout: 180000 });
        if (PROFILE) {
          await cdp.send('Profiler.enable');
          await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
          await cdp.send('Profiler.start');
        }
        const r = await p.evaluate(
          async ({ period, secs }) => {
            const g = window.__game,
              P = g.place,
              ren = g.renderer;
            if (period) {
              const v = document.querySelector('script[src*="main.js"]').src.split('main.js')[1];
              const { sim } = await import('./js/sim.js' + v);
              sim.period = period;
              P.onPeriod?.(period);
              P.ambient?.enter(period);
            }
            await new Promise((ok) => setTimeout(ok, 4000)); // settled: the first walkers out
            const nav = P.nav;
            const spot = () => {
              for (let k = 0; k < 200; k++) {
                const x = nav.x0 + Math.random() * nav.nx * nav.cell,
                  z = nav.z0 + Math.random() * (nav.nz || nav.nx) * nav.cell;
                const e = g.player.root.position;
                const d = Math.hypot(x - e.x, z - e.z);
                if (d > 4 && d < 14 && nav.free(x, z, nav.R + 0.05)) return [x, z];
              }
              return null;
            };
            const frames = [];
            const crowd = () => (P.crowd || []).filter((r) => r.root.visible).length;
            let last = performance.now(),
              stop = false;
            const tick = () => {
              const now = performance.now();
              const m = ren.info.memory;
              frames.push([now, now - last, ren.info.programs?.length || 0, m.textures, m.geometries, crowd()]);
              last = now;
              if (!stop) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
            const t0 = performance.now();
            let walks = 0;
            while (performance.now() - t0 < secs * 1000) {
              const to = spot();
              if (to) {
                g.walker.goTo(to[0], to[1]);
                walks++;
              }
              const until = performance.now() + 7000;
              await new Promise((ok) => {
                const w = () => {
                  const e = g.player.root.position;
                  if (!to || Math.hypot(e.x - to[0], e.z - to[1]) < 0.4 || performance.now() > until) ok();
                  else setTimeout(w, 200);
                };
                w();
              });
            }
            stop = true;
            const ft = frames.slice(1).map((f) => f[1]);
            const s = [...ft].sort((a, b) => a - b);
            const at = (k) => +s[Math.min(s.length - 1, Math.floor(k * s.length))].toFixed(1);
            const long = [];
            for (let i = 1; i < frames.length; i++) {
              const [t, d, pr, tx, ge, cr] = frames[i],
                b = frames[i - 1];
              if (d < 50) continue;
              const lt = window.__lt.filter(([s0, dur]) => s0 < t && s0 + dur > t - d).map(([, dur]) => Math.round(dur));
              long.push({
                at: +((t - t0) / 1000).toFixed(1),
                ms: Math.round(d),
                programs: pr - b[2],
                textures: tx - b[3],
                geometries: ge - b[4],
                crowd: cr - b[5],
                longTasks: lt,
              });
            }
            return {
              frames: ft.length,
              walks,
              median: at(0.5),
              p99: at(0.99),
              p999: at(0.999),
              worst: +s[s.length - 1].toFixed(1),
              over50: ft.filter((x) => x > 50).length,
              over100: ft.filter((x) => x > 100).length,
              programs: [frames[1][2], frames[frames.length - 1][2]],
              textures: [frames[1][3], frames[frames.length - 1][3]],
              long,
            };
          },
          { period, secs: SECS },
        );
        if (PROFILE) r.hot = hot((await cdp.send('Profiler.stop')).profile);
        rows.push({ q, place: spec, ...r, errors: errs });
        console.log(
          `q${q} ${spec.padEnd(18)} median ${r.median} ms, 1% ${r.p99} ms, 0.1% ${r.p999} ms, worst ${r.worst} ms, >50 ms ${r.over50}, >100 ms ${r.over100}, programs ${r.programs.join('>')}, textures ${r.textures.join('>')}${errs.length ? ' ERR ' + errs.join(' | ') : ''}`,
        );
        for (const l of r.long) console.log('   ', JSON.stringify(l));
        if (r.hot) console.log('   in the long tasks (self ms, function):\n' + r.hot.map((h) => `      ${h[1]}  ${h[0]}`).join('\n'));
        await ctx.close();
      }
  },
  { timeoutMs: 1800000 },
);
fs.mkdirSync(path.join(G, 'shots/chibi'), { recursive: true });
fs.writeFileSync(path.join(G, `shots/chibi/hitch-${process.env.TAG || 'run'}.json`), JSON.stringify(rows, null, 1));
