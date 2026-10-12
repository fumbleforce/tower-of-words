// What each pass of a frame costs the GPU, and what a strategy for a weak GPU saves: the shadow map, the scene, AO,
// the outline, bloom and the final pass, timed one by one with gl.finish() around each.
//   node game3d/tools/perf/pass-cost.mjs [forecourt,plaza,gate] [--q 2] [--integrated] [--try a,b,c] [--frames 4]
//        [--w 1536 --h 864 --dpr 1.25] [--at x,z,face] [--url 'surf=0'] [--json out.json] [--shot dir]
// Each place is opened once (?place=<name>&cap: the world frozen, so every frame draws the same picture). The page's
// own frame is measured first, then each strategy in --try is applied in the page, measured, compared with that
// first picture (pixels that changed, and the mean change) and undone. The strategies are in TRY below.
// --integrated marks the renderer as an integrated GPU (perf/gpu.js), as 'auto' sees such a laptop.
// --at puts Eric (and the camera) at x,z facing `face` radians before measuring (a place's own coordinates).
// --draws N also times every draw of the scene pass on its own (one frame) and lists the N costliest meshes, and the
// time by material type: which of the scene's draws a weak GPU spends its time on. The first draw of the pass also
// carries the clear of the frame's multisampled target (a second or so in software GL), whichever mesh that is.
// The default screen is a 1080p laptop at 125 % (1536 x 864 CSS px, pixel ratio 1.25).
//
// Software GL (SwiftShader) is the default: the GPU's work runs on the CPU, so a pass's time follows the pixels it
// shades and the vertices it transforms. That makes it a fair proxy for comparing strategies on a weak GPU, not a
// frame rate (a frame takes seconds). GL=gpu renders on this machine's GPU instead. A gl.finish() per pass also
// stops the GPU overlapping passes, so the parts add up to more than a frame in play.
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
const VAL = new Set([
  '--w',
  '--h',
  '--dpr',
  '--q',
  '--frames',
  '--try',
  '--json',
  '--shot',
  '--at',
  '--draws',
  '--url',
]);
const places = (argv.find((a, i) => !a.startsWith('--') && !VAL.has(argv[i - 1])) || 'forecourt,plaza,gate').split(',');
const W = +arg('w', 1536),
  H = +arg('h', 864),
  DPR = +arg('dpr', 1.25),
  Q = arg('q', '2'),
  FRAMES = +arg('frames', 4);
// 'empty' hides every mesh and the draw-call pass (perf/batch.js) shows its sources again meanwhile: it goes last
const TRIES = arg('try', '')
  .split(',')
  .filter(Boolean)
  .sort((a, b) => (a === 'empty') - (b === 'empty'));
const INTEGRATED = argv.includes('--integrated');
const AT = arg('at', '');
const DRAWS = +arg('draws', 0);
const URLX = arg('url', ''); // more of the page's query, e.g. surf=0 (look/flags.js)
const SHOT = arg('shot', '');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const GPU = process.env.GL === 'gpu';

