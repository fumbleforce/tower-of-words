import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
const loader=registerHooks({resolve(s,c,next){
  if(s==='three') return next(new URL('../../vendor/three/three.module.js',import.meta.url).href,c);
  if(s.startsWith('three/addons/')) return next(new URL('../../vendor/'+s.slice(13),import.meta.url).href,c);
  return next(s,c);
}});
globalThis.location={search:''};
const THREE=await import('../../vendor/three/three.module.js');
const {counterActivity}=await import('../../js/places/room-activity.js');
const {buildCanteen}=await import('../../js/scenes/canteen/room.js');
process.on('exit',()=>loader.deregister());
function fixture(){
  const root=new THREE.Group(), actor=new THREE.Group(); root.add(actor);
  const arm=new THREE.Bone(); arm.name='RightArm';arm.position.set(0,.9,0);
  const fore=new THREE.Bone();fore.name='RightForeArm';fore.position.set(0,-.24,0);
  const hand=new THREE.Bone();hand.name='RightHand';hand.position.set(0,-.23,0);
  actor.add(arm);arm.add(fore);fore.add(hand);actor.position.set(2,0,-7.5);
  const update=function(){};const worker={root:actor,model:actor,update};
  const game={busy:false,wait:async()=>{},tween:async(_,fn)=>{for(let k=0;k<=10;k++)fn(k/10);}};
  const activity=counterActivity(game,{space:root,cam:{yaw:0,elev:1,release(){this.close=null;},closeOn(){this.close={};},fitDist:12}},worker);
  return {activity,worker,game,root,hand,arm,fore,update};
}
test('counter activity keeps cloth on actual hand without moving feet and releases its pose across repeated visits',()=>{
  const f=fixture(), original=f.worker.root.position.toArray(), q=f.arm.quaternion.clone();
  const positions=[];
  for(let i=0;i<20;i++){
    f.activity.update(.08);f.worker.update(.08);f.root.updateMatrixWorld(true);
    const p=f.hand.getWorldPosition(new THREE.Vector3());p.y-=.012;
    assert.ok(p.distanceTo(f.activity.cloth.position)<1e-6);
    positions.push(f.activity.cloth.position.x);
  }
  assert.ok(Math.max(...positions)-Math.min(...positions)>.08,'a sustained wipe visibly moves');
  assert.deepEqual(f.worker.root.position.toArray(),original);
  f.activity.leave();assert.equal(f.worker.update,f.update);assert.ok(f.arm.quaternion.angleTo(q)<1e-8);
  f.activity.update(.1);assert.notEqual(f.worker.update,f.update);
  f.activity.leave();assert.equal(f.worker.update,f.update);
});
test('busy conversations release automatic wiping; cancelled in-flight wiping cannot reinstall its pose',async()=>{
  const f=fixture();f.activity.update(.2);f.game.busy=true;f.activity.update(.1);
  assert.deepEqual(f.activity.cloth.position.toArray(),[2,.677,-7.42]);
  f.game.tween=async(_,fn)=>{fn(.1);f.activity.leave();fn(.8);};
  await f.activity.act({state:'wipe'});assert.equal(f.worker.update,f.update);
});
test('staff counter and sofa approach keep the player on connected floor clear of the seated actor',async()=>{
  const w=buildCanteen(), staff=[1.8,-5.85];
  assert.ok(w.nav.free(...staff,.24));assert.ok(w.nav.path(...w.door.in,...staff)?.length);
  const {buildCommons}=await import('../../js/scenes/rooms/commons.js');
  globalThis.document={createElement(tag){assert.equal(tag,'canvas');return {getContext(){return {createRadialGradient(){return {addColorStop(){}};},fillRect(){}};}};}};
  const commons=buildCommons(), approach=[-1.65,-1.75];
  assert.ok(commons.nav.free(...approach,.24));
  assert.ok(commons.nav.free(-2.25,-2.15,.24), "safe stand/reseat point beside the sofa");
  assert.ok(commons.nav.path(...commons.door.in,...approach)?.length);
  assert.ok(Math.hypot(-1.65-(-1.96),-1.75-(-3.3))>1.5,'approach leaves the occupied sofa end clear');
});

test('the actual default canteen worker moves its drawn hand, without requiring a Meshy rig',async()=>{
  const {PEOPLE}=await import('../../js/cast.js');
  const worker=PEOPLE.worker(25), root=new THREE.Group();root.add(worker.root);
  worker.root.scale.multiplyScalar(1.18);worker.root.position.set(1.8,0,-7.7);
  const game={busy:false}, P={space:root,cam:{release(){},closeOn(){this.close={};},fitDist:12}};
  const activity=counterActivity(game,P,worker), hand=worker.arms[1].userData.hand;
  const samples=[];
  for(let i=0;i<25;i++){activity.update(.08);samples.push(hand.getWorldPosition(new THREE.Vector3()).toArray());}
  assert.ok(Math.max(...samples.map(p=>p[0]))-Math.min(...samples.map(p=>p[0]))>.07);
  assert.ok(samples.every(p=>p[1]>.64&&p[1]<.77),'cloth stays at counter height');
  activity.leave();
});
