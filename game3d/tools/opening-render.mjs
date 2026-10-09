// Frames of the anime opening (game3d/opening/), frame-exact, through window.OP.frame(T).
//   node game3d/tools/opening-render.mjs stills 0.5,4,8.2 [outdir]        PNG stills at those song times
//   node game3d/tools/opening-render.mjs video [outdir] [fps] [from] [to]  every frame, then an MP4 with the music
// Width with W=1280 (default 1920); extra page options with Q (Q=win=small). Output defaults to
// game3d/shots/opening-film/<time>/.
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const [mode = 'stills', a1, a2, a3, a4] = process.argv.slice(2);
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const RW = +(process.env.W || 1920),
  RH = Math.round((RW * 9) / 16);
const BASE = process.env.BASE || 'http://127.0.0.1:8771/game3d/opening/index.html';

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: RW, height: RH } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  await page.goto(`${BASE}?capture&still&w=${RW}${process.env.Q ? '&' + process.env.Q : ''}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.OP, null, { timeout: 60000 });
  await page.evaluate(() => window.OP.ready);
  return { page, errs };
}
const grab = async (page, T) => {
  await page.evaluate((T) => window.OP.frame(T), T);
  return page.locator('#op').screenshot({ type: 'png' });
};

if (mode === 'stills') {
  const times = (a1 || '1,5,9').split(',').map(Number);
  const out = path.resolve(a2 || path.join(G, 'shots/opening-film', `stills-${stamp}`));
  fs.mkdirSync(out, { recursive: true });
  await withBrowserJob('opening-stills', async (browser) => {
    const { page, errs } = await openPage(browser);
    for (const T of times) {
      const f = path.join(out, `t${T.toFixed(2).padStart(5, '0')}.png`);
      fs.writeFileSync(f, await grab(page, T));
      console.log(f);
    }
    if (errs.length) console.log('PAGE ERRORS:\n' + [...new Set(errs)].join('\n'));
  });
} else if (mode === 'video') {
  const out = path.resolve(a1 || path.join(G, 'shots/opening-film', `video-${stamp}`));
  const fps = +(a2 || 30),
    from = +(a3 || 0),
    to = +(a4 || 70);
  fs.mkdirSync(out, { recursive: true });
  const mp4 = path.join(out, `opening-${RW}.mp4`);
  const n = Math.round((to - from) * fps);
  await withBrowserJob('opening-video', async (browser) => {
    const { page, errs } = await openPage(browser);
    // frames go straight into ffmpeg as PNGs; the music is cut to the same span
    const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
      '-ss', String(from), '-t', String(to - from), '-i', path.join(G, 'audio/music/opening.mp3'),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', mp4], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let i = 0; i < n; i++) {
      const T = from + i / fps;
      const buf = await grab(page, T);
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      if (i % (fps * 5) === 0) console.log(`frame ${i}/${n}  T=${T.toFixed(2)}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end();
    await new Promise((r) => ff.on('close', r));
    if (errs.length) console.log('PAGE ERRORS:\n' + [...new Set(errs)].join('\n'));
  }, { timeoutMs: 3600000, gpuWaitMs: 900000 });
  console.log(mp4);
} else {
  console.log('modes: stills <t,t,...> [out] | video [out] [fps] [from] [to]');
}
