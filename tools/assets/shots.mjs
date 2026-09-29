// Screenshots of the asset gallery at desktop (1366) and phone (390) widths, for checking the layout:
// the grid, a filtered view, a portrait, a 3D model in the turntable and an audio clip.
//   node tools/assets/shots.mjs      writes tools/assets/shots/*.png
// Takes the shared browser lock; software GL.
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUT = path.join(ROOT, 'tools/assets/shots');
fs.mkdirSync(OUT, { recursive: true });
const LOCK = '/tmp/claude-1000/browser.lock', ME = 'asset-shots';
for (let tries = 0; ; tries++) {
  try { fs.mkdirSync(LOCK); fs.writeFileSync(LOCK + '/owner', ME + ' ' + new Date().toISOString()); break; }
  catch { if (tries % 12 === 0) console.log('waiting for the browser lock'); await new Promise((r) => setTimeout(r, 5000)); }
}
const unlock = () => { try { if (fs.readFileSync(LOCK + '/owner', 'utf8').startsWith(ME)) fs.rmSync(LOCK, { recursive: true, force: true }); } catch {} };
process.on('exit', unlock); process.on('SIGINT', () => process.exit(130)); process.on('SIGTERM', () => process.exit(143));
const PORT = 8779;
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
process.on('exit', () => srv.kill());
await new Promise((r) => setTimeout(r, 700));

const b = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
const base = `http://127.0.0.1:${PORT}/tools/assets/`;
const views = [
  ['grid', ''],
  ['approved-portraits', '#status=approved&kind=portrait'],
  ['portrait', '#a=portrait/mio-smile'],
  ['model', '#a=model/eric-meshy'],
  ['anim', '#a=animation/eric-wave'],
  ['prop', '#a=prop/office/copier'],
  ['voice', '#kind=voice,voice-ref&who=mio'],
  ['voice-detail', '#a=voice-ref/mio-a'],
];
for (const [w, h] of [[1366, 860], [390, 844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => errs.push(`${w}: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(`${w}: ${m.text()}`); });
  for (const [name, hash] of views) {
    await p.goto('about:blank');
    await p.goto(base + hash);
    await p.waitForSelector('.card', { timeout: 20000 });
    if (/a=/.test(hash)) {
      await p.waitForFunction(() => !document.querySelector('#detail').hidden, null, { timeout: 20000 });
      await p.waitForFunction(() => !document.querySelector('.dpreview .loading'), null, { timeout: 60000 }).catch(() => {});
      await p.waitForTimeout(1500);
    } else {
      await p.waitForTimeout(800);
    }
    await p.screenshot({ path: path.join(OUT, `${name}-${w}.png`) });
  }
  if (w === 390) {   // the filter sheet on the phone
    await p.goto(base); await p.waitForSelector('.card'); await p.click('#filtersBtn'); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(OUT, `filters-${w}.png`) });
  }
  await p.close();
}
await b.close();
console.log('shots in tools/assets/shots/');
if (errs.length) console.log('page errors:\n ' + [...new Set(errs)].join('\n '));
unlock(); srv.kill(); process.exit(0);
