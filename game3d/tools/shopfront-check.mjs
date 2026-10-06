// Actual production cameras and paths. Fresh public state; no authored beauty camera.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { withNativeBrowser } from '../../reviews/camera-plan-1/native-browser.mjs';
import { blockedSource } from '../../tools/bible/check-scope.mjs';
const out = process.argv[2];
assert.ok(out, 'provide an evidence directory');
fs.mkdirSync(out, { recursive: true });
const phone = process.env.PHONE === '1', follow = process.env.FOLLOW === '1';
const width = phone ? 390 : 1366, height = phone ? 844 : 860;
const base = process.env.URL || 'http://127.0.0.1:8794/game3d';
const errors = [], reports = [];
await (follow ? withNativeBrowser : withBrowserJob)('shopfront-check', async (browser,native) => {
  const page = await browser.newPage({ viewport: { width, height }, isMobile: phone, hasTouch: phone });
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(follow => globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({
    v: 99, privateMode: false, voiceOn: false, textSpeed: 'instant', cameraMode: follow ? 'follow' : 'overview',
  })), follow);
  await page.route('**/*', route => {
    if (blockedSource(route.request().url(), true)) { errors.push('protected source'); return route.abort(); }
    return route.continue();
  });
  await page.goto(`${base}/index.html?cap&perf&place=shotengai&mc=${phone ? 'carina' : 'eric'}`);
  await page.waitForFunction(() => globalThis.__done, null, { timeout: 120000 });
  await page.evaluate(() => { globalThis.__run = true; globalThis.document.body.classList.remove('cap'); });
  await page.waitForFunction(() => !globalThis.document.getElementById('boot') || globalThis.document.getElementById('boot').classList.contains('gone'));
  for (const [id, bay] of [['bakery', 10], ['store', 7], ['bike_shop', 2]]) {
    const result = await page.evaluate(async ({ id, bay, follow }) => {
      const g = globalThis.__game, P = await import('./js/scenes/shotengai/plan.js');
      const S = await import('./js/scenes/island-south.js');
      const target = P.local([S.bayMid(bay), S.ROWS_Z.arcade + 2.1]);
      g.walker.stop();
      g.player.root.position.set(target[0], 0, target[1]);
      g.walker.sync();
      g.place.cam.snap(g.player.root.position);

      const door = g.place.things[id], spot = door.spot();
      const before = g.player.root.position.clone();
      await g.walkTo(...spot);
      const p = g.player.root.position;
      const THREE=await import('three');
      const face=door.face(), a=g.place.space.localToWorld(new THREE.Vector3(...[face[0],0,face[1]])), b=g.place.space.localToWorld(new THREE.Vector3(p.x,0,p.z));
      const yaw=Math.atan2(a.x-b.x,a.z-b.z);
      return { id, label:door.label, target, spot, yaw, nearest:g.walker.others().filter(o=>Math.hypot(o.x-p.x,o.z-p.z)<2).map(o=>({x:o.x,z:o.z,r:o.r})), path:g.place.nav.path(...target,...spot), free: g.place.nav.free(...spot), distance: Math.hypot(p.x - spot[0], p.z - spot[1]), walked: before.distanceTo(p) };
    }, { id, bay, follow });
    assert.equal(result.free, true);
    reports.push(result);
    fs.writeFileSync(`${out}/progress-${width}.json`, JSON.stringify(reports,null,2));
    // Arrival is asserted after preserving every view and the nearby-body/path evidence.
    if(follow) {
      await page.waitForFunction(()=>globalThis.__game.followCamera.active);
      if(!await page.evaluate(()=>globalThis.__game.followCamera.captured)) await native.clickElement(page,page.locator('#cameraLook'));
      await page.waitForFunction(()=>globalThis.__game.followCamera.captured);
      for(let i=0;i<8;i++) {
        const yaw=await page.evaluate(()=>globalThis.__game.followCamera.yaw);
        const angle=Math.atan2(Math.sin(yaw-result.yaw),Math.cos(yaw-result.yaw));
        if(Math.abs(angle)<.02)break;
        native.move(Math.round(Math.max(-160,Math.min(160,angle/.003))),0);
        await page.waitForTimeout(40);
      }
    }
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${out}/${id}-${width}-${follow ? 'follow' : 'overview'}.png` });
    if(process.env.INTERACT!=='0') {
      if(follow) await page.keyboard.press('Escape');
      const pin=page.locator('.mark').filter({has:page.locator('.nm',{hasText:result.label})}).locator('.pin');
      await pin.click();
      await page.waitForTimeout(150);
      if(await page.locator('#actMenu .use').isVisible())await page.locator('#actMenu .use').click();
      await page.locator('#talk:not([hidden])').waitFor();
      await page.locator('#talk .doorcard:not([hidden])').waitFor();
      result.card=await page.locator('#talk .doorcard').textContent();
      await page.screenshot({path:`${out}/${id}-${width}-card.png`});
      for(let i=0;i<4&&await page.evaluate(()=>globalThis.__game.busy);i++){await page.locator('#talkHit').click();await page.waitForTimeout(150);}
      await page.waitForFunction(()=>!globalThis.__game.busy);
    }
    result.perf = await page.evaluate(() => ({ calls: globalThis.__game.renderer.info.render.calls, report: globalThis.__perfReport?.() }));
  }
  await page.close();
}, { timeoutMs: 180000 });
fs.writeFileSync(`${out}/report-${width}-${follow ? 'follow' : 'overview'}.json`, JSON.stringify({ errors, reports }, null, 2));
assert.deepEqual(errors, []);
if(!process.env.DIAGNOSE)for(const r of reports) {
  const queued = r.id==='store' && r.nearest.some(o=>Math.hypot(o.x-r.spot[0],o.z-r.spot[1])<.05);
  assert.ok(r.distance<.2 || (queued && r.distance<.7 && r.card?.includes('CLOSED')),`${r.id} unreachable: ${r.distance}`);
}
