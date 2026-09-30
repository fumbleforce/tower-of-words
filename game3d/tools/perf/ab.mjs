// Before/after for the draw-call pass (js/perf/batch.js) on the phone profile, in one page per place so both
// sides see exactly the same moment:
//   - draw calls and triangles for one whole frame, the pass off and on
//   - frame rate and p95 over a few seconds of play, off and on (CPU throttled 4x)
//   - pixel diffs of the play camera, off and on, at the start and again after some play (game paused for the
//     shot, so nothing moves between the two)
// places/lifecycle.js is served with the one-line hook (notes/production-requests.md) so the pass runs where it will in the
// build: right after the look. --nohook serves places/lifecycle.js as it is and calls the pass after load instead.
//   node game3d/tools/perf/ab.mjs [train,gate,office] [--q 1] [--secs 6] [--play 12] [--cpu 4] [--out dir] [--test]
// Take /tmp/claude-1000/browser.lock first (sh game3d/tools/with-browser-lock.sh perf node ...). GL=gpu renders on
// the GPU (GPU lock too). Writes <out>/<place>-{off,on,diff}-<n>.png and <out>/ab.json.
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const flag = (k) => argv.includes('--' + k);
const VAL = new Set(['--q', '--secs', '--play', '--cpu', '--out', '--extra']);
const places = (argv.find((a, i) => !a.startsWith('--') && !VAL.has(argv[i - 1])) || 'train,gate,office').split(',');
const QUAL = arg('q', '1'), SECS = +arg('secs', 6), PLAY = +arg('play', 12), CPU = +arg('cpu', 4);
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUT = path.resolve(arg('out', path.join(G, 'shots/perf/ab')));
fs.mkdirSync(OUT, { recursive: true });
const HOOK = !flag('nohook');
const extra = arg('extra', '');
const GPU = process.env.GL === 'gpu';
const BASE = process.env.BASE || 'game3d'; // a worktree's game3d, as the review server sees it
const gl = GPU ? ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu', '--disable-gpu-vsync', '--disable-frame-rate-limit'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const b = await chromium.launch({ headless: true, args: [...gl, '--autoplay-policy=no-user-gesture-required'] });

// the hook as requested of the builder: after `place.name = name;` in prepare()
// right after the look, where the lifecycle runs the pass for the places in BATCHED (a no-op for those)
const HOOK_AT = 'await sliced(lookSteps(place, game));';
const HOOK_LINE = HOOK_AT + " (await import('../perf/batch.js')).optimizePlace(place, { game });";
async function withHook(route) {
  const r = await route.fetch(); let body = await r.text();
  if (!body.includes(HOOK_AT)) throw new Error('hook point not found in places/lifecycle.js');
  body = body.replace(HOOK_AT, HOOK_LINE);
  await route.fulfill({ response: r, body });
}

// pixel diff in a blank page: mean abs difference per channel, share of pixels over 8/255, max
const cmp = await (await b.newContext()).newPage();
async function diff(a, c, file) {
  return cmp.evaluate(async ([a, c]) => {
    const load = (s) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = 'data:image/png;base64,' + s; });
    const [ia, ic] = await Promise.all([load(a), load(c)]);
    const w = ia.width, h = ia.height, cv = new OffscreenCanvas(w, h), x = cv.getContext('2d');
    x.drawImage(ia, 0, 0); const A = x.getImageData(0, 0, w, h).data;
    x.drawImage(ic, 0, 0); const C = x.getImageData(0, 0, w, h).data;
    const D = new ImageData(w, h); let sum = 0, over = 0, max = 0;
    for (let i = 0; i < A.length; i += 4) {
      const d = Math.max(Math.abs(A[i] - C[i]), Math.abs(A[i + 1] - C[i + 1]), Math.abs(A[i + 2] - C[i + 2]));
      sum += d; if (d > 8) over++; if (d > max) max = d;
      const v = Math.min(255, d * 8); D.data[i] = v; D.data[i + 1] = v; D.data[i + 2] = v; D.data[i + 3] = 255;
    }
    x.putImageData(D, 0, 0);
    const blob = await cv.convertToBlob({ type: 'image/png' });
    const buf = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { mean: +(sum / (A.length / 4)).toFixed(3), over8: +(over / (A.length / 4) * 100).toFixed(3), max, png: btoa(s) };
  }, [a, c]).then((r) => { fs.writeFileSync(file, Buffer.from(r.png, 'base64')); delete r.png; return r; });
}

