// Stills for the style study (js/style/): each style at the play camera in the three places, desktop and phone, plus
// a close-up of Mio and Eric side by side. The UI is hidden so the look can be judged on its own.
//   node game3d/tools/style-shots.mjs <outdir> [styles=0,1,2,3,4,5,6] [--base http://127.0.0.1:8771] [--par 3] [--only close,gate-desk] [--desk 2560x1440]
// Run it under the shared browser lock: sh game3d/tools/with-browser-lock.sh <name> node game3d/tools/style-shots.mjs ...
// GL=gpu renders on the GPU (take the shared GPU lock first, see GUIDE.md); otherwise SwiftShader.
// Output: <outdir>/s<style>/<place>-desk.png, <place>-phone.png, close.png
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const BASE = opt('base', 'http://127.0.0.1:8771'), PAR = +opt('par', 3), ONLY = opt('only', ''), [DW, DH] = opt('desk', '1366x860').split('x').map(Number);
const [out, list = '0,1,2,3,4,5,6'] = argv;
const styles = list.split(',').map(Number);
const gl = process.env.GL === 'gpu' ? ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const b = await chromium.launch({ headless: true, args: gl });
const HIDE = '#ui, #marks, #build, .marks, .mk, #title, #boot { display: none !important; }';

const jobs = [];
for (const s of styles) {
  fs.mkdirSync(`${out}/s${s}`, { recursive: true });
  for (const place of ['office', 'gate', 'train']) {
    jobs.push({ s, name: `${place}-desk`, place, w: DW, h: DH, dpr: 1 });
    jobs.push({ s, name: `${place}-phone`, place, w: 390, h: 844, dpr: 2 });
  }
  jobs.push({ s, name: 'close', place: 'gate', w: DW > 1366 ? DW : 1200, h: DW > 1366 ? DH : 900, dpr: 1, close: true });
}

async function run(j) {
  const p = await b.newPage({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: j.dpr });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
  await p.goto(`${BASE}/game3d/index.html?cap&q=1&place=${j.place}&style=${j.s}`);
  await p.addStyleTag({ content: HIDE }).catch(() => {});
  await p.waitForFunction(() => window.__done, null, { timeout: 180000 }).catch(() => errs.push('timeout'));
  await p.addStyleTag({ content: HIDE }).catch(() => {});
  if (j.close) {
    await p.evaluate(() => {
      const g = window.__game, pl = g.player, mio = g.mioNpc, cam = g.place.camera;
      const right = new cam.position.constructor(); cam.getWorldDirection(right);
      // a couple of metres into the room from where he starts, clear of the entrance rail
      { const n0 = Math.hypot(right.x, right.z) || 1; pl.root.position.x += (right.x / n0) * 2.4; pl.root.position.z += (right.z / n0) * 2.4; }
      const P = pl.root.position;
      mio.root.visible = true;
      // Mio a step to Eric's right as seen from the camera, both turned to it
      const side = { x: -right.z, z: right.x }; const n = Math.hypot(side.x, side.z) || 1;
      mio.root.position.set(P.x + (side.x / n) * 0.62, P.y, P.z + (side.z / n) * 0.62);
      for (const c of [pl, mio]) { c.setState?.('idle'); c.update?.(0.4, 1.25); }
      const T = { x: P.x + (side.x / n) * 0.31, y: 0.62, z: P.z + (side.z / n) * 0.31 };
      // pull in along a flatter angle than the play camera, toward the characters' faces
      const d = 4.3, el = 0.32;
      const hx = right.x, hz = right.z, hn = Math.hypot(hx, hz) || 1;
      cam.position.set(T.x - (hx / hn) * d * Math.cos(el), T.y + d * Math.sin(el), T.z - (hz / hn) * d * Math.cos(el));
      cam.lookAt(T.x, T.y, T.z);
      for (const c of [pl, mio]) c.root.rotation.y = Math.atan2(cam.position.x - c.root.position.x, cam.position.z - c.root.position.z);
      pl.update?.(0.01, 1.25); mio.update?.(0.01, 1.25);
    });
  }
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${out}/s${j.s}/${j.name}.png`, timeout: 300000 }).catch((e) => errs.push('shot ' + e.message.split('\n')[0]));
  console.log(`s${j.s} ${j.name}`, errs.length ? 'ERR ' + errs.slice(0, 3).join(' | ') : 'ok');
  await p.close();
}
const q = jobs.filter((j) => !ONLY || ONLY.split(',').includes(j.name));
await Promise.all(Array.from({ length: PAR }, async () => { while (q.length) await run(q.shift()); }));
await b.close();
