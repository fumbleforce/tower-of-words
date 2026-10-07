// Exercise the real feedback UI and its PNG without posting feedback or changing a save.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withNativeBrowser } from '../../reviews/camera-plan-1/native-browser.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
const base = process.env.URL || 'http://127.0.0.1:8771/.claude/worktrees/codex-feedback-camera/game3d';
const out = process.env.OUT || new URL('../shots/feedback-camera/round1/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const reports = [], errors = [];
await withNativeBrowser('feedback-camera', async (browser, native) => {
  for (const [width, height, mode, place] of [[1366,860,'follow','dorms'],[1366,860,'overview','forecourt'],[390,844,'follow','dorms']]) {
    const key = `${width}-${mode}`, page = await browser.newPage({ viewport: { width, height } });
    let closing = false;
    await page.route('**/*', scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: e => errors.push(e) }));
    await page.route('**/api/feedback', r => {
      assert.equal(r.request().method(), 'GET', 'test must not send feedback');
      return r.fulfill({ json: { ok: true } });
    });
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(mode => globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({v:99,privateMode:false,voiceOn:false,cameraMode:mode,textSpeed:'instant'})), mode);
    await page.addInitScript(() => { globalThis.__feedbackCameraState = () => {
      const g=globalThis.__game,c=g.place.camera,enclosures=[];
      g.place.space.traverse(o => {if(o.userData.followEnclosure) enclosures.push(o.visible);});
      return {position:c.position.toArray(),rotation:c.quaternion.toArray(),fov:c.fov,active:g.followCamera.active,captured:g.followCamera.captured,paused:!!g.paused,player:g.player.root.position.toArray(),enclosures};
    };
      globalThis.window.addEventListener('keydown', e => {
        if(e.code==='F8' && !globalThis.document.querySelector('#feedback:not([hidden])')) globalThis.__feedbackCameraBefore=globalThis.__feedbackCameraState();
      },true);
      globalThis.window.addEventListener('click', e => {
        if(e.target.closest?.('#feedbackBtn')) globalThis.__feedbackCameraBefore=globalThis.__feedbackCameraState();
      },true);
    });
    const state = () => page.evaluate(() => globalThis.__feedbackCameraState());
    try {
      await page.goto(`${base}/index.html?cap&feedback&place=${place}&q=1`);
      await page.waitForFunction(() => globalThis.__done);
      await page.evaluate(() => {globalThis.__run=true;globalThis.document.body.classList.remove('cap');});
      await page.waitForFunction(() => !globalThis.__game.busy && (!globalThis.document.querySelector('#boot') || globalThis.document.querySelector('#boot').classList.contains('gone')));
      await page.locator('#feedbackBtn').waitFor({state:'visible'});
      if(place==='dorms') {
        await page.evaluate(async () => {const g=globalThis.__game;await g.walkTo(...g.place.things.door_203.spot());if(!g.place.things.window.enabled()) await g.place.things.door_203.act();});
        await page.waitForFunction(() => !globalThis.__game.busy && globalThis.__game.place.things.window.enabled());
      }
      const follows=mode==='follow'&&width>700;
      await page.waitForFunction(follows => globalThis.__game.followCamera.active===follows, follows);
      await page.waitForTimeout(800);
      if(follows) assert.ok((await state()).enclosures.some(Boolean),'inside room closure is actually visible');
      for (const entry of ['key','button','paused']) {
        if(entry==='paused') {await page.evaluate(() => {globalThis.__game.paused=true;});await page.waitForFunction(() => !globalThis.__game.followCamera.active);}
        if (follows && entry==='key') {
          await native.clickElement(page,page.locator('#cameraLook'));
          await page.waitForFunction(() => globalThis.__game.followCamera.captured);
          native.move(140,0);await page.waitForTimeout(100);
        }
        await page.screenshot({path:`${out}/${key}-${entry}-before.png`});
        if(entry!=='button') await page.keyboard.press('F8'); else await page.locator('#feedbackBtn').click();
        await page.locator('#feedback:not([hidden])').waitFor();
        await page.waitForFunction(() => globalThis.document.querySelector('.fb-shot img')?.naturalWidth>0);
        const before=await page.evaluate(() => globalThis.__feedbackCameraBefore),during=await state();await page.screenshot({path:`${out}/${key}-${entry}-open.png`});
        const bytes=await page.locator('.fb-shot img').evaluate(async img => Array.from(new Uint8Array(await(await fetch(img.src)).arrayBuffer())));
        fs.writeFileSync(`${out}/${key}-${entry}-attachment.png`,Buffer.from(bytes));
        reports.push({key,entry,before,during});
        assert.deepEqual(during.position,before.position,'camera position remains unchanged');
        assert.deepEqual(during.rotation,before.rotation,'camera orientation remains unchanged');
        assert.equal(during.fov,before.fov,'lens remains unchanged');
        assert.deepEqual(during.enclosures,before.enclosures,'interior closure remains unchanged');
        assert.equal(during.paused,true);assert.equal(during.captured,false);
        assert.deepEqual(during.player,before.player);
        await page.keyboard.press('Escape');
        if(entry==='paused') {assert.equal((await state()).paused,true);await page.evaluate(() => {globalThis.__game.paused=false;});}
        await page.waitForFunction(() => !globalThis.__game.paused);
        await page.waitForFunction(follows => globalThis.__game.followCamera.active===follows,follows);
        const after=await state();reports.at(-1).after=after;
        if(entry!=='paused') assert.equal(after.fov,before.fov);assert.equal(after.captured,false);
        await page.screenshot({path:`${out}/${key}-${entry}-closed.png`});
      }
    } catch(e) {await page.screenshot({path:`${out}/${key}-failure.png`});throw e;}
    finally {closing=true;await page.close();fs.writeFileSync(`${out}/report.json`,JSON.stringify({reports,errors},null,2));}
  }
  assert.deepEqual(errors,[]);
});
console.log('PASS feedback preserves camera, room closure, pause and pointer release; all9 openings');
