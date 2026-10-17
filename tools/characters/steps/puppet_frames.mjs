// puppet-frames: every frame of a puppet loop from a page that sets globalThis.rig (a puppet with renderAt(t, twos) and a
// canvas, e.g. reviews/animated-portraits-1/capture.html), as transparent PNGs at the canvas size, for frame sheets,
// 1:1 crops and a video. Also times the per-frame CPU work under a CPU slowdown (a phone stand-in).
//   node tools/characters/steps/puppet_frames.mjs <url> <out dir> [--seconds 9] [--fps 24] [--twos]
//   node tools/characters/steps/puppet_frames.mjs <url> --perf [--throttle 4]
// Runs as a browser job (tools/lib/browser-job.mjs), software GL unless GL is set.
import fs from 'node:fs';
import path from 'node:path';
import { withBrowserJob } from '../../lib/browser-job.mjs';

process.env.GL ??= 'soft';
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); if (i < 0) return d; const v = argv[i + 1]; argv.splice(i, v && !v.startsWith('--') ? 2 : 1); return v && !v.startsWith('--') ? v : true; };
const seconds = +opt('seconds', 9), fps = +opt('fps', 24), twos = !!opt('twos', false), perf = !!opt('perf', false), throttle = +opt('throttle', 4);
const [url, out] = argv;
if (!url || (!out && !perf)) { console.error('usage: puppet_frames.mjs <url> <out dir> [--seconds 9] [--fps 24] [--twos] | <url> --perf [--throttle 4]'); process.exit(2); }

await withBrowserJob('puppet-frames', async (browser) => {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1100 } });
  page.on('pageerror', (e) => console.error('pageerror:', e.message));
  await page.goto(url);
  await page.waitForFunction(() => globalThis.rig, null, { timeout: 60000 });
  if (perf) {
    const cdp = await page.context().newCDPSession(page);
    const res = {};
    for (const rate of [1, throttle]) {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate });
      res[`x${rate}`] = await page.evaluate(() => {
        const n = 240, d = [];
        for (let i = 0; i < n; i++) { globalThis.rig.renderAt(i / 60, false); d.push(globalThis.rig.deformMs); }
        d.sort((a, b) => a - b);
        return { deform_ms_median: +d[n >> 1].toFixed(3), deform_ms_p95: +d[Math.floor(n * 0.95)].toFixed(3) };
      });
    }
    console.log(JSON.stringify(res));
    return;
  }
  fs.mkdirSync(out, { recursive: true });
  const n = Math.round(seconds * fps);
  for (let i = 0; i < n; i++) {
    const data = await page.evaluate(([t, tw]) => { globalThis.rig.renderAt(t, tw); return globalThis.rig.canvas.toDataURL('image/png'); }, [i / fps, twos]);
    fs.writeFileSync(path.join(out, `${String(i).padStart(5, '0')}.png`), Buffer.from(data.split(',')[1], 'base64'));
  }
  console.log(out, n, 'frames');
}, { timeoutMs: 600000 });
