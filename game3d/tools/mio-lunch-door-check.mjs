import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
import { MACHINE_LEAF } from '../js/places/office-machine-door.js';
const width=+(process.argv[2]||1366);
const base=`http://127.0.0.1:${process.env.PORT||8771}/${process.env.BASE||'game3d'}`;
const out=new URL('../shots/mio-lunch/door-final/',import.meta.url).pathname;
fs.mkdirSync(out,{recursive:true});
await withBrowserJob(`mio-door-${width}`,async browser=>{
 const context=await browser.newContext({viewport:{width,height:width<600?844:860}}),page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try {
 await waitForGame(page,60000,()=>page.goto(`${base}/index.html?day=5&place=office&mc=${width<600?'carina':'eric'}&q=0`),'play');
 await page.waitForFunction(()=>!globalThis.__game.busy);
 const restored=await page.evaluate(()=>{
  const g=globalThis.__game,P=g.place,world=P.snapshotState();
  const oldLeaf=[[5.22,5.62,-.6,.18]];
  P.restoreState({flags:{},world:{...world,machineDoor:{value:1,target:1},blockers:{...world.blockers,mdoor:[],mdoorLeaf:oldLeaf}}});
  const open=P.snapshotState();
  P.restoreState({flags:{},world:{...world,machineDoor:{value:0,target:0},blockers:{...world.blockers,mdoor:[[4.7,5.5,0,.32]],mdoorLeaf:oldLeaf}}});
  const closed=P.snapshotState();
  P.hooks.machineDoor({state:'open'});g.setHurry(true);
  return {open:open.blockers,closed:closed.blockers};
 });
 assert.deepEqual(restored.open.mdoorLeaf,[MACHINE_LEAF]);
 assert.deepEqual(restored.closed.mdoorLeaf,[]); assert.equal(restored.closed.mdoor.length,1);
 await page.evaluate(async()=>{const g=globalThis.__game;await g.walkTo(5,-.75);});
 const routes=await page.evaluate(async()=>{
  const g=globalThis.__game,routes=[];
  for(const [name,to] of [['out',[5,.8]],['in',[5,-.75]]]) {
   const samples=[],timer=setInterval(()=>{const p=g.player.root.position;if(p.z>-.65&&p.z<.65)samples.push({at:p.toArray(),clearance:g.place.nav.clearance(p.x,p.z)});},15);
   await g.walkTo(...to);clearInterval(timer);routes.push({name,to,at:g.player.root.position.toArray(),samples});
  }
  g.setHurry(false);return {routes,radius:.24*g.place.charScale};
 });
 await page.screenshot({path:`${out}/${width}-ordinary-office.png`});
 fs.writeFileSync(`${out}/${width}.json`,JSON.stringify({restored,...routes,errors},null,2));
 for(const route of routes.routes){assert(Math.hypot(route.at[0]-route.to[0],route.at[2]-route.to[1])<.15);assert(route.samples.length>2);for(const sample of route.samples)assert(sample.clearance>=routes.radius,`${route.name} ${sample.clearance} < body ${routes.radius}`);}
 assert.deepEqual(errors,[]);console.log(`PASS ${width} ordinary office both directions, full body clearance, older open/closed saved leaf`);
 } finally {await context.close();}
},{timeoutMs:180000,gpuWaitMs:1200000});
