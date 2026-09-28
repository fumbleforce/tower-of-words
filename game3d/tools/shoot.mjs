// Stills of the three places. node game3d/tools/shoot.mjs <outdir> name:place:w:h[:extra query] ...
// GL=gpu renders on the real GPU (take the shared GPU lock first, see GUIDE.md); otherwise SwiftShader.
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const [out, ...specs] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const gl = process.env.GL === 'gpu' ? ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const b = await chromium.launch({ headless: true, args: gl });
for (const s of specs) {
  const [name, place, w, h, extra] = s.split(':');
  const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +(process.env.DPR || 1) });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
  await p.goto(`http://127.0.0.1:8771/game3d/index.html?cap&q=1&place=${place}${extra ? '&' + extra : ''}`);
  await p.waitForFunction(() => window.__done, null, { timeout: 90000 }).catch(() => errs.push('timeout'));
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${out}/${name}.png` });
  console.log(name, errs.length ? 'ERR ' + errs.join(' | ') : 'ok');
  await p.close();
}
await b.close();
