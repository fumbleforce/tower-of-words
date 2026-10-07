// Same diagnostic lens and selected geometry at measured native-clip head extrema.
import fs from 'node:fs';
import {withBrowserJob} from '../../tools/lib/browser-job.mjs';
const out=process.env.OUT||'art/parts/pool-swimwear-runtime-1/head-phases-10';fs.mkdirSync(out,{recursive:true});
const rows=JSON.parse(fs.readFileSync(process.env.PHASES||'art/parts/pool-swimwear-runtime-1/grounded-10/head-phases.json'));
await withBrowserJob('pool-outfit-head-phases',async browser=>{
 for(const version of (process.env.VERSIONS||'ankle-bind-seat-8,grounded-10').split(',')){
  const page=await browser.newPage({viewport:{width:1366,height:860}});
  await page.route('**/reviews/pool-swimwear-1/viewer.json',async route=>{
   const cfg=JSON.parse(fs.readFileSync('reviews/pool-swimwear-1/viewer.json'));
   for(const id of ['eric','carina','emi','kuro-b']){const dir=`art/parts/pool-swimwear-runtime-1/${version}/${id}/`;Object.assign(cfg.rigs[id],{dir,idle:dir+'idle.json',sitJson:dir+'sit.json'});}
   cfg.title=`Pool motion extrema: ${version}`;await route.fulfill({json:cfg});
  });
  await page.goto('http://127.0.0.1:8771/.claude/worktrees/codex-pool-swimwear/reviews/pool-swimwear-1/viewer.html?s=eric');
  await page.waitForFunction(()=>globalThis.__viewer?.ready,null,{timeout:90000});
  for(const row of rows.filter(r=>r.id==='eric'&&r.version===version))for(const phase of ['min','max']){
   await page.evaluate(({mode,value})=>{
    const v=globalThis.__viewer;v.freeze(true);v.setMotion(mode);v.advance(90);v.closeOn(0,'body',-.7);
    const f=v.figures()[0],m=f.m;const a=m.mixer._actions.find(a=>a.getClip().name.includes(mode==='walk'?'walking':'running'));
    m.mixer.stopAllAction();a.reset().play();a.timeScale=0;a.time=value*a.getClip().duration;m.mixer.update(0);
    const hips=m.model.getObjectByName('Hips');hips.position.x=0;hips.position.z=0;
    m.root.position.set(0,0,0);f.slide.position.set(0,0,0);m.root.updateWorldMatrix(true,true);
   },{mode:row.mode,value:row[phase+'_phase']});
   await page.waitForTimeout(100);await page.screenshot({path:`${out}/${version}-eric-${row.mode}-${phase}.png`});
  }
  await page.close();
 }
},{timeoutMs:160000});console.log('Captured measured head extrema at a consistent full-body diagnostic lens');
