// Performance on a mid-range phone profile, with budgets from notes/PERF.md.
//   node game3d/tools/perf.mjs [--cpu 4] [--q 1] [--secs 8]      GL=gpu to render on the GPU (take the GPU lock)
// Profile: a 393 x 851 phone screen at DPR 2.75 (the game caps it at 2), touch, CPU throttled 4x in Chrome
// (DevTools' "mid-tier mobile"), and a 4G link for the loads (12 Mbit/s down, 70 ms). Cache off for every load.
// Measures: time and bytes to the title; time and bytes for each place opened on its own; then, per place, frame
// rate and frame-time spread over a few seconds of play, long tasks, draw calls and triangles per frame.
// Prints a table and anything over budget, and writes game3d/shots/perf/<build>.json.
// Headless limits: with SwiftShader the frame rate is software rendering (CPU-bound, far below a real phone GPU);
// with GL=gpu it's this machine's GPU (far above one). Draw calls, triangles and the CPU-throttled main thread are
// the numbers that carry over; the frame rate is a floor (SwiftShader) or a ceiling (GPU).
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { ensureBuild } from '../../tools/lib/build-stamp.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const CPU = +arg('cpu', 4), QUAL = arg('q', '1'), SECS = +arg('secs', 8);
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const build = ensureBuild().id;
const BUDGET = { titleMs: 8000, titleMB: 12, placeMs: 6000, dayMB: 40, fps: 30, p95: 50, calls: 250, tris: 300000, longTasks: 5 };
const GPU = process.env.GL === 'gpu';
const gl = GPU ? ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const b = await chromium.launch({ headless: true, args: [...gl, '--autoplay-policy=no-user-gesture-required'] });

