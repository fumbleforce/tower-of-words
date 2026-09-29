// The interaction marks: Eric next to a target (full frame plus a close crop) and on open floor (every dot).
//   PLACE=office IDS=kenji,vending,free:0:-1 ... (defaults: the train, the cat, Aoi, open floor)
//   sh game3d/tools/with-browser-lock.sh ring node game3d/tools/target-ring-shots.mjs <outdir> <prefix> [W H] [try]
// q=1 so the outline pass is on. `try` = a|b|c injects a trial highlight in the page (used once to compare options).
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [out = 'game3d/shots/target-ring', pre = 'after', W = '1366', H = '860', trial = ''] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const phone = +W < 700;
const p = await b.newPage({ viewport: { width: +W, height: +H }, isMobile: phone, hasTouch: phone });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.addInitScript(() => { try { localStorage.setItem('amakawa-onboard', JSON.stringify({ moved: true, talked: true, uses: 1, sayUsed: false })); } catch {} });
const PLACE = process.env.PLACE || 'train';
const IDS = (process.env.IDS || 'tama,aoi,free:-1.6:0').split(',');
await p.goto(`http://127.0.0.1:8771/game3d/index.html?q=1&place=${PLACE}`);
if (PLACE === 'train') {   // only the train opens on the title
  await p.waitForFunction(() => document.body.classList.contains('at-title'), null, { timeout: 120000 });
  await p.waitForTimeout(1500); if (phone) await p.tap('#title .go'); else await p.click('#title .go');
}
await p.waitForFunction(() => window.__game && window.__game.player && !document.body.classList.contains('at-title'), null, { timeout: 60000 });
await p.waitForTimeout(2500);
// other places open on a story beat: click through it so the room is in play
for (let i = 0; i < 25 && PLACE !== 'train' && (await p.evaluate(() => !!window.__game.busy)); i++) { await p.keyboard.press('Space'); await p.waitForTimeout(500); }
if (trial) await p.evaluate(async (trial) => {
  const THREE = await import('three');
  const G = window.__game, nr = document.getElementById('nearRing');
  nr.style.visibility = 'hidden';
  if (trial === 'a') return;                       // outline only
  if (trial === 'b') {                             // a small soft pool of light on the surface under the target, depth tested
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(0.6, 'rgba(255,255,255,.35)'); gr.addColorStop(0.82, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const m = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), color: '#bff1ea', transparent: true, opacity: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const disc = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m); disc.rotation.x = -Math.PI / 2; disc.renderOrder = 2;
    const box = new THREE.Box3(), sz = new THREE.Vector3(), ct = new THREE.Vector3();
    const tick = () => {
      requestAnimationFrame(tick);
      const P = G.place, t = G.near; if (!P) return;
      if (disc.parent !== P.scene) P.scene.add(disc);
      const objs = t ? G.objsOf(t) : [];
      disc.visible = !!objs.length && !G.busy; if (!disc.visible) return;
      box.makeEmpty(); for (const o of objs) box.expandByObject(o);
      box.getSize(sz); box.getCenter(ct);
      const r = Math.min(0.34, Math.max(0.16, Math.max(sz.x, sz.z) * 0.62));
      disc.position.set(ct.x, box.min.y + 0.012, ct.z); disc.scale.set(r * 2, r * 2, 1);
    };
    tick(); return;
  }
  if (trial === 'c') {                             // a small chevron over the head
    const d = document.createElement('div'); d.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid #bff1ea;filter:drop-shadow(0 1px 1px rgba(10,14,24,.6));pointer-events:none;z-index:0';
    document.getElementById('ui').prepend(d);
    const v = new THREE.Vector3();
    const tick = () => { requestAnimationFrame(tick); const t = G.near; if (!t || !G.place) { d.hidden = true; return; } d.hidden = false; t.anchor(v); v.y += 0.12; v.project(G.place.camera); d.style.transform = `translate(${(((v.x + 1) / 2) * innerWidth - 7).toFixed(0)}px, ${(((1 - v.y) / 2) * innerHeight - 9).toFixed(0)}px)`; };
    tick();
  }
}, trial);
await p.evaluate(() => { if (window.__onboard) window.__onboard.moved = true; });
for (const id of IDS) {
  // free:x:z stands Eric on open floor with nothing in reach (every dot, no pointer)
  await p.evaluate((id) => { const G = window.__game; const s = id.startsWith('free') ? id.split(':').slice(1).map(Number) : G.markers.list.find((x) => x.id === id).spot(); G.player.root.position.x = s[0]; G.player.root.position.z = s[1]; }, id);
  await p.waitForTimeout(1800);
  const tag = `${PLACE}-${id.split(':')[0]}`, f = `${out}/${pre}-${tag}-${W}x${H}.png`;
  await p.screenshot({ path: f });
  // close crop around the target
  if (id.startsWith('free')) continue;
  const c = await p.evaluate((id) => { const G = window.__game; const m = G.markers.list.find((x) => x.id === id); const v = m.anchor(new (G.player.root.position.constructor)()); v.project(G.place.camera); return [((v.x + 1) / 2) * innerWidth, ((1 - v.y) / 2) * innerHeight]; }, id);
  const cw = Math.min(+W, 520), ch = Math.min(+H, 340);
  const x = Math.max(0, Math.min(+W - cw, c[0] - cw / 2)), y = Math.max(0, Math.min(+H - ch, c[1] - ch / 2));
  await p.screenshot({ path: `${out}/${pre}-${tag}-${W}x${H}-crop.png`, clip: { x, y, width: cw, height: ch } });
}
// hover and click on the cat on its seat, from across the aisle: the cat's model gets the outline, and the click talks
// to the cat instead of walking onto the seat
if (PLACE === 'train' && !trial) {
  await p.evaluate(() => { const G = window.__game; G.player.root.position.x = -0.9; G.player.root.position.z = 0.6; });
  await p.waitForTimeout(900);
  const pt = await p.evaluate(() => { const G = window.__game, k = G.place.people.tama.root, v = new (k.position.constructor)(); k.getWorldPosition(v); v.y += 0.12; v.project(G.place.camera); return [((v.x + 1) / 2) * innerWidth, ((1 - v.y) / 2) * innerHeight]; });
  await p.mouse.move(pt[0], pt[1]); await p.waitForTimeout(900);
  const hov = await p.evaluate(() => window.__game.hover && window.__game.hover.id);
  const cw = 520, ch = 340, x = Math.max(0, Math.min(+W - cw, pt[0] - cw / 2)), y = Math.max(0, Math.min(+H - ch, pt[1] - ch / 2));
  await p.screenshot({ path: `${out}/${pre}-train-hovercat-${W}x${H}-crop.png`, clip: { x, y, width: cw, height: ch } });
  await p.mouse.click(pt[0], pt[1]); await p.waitForTimeout(4000);
  const res = await p.evaluate(() => { const G = window.__game; return { seated: !!G.player.seated, busy: !!G.busy, talk: (document.querySelector('#talk') || {}).innerText || '' }; });
  await p.screenshot({ path: `${out}/${pre}-train-clickcat-${W}x${H}.png` });
  console.log('hover:', hov, 'after click:', JSON.stringify(res).slice(0, 300));
}
console.log(pre, errs.length ? 'ERR ' + errs.join(' | ') : 'ok');
await b.close();
