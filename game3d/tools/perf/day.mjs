// The whole day in test mode (?test=fast) with the perf pass on, checking as it goes that merging changes
// nothing on screen: every few seconds the game is paused, one frame is grabbed with the pass off and one with it on,
// and the two are compared. Catches a door, a lift or a trip that moves something the pass had merged.
//   node game3d/tools/perf/day.mjs [w=393] [h=851] [seconds=300] [--every 4] [--q 1]      (browser lock)
// PASS when the day ends, there are no page errors, and every pair is within the tolerance (mean difference under
// 0.05/255 and under 0.05% of pixels off by more than 8/255). Sheets of the worst pairs go to shots/perf/day/.
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const VAL = new Set(['--every', '--q', '--extra']);
const pos = argv.filter((a, i) => !a.startsWith('--') && !VAL.has(argv[i - 1]));
const [W = '393', H = '851', SECS = '300'] = pos;
const EVERY = +arg('every', 4), QUAL = arg('q', '1');
const TOL = { mean: 0.05, over8: 0.05 };
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUT = path.join(G, 'shots/perf/day'); fs.mkdirSync(OUT, { recursive: true });
const GPU = process.env.GL === 'gpu';
const gl = GPU ? ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const b = await chromium.launch({ headless: true, args: [...gl, '--autoplay-policy=no-user-gesture-required'] });
const phone = +W < 640;
const ctx = await b.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: phone ? 2.75 : 1, isMobile: phone, hasTouch: phone });
// the lifecycle runs the pass on every place but Eric's room (places/lifecycle.js BATCHED), after the look
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
const cmp = await (await b.newContext()).newPage();
const t0 = Date.now();
await p.goto(`http://127.0.0.1:8771/${process.env.BASE || 'game3d'}/index.html?test=fast&q=${QUAL}${arg('extra', '')}`);
await p.waitForFunction(() => window.__game && window.__game.place, null, { timeout: 120000 });

const grab = () => p.evaluate(() => new Promise((ok) => requestAnimationFrame(() => ok(window.__game.renderer.domElement.toDataURL('image/png').split(',')[1]))));
const frame = () => p.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))));
async function diff(a, c) {
  return cmp.evaluate(async ([a, c]) => {
    const load = (s) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = 'data:image/png;base64,' + s; });
    const [ia, ic] = await Promise.all([load(a), load(c)]);
    if (ia.width !== ic.width || ia.height !== ic.height) return { mean: 999, over8: 100, max: 255 };
    const cv = new OffscreenCanvas(ia.width, ia.height), x = cv.getContext('2d');
    x.drawImage(ia, 0, 0); const A = x.getImageData(0, 0, ia.width, ia.height).data;
    x.drawImage(ic, 0, 0); const C = x.getImageData(0, 0, ia.width, ia.height).data;
    let sum = 0, over = 0, max = 0;
    for (let i = 0; i < A.length; i += 4) { const d = Math.max(Math.abs(A[i] - C[i]), Math.abs(A[i + 1] - C[i + 1]), Math.abs(A[i + 2] - C[i + 2])); sum += d; if (d > 8) over++; if (d > max) max = d; }
    const n = A.length / 4; return { mean: +(sum / n).toFixed(3), over8: +(over / n * 100).toFixed(3), max };
  }, [a, c]);
}
const samples = [];
const end = Date.now() + +SECS * 1000;
let n = 0;
while (Date.now() < end) {
  const st = await p.evaluate(() => ({ done: !!(window.__test && window.__test.done), place: window.__game.place && window.__game.place.name, perf: !!(window.__game.place && window.__game.place.perf) }));
  if (st.done) break;
  if (st.perf) {
    await p.evaluate(() => { window.__game.paused = true; });
    await frame();
    await p.evaluate(() => window.__game.place.perf.toggle(false)); await frame(); const off = await grab();
    await p.evaluate(() => window.__game.place.perf.toggle(true)); await frame(); const on = await grab();
    const info = await p.evaluate(() => { const P = window.__game.place.perf; return { batches: P.batches.size, released: P.stats.released, goal: window.__game.ui.goalText || '' }; });
    const d = await diff(off, on);
    const bad = d.mean > TOL.mean || d.over8 > TOL.over8;
    // over tolerance: find the batches whose meshes drawn on their own bring the frame back
    if (bad) info.culprits = await p.evaluate(async () => {
      const g = window.__game, P = g.place.perf;
      const fr = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
      const cap = () => new Promise((ok) => requestAnimationFrame(() => { const c = g.renderer.domElement, cv = new OffscreenCanvas(c.width, c.height), x = cv.getContext('2d'); x.drawImage(c, 0, 0); ok(x.getImageData(0, 0, c.width, c.height).data); }));
      const md = (a, b) => { let s = 0; for (let i = 0; i < a.length; i += 4) s += Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])); return s / (a.length / 4); };
      P.toggle(false); await fr(); const off = await cap(); P.toggle(true); await fr();
      const base = md(await cap(), off), out = [];
      for (const b of [...P.batches].slice(0, 300)) {
        P.toggleBatch(b, false); await fr(); const d = md(await cap(), off); P.toggleBatch(b, true);
        if (d < base * 0.7) out.push({ gain: +(base - d).toFixed(3), ...P.describe(b) });
      }
      await fr();
      return { base: +base.toFixed(3), list: out.sort((a, b) => b.gain - a.gain).slice(0, 5) };
    });
    await p.evaluate(() => { window.__game.paused = false; });
    samples.push({ n, t: Math.round((Date.now() - t0) / 1000), place: st.place, ...d, ...info, bad });
    if (bad || n % 10 === 0) { fs.writeFileSync(path.join(OUT, `${n}-${st.place}-off.png`), Buffer.from(off, 'base64')); fs.writeFileSync(path.join(OUT, `${n}-${st.place}-on.png`), Buffer.from(on, 'base64')); }
    console.log(`${bad ? 'BAD ' : ''}#${n} ${samples.at(-1).t}s ${st.place} mean ${d.mean} over8 ${d.over8}% max ${d.max} batches ${info.batches} released ${info.released} | ${info.goal.slice(0, 50)}`);
    if (info.culprits) console.log('   culprits (base ' + info.culprits.base + '):', JSON.stringify(info.culprits.list));
    n++;
  }
  await p.waitForTimeout(EVERY * 1000);
}
const r = await p.evaluate(() => ({ done: !!(window.__test && window.__test.done), ended: !!window.__ended, places: (window.__test && window.__test.places) || [], errors: (window.__test && window.__test.errors) || [] }));
await b.close();
const bad = samples.filter((s) => s.bad);
const worst = samples.reduce((a, s) => (s.mean > a.mean ? s : a), { mean: 0 });
const ok = r.ended && !errs.length && !r.errors.length && !bad.length && samples.length > 0;
console.log(`${ok ? 'PASS' : 'FAIL'} ${W}x${H} ${((Date.now() - t0) / 1000).toFixed(0)} s | places: ${r.places.join(' > ')} | ended: ${r.ended} | ${samples.length} pairs, ${bad.length} over tolerance, worst mean ${worst.mean} (#${worst.n} ${worst.place || ''})`);
if (errs.length || r.errors.length) console.log('errors:', [...errs, ...r.errors].slice(0, 6).join(' | '));
fs.writeFileSync(path.join(OUT, `day-${W}x${H}.json`), JSON.stringify({ ok, samples, result: r, errors: errs }, null, 1));
