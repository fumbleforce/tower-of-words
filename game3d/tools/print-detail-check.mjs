import assert from 'node:assert/strict';
import fs from 'node:fs';
import {withBrowserJob} from '../../tools/lib/browser-job.mjs';
import {scopedRoute} from '../../tools/bible/check-scope.mjs';
import {waitForGame} from '../test/support/wait-ready.mjs';
const width=+(process.argv[2]||1366),phone=width<600,height=phone?844:860;
const out=new URL('../shots/north-campus/detail-walk2/',import.meta.url).pathname;fs.mkdirSync(out,{recursive:true});
await withBrowserJob('print-detail-'+width,async browser=>{
 const ctx=await browser.newContext({viewport:{width,height},hasTouch:phone,isMobile:phone}),page=await ctx.newPage(),errors=[];let closing=false;
 await ctx.route('**/*',scopedRoute({publicOnly:true,isClosing:()=>closing,onFailure:e=>errors.push(e)}));page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({privateMode:false,voiceOn:false,textSpeed:'instant'})));

 try{
  await waitForGame(page,60000,()=>page.goto(`http://127.0.0.1:8771/.claude/worktrees/codex-north-campus/game3d/index.html?place=print_shop&mc=${phone?'carina':'eric'}`),'play');
  await page.evaluate(async()=>{const {startMoveCheck}=await import('./js/movement/checks.js');startMoveCheck(globalThis.__game);});
  for(const id of ['proof','press','directory']){
   await page.evaluate(async id=>{const g=globalThis.__game;await g.walkTo(...g.place.spots[id]);},id);await page.waitForTimeout(1200);
   await page.screenshot({path:out+width+'-'+id+'.png'});
  }
  await page.evaluate(async()=>{const {setPeriod}=await import('./js/sim.js');setPeriod('evening',globalThis.__game);});await page.waitForTimeout(800);await page.screenshot({path:out+width+'-evening.png'});
  const motion=await page.evaluate(()=>globalThis.__moveCheck);assert.deepEqual(motion.overlaps,[]);assert.deepEqual(motion.spins,[]);assert.deepEqual(errors,[]);fs.writeFileSync(out+width+'-report.json',JSON.stringify({errors,motion},null,2));console.log('PASS');
 }finally{closing=true;await ctx.close();}
},{timeoutMs:150000});
