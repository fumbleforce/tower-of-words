import fs from 'node:fs';
import assert from 'node:assert/strict';
import {COUNTER,SERVICE_END,R} from '../js/scenes/canteen/plan.js';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
const width=+(process.argv[2]||1366),height=width<700?844:860;
const base=process.env.BASE||'.claude/worktrees/codex-canteen-meals/game3d';
const out=new URL(`../shots/canteen-meals/${process.env.ROUND||'build1'}-${width}/`,import.meta.url);fs.mkdirSync(out,{recursive:true});
await withBrowserJob('canteen-meals-'+width,async browser=>{
 const context=await browser.newContext({viewport:{width,height},hasTouch:width<700,isMobile:width<700}),page=await context.newPage();
 let closing=false;const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',scopedRoute({publicOnly:true,isClosing:()=>closing,onFailure:s=>errors.push(s)}));
 await page.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({privateMode:false,voiceOn:false,textSpeed:'instant'})));
 try{
 await page.goto(`http://127.0.0.1:8771/${base}/index.html?day=3&place=canteen&q=0&mc=${width<700?'carina':'eric'}`);
 await page.waitForFunction(()=>globalThis.__game?.place?.canteenDining&&!globalThis.__game.busy,null,{timeout:45000});
 await page.evaluate(async()=>{await globalThis.__game.hooks.period({to:'lunch'});});
 await page.evaluate(()=>{
   globalThis.__canteenTrace=[];const g=globalThis.__game, update=g.place.update;
   g.place.update=function(...args){const value=update.apply(this,args);const r=this.people.canteen_worker;
     globalThis.__canteenTrace.push({x:r.root.position.x,z:r.root.position.z,r:0.24*r.root.scale.x,phase:this.canteenPhase});return value;};
 });
 await page.waitForTimeout(1200);await page.screenshot({path:new URL('room.png',out).pathname});
 if(process.argv.includes('--actions')||process.argv.includes('--delivery')||process.argv.includes('--water')) {
   await page.evaluate(()=>{globalThis.__game.sim.yen=1000;});
   for(const a of (process.argv.includes('--water')?[{state:'water'}]:[{state:'select',item:'curry'},{state:'pay'},{state:'collect'},{state:'sit',seat:'canteen_seat_shared'},{state:'eat'},{state:'returnTray'},{state:'water'}].slice(0,process.argv.includes('--delivery')?3:7))) {
     await page.evaluate(a=>{const g=globalThis.__game;g.busy=true;globalThis.__canteenAction={done:false};
       g.place.hooks.canteenDining(a).then(()=>globalThis.__canteenAction.done=true).catch(e=>globalThis.__canteenAction.error=e.message).finally(()=>g.busy=false);},a);
     const captured=new Set(),until=Date.now()+65000;
     while(Date.now()<until){
       const phase=await page.evaluate(()=>({phase:globalThis.__game.place.canteenPhase,...globalThis.__canteenAction}));
       if(phase.error)throw Error(phase.error);
       if((phase.phase?.includes('contact')||phase.phase==='water-fill')&&!captured.has(phase.phase)){captured.add(phase.phase);await page.screenshot({path:new URL(a.state+'-'+phase.phase+'.png',out).pathname});}
       if(phase.done)break;
       await page.waitForTimeout(80);
     }
     if(!(await page.evaluate(()=>globalThis.__canteenAction.done)))throw Error('Action did not finish '+a.state);
     await page.waitForTimeout(600);await page.screenshot({path:new URL(a.state+'.png',out).pathname});
   }
 }
 const result=await page.evaluate(()=>{const g=globalThis.__game;return{player:{at:g.player.root.position.toArray(),yaw:g.player.root.rotation.y,scale:g.player.root.scale.x},trace:globalThis.__canteenTrace,contacts:g.place.canteenDining.hands.contacts,phase:g.place.canteenDining.state.phase(),seats:Object.keys(g.place.seats),people:Object.keys(g.place.people),things:Object.keys(g.place.things),nav:Object.fromEntries(Object.entries(g.place.things).filter(([,t])=>t.spot).map(([k,t])=>[k,g.place.nav.free(...t.spot())]))};});
 fs.writeFileSync(new URL('report.json',out),JSON.stringify({errors,result},null,2));
 if(errors.length)throw Error(errors.join('\n'));
 for(const c of result.contacts){
   if(c.kind==='point'){assert.ok(c.aimDot>.95,JSON.stringify(c));continue;}
   assert.ok((c.currentLipGap??c.lipGap??c.gap)<(c.lipGap!==undefined?.03:.08),JSON.stringify(c));
   if(c.headShift!==undefined)assert.ok(c.headShift<.02,'Mouth contact pulled the neutral head '+JSON.stringify(c));
 }
 for(const p of result.trace){
   for(const r of [{...COUNTER,w:COUNTER.w+.08,d:COUNTER.d+.08},SERVICE_END]){
     const gap=Math.hypot(Math.max(r.x-r.w/2-p.x,0,p.x-r.x-r.w/2),Math.max(r.z-r.d/2-p.z,0,p.z-r.z-r.d/2));
     assert.ok(gap>=p.r,'Staff capsule crossed actual service geometry '+JSON.stringify(p));
   }
   assert.ok(p.z-R.z0>=p.r,'Staff capsule crossed north wall '+JSON.stringify(p));
 }
 console.log('PASS',width,result.contacts.length,'measured contacts;',result.trace.length,'staff capsule samples');
 }finally{closing=true;await context.close();}
}, {timeout:180000});
