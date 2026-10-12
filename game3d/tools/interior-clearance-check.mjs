// Public room renders: the normal desktop follow camera, then the unchanged overview at both screen sizes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob, gpuWaitOptions } from '../../tools/lib/browser-job.mjs';
const base = process.env.URL || `http://127.0.0.1:8771/${process.env.BASE || 'game3d'}`;
const width = +(process.argv[2] || 1366), height = width === 390 ? 844 : 860;
const out = new URL('../shots/interior-clearance/', import.meta.url).pathname;
fs.mkdirSync(out, {recursive:true});
const names = process.env.PLACES?.split(',') || ['office','izakaya','canteen','dorm_commons','karaoke','karaoke_booth','gym','print_shop','bakery','konbini','clinic','ferry_terminal','dorms','pool','gate','forecourt','dorm_court'];
const reports = [], errors = [];
await withBrowserJob(`interior-clearance-${width}`, async browser => {
  const page = await browser.newPage({viewport:{width,height},isMobile:width===390,hasTouch:width===390});
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', route => new URL(route.request().url()).pathname.includes('/private/') ? route.fulfill({status:404,body:''}) : route.continue());
  await page.addInitScript(() => globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({v:99,privateMode:false,voiceOn:false,cameraMode:'follow',textSpeed:'instant'})));
  try {
    for(const name of names) {
      console.log('interior',width,name);
      await page.goto(`${base}/index.html?place=${name}&perf&cap`);
      await page.waitForFunction(() => globalThis.__done, null, {timeout:90000});
      await page.evaluate(() => { globalThis.__run=true; globalThis.document.body.classList.remove('cap'); });
      await page.waitForFunction(() => globalThis.__game?.place && !globalThis.__game.busy && !globalThis.__game.walker.path && (!globalThis.document.getElementById('boot') || globalThis.document.getElementById('boot').classList.contains('gone')));
      const regions = await page.evaluate(async () => {
        if (globalThis.__game.place.name === 'pool') { const {changingPlan} = await import('./js/scenes/sports/changing-room.js'); const p = changingPlan('man').locker; return [[p[0], 0, p[1]+0.5]]; }
        const a=[];globalThis.__game.place.space.traverse(o=>{if(o.userData.followEnclosure?.region) {
          const [x0,x1,z0,z1]=o.userData.followEnclosure.region;
          const p=o.parent.localToWorld(o.position.clone().set((x0+x1)/2,0,(z0+z1)/2));
          a.push(globalThis.__game.player.root.parent.worldToLocal(p).toArray());
        }});if(globalThis.__game.place.name === 'dorms') a.sort((a,b)=>(Math.abs(a[0])<1)-(Math.abs(b[0])<1));return a.length?a:[null];
      });
      for(let i=0;i<regions.length;i++) {
        if(regions[i]) await page.evaluate(at=>{const g=globalThis.__game;g.player.root.position.fromArray(at);g.player.root.updateMatrixWorld(true); if(g.place.name==='dorms')g.place.capState(at[0]>20?'3f':'2f');},regions[i]);
        await page.waitForTimeout(350);
        if(width!==390) {
          await page.waitForFunction(()=>globalThis.__game.followCamera.active);
          for(let turn=0;turn<2;turn++) {
            await page.evaluate(y=>globalThis.__game.followCamera.aim(y,0),turn*Math.PI);
            await page.waitForTimeout(300);
            await page.screenshot({path:`${out}/${width}-${name}-${i}-follow-${turn}.png`});
          }
        }
        const state=await page.evaluate(()=>{
          const g=globalThis.__game, enclosures=[];
          g.place.space.traverse(o=>{if(o.userData.followEnclosure)enclosures.push({...o.userData.followEnclosure,visible:o.visible});});
          return {active:g.followCamera.active,cameraY:g.place.space.worldToLocal(g.place.camera.position.clone()).y,enclosures};
        });
        assert.ok(state.enclosures.every(e=>e.height>=3.3), `${name}: low ceiling`);
        if(width===390) assert.equal(state.active,false,'phone keeps its overview');
        await page.evaluate(async()=>{(await import('./js/settings.js')).setSetting('cameraMode','overview');});
        await page.waitForTimeout(300);
        assert.equal(await page.evaluate(()=>{let any=false;globalThis.__game.place.space.traverse(o=>{if(o.userData.followEnclosure&&o.visible)any=true;});return any;}),false);
        await page.screenshot({path:`${out}/${width}-${name}-${i}-overview.png`});
        reports.push({name,region:i,...state});
        await page.evaluate(async()=>{(await import('./js/settings.js')).setSetting('cameraMode','follow');});
      }
    }
    assert.deepEqual(errors,[]);
  } finally {
    fs.writeFileSync(`${out}/${width}${process.env.PLACES ? '-subset' : '-all'}.json`,JSON.stringify({reports,errors},null,2));
    await page.close();
  }
},gpuWaitOptions(900,300000));
console.log('PASS interior clearance',width);
