import assert from 'node:assert/strict';
import fs from 'node:fs';
import {withBrowserJob} from '../../tools/lib/browser-job.mjs';
import {blockedSource} from '../../tools/bible/check-scope.mjs';
const base=`http://127.0.0.1:8771/${process.env.BASE||'game3d'}/`;
const out=process.env.OUT||'game3d/shots/pool-outfits/lifecycle';fs.mkdirSync(out,{recursive:true});
const reports=[];
await withBrowserJob('pool-outfit-lifecycle',async browser=>{
 for(const [width,height,mc] of [[1366,860,'eric'],[390,844,'carina']]){
  const context=await browser.newContext({viewport:{width,height}}),errors=[];
  await context.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({privateMode:false,voiceOn:false})));
  await context.route('**/*',r=>blockedSource(r.request().url(),true)?(errors.push('protected request'),r.abort()):r.continue());
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}?day=3&place=pool&q=1&mc=${mc}`);
  await page.waitForFunction(()=>globalThis.__game?.place?.name==='pool'&&!globalThis.__game.busy,null,{timeout:90000});
  await page.evaluate(async()=>{
   const g=globalThis.__game,{setPeriod}=await import('./js/sim.js');
   globalThis.__ordinary={actor:g.player,root:g.player.root,model:g.player.model,update:g.player.update,walker:g.walker.body};
   g.flagsRef.club_swimming=true;g.flagsRef.d3_player_swims=true;setPeriod('evening',g);await g.place.day3({});
   globalThis.__changes=[];const walk=g.walkTo.bind(g);
   g.walkTo=async(x,z)=>{globalThis.__changes.push({phase:'start',to:[x,z],at:g.player.root.position.toArray(),outfits:g.place.snapshotState().swim.outfits});await walk(x,z);globalThis.__changes.push({phase:'arrive',to:[x,z],at:g.player.root.position.toArray(),outfits:g.place.snapshotState().swim.outfits});};
   g.setHurry(true);await g.place.hooks.poolSession({state:'enter'});await g.place.hooks.poolSession({state:'emiEnter'});g.setHurry(false);
  });
  await page.screenshot({path:`${out}/${width}-${mc}-water.png`});
  await page.evaluate(async()=>{const g=globalThis.__game;g.setHurry(true);await g.place.hooks.poolSession({state:'sit'});g.setHurry(false);});
  await page.waitForTimeout(400);await page.screenshot({path:`${out}/${width}-${mc}-bench.png`});
  const contact=await page.evaluate(async()=>{
   const THREE=await import('three'),g=globalThis.__game,P=g.place,rows=[];
   for(const [id,r] of [['eric',g.player],['emi',P.people.emi]]){
    r.root.updateMatrixWorld(true);const hip=r.model.getObjectByName('Hips'),hp=r.root.worldToLocal(hip.getWorldPosition(new THREE.Vector3()));let lowest=Infinity;
    r.model.traverse(o=>{if(!o.isSkinnedMesh)return;const pos=o.geometry.attributes.position,si=o.geometry.attributes.skinIndex,sw=o.geometry.attributes.skinWeight;
     for(let i=0;i<pos.count;i++){
      let best=0;for(let k=1;k<4;k++)if(sw.getComponent(i,k)>sw.getComponent(i,best))best=k;
      if(!/Hips|UpLeg/.test(o.skeleton.bones[si.getComponent(i,best)].name))continue;
      const v=o.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(o.matrixWorld),local=r.root.worldToLocal(v.clone());
      if(local.z-hp.z<.2)lowest=Math.min(lowest,P.space.worldToLocal(v).y);
     }
    });rows.push({id,seated:r.seated,underside:lowest,top:P.seats.deck_bench_s.top,gap:lowest-P.seats.deck_bench_s.top});
   }
   const old=globalThis.__ordinary;return {rows,outfits:P.snapshotState().swim.outfits,identity:g.player===old.actor&&g.player.root===old.root&&g.walker.body===old.walker};
  });
  assert.ok(contact.identity);assert.ok(contact.rows.every(r=>r.seated&&Math.abs(r.gap)<.03),JSON.stringify(contact));
  assert.deepEqual(contact.outfits,{eric:true,emi:true,kuro:true});
  const after=await page.evaluate(async()=>{
   const g=globalThis.__game,P=g.place;await P.hooks.poolSession({state:'free'});g.setHurry(true);await P.hooks.poolSession({state:'exit'});g.setHurry(false);
   const old=globalThis.__ordinary;return {outfits:P.snapshotState().swim.outfits,root:g.player.root===old.root,model:g.player.model===old.model,update:g.player.update===old.update,walks:globalThis.__changes,locker:P.changing.locker,shower:P.changing.shower};
  });
  assert.ok(after.root&&after.model&&after.update);assert.equal(after.outfits.eric,false);
  const starts=after.walks.filter(x=>x.phase==='start'),firstShower=starts.find(x=>Math.hypot(x.to[0]-after.shower[0],x.to[1]-after.shower[1])<.01);
  assert.ok(firstShower.outfits.eric);assert.ok(Math.hypot(firstShower.at[0]-after.locker[0],firstShower.at[2]-after.locker[1])<.2,'changed only at actual locker');
  await page.screenshot({path:`${out}/${width}-${mc}-changed-back.png`});
  assert.deepEqual(errors,[]);reports.push({width,mc,contact,after,errors});await context.close();
 }
},{timeoutMs:240000});
fs.writeFileSync(`${out}/report.json`,JSON.stringify(reports,null,2));console.log('PASS pool outfits actual locker route, seat contact, stable actor/root, and change back');
