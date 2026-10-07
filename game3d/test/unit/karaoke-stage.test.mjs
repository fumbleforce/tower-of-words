import assert from 'node:assert/strict';
import {test} from 'node:test';
import {registerHooks} from 'node:module';
const hook=registerHooks({resolve(s,c,n){return n(s==='three'?new URL('../../vendor/three/three.module.js',import.meta.url).href:s,c);},load(u,c,n){if(u.endsWith('/js/move.js'))return {format:'module',shortCircuit:true,source:`export async function walkRig(game,rig,to){rig.root.position.set(to[0],0,to[1]);} export async function faceRig(game,rig,to){rig.root.rotation.y=Math.atan2(to[0]-rig.root.position.x,to[1]-rig.root.position.z);}`};return n(u,c);}});
const THREE=await import('../../vendor/three/three.module.js');
const context=new Proxy({measureText:()=>({width:100})},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)});
globalThis.document={createElement:()=>({getContext:()=>context})};
const {createKaraokeStage}=await import('../../js/places/ongoing/karaoke-stage.js');
const {BOOTH_SEATS}=await import('../../js/places/ongoing/karaoke-props.js');
function fixture(){
 const space=new THREE.Group();
 function rig(){
  const root=new THREE.Group(),spine=new THREE.Bone();spine.name='Spine';spine.position.y=.7;root.add(spine);
  for(const [side,x]of [['Right',-.2],['Left',.2]]){const arm=new THREE.Bone(),fore=new THREE.Bone(),hand=new THREE.Bone();arm.name=side+'Arm';fore.name=side+'ForeArm';hand.name=side+'Hand';arm.position.x=x;fore.position.y=-.22;hand.position.y=-.2;spine.add(arm);arm.add(fore);fore.add(hand);}
  space.add(root);return {root,model:root,update(){},setState(){},sitAt(x,top,z,ry){root.position.set(x,top,z);root.rotation.y=ry;}};
 }
 const eric=rig(),kenji=rig(),kuroda=rig();
 eric.root.position.set(1.45,0,-1.15);kenji.root.position.set(-1.6,0,-1);kuroda.root.position.set(1.4,0,-2.5);
 const P={space,people:{kenji,kuroda},camera:{aspect:1.6},nav:{free:()=>true},cam:{yaw:.2,elev:.8,fitDist:8,close:null,closeOn(point,zoom,y){this.close={point,zoom,y};},release(){this.close=null;}}};
 const game={place:P,player:eric,walker:{sync(){}},wait:async()=>{},standUp(){eric.seated=false;},tween:async(_,step)=>step(1)};
 const w={restingMicrophone:{visible:true}},stage=createKaraokeStage(game,P,w);return {game,P,stage,w};
}
test('three named seats and actual queue/receipt state survive a serializable paused-scene restore',async()=>{
 const {stage,P,game}=fixture();assert.equal(await stage.act({state:'start'}),true);
 for(const [id,seat] of Object.entries(BOOTH_SEATS)){const r=id==='eric'?game.player:P.people[id];assert.equal(r.seated,true);assert.deepEqual(r.root.position.toArray(),[seat.x,seat.top,seat.z]);}
 await stage.act({state:'queue'});assert.equal(stage.snapshot().queue.length,3);
 await stage.act({state:'clearQueueExtras'});assert.deepEqual(stage.snapshot().queue,[{number:'0124',who:'kenji'}]);
 await stage.act({state:'receiptBack'});const saved=JSON.parse(JSON.stringify(stage.snapshot()));
 stage.leave();stage.restore(saved);assert.equal(stage.snapshot().receiptSide,'back');assert.deepEqual(stage.snapshot().held,saved.held);assert.deepEqual(stage.snapshot().people,saved.people);
 await stage.act({state:'selectNumber'});await stage.act({state:'selectNumber'});assert.equal(stage.snapshot().queue.filter(x=>x.number==='0718').length,1);await stage.act({state:'clearQueueExtras'});assert.deepEqual(stage.snapshot().queue,[{number:'0718',who:'kuroda'},{number:'0124',who:'kenji'}]);
});
test('cancelling a pending actual prop reach restores actors and wrappers and prevents late ownership changes',async()=>{
 const {stage,P,game,w}=fixture(),before={kenji:P.people.kenji.update,kuroda:P.people.kuroda.update,eric:game.player.update};
 const home=game.player.root.position.clone();await stage.act({state:'start'});
 let callback,resolve;game.tween=(_,step)=>{callback=step;return new Promise(r=>{resolve=r;});};
 const pending=stage.act({state:'receiptFront'});
 while(!callback)await Promise.resolve();callback(.4);stage.leave();assert.equal(await pending,false,'cancelled action must not report completion');callback(1);resolve();await Promise.resolve();
 assert.equal(stage.snapshot().active,false);assert.deepEqual(stage.snapshot().held,{});assert.equal(stage.props.root.visible,false);assert.equal(w.restingMicrophone.visible,true);assert.deepEqual(game.player.root.position.toArray(),home.toArray());
 for(const [id,fn]of Object.entries(before)){const r=id==='eric'?game.player:P.people[id];assert.equal(r.update,fn);assert.equal(r._noAvoid,undefined);}
 assert.equal(P.cam.yaw,.2);assert.equal(P.cam.elev,.8);
});
test('a new visit cannot continue a cancelled microphone pickup or duplicate its ownership',async()=>{
 const {stage,game}=fixture();await stage.act({state:'start'});
 let callback,resolve;game.tween=(_,step)=>{callback=step;return new Promise(r=>{resolve=r;});};
 const pending=stage.act({state:'takeMicrophone',who:'kenji'});while(!callback)await Promise.resolve();stage.leave();assert.equal(await pending,false,'cancelled action must not report completion');
 game.tween=async(_,step)=>step(1);await stage.act({state:'start'});callback(1);resolve();await Promise.resolve();assert.equal(stage.snapshot().micHolder,null);assert.deepEqual(stage.snapshot().held,{});
});
test('missing real participants rejects a start without revealing props or modifying existing people',async()=>{
 const {stage,P}=fixture();delete P.people.kuroda;await assert.rejects(stage.act({state:'start'}),/three actual participants/);assert.equal(stage.props.root.visible,false);assert.equal(stage.snapshot().active,false);
});
test('fresh Continue and inactive restore return avoidance flags to their own original values',async()=>{
 const first=fixture();await first.stage.act({state:'start'});const saved=JSON.parse(JSON.stringify(first.stage.snapshot()));
 const second=fixture();second.P.people.kenji._noAvoid=false;second.P.people.kuroda._noAvoid=true;
 second.stage.restore(saved);second.stage.update();second.stage.leave();
 assert.equal(second.P.people.kenji._noAvoid,false);assert.equal(second.P.people.kuroda._noAvoid,true);assert.equal(second.game.player._noAvoid,undefined);
 await second.stage.act({state:'start'});second.stage.restore(null);second.stage.update();
 assert.equal(second.P.people.kenji._noAvoid,false);assert.equal(second.P.people.kuroda._noAvoid,true);assert.equal(second.game.player._noAvoid,undefined);
});
test('handoffs measure the selected receiving wrist and preserve that side through Continue',async()=>{
 const {stage,P}=fixture();await stage.act({state:'start'});await stage.act({state:'takeMicrophone',who:'kenji'});await stage.act({state:'passMicrophone',who:'kuroda'});
 assert.equal(stage.snapshot().held.kuroda.side,'Left');const hand=P.people.kuroda.model.getObjectByName('LeftHand');
 assert.deepEqual(stage.moves.wrist(P.people.kuroda).toArray(),P.space.worldToLocal(hand.getWorldPosition(new THREE.Vector3())).toArray());
 const saved=JSON.parse(JSON.stringify(stage.snapshot()));stage.restore(saved);assert.equal(stage.snapshot().held.kuroda.side,'Left');
 assert.ok(stage.props.microphone.position.distanceTo(stage.moves.wrist(P.people.kuroda))<1e-7);
});
hook.deregister();
test('phone group shots cover the requested speaker or current holder, while desktop retains the trio',async()=>{
 const {stage,P}=fixture();await stage.act({state:'start'});P.camera.aspect=.46;
 await stage.act({state:'group'});assert.equal(stage.snapshot().shot.shot.point[0],P.people.kenji.root.position.x);
 P.people.kuroda.root.position.set(1.2,0,-.9);await stage.act({state:'group',who:'kuroda'});assert.deepEqual(stage.snapshot().shot.shot.point,[1.2,-.9]);
 await stage.act({state:'takeMicrophone',who:'kuroda'});await stage.act({state:'group'});assert.equal(stage.snapshot().shot.shot.point[0],P.people.kuroda.root.position.x);
 P.camera.aspect=1.6;await stage.act({state:'group'});assert.deepEqual(stage.snapshot().shot.shot.point,[0,-1.7]);stage.leave();
});

test('making room on a later visit retains Hamada without inventing an unqueued Kenji song',async()=>{
 const {stage}=fixture();await stage.act({state:'start'});await stage.act({state:'selectNumber'});await stage.act({state:'clearQueueExtras'});assert.deepEqual(stage.snapshot().queue,[{number:'0718',who:'kuroda'}]);stage.leave();
});
