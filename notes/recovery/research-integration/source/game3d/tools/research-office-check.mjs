import fs from 'node:fs';
import assert from 'node:assert/strict';
import {withBrowserJob} from '../../tools/lib/browser-job.mjs';
import {waitForGame} from '../test/support/wait-ready.mjs';
const width=+(process.argv[2]||1366),mc=process.argv[3]||'eric',base=new URL((process.env.BASE||'game3d')+'/',`http://127.0.0.1:${process.env.PORT||8771}/`).href;
const out=`/tmp/codex-research-office-${process.env.ROUND||'1'}`;fs.mkdirSync(out,{recursive:true});
await withBrowserJob('research-office',async browser=>{
 const context=await browser.newContext({viewport:{width,height:width<700?844:860}}),page=await context.newPage(),errors=[],checks=[],phases=new Set();
 page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({v:2,textSpeed:'instant',voiceOn:false,privateMode:false})));
 const shot=label=>page.screenshot({path:`${out}/${width}-${mc}-${label}.png`});
 let watching=true;const watch=(async()=>{while(watching){try{const phase=await page.evaluate(()=>globalThis.__game?.place?.researchOffice?.phase);if(phase&&!phases.has(phase)){phases.add(phase);await shot(phase);if(process.env.OFFER_VIEWS&&phase==='copy-offer'){for(const yaw of [-1.55,-.5,1,2.3,3.14])for(const elev of [1,1.3]){await page.evaluate(({yaw,elev})=>{const g=globalThis.__game;Object.assign(g.place.cam.close.conversationShot,{yaw,elev,minDistance:2.2,halfWidth:.65});g.place.cam.close.target.y=1.02;g.place.cam.snap(g.player.root.position);},{yaw,elev});await page.waitForTimeout(180);await shot('offer-'+yaw+'-'+elev);}await page.evaluate(()=>globalThis.__releaseOffer?.());}}}catch{}await new Promise(r=>setTimeout(r,40));}})();
 try{
  await waitForGame(page,60000,()=>page.goto(`${base}index.html?day=2&place=office&mc=${mc}`),'play');await page.waitForFunction(()=>!globalThis.__game.busy);
  await page.evaluate(async()=>{const g=globalThis.__game,{flags}=await import('./js/narrative/state.js');flags.d2_ticket_done=true;g.place.hooks.officeDay2({state:'arrive'});g.busy=true;});
  if(process.env.OFFER_VIEWS)await page.evaluate(()=>{const g=globalThis.__game,wait=g.wait;g.wait=ms=>ms===700&&g.place.researchOffice.phase==='copy-offer'?new Promise(resolve=>{globalThis.__releaseOffer=()=>{g.wait=wait;resolve();};}):wait(ms);});
  for(const state of (process.env.VIEWS?['desk']:['desk','show','point','handoff','release'])){
   const result=await page.evaluate(async state=>{const g=globalThis.__game,p=g.place,s=p.researchOffice;const ok=await s.act({state});return{state,ok,ready:s.ready(),contacts:s.contacts,player:g.player.root.position.toArray(),mori:p.people.mori.root.position.toArray()};},state);
   checks.push(result);await page.waitForTimeout(400);await shot(state);assert.equal(result.ok,true,state);
   if(process.env.VIEWS)for(const yaw of [-1.2,-1.35,-1.5])for(const elev of [.3,.5]){await page.evaluate(({yaw,elev})=>{const g=globalThis.__game;Object.assign(g.place.cam.close.conversationShot,{yaw,elev,minDistance:2.2,halfWidth:.65});g.place.cam.close.target.y=1.02;g.place.cam.snap(g.player.root.position);},{yaw,elev});await page.waitForTimeout(200);await shot('pair-'+yaw+'-'+elev);}
  }
  if(!process.env.VIEWS)assert.equal(await page.evaluate(async()=>(await import('./js/finds/index.js')).found('research_mori_copy')),true);
  assert.deepEqual(errors,[]);
 }catch(error){checks.push({failure:error.stack,contacts:await page.evaluate(()=>globalThis.__game?.place?.researchOffice?.contacts)});await shot('failure');throw error;}
 finally{watching=false;await watch;fs.writeFileSync(`${out}/${width}-${mc}-report.json`,JSON.stringify({checks,errors,phases:[...phases]},null,2));await context.close();}
},{timeoutMs:240000,gpuWaitMs:1200000});
