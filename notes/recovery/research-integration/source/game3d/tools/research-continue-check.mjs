import fs from 'node:fs';
import { publicResearchContext, visibleResearchGoal } from '../test/support/research-integration-evidence.mjs';
import assert from 'node:assert/strict';
import {withBrowserJob} from '../../tools/lib/browser-job.mjs';
import {waitForGame} from '../test/support/wait-ready.mjs';
const width=+(process.argv[2]||390),mc=width<700?'carina':'eric',base=new URL((process.env.BASE||'game3d')+'/',`http://127.0.0.1:${process.env.PORT||8771}/`).href;
const out=`/tmp/codex-research-continue-${process.env.ROUND||'1'}`;fs.mkdirSync(out,{recursive:true});
await withBrowserJob('research-continue',async browser=>{
 const errors=[],requests=[],checks=[];
 const context=await publicResearchContext(browser,{width,height:width<700?844:860},errors),page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>requests.push(r.url()));
 await page.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({v:2,textSpeed:'instant',voiceOn:false,privateMode:false})));
 const shot=async id=>page.screenshot({path:`${out}/${width}-${id}.png`});
 const idle=()=>page.waitForFunction(()=>!globalThis.__game.busy,null,{timeout:90000});
 const snapshot=()=>page.evaluate(async()=>{const g=globalThis.__game,p=g.place;return{goal:(await import('./js/ui.js')).ui.goalText,state:p.research.state.read(),player:{position:g.player.root.position.toArray(),seated:g.player.seated,out:g.player.seatOut},books:p.space.getObjectsByProperty('type','Group').filter(o=>o.name.startsWith('research-book:')).map(o=>({name:o.name,parent:o.parent===p.space?'room':'carried',position:o.position.toArray()}))};});
 async function quickContinue(){
  if(width<700)await page.locator('#qsaveBtn').click();else await page.keyboard.press('F5');await page.waitForTimeout(350);await page.goto(`${base}index.html`);
  await page.locator('#title .mcont').click();await page.locator('.slot[data-id="quick"]').click();
  await page.waitForFunction(()=>globalThis.__game?.place?.name==='research_lab'&&!globalThis.document.body.classList.contains('at-title'),null,{timeout:90000});
 }
 async function choose(text){
  await page.evaluate(async text=>{const g=globalThis.__game,{ui}=await import('./js/ui.js');ui.auto=true;ui.autoPick=()=>{const choices=g.runner.lastStep.choice;const i=choices.findIndex(o=>o.text===text);if(i<0)throw Error('Missing reference choice '+text);return i;};g.use({id:'research_books',...g.place.things.research_books});},text);
 }
 try{
  await waitForGame(page,60000,()=>page.goto(`${base}index.html?day=${process.env.DAY||2}&place=research_lab&mc=${mc}`),'play');await idle();
  await page.evaluate(async()=>{(await import('./js/ui.js')).ui.goal('Check the train doors at the station first.');});
  await choose('Weather instruments · reading table');await page.getByRole('button',{name:'Next page',exact:true}).click({timeout:90000});
  await page.getByRole('button',{name:'Mark this page',exact:true}).click();await page.getByRole('button',{name:'Save this reference',exact:true}).click();
  await page.getByRole('button',{name:'Close book view',exact:true}).click();await idle();
  const before=await snapshot();checks.push({goalBefore:await visibleResearchGoal(page,before.goal)});await shot('seated-before');await quickContinue();await idle();const after=await snapshot();checks.push({goalAfter:await visibleResearchGoal(page,before.goal)});
  assert.deepEqual(after,before,'public Continue preserves the exact book/page/bookmark and seated placement');checks.push({case:'seated',before,after});await shot('seated-continued');
  await page.evaluate(()=>{
   globalThis.__researchCarry=[];globalThis.__researchSampler=setInterval(()=>{const g=globalThis.__game,p=g.place,b=p.space.getObjectByName('research-book:copier');if(b&&b.parent!==p.space){const v=g.player.root.position.clone();globalThis.__researchCarry.push({time:performance.now(),book:b.getWorldPosition(v).toArray(),grip:b.position.toArray(),player:g.player.root.position.toArray()});}},30);
  });
  await choose('Copier · window chair');
  for(let i=0;i<450;i++){if(errors.length)throw Error(errors[0]);const carried=await page.evaluate(()=>{const g=globalThis.__game,b=g.place.space.getObjectByName('research-book:copier');return b&&b.parent!==g.place.space&&Math.hypot(g.player.root.position.x-g.place.spots.research_shelf[0],g.player.root.position.z+.22)>1;});if(carried)break;if(i===449)throw Error('Prepared book carry timed out');await page.waitForTimeout(200);}
  const carrying=await snapshot(),motion=await page.evaluate(()=>{clearInterval(globalThis.__researchSampler);return globalThis.__researchCarry;});
  assert.ok(motion.length>3);assert.ok(Math.hypot(...motion.at(-1).book.map((v,i)=>v-motion[0].book[i]))>.5,'actual carried volume travels with the hand');
  for(const frame of motion)assert.deepEqual(frame.grip,motion[0].grip,'physical hand attachment stays fixed during carry');
  await shot('carrying-before');
  checks.push({contactsBeforeCarrySave:await page.evaluate(()=>globalThis.__game.place.research.hands.contacts)});
  if(process.env.DETAIL==='1'){
   await page.evaluate(()=>{globalThis.__game.paused=true;});
   for(const [label,yaw]of[['front',-.7],['side',1.4]]){
    await page.evaluate(yaw=>{const g=globalThis.__game,p=g.place,v=g.player.root.position;p.research.camera.focus([v.x,v.z],{distance:1.25,height:.38,yaw,elev:.35});},yaw);
    await page.waitForTimeout(100);await shot('carrying-detail-'+label);
   }
   await page.evaluate(()=>{const g=globalThis.__game;g.place.research.camera.release();g.place.cam.snap(g.player.root.position);g.paused=false;});
  }
  await quickContinue();
  await page.getByRole('button',{name:'Close book view',exact:true}).click({timeout:90000});await idle();
  const restored=await snapshot();assert.equal(restored.state.active.book,'copier');assert.equal(restored.state.active.seat,'research_window_seat');assert.equal(restored.state.marks.weather,1);
  assert.deepEqual(restored.books.map(b=>b.name).sort(),['research-book:copier','research-book:weather']);assert.ok(restored.books.every(b=>b.parent==='room'));
  checks.push({case:'prepared-carry',carrying,motion,restored,visibleGoal:await visibleResearchGoal(page,before.goal)});await shot('carried-continued');assert.deepEqual(errors,[]);
 }catch(error){checks.push({failure:error.stack,contacts:await page.evaluate(()=>globalThis.__game?.place?.research?.hands.contacts)});await shot('failure');throw error;}
 finally{fs.writeFileSync(`${out}/${width}-report.json`,JSON.stringify({checks,errors,requests},null,2));await context.close();}
},{timeoutMs:360000,gpuWaitMs:1200000});
