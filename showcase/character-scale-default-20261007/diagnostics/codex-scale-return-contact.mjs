import fs from 'node:fs';
import {withBrowserJob} from '/home/jorgen/repo/japanese/tools/lib/browser-job.mjs';
import {scopedRoute} from '/home/jorgen/repo/japanese/tools/bible/check-scope.mjs';
const width=+(process.argv[2]||390),mc=width<700?'carina':'eric',out=`/home/jorgen/repo/japanese/.claude/worktrees/codex-scale-85-default/game3d/shots/canteen-meals/scale85-${process.env.ROUND||'return6'}-${width}/`;
fs.mkdirSync(out,{recursive:true});
await withBrowserJob('scale-return-contact-'+width,async browser=>{const context=await browser.newContext({viewport:{width,height:width<700?844:860}}),page=await context.newPage();let closing=false;const errors=[];
await context.route('**/*',scopedRoute({publicOnly:true,isClosing:()=>closing,onFailure:e=>errors.push(e)}));
await page.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({privateMode:false,voiceOn:false,textSpeed:'instant'})));
try{
await page.goto(`http://127.0.0.1:8771/.claude/worktrees/codex-scale-85-default/game3d/index.html?day=3&place=canteen&q=0&mc=${mc}`);
await page.waitForFunction(()=>globalThis.__game?.place?.canteenDining&&!globalThis.__game.busy,null,{timeout:45000});
await page.evaluate(async()=>{const g=globalThis.__game;await g.hooks.period({to:'lunch'});g.sim.yen=1000;g.busy=true;for(const a of [{state:'select',item:'curry'},{state:'pay'},{state:'collect'}])await g.place.hooks.canteenDining(a);
const wait=g.wait.bind(g);g.wait=ms=>{if(g.place.canteenPhase==='tray-place-contact'){globalThis.__returnHeld=true;return new Promise(resolve=>globalThis.__releaseReturn=()=>wait(ms).then(resolve));}return wait(ms);};
g.place.hooks.canteenDining({state:'returnTray'}).then(()=>globalThis.__returnDone=true);
});
await page.waitForFunction(()=>globalThis.__returnHeld,null,{timeout:65000});
const report=await page.evaluate(async()=>{const g=globalThis.__game,P=g.place,T=await import('three'),h=P.canteenDining.hands,s=h.active.get(g.player);globalThis.__run=false;g.paused=true;
const target=P.space.localToWorld(new T.Vector3(-10.3,.8,-.95)),cam=P.camera;cam.position.copy(target).add(new T.Vector3(1.45,.3,-.55));cam.lookAt(target);cam.fov=55;cam.updateProjectionMatrix();cam.updateMatrixWorld(true);
return {phase:P.canteenPhase,held:!!s?.prop,gap:h.distance(s),hand:h.point(s.hand).toArray(),target:P.space.worldToLocal(s.target.clone()).toArray(),actor:g.player.root.position.toArray(),scale:g.player.root.scale.x};});
await page.waitForTimeout(120);await page.screenshot({path:out+'return-held-side.png'});
for(const [id,offset] of [['right',[-1.1,.3,-.55]],['right-high',[-1.1,.8,-.3]]]){
 await page.evaluate(async offset=>{const g=globalThis.__game,T=await import('three'),target=g.place.space.localToWorld(new T.Vector3(-10.3,.8,-.95)),cam=g.place.camera;cam.position.copy(target).add(new T.Vector3(...offset));cam.lookAt(target);cam.updateMatrixWorld(true);},offset);
 await page.waitForTimeout(100);await page.screenshot({path:out+'return-held-'+id+'.png'});
}
fs.writeFileSync(out+'report.json',JSON.stringify({errors,result:report},null,2));
if(!report.held||report.gap>=.08||errors.length)throw Error(JSON.stringify(report));console.log('PASS',mc,JSON.stringify(report));
}finally{closing=true;await context.close();}},{timeout:140000});
