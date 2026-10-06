import fs from 'node:fs';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';
const out='/home/jorgen/repo/japanese/art/parts/rei-rig-2/viewer';
fs.mkdirSync(out,{recursive:true});
await withBrowserJob('rei-viewer-recovery',async browser=>{
 const p=await browser.newPage({viewport:{width:1366,height:860}}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:8771/reviews/crowd-pilot-1/viewer.html?cfg=../../.claude/worktrees/agent-aae25346acf8fdb8d/reviews/rei-meshy-1/rig-repair-viewer.json&s=compare');
 await p.waitForFunction(()=>window.__viewer?.ready);
 for(const s of ['compare','cast','rei']){
  await p.evaluate(s=>window.__viewer.show(s),s);
  for(const m of (process.env.MOTIONS || 'idle,walk,run,sit').split(',')){
   await p.evaluate(m=>window.__viewer.setMotion(m),m);
   await p.waitForTimeout(1200);
   for(const v of ['whole row','from the side']){
    await p.evaluate(v=>window.__viewer.view(v),v);await p.waitForTimeout(100);
    await p.screenshot({path:`${out}/${s}-${m}-${v==='whole row'?'front':'side'}.png`});
   }
  }
 }
 await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{window.__viewer.setMotion('idle');window.__viewer.view('whole row')});await p.waitForTimeout(500);await p.screenshot({path:out+'/rei-phone.png'});
 fs.writeFileSync(out+'/report.json',JSON.stringify({errors},null,2));console.log(errors);
},{timeoutMs:160000});
