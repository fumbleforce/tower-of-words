import fs from 'node:fs';
import {scopedRoute} from '../../tools/bible/check-scope.mjs';
import {withBrowserJob} from '../../tools/lib/browser-job.mjs';
import {waitForGame} from '../test/support/wait-ready.mjs';
const width=+(process.argv[2]||1366),height=width<600?844:860;
const base=process.env.BASE||'.claude/worktrees/codex-north-campus/game3d';
const out=new URL('../shots/north-campus/draft3/',import.meta.url).pathname;fs.mkdirSync(out,{recursive:true});
await withBrowserJob('campus-initial-'+width,async browser=>{
 const context=await browser.newContext({viewport:{width,height},isMobile:width<600,hasTouch:width<600}),page=await context.newPage(),errors=[];
 let closing=false;
 await context.route('**/*',scopedRoute({publicOnly:true,isClosing:()=>closing,onFailure:e=>errors.push(e)}));
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({privateMode:false,voiceOn:false,textSpeed:'instant'})));

 try{
  await waitForGame(page,60000,()=>page.goto(`http://127.0.0.1:8771/${base}/index.html?place=campus&q=0`),'play');
  await page.waitForTimeout(1000);await page.screenshot({path:out+width+'-arrival.png'});
  for(const id of ['print_shop','campus_bench']){
   await page.evaluate(async id=>{const g=globalThis.__game;await g.walkTo(...g.place.things[id].spot());},id);
   await page.waitForTimeout(750);const state=await page.evaluate(id=>{const g=globalThis.__game,p=g.player.root.position,s=g.place.things[id]?.spot();return {place:g.place.name,distance:s?Math.hypot(p.x-s[0],p.z-s[1]):null};},id);console.log(id,state);if(state.place!=='campus'||state.distance>.4)throw new Error('Approach failed '+id);await page.screenshot({path:out+width+'-'+id+'.png'});
  }
  fs.writeFileSync(out+width+'-report.json',JSON.stringify({errors},null,2));if(errors.length)throw new Error(errors.join('\n'));console.log('PASS',width);
 }catch(e){await page.screenshot({path:out+width+'-failure.png'});console.log(errors);throw e;}finally{closing=true;await context.close();}
},{timeoutMs:250000});
