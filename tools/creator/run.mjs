// Headless helper: node tools/creator/run.mjs <page path+query> [out.png] [w h]
// Prints window.__out; saves a screenshot if asked; writes window.__files ({path: text}) into the repo.
// Shares bounded browser/GPU admission and cleanup with the other repo tools.
import { withBrowserJob } from '../lib/browser-job.mjs';
import fs from 'node:fs';
const [url, out, w = 1400, h = 900] = process.argv.slice(2);
if (!url) throw Error('Usage: node tools/creator/run.mjs <page path+query> [out.png] [w h]');
await withBrowserJob('creator-capture', async browser => {
  const p = await browser.newPage({ viewport: { width: +w, height: +h } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); if (m.type() === 'log') console.log('  log:', m.text()); });
  await p.goto('http://127.0.0.1:8771/' + url);
  await p.waitForFunction(() => window.__done || window.__err, null, { timeout: 240000 });
  const pageError = await p.evaluate(() => window.__err);
  if (pageError) errs.push(String(pageError));
  if (errs.length) throw Error(errs.join(' | '));
  const res = await p.evaluate(() => ({ out: window.__out || '', files: window.__files || {} }));
  if (res.out) console.log(res.out);
  for (const [f, text] of Object.entries(res.files)) { fs.writeFileSync(f, text); console.log('wrote', f); }
  if (out) await p.screenshot({ path: out, fullPage: true });
  console.log(out || '', 'ok');
});
