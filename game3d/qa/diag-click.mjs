// QA diagnostic: from a new game on the train, click the floor at a target's ring and on the target's body, and
// report whether Eric gets a walk path and where he ends up. node game3d/qa/diag-click.mjs [w] [h] [id=mio] <outdir>
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [W = '1366', H = '860', ID = 'mio', out = '/tmp/claude-1000/qa-diag'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const gl = process.env.GL === 'gpu' ? ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const b = await chromium.launch({ headless: true, args: gl });
const p = await b.newPage({ viewport: { width: +W, height: +H } });
await p.goto('http://127.0.0.1:8771/game3d/index.html');
await p.waitForFunction(() => document.body.classList.contains('at-title'), null, { timeout: 180000 });
await p.evaluate(() => { try { localStorage.clear(); } catch {} });
await p.waitForTimeout(1500); await p.keyboard.press('Enter'); await p.waitForTimeout(3500);
await p.keyboard.down('KeyD'); await p.waitForTimeout(600); await p.keyboard.up('KeyD');
const st = () => p.evaluate((id) => { const G = window.__game, m = G.markers.list.find((x) => x.id === id), q = G.player.root.position; const proj = (x, y, z) => { const V = G.place.camera.position.constructor; const v = new V(x, y, z); G.place.space.localToWorld(v); v.project(G.place.camera); return [Math.round(((v.x + 1) / 2) * innerWidth), Math.round(((1 - v.y) / 2) * innerHeight)]; }; const s = m.spot(); const r = G.place.people && G.place.people[id]; const rp = r && r.root ? r.root.position : null; return { player: [+q.x.toFixed(2), +q.z.toFixed(2)], spot: s.map((v) => +v.toFixed(2)), spotXY: proj(s[0], G.place.floorY || 0, s[1]), bodyXY: rp ? proj(rp.x, rp.y + 0.5, rp.z) : null, path: G.walker.path ? G.walker.path.length : 0, near: G.near && G.near.id, talk: !document.querySelector('#talk').hidden }; }, ID);
let s = await st(); console.log('start', JSON.stringify(s));
await p.mouse.click(...s.spotXY); await p.waitForTimeout(300); console.log('after floor click (0.3 s)', JSON.stringify(await st()));
await p.waitForTimeout(4000); s = await st(); console.log('after floor click (4 s)', JSON.stringify(s)); await p.screenshot({ path: out + '/after-floor-click.png' });
if (s.bodyXY) { await p.mouse.click(...s.bodyXY); await p.waitForTimeout(4000); console.log('after body click (4 s)', JSON.stringify(await st())); await p.screenshot({ path: out + '/after-body-click.png' }); }
await b.close();
