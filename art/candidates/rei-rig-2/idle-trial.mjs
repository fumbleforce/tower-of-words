import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';
await withBrowserJob('rei-idle-trial',async b=>{
 const p=await b.newPage({viewport:{width:1366,height:860}});
 await p.goto('http://127.0.0.1:8771/reviews/crowd-pilot-1/viewer.html?cfg=../../.claude/worktrees/agent-aae25346acf8fdb8d/art/candidates/rei-rig-2/idle-trial-viewer.json&s=idle-trial');
 await p.waitForFunction(()=>window.__viewer?.ready);await p.waitForTimeout(1200);
 for(const view of ['whole row','from the side']){
  await p.evaluate(view=>window.__viewer.view(view),view);await p.waitForTimeout(100);
  await p.screenshot({path:'/home/jorgen/repo/japanese/art/parts/rei-rig-2/viewer/idle-trial-'+(view==='whole row'?'front':'side')+'.png'});
 }
},{timeoutMs:60000});
