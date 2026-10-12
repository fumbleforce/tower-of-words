// Actual optional seat interactions, pose contact, save restore, occupancy and standing, at both screen sizes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob, gpuWaitOptions } from '../../tools/lib/browser-job.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const width = +(process.argv[2] || 1366), height = width < 700 ? 844 : 860;
const base = process.env.BASE || 'game3d';
const places = (process.env.ONLY || 'clinic,canteen,dorm_commons,gate,forecourt,dorms,office').split(',');
const out = new URL(`../shots/seating/${width}/`, import.meta.url).pathname;
fs.mkdirSync(out, {recursive:true});
await withBrowserJob(`seating-${width}`, async browser => {
  const page = await browser.newPage({viewport:{width,height},isMobile:width<700,hasTouch:width<700});
  await page.route('**/api/plugins', r => r.fulfill({json:[]}));
  await page.route('**/island/private/**', r => r.abort());
  await page.addInitScript(() => globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({privateMode:false,voiceOn:false,textSpeed:'instant'})));
  const errors=[]; page.on('pageerror', e => errors.push(e.stack));
  for (const name of places) {
    await waitForGame(page,90000,()=>page.goto(`http://127.0.0.1:8771/${base}/index.html?place=${name}&q=0`),'play');
    await page.waitForFunction(()=>!globalThis.document.body.classList.contains('loading')&&!globalThis.__game.busy&&!globalThis.__game.walker.path);
    const info=await page.evaluate(async()=>{
      const g=globalThis.__game,P=g.place;
      const ids=[...P.seating.seats.keys()].filter(id=>P.things[id]?.seatAction&&P.seating.reachable(P.seating.seats.get(id)));
      if(!ids.length)throw Error('No usable ordinary seat in '+P.name);
      const id=ids[0],s=P.seating.seats.get(id),out=P.things[id].spot();
      g.player.root.position.set(out[0],s.floor,out[1]); g.walker.sync();
      P.cam.closeOn?.([s.x,s.z],3.6,0.45);
      P.cam.snap?.(g.player.root.position);
      g.use(g.markers.list.find(t=>t.id===id));
      return {id,count:P.seating.seats.size,usable:ids.length,top:s.top};
    });
    await page.waitForFunction(id=>globalThis.__game.player.seated&&globalThis.__game.player.freeSeat?.id===id,info.id);
    await page.waitForTimeout(400);
    const contact=await page.evaluate(()=>{
      const g=globalThis.__game,P=g.place,s=P.seating.seats.get(g.player.freeSeat.id);
      const p=g.player.root.position;
      const state=P.snapshotState();
      P.seating.stand({persist:false});
      if(g.player.seated||Math.abs(g.player.root.position.y-s.floor)>.01)throw Error('Stand floor mismatch');
      P.restoreState({world:state,flags:{}});
      P.cam.closeOn?.([s.x,s.z],3.6,0.45);
      P.cam.snap?.(g.player.root.position);
      if(!g.player.seated||g.player.freeSeat?.id!==s.id)throw Error('Saved seat not restored');
      const npc=Object.values(P.people).find(r=>r?.root&&r!==g.player);
      if(npc){
        const old={p:npc.root.position.clone(),visible:npc.root.visible,seated:npc.seated};
        npc.root.position.set(s.x,s.floor,s.z); npc.root.visible=true; npc.seated=true;
        if(P.seating.available(s))throw Error('Occupied seat offered');
        npc.root.position.copy(old.p);npc.root.visible=old.visible;npc.seated=old.seated;
      }
      return {rootY:p.y,top:s.top,exit:s.out||g.player.seatOut};
    });
    await page.screenshot({path:out+name+'.png'});
    await page.keyboard.down('w');
    await page.waitForFunction(()=>!globalThis.__game.player.seated);
    await page.keyboard.up('w');
    assert.equal(errors.length,0,errors.join('\n'));
    console.log('PASS',width,name,JSON.stringify({...info,...contact}));
  }
  await page.close();
},gpuWaitOptions(900,300000));
