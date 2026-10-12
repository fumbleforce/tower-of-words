// Native touch at the Jump icon, with the offscreen direction marker present at the station bench.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {withBrowserJob,gpuWaitOptions} from '../../tools/lib/browser-job.mjs';
import {waitForGame} from '../test/support/wait-ready.mjs';
const base=process.env.BASE_URL||'http://127.0.0.1:8771/game3d';
const width=+(process.argv[2]||390),height=width<700?844:860;
const out=new URL('../shots/jump-hit-target/',import.meta.url).pathname;fs.mkdirSync(out,{recursive:true});
await withBrowserJob('jump-hit-target-'+width,async browser=>{
 const page=await browser.newPage({viewport:{width,height},hasTouch:width<700,isMobile:width<700});
 await page.route(/\/private\//,r=>r.abort());await page.route('**/api/plugins',r=>r.fulfill({json:[]}));
 await page.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({privateMode:false,textSpeed:'instant',voiceOn:false})));
 await waitForGame(page,240000,()=>page.goto(base+'/index.html?place=shotengai&q=2'),'play');
 await page.waitForFunction(()=>!globalThis.document.querySelector('#boot')&&!globalThis.__game.busy&&!globalThis.__game.player.scripted);
 await page.evaluate(()=>{const g=globalThis.__game;g.walker.stop();g.jump.reset();g.player.root.position.set(-2.8,0,-77.15);g.walker.sync();g.place.cam.snap(g.player.root.position);});
 await page.waitForTimeout(700);
 const boxes=await page.evaluate(()=>{
  const arrow=globalThis.document.getElementById('goalArrow'),jump=globalThis.document.getElementById('jumpBtn');
  const a=arrow.getBoundingClientRect(),j=jump.getBoundingClientRect(),x=j.x+j.width/2,y=j.y+j.height*.3;
  return {arrowVisible:!arrow.hidden,arrow:a.toJSON(),jump:j.toJSON(),x,y,iconHit:globalThis.document.elementFromPoint(x,y)?.closest('#jumpBtn')?.id};
 });
 assert.ok(boxes.arrowVisible,'the direction marker fixture is visible');
 if(width<700){
  assert.equal(boxes.iconHit,'jumpBtn','the normal icon area belongs to Jump');
  const a=boxes.arrow,j=boxes.jump;
  assert.ok(!(a.left<j.right&&a.right>j.left&&a.top<j.bottom&&a.bottom>j.top),'direction marker does not overlap Jump');
  const touch=await page.context().newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:boxes.x,y:boxes.y}]});
  await page.waitForTimeout(100);
  const result=await page.evaluate(()=>({place:globalThis.__game.place.name,busy:globalThis.__game.busy,air:globalThis.__game.jump.air,height:globalThis.__game.jump.height}));
  assert.ok(result.place==='shotengai'&&!result.busy&&result.air&&result.height>.05,'native icon touch jumps without following the direction marker');
  await page.screenshot({path:out+width+'-jump-icon.png'});
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  console.log('PASS native Jump icon touch',JSON.stringify({boxes,result}));
 }else {await page.keyboard.down('Space');await page.waitForTimeout(100);assert.ok(await page.evaluate(()=>globalThis.__game.jump.air));await page.screenshot({path:out+width+'-jump.png'});await page.keyboard.up('Space');console.log('PASS desktop Space with direction marker',JSON.stringify(boxes));}
 await page.close();
},{...gpuWaitOptions(900),timeoutMs:300000});
