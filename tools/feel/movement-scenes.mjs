// All movement scenarios in one headless browser, for a staging copy served on a port (take the browser lock first): node tools/feel/movement-scenes.mjs <outdir> [port]
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [OUT = 'r3', port = '8797'] = process.argv.slice(2);
const b = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const G = 'const g=window.__game, M=window.__mv, sl=(ms)=>new Promise(r=>setTimeout(r,ms));';
const state = (p) => p.evaluate(() => { const g = window.__game, f = (r) => r && r.root ? { x: +r.root.position.x.toFixed(2), z: +r.root.position.z.toFixed(2), yaw: +r.root.rotation.y.toFixed(2), st: r.state } : null; return { t: +g.t.toFixed(2), eric: f(g.player), mio: f(g.mioNpc), mori: f(g.place.people.mori), busy: g.busy }; });
async function scene(name, place, w, h, steps) {
  const out = `${OUT}/${name}`; fs.mkdirSync(out, { recursive: true });
  const p = await b.newPage({ viewport: { width: w, height: h } });
  const errs = []; p.on('pageerror', (e) => { if (!/'m' before/.test(e.message)) errs.push(e.message); });
  await p.goto(`http://127.0.0.1:${port}/game3d/index.html?cap&q=0&place=${place}`);
  await p.waitForFunction(() => window.__done, null, { timeout: 400000 });
  await p.evaluate(async () => { window.__mv = await import('/game3d/js/move.js'); window.__run = true; window.__evErr = []; });
  let n = 0; const log = [];
  for (const s of steps) {
    if (s.eval) await p.evaluate(`setTimeout(async () => { try { ${G} ${s.eval} } catch (e) { window.__evErr.push(String(e)); } }, 0); 0`);
    if (s.probe) log.push({ probe: await p.evaluate(`(() => { ${G} return (${s.probe}); })()`).catch((e) => 'ERR ' + e.message) });
    if (s.tapBody) {
      const xy = await p.evaluate((id) => { const g = window.__game, r = g.place.people[id]; const v = r.root.getWorldPosition(new (r.root.position.constructor)()); v.y += 0.45 * (g.place.charScale || 1); v.project(g.place.camera); const c = document.getElementById('c').getBoundingClientRect(); return [((v.x + 1) / 2) * c.width + c.left, ((1 - v.y) / 2) * c.height + c.top]; }, s.tapBody);
      await p.mouse.click(xy[0], xy[1]); log.push({ tapBody: s.tapBody, at: xy.map(Math.round) });
    }
    if (s.shots) for (let i = 0; i < s.shots; i++) { await p.waitForTimeout(s.every || 400); await p.screenshot({ path: `${out}/f${String(n++).padStart(3, '0')}.png` }); log.push({ f: n - 1, ...(await state(p)) }); }
  }
  errs.push(...(await p.evaluate(() => window.__evErr)));
  fs.writeFileSync(`${out}/log.json`, JSON.stringify(log));
  console.log(name, errs.length ? 'ERR ' + errs.slice(0, 3).join(' | ') : 'ok', n);
  await p.close();
}
const approach = (x, z) => [{ eval: `g.player.root.position.set(${x},0,${z}); g.walker.sync();` }, { shots: 1, every: 200 }, { probe: "(() => { const m = g.markers.list.find((q) => q.id === 'mori'); const r = g.place.people.mori; const K = g.place.charScale; const c = []; for (let i = 0; i < 16; i++) { const a = r.root.rotation.y + i / 16 * 6.283, x = r.root.position.x + Math.sin(a) * 0.57 * K * 1.15, z = r.root.position.z + Math.cos(a) * 0.57 * K * 1.15; c.push([+x.toFixed(2), +z.toFixed(2), g.place.nav.free(x, z, g.place.nav.R + 0.02)]); } return { spot: M.approachSpot(g, m), kind: m.kind, seated: r.seated, vis: r.root.visible, parentIsSpace: r.root.parent === g.place.space, c }; })()" }, { tapBody: 'mori' }, { shots: 10, every: 450 }];
const cross = [{ eval: 'g.mioNpc.root.visible=true; g.mioNpc.root.position.set(3.0,0,1.3); g.mioNpc.root.rotation.y=-1.57; g.player.root.position.set(-2.6,0,1.3); g.walker.sync(); g.place.cam.snap && g.place.cam.snap(g.player.root.position);' }, { shots: 1, every: 200 }, { eval: 'g.walkTo(3.6,1.3); M.walkRig(g, g.mioNpc, [-3.1,1.3], {speed:1.0});' }, { shots: 16, every: 380 }];
const objectives = [{ eval: "for (const id of ['vending','copier','coffee_machine','kenji','my_desk']) { const m=g.markers.list.find(x=>x.id===id); if(!m) continue; const sp=M.approachSpot(g,m)||m.spot(); await new Promise(r=>g.walker.goTo(sp[0],sp[1],r)); if(m.face) g.walker.faceTo(...m.face()); await sl(900); }" }, { shots: 34, every: 500 }];
const arrive = [{ eval: "g.place.capState('stopped'); g.place.capState('sit'); g.walker.sync();" }, { shots: 1, every: 300 }, { eval: "await g.hooks.stand({who:'mio'}); await g.hooks.stand({who:'eric'}); await sl(500); g.hooks.walk({who:'mio', to:'door_l', wait:false});" }, { shots: 14, every: 350 }];
await scene('arrive-desk', 'train', 1366, 860, arrive);
await scene('approach-desk', 'office', 1366, 860, approach(-3.2, -0.4));
await scene('cross-desk', 'office', 1366, 860, cross);
await scene('objectives-desk', 'office', 1366, 860, objectives);
await scene('arrive-phone', 'train', 390, 844, arrive);
await scene('approach-phone', 'office', 390, 844, approach(-4.2, -0.3));
await scene('cross-phone', 'office', 390, 844, cross);
await b.close();
console.log('ALLDONE');
