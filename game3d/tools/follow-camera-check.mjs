// Native desktop input, authored-scene handoff, menus, Continue and phone fallback. Public fresh storage only.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { blockedSource } from '../../tools/bible/check-scope.mjs';
import { withNativeBrowser } from '../../reviews/camera-plan-1/native-browser.mjs';
import { fastResult } from '../test/support/fast-result.mjs';
const out = new URL('../shots/codex-follow-camera/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const base = process.env.URL || 'http://127.0.0.1:8794/game3d';
const mode = process.env.MODE || 'native', mc = process.env.MC || 'eric';
const phone = process.env.PHONE === '1', width = phone ? 390 : 1366, height = phone ? 844 : 860;
const testSpeed=+(process.env.TEST_TS||8), cameraMode=process.env.CAMERA||'follow';
const reports = [], errors = [], label = `${mode}-${width}-${mc}${mode==='fast'&&testSpeed!==8?'-ts'+testSpeed:''}${cameraMode==='overview'?'-overview':''}`;
const runBrowser = mode === 'fast' || phone ? withBrowserJob : withNativeBrowser;
await runBrowser(`follow-camera-${label}`, async (browser, native) => {
  const page = await browser.newPage({ viewport: { width, height }, isMobile: phone, hasTouch: phone });
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(cameraMode => {
    if (!globalThis.localStorage.getItem('amakawa-settings')) globalThis.localStorage.setItem('amakawa-settings',
      JSON.stringify({ v: 99, privateMode: false, voiceOn: false, cameraMode, textSpeed: 'instant' }));
  }, cameraMode);
  await page.route('**/*', r => {
    if (blockedSource(r.request().url(), true)) { errors.push('protected source requested'); return r.abort(); }
    return r.continue();
  });
  const shot = name => page.screenshot({ path: `${out}/${label}-${name}.png` });
  const free = () => page.waitForFunction(() => globalThis.__game?.place && !globalThis.__game.busy &&
    !globalThis.__game.walker.path && !globalThis.document.body.classList.contains('title-leaving'));
  const snapshot = () => page.evaluate(() => {
    const g = globalThis.__game, c = g.followCamera;
    return { place: g.place.name, active: c.active, captured: c.captured, yaw: c.yaw, blocked: c.blocked,
      distance: c.distance, collisionMs: c.collisionMs, position: g.player.root.position.toArray(), fov: g.place.camera.fov,
      keyFrame: g.walker.keyFrame?.toArray() || null, calls: g.renderer.info.render.calls };
  });
  async function boot(place) {
    await page.goto(`${base}/index.html?place=${place}&perf&mc=${mc}${["rooms", "gait", "interiors", "dorm"].includes(mode) ? "&cap" : ""}`);
    await page.waitForFunction(() => globalThis.__done);
    if (['rooms','gait','interiors','dorm'].includes(mode)) await page.evaluate(() => { globalThis.__run = true; globalThis.document.body.classList.remove('cap'); });
    await free();
    await page.waitForTimeout(1100);
    await page.waitForFunction(() => !globalThis.document.getElementById('boot') ||
      globalThis.document.getElementById('boot').classList.contains('gone'));
  }
  async function capture() {
    await page.waitForFunction(()=>globalThis.__game.followCamera.active);
    await page.locator('#cameraLook').waitFor({state:'visible'});
    await native.clickElement(page, page.locator('#cameraLook'));
    await page.waitForTimeout(100);
    await page.waitForFunction(() => globalThis.__game.followCamera.captured);
  }
  try {
    if (mode === 'fast') {
      await page.goto(`${base}/index.html?test=fast&q=0&mc=${mc}&ts=${testSpeed}`);
      await page.waitForFunction(()=>globalThis.__game?.place);
      await page.evaluate(async()=>{
        const THREE=await import('three'), f=new THREE.Frustum(),m=new THREE.Matrix4(),p=new THREE.Vector3();
        const sphere=new THREE.Sphere(),trace=globalThis.__followGaitTrace=[];let last=0;
        function sample(){
          const g=globalThis.__game,P=g?.place,t=g?.t||0,dt=t-last;last=t;
          if(P?.name==='forecourt'&&dt>0&&trace.length<2400){
            const cam=P.camera;f.setFromProjectionMatrix(m.multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse));
            trace.push({t,dt,active:g.followCamera.active,collisionMs:g.followCamera.collisionMs,calls:g.renderer.info.render.calls,busy:g.busy,crowd:[4,5,6,8,12].map(i=>{
              const r=P.crowd?.[i];if(!r)return null;r.root.getWorldPosition(p);const u=r.root.scale.x;
              return {i,at:r.root.position.toArray(),ph:r._gait?.ph,amp:r._gait?.amt,v:r._gait?.v,visible:r.root.visible,
                seen:f.intersectsSphere(sphere.set(p.setY(p.y+.5*u),-.2*u))};
            })});
          }
          if(!globalThis.__test?.done)globalThis.requestAnimationFrame(sample);
        }globalThis.requestAnimationFrame(sample);
      });
      await page.waitForFunction(() => globalThis.__test?.done, null, { timeout: 265000 });
      const run = await page.evaluate(() => ({ ...globalThis.__test, ended: !!globalThis.__ended,
        trace:globalThis.__followGaitTrace,move: globalThis.__moveCheck,
        gait: globalThis.__gaitCheck && { long: globalThis.__gaitCheck.reports(4) },
        mode: globalThis.__settings.cameraMode, phone: globalThis.document.body.classList.contains('phone') }));
      const result = fastResult(run, errors); reports.push({ result, run }); await shot('end');
      assert.equal(result.pass, true, result.errors.join('\n'));
    } else if (phone) {
      await boot('shotengai');
      assert.equal((await snapshot()).active, false);
      assert.equal(await page.locator('#cameraLook').isVisible(), false);
      await page.locator('#minimap').tap();
      await page.locator('#mapView').waitFor({ state: 'visible' }); await shot('map');
      await page.locator('.mv-close').tap();await page.locator('#mapView').waitFor({state:'hidden'});await page.waitForTimeout(300);await shot('overview');
      await page.locator('#pauseBtn').tap(); await page.locator('#pause .settings').tap();
      await page.locator('#st-controls').tap();
      assert.equal(await page.locator('[data-row=cameraMode]').isVisible(), false);
      await shot('settings'); reports.push(await snapshot());
    } else if(mode==='interiors') {
      for(const name of process.env.PLACES?.split(',')||['office','izakaya','canteen','dorm_commons','karaoke','karaoke_booth','gym']) {
        console.log('interior',name);await boot(name);await capture();native.move(1040,0);await page.waitForTimeout(250);await shot(name+'-closed');
        const closure=await page.evaluate(()=>{const g=globalThis.__game,a=[];g.place.space.traverse(o=>{if(o.userData.followEnclosure)a.push(o);});return a.map(o=>({visible:o.visible,h:o.userData.followEnclosure.height,cameraY:g.place.space.worldToLocal(g.place.camera.position.clone()).y}));});
        assert.ok(closure.length&&closure.every(o=>o.visible&&o.cameraY<o.h));
        await page.keyboard.press('Escape');await page.waitForFunction(()=>!globalThis.__game.followCamera.captured);await page.evaluate(async()=>{(await import('./js/settings.js')).setSetting('cameraMode','overview');});
        await page.waitForFunction(()=>!globalThis.__game.followCamera.active);
        assert.equal(await page.evaluate(()=>{let any=false;globalThis.__game.place.space.traverse(o=>{if(o.userData.followEnclosure&&o.visible)any=true;});return any;}),false);
        await shot(name+'-overview');await page.evaluate(async()=>{(await import('./js/settings.js')).setSetting('cameraMode','follow');});await free();
        reports.push({name,closure});
        if(name==='canteen') {
          await capture();native.press('e');await page.waitForFunction(()=>globalThis.__game.place?.name==='plaza'&&!globalThis.__game.busy);await free();
          await page.evaluate(async()=>{const g=globalThis.__game;await g.walkTo(...g.place.things.canteen_door.spot());});await free();await capture();native.press('e');
          await page.waitForFunction(()=>globalThis.__game.place?.name==='canteen'&&!globalThis.__game.busy);await free();
          await page.waitForFunction(()=>globalThis.__game.followCamera.active);await shot('canteen-native-return');assert.equal((await snapshot()).active,true);
        }
        if(name==='izakaya') {
          await capture();native.press('e');await page.waitForFunction(()=>globalThis.__game.place?.name==='shotengai'&&!globalThis.__game.busy,{},{timeout:30000});
          await free();assert.equal((await snapshot()).captured,false);await shot('izakaya-native-exit');
        }
      }
    } else if (mode === 'dorm') {
      await boot('dorms');
      await page.evaluate(async()=>{const g=globalThis.__game;await g.walkTo(...g.place.things.door_203.spot());});
      await free();await page.waitForFunction(()=>globalThis.__game.place.things.window.enabled());
      await page.waitForFunction(()=>globalThis.__game.followCamera.active);await capture();
      for(let i=0;i<4;i++){native.move(420,0);await page.waitForTimeout(180);await shot('room-'+i);}
      assert.equal(await page.evaluate(()=>{let n=0;globalThis.__game.place.space.traverse(o=>{if(o.userData.followEnclosure&&o.visible)n++;});return n;}),1);
      await page.keyboard.press('Escape');
      await page.evaluate(async()=>{await globalThis.__game.place.hooks.leaveRoom();});await free();
      await page.waitForTimeout(450);await shot('corridor-return');
      assert.equal(await page.evaluate(()=>globalThis.__game.place.things.window.enabled()),false);
      await page.evaluate(async()=>{const g=globalThis.__game;await g.walkTo(...g.place.things.kitchen.spot());});await free();
      await capture();native.move(950,0);await page.waitForTimeout(200);await shot('kitchen');
      await page.keyboard.press('Escape');
      await page.evaluate(async()=>{const g=globalThis.__game;await g.walkTo(...g.place.things.stairs_up.spot());});await free();await capture();native.press('e');
      await page.waitForFunction(()=>globalThis.__game.place.things.laundry.enabled()&&!globalThis.__game.player.scripted);await free();
      await page.evaluate(async()=>{const g=globalThis.__game;await g.walkTo(...g.place.things.laundry.spot());});await free();
      await capture();native.move(600,0);await page.waitForTimeout(200);await shot('laundry');reports.push(await snapshot());
    } else if (mode === 'gait') {
      await boot('forecourt');
      await page.evaluate(async()=>{ const {startGaitCheck}=await import('./js/movement/gait-watch.js');startGaitCheck(globalThis.__game); });
      await capture();native.move(550,0);
      await page.waitForTimeout(16000);await shot('forecourt');
      const gait=await page.evaluate(()=>({long:globalThis.__gaitCheck.reports(4),all:globalThis.__gaitCheck.reports(),windows:globalThis.__gaitCheck.windows}));
      reports.push(gait);assert.deepEqual(gait.all,[]);
    } else if (mode === 'rooms') {
      for (const name of process.env.PLACES?.split(',')||['train', 'office', 'izakaya', 'shotengai', 'forecourt']) {
        await boot(name); await capture();
        // Real captured mouse orbits, including both room walls. No camera state is replaced by the test.
        const samples = [];
        for (let i=0; i<6; i++) {
          native.move(170, (i%2 ? -1 : 1)*25);
          await page.waitForTimeout(150); samples.push(await snapshot());
          if (i===2 || i===5) await shot(`${name}-turn-${i}`);
        }
        const timing = await page.evaluate(async () => {
          const times=[],collision=[];let t=performance.now();
          for(let i=0;i<90;i++) { await new Promise(globalThis.requestAnimationFrame);const now=performance.now();times.push(now-t);collision.push(globalThis.__game.followCamera.collisionMs);t=now; }
          times.sort((a,b)=>a-b);collision.sort((a,b)=>a-b); return { collisionMedian:collision[45],collisionP95:collision[85], perf:globalThis.__perfReport?.(), median: times[45], p95:times[85], max:times[89] };
        });
        assert.ok(samples.every(s=>s.active && Number.isFinite(s.distance) && s.distance>0));
        reports.push({ name, samples, timing }); await page.keyboard.press('Escape');
      }
    } else {
      await boot('shotengai'); await shot('explore'); await capture();
      const before=await snapshot(); native.move(140,0); await page.waitForTimeout(100);
      native.down('w'); await page.waitForTimeout(800); native.up('w');
      const after=await snapshot();
      assert.ok(Math.hypot(after.position[0]-before.position[0],after.position[2]-before.position[2])>.25);
      assert.notEqual(after.yaw,before.yaw); await shot('walk');
      native.down('Shift'); native.down('s'); await page.waitForTimeout(650);
      assert.equal(await page.evaluate(()=>globalThis.__game.walker.gait.run),true,'native held Shift selects the run gait');
      native.up('s'); native.up('Shift');
      // A real focus loss releases capture and movement before returning to the game.
      const other=await browser.newPage();await other.bringToFront();
      await page.waitForFunction(()=>!globalThis.__game.followCamera.captured);
      assert.equal(await page.evaluate(()=>globalThis.__game.walker.keys.size),0);
      await other.close();await page.bringToFront();await capture();
      await page.keyboard.press('Escape'); await page.waitForFunction(()=>!globalThis.__game.followCamera.captured);
      assert.equal(await page.evaluate(()=>!!globalThis.__game.paused),false,'first Escape only releases mouse');
      await page.keyboard.press('Escape'); await page.locator('#pause').waitFor({state:'visible'});
      await page.waitForFunction(()=>!globalThis.__game.followCamera.active);
      assert.equal((await snapshot()).active,false); assert.equal((await snapshot()).keyFrame,null);
      await page.keyboard.press('Escape'); await free();
      await page.locator('#minimap').click(); await page.locator('#mapView').waitFor({state:'visible'});
      await page.waitForFunction(()=>!globalThis.__game.followCamera.active);
      assert.equal((await snapshot()).active,false); await page.locator('.mv-close').click();
      await page.waitForFunction(()=>globalThis.__game.followCamera.active);
      // Walk to the real door, then use its native E interaction while captured.
      await page.evaluate(async()=>{const g=globalThis.__game;await g.walkTo(...g.place.things.izakaya.spot());});
      await free(); await page.waitForTimeout(300); await capture(); native.press('e');
      await page.locator('#talk:not([hidden])').waitFor();
      await page.waitForFunction(()=>!globalThis.__game.followCamera.active && !globalThis.__game.followCamera.captured);
      assert.equal((await snapshot()).active,false); assert.equal((await snapshot()).captured,false);
      assert.equal((await snapshot()).keyFrame,null); await shot('authored-dialogue');
      await page.locator('#talkHit').click(); await free();
      await page.waitForFunction(()=>globalThis.__game.followCamera.active);
      // Native quick save/load rebuilds the place; the selected mode survives without a stale camera reference.
      await page.evaluate(url => globalThis.history.replaceState(null, '', url), `${base}/index.html?mc=${mc}`);
      const savedPosition=(await snapshot()).position;
      await page.keyboard.press('F5');
      await page.waitForFunction(()=>!!globalThis.localStorage.getItem('amakawa-slot-quick'));
      await page.keyboard.press('F9'); await page.waitForTimeout(1500); await free();
      const confirm=page.locator('.ask:not([hidden]) .yes'); if(await confirm.isVisible()) await confirm.click();
      await page.waitForFunction(()=>globalThis.__game.followCamera.active);
      const loadedPosition=(await snapshot()).position;
      assert.ok(Math.hypot(savedPosition[0]-loadedPosition[0],savedPosition[2]-loadedPosition[2])<.15,'Continue restores the actual saved spot');
      await shot('continue'); reports.push({ before,after,continued:await snapshot() });
      // The option itself is keyboard/touch-native Settings UI, not a debug query flag.
      await page.locator('#pauseBtn').click();await page.locator('#pause .settings').click();
      await page.locator('#st-controls').click(); await shot('settings');
      await page.locator('[data-key=cameraMode] [data-v=overview]').click();
      await page.keyboard.press('Escape');await page.keyboard.press('Escape');await free();
      assert.equal((await snapshot()).active,false);assert.notEqual((await snapshot()).fov,50);
      await shot('overview-restored');
    }
    assert.deepEqual(errors,[]);
  } finally {
    fs.writeFileSync(`${out}/${label}.json`,JSON.stringify({reports,errors},null,2));
    await page.close();
  }
},{timeoutMs:280000});
console.log('PASS',label);
