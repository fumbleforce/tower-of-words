import { publicResearchContextOptions } from '../test/support/research-integration-evidence.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {withBrowserJob} from '../../tools/lib/browser-job.mjs';
import {waitForGame} from '../test/support/wait-ready.mjs';
const width=+(process.argv[2]||1366),mc=process.argv[3]||'eric',base=new URL((process.env.BASE||'game3d')+'/',`http://127.0.0.1:${process.env.PORT||8771}/`).href;
const out=`/tmp/codex-research-office-${process.env.ROUND||'1'}`;fs.mkdirSync(out,{recursive:true});
await withBrowserJob('research-office',async browser=>{
 const context=await publicResearchContextOptions(browser,{viewport:{width,height:width<700?844:860}}),page=await context.newPage(),errors=[],checks=[],phases=new Set();
 page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({v:2,textSpeed:'instant',voiceOn:false,privateMode:false})));
 const shot=label=>page.screenshot({path:`${out}/${width}-${mc}-${label}.png`});
 async function contactViews(phase){
  const previous=await page.evaluate(()=>{const g=globalThis.__game,c=g.place.cam.close;const saved={paused:g.paused,shot:{...c.conversationShot},target:c.target.toArray()};g.paused=true;return saved;});
  try{for(const yaw of [-1.55,0,1.55]){await page.evaluate(yaw=>{const g=globalThis.__game,p=g.place,v=p.researchOffice.copy.position;Object.assign(p.cam.close.conversationShot,{yaw,elev:.25,minDistance:1.05,halfWidth:.36});p.cam.close.target.set(v.x,v.y+.025,v.z);p.cam.snap(g.player.root.position);},yaw);await page.waitForTimeout(100);await shot(phase+'-palm-'+yaw);}}
  finally{await page.evaluate(saved=>{const g=globalThis.__game,c=g.place.cam.close;c.conversationShot=saved.shot;c.target.fromArray(saved.target);g.place.cam.snap(g.player.root.position);g.paused=saved.paused;},previous);}
 }
 let watching=true;const watch=(async()=>{while(watching){try{const phase=await page.evaluate(()=>globalThis.__game?.place?.researchOffice?.phase);if(phase&&!phases.has(phase)){phases.add(phase);await shot(phase);if(process.env.CONTACT_VIEWS&&['copy-presented','copy-offer'].includes(phase))await contactViews(phase);if(process.env.OFFER_VIEWS&&phase==='copy-offer'){for(const yaw of [-1.55,-.5,1,2.3,3.14])for(const elev of [1,1.3]){await page.evaluate(({yaw,elev})=>{const g=globalThis.__game;Object.assign(g.place.cam.close.conversationShot,{yaw,elev,minDistance:2.2,halfWidth:.65});g.place.cam.close.target.y=1.02;g.place.cam.snap(g.player.root.position);},{yaw,elev});await page.waitForTimeout(180);await shot('offer-'+yaw+'-'+elev);}await page.evaluate(()=>globalThis.__releaseOffer?.());}}}catch{}await new Promise(r=>setTimeout(r,40));}})();
 try{
  await waitForGame(page,60000,()=>page.goto(`${base}index.html?day=2&place=office&mc=${mc}`),'play');await page.waitForFunction(()=>!globalThis.__game.busy);
  await page.evaluate(async()=>{const g=globalThis.__game,{flags}=await import('./js/narrative/state.js');flags.d2_ticket_done=true;g.place.hooks.officeDay2({state:'arrive'});g.busy=true;});
  await page.evaluate(async()=>{const THREE=await import('three'),g=globalThis.__game,p=g.place.researchOffice,frames=[];globalThis.__paperFrames=frames;globalThis.__paperSampling=true;function sample(t){if(!globalThis.__paperSampling)return;p.copy.updateWorldMatrix(true,true);frames.push({t,phase:p.phase,visible:p.copy.visible,position:p.copy.getWorldPosition(new THREE.Vector3()).toArray(),rotation:p.copy.getWorldQuaternion(new THREE.Quaternion()).toArray(),corners:[[-.115,0,-.12],[.115,0,-.12],[.115,0,.12],[-.115,0,.12]].map(v=>p.copy.localToWorld(new THREE.Vector3(...v)).toArray())});globalThis.requestAnimationFrame(sample);}globalThis.requestAnimationFrame(sample);});
  if(process.env.OFFER_VIEWS)await page.evaluate(()=>{const g=globalThis.__game,wait=g.wait;g.wait=ms=>ms===700&&g.place.researchOffice.phase==='copy-offer'?new Promise(resolve=>{globalThis.__releaseOffer=()=>{g.wait=wait;resolve();};}):wait(ms);});
  for(const state of (process.env.VIEWS?['desk']:['desk','show','point','handoff','release'])){
   const result=await page.evaluate(async state=>{const g=globalThis.__game,p=g.place,s=p.researchOffice;const ok=await s.act({state});return{state,ok,ready:s.ready(),contacts:s.contacts,player:g.player.root.position.toArray(),mori:p.people.mori.root.position.toArray()};},state);
   checks.push(result);await page.waitForTimeout(400);await shot(state);assert.equal(result.ok,true,state);
   if(process.env.VIEWS)for(const yaw of [-1.2,-1.35,-1.5])for(const elev of [.3,.5]){await page.evaluate(({yaw,elev})=>{const g=globalThis.__game;Object.assign(g.place.cam.close.conversationShot,{yaw,elev,minDistance:2.2,halfWidth:.65});g.place.cam.close.target.y=1.02;g.place.cam.snap(g.player.root.position);},{yaw,elev});await page.waitForTimeout(200);await shot('pair-'+yaw+'-'+elev);}
  }
  if(!process.env.VIEWS)assert.equal(await page.evaluate(async()=>(await import('./js/finds/index.js')).found('research_mori_copy')),true);
  const trajectory=await page.evaluate(()=>{globalThis.__paperSampling=false;return globalThis.__paperFrames;});
  fs.writeFileSync(`${out}/${width}-${mc}-trajectory.json`,JSON.stringify(trajectory));
  for(let i=1;i<trajectory.length;i++){const a=trajectory[i-1],b=trajectory[i];if(!a.visible||!b.visible||!a.phase?.startsWith('copy-')||!b.phase?.startsWith('copy-')||b.t-a.t>100)continue;const dt=(b.t-a.t)/1000;for(let k=0;k<4;k++){const d=Math.hypot(...a.corners[k].map((v,j)=>v-b.corners[k][j]));assert.ok(d<.035+dt*1.5,`paper corner discontinuity ${a.phase}->${b.phase}: ${d}m in ${dt}s`);}const dot=Math.abs(a.rotation.reduce((sum,v,j)=>sum+v*b.rotation[j],0));assert.ok(2*Math.acos(Math.min(1,dot))<.1,'paper orientation snap');}
  checks.push({trajectoryFrames:trajectory.length});
  assert.deepEqual(errors,[]);
 }catch(error){checks.push({failure:error.stack,contacts:await page.evaluate(()=>globalThis.__game?.place?.researchOffice?.contacts)});await shot('failure');throw error;}
 finally{watching=false;await watch;fs.writeFileSync(`${out}/${width}-${mc}-report.json`,JSON.stringify({checks,errors,phases:[...phases]},null,2));await context.close();}
},{gpuWaitMs: Number(process.env.GPU_WAIT || 1800) * 1000, timeoutMs:240000});
