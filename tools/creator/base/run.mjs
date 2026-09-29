// node tools/creator/base/run.mjs "<page path+query>" <out dir>
// Runs a base-body page headless (bounded per-process browser job) and writes window.__bin: "name.png" -> one PNG,
// "name" -> frames saved as <name>.webp; window.__durations supplies clip durations in seconds.
import { withBrowserJob } from '../browser-job.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const started = Date.now();
const [url, outDir] = process.argv.slice(2);
if (!url || !outDir) throw new Error('Usage: node tools/creator/base/run.mjs <page path+query> <out dir>');
const safePath = (base, name) => {
  const target = path.resolve(base, name), relative = path.relative(base, target);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Output outside allowed directory: ' + name);
  return target;
};
const res = await withBrowserJob('creator-base', async browser => {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  const errors = [];
  const failed = new Promise((_, reject) => page.on('pageerror', reject));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
    if (message.type() === 'log') console.log('  log:', message.text());
  });
  const result = await Promise.race([failed, (async () => {
    const response = await page.goto('http://127.0.0.1:8771/' + url, { timeout: 30000 });
    if (!response?.ok()) throw new Error('Page HTTP status: ' + response?.status());
    await page.waitForFunction(() => window.__done || window.__err, null, { timeout: 240000 });
    return page.evaluate(() => ({ error: window.__err, out: window.__out || '', bin: window.__bin || {}, files: window.__files || {}, sources: window.__sources || [], durations: window.__durations || {} }));
  })()]);
  if (result.error) throw new Error(String(result.error));
  if (errors.length) throw new Error(errors.join(' | '));
  if (!Object.keys(result.bin).length && !Object.keys(result.files).length) throw new Error('Page completed without output');
  return result;
});
fs.mkdirSync(outDir, { recursive: true });
const outputRoot = path.resolve(outDir);
const png = (d) => Buffer.from(d.split(',')[1], 'base64');
for (const [name, d] of Object.entries(res.bin)) {
  if (Date.now() - started > 295000) throw new Error('Render/export exceeded five-minute budget');
  if (typeof d === 'string') { fs.writeFileSync(safePath(outputRoot, name), png(d)); continue; }
  const fd = fs.mkdtempSync(safePath(outputRoot, `frames-${name}-`));
  try {
    d.forEach((f, i) => fs.writeFileSync(`${fd}/${String(i).padStart(3, '0')}.png`, png(f)));
    const duration = res.durations[name] ?? d.length * 0.083;
    if (!Number.isFinite(duration) || duration <= 0 || !d.length) throw new Error('Invalid animation duration: ' + name);
    execFileSync('python3', ['-c', `import glob,sys
from PIL import Image
fs=sorted(glob.glob(sys.argv[1]+'/*.png')); im=[Image.open(f).convert('RGB') for f in fs]
total=round(float(sys.argv[3])*1000); n=len(im)
durations=[max(1,round((i+1)*total/n)-round(i*total/n)) for i in range(n)]
im[0].save(sys.argv[2],save_all=True,append_images=im[1:],duration=durations,loop=0,quality=82)`, fd, safePath(outputRoot, `${name}.webp`), String(duration)], { timeout: Math.max(1, Math.min(30000, 295000 - (Date.now() - started))) });
  } finally { fs.rmSync(fd, { recursive: true }); }
}
for (const [f, text] of Object.entries(res.files)) fs.writeFileSync(safePath(ROOT, f), text);
const hashes = Object.fromEntries(res.sources.map(file => [file, createHash('sha256').update(fs.readFileSync(safePath(ROOT, file))).digest('hex')]));
fs.writeFileSync(path.join(outputRoot, 'capture.json'), JSON.stringify({captured:new Date().toISOString(), url, hashes, durations:res.durations}, null, 2) + '\n');
console.log(res.out, 'ok');