const res = { gl: GPU ? 'gpu' : 'swiftshader', q: QUAL, cpu: CPU, hook: HOOK, places: {} };
for (const place of places) {
  const ctx = await b.newContext({ viewport: { width: 393, height: 851 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true });
  if (HOOK) await ctx.route('**/js/places/lifecycle.js*', withHook);
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (/perf batch/.test(m.text()) || m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
  const cdp = await ctx.newCDPSession(p);
  const t0 = Date.now();
  await p.goto(`http://127.0.0.1:8771/${BASE}/index.html?q=${QUAL}&place=${place}&skip${flag('test') ? '&test=fast' : ''}${extra}`);
  await p.waitForFunction(() => window.__game && window.__game.place && window.__done, null, { timeout: 180000 });
  const loadMs = Date.now() - t0;
  if (!HOOK) await p.evaluate(async (base) => { const m = await import(`/${base}/js/perf/batch.js`); m.optimizePlace(window.__game.place, { game: window.__game }); }, BASE);
  await p.waitForTimeout(3000);
  const frame = () => p.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(ok)))));
  const count = () => p.evaluate(async () => {
    // exactly one frame: reset in a callback that runs after this tick's render, read after the next one
    // __perfHold: the game's own recorder (js/perf/metrics.js, on with --test) keeps off the counters meanwhile
    const r = window.__game.renderer; window.__perfHold = true; r.info.autoReset = false;
    await new Promise((x) => requestAnimationFrame(() => { r.info.reset(); requestAnimationFrame(x); }));
    const o = { calls: r.info.render.calls, tris: r.info.render.triangles }; r.info.autoReset = true; window.__perfHold = false;
    let meshes = 0; window.__game.place.scene.traverseVisible((m) => { if ((m.isMesh || m.isLine || m.isPoints) && m.layers.mask) meshes++; }); o.meshes = meshes; return o;
  });
  const grab = () => p.evaluate(() => new Promise((ok) => requestAnimationFrame(() => { const c = window.__game.renderer.domElement; ok(c.toDataURL('image/png').split(',')[1]); })));
  const toggle = (on) => p.evaluate((on) => window.__game.place.perf.toggle(on), on);
  const shots = [];
  async function ab(n) {
    await p.evaluate(() => { window.__game.paused = true; });
    await frame();
    await toggle(false); await frame(); const off = await count(); const so = Buffer.from(await grab(), 'base64'); await frame(); const so2 = Buffer.from(await grab(), 'base64');
    await toggle(true); await frame(); const on = await count(); const sn = Buffer.from(await grab(), 'base64');
    fs.writeFileSync(path.join(OUT, `${place}-off-${n}.png`), so); fs.writeFileSync(path.join(OUT, `${place}-on-${n}.png`), sn);
    const d = await diff(so.toString('base64'), sn.toString('base64'), path.join(OUT, `${place}-diff-${n}.png`));
    const noise = await diff(so.toString('base64'), so2.toString('base64'), path.join(OUT, `${place}-noise-${n}.png`));
    await p.evaluate(() => { window.__game.paused = false; });
    shots.push({ n, off, on, diff: d, noise });
    console.log(place, 'shot', n, 'off', JSON.stringify(off), 'on', JSON.stringify(on), 'diff', JSON.stringify(d), 'noise', JSON.stringify(noise));
  }
  await ab(0);
  // play: walk about a bit so the camera and anything the place animates move
  await p.evaluate(async (ms) => {
    const g = window.__game, w = g.walker, s = g.player.root.position;
    const pts = [[s.x + 1.2, s.z], [s.x + 1.2, s.z - 1.2], [s.x - 1, s.z - 1], [s.x, s.z]];
    const end = performance.now() + ms; let i = 0;
    while (performance.now() < end) { const q = pts[i++ % pts.length]; try { w.goTo(q[0], q[1]); } catch { /* */ } await new Promise((r) => setTimeout(r, 2500)); }
  }, PLAY * 1000);
  await ab(1);
  // frame rate, off then on, CPU throttled (skip with --secs 0)
  const fps = {};
  if (SECS > 0) {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  for (const on of [false, true]) {
    await toggle(on);
    await frame();
    fps[on ? 'on' : 'off'] = await p.evaluate(async (secs) => {
      let long = 0; const po = new PerformanceObserver((l) => { long += l.getEntries().length; }); try { po.observe({ type: 'longtask', buffered: false }); } catch { /* */ }
      const dts = []; let last = performance.now();
      await new Promise((done) => { const end = last + secs * 1000; const f = (t) => { dts.push(t - last); last = t; if (t < end) requestAnimationFrame(f); else done(); }; requestAnimationFrame(f); });
      po.disconnect(); dts.shift(); dts.sort((a, c) => a - c);
      const mean = dts.reduce((a, c) => a + c, 0) / dts.length;
      return { fps: +(1000 / mean).toFixed(1), p50: +dts[Math.floor(dts.length * 0.5)].toFixed(1), p95: +dts[Math.floor(dts.length * 0.95)].toFixed(1), worst: +dts[dts.length - 1].toFixed(1), long };
    }, SECS);
  }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  }
  const st = await p.evaluate(() => { const P = window.__game.place.perf; const s = { ...P.stats }; s.movers = P.movers.size; let d = 0, w = 0, bt = 0; for (const r of P.info.values()) { if (r.state === 'dynamic') d++; else if (r.state === 'wait') w++; else if (r.state === 'batched') bt++; } Object.assign(s, { dynamic: d, waiting: w, batchedNow: bt }); s.why = P.why(); s.movedNames = [...P.movers].slice(0, 40).map((o) => { const a = []; for (let x = o; x && x.parent; x = x.parent) a.push(x.name || x.type[0] + x.parent.children.indexOf(x)); return a.reverse().join('/') + (o.isMesh ? ' mesh' : ''); }); s.buildMs = +s.buildMs.toFixed(1); s.checkMs = +s.checkMs.toFixed(1); return s; });
  res.places[place] = { loadMs, shots, fps, stats: st, errors: errs };
  console.log(place, 'load', loadMs, 'fps', JSON.stringify(fps), 'stats', JSON.stringify(st), errs.length ? 'ERR ' + errs.slice(0, 3).join(' | ') : '');
  await ctx.close();
}
await b.close();
fs.writeFileSync(path.join(OUT, 'ab.json'), JSON.stringify(res, null, 1));
