// What a frame in play costs the CPU: the world's step (people, crowd, camera, markers) and three's side of the render
// (culling, sorting, uniforms, the draw calls), and the functions that take the most of it.
//   node game3d/tools/perf/cpu-frame.mjs [forecourt,plaza,gate] [--q 2] [--secs 8] [--top 25] [--w 1536 --h 864]
//        [--at x,z,face] [--json out.json] [--micro N]
// --micro N: instead of play, the CPU time of the frame's parts on their own (micro() below), median of N runs.
// --trip from>to: a walk from one place into the next as in play (the next place prepared first and left to settle, as
// the game does it ahead), profiled from the walk out to 2 s after arriving: the long tasks (over 50 ms) and the
// functions with the most time including what they call. The 3D view is 320 x 180 at low quality, so the software
// GL's drawing doesn't take the CPU from the page.
// Each place is opened on its own (?place=<name>&cap) and then run as in play (window.__run): people walk and the
// crowd moves; Eric stands. The 3D view is drawn at 160 x 90 (?w=&h=) so the GPU's work, on software GL here, stays
// out of the way; the CPU's work per frame doesn't depend on the size. Step and render are timed with
// performance.now() around game.step and the post chain's render; a CPU profile (Chrome's sampling profiler) over the
// same seconds gives the costliest functions by their own time.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf('--' + k);
  return i >= 0 ? argv[i + 1] : d;
};
const VAL = new Set(['--q', '--secs', '--top', '--w', '--h', '--json', '--at', '--micro', '--trip']);
const places = (argv.find((a, i) => !a.startsWith('--') && !VAL.has(argv[i - 1])) || 'forecourt,plaza,gate').split(',');
const Q = arg('q', '2'),
  SECS = +arg('secs', 8),
  TOP = +arg('top', 25),
  W = +arg('w', 1536),
  H = +arg('h', 864),
  AT = arg('at', ''),
  MICRO = +arg('micro', 0),
  TRIP = arg('trip', '');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const TYPES = {
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.html': 'text/html',
  '.css': 'text/css',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.glb': 'model/gltf-binary',
  '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.ktx2': 'image/ktx2',
};
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT)) return res.writeHead(403).end();
  fs.readFile(p, (err, data) => {
    if (err) return res.writeHead(404).end();
    res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }).end(data);
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});

function setup(at) {
  const g = globalThis.__game;
  if (at) {
    const [x, z, face] = at.split(',').map(Number);
    g.player.root.position.set(x, g.player.root.position.y, z);
    if (!Number.isNaN(face)) g.walker.facing = g.player.root.rotation.y = face;
    g.place.cam?.snap?.(g.player.root.position);
  }
  const t = (globalThis.__cpu = { step: [], render: [], on: false });
  const step = g.step;
  // main.js's loop calls its own step(); game.step is the same function, so time it through the place's update and
  // the loop's whole tick instead: the post chain's render is wrapped, and the tick is everything between renders
  const post = g.view.post,
    render = post.render;
  let tickStart = 0;
  const raf = globalThis.requestAnimationFrame;
  post.render = function () {
    const a = performance.now();
    const out = render.call(this);
    if (t.on) {
      t.render.push(performance.now() - a);
      t.step.push(a - tickStart);
    }
    return out;
  };
  // the loop's frame starts with the rAF callback; note when each starts
  globalThis.requestAnimationFrame = (cb) => raf((ts) => ((tickStart = performance.now()), cb(ts)));
  void step;
  globalThis.__run = true; // ?cap holds the world still; this lets it run as in play
}

// In the page: the CPU side of the frame's parts, each run alone with the GPU idle before it (a 1x1 read waits for it),
// so a slow GPU (software GL here) doesn't hold the CPU up: the scene graph's matrices, and three's render of the
// scene (culling, sorting, state and uniforms, the draw calls) with and without the shadow map, and the AO's own
// draw of the scene's normals when AO is on. Times are per call, the median of `n`.
function micro(n) {
  const g = globalThis.__game,
    r = g.renderer,
    scene = g.place.scene,
    cam = g.place.camera;
  const one = new g.view.composer.renderTarget1.constructor(1, 1),
    px = new Uint8Array(4);
  const idle = () => {
    r.setRenderTarget(one);
    r.clear();
    r.readRenderTargetPixels(one, 0, 0, 1, 1, px);
  };
  const time = (f) => {
    const t = [];
    for (let i = 0; i < n; i++) {
      idle();
      const a = performance.now();
      f();
      t.push(performance.now() - a);
    }
    idle();
    return +t.sort((x, y) => x - y)[t.length >> 1].toFixed(2);
  };
  let objects = 0,
    auto = 0,
    meshes = 0;
  scene.traverse((o) => {
    objects++;
    if (o.matrixAutoUpdate) auto++;
    if (o.isMesh) meshes++;
  });
  const rt = new g.view.composer.renderTarget1.constructor(64, 64);
  const draw = (shadows) => () => {
    r.shadowMap.needsUpdate = shadows;
    r.setRenderTarget(rt);
    r.render(scene, cam);
  };
  const out = {
    objects,
    autoMatrix: auto,
    meshes,
    matrices: time(() => scene.updateMatrixWorld()),
    render: time(draw(false)),
    renderWithShadows: time(draw(true)),
    calls: r.info.render.calls,
  };
  const ao = g.view.post.gtao;
  if (ao?.enabled) {
    const rb = g.view.composer.readBuffer;
    out.aoPass = time(() => ao.render(r, g.view.composer.writeBuffer, rb));
  }
  r.setRenderTarget(null);
  rt.dispose();
  one.dispose();
  return out;
}

