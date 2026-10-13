// Public, matched views and native walking checks for the island's closed edges.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';

const base = process.env.BASE || 'game3d';
const out = process.env.OUT || new URL('../shots/island-boundaries/after/', import.meta.url).pathname;
const before = process.env.BEFORE === '1';
const audit = process.env.AUDIT === '1';
const maps = process.env.MAPS === '1';
const places = (process.env.PLACES || 'forecourt,campus').split(',');
const reports = [];
const movement = [];
fs.mkdirSync(out, { recursive: true });
const views = {
  forecourt: [
    ['approach', [-19.25, -4.9], Math.PI],
    ['west-return', [-18.8, -0.4], -Math.PI / 2],
    ['east-tie', [-16.3, -5.8], Math.PI],
    ['far', [-15.5, 0.4], Math.PI],
  ],
  campus: [
    ['gate-reverse', [-19.25, -10.3], 0],
    ['gate-west', [-21.9, -10], 0.6],
  ],
  sports: [
    ['pool-head', [58.2, -89.5], Math.PI],
    ['grove', [55.4, -82.1], Math.PI],
    ['pavilion-tie', [58.7, -90.4], Math.PI],
    ['gym-tie', [55.5, -79.2], -Math.PI/2],
    ['north-reverse', [58.2, -93.2], 0],
  ],
  works: [
    ['chimney', [-82.4, -117.6], Math.PI],
    ['factory-east', [-49.8, -108], Math.PI],
    ['research', [-42, -107.8], Math.PI],
    ['plant-tie', [-84.5, -117.5], Math.PI],
    ['factory-tie', [-77.4, -117.5], Math.PI],
    ['research-tie', [-36, -108.3], Math.PI],
    ['factory-east-tie', [-50.8, -112.2], -Math.PI/2],
    ['north-reverse', [-47, -112.2], 0],
  ],
  east_coast: [
    ['onsen-west', [106, -81], Math.PI],
    ['onsen-gate', [123.1, -82.7], Math.PI],
  ],
};

if (process.env.VIEWS) for (const place of places) views[place] = views[place].filter(([id]) => process.env.VIEWS.split(',').includes(id));

if (process.env.CAMERA === '1') views.forecourt = [
  ['approach', [-19.25, -4.9], Math.PI],
  ['mid-approach', [-19.25, -5.9], Math.PI],
  ['near-gate', [-19.25, -6.8], Math.PI],
];

const approaches = {
  forecourt: [
    ['gate', [-19.25, -5.9], [0, -1], 1, -7.55, 1],
    ['west-fence', [-19.75, -3], [-1, 0], 0, -20.75, 1],
    ['station-tie', [-19.8, 1.7], [-1, 0], 0, -20.75, 1],
    ['wing-tie', [-14.5, -6.3], [0, -1], 1, -7.55, 1],
    ['east-fence', [-16.3, -6.1], [0, -1], 1, -7.55, 1],
  ],
  sports: [
    ['pool-head', [58.2, -90.5], [0, -1], 1, -91.7, 1],
    ['grove-west', [51.3, -82.1], [-1, 0], 0, 50.2, 1],
    ['pavilion-tie', [59.1, -90.4], [0,-1], 1, -91.7, 1],
    ['gym-tie', [51.2, -76.8], [-1,0], 0, 50.2, 1],
    ['corner', [50.8, -91.1], [-1,-1], 1, -91.7, 1],
    ['grove-reverse', [49.3,-82.1], [1,0], 0, 50.2, -1],
    ['north-reverse', [58.2,-93.2], [0,1], 1, -91.7, -1],
  ],
  works: [
    ['chimney', [-82.4, -117.6], [0, -1], 1, -119.1, 1],
    ['factory-east', [-49.8, -115.7], [0, -1], 1, -117, 1],
    ['plant-tie', [-84.9,-117.8], [0,-1], 1, -119.1, 1],
    ['factory-tie', [-77.2,-117.8], [0,-1], 1, -119.1, 1],
    ['research-tie', [-36,-107.4], [1,0], 0, -35.15, -1],
    ['factory-east-tie', [-51.5,-115.2], [-1,0], 0, -52.45, 1],
    ['chimney-reverse', [-84,-120.4], [0,1], 1, -119.1, -1],
    ['factory-east-reverse', [-48,-118.2], [0,1], 1, -117, -1],
    ['research-return-reverse', [-34,-109], [-1,0], 0, -35.15, 1],
    ['research', [-42, -107.8], [0, -1], 1, -110.4, 1],
  ],
  east_coast: [
    ['onsen-west', [106, -81], [0, -1], 1, -100, 1, 10000],
    ['onsen-gate', [123.1, -82.7], [0, -1], 1, -100, 1],
  ],
  campus: [
    ['gate', [-19.25, -9.4], [0, 1], 1, -7.55, -1],
    ['west-fence', [-21.45, -5], [1, 0], 0, -20.75, -1],
    ['wing-tie', [-14.7, -8.8], [0, 1], 1, -7.55, -1],
  ],
};

