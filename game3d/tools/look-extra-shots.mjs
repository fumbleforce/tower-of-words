// Extra stills for review style-in-game: the settings panel with the Surface detail switch (desktop and phone), and
// the showcase room's close view of avenue 4, first version against the softer one.
//   node game3d/tools/look-extra-shots.mjs <outdir>
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const [out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const gl = process.env.GL === 'gpu' ? ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const b = await chromium.launch({ headless: true, args: gl });
const log = (n, errs) => console.log(n, errs.length ? 'ERR ' + errs.slice(0, 3).join(' | ') : 'ok');
for (const [name, w, h, dpr, mobile] of [['settings-desk', 1366, 860, 1, false], ['settings-phone', 390, 844, 2, true]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://127.0.0.1:8771/game3d/index.html?shell=settings');
  await p.waitForTimeout(6000);
  await p.locator('#settings #st-graphics').click().catch((e) => errs.push(e.message)); // Surface detail is in Graphics
  const sw = p.locator('#settings [data-key="surfaces"]');
  await sw.scrollIntoViewIfNeeded().catch((e) => errs.push(e.message));
  await p.screenshot({ path: `${out}/${name}.png` });
  log(name, errs); await ctx.close();
}
for (const [name, q] of [['showcase-look4-first', 'bake=hard'], ['showcase-look4-soft', 'bake=soft'], ['showcase-look0', '']]) {
  const p = await b.newPage({ viewport: { width: 1366, height: 860 } }); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://127.0.0.1:8771/game3d/showcase.html?cap&q=2&look=${name === 'showcase-look0' ? 0 : 4}&view=close&${q}`);
  await p.waitForFunction(() => window.__done, null, { timeout: 180000 }).catch(() => errs.push('timeout'));
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${out}/${name}.png` });
  log(name, errs); await p.close();
}
for (const n of [2, 8]) {
  const p = await b.newPage({ viewport: { width: 1366, height: 860 } }); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://127.0.0.1:8771/game3d/showcase.html?cap&q=2&look=${n}&view=close`);
  await p.waitForFunction(() => window.__done, null, { timeout: 180000 }).catch(() => errs.push('timeout'));
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${out}/showcase-look${n}.png` });
  log('showcase-look' + n, errs); await p.close();
}
await b.close();
