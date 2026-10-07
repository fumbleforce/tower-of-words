// Actual marker/choice input, receipt checkpoints and title Continue; public-only isolated storage.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
const width=+(process.argv[2]||1366),phone=width<700,mc=phone?'carina':'eric';
const base=process.env.BASE||'.claude/worktrees/codex-canteen-meals/game3d';
const url=`http://127.0.0.1:8771/${base}/index.html`;
const out=new URL(`../shots/canteen-meals/${process.env.ROUND||'native1'}-${width}/`,import.meta.url);fs.mkdirSync(out,{recursive:true});
await withBrowserJob('canteen-native-'+width,async browser=>{
 const context=await browser.newContext({viewport:{width,height:phone?844:860},isMobile:phone,hasTouch:phone}),page=await context.newPage();
 const errors=[],checks=[];const push=checks.push.bind(checks);checks.push=(...rows)=>{for(const r of rows)console.log(r.case||r.failure);return push(...rows);};let closing=false;
 await context.route('**/*',scopedRoute({publicOnly:true,isClosing:()=>closing,onFailure:s=>errors.push(s)}));
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({privateMode:false,voiceOn:false,textSpeed:'instant'})));
 const shot=name=>page.screenshot({path:new URL(name+'.png',out).pathname});
 const ready=()=>page.waitForFunction(()=>globalThis.__game?.place&&!globalThis.__game.busy&&!globalThis.__game.walker.path,null,{timeout:45000});
 const state=()=>page.evaluate(async()=>{const g=globalThis.__game,{flags}=await import('./js/narrative/state.js');return{place:g.place.name,yen:g.sim.yen,seated:g.player.seated,at:g.player.root.position.toArray(),flags:Object.fromEntries(Object.entries(flags).filter(([k])=>k.startsWith('canteen_'))),frames:g.runner.snapshot(),contacts:g.place.canteenDining?.hands.contacts};});
 async function use(id){
   await ready();await page.evaluate(async id=>{const g=globalThis.__game;await g.walkTo(...g.place.things[id].spot());},id);await page.waitForTimeout(400);
   const p=await page.evaluate(id=>{const m=globalThis.__game.markers.list.find(m=>m.id===id),r=m?.el.querySelector('.pin')?.getBoundingClientRect();if(!r?.width)throw Error('Missing marker '+id);const x=r.x+r.width/2,y=r.y+r.height/2;if(x<0||x>globalThis.innerWidth||y<0||y>globalThis.innerHeight)throw Error('Offscreen marker '+id);return[x,y];},id);
   if(phone)await page.touchscreen.tap(...p);else await page.mouse.click(...p);
   await page.waitForTimeout(120);const action=page.locator('#actMenu:not([hidden]) .use');if(await action.isVisible())await action.click();
 }
 async function finish(prefer=[],stop=''){
   const until=Date.now()+80000;const captured=new Set();
   while(Date.now()<until){
     const s=await page.evaluate(()=>({phase:globalThis.__game.place.canteenPhase,busy:globalThis.__game.busy,paused:globalThis.__canteenCheckpoint,choices:[...globalThis.document.querySelectorAll('#talk:not([hidden]) .chips button')].map(b=>b.textContent),more:!!globalThis.document.querySelector('#talk:not([hidden]) .more:not([hidden])')}));
     if(s.phase&&/contact|point/.test(s.phase)&&!captured.has(s.phase)){captured.add(s.phase);await shot('action-'+s.phase);}
     if(s.paused||!s.busy)return;
     if(s.choices.length){if(stop&&s.choices.some(c=>c.includes(stop)))return;const i=s.choices.findIndex(c=>prefer.some(p=>c.includes(p)));if(i<0)throw Error('Unexpected choice '+JSON.stringify(s.choices));await page.waitForTimeout(950);await page.locator('#talk .chips button').nth(i).click();}
     else if(s.more)await page.locator('#talkHit').click();
     await page.waitForTimeout(100);
   }
   throw Error('Scene did not reach requested boundary');
 }
 const pick=async text=>{const b=page.locator('#talk:not([hidden]) .chips button').filter({hasText:text}).first();await b.waitFor({state:'visible'});await page.waitForTimeout(950);await b.click();await page.waitForTimeout(250);};
 async function pauseAfter(step){await page.evaluate(step=>{const g=globalThis.__game,act=g.place.hooks.canteenDining;g.place.hooks.canteenDining=async function(a){const result=await act(a);if(a.state===step){globalThis.__canteenCheckpoint=step;await new Promise(()=>{});}return result;};},step);}
 async function resume(){await page.goto(url+'?q=0');await page.locator('#title .mcont').click();await page.locator('#saves button.slot').filter({hasText:'Autosave'}).click();await page.waitForFunction(()=>globalThis.__game?.place?.name==='canteen',null,{timeout:45000});await page.waitForTimeout(500);}
 try{
   await page.goto(url+`?day=3&place=plaza&q=0&mc=${mc}`);await ready();await page.waitForTimeout(600);
   await use('canteen_door');await page.waitForFunction(()=>globalThis.__game.place.name==='canteen'&&!globalThis.__game.busy,null,{timeout:30000});
   await page.evaluate(async()=>{const g=globalThis.__game;g.sim.yen=1000;await g.hooks.period({to:'lunch'});});
   await page.evaluate(async()=>{const d=globalThis.__game.place.canteenDining;let failed=false;try{await d.act({state:'unknown-regression-step'});}catch(e){failed=/Unknown canteen diner action/.test(e.message);}if(!failed||d.active)throw Error('Thrown dining action retained ownership');if(!await d.act({state:'sync'})||d.active)throw Error('Dining action did not recover');});checks.push({case:'thrown owned action releases active state and recovers'});await shot('arrival');checks.push({case:'native door entry',state:await state()});
   if(process.argv.includes('--diners')) {
     await page.evaluate(async()=>{const {known}=await import('./js/lang.js');known.delete('oishii');});
     for(const [id,topic,leave] of [['shirt','Ask about his break.','Leave him to his meal.'],['cardigan','Ask about her lunch container.','Let her eat.'],['polo',null,'Leave him to his drink.']].filter(row=>!process.env.DINER||row[0]===process.env.DINER)) {
       for(let attempt=0;attempt<3;attempt++) {await use('canteen_'+id);await finish([],topic||leave);if(await page.locator('#talk:not([hidden]) .chips button').count())break;await page.waitForTimeout(2200);}
       await shot(id+'-talk');
       assert.equal(await page.evaluate(id=>globalThis.__game.place.people['canteen_'+id].seated,id),true);
       if(id==='cardigan')assert.equal(await page.locator('#talk .chips button').filter({hasText:'vegetables she recommended'}).count(),0);
       await pick(topic||leave);await finish([leave,'Leave her to her meal.']);await ready();
       const measured=await state();for(const c of measured.contacts){if(c.kind==='point')assert.ok(c.aimDot>.95,JSON.stringify(c));else assert.ok(c.gap<.08,JSON.stringify(c));}
       checks.push({case:id+' first topic and physical activity',state:measured});
     }
     if(process.env.DINER&&process.env.DINER!=='cardigan'){assert.deepEqual(errors,[]);console.log('PASS diner',process.env.DINER,width);return;}
     await page.evaluate(async()=>{const {known}=await import('./js/lang.js'),{save}=await import('./js/sim.js');known.add('oishii');save(globalThis.__game);});
     await resume();await finish();await ready();
     for(let attempt=0;attempt<3;attempt++){await use('canteen_cardigan');await finish([],'vegetables she recommended');if(await page.locator('#talk:not([hidden]) .chips button').count())break;await page.waitForTimeout(2200);}
     await shot('remembered-dish-choice');await pick('vegetables she recommended');await finish([],'Order the vegetable');await shot('remembered-dish-reply');await pick('Leave her to her meal.');await finish();await ready();
     checks.push({case:'previously heard dish recommendation unlocked after later knowledge and Continue',state:await state()});
     assert.deepEqual(errors,[]);console.log('PASS diners',width);return;
   }
   await use('canteen_worker');await finish([],'Order lunch.');await pick('Order lunch.');await finish([],'Curry rice.');await pick('Curry rice.');await finish([],'Pay the price');
   assert.equal((await state()).yen,1000);await shot('price-confirmation');if(process.argv.includes('--price-only')){console.log('PASS price capture');return;}
   await pauseAfter('pay');await pick('Pay the price');await finish();assert.equal((await state()).yen,580);checks.push({case:'physical payment checkpoint',state:await state()});
   if(process.argv.includes('--recovery')) {
     // Period-change fixture starts from the real paid checkpoint; it changes only the date/period.
     await page.evaluate(()=>{const key='amakawa-day1-save',s=JSON.parse(globalThis.localStorage.getItem(key));
       if(s.flags.canteen_meal_phase!=='paid')throw Error('Not a real paid checkpoint');
       s.period='evening';for(const p of ['early','morning','lunch','afternoon','evening'])s.flags['period_'+p]=p==='evening';
       globalThis.localStorage.setItem(key,JSON.stringify(s));});
     await resume();await finish();await ready();
     let s=await state();assert.equal(s.yen,580);assert.equal(s.flags.canteen_meal_phase,'paid');
     assert.notEqual(s.flags.canteen_delivered_id,s.flags.canteen_order_id);
     assert.equal(await page.evaluate(()=>globalThis.__game.place.people.canteen_worker.root.visible),false);
     checks.push({case:'paid checkpoint continued in evening: no hidden staff delivery or debit',state:s});await shot('evening-pending');
     await page.evaluate(async()=>{const g=globalThis.__game,{save}=await import('./js/sim.js');save(g);
       const key='amakawa-day1-save',s=JSON.parse(globalThis.localStorage.getItem(key));s.day++;s.period='lunch';
       for(const p of ['early','morning','lunch','afternoon','evening'])s.flags['period_'+p]=p==='lunch';
       globalThis.localStorage.setItem(key,JSON.stringify(s));});
     await resume();await finish();await ready();await use('canteen_collection');await finish([],'Keep carrying');await pick('Keep carrying');await finish();await ready();
     s=await state();assert.equal(s.yen,580);assert.equal(s.flags.canteen_meal_phase,'carried');assert.equal(s.flags.canteen_delivered_id,s.flags.canteen_order_id);
     checks.push({case:'next lunch: real staff delivery of preserved receipt',state:s});await shot('next-lunch-delivered');
     await use('canteen_water');await finish();await ready();s=await state();assert.equal(s.flags.canteen_meal_phase,'parked');assert.equal(s.yen,580);
     checks.push({case:'carried tray physically parked before cup fill/sip',state:s});await shot('water-tray-parked');
     await use('canteen_collection');await finish([],'Keep carrying');await pick('Keep carrying');await finish();await ready();
     assert.equal((await state()).flags.canteen_meal_phase,'carried');
     await use('canteen_exit');await page.waitForFunction(()=>globalThis.__game.place.name==='plaza'&&!globalThis.__game.busy,null,{timeout:45000});
     assert.equal((await state()).flags.canteen_meal_phase,'parked');checks.push({case:'ordinary doorway exit parks carried tray',state:await state()});
     await use('canteen_door');await page.waitForFunction(()=>globalThis.__game.place.name==='canteen'&&!globalThis.__game.busy,null,{timeout:30000});
     await use('canteen_collection');await finish([],'Keep carrying');await pick('Keep carrying');await finish();await ready();
     assert.equal((await state()).flags.canteen_meal_phase,'carried');assert.equal((await state()).yen,580);await shot('parked-return-collected');
     checks.push({case:'return visit collects parked tray without a second charge',state:await state()});assert.deepEqual(errors,[]);console.log('PASS recovery',width,checks.map(c=>c.case));return;
   }
   await resume();await finish([],'Sit beside');assert.equal((await state()).yen,580);assert.equal((await state()).flags.canteen_meal_phase,'carried');await shot('paid-continue');
   await pick('Sit beside');await finish([],'Eat my meal.');assert.ok((await state()).seated);await shot('shared-table');
   await pauseAfter('eat');await pick('Eat my meal.');await finish();assert.equal((await state()).flags.canteen_meal_phase,'eaten');checks.push({case:'completed bites checkpoint',state:await state()});
   await resume();await finish([],'Finish eating.');await pick('Finish eating.');await finish([],'Return my tray.');assert.equal((await state()).yen,580);assert.equal((await state()).flags.canteen_meal_phase,'eaten');assert.ok((await state()).seated);await shot('meal-continue');
   await pick('Return my tray.');await finish();await ready();assert.equal((await state()).flags.canteen_meal_phase,'returned');checks.push({case:'meal returned once',state:await state()});
   await use('canteen_water');await finish();await ready();assert.equal((await state()).yen,580);await shot('water');
   await use('canteen_exit');await page.waitForFunction(()=>globalThis.__game.place.name==='plaza'&&!globalThis.__game.busy,null,{timeout:30000});checks.push({case:'native return through facade',state:await state()});await shot('outside');
   assert.deepEqual(errors,[]);console.log('PASS',width,checks.map(c=>c.case));
 }catch(e){await shot('failure');checks.push({failure:String(e),state:await state().catch(()=>null)});throw e;}
 finally{fs.writeFileSync(new URL('report.json',out),JSON.stringify({checks,errors},null,2));closing=true;await context.close();}
},{timeoutMs:280000});