// self and inclusive time per function (name file:line) from a CPU profile
function profileTimes(profile) {
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const parent = new Map();
  for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const label = (n) => {
    const f = n.callFrame;
    return `${f.functionName || '(anon)'} ${f.url.replace(/^.*\/game3d\//, '').replace(/\?v=[^:]*/, '')}:${f.lineNumber + 1}`;
  };
  const self = new Map(),
    incl = new Map();
  profile.samples.forEach((id, i) => {
    const d = (profile.timeDeltas[i] || 0) / 1000;
    let n = byId.get(id);
    self.set(label(n), (self.get(label(n)) || 0) + d);
    const seen = new Set();
    for (; n; n = byId.get(parent.get(n.id))) {
      const k = label(n);
      if (seen.has(k)) continue;
      seen.add(k);
      incl.set(k, (incl.get(k) || 0) + d);
    }
  });
  const top = (m, n) =>
    [...m.entries()]
      .filter(([k]) => !/^\((root|idle|program)\)/.test(k))
      .sort((a, b) => b[1] - a[1])
      .slice(0, n);
  return { self, incl, top };
}

async function trip(spec) {
  const [from, to] = spec.split('>');
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => /decode audio/.test(e.message) || errors.push(e.message));
  // no preload of the next place on start: the trip prepares it itself (as tools/perf/hitch.mjs)
  await page.route('**/js/main.js*', async (r) => {
    const res = await r.fetch();
    const line = 'if (NEXT[start]) setTimeout(() => prepare(NEXT[start]), 1500);';
    await r.fulfill({ response: res, body: (await res.text()).replace(line, '') });
  });
  await page.addInitScript(() => {
    globalThis.__lt = [];
    new PerformanceObserver((l) =>
      globalThis.__lt.push(...l.getEntries().map((e) => [e.startTime, e.duration])),
    ).observe({
      type: 'longtask',
      buffered: true,
    });
  });
  await page.goto(`http://127.0.0.1:${PORT}/game3d/index.html?place=${from}&skip&q=${Q}&w=320&h=180`);
  await page.waitForFunction(() => globalThis.__game?.place && globalThis.__game.walker, null, { timeout: 600000 });
  await page.waitForTimeout(4000);
  await page.evaluate(async (to) => {
    await globalThis.__game.prepare(to);
    await new Promise((r) => setTimeout(r, 3000)); // the draw-call pass's slices
  }, to);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  await cdp.send('Profiler.start');
  const keys = setInterval(() => page.keyboard.press('Enter').catch(() => {}), 400); // lines on the way
  const r = await page
    .evaluate(async (to) => {
      const g = globalThis.__game,
        t0 = performance.now(),
        before = new Set(g.renderer.info.programs);
      g.timeScale = (g.timeScale || 1) * 4; // the walk out, faster (each frame's work is the same)
      await g.travel(to);
      const t1 = performance.now();
      await new Promise((res) => setTimeout(res, 2000));
      const lt = globalThis.__lt.filter(([a, d]) => a + d >= t0).map(([a, d]) => [Math.round(a - t0), Math.round(d)]);
      // programs compiled during the trip (the warm-up missed them), each with how it differs from the closest program
      // that already existed: the cache key's fields that differ, as index:new/old
      const progs = g.renderer.info.programs;
      const fresh = progs
        .filter((p) => !before.has(p))
        .map((p) => {
          const k = p.cacheKey.split(',');
          const diffs = [...before]
            .filter((q) => q.cacheKey.split(',')[0] === k[0] || q.name === p.name)
            .map((q) =>
              q.cacheKey
                .split(',')
                .map((v, i) => (v === k[i] ? '' : `${i}:${k[i]}/${v}`))
                .filter(Boolean),
            )
            .sort((a, b) => a.length - b.length)[0];
          return `${p.name} ${diffs ? 'differs from an existing one in ' + diffs.slice(0, 6).join(' ') : '(no program of its kind before)'}`;
        });
      return { tripMs: Math.round(t1 - t0), longTasks: lt, place: g.place?.name, fresh };
    }, to)
    .finally(() => clearInterval(keys));
  const { profile } = await cdp.send('Profiler.stop');
  const t = profileTimes(profile);
  const res = { ...r, inclusive: t.top(t.incl, TOP), self: t.top(t.self, TOP), errors };
  const lt = r.longTasks.map(([a, d]) => `${d}@${a}`).join(' ');
  console.log(
    `${from} -> ${to} (q${Q}): arrived in ${r.place} after ${r.tripMs} ms; long tasks (ms@ms): ${lt || 'none'}`,
  );
  console.log(`  programs compiled on the way (${r.fresh.length}):`);
  for (const f of r.fresh) console.log(`    ${f}`);
  console.log(`  most time including callees (ms):`);
  for (const [k, v] of res.inclusive) console.log(`    ${v.toFixed(0).padStart(7)}  ${k}`);
  console.log(`  most own time (ms):`);
  for (const [k, v] of res.self.slice(0, 15)) console.log(`    ${v.toFixed(0).padStart(7)}  ${k}`);
  if (errors.length) console.log('  page errors:', errors.slice(0, 3));
  await ctx.close();
  return res;
}

