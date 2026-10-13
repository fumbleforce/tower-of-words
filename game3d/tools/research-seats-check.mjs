import { publicResearchContextOptions } from '../test/support/research-integration-evidence.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {withBrowserJob} from '../../tools/lib/browser-job.mjs';
import {waitForGame} from '../test/support/wait-ready.mjs';
const base=new URL((process.env.BASE||'game3d')+'/',`http://127.0.0.1:${process.env.PORT||8771}/`).href,out=`/tmp/codex-research-seats-${process.env.ROUND||'1'}`;fs.mkdirSync(out,{recursive:true});
await withBrowserJob('research-seats',async browser=>{
 for(const [width,mc]of [[1366,'eric'],[390,'carina']]){
  const context=await publicResearchContextOptions(browser,{viewport:{width,height:width<700?844:860}}),page=await context.newPage(),checks=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({v:2,textSpeed:'instant',voiceOn:false,privateMode:false})));
  try{
   await waitForGame(page,60000,()=>page.goto(`${base}index.html?day=2&place=research_lab&mc=${mc}`),'play');await page.waitForFunction(()=>!globalThis.__game.busy);
   for(const id of ['research_table_seat','research_window_seat','research_side_seat','research_end_seat']){
    await page.evaluate(id=>{const g=globalThis.__game;g.use({id,...g.place.things[id]});},id);
    await page.waitForFunction(id=>{const g=globalThis.__game,s=g.place.seats[id],p=g.player.root.position;return !g.busy&&g.player.seated&&Math.hypot(p.x-s.x,p.z-s.z)<.01;},id,{timeout:90000});
    await page.waitForTimeout(700);
    const measurement=await page.evaluate(async()=>{const g=globalThis.__game,p=g.place,{researchSeatContact}=await import('./test/support/research-seat-contact.mjs');return{player:researchSeatContact(p,g.player,[g.player,...Object.values(p.people)]),reader:researchSeatContact(p,p.people.research_reader,[g.player,...Object.values(p.people)])};});
    checks.push({id,...measurement});await page.screenshot({path:`${out}/${width}-${id}.png`});
    await page.evaluate(()=>{const g=globalThis.__game,p=g.player.root.position;g.busy=true;g.place.research.camera.focus([p.x,p.z],{distance:1.9,height:.42,yaw:Math.atan2(-p.x,-p.z),elev:.12});});
    await page.waitForTimeout(150);await page.screenshot({path:`${out}/${width}-${id}-side.png`});
    await page.evaluate(()=>{const g=globalThis.__game;g.place.research.camera.release();g.place.cam.snap(g.player.root.position);g.busy=false;});
    for(const who of ['player','reader'])assert.ok(measurement[who].gap>=-.012&&measurement[who].gap<=.001,`${mc} ${id} ${who} actual cushion contact ${measurement[who].gap}`);
   }
   assert.deepEqual(errors,[]);
  }catch(error){checks.push({failure:error.stack});await page.screenshot({path:`${out}/${width}-failure.png`});throw error;}
  finally{fs.writeFileSync(`${out}/${width}-report.json`,JSON.stringify({checks,errors},null,2));await context.close();}
 }
},{gpuWaitMs: Number(process.env.GPU_WAIT || 1800) * 1000, timeoutMs:240000});
