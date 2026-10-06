// Bounded actual-renderer counters and frame cadence at the same stationary camera on either checkout.
// BASE=game3d OUT=/tmp/perf-before node game3d/tools/perf/scene-probe.mjs 390 844 plaza east_lane dorms
// GL=soft permits diagnostic counts/visuals only; its timing must not be compared with hardware rendering.
import fs from 'node:fs';
import path from 'node:path';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';

const [width = '1366', height = '860', ...requested] = process.argv.slice(2);
const places = requested.length ? requested : ['plaza', 'east_lane', 'dorms'];
const base = process.env.BASE || 'game3d';
const out = process.env.OUT || '/tmp/perf-scenes';
fs.mkdirSync(out, { recursive: true });
await withBrowserJob('perf-scene-probe', async browser => {
  const page = await browser.newPage({ viewport: { width: +width, height: +height } });
  const errors = [], results = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const place of places) {
    await page.goto(`http://127.0.0.1:8771/${base}/index.html?place=${place}&skip&q=0`);
    await page.waitForFunction(name => globalThis.__game?.place?.name === name && globalThis.__done, place,
      { timeout: 60000 });
    await page.waitForTimeout(1500);
    const result = await page.evaluate(async () => {
      const g = globalThis.__game, info = g.renderer.info, gl = g.renderer.getContext();
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      const frames = [], calls = [], triangles = [];
      globalThis.__perfHold = true;
      info.autoReset = false;
      let last = await new Promise(resolve => requestAnimationFrame(resolve));
      try {
        for (let i = 0; i < 120; i++) {
          info.reset();
          const now = await new Promise(resolve => requestAnimationFrame(resolve));
          frames.push(now - last); last = now;
          calls.push(info.render.calls); triangles.push(info.render.triangles);
        }
      } finally { info.autoReset = true; globalThis.__perfHold = false; }
      const q = (values, quantile) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * quantile))];
      return { place: g.place.name, renderer, samples: frames.length,
        medianMs: +q(frames, 0.5).toFixed(2), p99Ms: +q(frames, 0.99).toFixed(2),
        calls: q(calls, 0.5), triangles: q(triangles, 0.5),
        creatures: g.place.creatures?.info(), frames, callSamples: calls, triangleSamples: triangles };
    });
    results.push(result);
    await page.screenshot({ path: path.join(out, `${place}-${width}x${height}.png`) });
    console.log(JSON.stringify({ ...result, frames: undefined, callSamples: undefined, triangleSamples: undefined }));
  }
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ base, viewport: [+width, +height], results, errors }, null, 2) + '\n');
  if (errors.length) throw Error(errors.join('\n'));
}, { timeoutMs: 240000 });