// The strategies, each run in the page: it changes the renderer or the place and returns its undo.
// g is window.__game; T is THREE's classes as the page has them (from the renderer's own objects).
const TRY = {
  // the shadow map drawn every other frame (it is redrawn every frame now, perf/view.js render)
  shadowHalf: `(g) => {
    const sm = g.renderer.shadowMap; let n = 0, v = false;
    Object.defineProperty(sm, 'needsUpdate', { configurable: true, get: () => v, set: (x) => { v = x && (n++ % 2 === 0); } });
    return () => { delete sm.needsUpdate; sm.needsUpdate = true; };
  }`,
  // the shadow map at 1024 instead of 2048 (kept at 1024 only at low quality today)
  shadow1024: `(g) => {
    const s = g.place.sun?.shadow || g.place.light?.sun?.shadow; if (!s) return () => {};
    const old = s.mapSize.x; const set = (n) => { s.mapSize.set(n, n); s.map?.dispose(); s.map = null; };
    set(1024); return () => set(old);
  }`,
  // no multisampling on the frame's render targets (4 samples on a half-float target today, post.js)
  msaa0: `(g) => {
    const c = g.view.composer, rts = [c.renderTarget1, c.renderTarget2]; const old = rts.map((t) => t.samples);
    const set = (s) => rts.forEach((t, i) => { t.samples = s[i]; t.dispose(); });
    set([0, 0]); return () => set(old);
  }`,
  msaa2: `(g) => {
    const c = g.view.composer, rts = [c.renderTarget1, c.renderTarget2]; const old = rts.map((t) => t.samples);
    const set = (s) => rts.forEach((t, i) => { t.samples = s[i]; t.dispose(); });
    set([2, 2]); return () => set(old);
  }`,
  // no ambient occlusion (what medium does on an integrated GPU and on phones)
  aoOff: `(g) => { const a = g.view.post.gtao; const e = a.enabled; a.enabled = false; return () => (a.enabled = e); }`,
  bloomOff: `(g) => { const p = g.view.post; const e = p.bloom.enabled, b = p.final.mat.uniforms.uBloom.value;
    p.bloom.enabled = false; p.final.mat.uniforms.uBloom.value = 0;
    return () => { p.bloom.enabled = e; p.final.mat.uniforms.uBloom.value = b; }; }`,
  bloom3: `(g) => { const b = g.view.post.bloom; const l = b.levels; b.levels = Math.min(l, 3); return () => (b.levels = l); }`,
  // the tilt-shift's taps (12 at high, 8 at medium)
  taps6: `(g) => { const u = g.view.post.final.mat.uniforms.uTaps; const t = u.value; u.value = Math.min(t, 6); return () => (u.value = t); }`,
  outlineOff: `(g) => { const o = g.view.outline; const e = o.enabled; o.enabled = false; return () => (o.enabled = e); }`,
  // the whole frame at a lower pixel ratio (1 instead of 1.25)
  dpr1: `(g) => { const r = g.renderer, old = r.getPixelRatio(); const set = (d) => { r.setPixelRatio(d); g.view.resize(); };
    set(1); return () => set(old); }`,
  // the skyline's ground (it lies under each outdoor place's own ground, scenes/skyline.js) drawn after the place's
  // opaque meshes, so the depth test skips the pixels the place's paving and lawns already cover
  groundLast: `(g) => { const l = []; g.place.scene.traverse((o) => { if (/^skyline:ground/.test(o.name)) { l.push([o, o.renderOrder]); o.renderOrder = 10; } });
    return () => l.forEach(([o, r]) => (o.renderOrder = r)); }`,
  // opaque draws front to back by where each mesh's bounds are, not its origin (merged meshes have theirs at 0)
  sortBounds: `(g) => { const r = g.renderer, cam = g.place.camera, v = cam.position.clone(), c = v.clone();
    const d = new WeakMap(); let frame = -1;
    const dist = (o) => { const s = o.geometry?.boundingSphere || (o.geometry?.computeBoundingSphere(), o.geometry?.boundingSphere);
      if (!s) return 0; c.copy(s.center).applyMatrix4(o.matrixWorld); cam.getWorldPosition(v);
      return Math.max(0, c.distanceTo(v) - s.radius * o.matrixWorld.getMaxScaleOnAxis()); };
    r.setOpaqueSort((a, b) => a.groupOrder - b.groupOrder || a.renderOrder - b.renderOrder
      || ((d.has(a.object) ? 0 : d.set(a.object, dist(a.object))), (d.has(b.object) ? 0 : d.set(b.object, dist(b.object))), d.get(a.object) - d.get(b.object))
      || a.id - b.id);
    return () => r.setOpaqueSort(null); }`,
  // nothing in the scene (not a strategy): what a frame costs before any mesh, its targets' clears and resolves
  empty: `(g) => { const l = []; g.place.scene.traverse((o) => { if ((o.isMesh || o.isPoints || o.isLine) && o.visible) { l.push(o); o.visible = false; } });
    return () => l.forEach((o) => (o.visible = true)); }`,
  // opaque draws front to back by the distance to each mesh's bounds' centre, worked out once a frame; with
  // sortCenterGround the skyline's ground (under the place's own) goes last as well
  sortCenter: `(g) => globalThis.__sortCenter(g, false)`,
  sortCenterGround: `(g) => globalThis.__sortCenter(g, true)`,
  // the camera's far plane pulled in to 60 m (what lies past it is culled; the haze covers it)
  far60: `(g) => { const c = g.place.camera, f = c.far; c.far = Math.min(f, 60); c.updateProjectionMatrix();
    return () => { c.far = f; c.updateProjectionMatrix(); }; }`,
};

// a static server of this checkout (the review server's port 8771 is not assumed)
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

