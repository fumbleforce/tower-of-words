// Stills of the dorm-route diorama (scene/index.html). Run under the browser lock, with the GPU lock held:
//   GL=gpu sh game3d/tools/with-browser-lock.sh dorm-route node art/candidates/dorm-route-claude/shoot.mjs <outdir> name:shot:w:h[:extra query] ...
// Writes <outdir>/<name>.png and, for each, <outdir>/<name>.anchors.json (screen positions for the layout labels).
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const [out, ...specs] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const gl = process.env.GL === 'gpu' ? ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const b = await chromium.launch({ headless: true, args: gl });
for (const s of specs) {
  const [name, shot, w, h, extra] = s.split(':');
  const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +(process.env.DPR || 2) });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
  await p.goto(`http://127.0.0.1:8771/art/candidates/dorm-route-claude/scene/index.html?cap&shot=${shot}${extra ? '&' + extra : ''}`);
  await p.waitForFunction(() => window.__done, null, { timeout: 120000 }).catch(() => errs.push('timeout'));
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${out}/${name}.png` });
  const a = await p.evaluate(() => window.__anchors && window.__anchors()).catch(() => null);
  if (a) fs.writeFileSync(`${out}/${name}.anchors.json`, JSON.stringify({ dpr: +(process.env.DPR || 2), ...a }));
  console.log(name, errs.length ? 'ERR ' + errs.join(' | ') : 'ok');
  await p.close();
}
await b.close();