const results = {};
if (TRIP) for (const spec of TRIP.split(',')) results[spec] = await trip(spec);
for (const place of TRIP ? [] : places) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${PORT}/game3d/index.html?place=${place}&cap&q=${Q}&w=160&h=90`);
  await page.waitForFunction(() => globalThis.__done && globalThis.__game?.view?.composer, null, { timeout: 600000 });
  if (MICRO) {
    const m = await page.evaluate(micro, MICRO);
    results[place] = { micro: m };
    console.log(
      `${place} q${Q}: ${m.objects} objects (${m.autoMatrix} with matrixAutoUpdate), ${m.meshes} meshes; CPU per call: ` +
        `matrices ${m.matrices} ms, scene render ${m.render} ms, with the shadow map ${m.renderWithShadows} ms` +
        (m.aoPass !== undefined ? `, AO pass ${m.aoPass} ms` : ''),
    );
    await ctx.close();
    continue;
  }
  await page.evaluate(setup, AT);
  await page.waitForTimeout(2000); // the crowd starts walking
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  await page.evaluate(() => (globalThis.__cpu.on = true));
  await cdp.send('Profiler.start');
  await page.waitForTimeout(SECS * 1000);
  const { profile } = await cdp.send('Profiler.stop');
  const t = await page.evaluate(() => ((globalThis.__cpu.on = false), globalThis.__cpu));
  // self time per function (url:line), from the sampled profile
  const self = new Map(),
    byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const dt = profile.timeDeltas;
  profile.samples.forEach((id, i) => {
    const n = byId.get(id),
      f = n.callFrame;
    const k = `${f.functionName || '(anon)'} ${f.url.replace(/^.*\/game3d\//, '')}:${f.lineNumber + 1}`;
    self.set(k, (self.get(k) || 0) + (dt[i] || 0) / 1000);
  });
  const total = [...self.values()].reduce((a, b) => a + b, 0);
  const idle = ['(idle)', '(program)', '(garbage collector)'].map((n) =>
    [...self.entries()].filter(([k]) => k.startsWith(n + ' ')).reduce((a, [, v]) => a + v, 0),
  );
  const top = [...self.entries()]
    .filter(([k]) => !/^\((idle|program)\)/.test(k))
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP);
  const avg = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  const pct = (a, p) => [...a].sort((x, y) => x - y)[Math.floor(a.length * p)] || 0;
  const r = (results[place] = {
    frames: t.render.length,
    stepMs: { avg: +avg(t.step).toFixed(2), p95: +pct(t.step, 0.95).toFixed(2) },
    renderMs: { avg: +avg(t.render).toFixed(2), p95: +pct(t.render, 0.95).toFixed(2) },
    calls: await page.evaluate(() => globalThis.__game.renderer.info.render.calls),
    gcMs: +idle[2].toFixed(1),
    profiledMs: +total.toFixed(0),
    top: top.map(([k, v]) => [k, +v.toFixed(1)]),
    errors,
  });
  console.log(
    `${place} q${Q}: ${r.frames} frames; JS per frame: tick ${r.stepMs.avg} ms (p95 ${r.stepMs.p95}), render ${r.renderMs.avg} ms ` +
      `(p95 ${r.renderMs.p95}); GC ${r.gcMs} ms in ${SECS} s`,
  );
  console.log(`  costliest functions by own time over ${SECS} s (ms):`);
  for (const [k, v] of r.top) console.log(`    ${String(v).padStart(7)}  ${k}`);
  if (errors.length) console.log('  page errors:', errors.slice(0, 3));
  await ctx.close();
}
await browser.close();
server.close();
const out = arg('json', '');
if (out) fs.writeFileSync(out, JSON.stringify({ q: Q, secs: SECS, results }, null, 2));
