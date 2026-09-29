// Where one frame's draw calls go, by pass and by kind of object, with the perf pass on (hooked as in ab.mjs).
//   node game3d/tools/perf/calls.mjs [place] [--q 1] [--nohook] [--extra '&cell=2']      (browser lock)
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const VAL = new Set(['--q', '--extra']);
const place = argv.find((a, i) => !a.startsWith('--') && !VAL.has(argv[i - 1])) || 'office';
const b = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 393, height: 851 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true });
if (!argv.includes('--nohook')) await ctx.route('**/js/places/lifecycle.js*', async (route) => { const r = await route.fetch(); const body = (await r.text()).replace('place.name = name;', "place.name = name; (await import('../perf/batch.js')).optimizePlace(place, { game });"); await route.fulfill({ response: r, body }); });
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('pageerror', e.message));
await p.goto(`http://127.0.0.1:8771/game3d/index.html?q=${arg('q', '1')}&place=${place}&skip${arg('extra', '')}`);
await p.waitForFunction(() => window.__game && window.__game.place && window.__done, null, { timeout: 180000 });
await p.waitForTimeout(8000);
const r = await p.evaluate(async () => {
  const g = window.__game, R = g.renderer, S = g.place.scene, P = g.place.perf;
  // what each object is
  const kind = new Map();
  const mark = (root, k) => root && root.traverse((o) => { if (!kind.has(o)) kind.set(o, k); });
  for (const [id, x] of Object.entries(g.place.people || {})) mark(x && x.root, 'person');
  mark(g.player && g.player.root, 'person'); mark(g.mioNpc && g.mioNpc.root, 'person');
  for (const [id, t] of Object.entries(g.place.things || {})) { if (t && t.obj) mark(t.obj, 'thing:' + id); if (t && t.outline) try { for (const o of [].concat(t.outline())) mark(o, 'thing:' + id); } catch { /* */ } }
  const cat = (o) => {
    if (o.userData.perfBatch) return 'batch';
    if (kind.has(o)) return kind.get(o).startsWith('thing') ? 'thing' : kind.get(o);
    const i = P && P.info.get(o); if (i) return i.state === 'wait' ? 'single/waiting' : i.state;
    if (o.isSkinnedMesh) return 'skinned';
    if (o.isPoints || o.isLine) return 'points/lines';
    if (o.material && (o.material.isShaderMaterial)) return 'shader';
    if (o.material && o.material.transparent) return 'transparent';
    return 'other:' + (o.name || o.type);
  };
  const out = {}; let pass = -1;
  const oldR = R.render.bind(R);
  const orig = R.renderBufferDirect.bind(R);
  let cam = null, things = {}, tris = {};
  R.render = (scene, camera) => { pass++; cam = camera; return oldR(scene, camera); };
  R.renderBufferDirect = (camera, scene, geometry, material, object, group) => {
    const k = scene === null ? 'shadow ' + cat(object) : scene === S ? 'pass' + pass + ' ' + cat(object) : 'fullscreen';
    out[k] = (out[k] || 0) + 1;
    const n = Math.min(geometry.index ? geometry.index.count : geometry.attributes.position.count, geometry.drawRange.count); if (object.isMesh) tris[k] = (tris[k] || 0) + Math.round(n / 3);
    if (scene === S && cat(object) === 'thing') { const t = kind.get(object); things[t] = (things[t] || 0) + 1; }
    return orig(camera, scene, geometry, material, object, group);
  };
  await new Promise((x) => requestAnimationFrame(() => requestAnimationFrame(x)));
  out.__passesSeen = pass;
  pass = -1; for (const k of Object.keys(out)) if (k !== '__passesSeen') out[k] = 0; things = {}; tris = {};
  await new Promise((x) => requestAnimationFrame(x));
  R.render = oldR; R.renderBufferDirect = orig;
  const T = Object.values(tris).reduce((a, b) => a + b, 0), C = Object.entries(out).filter(([k]) => k !== '__passesSeen').reduce((a, [, b]) => a + b, 0);
  return { calls: C, tris: T, trisBy: Object.fromEntries(Object.entries(tris).filter(([, v]) => v > 2000).sort((a, b) => b[1] - a[1])), out: Object.fromEntries(Object.entries(out).filter(([, v]) => v).sort((a, b) => b[1] - a[1])), things: Object.entries(things).sort((a, b) => b[1] - a[1]).slice(0, 20), why: P && P.why() };
});
console.log(JSON.stringify(r, null, 1));
await b.close();
