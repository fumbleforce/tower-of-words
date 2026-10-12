import assert from 'node:assert/strict';
import fs from 'node:fs';
import {withBrowserJob,gpuWaitOptions} from '../../tools/lib/browser-job.mjs';
import {waitForGame} from '../test/support/wait-ready.mjs';
const baseline=process.argv.includes('--baseline');
const base=baseline?'http://127.0.0.1:8771/game3d':(process.env.BASE_URL||'http://127.0.0.1:8771/game3d');
await withBrowserJob('hurry-'+(baseline?'baseline':'fixed'),async browser=>{
 const page=await browser.newPage({viewport:{width:1366,height:860}});
 let fixtureLoads=0;
 if(process.env.MAIN_FIXTURE)await page.route(/\/js\/main\.js(?:\?|$)/,r=>{fixtureLoads++;return r.fulfill({contentType:'text/javascript',body:fs.readFileSync(process.env.MAIN_FIXTURE,'utf8')});});
 await page.route(/\/private\//,r=>r.abort());await page.route('**/api/plugins',r=>r.fulfill({json:[]}));
 await page.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({privateMode:false,cameraMode:'follow',textSpeed:'instant',voiceOn:false})));
 await waitForGame(page,240000,()=>page.goto(base+'/index.html?place='+(process.env.POOL?'pool':'shotengai')+'&q=0'),'play');
 await page.waitForFunction(()=>!globalThis.document.querySelector('#boot')&&!globalThis.__game.busy);
 if(process.env.MAIN_FIXTURE)assert.equal(fixtureLoads,1,'historical main fixture was loaded');
 for(const dest of (process.env.POOL?['sports','pool']:['east_coast','shotengai'])){
  await page.evaluate(dest=>{const g=globalThis.__game;globalThis.__samples=[];const w=g.player,old=w.update;w.update=function(dt,...args){const before=this.mixer?.time,result=old.call(this,dt,...args);globalThis.__samples.push({dt,moving:g.walker.moving,walkerDt:globalThis.__walkerDt,mixerDelta:this.mixer?.time-before,hurry:g.hurry,scale:g.timeScale,busy:g.busy,place:g.place.name,locked:g.walker.locked,scripted:g.player.scripted,keys:[...g.walker.keys],x:g.player.root.position.x,z:g.player.root.position.z,t:performance.now()});return result;};globalThis.__trip=g.travel(dest);},dest);
  await page.keyboard.press('Space');
  await page.waitForTimeout(150);
  const activated=await page.evaluate(()=>({hurry:globalThis.__game.hurry,busy:globalThis.__game.busy,place:globalThis.__game.place.name}));
  await page.waitForFunction(dest=>globalThis.__game.place.name===dest,dest,{timeout:180000});
  await page.evaluate(()=>{const g=globalThis.__game,w=g.walker,old=w.update;globalThis.__walkSamples=[];w.update=function(dt,...args){globalThis.__walkerDt=dt;const p=g.player.root.position,x=p.x,z=p.z,result=old.call(this,dt,...args);globalThis.__walkSamples.push({dt,t:performance.now(),distance:Math.hypot(p.x-x,p.z-z),hurry:g.hurry,busy:g.busy});return result;};});
  await page.keyboard.down('KeyW');
  await page.waitForFunction(dest=>globalThis.__game.place.name===dest&&!globalThis.__game.busy&&globalThis.__samples.length>15,dest,{timeout:180000});
  await page.keyboard.up('KeyW');
  const data=await page.evaluate(dest=>globalThis.__samples.filter(x=>x.place===dest).slice(0,200),dest);
  const walk=await page.evaluate(()=>globalThis.__walkSamples);
  const hurryWalk=walk.filter(x=>x.busy&&x.hurry);
  const duration=hurryWalk.length?(hurryWalk.at(-1).t-hurryWalk[0].t)/1000+.017:0;
  const speed=duration?hurryWalk.reduce((n,x)=>n+x.distance,0)/duration:0, clock=duration?hurryWalk.reduce((n,x)=>n+x.dt,0)/duration:0;
  const ratios=data.filter(x=>x.busy&&x.hurry&&x.moving&&!x.scripted&&x.walkerDt>0).map(x=>({input:x.dt/x.walkerDt,mixer:x.mixerDelta/x.walkerDt}));
  console.log(JSON.stringify({dest,activated,speed,clock,hurryFrames:hurryWalk.length,ratios,data,walk}));
  if(!baseline&&!process.env.MAIN_FIXTURE)assert.ok(ratios.every(x=>Math.abs(x.input-1)<1e-5&&Math.abs(x.mixer-1)<1e-4),'manual gait and displacement share the same unhurried clock');
  if(!baseline&&hurryWalk.length>10)assert.ok(speed<=1.6&&clock<=1.2,'busy arrival manual movement stays at ordinary speed');
  if(!baseline)assert.ok(data.filter(x=>!x.busy).every(x=>!x.hurry&&x.scale===1),'Every free movement frame must have normal clock');
 }
 await page.close();
},{...gpuWaitOptions(900),timeoutMs:480000});
