// Frame cost of each style (js/style/) on the phone profile from perf.mjs: 393 x 851 at DPR 2.75 (the game caps
// it), touch, CPU throttled 4x, quality tier 1. For each style and place: median frame time over a few seconds,
// relative to the current look, and draw calls per frame.
//   node game3d/tools/style-perf.mjs <out.json> [styles=0,1,2,3,4,5,6] [--base http://127.0.0.1:8771] [--secs 6]
// SwiftShader (default) renders on the CPU, so its frame time mostly measures pixel work: a fair way to compare the
// styles' extra passes with each other, not a real phone's frame rate. GL=gpu uses this machine's GPU (lock first).
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const BASE = opt('base', 'http://127.0.0.1:8771'), SECS = +opt('secs', 6);
const [out, list = '0,1,2,3,4,5,6'] = argv;
const styles = list.split(',').map(Number);
const GPU = process.env.GL === 'gpu';
const gl = GPU ? ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const b = await chromium.launch({ headless: true, args: gl });
const res = {};
for (const place of ['office', 'gate', 'train']) {
  for (const s of styles) {
    const ctx = await b.newContext({ viewport: { width: 393, height: 851 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true });
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    await p.goto(`${BASE}/game3d/index.html?q=1&place=${place}&skip&style=${s}`);
    await p.waitForFunction(() => window.__game && window.__game.place && window.__done, null, { timeout: 240000 });
    await p.waitForTimeout(2500);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const m = await p.evaluate(async (secs) => {
      const r = window.__game.renderer;
      r.info.autoReset = false; r.info.reset();
      await new Promise((x) => requestAnimationFrame(() => requestAnimationFrame(x)));
      const calls = r.info.render.calls; r.info.autoReset = true;
      const dts = []; let last = performance.now();
      await new Promise((done) => { const end = last + secs * 1000; const f = (t) => { dts.push(t - last); last = t; if (t < end) requestAnimationFrame(f); else done(); }; requestAnimationFrame(f); });
      dts.shift(); dts.sort((a, c) => a - c);
      return { p50: +dts[Math.floor(dts.length / 2)].toFixed(1), calls, px: [r.domElement.width, r.domElement.height] };
    }, SECS);
    (res[s] ||= {})[place] = m;
    console.log(place, 's' + s, JSON.stringify(m));
    await ctx.close();
  }
}
await b.close();
// in the sheet's format: per style, per place ms and its ratio to the current look
const sheet = {};
for (const s of styles) {
  sheet[s] = {};
  for (const [place, m] of Object.entries(res[s])) {
    const base = res[0] && res[0][place] ? res[0][place].p50 : null;
    sheet[s][place] = { ms: m.p50, calls: m.calls, rel: base ? (m.p50 / base).toFixed(2) + 'x' : '-' };
  }
}
fs.writeFileSync(out, JSON.stringify({ gl: GPU ? 'gpu' : 'swiftshader', raw: res, sheet }, null, 1));
