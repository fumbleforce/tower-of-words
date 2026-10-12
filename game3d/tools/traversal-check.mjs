import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob, gpuWaitOptions } from '../../tools/lib/browser-job.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const width = +(process.argv[2] || 1366), height = width < 700 ? 844 : 860;
const base = process.env.BASE_URL || 'http://127.0.0.1:8771/.claude/worktrees/codex-traversal-fix/game3d';
const out = new URL('../shots/traversal/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
await withBrowserJob('traversal-' + width, async browser => {
 const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 700, isMobile: width < 700 });
 await page.route('**/api/plugins', r => r.fulfill({json: []}));
 await page.route(/\/private\//, r => r.abort());
 await page.addInitScript(() => globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({privateMode:false,textSpeed:'instant',voiceOn:false})));
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await waitForGame(page, 240000, () => page.goto(base+'/index.html?place=shotengai&q=0'), 'play');
 await page.waitForFunction(() => !globalThis.document.querySelector('#boot') && !globalThis.__game.busy && globalThis.__game.walker.traversal, null,{timeout:240000});
 const info = await page.evaluate(async()=>{
  const { BENCHES }=await import('./js/scenes/station-garden/plan.js');
  const {createTraversal}=await import('./js/movement/traversal.js');
  const g=globalThis.__game, t=createTraversal(g.place,[g.player.root,...Object.values(g.place.people).map(p=>p.root)]);
  return {benches:BENCHES,scale:g.player.root.scale.x, count:t.count, supports:Object.values(BENCHES).map(b=>[b.x,b.z,t.support(b.x,b.z,2)])};
 });
 console.log(JSON.stringify(info));
 const bench=Object.values(info.benches)[0];
 await page.evaluate(b=>{const g=globalThis.__game;g.player.root.position.set(b.x,0,b.z-0.55);g.walker.sync();g.walker.keyFrame=null;g.place.camera.position.set(b.x-8,6,b.z);g.place.camera.lookAt(b.x,0,b.z);},bench);
 await page.keyboard.down('KeyW');
 await page.waitForFunction(()=>globalThis.__game.walker.keyFrame);
 await page.evaluate(()=>{globalThis.__game.walker.keyFrame.set(0,0,1);globalThis.__trace=[];const j=globalThis.__game.jump,old=j.update;j.update=function(dt){old(dt);if(globalThis.__trace.length<120)globalThis.__trace.push([globalThis.__game.player.root.position.z,j.height,j.air]);};});
 if (width < 700) {
  const r=await page.locator('#jumpBtn').boundingBox();
  await page.mouse.move(r.x+r.width/2,r.y+r.height/2); await page.mouse.down();
 } else await page.keyboard.down('Space');
 await page.waitForFunction(z=>globalThis.__game.player.root.position.z>z-0.22, bench.z, {timeout:8000}).catch(async e=>{
 console.log('benchfail',await page.evaluate(()=>({trace:globalThis.__trace,p:globalThis.__game.player.root.position.toArray(),h:globalThis.__game.jump.height,air:globalThis.__game.jump.air,count:globalThis.__game.jump.count,busy:globalThis.__game.busy,keys:[...globalThis.__game.walker.keys]})));
 await page.screenshot({path:out+width+'-benchfail.png'});throw e;
 });
 await page.keyboard.up('KeyW');
 if(width<700) await page.mouse.up(); else await page.keyboard.up('Space');
 await page.waitForTimeout(700);
 const result=await page.evaluate(()=>({p:globalThis.__game.player.root.position.toArray(),trace:globalThis.__trace,h:globalThis.__game.jump.height,air:globalThis.__game.jump.air,near:globalThis.__game.near,errors:globalThis.document.querySelector('.err')?.textContent}));
 console.log('bench',JSON.stringify(result));
 assert.ok(result.h>0.25 && result.h<0.45 && !result.air,'jump must land on the real bench');
 await page.screenshot({path:out+width+'-bench.png'});
 const scan=await page.evaluate(async()=>{
  const {local}=await import('./js/scenes/shotengai/plan.js');
  const {createTraversal}=await import('./js/movement/traversal.js');
  const g=globalThis.__game,t=createTraversal(g.place,[g.player.root,...Object.values(g.place.people).map(p=>p.root),...(g.place.crowd||[]).map(p=>p.root)]);
  const beach=local([12,35]), stairs=local([3.75,32]);
  const points=[beach,stairs,[-8,-76],[-8,-78],[-6,-77.5]];
  return {points:points.map(p=>({p,y:t.support(...p,2),nav:g.place.nav.free(...p)})),count:t.count};
 }); console.log('terrain',JSON.stringify(scan));
 async function walkAxis(from,direction,target,jump=false) {
  await page.evaluate(({from,direction})=>{
   const g=globalThis.__game; g.walker.stop(); g.jump.reset();
   g.player.root.position.set(from[0],0,from[1]);g.walker.sync();
   g.place.cam?.snap?.(g.player.root.position);
  },{from,direction});
  await page.keyboard.down('KeyW');
  await page.waitForFunction(()=>globalThis.__game.walker.keyFrame);
  await page.evaluate(d=>globalThis.__game.walker.keyFrame.set(d[0],0,d[1]),direction);
  if(jump) await page.keyboard.down('Space');
  await page.waitForFunction(({target,direction})=>{
   const p=globalThis.__game.player.root.position;
   return (p.x-target[0])*direction[0]+(p.z-target[1])*direction[1]>=0;
  },{target,direction},{timeout:12000}).catch(async e=>{
    console.log('walk failure',await page.evaluate(()=>({p:globalThis.__game.player.root.position.toArray(),h:globalThis.__game.jump.height,air:globalThis.__game.jump.air,v:globalThis.__game.walker.v,keys:[...globalThis.__game.walker.keys],busy:globalThis.__game.busy})));
    await page.screenshot({path:out+width+'-walk-fail.png'});throw e;
  });
  await page.keyboard.up('KeyW'); await page.keyboard.up('Space');
  await page.waitForFunction(()=>!globalThis.__game.jump.air);
  await page.waitForTimeout(250);
 }
 const beach=await page.evaluate(async()=>{
  const {local}=await import('./js/scenes/shotengai/plan.js');
  return {from:local([12,31.75]),to:local([12,34.2])};
 });
 await walkAxis(beach.from,[-1,0],beach.to,true);
 const landedBeach=await page.evaluate(()=>({p:globalThis.__game.player.root.position.toArray(),h:globalThis.__game.jump.height}));
 console.log('beach',JSON.stringify(landedBeach));
 assert.ok(landedBeach.h<-.08,'beach must support player below promenade');
 await page.screenshot({path:out+width+'-beach.png'});
 const curb=await page.evaluate(async()=>{
  const {createTraversal}=await import('./js/movement/traversal.js');
  const g=globalThis.__game,t=createTraversal(g.place,[g.player.root,...Object.values(g.place.people).map(p=>p.root),...(g.place.crowd||[]).map(p=>p.root)]);
  for(let x=-10;x<0;x+=.5) for(let z=-81;z<-70;z+=.5) {
   const from=[x,z],to=[x+1.5,z],y=t.support(x,z,.3,.6);
   if(g.place.nav.free(...from) && !g.place.nav.free(...to) && y!==null && t.clear(from,to,y,1.18)) return {from,to,y};
  }
  return null;
 });
 assert.ok(curb,'actual garden must have an accessible lawn across a curb');
 console.log('curb route',JSON.stringify(curb));
 await page.evaluate(c=>{const g=globalThis.__game;g.jump.reset();g.player.root.position.set(c.from[0],0,c.from[1]);g.walker.sync();g.place.cam.snap(g.player.root.position);},curb);
 await page.waitForTimeout(400);
 const targetPixel=await page.evaluate(async c=>{
  const T=await import('three'),g=globalThis.__game;
  const p=new T.Vector3(c.to[0],c.y,c.to[1]);g.place.space.localToWorld(p);p.project(g.place.camera);
  return [(p.x+1)*globalThis.innerWidth/2,(1-p.y)*globalThis.innerHeight/2];
 },curb);
 if(width<700) await page.touchscreen.tap(...targetPixel);else await page.mouse.click(...targetPixel);
 await page.waitForFunction(to=>Math.hypot(globalThis.__game.player.root.position.x-to[0],globalThis.__game.player.root.position.z-to[1])<.25,curb.to,{timeout:15000});
 await page.screenshot({path:out+width+'-curb-lawn.png'});
 console.log('PASS actual bench jump, beach landing, '+(width<700?'touch':'click')+' route across curb to lawn');
 assert.equal(errors.length,0,errors.join('\n'));
 await page.close();
}, { ...gpuWaitOptions(900), timeoutMs:300000 });
