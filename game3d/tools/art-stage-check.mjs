import assert from 'node:assert/strict';
import fs from 'node:fs';
import {withBrowserJob} from '../../tools/lib/browser-job.mjs';
import {scopedRoute} from '../../tools/bible/check-scope.mjs';
const width=+(process.argv[2]||1366),height=width<700?844:860,mc=width<700?'carina':'eric';
const base=`http://127.0.0.1:8771/${process.env.BASE||'game3d'}`;
const out=new URL(`../shots/art-club-stage/${Date.now()}-${width}/`,import.meta.url);fs.mkdirSync(out,{recursive:true});
const result={width,mc,fixture:'Unapproved photo A used only for isolated physical staging',actions:[]};
await withBrowserJob('art-club-stage-'+width,async browser=>{
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage();let closing=false;const errors=[],blocked=[];
 page.on('console',m=>{if(m.type()==='error')console.log('BROWSER',m.text());});page.on('response',r=>{if(r.status()>=400)console.log('HTTP',r.status(),r.url());});
 page.on('pageerror',e=>errors.push(e.message));await context.route('**/*',scopedRoute({publicOnly:true,isClosing:()=>closing,onFailure:s=>blocked.push(s)}));
 await page.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({privateMode:false,voiceOn:false,textSpeed:'instant'})));
 try{
  await page.goto(`${base}/index.html?day=3&place=dorm_commons&q=0&mc=${mc}`);
  await page.waitForFunction(()=>globalThis.__game?.place,null,{timeout:45000});
  await page.screenshot({path:new URL('initial.png',out).pathname});
  result.renderer=await page.evaluate(()=>{const gl=globalThis.__game.renderer.getContext(),d=gl.getExtension('WEBGL_debug_renderer_info');return d?gl.getParameter(d.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);});

  await page.evaluate(async()=>{
   const g=globalThis.__game,P=g.place,THREE=await import('./vendor/three/three.module.js');
   if(P.artClub.ready())throw new Error('Production art fixture unexpectedly ready');
   const texture=await new THREE.TextureLoader().loadAsync('/art/parts/mori-photo-1/a.png');
   // Test-only approval injection: no production asset registration or manifest changes.
   P.artClub.setPhotograph(texture,{approved:true});P.people.mori.root.visible=true;
   P.people.kenji.root.visible=false;P.people.aoi.root.visible=false;
   g.beat(()=>new Promise(resolve=>{globalThis.__artFinish=resolve;}));
   globalThis.__artBase={player:g.player.root.position.toArray(),mori:P.people.mori.root.position.toArray(),update:P.people.mori.update,yaw:P.cam.yaw,elev:P.cam.elev};
   const label=globalThis.document.createElement('div');label.textContent='STAGING FIXTURE · PHOTO NOT APPROVED';label.style.cssText='position:fixed;top:4px;left:4px;background:#fff;color:#111;padding:5px;z-index:10000;font:12px sans-serif';globalThis.document.body.append(label);
  });
  for(const state of ['begin','photo','group','tracePhoto','firstPage','offerPage','prepareTea','takeTea','pour','pencilBeside','drawSlope','drawTogether']){
   await page.evaluate(state=>{const g=globalThis.__game;globalThis.__artDone=false;globalThis.__artError=null;(async()=>{try{await g.place.hooks.artClub({state});}catch(e){globalThis.__artError=e.message;}finally{globalThis.__artDone=true;}})();},state);
   await page.waitForTimeout(state==='begin'?1100:state==='pour'?1250:450);
   await page.screenshot({path:new URL(state+'-motion.png',out).pathname});
   await page.waitForFunction(()=>globalThis.__artDone,null,{timeout:30000});
   const data=await page.evaluate(async()=>{const g=globalThis.__game,P=g.place,THREE=await import('./vendor/three/three.module.js');return {error:globalThis.__artError,state:P.artClub.snapshot(),hands:['mori','eric'].map(id=>{const r=id==='eric'?g.player:P.people[id],h=(r.model||r.root).getObjectByName('RightHand')||r.arms?.[1]?.userData.hand;return {id,hand:h?P.space.worldToLocal(h.getWorldPosition(new THREE.Vector3())).toArray():null};})};});
   if(state==='takeTea'){const restore=await page.evaluate(()=>{const g=globalThis.__game,P=g.place;const world=JSON.parse(JSON.stringify(P.snapshotState()));P.restoreState({world});P.update(.1,g.t);return {before:world.artClub.held,after:P.artClub.snapshot().held,yaw:P.cam.yaw,elev:P.cam.elev};});assert.deepEqual(restore.after,restore.before);result.restore=restore;}
   assert.equal(data.error,null,state);result.actions.push({action:state,...data});await page.waitForTimeout(900);await page.screenshot({path:new URL(state+'.png',out).pathname});
   if(state==='photo'||state==='firstPage'){await page.evaluate(state=>{const text=state==='photo'?'1994年です。リレハンメル。':'あ、紙が足りなくなりました。もう少し、小さく描けばよかったですね。';void globalThis.__game.ui.say({name:'Mori',color:'#92ac88'},text,{whoId:'mori',face:state==='photo'?'fond':'sheepish',overheard:true,clear:state==='photo'?['1994年','リレハンメル']:[]});},state);await page.waitForTimeout(600);await page.screenshot({path:new URL(state+'-dialogue.png',out).pathname});for(let i=0;i<4&&await page.locator('#talk').isVisible();i++){await page.locator('#talkHit').click({position:{x:10,y:50}});await page.waitForTimeout(150);}}
  }
  await page.evaluate(async()=>{const g=globalThis.__game,P=g.place;await P.hooks.artClub({state:'free'});if(P.people.mori.update!==globalThis.__artBase.update)throw new Error('Mori wrapper leaked');await P.hooks.artClub({state:'begin'});const pending=P.hooks.artClub({state:'firstPage'});await g.wait(100);P.leave();await pending;if(P.people.mori.update!==globalThis.__artBase.update)throw new Error('Cancelled overlay returned');});
  await page.evaluate(()=>globalThis.__artFinish());
  assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);result.pass=true;
 }finally{await page.screenshot({path:new URL('last.png',out).pathname});closing=true;fs.writeFileSync(new URL('report.json',out),JSON.stringify({...result,errors,blocked},null,2));await context.close();}
},{timeoutMs:280000});
console.log('ART_STAGE',out.pathname,result.pass);
