import fs from 'node:fs';
import path from 'node:path';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';
const ROOT = path.resolve(new URL('../../..', import.meta.url).pathname);
const OUT = '/home/jorgen/repo/japanese/art/parts/rei-rig-2/train';
fs.mkdirSync(OUT, { recursive: true });
await withBrowserJob('rei-train-recovery', async browser => {
 const page = await browser.newPage({viewport:{width:1366,height:860}});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route(/\/assets\/characters\/rei\/(walk|run|sit)\.glb/,route=>route.fulfill({path:path.join(ROOT,'game3d/assets/characters/rei',new URL(route.request().url()).pathname.split('/').pop())}));
 // Capture Rei's original seat before the story gives the seat and laptop to Mio.
 await page.route(/\/js\/places\/train\.js(?:\?|$)/, async route => {
  const response = await route.fetch();
  await route.fulfill({response, body:(await response.text()).replace('placeMio(m) {', 'placeMio(m) { m.root.visible = false; return;')});
 });
 await page.goto('http://127.0.0.1:8771/game3d/index.html?cap&q=1&place=train');
 await page.waitForFunction(()=>globalThis.__done,null,{timeout:120000});
 await page.evaluate(()=>{
  const g=globalThis.__game;g.busy=true;g.hooks.show({id:'rei'});g.place.people.mio.root.visible=false;
  const canvas=document.querySelector('canvas');for(const e of document.querySelectorAll('body *'))if(e!==canvas&&!e.contains(canvas))e.style.visibility='hidden';
  globalThis.__advance(1);
 });
 await page.screenshot({path:OUT+'/wide.png'});
 const evidence=await page.evaluate(async()=>{
  const THREE=await import('three'),g=globalThis.__game,m=g.place.people.rei;
  const root=m.root.getWorldPosition(new THREE.Vector3());
  g.hooks.cam({on:'rei',zoom:3});
  globalThis.__advance(1);
  const B={};m.model.traverse(o=>{if(o.isBone)B[o.name]=o.getWorldPosition(new THREE.Vector3()).toArray()});
  return {state:m.state,seated:m.seated,root:root.toArray(),lap:m.lap.getWorldPosition(new THREE.Vector3()).toArray(),laptop:m.lap.children[0].getWorldPosition(new THREE.Vector3()).toArray(),bones:B};
 });
 await page.screenshot({path:OUT+'/close.png'});
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>globalThis.__advance(.1));
 await page.screenshot({path:OUT+'/phone.png'});
 fs.writeFileSync(OUT+'/report.json',JSON.stringify({evidence,errors},null,2));
 console.log(JSON.stringify({state:evidence.state,seated:evidence.seated,lap:evidence.lap,laptop:evidence.laptop,errors}));
},{timeoutMs:180000});
