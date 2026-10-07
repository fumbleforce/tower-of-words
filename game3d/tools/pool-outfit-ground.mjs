// Real pool walks/runs after swimming; diagnostic lens only, no actor repositioning or hidden geometry.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {withBrowserJob} from '../../tools/lib/browser-job.mjs';
import {blockedSource} from '../../tools/bible/check-scope.mjs';
const base=`http://127.0.0.1:8771/${process.env.BASE||'game3d'}/`,out=process.env.OUT||'game3d/shots/pool-outfits/ground';fs.mkdirSync(out,{recursive:true});
const reports=[];
await withBrowserJob('pool-outfit-ground',async browser=>{
 for(const [width,height,mc] of [[1366,860,'eric'],[390,844,'carina']]){
  const context=await browser.newContext({viewport:{width,height},...(process.env.VIDEO?{recordVideo:{dir:out,size:{width,height}}}:{})}),errors=[];
  await context.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({privateMode:false,voiceOn:false})));
  await context.route('**/*',r=>blockedSource(r.request().url(),true)?(errors.push('protected request'),r.abort()):r.continue());
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}?day=3&place=pool&q=1&mc=${mc}`);
  await page.waitForFunction(()=>globalThis.__game?.place?.name==='pool'&&!globalThis.__game.busy,null,{timeout:90000});
  await page.evaluate(async()=>{
   const g=globalThis.__game,{setPeriod}=await import('./js/sim.js');g.flagsRef.club_swimming=true;g.flagsRef.d3_player_swims=true;setPeriod('evening',g);await g.place.day3({});g.setHurry(true);
   for(const state of ['enter','emiEnter','sit','free'])await g.place.hooks.poolSession({state});g.setHurry(false);g.place.cam.release();
   const THREE=await import('three'),r=g.player,vertices=[];
   r.model.traverse(o=>{if(!o.isSkinnedMesh)return;const p=o.geometry.attributes.position,si=o.geometry.attributes.skinIndex,sw=o.geometry.attributes.skinWeight;
    for(let i=0;i<p.count;i++){let b=0;for(let k=1;k<4;k++)if(sw.getComponent(i,k)>sw.getComponent(i,b))b=k;if(/Foot|Toe/.test(o.skeleton.bones[si.getComponent(i,b)].name))vertices.push([o,i]);}
   });
   globalThis.__feet=()=>{r.root.updateMatrixWorld(true);let low=Infinity;for(const [o,i]of vertices){const p=o.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(o.matrixWorld);low=Math.min(low,g.place.space.worldToLocal(p).y);}const head=g.place.space.worldToLocal(r.model.getObjectByName('Head').getWorldPosition(new THREE.Vector3())).y;const box=new THREE.Box3().setFromObject(r.model),corners=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])corners.push(new THREE.Vector3(x,y,z).project(g.place.camera).toArray());return {low,head,at:r.root.position.toArray(),state:r.state,run:g.walker.gait.run,screen:corners};};
   const {startMoveCheck}=await import('./js/movement/checks.js');startMoveCheck(g);
  });
  const samples=[];
  for(const mode of ['walk','run']){
   await page.evaluate(mode=>{
    const g=globalThis.__game,s=g.place.seats.deck_bench_s.out,target=[s[0],s[1]-(mode==='walk'?3:0)];
    if(!g.place.nav.free(...target))throw Error('Measured deck route blocked');
    const p=g.player.root.position,c=g.place.cam;c.yaw=1.2;c.elev=.35;c.closeOn([p.x,p.z],c.fitDist/(globalThis.innerWidth<600?8:4.8),.65,{onEric:true});
    // Diagnostic tracking is exact so the same head/sole margin holds throughout a fast stride.
    c.update=function(){this.snap(g.player.root.position);};c.snap(p);
    globalThis.__walkFinished=false;globalThis.__groundPending=g.walkTo(...target).then(()=>globalThis.__walkFinished=true);g.walker.runTo=mode==='run';
   },mode);
   for(let n=0;n<100;n++){
    await page.waitForTimeout(70);const sample=await page.evaluate(()=>({...globalThis.__feet(),done:globalThis.__walkFinished}));samples.push({mode,...sample});
    if([4,12].includes(n))await page.screenshot({path:`${out}/${width}-${mc}-${mode}-${n}.png`});
    if(sample.done)break;
   }
   await page.evaluate(()=>globalThis.__groundPending);
  }
  const movement=await page.evaluate(()=>({overlaps:globalThis.__moveCheck.overlaps,spins:globalThis.__moveCheck.spins,gait:globalThis.__gaitCheck.reports(4)}));
  reports.push({width,mc,samples,movement,errors});fs.writeFileSync(`${out}/report.json`,JSON.stringify(reports,null,2));
  assert.ok(samples.every(s=>s.screen.every(p=>Math.abs(p[0])<.95&&Math.abs(p[1])<.95)), 'Diagnostic must retain the entire moving body');
  assert.deepEqual(errors,[]);assert.ok(samples.filter(s=>s.state==='walk').length>10);assert.ok(samples.some(s=>s.mode==='run'&&s.run));
  assert.deepEqual(movement,{overlaps:[],spins:[],gait:[]},JSON.stringify(movement));const video=page.video();await context.close();if(video)await video.saveAs(`${out}/${width}-${mc}-actual-strides.webm`);
 }
},{timeoutMs:240000});
console.log('PASS actual pool deck walk/run and strict movement checks; posed foot heights retained');
