// Frame-exact capture of proto2/opening with headless Chromium (GPU WebGL), piped into ffmpeg with the song.
// Needs Playwright (installed in ~/ai/opening) and a static server on the repo root:
//   python3 -m http.server 8765 --directory ~/repo/japanese &
//   NODE_PATH=~/ai/opening/node_modules node tools/opening/capture.js video out.mp4 [fps=30] [t0] [t1]
//   NODE_PATH=~/ai/opening/node_modules node tools/opening/capture.js stills outdir t1 t2 ...   (JPEGs at those times)
//   NODE_PATH=~/ai/opening/node_modules node tools/opening/capture.js shots outdir [per=3]       (per shot: start/mid/end frames)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const URL = process.env.OP_URL || 'http://127.0.0.1:8765/proto2/opening/index.html?capture&full';

async function open() {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=vulkan', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('console', m => { if (m.type() === 'error') console.error('page:', m.text()); });
  p.on('pageerror', e => console.error('pageerror:', e.message));
  await p.goto(URL);
  await p.waitForFunction(() => window.OP_READY === true, null, { timeout: 180000 });
  return { b, p };
}
async function grab(p, t, q = 0.93) {
  const b64 = await p.evaluate(([t, q]) => { window.renderAt(t); return document.getElementById('c').toDataURL('image/jpeg', q).split(',')[1]; }, [t, q]);
  return Buffer.from(b64, 'base64');
}

(async () => {
  const [mode, out, ...rest] = process.argv.slice(2);
  const { b, p } = await open();
  if (mode === 'video') {
    const fps = +(rest[0] || 30), t0 = +(rest[1] || 0);
    const dur = await p.evaluate(() => DUR);
    const t1 = +(rest[2] || dur);
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
      '-ss', String(t0), '-t', String(t1 - t0), '-i', path.join(ROOT, 'game/audio/music/opening-tv.mp3'),
      '-af', `afade=t=out:st=${Math.max(0, t1 - t0 - 0.6)}:d=0.6`,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out],
      { stdio: ['pipe', 'inherit', 'inherit'] });
    const n = Math.round((t1 - t0) * fps);
    for (let i = 0; i < n; i++) {
      const buf = await grab(p, t0 + i / fps);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 300 === 0) console.log('frame', i, '/', n);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
  } else if (mode === 'stills') {
    fs.mkdirSync(out, { recursive: true });
    for (const t of rest.map(Number)) fs.writeFileSync(path.join(out, `t${t.toFixed(2).padStart(6, '0')}.jpg`), await grab(p, t));
  } else if (mode === 'shots') {
    fs.mkdirSync(out, { recursive: true });
    const per = +(rest[0] || 3);
    const cuts = await p.evaluate(() => CUTS);
    for (const c of cuts) for (let k = 0; k < per; k++) {
      const t = c.start + (c.end - c.start) * (per === 1 ? 0.5 : (0.08 + 0.84 * k / (per - 1)));
      fs.writeFileSync(path.join(out, `s${String(c.n).padStart(2, '0')}-${c.id}-${k}.jpg`), await grab(p, t, 0.9));
    }
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