async function nativeCheck(page, place, width) {
  for (const [id, start, direction, axis, line, side, duration] of approaches[place] || []) {
    for (const mode of ['walk', 'run-jump']) {
      const keys = await page.evaluate(async ({ place, start, direction }) => {
        const g = globalThis.__game, L = await import('./js/scenes/island-layout.js');
        const T = await import('three'), p = L.toLocal(place, ...start);
        g.walker.stop(); g.jump.reset();
        g.player.root.position.set(p[0], 0, p[1]); g.walker.sync();
        g.place.cam.snap(g.player.root.position);
        if (g.followCamera.active) g.followCamera.aim(Math.atan2(...direction), -0.12);
        await new Promise(globalThis.requestAnimationFrame);
        const f = g.place.camera.getWorldDirection(new T.Vector3()).setY(0).normalize();
        if (g.player.root.parent) f.applyQuaternion(g.player.root.parent.getWorldQuaternion(new T.Quaternion()).invert());
        const r = new T.Vector3().crossVectors(f, new T.Vector3(0, 1, 0));
        const choices = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
        const score = ([u,v]) => (direction[0]*(f.x*u+r.x*v)+direction[1]*(f.z*u+r.z*v))/Math.hypot(u,v);
        choices.sort((a,b)=>score(b)-score(a));
        const [u,v]=choices[0];
        return [...(u ? [u>0?'ArrowUp':'ArrowDown'] : []), ...(v ? [v>0?'ArrowRight':'ArrowLeft'] : [])];
      }, { place, start, direction });
      await page.waitForTimeout(250);
      if (mode === 'run-jump') await page.keyboard.down('Shift');
      for (const key of keys) await page.keyboard.down(key);
      await page.waitForTimeout(200);
      if (mode === 'run-jump') await page.keyboard.down('Space');
      await page.waitForTimeout(duration || (mode === 'walk' ? 1600 : 2100));
      await page.keyboard.up('Space');
      for (const key of keys) await page.keyboard.up(key);
      await page.keyboard.up('Shift');
      await page.waitForTimeout(300);
      const result = await page.evaluate(async () => {
        const g = globalThis.__game, L = await import('./js/scenes/island-layout.js');
        return { place: g.place.name, end: L.toIsland(g.place.name, g.player.root.position.x, g.player.root.position.z), jumpHeight: g.jump.height, camera: { active: g.followCamera.active, distance: g.followCamera.distance, blocked: g.followCamera.blocked } };
      });
      movement.push({ width, place, id, mode, start, keys, ...result });
      if (audit || process.env.NATIVE_SHOTS === '1') await page.screenshot({ path: `${out}/${width}-${place}-${id}-${mode}-end.png` });
      if (audit) continue;
      assert.equal(result.place, place, `${place} ${id} ${mode} crossed region`);
      assert.ok((result.end[axis] - line) * side > 0.09, `${width} ${place} ${id} ${mode} escaped ${result.end}`);
    }
  }
}

