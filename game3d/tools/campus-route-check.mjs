import assert from 'node:assert/strict';
import fs from 'node:fs';
import {scopedRoute} from '../../tools/bible/check-scope.mjs';
import {withBrowserJob} from '../../tools/lib/browser-job.mjs';
import {waitForGame} from '../test/support/wait-ready.mjs';
const width=+(process.argv[2]||1366),part=process.argv[3]||'loop',phone=width<600,height=phone?844:860;
const day=+(process.env.DAY||3);
const base=process.env.BASE||'.claude/worktrees/codex-north-campus/game3d';
const out=new URL(`../shots/north-campus/${process.env.OUT||`routes-verge-${part}`}/`,import.meta.url).pathname;fs.mkdirSync(out,{recursive:true});
await withBrowserJob(`campus-route-${part}-${width}`,async browser=>{
 const context=await browser.newContext({viewport:{width,height},isMobile:phone,hasTouch:phone}),page=await context.newPage(),errors=[],checks=[];
 let closing=false;
 await context.route('**/*',scopedRoute({publicOnly:true,isClosing:()=>closing,onFailure:e=>errors.push(e)}));
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({privateMode:false,voiceOn:false,textSpeed:'instant'})));

 const tap=async l=>phone?l.tap():l.click();
 const shot=async name=>page.screenshot({path:out+width+'-'+name+'.png'});
 async function go(id,to){
  const before=await page.evaluate(()=>globalThis.__game.place.name);
  await page.evaluate(async id=>{const g=globalThis.__game,t=g.place.things[id];if(!t)throw new Error('Missing target '+id);await g.walkTo(...t.spot());},id);
  await page.waitForTimeout(350);
  if(await page.evaluate(name=>globalThis.__game.place.name===name&&!globalThis.__game.busy,before)){
   const p=await page.evaluate(id=>{const m=globalThis.__game.markers.list.find(m=>m.id===id);if(!m)throw new Error('Missing marker '+id);const r=m.el.querySelector('.pin').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};},id);
   if(phone)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);
   await page.waitForTimeout(180);const use=page.locator('#actMenu:not([hidden]) .use');if(await use.isVisible())await tap(use);
  }
  await page.waitForFunction(to=>globalThis.__game.place.name===to&&!globalThis.__game.busy,to,{timeout:45000});
  await page.waitForTimeout(600);assert.equal(await page.evaluate(()=>!!globalThis.__game.runner.recoveryError),false);checks.push(before+' → '+to);console.log('walked',checks.at(-1));await shot(checks.length+'-'+to);
 }
 try{
  await waitForGame(page,60000,()=>page.goto(`http://127.0.0.1:8771/${base}/index.html?day=${day}&place=${part==='loop'?'office':'campus'}&mc=${phone?'carina':'eric'}&q=0`),'play');await page.waitForTimeout(500);await page.evaluate(async()=>{const {startMoveCheck}=await import('./js/movement/checks.js');startMoveCheck(globalThis.__game);});
  if(part==='loop'){
   await go('lift','forecourt');await go('campus','campus');await go('print_shop','print_shop');await go('print_exit','campus');await go('office_shed','office_quarter');await go('campus_quarter','campus');
  }else{
   await go('harbour','harbour');await go('campus','campus');if(part!=='link'){await go('forecourt','forecourt');await go('shop_lane','shotengai');}
  }
  const motion=await page.evaluate(()=>({overlaps:globalThis.__moveCheck.overlaps,spins:globalThis.__moveCheck.spins,steps:globalThis.__moveCheck.steps,gait:globalThis.__gaitCheck}));assert.deepEqual(motion.overlaps,[]);assert.deepEqual(motion.spins,[]);assert.deepEqual(motion.gait.episodes,[]);assert.deepEqual(errors,[]);fs.writeFileSync(out+width+'-report.json',JSON.stringify({checks,errors,motion},null,2));console.log('PASS',checks);
 }catch(error){console.log('STATE',await page.evaluate(()=>{const g=globalThis.__game;return {place:g?.place?.name,busy:g?.busy,pos:g?.player?.root.position,things:Object.keys(g?.place?.things||{}),talk:globalThis.document.querySelector('#talk')?.textContent};}));await shot('failure');console.log(errors);throw error;}finally{closing=true;await context.close();}
},{timeoutMs:280000});
