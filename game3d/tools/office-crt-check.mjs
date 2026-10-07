import fs from 'node:fs';
import assert from 'node:assert/strict';
import {withBrowserJob} from '../../tools/lib/browser-job.mjs';
import {scopedRoute} from '../../tools/bible/check-scope.mjs';
import {waitForGame} from '../test/support/wait-ready.mjs';
const width=Number(process.env.WIDTH||1366),height=Number(process.env.HEIGHT||860);
const out=process.env.OUT||`/tmp/codex-office-crt-${process.env.ROUND||'1'}`,port=process.env.PORT||8771,base=process.env.BASE||'game3d';fs.mkdirSync(out,{recursive:true});
// Diagnostic staging: inside the office, oblique/side views of existing chief and cart monitors.
// Screens remain toward their users; the housing is behind them and rests on the original surface.
// No actor, light, prop transform or camera default is moved. These are not story cameras.
await withBrowserJob('office-crt',async browser=>{
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[],checks=[];
 let closing=false;
 await context.route('**/*',scopedRoute({publicOnly:true,isClosing:()=>closing,onFailure:message=>errors.push(message)}));
 page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({v:2,voiceOn:false,privateMode:false})));
 try{
  await waitForGame(page,60000,()=>page.goto(`http://127.0.0.1:${port}/${base}/index.html?day=2&place=office`),'play');await page.waitForFunction(()=>!globalThis.__game.busy&&!globalThis.document.querySelector('#boot'));await page.waitForTimeout(250);
  const fixtures=await page.evaluate(async()=>{const g=globalThis.__game,THREE=await import('three');return g.place.space.getObjectsByProperty('name','office-crt').map(o=>({position:g.place.space.worldToLocal(o.getWorldPosition(new THREE.Vector3())).toArray(),screen:o.children.find(c=>c.geometry?.type==='PlaneGeometry')?.position.toArray(),count:o.children.length}));});assert.equal(fixtures.length,9);checks.push({fixtures});
  const chief=await page.evaluate(async()=>{const g=globalThis.__game,THREE=await import('three'),mori=g.place.people.mori.root.getWorldPosition(new THREE.Vector3()),group=g.place.space.getObjectsByProperty('name','office-crt').find(o=>{const p=g.place.space.worldToLocal(o.getWorldPosition(new THREE.Vector3()));return Math.abs(p.x-1.55)<.4&&Math.abs(p.z+3.36)<.01;}),screen=group.children.find(c=>c.geometry?.type==='PlaneGeometry'),p=screen.getWorldPosition(new THREE.Vector3()),normal=screen.getWorldDirection(new THREE.Vector3()),keyboard=group.parent.children.find(c=>Math.abs(c.position.y-.428)<.001&&Math.abs(c.position.z-.0864)<.001&&Math.abs(c.position.x)<.001);if(!keyboard)throw Error('Actual chief keyboard surface missing');const key=keyboard.getWorldPosition(new THREE.Vector3());return{screen:p.toArray(),normal:normal.toArray(),worker:mori.toArray(),keyboard:key.toArray(),facing:normal.dot(mori.clone().sub(p)),workerToKeyboard:Math.hypot(key.x-mori.x,key.z-mori.z),workerToScreen:Math.hypot(p.x-mori.x,p.z-mori.z)};});checks.push({chief});if(!process.env.ALLOW_REVERSED){assert(chief.facing>0,'screen must face seated worker');assert(chief.workerToKeyboard<chief.workerToScreen,'keyboard must be in front of screen for its worker');}

  for(const [id,near,yaw] of [['chief-oblique',[1.69,-3.36],-.5],['chief-side',[1.69,-3.36],0],['cart-oblique',[4.2,-1.3],.9],['cart-side',[4.2,-1.3],1.55]]){
   await page.evaluate(async({near,yaw})=>{const g=globalThis.__game,THREE=await import('three');g.busy=true;const monitors=g.place.space.getObjectsByProperty('name','office-crt'),o=monitors.sort((a,b)=>{const p=x=>g.place.space.worldToLocal(x.getWorldPosition(new THREE.Vector3()));return Math.hypot(p(a).x-near[0],p(a).z-near[1])-Math.hypot(p(b).x-near[0],p(b).z-near[1]);})[0],p=g.place.space.worldToLocal(o.getWorldPosition(new THREE.Vector3()));const c=g.place.cam;c.closeOn([p.x,p.z],c.fitDist/1.7,p.y+.22);c.close.conversationShot={yaw,elev:.45,fov:55,minDistance:1.7,halfWidth:.55};c.snap(g.player.root.position);},{near,yaw});
   await page.waitForTimeout(500);await page.screenshot({path:`${out}/${width}-${id}.png`});
  }
  assert.deepEqual(errors,[]);
 }catch(error){checks.push({failure:error.stack});await page.screenshot({path:`${out}/failure.png`});throw error;}finally{fs.writeFileSync(out+'/report.json',JSON.stringify({checks,errors},null,2));closing=true;await context.close();}
},{timeoutMs:180000,gpuWaitMs:1200000});
