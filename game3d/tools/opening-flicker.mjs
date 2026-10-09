// Flicker check for the anime opening (game3d/opening/): depth fighting shows as pixels that flip between two
// colours from one frame to the next, while a camera move changes them smoothly. At each song time T it renders
// T - 1/60, T and T + 1/60 and flags pixels whose middle frame is far from the mean of its neighbours (a temporal
// second difference). Writes a heat map per time and prints the flagged share of the frame.
//   node game3d/tools/opening-flicker.mjs 4.8,20.5,41.8 [outdir]     (W=960 default; GL=soft when the GPU is busy)
//   Q=surf=0 adds page options (as opening-render.mjs)
//   JITTER=1 ...   instead: the same moment twice with the camera moved 2 mm, so only depth fighting shows
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import fs from 'node:fs';
import path from 'node:path';

const [list = '4.8,20.5,41.8', outArg] = process.argv.slice(2);
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.resolve(outArg || path.join(G, 'shots/opening-film/flicker'));
fs.mkdirSync(out, { recursive: true });
const RW = +(process.env.W || 960);
const times = list.split(',').map(Number);
await withBrowserJob('opening-flicker', async (browser) => {
  const page = await browser.newPage({ viewport: { width: RW, height: Math.round((RW * 9) / 16) } });
  await page.goto(`http://127.0.0.1:8771/game3d/opening/index.html?capture&still&w=${RW}${process.env.Q ? '&' + process.env.Q : ''}`);
  await page.waitForFunction(() => window.OP && window.OP.stage, null, { timeout: 180000 });
  if (process.env.JITTER) await page.evaluate(() => (window.__jitterMode = true));
  for (const T of times) {
    const r = await page.evaluate(async (T) => {
      const c = document.getElementById('op');
      const grab = async (t) => {
        await window.OP.frame(t);
        const k = document.createElement('canvas');
        k.width = c.width;
        k.height = c.height;
        const g = k.getContext('2d');
        g.drawImage(c, 0, 0);
        return g.getImageData(0, 0, k.width, k.height);
      };
      // JITTER: the same moment twice, the camera moved 2 mm: only depth fighting changes (no motion at all)
      let a, b, d;
      if (window.__jitterMode) {
        window.OP.jitter = null;
        b = await grab(T);
        window.OP.jitter = [0.002, 0.0013, 0.0017];
        a = d = await grab(T);
        window.OP.jitter = null;
      } else {
        a = await grab(T - 1 / 60);
        b = await grab(T);
        d = await grab(T + 1 / 60);
      }
      const n = b.width * b.height;
      const heat = new ImageData(b.width, b.height);
      let flagged = 0;
      for (let i = 0; i < n; i++) {
        let e = 0;
        for (let ch = 0; ch < 3; ch++) {
          const j = i * 4 + ch;
          e = Math.max(e, Math.abs(b.data[j] - (a.data[j] + d.data[j]) / 2) - Math.abs(a.data[j] - d.data[j]) / 2);
        }
        const f = e > 28;
        if (f) flagged++;
        heat.data[i * 4] = f ? 255 : b.data[i * 4] * 0.35;
        heat.data[i * 4 + 1] = f ? 40 : b.data[i * 4 + 1] * 0.35;
        heat.data[i * 4 + 2] = f ? 40 : b.data[i * 4 + 2] * 0.35;
        heat.data[i * 4 + 3] = 255;
      }
      const k = document.createElement('canvas');
      k.width = b.width;
      k.height = b.height;
      k.getContext('2d').putImageData(heat, 0, 0);
      return { share: flagged / n, url: k.toDataURL('image/png') };
    }, T);
    const f = path.join(out, `flicker-${T.toFixed(2)}.png`);
    fs.writeFileSync(f, Buffer.from(r.url.split(',')[1], 'base64'));
    console.log(`T=${T.toFixed(2)}  flagged ${(r.share * 100).toFixed(3)}%  ${f}`);
  }
}, { timeoutMs: 900000 });
