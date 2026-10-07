import assert from 'node:assert/strict';
import fs from 'node:fs';
import {withBrowserJob} from '../../tools/lib/browser-job.mjs';
import {blockedSource} from '../../tools/bible/check-scope.mjs';
const base=`http://127.0.0.1:8771/${process.env.BASE||'game3d'}/`,out=process.env.OUT||'game3d/shots/pool-outfits/lifetime';fs.mkdirSync(out,{recursive:true});
const reports=[];
await withBrowserJob('pool-outfit-lifetime',async browser=>{
 for(const mode of ['cancel','missing']){
  const context=await browser.newContext({viewport:{width:390,height:844}}),errors=[],warnings=[];
  await context.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({privateMode:false,voiceOn:false})));
  await context.route('**/*',r=>blockedSource(r.request().url(),true)?r.abort():mode==='missing'&&/swimwear-carina\/walk.glb/.test(r.request().url())?r.fulfill({status:404,body:'unavailable fixture'}):r.continue());
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning')warnings.push(m.text());});
  await page.goto(`${base}?day=3&place=pool&q=1&mc=carina`);
  await page.waitForFunction(()=>globalThis.__game?.place?.name==='pool'&&!globalThis.__game.busy,null,{timeout:90000});
  await page.evaluate(async()=>{const g=globalThis.__game,{setPeriod}=await import('./js/sim.js');g.flagsRef.club_swimming=true;g.flagsRef.d3_player_swims=true;setPeriod('evening',g);await g.place.day3({});g.setHurry(true);});
  if(mode==='missing'){
   const result=await page.evaluate(async()=>{const g=globalThis.__game;await g.place.hooks.poolSession({state:'enter'});return {outfits:g.place.snapshotState().swim.outfits,swimming:g.player.swimming};});
   assert.deepEqual(result.outfits,{});assert.equal(result.swimming,true);assert.ok(warnings.some(w=>w.includes('Pool outfits unavailable')));
   reports.push({mode,result,warnings,errors});
  }else{
   await page.evaluate(()=>{
    const g=globalThis.__game,walk=g.walkTo.bind(g),shower=g.place.changing.shower;
    globalThis.__originalPoolActor={root:g.player.root,model:g.player.model,update:g.player.update};
    g.walkTo=async(x,z)=>{await walk(x,z);if(Math.hypot(x-shower[0],z-shower[1])<.01){g.walkTo=walk;globalThis.__atShower=true;await new Promise(r=>globalThis.__releaseShower=r);}};
    globalThis.__enterPool=g.place.hooks.poolSession({state:'enter'});
   });
   await page.waitForFunction(()=>globalThis.__atShower,null,{timeout:45000});
   assert.equal(await page.evaluate(()=>globalThis.__game.place.snapshotState().swim.outfits.eric),true);
   await page.screenshot({path:`${out}/390-carina-before-cancel.png`});
   const result=await page.evaluate(async()=>{
    const g=globalThis.__game;g.place.leave();await globalThis.__enterPool;
    const at=g.player.root.position.clone(),old=globalThis.__originalPoolActor;
    globalThis.__releaseShower();await new Promise(r=>setTimeout(r,150));
    return {root:g.player.root===old.root,model:g.player.model===old.model,update:g.player.update===old.update,lateMove:g.player.root.position.distanceTo(at),swimming:!!g.player.swimming,outfits:g.place.snapshotState().swim.outfits};
   });
   assert.ok(result.root&&result.model&&result.update);assert.equal(result.lateMove,0);assert.equal(result.swimming,false);assert.equal(result.outfits.eric,false);
   await page.screenshot({path:`${out}/390-carina-cancelled.png`});reports.push({mode,result,warnings,errors});
  }
  assert.deepEqual(errors,[]);await context.close();fs.writeFileSync(`${out}/report.json`,JSON.stringify(reports,null,2));
 }
},{timeoutMs:200000});console.log('PASS cancellation after actual locker change and optional model-download failure');
