import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {test} from 'node:test';
const loader=registerHooks({resolve(s,c,next){
 if(s==='three')return next(new URL('../../vendor/three/three.module.js',import.meta.url).href,c);
 if(s.startsWith('three/addons/'))return next(new URL('../../vendor/'+s.slice(13),import.meta.url).href,c);
 if(s.endsWith('/sim.js'))return {url:'data:text/javascript,'+encodeURIComponent('export const sim=globalThis.__printSim;export const save=()=>globalThis.__printSaved++;'),shortCircuit:true};
 return next(s,c);
}});
globalThis.__printSim={inv:[]};globalThis.__printSaved=0;globalThis.innerWidth=390;globalThis.location={search:''};
globalThis.document={createElement:()=>({}),head:{appendChild(){}},querySelector:()=>({style:{},classList:{add(){},remove(){}}})};
const THREE=await import('../../vendor/three/three.module.js');
const {printService}=await import('../../js/places/print-service.js');
const {directoryPages,DIRECTORY_ID}=await import('../../js/gameplay/island-directory.js');
const {PINS}=await import('../../js/travel/pins.js');const {PLACE_NAMES}=await import('../../js/places/definitions.js');
process.on('exit',()=>loader.deregister());
function fixture(){
 globalThis.__printSim.inv=[];globalThis.__printSaved=0;const lines=[],poses=[];
 const root=new THREE.Group(),arm=new THREE.Group(),hand=new THREE.Object3D();hand.position.y=.45;arm.userData.hand=hand;arm.add(hand);root.add(arm);const rig={root,arms:[null,arm],update(){}};
 const P={space:new THREE.Group(),cam:{fitDist:12,yaw:0,elev:1,closeOn(){this.close={};},release(){this.close=null;}}};
 const w={feed:new THREE.Object3D(),output:new THREE.Object3D()};w.feed.position.set(-1,.8,-3);w.output.position.set(-.6,.5,-3);w.output.visible=false;
 P.space.add(root,w.feed,w.output);
 const game={player:rig,place:P,wait:async()=>{},ui:{refreshBag(){},say:async(_,text)=>{lines.push(text);},closeTalk(){}},tween:async(seconds,fn)=>{assert.ok(seconds>0 && seconds<5, "production tween duration is seconds");for(const t of [0,.5,1]){fn(t);poses.push([w.feed.position.toArray(),w.output.position.toArray()]);}}};
 const service=printService(game,P,w);return {P,w,game,service,lines,poses};
}
test('real machine feed and output complete before one persistent directory, repeated service only reads',async()=>{
 const f=fixture();await f.service.run();assert.deepEqual(globalThis.__printSim.inv,[DIRECTORY_ID]);assert.equal(globalThis.__printSaved,1);assert.equal(f.lines.length,3);
 assert.ok(f.poses.some(([feed])=>feed[2]<-3.2));assert.ok(f.poses.some(([,out])=>out[0]>-.4));
 const moves=f.poses.length;await f.service.run();assert.equal(f.poses.length,moves);assert.equal(f.lines.length,6);assert.equal(globalThis.__printSaved,1);assert.deepEqual(globalThis.__printSim.inv,[DIRECTORY_ID]);
 assert.equal(f.w.output.visible,false);assert.equal(f.w.feed.visible,true);assert.equal(f.P.cam.close,null);
});
test('actual action cancellation during feed grants no document and late tween cannot revive paper',async()=>{
 const f=fixture(),start=f.w.feed.position.clone();
 f.game.tween=async(_,fn)=>{fn(.3);f.service.leave();fn(1);};
 await f.service.run();assert.deepEqual(globalThis.__printSim.inv,[]);assert.equal(globalThis.__printSaved,0);assert.equal(f.lines.length,0);assert.ok(f.w.feed.position.equals(start));assert.equal(f.w.output.visible,false);
});
test('leaving during the paper view closes it and cannot open subsequent pages in a new place',async()=>{
 const f=fixture();let close;
 f.game.ui.say=async(_,text)=>{f.lines.push(text);await new Promise(r=>close=r);};f.game.ui.closeTalk=()=>close?.();
 const running=f.service.run();while(!close)await new Promise(r=>setImmediate(r));f.game.place={};f.service.leave();await running;await new Promise(r=>setImmediate(r));
 assert.equal(f.lines.length,1);assert.deepEqual(globalThis.__printSim.inv,[DIRECTORY_ID]);assert.equal(f.P.cam.close,null);
});
test('printed venue names follow canonical map parents, without fabricated numeric opening times',()=>{
 const pages=directoryPages().join('\n');for(const id of ['bakery','office','print_shop','canteen','karaoke','gym','pool']){assert.ok(pages.includes(PLACE_NAMES[id]));assert.ok(pages.includes(PLACE_NAMES[PINS[id].in]));}
 assert.match(pages,/Opens Sat 3 Oct; morning, lunch, afternoon/);
 assert.doesNotMatch(pages,/\b\d{1,2}:\d{2}\b/);
});

test('interrupted physical pickup grants nothing and restores the original arm updater',async()=>{
 const f=fixture(),update=f.game.player.update;
 f.game.wait=async()=>{if(f.service.state.phase==='pickup')f.service.leave();};
 await f.service.run();assert.deepEqual(globalThis.__printSim.inv,[]);assert.equal(globalThis.__printSaved,0);assert.equal(f.game.player.update,update);assert.equal(f.w.output.parent,f.P.space);assert.equal(f.w.output.visible,false);
});
