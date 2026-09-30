// Where a place's builder spends its time: runs it once in a page (CPU slowed like the phone) under the CPU profiler
// and prints the functions with the most time (inclusive), the builder's total, and its longest step between two
// yields when it is a generator.
//   node game3d/tools/perf/builder-profile.mjs <module> <export> [args JSON] [--gen] [--top 25]
//   e.g. node game3d/tools/perf/builder-profile.mjs scenes/plaza.js plazaSteps '[]' --gen
// BASE=<dir> for a worktree (default game3d), CPU=<rate> (default 4). Runs through tools/lib/browser-job.mjs.
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';

const argv = process.argv.slice(2);
const [mod, name, argsJson = '[]'] = argv.filter((a) => !a.startsWith('--') && !/^\d+$/.test(a));
const gen = argv.includes('--gen');
const top = +(argv[argv.indexOf('--top') + 1] || 25) || 25;
const base = process.env.BASE || 'game3d';
const CPU = +(process.env.CPU || 4);

await withBrowserJob('builder-profile', async (browser) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  // any page with the import map; the room is the lightest place
  await page.goto(`http://127.0.0.1:8771/${base}/index.html?place=dorms&skip&q=0`);
  await page.waitForFunction(() => window.__game && window.__game.place, null, { timeout: 120000 });
  await page.waitForTimeout(2000);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  // warm the module (and three's shader-free code paths) once, unprofiled
  const run = (warm) =>
    page.evaluate(
      async ({ url, name, args, gen, warm }) => {
        const m = await import(url);
        const t0 = performance.now();
        let longest = 0,
          steps = 0;
        if (gen) {
          const it = m[name](...args);
          for (;;) {
            const t = performance.now();
            const r = it.next();
            const d = performance.now() - t;
            if (d > longest) longest = d;
            steps++;
            if (r.done) break;
          }
        } else m[name](...args);
        return { ms: performance.now() - t0, longest, steps, warm };
      },
      { url: `/${base}/js/${mod}`, name, args: JSON.parse(argsJson), gen, warm },
    );
  await run(true);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  await cdp.send('Profiler.start');
  const res = await run(false);
  const { profile } = await cdp.send('Profiler.stop');
  // inclusive time per function (url:line name), each counted once per sample stack
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const parent = new Map();
  for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const dt = profile.timeDeltas;
  const incl = new Map();
  profile.samples.forEach((id, i) => {
    const seen = new Set();
    for (let n = id; n !== undefined; n = parent.get(n)) {
      const cf = byId.get(n).callFrame;
      const key = `${cf.functionName || '(anon)'} ${cf.url.split('/js/').pop() || cf.url}:${cf.lineNumber + 1}`;
      if (seen.has(key)) continue;
      seen.add(key);
      incl.set(key, (incl.get(key) || 0) + (dt[i] || 0) / 1000);
    }
  });
  console.log(`${mod} ${name}: ${res.ms.toFixed(0)} ms at CPU ${CPU}x` + (gen ? `, ${res.steps} steps, longest step ${res.longest.toFixed(0)} ms` : ''));
  for (const [k, ms] of [...incl].filter(([k]) => !/^\(|^ :|^evaluate/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, top))
    console.log(`  ${ms.toFixed(0).padStart(5)} ms  ${k}`);
  await ctx.close();
});
