// Actual input and route regression at the station gate; no private assets or scripted movement overrides.
import assert from 'node:assert/strict';
import {withBrowserJob,gpuWaitOptions} from '../../tools/lib/browser-job.mjs';
import {waitForGame} from '../test/support/wait-ready.mjs';
const width=+(process.argv[2]||1366),height=width<700?844:860;
const base=process.env.BASE_URL||'http://127.0.0.1:8771/.claude/worktrees/codex-traversal-fix/game3d';
await withBrowserJob('gate-traversal-'+width,async browser=>{
 const page=await browser.newPage({viewport:{width,height},hasTouch:width<700,isMobile:width<700});
 await page.route(/\/private\//,r=>r.abort());await page.route('**/api/plugins',r=>r.fulfill({json:[]}));
 await page.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({privateMode:false,voiceOn:false,textSpeed:'instant'})));
 await waitForGame(page,240000,()=>page.goto(base+'/index.html?place=gate&cap&q=0'),'play');
 await page.waitForFunction(()=>!globalThis.document.querySelector('#boot')&&!globalThis.__game.busy);
 await page.evaluate(()=>{const g=globalThis.__game;g.place.hooks.gate({state:'open'});g.player.root.position.set(0,0,1);g.walker.sync();globalThis.__advance(.6);});
 await page.keyboard.down('KeyW');await page.evaluate(()=>globalThis.__advance(.02));
 await page.waitForFunction(()=>globalThis.__game.walker.keyFrame);
 await page.evaluate(()=>{globalThis.__game.walker.keyFrame.set(0,0,-1);globalThis.__advance(2.5);});
 await page.keyboard.up('KeyW');
 assert.ok(await page.evaluate(()=>globalThis.__game.player.root.position.z<-1),'keyboard passes opened gate');
 const route=await page.evaluate(async()=>{
  const g=globalThis.__game;g.player.root.position.set(-.5,0,.7);g.walker.sync();const destination=g.place.things.worker_a.spot();g.walker.goTo(...destination);
  for(let i=0;i<180;i++){globalThis.__advance(1/30);await Promise.resolve();}
  return {position:g.player.root.position.toArray(),destination,near:g.near};
 });
 assert.ok(Math.hypot(route.position[0]-route.destination[0],route.position[2]-route.destination[1])<.2,'route passes actual open flap to worker');
 assert.ok(route.near,'idle fixture has actual interactable in reach');
 if(width<700) {await page.locator('#jumpBtn').dispatchEvent('pointerdown',{pointerId:1,pointerType:'touch',bubbles:true});}
 else await page.keyboard.down('Space');
 await page.evaluate(()=>globalThis.__advance(.09));
 const jump=await page.evaluate(()=>({air:globalThis.__game.jump.air,height:globalThis.__game.jump.height,busy:globalThis.__game.busy,near:globalThis.__game.near,moving:globalThis.__game.walker.moving}));
 if(width<700) await page.locator('#jumpBtn').dispatchEvent('pointerup',{pointerId:1,pointerType:'touch',bubbles:true});else await page.keyboard.up('Space');
 assert.ok(jump.air&&jump.height>.05&&!jump.busy,'idle jump beside worker must jump without interacting');
 console.log('PASS gate keyboard, route, idle near-target jump',JSON.stringify({route,jump}));
 await page.close();
},{...gpuWaitOptions(900),timeoutMs:300000});
