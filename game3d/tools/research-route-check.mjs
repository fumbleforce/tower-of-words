import fs from 'node:fs';
import assert from 'node:assert/strict';
import {withBrowserJob} from '../../tools/lib/browser-job.mjs';
import {waitForGame} from '../test/support/wait-ready.mjs';
import {publicResearchContext,visibleResearchGoal} from '../test/support/research-integration-evidence.mjs';
const base=new URL((process.env.BASE||'game3d')+'/',`http://127.0.0.1:${process.env.PORT||8771}/`).href;
const width=+(process.argv[2]||1366),day=+(process.argv[3]||2),out=`/tmp/codex-research-route-${process.env.ROUND||'1'}`;fs.mkdirSync(out,{recursive:true});
await withBrowserJob('research-route',async browser=>{
 const errors=[],context=await publicResearchContext(browser,{width,height:width<700?844:860},errors),page=await context.newPage(),requests=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({v:2,textSpeed:'instant',voiceOn:false,privateMode:false})));
 const shot=async name=>page.screenshot({path:`${out}/${width}-${day}-${name}.png`});
 async function go(id,to){
  await page.evaluate(async id=>{const g=globalThis.__game,t=g.place.things[id];if(!t)throw Error('Unknown route target '+id+'; available: '+Object.keys(g.place.things).join(', '));g.busy=true;g.setHurry(true);await g.hooks.walk({who:'eric',to:t.spot()});g.busy=false;g.setHurry(false);g.use({id,...t});if(g.busy)g.setHurry(true);},id);
  await page.waitForFunction(to=>globalThis.__game.place.name===to&&!globalThis.__game.busy,to,{timeout:120000});checks.push({id,to});await shot(to+'-'+checks.length);
 }
 try{
  await waitForGame(page,60000,()=>page.goto(`${base}index.html?day=${day}&place=${process.env.HOME_ROUTE ? 'east_lane' : 'harbour'}`),'play');await page.waitForFunction(()=>!globalThis.__game.busy);
  if(process.env.HOME_ROUTE){ await go('north_street','sports'); await go('office_street','office_quarter'); await go('harbour','harbour'); }
  if(day>=6)await page.evaluate(()=>globalThis.__game.ui.goal(''));
  await go('works_street','works');
  if(day>=6){const ordinaryGoal=await page.evaluate(()=>globalThis.__game.ui.goalText);checks.push({ordinaryGoal,priorGoal:''});assert.equal(ordinaryGoal,'Check your repair requests, visit someone, or read the plaza noticeboard.','ordinary Works arrival still supplies its default');}
  if(process.env.GOAL)await page.evaluate(text=>globalThis.__game.ui.goal(text),process.env.GOAL);
  await page.evaluate(async()=>{const g=globalThis.__game;g.busy=true;g.setHurry(true);await g.hooks.walk({who:'eric',to:g.place.things.research_lab.spot()});g.busy=false;g.setHurry(false);});await page.waitForTimeout(450);await shot('research-door');
  const before=await page.evaluate(async()=>({goal:globalThis.__game.ui.goalText,entry:(await (await import('./js/travel/go.js')).travelStates(globalThis.__game)).research_lab}));
  assert.equal(before.entry.state,'go','map entry agrees with open door');
  await go('research_lab','research_lab');
  const inside=await page.evaluate(async()=>({goal:globalThis.__game.ui.goalText,exit:(await (await import('./js/travel/go.js')).travelStates(globalThis.__game)).works,copy:(await import('./js/narrative/state.js')).flags.found_research_mori_copy}));
  checks.push({before,inside});
  assert.equal(inside.exit.state,'go','map exit agrees with open door');assert.equal(inside.goal,before.goal,'optional room leaves main objective intact');assert.ok(!inside.copy);
  await go('research_exit','works');
  const returned=await page.evaluate(()=>({goal:globalThis.__game.ui.goalText,runner:globalThis.__game.runner.running}));
  assert.equal(returned.goal,before.goal,'return restores same main objective');checks.push({returned,visibleGoal:before.goal?await visibleResearchGoal(page,before.goal):null});
  await go(process.env.EXIT||'harbour_lane','harbour');
  if(process.env.HOME_ROUTE){ await go('office_street','office_quarter'); await go('sports_lane','sports'); await go('north_street','east_lane'); }
  assert.deepEqual(errors,[]);
 }catch(e){checks.push({failure:e.message});await shot('failure');throw e;}
 finally{fs.writeFileSync(`${out}/${width}-${day}-report.json`,JSON.stringify({checks,errors,requests},null,2));await context.close();}
},{gpuWaitMs: Number(process.env.GPU_WAIT || 1800) * 1000, timeoutMs:295000});