const gl = GPU
  ? ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu']
  : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM || undefined,
  args: [...gl, '--autoplay-policy=no-user-gesture-required'],
});

// In the page, once: the timers. Every composer pass and the shadow map are wrapped with gl.finish() timers that
// record into window.__pc.cur while it is set; the frame's picture is copied out right after it is drawn.
function install({ integrated, at }) {
  const g = globalThis.__game,
    r = g.renderer,
    info = r.info;
  if (integrated) {
    r.userData.integrated = true;
    g.setQuality(g.view.quality); // medium drops AO on an integrated GPU (perf/phone.js phoneTier)
  }
  if (at) {
    const [x, z, face] = at.split(',').map(Number);
    g.player.root.position.set(x, g.player.root.position.y, z);
    if (!Number.isNaN(face)) g.walker.facing = g.player.root.rotation.y = face;
    for (let i = 0; i < 30; i++) g.place.cam?.update?.(1 / 30, g.player.root.position);
    g.place.cam?.snap?.(g.player.root.position);
    g.place.light?.follow?.(x, z);
  }
  // the sort for sortCenter / sortCenterGround: distances cached per frame (keyed on renderer.info.render.frame)
  globalThis.__sortCenter = (g, ground) => {
    const r = g.renderer,
      cam = g.place.camera,
      eye = cam.position.clone(),
      c = eye.clone(),
      d = new Map();
    let frame = -1;
    const key = (o) => {
      if (r.info.render.frame !== frame) ((frame = r.info.render.frame), d.clear(), cam.getWorldPosition(eye));
      let k = d.get(o);
      if (k === undefined) {
        const geo = o.geometry;
        if (geo && !geo.boundingSphere) geo.computeBoundingSphere();
        k = geo?.boundingSphere ? c.copy(geo.boundingSphere.center).applyMatrix4(o.matrixWorld).distanceTo(eye) : 0;
        if (ground && /^skyline:ground/.test(o.name)) k += 1e6;
        d.set(o, k);
      }
      return k;
    };
    r.setOpaqueSort(
      (a, b) =>
        a.groupOrder - b.groupOrder || a.renderOrder - b.renderOrder || key(a.object) - key(b.object) || a.id - b.id,
    );
    return () => r.setOpaqueSort(null);
  };
  const pc = (globalThis.__pc = { cur: null, pic: null });
  // Wait until the GPU has done everything asked of it so far. gl.finish() doesn't (Chrome's GPU process runs
  // behind it): a 1x1 target is cleared and read back, and the read waits for all the work queued before it.
  const one = new g.view.composer.renderTarget1.constructor(1, 1); // a WebGLRenderTarget, as the page has the class
  const px = new Uint8Array(4);
  const sync = () => {
    const was = r.getRenderTarget(),
      ac = r.autoClear;
    r.setRenderTarget(one);
    r.clear();
    r.readRenderTargetPixels(one, 0, 0, 1, 1, px);
    r.setRenderTarget(was);
    r.autoClear = ac;
  };
  const timed = (obj, key, name) => {
    const f = obj[key];
    obj[key] = function (...a) {
      if (!pc.cur) return f.apply(this, a);
      sync();
      const c0 = info.render.calls,
        t0 = performance.now();
      const out = f.apply(this, a);
      sync();
      const e = (pc.cur[name] ||= [0, 0]);
      e[0] += performance.now() - t0;
      e[1] += info.render.calls - c0;
      return out;
    };
  };
  timed(r.shadowMap, 'render', 'shadow');
  const seen = {};
  for (const p of g.view.composer.passes) {
    let n = p.constructor.name.replace(/Pass$/, '') || 'pass';
    seen[n] = (seen[n] || 0) + 1;
    if (seen[n] > 1) n += seen[n];
    timed(p, 'render', n);
  }
  const post = g.view.post,
    render = post.render;
  post.render = function () {
    const out = render.call(this);
    if (pc.want) {
      const c = r.domElement,
        k = document.createElement('canvas');
      k.width = c.width;
      k.height = c.height;
      k.getContext('2d').drawImage(c, 0, 0);
      pc.pic = k.getContext('2d').getImageData(0, 0, k.width, k.height).data;
      pc.canvas = k;
      pc.want = false;
    }
    return out;
  };
  timed(post, 'render', 'frame');
  return [r.domElement.width, r.domElement.height, g.view.quality, r.userData.gpu];
}

