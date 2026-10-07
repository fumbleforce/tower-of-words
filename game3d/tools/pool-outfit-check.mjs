// Native selected-model diagnostics. Route only the viewer config; retain original review and every attempt.
import fs from 'node:fs';
import {withBrowserJob} from '../../tools/lib/browser-job.mjs';
const base=process.env.BASE||'.claude/worktrees/codex-pool-swimwear';
const attempt=process.env.ATTEMPT||'ankle-weights-1';
const out=`art/parts/pool-swimwear-runtime-1/captures-${attempt}`;
fs.mkdirSync(out,{recursive:true});
await withBrowserJob('pool-outfit-'+attempt,async browser=>{
 const page=await browser.newPage({viewport:{width:1366,height:860}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/reviews/pool-swimwear-1/viewer.json',async route=>{
  const cfg=JSON.parse(fs.readFileSync('reviews/pool-swimwear-1/viewer.json'));
  for(const id of ['eric','carina','emi','kuro-b']){
   const r=cfg.rigs[id],dir=`art/parts/pool-swimwear-runtime-1/${attempt}/${id}/`;
   if(attempt!=='original')Object.assign(r,{dir,idle:dir+'idle.json',sitJson:dir+'sit.json'});
  }
  cfg.title='Pool selected model motion diagnostic: '+attempt;
  await route.fulfill({json:cfg});
 });
 await page.goto(`http://127.0.0.1:8771/${base}/reviews/pool-swimwear-1/viewer.html?s=eric&m=sit`);
 await page.waitForFunction(()=>globalThis.__viewer?.ready,null,{timeout:90000});
 const result=[];
 for(const id of ['eric','carina','emi','kuro-b']){
  await page.evaluate(async id=>{const v=globalThis.__viewer;await v.show(id==='kuro-b'?'kuro':id);v.setMotion('sit');v.freeze(true);v.advance(40);},id);
  for(const angle of [-1.57,0,1.57]){
   await page.evaluate(angle=>globalThis.__viewer.closeOn(0,'body',angle),angle);
   await page.waitForTimeout(100);await page.screenshot({path:`${out}/${id}-sit-${angle}.png`});
  }
  result.push(await page.evaluate(id=>{const m=globalThis.__viewer.figures()[0].m;return {id,state:m.state,bones:m.model.getObjectByName('RightFoot').matrixWorld.elements};},id));
 }
 fs.writeFileSync(`${out}/report.json`,JSON.stringify({attempt,result,errors},null,2));
 if(errors.length)throw Error(errors.join('\n'));
},{timeoutMs:180000});
