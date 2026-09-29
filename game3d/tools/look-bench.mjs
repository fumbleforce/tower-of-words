// What the world look (js/look/) costs, per place: draw calls and triangles of one frame before (?plainlook) and after,
// with the draw-call pass (js/perf/batch.js) hooked in as the perf tools do, and the frame time with Surface detail
// off and on in the same page (the setting, flipped at run time).
//   node game3d/tools/look-bench.mjs [train,gate,office] [--phone | --desk] [--frames 90] [--cpu 1] [--out file.json]
// Phone: 393 x 851 at DPR 2.75, q=1 (as tools/perf.mjs). GL=gpu renders on the GPU (take the GPU lock); SwiftShader
// renders in software, where the per-pixel cost of the patterns shows much more than on a GPU.
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const VAL = new Set(['--frames', '--cpu', '--out']);
const places = (argv.find((a, i) => !a.startsWith('--') && !VAL.has(argv[i - 1])) || 'train,gate,office').split(',');
const DESK = argv.includes('--desk'), FRAMES = +arg('frames', 90), CPU = +arg('cpu', 1), OUT = arg('out', '');
const GPU = process.env.GL === 'gpu';
const gl = GPU ? ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu', '--disable-gpu-vsync', '--disable-frame-rate-limit'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const b = await chromium.launch({ headless: true, args: gl });
const view = DESK ? { viewport: { width: 1366, height: 860 }, deviceScaleFactor: 1 } : { viewport: { width: 393, height: 851 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true };
const res = {};

async function open(place, extra) {
  const ctx = await b.newContext(view);
  await ctx.route('**/js/places/lifecycle.js*', async (route) => { const r = await route.fetch(); const body = (await r.text()).replace('place.name = name;', "place.name = name; (await import('../perf/batch.js')).optimizePlace(place, { game });"); await route.fulfill({ response: r, body }); });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  if (CPU > 1) { const s = await ctx.newCDPSession(p); await s.send('Emulation.setCPUThrottlingRate', { rate: CPU }); }
  const t0 = Date.now();
  await p.goto(`http://127.0.0.1:8771/game3d/index.html?q=${DESK ? 2 : 1}&place=${place}&skip${extra}`);
  await p.waitForFunction(() => window.__game && window.__game.place && window.__done, null, { timeout: 300000 });
  const load = Date.now() - t0;
  await p.waitForTimeout(10000);   // the draw-call pass merges in slices
  return { ctx, p, load };
}
const count = (p) => p.evaluate(() => new Promise((ok) => {
  const R = window.__game.renderer; R.info.autoReset = false;
  requestAnimationFrame(() => { setTimeout(() => { R.info.reset(); requestAnimationFrame(() => setTimeout(() => { ok({ calls: R.info.render.calls, tris: R.info.render.triangles }); R.info.autoReset = true; })); }); });
}));
const time = (p, n) => p.evaluate((n) => new Promise((ok) => {
  const ts = []; let last = 0;
  const f = (t) => { if (last) ts.push(t - last); last = t; if (ts.length < n) requestAnimationFrame(f); else { ts.sort((a, c) => a - c); ok({ mean: +(ts.reduce((a, c) => a + c, 0) / ts.length).toFixed(2), p50: +ts[ts.length >> 1].toFixed(2), p95: +ts[Math.floor(ts.length * 0.95)].toFixed(2) }); } };
  requestAnimationFrame(f);
}), n);
const setSurf = (p, on) => p.evaluate(async (on) => { const S = await import('/game3d/js/settings.js'); S.setSetting('surfaces', on); await new Promise((ok) => setTimeout(ok, 1500)); }, on);

for (const place of places) {
  const r = res[place] = {};
  { const { ctx, p, load } = await open(place, '&plainlook'); r.before = { ...(await count(p)), load, frame: await time(p, FRAMES) }; await ctx.close(); }
  { const { ctx, p, load } = await open(place, '');
    r.after = { ...(await count(p)), load, look: await p.evaluate(() => window.__game.place.look) };
    await setSurf(p, true); r.after.frameSurfOn = await time(p, FRAMES);
    await setSurf(p, false); r.after.frameSurfOff = await time(p, FRAMES); r.after.offCount = await count(p);
    await setSurf(p, true); r.after.frameSurfOn2 = await time(p, FRAMES);
    await ctx.close(); }
  console.log(place, JSON.stringify(r));
}
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ gpu: GPU, desk: DESK, cpu: CPU, res }, null, 1));
await b.close();