async function open(url, { net = true } = {}) {
  const ctx = await b.newContext({ viewport: { width: 393, height: 851 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  if (net) await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 70, downloadThroughput: (12e6 / 8), uploadThroughput: (3e6 / 8) });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  const bytes = { total: 0, urls: new Map() };
  const reqs = new Map();
  cdp.on('Network.requestWillBeSent', (e) => reqs.set(e.requestId, e.request.url));
  cdp.on('Network.loadingFinished', (e) => { bytes.total += e.encodedDataLength; const u = reqs.get(e.requestId); if (u) bytes.urls.set(u.split('?')[0], e.encodedDataLength); });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const t0 = Date.now();
  await p.goto(url);
  return { ctx, p, cdp, bytes, errs, t0 };
}
const MB = (n) => +(n / 1048576).toFixed(2);
const res = { build, profile: { viewport: '393x851@2.75', cpu: CPU + 'x', net: '4G 12 Mbit/s 70 ms', gl: GPU ? 'gpu' : 'swiftshader', q: QUAL }, title: null, places: {} };
const all = new Map();

// 1. to the title
{
  const o = await open(`http://127.0.0.1:8771/game3d/index.html?q=${QUAL}`);
  await o.p.waitForFunction(() => document.body.classList.contains('at-title'), null, { timeout: 120000 }).catch(() => o.errs.push('title timeout'));
  res.title = { ms: Date.now() - o.t0, MB: MB(o.bytes.total), requests: o.bytes.urls.size, errors: o.errs };
  for (const [u, n] of o.bytes.urls) all.set(u, n);
  await o.ctx.close();
}
// 2. each place: load it on its own, then play a few seconds with the network back to normal
for (const place of ['train', 'gate', 'office']) {
  const o = await open(`http://127.0.0.1:8771/game3d/index.html?q=${QUAL}&place=${place}&skip`);
  await o.p.waitForFunction(() => window.__game && window.__game.place && window.__done, null, { timeout: 120000 }).catch(() => o.errs.push('place timeout'));
  const ms = Date.now() - o.t0;
  for (const [u, n] of o.bytes.urls) all.set(u, n);
  await o.cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await o.p.waitForTimeout(3000);
  const m = await o.p.evaluate(async (secs) => {
    const g = window.__game, r = g.renderer;
    // draw calls and triangles for one whole frame (all passes)
    r.info.autoReset = false; r.info.reset();
    await new Promise((x) => requestAnimationFrame(() => requestAnimationFrame(x)));
    const calls = r.info.render.calls, tris = r.info.render.triangles; r.info.autoReset = true;
    // visible meshes in the scene: roughly the draw calls of one plain pass (the frame above adds shadows and AO)
    let meshes = 0; g.place.scene.traverseVisible((o) => { if (o.isMesh || o.isLine || o.isPoints) meshes++; });
    let long = 0; const po = new PerformanceObserver((l) => { long += l.getEntries().length; }); try { po.observe({ type: 'longtask', buffered: false }); } catch { /* */ }
    const dts = []; let last = performance.now();
    await new Promise((done) => { const end = last + secs * 1000; const f = (t) => { dts.push(t - last); last = t; if (t < end) requestAnimationFrame(f); else done(); }; requestAnimationFrame(f); });
    po.disconnect();
    dts.shift(); dts.sort((a, b) => a - b);
    const mean = dts.reduce((a, b) => a + b, 0) / dts.length;
    const mem = performance.memory ? performance.memory.usedJSHeapSize : 0;
    return { meshes, fps: +(1000 / mean).toFixed(1), p50: +dts[Math.floor(dts.length * 0.5)].toFixed(1), p95: +dts[Math.floor(dts.length * 0.95)].toFixed(1), worst: +dts[dts.length - 1].toFixed(1), longTasks: long, calls, tris, heapMB: +(mem / 1048576).toFixed(1), px: [r.domElement.width, r.domElement.height], gpu: r.userData.gpu };
  }, SECS);
  res.places[place] = { loadMs: ms, loadMB: MB(o.bytes.total), ...m, errors: o.errs };
  await o.ctx.close();
}
await b.close();
res.dayMB = MB([...all.values()].reduce((a, n) => a + n, 0));
res.biggest = [...all.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([u, n]) => `${u.replace(/^.*\/game3d\//, '')} ${MB(n)} MB`);

// report
const over = [];
if (res.title.ms > BUDGET.titleMs) over.push(`title load ${res.title.ms} ms > ${BUDGET.titleMs}`);
if (res.title.MB > BUDGET.titleMB) over.push(`title download ${res.title.MB} MB > ${BUDGET.titleMB}`);
if (res.dayMB > BUDGET.dayMB) over.push(`whole day download ${res.dayMB} MB > ${BUDGET.dayMB}`);
console.log(`build ${build} | ${res.profile.viewport} | CPU ${res.profile.cpu} | ${res.profile.net} | ${res.profile.gl} | q=${QUAL}`);
console.log(`title: ${res.title.ms} ms, ${res.title.MB} MB, ${res.title.requests} requests`);
console.log('place   load ms  MB     fps   p50   p95   worst  long  calls  meshes  tris     heap');
for (const [n, r] of Object.entries(res.places)) {
  console.log(`${n.padEnd(7)} ${String(r.loadMs).padStart(7)}  ${String(r.loadMB).padEnd(5)}  ${String(r.fps).padStart(4)}  ${String(r.p50).padStart(4)}  ${String(r.p95).padStart(4)}  ${String(r.worst).padStart(5)}  ${String(r.longTasks).padStart(4)}  ${String(r.calls).padStart(5)}  ${String(r.meshes).padStart(6)}  ${String(r.tris).padStart(7)}  ${r.heapMB}`);
  if (r.loadMs > BUDGET.placeMs) over.push(`${n}: load ${r.loadMs} ms > ${BUDGET.placeMs}`);
  if (r.fps < BUDGET.fps) over.push(`${n}: ${r.fps} fps < ${BUDGET.fps}${GPU ? '' : ' (SwiftShader: software rendering, a floor)'}`);
  if (r.p95 > BUDGET.p95) over.push(`${n}: p95 frame ${r.p95} ms > ${BUDGET.p95}`);
  if (r.calls > BUDGET.calls) over.push(`${n}: ${r.calls} draw calls a frame (${r.meshes} visible meshes) > ${BUDGET.calls}`);
  if (r.tris > BUDGET.tris) over.push(`${n}: ${r.tris} triangles > ${BUDGET.tris}`);
  if (r.longTasks > BUDGET.longTasks * SECS / 10) over.push(`${n}: ${r.longTasks} long tasks in ${SECS} s`);
  if (r.errors.length) over.push(`${n}: page errors: ${r.errors.slice(0, 2).join(' | ')}`);
}
console.log(`whole day download: ${res.dayMB} MB; biggest: ${res.biggest.slice(0, 5).join(', ')}`);
res.over = over;
console.log(over.length ? 'OVER BUDGET:\n  ' + over.join('\n  ') : 'all within budget');
const outDir = path.join(G, 'shots/perf'); fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, `${build}-${res.profile.gl}.json`), JSON.stringify(res, null, 1));
