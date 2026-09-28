// Headless helper: node tools/creator/run.mjs <page path+query> [out.png] [w h]
// Prints window.__out; saves a screenshot if asked; writes window.__files ({path: text}) into the repo.
// Takes the browser lock (GUIDE, Process) and gives it back when the browser exits.
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const LOCK = '/tmp/claude-1000/browser.lock', ME = 'creator';
const [url, out, w = 1400, h = 900] = process.argv.slice(2);
for (let i = 0; ; i++) {
  try { fs.mkdirSync(LOCK); fs.writeFileSync(LOCK + '/owner', ME); break; } catch (e) {
    if (i > 480) { console.error('browser lock held'); process.exit(2); }
    await new Promise((r) => setTimeout(r, 5000));
  }
}
const release = () => { try { if (fs.readFileSync(LOCK + '/owner', 'utf8').includes(ME)) fs.rmSync(LOCK, { recursive: true }); } catch (e) {} };
process.on('exit', release);
const b = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const p = await b.newPage({ viewport: { width: +w, height: +h } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); if (m.type() === 'log') console.log('  log:', m.text()); });
  await p.goto('http://127.0.0.1:8771/' + url);
  await p.waitForFunction(() => window.__done, null, { timeout: 240000 }).catch(() => errs.push('timeout'));
  const res = await p.evaluate(() => ({ out: window.__out || '', files: window.__files || {} }));
  if (res.out) console.log(res.out);
  for (const [f, text] of Object.entries(res.files)) { fs.writeFileSync(f, text); console.log('wrote', f); }
  if (out) await p.screenshot({ path: out, fullPage: true });
  console.log(out || '', errs.length ? 'ERR ' + errs.join(' | ') : 'ok');
} finally { await b.close(); release(); }
