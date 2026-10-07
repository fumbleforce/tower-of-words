import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const width=+(process.argv[2]||1366), mc=process.argv[3]||'eric';
const out=`/tmp/codex-sender-stage-${process.env.ROUND||'1'}`;
fs.mkdirSync(out,{recursive:true});
await withBrowserJob('sender-stage',async browser=>{
 const context=await browser.newContext({viewport:{width,height:width<700?844:860}});
 const page=await context.newPage(), errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({textSpeed:'instant',voiceOn:false,privateMode:false}));});
 try{
  await waitForGame(page,60000,()=>page.goto(`http://127.0.0.1:8786/game3d/index.html?day=2&place=office&mc=${mc}`),'play');
  await page.waitForFunction(()=>globalThis.__game?.place?.name==='office'&&!globalThis.__game.busy);
  await page.waitForTimeout(800);
  await page.screenshot({path:`${out}/${width}-${mc}-before.png`});
  await page.evaluate(async()=>{const g=globalThis.__game,{flags}=await import('./js/narrative/state.js');flags.d2_ticket_done=true;g.place.hooks.officeDay2({state:'arrive'});g.setHurry(true);});
  for(const action of (process.env.ACTIONS?.split(',')||['desk','screen','door','wake','mori','point','moriHome','mio','note'])){
   const motion=page.evaluate(async action=>{
    const g=globalThis.__game,s=g.place.sender;
    g.busy=true;
    const success=await s.stage.act({action});
    return {action,success,player:g.player.root.position.toArray(),mio:g.mioNpc.root.position.toArray(),mori:g.place.people.mori.root.position.toArray(),camera:g.place.space.worldToLocal(g.place.camera.position.clone()).toArray(),contacts:s.stage.contacts};
   },action);
   if(['screen','wake','note'].includes(action)){
    await page.waitForFunction(()=>globalThis.__game.place.sender.stage.phase);
    await page.evaluate(()=>globalThis.__game.setHurry(false));
    await page.screenshot({path:`${out}/${width}-${mc}-${action}-contact.png`});
   }
   const result=await motion;
   await page.evaluate(()=>globalThis.__game.setHurry(true));
   console.log(JSON.stringify(result));
   await page.waitForTimeout(300);
   await page.screenshot({path:`${out}/${width}-${mc}-${action}.png`});
   fs.writeFileSync(`${out}/${width}-${mc}-${action}.json`,JSON.stringify(result,null,2));
  }
 }finally{fs.writeFileSync(`${out}/${width}-${mc}-errors.json`,JSON.stringify(errors,null,2));await context.close();}
},{timeoutMs:280000,gpuWaitMs:180000});
