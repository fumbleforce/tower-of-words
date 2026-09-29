// Before/after stills of the world look (js/look/: surface patterns, baked light, modelled detail) in every day-1 place,
// at the play camera (desktop and phone) and close up, with draw calls and triangles of the frame.
//   node game3d/tools/look-shots.mjs <outdir> [variants] [--places train,gate,office] [--only desk,phone,close] [--par 3]
//   variants: comma list of name=query, default "before=plainlook,after=" (query added to the game URL)
// Output: <outdir>/<variant>/<place>-<desk|phone|close>.png and <outdir>/stats.json. GL=gpu renders on the GPU.
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const PLACES = opt('places', 'train,gate,office').split(','), ONLY = opt('only', 'desk,phone,close').split(','), PAR = +opt('par', 3);
const HOOK = argv.includes('--batch'); if (HOOK) argv.splice(argv.indexOf('--batch'), 1);
const [out, vlist = 'before=plainlook,after='] = argv;
const variants = vlist.split(',').map((v) => { const i = v.indexOf('='); return [v.slice(0, i), v.slice(i + 1).replace(/\+/g, '&')]; });   // '+' joins several flags
const gl = process.env.GL === 'gpu' ? ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const b = await chromium.launch({ headless: true, args: gl });
const HIDE = '#ui, #marks, #build, .marks, .mk, #title, #boot, #hud { display: none !important; }';
// close-up spots (x, z, zoom): desks, chairs and plants in the office; plants and benches at the gate; seats on the train
const CLOSE = { office: [-1.2, -3.1, 5], gate: [-4.7, 3.2, 3.6], train: [0.8, 0, 3.2] };
const stats = {};
const jobs = [];
for (const [v, q] of variants) {
  fs.mkdirSync(`${out}/${v}`, { recursive: true });
  for (const place of PLACES) {
    if (ONLY.includes('desk')) jobs.push({ v, q, place, kind: 'desk', w: 1366, h: 860, dpr: 1, mobile: false });
    if (ONLY.includes('phone')) jobs.push({ v, q, place, kind: 'phone', w: 390, h: 844, dpr: 2, mobile: true });
    if (ONLY.includes('close')) jobs.push({ v, q, place, kind: 'close', w: 1366, h: 860, dpr: 1, mobile: false });
  }
}
async function run(j) {
  const ctx = await b.newContext({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: j.dpr, isMobile: j.mobile, hasTouch: j.mobile });
  if (HOOK) await ctx.route('**/js/places/lifecycle.js*', async (route) => { const r = await route.fetch(); const body = (await r.text()).replace('place.name = name;', "place.name = name; (await import('../perf/batch.js')).optimizePlace(place, { game });"); await route.fulfill({ response: r, body }); });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
  await p.goto(`http://127.0.0.1:8771/game3d/index.html?cap&q=${j.mobile ? 1 : 2}&place=${j.place}&skip${j.q ? '&' + j.q : ''}`);
  await p.waitForFunction(() => window.__done, null, { timeout: 240000 }).catch(() => errs.push('timeout'));
  await p.addStyleTag({ content: HIDE }).catch(() => {});
  if (j.kind === 'close') await p.evaluate(([x, z, k]) => { const g = window.__game, c = g.place.cam; c.closeOn([x, z], k); c.snap(g.player.root.position); }, CLOSE[j.place]).catch((e) => errs.push(e.message));
  await p.waitForTimeout(HOOK ? 9000 : 1500);
  const s = await p.evaluate(async () => {
    const g = window.__game, R = g.renderer;
    const old = R.info.autoReset; R.info.autoReset = false;
    await new Promise((x) => requestAnimationFrame(() => requestAnimationFrame(x)));
    R.info.reset();
    await new Promise((x) => requestAnimationFrame(x));
    const r = { calls: R.info.render.calls, tris: R.info.render.triangles, programs: R.info.programs ? R.info.programs.length : 0, look: g.place.look || null };
    R.info.autoReset = old;
    return r;
  }).catch((e) => ({ err: e.message }));
  await p.screenshot({ path: `${out}/${j.v}/${j.place}-${j.kind}.png`, timeout: 300000 }).catch((e) => errs.push('shot ' + e.message.split('\n')[0]));
  stats[`${j.v}/${j.place}-${j.kind}`] = { ...s, errs };
  console.log(`${j.v} ${j.place}-${j.kind}`, JSON.stringify(s), errs.length ? 'ERR ' + errs.slice(0, 3).join(' | ') : 'ok');
  await ctx.close();
}
await Promise.all(Array.from({ length: PAR }, async () => { while (jobs.length) await run(jobs.shift()); }));
fs.writeFileSync(`${out}/stats.json`, JSON.stringify(stats, null, 1));
await b.close();
