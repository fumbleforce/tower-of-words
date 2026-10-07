import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const width=+(process.argv[2]||1366),mc=process.argv[3]||'eric',out=`game3d/shots/codex-konbini/${process.env.ROUND||'initial'}`;
fs.mkdirSync(out,{recursive:true});
await withBrowserJob('konbini-stage',async browser=>{
 const page=await browser.newPage({viewport:{width,height:width<700?844:860},isMobile:width<700,hasTouch:width<700});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({textSpeed:'instant',voiceOn:false,privateMode:false})));
 try{
 await waitForGame(page,60000,()=>page.goto(`http://127.0.0.1:8794/game3d/index.html?day=3&place=shotengai&mc=${mc}`),'play');
 await page.waitForFunction(()=>!globalThis.__game.busy&&!globalThis.document.querySelector('#boot:not(.gone)'));
 await page.evaluate(async()=>{const g=globalThis.__game;await g.walkTo(...g.place.things.store_door.spot());g.hooks.trip({to:'konbini'});const after=g.after;g.after=null;await after();});
 await page.waitForFunction(()=>globalThis.__game.place.name==='konbini'&&!globalThis.__game.busy);
 await page.screenshot({path:`${out}/${width}-${mc}-arrival.png`});
 for(const [state,item] of [['add','milk'],['add','riceball'],['pay'],['bag'],['take'],['prepareConsume',process.env.FOOD||'riceball'],['consume']]){
  const job=page.evaluate(async({state,item})=>globalThis.__game.place.hooks.konbiniShop({state,item}),{state,item});
  if(state==='consume')await page.waitForFunction(()=>/konbini-open(Rice|Milk)-place/.test(globalThis.__game.place.konbini.contacts.at(-1)?.action||''));else await page.waitForTimeout(800);await page.screenshot({path:`${out}/${width}-${mc}-${state}-motion.png`});await Promise.race([job,new Promise((_,reject)=>setTimeout(()=>reject(Error('Action timed out '+state)),25000))]);await page.waitForTimeout(700);
  await page.screenshot({path:`${out}/${width}-${mc}-${state}.png`});
 }
 const report=await page.evaluate(async()=>{const g=globalThis.__game,{flags}=await import('./js/narrative/state.js');return{contacts:g.place.konbini.contacts,flags:Object.fromEntries(Object.entries(flags).filter(([k])=>k.startsWith('konbini_'))),inv:g.sim.inv,yen:g.sim.yen};});
 fs.writeFileSync(`${out}/${width}-${mc}.json`,JSON.stringify({report,errors},null,2));assert.deepEqual(errors,[]);console.log('PASS',JSON.stringify(report));
 }catch(error){await page.screenshot({path:`${out}/${width}-${mc}-failure.png`});console.error(errors);console.error(await page.evaluate(()=>({pos:globalThis.__game.player.root.position.toArray(),path:globalThis.__game.walker.path,busy:globalThis.__game.busy,last:globalThis.__game.runner.lastStep})));throw error;}finally{await page.close();}
},{timeoutMs:170000,gpuWaitMs:180000});
