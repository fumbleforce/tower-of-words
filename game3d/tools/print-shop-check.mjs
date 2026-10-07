import assert from 'node:assert/strict';
import fs from 'node:fs';
import {scopedRoute} from '../../tools/bible/check-scope.mjs';
import {withBrowserJob} from '../../tools/lib/browser-job.mjs';
import {waitForGame} from '../test/support/wait-ready.mjs';
const width=+(process.argv[2]||1366),height=width<600?844:860,phone=width<600;
const base=process.env.BASE||'.claude/worktrees/codex-north-campus/game3d';
const out=new URL('../shots/north-campus/hands6/',import.meta.url).pathname;fs.mkdirSync(out,{recursive:true});
await withBrowserJob('print-shop-'+width,async browser=>{
 const context=await browser.newContext({viewport:{width,height},isMobile:phone,hasTouch:phone}),page=await context.newPage(),errors=[],checks=[];
 let closing=false;
 await context.route('**/*',scopedRoute({publicOnly:true,isClosing:()=>closing,onFailure:e=>errors.push(e)}));
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({privateMode:false,voiceOn:false,textSpeed:'instant'})));
 const tap=async locator=>phone?locator.tap():locator.click();
 const choosePrint=async()=>{const c=page.locator('#talk .chip').filter({hasText:'Print the island'});await c.waitFor({state:'visible'});await page.waitForTimeout(1000);await tap(c);await page.waitForFunction(()=>globalThis.__game.place.printService.state.phase==='press');};
 const shot=name=>page.screenshot({path:out+width+'-'+name+'.png'});
 async function use(id){
  await page.evaluate(async id=>{const g=globalThis.__game;await g.walkTo(...g.place.things[id].spot());},id);
  await page.waitForTimeout(500);
  const p=await page.evaluate(id=>{const m=globalThis.__game.markers.list.find(m=>m.id===id),r=m.el.querySelector('.pin').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};},id);
  if(phone)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);
  await page.waitForTimeout(200);const a=page.locator('#actMenu:not([hidden]) .use');if(await a.isVisible())await tap(a);
 }
 async function pages(){
  for(let i=0;i<3;i++){
   await page.waitForFunction(i=>globalThis.document.querySelector('#talk .line')?.textContent.includes(`ISLAND DIRECTORY · ${i+1}`),i);
   await page.waitForTimeout(350);await shot('directory-'+i);
   assert.equal(await page.locator('#talk .line').textContent().then(s=>s.includes('<br>')),false);
   const r=await page.locator('#talk .more').boundingBox();assert.ok(r);if(phone)await page.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);else await page.mouse.click(r.x+r.width/2,r.y+r.height/2);await page.waitForTimeout(300);
  }
  await page.waitForFunction(()=>!globalThis.__game.busy);
 }

 try{
  await waitForGame(page,60000,()=>page.goto(`http://127.0.0.1:8771/${base}/index.html?place=print_shop&mc=${phone?'carina':'eric'}&q=0`),'play');
  await page.waitForTimeout(800);await shot('room');
  await use('directory_printer');await choosePrint();
  await page.waitForFunction(()=>globalThis.__game.place.printService.state.phase==='pickup');
  await page.evaluate(()=>{const g=globalThis.__game;globalThis.__cancelTrip=g.travel('campus',{fast:true,via:'print_shop'});});
  await page.waitForFunction(()=>globalThis.__game.place.name==='campus'&&!globalThis.__game.busy);
  assert.equal(await page.evaluate(()=>globalThis.__game.sim.inv.includes('island_directory')),false);checks.push('actual place leave during pickup grants nothing');
  await page.evaluate(()=>globalThis.__game.travel('print_shop',{fast:true,via:'campus'}));await page.waitForFunction(()=>!globalThis.__game.busy);
  await use('directory_printer');
  await choosePrint();
  await page.waitForFunction(()=>globalThis.__game.place.printService.state.buttonContact!==null);await shot('button-contact');
  await page.waitForFunction(()=>globalThis.__game.place.printService.state.pickupContact!==null);await shot('pickup-contact');
  const contacts=await page.evaluate(()=>({...globalThis.__game.place.printService.state}));
  assert.ok(contacts.buttonContact<.08,JSON.stringify(contacts));assert.ok(contacts.pickupContact<.08,JSON.stringify(contacts));
  checks.push('actual button and paper edge contacts below .08m');console.log('CONTACT',contacts);fs.writeFileSync(out+width+'-contacts.json',JSON.stringify(contacts,null,2));await pages();
  assert.equal(await page.evaluate(()=>globalThis.__game.sim.inv.filter(i=>i==='island_directory').length),1);checks.push('native print grants exactly one directory');
  await tap(page.locator('#bagBtn'));await tap(page.locator('[data-read-item="island_directory"]'));await pages();checks.push('Bag reopens every page');
  await tap(page.locator('#bagPanel .close'));await use('print_seat');await page.waitForFunction(()=>globalThis.__game.player.seated&&!globalThis.__game.busy);await shot('seated');
  if(phone)await tap(page.locator('#qsaveBtn'));else await page.keyboard.press('F5');await page.waitForFunction(()=>/Quick saved/.test(globalThis.document.querySelector('#toast')?.textContent||''));
  await waitForGame(page,60000,()=>page.goto(`http://127.0.0.1:8771/${base}/index.html?q=0`),'title');await tap(page.locator('#title .mcont'));await waitForGame(page,60000,()=>tap(page.locator('.slot[data-id="quick"]')),'play');
  assert.ok(await page.evaluate(()=>globalThis.__game.player.seated&&globalThis.__game.sim.inv.includes('island_directory')));checks.push('Continue preserves chair and directory');await shot('continued');
  await page.evaluate(async()=>{const {setPeriod}=await import('./js/sim.js');setPeriod('evening',globalThis.__game);});await page.waitForTimeout(500);await shot('evening');
  await use('print_exit');await page.waitForFunction(()=>globalThis.__game.place.name==='campus'&&!globalThis.__game.busy);await shot('exit');checks.push('native exit returns to actual east door');
  assert.deepEqual(errors,[]);fs.writeFileSync(out+width+'-report.json',JSON.stringify({checks,errors},null,2));console.log('PASS',checks);
 }catch(e){await shot('failure');console.log(errors);throw e;}finally{closing=true;await context.close();}
},{timeoutMs:280000});
