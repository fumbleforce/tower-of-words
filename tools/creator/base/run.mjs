// node tools/creator/base/run.mjs "<page path+query>" <out dir>
// Runs a base-body page headless (takes the shared browser lock) and writes window.__bin: "name.png" -> one PNG,
// "name" -> a list of frames, saved as <name>.webp (animated, 12 fps) in the out dir.
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const LOCK = '/tmp/claude-1000/browser.lock.' + process.pid, ME = 'creator-base';
const [url, outDir] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
for (let i = 0; ; i++) {
  try { fs.mkdirSync(LOCK); fs.writeFileSync(LOCK + '/owner', ME + ' ' + new Date().toISOString()); break; } catch (e) {
    if (i > 2400) { console.error('browser lock held'); process.exit(2); }
    await new Promise((r) => setTimeout(r, 1000));
  }
}
const release = () => { try { if (fs.readFileSync(LOCK + '/owner', 'utf8').includes(ME)) fs.rmSync(LOCK, { recursive: true }); } catch (e) {} };
process.on('exit', release);
const b = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let res, errs = [];
try {
  const p = await b.newPage({ viewport: { width: 800, height: 600 } });
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); if (m.type() === 'log') console.log('  log:', m.text()); });
  await p.goto('http://127.0.0.1:8771/' + url);
  await p.waitForFunction(() => window.__done || window.__err, null, { timeout: 900000 }).catch(() => errs.push('timeout'));
  res = await p.evaluate(() => ({ out: window.__out || '', bin: window.__bin || {}, files: window.__files || {} }));
} finally { await b.close(); release(); }
const png = (d) => Buffer.from(d.split(',')[1], 'base64');
for (const [name, d] of Object.entries(res.bin)) {
  if (typeof d === 'string') { fs.writeFileSync(`${outDir}/${name}`, png(d)); continue; }
  const fd = `${outDir}/frames-${name}`; fs.mkdirSync(fd, { recursive: true });
  d.forEach((f, i) => fs.writeFileSync(`${fd}/${String(i).padStart(3, '0')}.png`, png(f)));
  execFileSync('python3', ['-c', `import glob,sys
from PIL import Image
fs=sorted(glob.glob(sys.argv[1]+'/*.png')); im=[Image.open(f).convert('RGB') for f in fs]
im[0].save(sys.argv[2],save_all=True,append_images=im[1:],duration=83,loop=0,quality=82)`, fd, `${outDir}/${name}.webp`]);
  fs.rmSync(fd, { recursive: true });
}
for (const [f, text] of Object.entries(res.files)) fs.writeFileSync(f, text);
console.log(res.out, errs.length ? 'ERR ' + errs.join(' | ') : 'ok');
