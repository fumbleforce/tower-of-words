import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { openGame } from '../test/support/open-game.mjs';
import fixture from '../test/fixtures/save-v1.json' with { type: 'json' };
const base = new URL((process.env.BASE || 'game3d') + '/', `http://127.0.0.1:${process.env.PORT || 8771}/`).href;
const out=`/tmp/codex-sender-arrival-${process.env.ROUND||'1'}`;
fs.mkdirSync(out,{recursive:true});
await withBrowserJob('sender-arrival',async browser=>{
 const context=await browser.newContext({viewport:{width:1366,height:860}});
 const saved={...structuredClone(fixture),place:'office',period:'morning'};
 Object.assign(saved.flags,{place:'office',period:'morning',machineOpen:true,chairHome:true,copier_done:true});
 await context.addInitScript(saved=>{if(!globalThis.sessionStorage.getItem('arrival-seed')){globalThis.localStorage.setItem('amakawa-day1-save',JSON.stringify(saved));globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({v:2,privateMode:false,textSpeed:'instant',voiceOn:false}));globalThis.sessionStorage.setItem('arrival-seed','1');}},saved);
 const opened=await openGame({newContext:async()=>context},{mode:'title',url:`${base}index.html`}),{page}=opened;
 const resume=async()=>{await page.locator('#title .mcont').click();await page.locator('#saves button.slot').filter({hasText:'Autosave'}).click();await page.waitForFunction(()=>globalThis.__game?.place?.name==='office'&&!globalThis.__game.busy&&!globalThis.__game.player.scripted&&globalThis.__game.saveEnabled);};
 const capture=async label=>{
  await page.waitForTimeout(500);
  const result=await page.evaluate(async()=>{
   const g=globalThis.__game,P=g.place,r=P.people.mori,{seatContact}=await import('./test/support/seat-contact.mjs');
   g.busy=true;
   const contact=seatContact(P,r,[...Object.values(P.people),g.player,g.mioNpc]);
   const save=(await import('./js/sim.js'));save.save(g);
   P.cam.closeOn([2.16,-3.36],P.cam.fitDist/7,.6);P.cam.close.conversationShot={yaw:0,elev:.35,fov:55,minDistance:1.8,halfWidth:.7};P.cam.snap(g.player.root.position);
   return {...contact,position:r.root.position.toArray(),seated:r.seated,state:r.state,walk:r.savedWalk,saved:save.loadSave().world.people.mori};
  });
  await page.waitForTimeout(250);await page.screenshot({path:`${out}/${label}.png`});await page.evaluate(()=>{const g=globalThis.__game;g.place.cam.close.conversationShot.yaw=-.65;g.place.cam.snap(g.player.root.position);});await page.waitForTimeout(100);await page.screenshot({path:`${out}/${label}-front.png`});fs.writeFileSync(`${out}/${label}.json`,JSON.stringify(result,null,2));await page.evaluate(()=>globalThis.__game.busy=false);return result;
 };
 try{
  await resume();await page.evaluate(async()=>{const g=globalThis.__game;g.setHurry(true);await g.place.walkPerson('mori',[2.3,-2.55]);});
  const ordinary=await capture('ordinary');
  await page.evaluate(async()=>{const g=globalThis.__game;await g.hooks.walk({who:'mori',to:[1.6,-1.6]});g.setHurry(false);await g.hooks.walk({who:'mori',to:'chief_desk',wait:false});g.paused=true;(await import('./js/sim.js')).save(g);});
  await page.reload();await resume();await page.evaluate(()=>{globalThis.__arrivalHurry=setInterval(()=>globalThis.__game.setHurry(true),30);});
  await page.waitForFunction(()=>globalThis.__game.place.people.mori.seated&&!globalThis.__game.place.people.mori.savedWalk,null,{timeout:60000});
  const resumed=await capture('resumed');
  for(const pose of [ordinary,resumed]){
   assert.deepEqual([pose.position[0],pose.position[2]],[2.16,-3.36]);assert.equal(pose.seated,true);assert.equal(pose.saved.seated,true);assert.equal(pose.saved.walk,undefined);assert.ok(pose.gap>=-.012&&pose.gap<=.001,`measured body underside touches actual cushion: ${pose.gap}`);
  }
  assert.deepEqual(resumed.position,ordinary.position);assert.ok(Math.abs(resumed.gap-ordinary.gap)<0.0001,'ordinary/resumed rendered contact matches within 0.1 mm');
  // A superseding walk invalidates the old arrival token; neither seats Mori remotely.
  await page.evaluate(async()=>{const g=globalThis.__game;await g.hooks.walk({who:'mori',to:[1.6,-1.6]});const pending=g.hooks.walk({who:'mori',to:'chief_desk'});await new Promise(r=>setTimeout(r,30));await g.hooks.walk({who:'mori',to:[1.6,-1.6]});await pending;});
  assert.equal(await page.evaluate(()=>globalThis.__game.place.people.mori.seated),false);
  assert.deepEqual(opened.errors,[]);console.log('PASS Mori direct/resumed arrival: exact position/save, measured cushion contact, cancellation');
 }finally{await context.close();}
},{timeoutMs:210000,gpuWaitMs:1200000});
