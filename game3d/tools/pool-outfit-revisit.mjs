import assert from 'node:assert/strict';
import fs from 'node:fs';
import {withBrowserJob} from '../../tools/lib/browser-job.mjs';
import {blockedSource} from '../../tools/bible/check-scope.mjs';
const base=`http://127.0.0.1:8771/${process.env.BASE||'game3d'}/`,out=process.env.OUT||'game3d/shots/pool-outfits/revisit';fs.mkdirSync(out,{recursive:true});
const reports=[];
await withBrowserJob('pool-outfit-revisit',async browser=>{
 for(const [width,height,mc] of [[1366,860,'eric'],[390,844,'carina']]){
  const context=await browser.newContext({viewport:{width,height}}),errors=[];
  await context.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({privateMode:false,voiceOn:false})));
  await context.route('**/*',r=>blockedSource(r.request().url(),true)?r.abort():r.continue());
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}?day=3&place=pool&q=1&mc=${mc}`);
  await page.waitForFunction(()=>globalThis.__game?.place?.name==='pool'&&!globalThis.__game.busy,null,{timeout:90000});
  await page.evaluate(async()=>{
   const g=globalThis.__game,{setPeriod}=await import('./js/sim.js');g.setHurry(true);setPeriod('evening',g);await g.place.day3({});
   globalThis.__ordinary={root:g.player.root,model:g.player.model,update:g.player.update};globalThis.__cachedPool=g.place;
   await g.place.hooks.poolSession({state:'enter'});globalThis.__swimBody=g.player.model;
   await g.travel('sports',{fast:true});
  });
  const outside=await page.evaluate(()=>{const g=globalThis.__game,o=globalThis.__ordinary;return{place:g.place.name,root:g.player.root===o.root,model:g.player.model===o.model,update:g.player.update===o.update,swimming:!!g.player.swimming};});
  assert.deepEqual(outside,{place:'sports',root:true,model:true,update:true,swimming:false});
  await page.screenshot({path:`${out}/${width}-${mc}-outside.png`});
  await page.evaluate(async()=>{const g=globalThis.__game;await g.travel('pool',{fast:true});await g.place.hooks.poolSession({state:'enter'});g.setHurry(false);});
  await page.waitForTimeout(350);
  const returned=await page.evaluate(()=>{const g=globalThis.__game;return{samePlace:g.place===globalThis.__cachedPool,sameBody:g.player.model===globalThis.__swimBody,outfits:g.place.snapshotState().swim.outfits,actors:[g.player,g.place.people.emi,g.place.people.kuro].map(r=>({id:r.id,running:r.mixer._actions.some(a=>a.isRunning()),state:r.state,swimming:!!r.swimming}))};});
  assert.ok(returned.samePlace&&returned.sameBody);assert.deepEqual(returned.outfits,{eric:true,emi:true,kuro:true});assert.ok(returned.actors.every(r=>r.running));
  await page.screenshot({path:`${out}/${width}-${mc}-returned.png`});
  assert.deepEqual(errors,[]);reports.push({width,mc,outside,returned,errors});await context.close();fs.writeFileSync(`${out}/report.json`,JSON.stringify(reports,null,2));
 }
},{timeoutMs:260000});console.log('PASS actual pool→sports→cached pool travel retains ordinary body outside and live outfit animations on return');
