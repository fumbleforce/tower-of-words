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
    await waitForGame(page,90000,()=>page.goto(`http://127.0.0.1:8771/${base}/index.html?place=${name}&q=0${['gate','office'].includes(name) ? '&cap' : ''}${process.env.QS || ''}`),'play');
    if (['gate','office'].includes(name)) await page.evaluate(()=>{globalThis.__game.pendingStart=null;globalThis.__run=true;});
    await page.waitForFunction(()=>!globalThis.document.body.classList.contains('loading')&&!globalThis.__game.busy&&!globalThis.__game.walker.path);
    if (process.env.MOVING && name === 'office') {
      const moved=await page.evaluate(async()=>{
        const g=globalThis.__game,P=g.place,s=P.seating.seats.get('my_seat');
        P.seating.available(s);
        const before=[s.x,s.z];
        if(Math.hypot(s.x-5.5,s.z+1.3)>.01)throw Error('Optional seat is not on the actual away chair');
        P.people.tama.root.visible=false;
        const exit=P.things.my_chair.spot();
        g.player.root.position.set(exit[0],0,exit[1]);g.walker.sync();
        if(!P.seating.sit('my_seat'))throw Error('Cannot sit in vacated rolling chair');
        g.player.seated=false;
        if(P.snapshotState().freeSeat)throw Error('Scripted stand saved stale freeSeat');
        g.player.seated=true;
        g.player.root.position.x+=.5;
        if(P.snapshotState().freeSeat)throw Error('Scripted movement saved stale freeSeat');
        g.player.root.position.x-=.5;
        await P.hooks.chairRoll({to:'my_seat'});
        if(g.player.seated||g.player.freeSeat)throw Error('Chair roll retained sitting state');
        P.seating.available(s);
        const authored=P.seats.my_seat;
        if(Math.hypot(s.x-s.source.position.x,s.z-s.source.position.z)>.001 || Math.hypot(s.x-authored.x,s.z-authored.z)>.05)throw Error('Optional seat did not follow returned chair: '+JSON.stringify({seat:[s.x,s.z],chair:s.source.position.toArray(),authored}));
        return {before,after:[s.x,s.z]};
      });
      console.log('PASS live rolling chair',width,JSON.stringify(moved));
    }
    const info=await page.evaluate(async()=>{
      const g=globalThis.__game,P=g.place;
      const ids=[...P.seating.seats.keys()].filter(id=>P.things[id]?.seatAction&&P.seating.reachable(P.seating.seats.get(id)));
      if(!ids.length)throw Error('No usable ordinary seat in '+P.name);
      const id=ids[0],s=P.seating.seats.get(id),out=P.things[id].spot();
      g.player.root.position.set(out[0],s.floor,out[1]); g.walker.sync();
      P.cam.closeOn?.([s.x,s.z],3.6,0.45);
      P.cam.snap?.(g.player.root.position);
      return {id,count:P.seating.seats.size,usable:ids.length,top:s.top};
    });
    await page.waitForTimeout(300);
    const target=await page.evaluate(id=>{
      const mark=globalThis.__game.markers.list.find(m=>m.id===id);
      const r=mark?.el?.querySelector('.pin')?.getBoundingClientRect();
      if(!r?.width)throw Error('Seat pin is not visible: '+id);
      return [r.x+r.width/2,r.y+r.height/2];
    },info.id);
    if(width<700)await page.touchscreen.tap(...target);else await page.mouse.click(...target);
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
        P.restoreState({world:state,flags:{}});
        if(g.player.seated||g.player.freeSeat)throw Error('Occupied saved seat was restored');
        npc.root.position.copy(old.p);npc.root.visible=old.visible;npc.seated=old.seated;
        P.restoreState({world:state,flags:{}});
      }
      return {rootY:p.y,top:s.top,exit:s.out||g.player.seatOut};
    });
    await page.screenshot({path:out+name+'.png'});
    if (process.env.RELOAD && name === places[0]) {
      await waitForGame(page,90000,()=>page.goto(`http://127.0.0.1:8771/${base}/index.html`),'title');
      await page.locator('#title .mcont').click();
      await page.locator('#saves button.slot').filter({hasText:'Autosave'}).click();
      await page.waitForFunction(id=>globalThis.__game.player.seated&&globalThis.__game.player.freeSeat?.id===id,info.id);
      console.log('PASS real Continue', width, name, info.id);
    }
    await page.keyboard.down('w');
    await page.waitForFunction(()=>!globalThis.__game.player.seated);
    await page.keyboard.up('w');
    if (process.env.TRANSITION && name === places.at(-1)) {
      await page.evaluate(async id=>{
        const g=globalThis.__game,s=g.place.seating.seats.get(id),out=g.place.things[id].spot();
        g.player.root.position.set(out[0],s.floor,out[1]);g.walker.sync();
        if(!g.place.seating.sit(id))throw Error('Could not sit before transition');
        await g.travel('canteen',{fast:true,via:g.place.name});
        if(g.player.seated||g.player.freeSeat||g.player.seatOut)throw Error('Seat state survived a place transition');
      },info.id);
      console.log('PASS seated place transition',width,name);
    }
    assert.equal(errors.length,0,errors.join('\n'));
    console.log('PASS',width,name,JSON.stringify({...info,...contact}));
  }
  await page.close();
},gpuWaitOptions(900,300000));