// In the page: `frames` drawn frames (after one to settle), each a row of { pass: [ms, calls] }, and the picture
function sample(frames) {
  const pc = globalThis.__pc,
    info = globalThis.__game.renderer.info,
    rows = [];
  return new Promise((resolve) => {
    let left = frames + 1;
    const tick = () => {
      if (pc.cur && left <= frames) rows.push(pc.cur);
      if (!left--) {
        pc.cur = null;
        info.autoReset = true;
        return resolve(rows);
      }
      if (left === 0) pc.want = true;
      info.autoReset = false;
      info.reset();
      pc.cur = {};
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

// In the page: how far the last picture is from the first one kept as the reference
function compare(keep) {
  const pc = globalThis.__pc;
  if (keep) return void (pc.ref = pc.pic);
  const a = pc.ref,
    b = pc.pic;
  if (!a || !b || a.length !== b.length) return null;
  let changed = 0,
    sum = 0;
  for (let i = 0; i < a.length; i += 4) {
    const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
    sum += d;
    if (d > 24) changed++;
  }
  const n = a.length / 4;
  return { changedPct: +((100 * changed) / n).toFixed(2), meanDiff: +(sum / n / 3).toFixed(2) };
}

// In the page: one frame with every mesh's draw in the scene pass timed (a sync before and after each)
function perDraw(top) {
  const g = globalThis.__game,
    r = g.renderer,
    pc = globalThis.__pc,
    one = new g.view.composer.renderTarget1.constructor(1, 1),
    px = new Uint8Array(4);
  const sync = () => {
    const was = r.getRenderTarget();
    r.setRenderTarget(one);
    r.clear();
    r.readRenderTargetPixels(one, 0, 0, 1, 1, px);
    r.setRenderTarget(was);
  };
  const scenePass = g.view.composer.passes.find((p) => p.constructor.name === 'RenderPass');
  let on = false,
    t0 = 0;
  const cost = new Map(),
    meshes = [];
  g.place.scene.traverse((o) => {
    if (!o.isMesh && !o.isPoints && !o.isLine) return;
    meshes.push([o, o.onBeforeRender, o.onAfterRender]);
    o.onBeforeRender = function (...a) {
      if (on) {
        sync();
        t0 = performance.now();
      }
    };
    o.onAfterRender = function (...a) {
      if (!on) return;
      sync();
      const m = Array.isArray(o.material) ? o.material[0] : o.material,
        geo = o.geometry,
        n = geo.index ? geo.index.count : geo.attributes.position?.count || 0;
      const e = cost.get(o) || { ms: 0, draws: 0 };
      e.ms += performance.now() - t0;
      e.draws++;
      let name = o.name,
        p = o.parent;
      while (!name && p) ((name = p.name), (p = p.parent));
      e.name = name || '(unnamed)';
      e.mat = `${m?.type || '?'}${m?.name ? ' ' + m.name : ''}${m?.transparent ? ' transparent' : ''}`;
      e.tris = Math.round((n / 3) * (o.count || 1));
      cost.set(o, e);
    };
  });
  const render = scenePass.render;
  scenePass.render = function (...a) {
    const shadows = r.shadowMap.needsUpdate;
    r.shadowMap.needsUpdate = false; // the shadow map's draws are not the scene's (timed in 'shadow')
    on = true;
    try {
      return render.apply(this, a);
    } finally {
      on = false;
      r.shadowMap.needsUpdate = shadows;
    }
  };
  return new Promise((resolve) =>
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        scenePass.render = render;
        for (const [o, b, a] of meshes) ((o.onBeforeRender = b), (o.onAfterRender = a));
        const all = [...cost.values()].sort((x, y) => y.ms - x.ms);
        const total = all.reduce((t, e) => t + e.ms, 0);
        const byMat = {};
        for (const e of all) {
          const k = e.mat.split(' ')[0] + (e.mat.includes('transparent') ? ' (transparent)' : '');
          (byMat[k] ||= { ms: 0, draws: 0, tris: 0 }).ms += e.ms;
          byMat[k].draws += e.draws;
          byMat[k].tris += e.tris;
        }
        resolve({
          total: +total.toFixed(1),
          draws: all.length,
          top: all.slice(0, top).map((e) => ({ ...e, ms: +e.ms.toFixed(1) })),
          byMat: Object.entries(byMat)
            .sort((a, b) => b[1].ms - a[1].ms)
            .map(([k, v]) => ({ mat: k, ms: +v.ms.toFixed(1), draws: v.draws, tris: v.tris })),
        });
        void pc;
      }),
    ),
  );
}

const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
function summarise(rows) {
  const names = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const row = {};
  for (const n of names)
    row[n] = {
      ms: +median(rows.map((r) => r[n]?.[0] || 0)).toFixed(1),
      calls: median(rows.map((r) => r[n]?.[1] || 0)),
    };
  // the scene pass includes the shadow map (three draws it inside renderer.render)
  if (row.Render && row.shadow)
    row.Render = { ms: +(row.Render.ms - row.shadow.ms).toFixed(1), calls: row.Render.calls - row.shadow.calls };
  return row;
}
const line = (row) =>
  Object.entries(row)
    .filter(([n, v]) => n !== 'frame' && (v.ms >= 0.1 || v.calls))
    .map(([n, v]) => `${n} ${v.ms}/${v.calls}`)
    .join('  ');

const results = {};
for (const place of places) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const t0 = Date.now();
  await page.goto(`http://127.0.0.1:${PORT}/game3d/index.html?place=${place}&cap&q=${Q}${URLX ? '&' + URLX : ''}`);
  await page.waitForFunction(() => globalThis.__done && globalThis.__game?.view?.composer, null, { timeout: 600000 });
  const loadS = (Date.now() - t0) / 1000;
  const [pw, ph, quality, gpu] = await page.evaluate(install, { integrated: INTEGRATED, at: AT });
  const res = (results[place] = { loadS, px: [pw, ph], quality, gpu, runs: {}, errors });
  console.log(
    `${place} q${quality} ${pw}x${ph}${INTEGRATED ? ' integrated' : ''}, ms/draw calls per pass (median of ${FRAMES} frames):`,
  );
  for (const name of ['base', ...TRIES]) {
    if (name !== 'base' && !TRY[name]) throw new Error(`no strategy ${name}; there are ${Object.keys(TRY).join(', ')}`);
    if (name !== 'base') await page.evaluate(`globalThis.__undo = (${TRY[name]})(globalThis.__game)`);
    const rows = await page.evaluate(sample, FRAMES);
    const diff = await page.evaluate(compare, name === 'base');
    if (SHOT) {
      // the frame as measured (a page screenshot waits for a new frame, seconds with software GL)
      const png = await page.evaluate(() => globalThis.__pc.canvas?.toDataURL('image/png').split(',')[1]);
      fs.mkdirSync(SHOT, { recursive: true });
      if (png) fs.writeFileSync(path.join(SHOT, `${place}-q${quality}-${name}.png`), Buffer.from(png, 'base64'));
    }
    if (name !== 'base') await page.evaluate(() => globalThis.__undo());
    const row = summarise(rows);
    res.runs[name] = { passes: row, diff };
    const base = res.runs.base.passes.frame.ms;
    const d =
      name === 'base'
        ? ''
        : ` (${row.frame.ms <= base ? '' : '+'}${Math.round((100 * (row.frame.ms - base)) / base)}%)`;
    const pix = diff ? `  | picture: ${diff.changedPct}% px changed, mean ${diff.meanDiff}` : '';
    console.log(`  ${name.padEnd(11)} frame ${String(row.frame.ms).padStart(6)} ms${d.padEnd(7)} ${line(row)}${pix}`);
  }
  if (DRAWS) {
    const d = (res.draws = await page.evaluate(perDraw, DRAWS));
    console.log(`  scene pass, draw by draw: ${d.total} ms over ${d.draws} meshes; by material:`);
    for (const m of d.byMat)
      console.log(`    ${m.mat.padEnd(34)} ${String(m.ms).padStart(8)} ms  ${m.draws} draws  ${m.tris} tris`);
    console.log(`  the ${DRAWS} costliest:`);
    for (const e of d.top)
      console.log(
        `    ${String(e.ms).padStart(8)} ms  ${e.name.slice(0, 40).padEnd(40)} ${e.mat.slice(0, 40).padEnd(40)} ${e.tris} tris`,
      );
  }
  if (errors.length) console.log('  page errors:', errors.slice(0, 3));
  await ctx.close();
}
await browser.close();
server.close();
const out = arg('json', '');
if (out)
  fs.writeFileSync(
    out,
    JSON.stringify(
      { w: W, h: H, dpr: DPR, q: Q, integrated: INTEGRATED, gl: GPU ? 'gpu' : 'swiftshader', results },
      null,
      2,
    ),
  );
