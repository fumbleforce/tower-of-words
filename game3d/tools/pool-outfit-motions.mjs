// Actual native clips and pool overlay on each selected rig; diagnostic viewer never installs an outfit.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {withBrowserJob} from '../../tools/lib/browser-job.mjs';
const base=process.env.BASE||'.claude/worktrees/codex-pool-swimwear';
const attempt=process.env.ATTEMPT||'ankle-bind-seat-8';
const out=`art/parts/pool-swimwear-runtime-1/motions-${attempt}`;
fs.mkdirSync(out,{recursive:true});
await withBrowserJob('pool-outfit-motions',async browser=>{
 const page=await browser.newPage({viewport:{width:1366,height:860}}),errors=[],rows=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/reviews/pool-swimwear-1/viewer.json',async route=>{
  const cfg=JSON.parse(fs.readFileSync('reviews/pool-swimwear-1/viewer.json'));
  for(const id of ['eric','carina','emi','kuro-b']){
   const r=cfg.rigs[id],dir=`art/parts/pool-swimwear-runtime-1/${attempt}/${id}/`;
   if(attempt!=='original')Object.assign(r,{dir,idle:dir+'idle.json',sitJson:dir+'sit.json'});
  }
  cfg.title='Selected pool models: motion diagnostics';
  await route.fulfill({json:cfg});
 });
 await page.goto(`http://127.0.0.1:8771/${base}/reviews/pool-swimwear-1/viewer.html?s=eric`);
 await page.waitForFunction(()=>globalThis.__viewer?.ready,null,{timeout:90000});
 for(const id of (process.env.IDS||'eric,carina,emi,kuro-b').split(',')){
  await page.evaluate(async id=>{const v=globalThis.__viewer;await v.show(id==='kuro-b'?'kuro':id);v.freeze(true);v.closeOn(0,'body',-.7);},id);
  for(const mode of (process.env.MODES||'idle,walk,run,sit,tread,swim').split(',')){
   await page.evaluate(async mode=>{
    const v=globalThis.__viewer;globalThis.__water?.dispose();globalThis.__water=null;
    v.setMotion(['tread','swim'].includes(mode)?'idle':mode);v.advance(90);v.closeOn(0,'body',-.7);
    if(['tread','swim'].includes(mode)){
     const {swimmerPose}=await import('../../game3d/js/places/day3/swim-pose.js');
     globalThis.__water=swimmerPose(v.figures()[0].m);globalThis.__water.enter(mode);
     v.controls.target.y=.25;v.camera.position.y=.75;v.controls.update();
    }
   },mode);
   const samples=[];
   for(let n=0;n<4;n++){
    samples.push(await page.evaluate(()=>{
     const v=globalThis.__viewer;v.advance(9);const m=v.figures()[0].m,bones={};
     m.root.updateMatrixWorld(true);m.model.traverse(o=>{if(o.isBone&&/Foot$|Leg$|Head$|Arm$/.test(o.name))bones[o.name]=o.quaternion.toArray();});
     return {state:m.state,swimming:!!m.swimming,root:m.root.position.toArray(),bones};
    }));
    await page.screenshot({path:`${out}/${id}-${mode}-${n}.png`});
   }
   if(['walk','run','swim','tread'].includes(mode))assert.ok(new Set(samples.map(s=>JSON.stringify(s.bones))).size>2,`${id} ${mode} animates`);
   rows.push({id,mode,samples});
  }
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/report.json`,JSON.stringify({attempt,rows,errors},null,2));
},{timeoutMs:180000});
