// Frame sequences of movement in cap mode: node seq.mjs <out> <place> <w> <h> <script json>
// script: [{tap:[x,y]} | {adv:secs, shots:n} | {key:'KeyW', down:true}]
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [out, place, w, h, js, port = '8779', extra = ''] = process.argv.slice(2);
const steps = JSON.parse(js);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ headless: true, args: process.env.GL === 'gpu' ? ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
await p.goto(`http://127.0.0.1:${port}/game3d/index.html?cap&q=1&place=${place}${extra}`);
await p.waitForFunction(() => window.__done, null, { timeout: 90000 });
await p.waitForTimeout(400);
let n = 0; const log = [];
for (const s of steps) {
  if (s.tap) { await p.mouse.click(s.tap[0], s.tap[1]); }
  if (s.key) { if (s.down) await p.keyboard.down(s.key); else await p.keyboard.up(s.key); }
  if (s.eval) await p.evaluate(s.eval);
  if (s.adv) {
    const k = s.shots || 1;
    for (let i = 0; i < k; i++) {
      const r = await p.evaluate((d) => { window.__advance(d); const g = window.__game, w = g.walker, pl = g.player.root.position; return { x: +pl.x.toFixed(3), z: +pl.z.toFixed(3), v: +(w.v || 0).toFixed(3), gait: w.gait ? +w.gait.v.toFixed(3) : null, face: +w.facing.toFixed(2), st: g.player.state, cam: [+g.place.camera.position.x.toFixed(3), +g.place.camera.position.z.toFixed(3)] }; }, s.adv / k);
      log.push(r);
      await p.screenshot({ path: `${out}/f${String(n++).padStart(3, '0')}.png` });
    }
  }
}
fs.writeFileSync(`${out}/log.json`, JSON.stringify(log, null, 0));
console.log(errs.length ? 'ERR ' + errs.join(' | ') : 'ok', n, 'frames');
await b.close();