await withBrowserJob('island-boundaries', async (browser) => {
  for (const width of (process.env.WIDTHS || '1366,390').split(',').map(Number)) {
    const phone = width < 600;
    const context = await browser.newContext({ viewport: { width, height: phone ? 844 : 860 }, isMobile: phone, hasTouch: phone });
    const errors = [];
    let closing = false;
    await context.route('**/*', scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: (e) => errors.push(String(e)) }));
    await context.addInitScript((cameraMode) => globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ privateMode: false, voiceOn: false, textSpeed: 'instant', cameraMode })), phone ? 'overview' : 'follow');
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    try {
      for (const place of places) {
        if (process.env.RECOVERY === '1') {
          await waitForGame(page, 120000, () => page.goto(`http://127.0.0.1:8771/${base}/index.html?day=2&place=${place}&q=0`), 'play');
          await page.waitForFunction(() => globalThis.__game?.place?.name === 'forecourt' && !globalThis.__game.busy);
          assert.equal(await page.evaluate(() => globalThis.__settings.privateMode), false);
          assert.match(await page.locator('#toast').innerText(), /northwest staff entrance is closed/);
          await page.waitForFunction(() => { const b = globalThis.document.getElementById('boot'); return !b || Number(globalThis.getComputedStyle(b).opacity) < 0.01; });
          const file = `${width}-recovered-${place}.png`;
          await page.screenshot({ path: `${out}/${file}` });
          reports.push({ width, from: place, to: 'forecourt', file });
          continue;
        }
        const day = process.env.DAY || (place === 'works' ? 1 : 3);
        await waitForGame(page, 120000, () => page.goto(`http://127.0.0.1:8771/${base}/index.html?day=${day}&place=${place}&q=${phone ? 0 : 2}`), 'play');
        await page.waitForFunction(() => globalThis.__done && !globalThis.__game.busy);
        for (const period of ['morning', 'evening']) {
          await page.evaluate((to) => globalThis.__game.hooks.period({ to }), period);
          for (const [name, point, yaw] of views[place]) {
            const state = await page.evaluate(async ({ point, yaw, phone, place }) => {
              const g = globalThis.__game;
              const L = await import('./js/scenes/island-layout.js');
              const p = L.toLocal(place, ...point);
              g.walker.stop();
              g.player.root.position.set(p[0], 0, p[1]);
              g.jump.reset();
              g.walker.sync();
              g.place.cam.snap(g.player.root.position);
              if (!phone) g.followCamera.aim(yaw, -0.12);
              return { point, local: p, free: g.place.nav.free(...p) };
            }, { point, yaw, phone, place });
            await page.waitForTimeout(700);
            Object.assign(state, await page.evaluate(() => {
              const g = globalThis.__game;
              return { camera: { active: g.followCamera.active, distance: g.followCamera.distance, blocked: g.followCamera.blocked } };
            }));
            const file = `${width}-${place}-${period}-${name}.png`;
            await page.screenshot({ path: `${out}/${file}` });
            reports.push({ width, place, period, file, ...state });
          }
        }
        if (place === 'sports' && process.env.BENCH_CHECK === '1') {
          const seat = await page.evaluate(async () => {
            const g = globalThis.__game, L = await import('./js/scenes/island-layout.js');
            const p = L.toLocal('sports',55.4,-82.1);
            const seats = [...g.place.seating.seats.values()].filter(s => g.place.seating.reachable(s));
            seats.sort((a,b)=>Math.hypot(a.x-p[0],a.z-p[1])-Math.hypot(b.x-p[0],b.z-p[1]));
            const s=seats[0]; if (!s || Math.hypot(s.x-p[0],s.z-p[1])>3) throw Error('grove seat unavailable');
            const item=g.markers.list.find(m=>m.id===s.id), out=item.spot();
            g.walker.stop();g.jump.reset();g.player.root.position.set(out[0],0,out[1]);g.walker.sync();g.place.cam.snap(g.player.root.position);
            g.targetLock=item;g.near=item;g.ui.closeActs();
            return {id:s.id,out};
          });
          await page.keyboard.press('KeyE');
          await page.waitForFunction(()=>globalThis.__game.player.seated);
          await page.waitForTimeout(500);
          await page.screenshot({path:`${out}/${width}-sports-grove-seated.png`});
          await page.keyboard.press('ArrowUp');
          await page.waitForFunction(()=>!globalThis.__game.player.seated);
          await page.waitForTimeout(500);
          await page.screenshot({path:`${out}/${width}-sports-grove-stood.png`});
          const end=await page.evaluate(async ()=>{
            const g=globalThis.__game,L=await import('./js/scenes/island-layout.js');
            const target=L.toLocal('sports',58.2,-82.1);g.targetLock=null;g.ui.closeActs();
            await g.walkTo(...target);
            const p=g.player.root.position;return {point:[p.x,p.z],target,free:g.place.nav.free(p.x,p.z),place:g.place.name};
          });
          assert.equal(end.place,'sports');assert(end.free,'exit returns to the public pool walk');
          assert(Math.hypot(end.point[0]-end.target[0],end.point[1]-end.target[1])<.45,'normal walker reaches the pool walk from the seat exit');
          await page.screenshot({path:`${out}/${width}-sports-grove-seat-exit.png`});
          reports.push({width,place,bench:seat.id,seated:true,stood:true,routeExit:end});
        }
        if (maps && place !== 'forecourt') {
          await page.locator('#minimap').click();
          await page.waitForTimeout(500);
          await page.screenshot({ path: `${out}/${width}-${place}-map.png` });
          await page.locator('#mapView .mv-close').click();
        }
        if (maps && place === 'forecourt') {
          await page.locator('#minimap').click();
          await page.waitForTimeout(500);
          await page.screenshot({ path: `${out}/${width}-map.png` });
          await page.locator('#mapView .pin[data-pick="campus"]:not([hidden])').click();
          await page.waitForTimeout(300);
          await page.screenshot({ path: `${out}/${width}-map-campus.png` });
          await page.locator('#mapView .mv-close').click();
        }
        if ((!before || audit) && process.env.CAPTURE_ONLY !== '1') {
          assert.equal(await page.evaluate(() => globalThis.__settings.privateMode), false);
          await nativeCheck(page, place, width);
        }
      }
      assert.deepEqual(errors, []);
    } finally {
      closing = true;
      fs.writeFileSync(`${out}/movement-partial.json`, JSON.stringify(movement, null, 2));
      await context.close();
    }
  }
}, { timeoutMs: 300000, gpuWaitMs: 900000 });
fs.writeFileSync(`${out}/report.json`, JSON.stringify(reports, null, 2));
fs.writeFileSync(`${out}/movement.json`, JSON.stringify(movement, null, 2));
console.log(`${out}: ${reports.length} views`);
