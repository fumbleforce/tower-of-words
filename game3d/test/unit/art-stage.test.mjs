import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {test} from 'node:test';
registerHooks({resolve(s,c,next){if(s==='three')return next(new URL('../../vendor/three/three.module.js',import.meta.url).href,c);if(s.startsWith('three/addons/'))return next(new URL('../../vendor/'+s.slice(13),import.meta.url).href,c);return next(s,c);}});
globalThis.location={search:''};
globalThis.window=globalThis;globalThis.addEventListener=()=>{};
globalThis.document={createElement(){return {width:0,height:0,getContext(){return {fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},createRadialGradient(){return {addColorStop(){}};}};}};}};
const THREE=await import('../../vendor/three/three.module.js');
const {createArtStage}=await import('../../js/places/ongoing/art-stage.js');
const {buildCommons}=await import('../../js/scenes/rooms/commons.js');
const {ART_SEATS}=await import('../../js/places/ongoing/art-props.js');
function rig(){const root=new THREE.Group();return {root,seated:false,update(){},setState(){},sitAt(x,y,z,ry){root.position.set(x,y,z);root.rotation.y=ry;}};}
function fixture(){const player=rig(),mori=rig(),space=new THREE.Group();space.add(player.root,mori.root);const cam={yaw:0,elev:1,fitDist:12,release(){this.close=null;},closeOn(p,zoom,y){this.close={point:p,zoom,y};}};const P={space,people:{mori},cam,nav:{free:()=>true}};const game={player,place:P,walker:{sync(){}},tween:async(_,f)=>f(1),wait:async()=>{}};return {P,game,stage:createArtStage(game,P)};}
test('art narrative entry requires an explicitly approved loaded photograph',async()=>{
 const f=fixture();assert.equal(f.stage.ready(),false);await assert.rejects(f.stage.act({state:'begin'}),/photograph/);assert.equal(f.stage.props.root.visible,false);
 f.stage.setPhotograph(new THREE.Texture({width:100,height:60}));assert.equal(f.stage.ready(),false);
 f.stage.setPhotograph(new THREE.Texture({width:100,height:60}),{approved:true});assert.equal(f.stage.ready(),true);
});
test('both actual table chairs have safe connected approaches outside blocked seats',()=>{
 const w=buildCommons();for(const s of Object.values(ART_SEATS)){assert.ok(!w.nav.free(s.x,s.z));assert.ok(w.nav.free(...s.out,.2),JSON.stringify(s));assert.ok(w.nav.path(...w.door.in,...s.out)?.length);}
});
test('saved activity and camera restore without retaining rig objects; legacy load clears activity',()=>{
 const f=fixture();f.stage.setPhotograph(new THREE.Texture({width:10,height:10}),{approved:true});
 const state={active:true,prior:null,drawing:'slope',shot:{shot:{point:[0,-2.7],distance:4,y:.5,yaw:.2,elev:.8},home:{yaw:0,elev:1}},people:{},props:{}};
 f.stage.restore(state);f.stage.update();assert.equal(f.P.cam.yaw,.2);assert.equal(f.P.cam.elev,.8);assert.equal(JSON.parse(JSON.stringify(f.stage.snapshot())).drawing,'slope');
 f.stage.leave();assert.equal(f.P.cam.close,null);assert.equal(f.P.cam.yaw,0);f.stage.restore(null);assert.equal(f.stage.snapshot().active,false);
});
test('leaving an in-flight drawing cancels late arm writes and restores original actors',async()=>{
 const f=fixture();f.stage.setPhotograph(new THREE.Texture({width:10,height:10}),{approved:true});
 const before={mori:f.P.people.mori.update,player:f.game.player.update};
 const {snapshotPeople}=await import('../../js/places/saved-people.js');
 const prior=snapshotPeople({mori:f.P.people.mori,eric:f.game.player});
 f.stage.restore({active:true,prior,drawing:'blank',people:{},props:{}});
 let step,finish;f.game.tween=(_,cb)=>{step=cb;return new Promise(r=>{finish=r;});};
 const pending=f.stage.act({state:'firstPage'});await Promise.resolve();
 assert.notEqual(f.P.people.mori.update,before.mori);step(.25);f.stage.leave();step(.9);finish();await pending;
 assert.equal(f.P.people.mori.update,before.mori);assert.equal(f.game.player.update,before.player);assert.equal(f.stage.snapshot().active,false);
 assert.equal(f.stage.props.root.children.length,f.stage.props.items.length,'all held props returned to owned root');
});
test('teapot stays on a real wrist across the dialogue pause and serialized Continue',async()=>{
 const f=fixture();for(const r of [f.game.player,f.P.people.mori]){
  const arm=new THREE.Bone();arm.name='RightArm';arm.position.set(0,.65,0);const fore=new THREE.Bone();fore.name='RightForeArm';fore.position.set(0,-.23,0);const hand=new THREE.Bone();hand.name='RightHand';hand.position.set(0,-.23,0);r.root.add(arm);arm.add(fore);fore.add(hand);
 }
 f.game.player.root.position.set(.5,0,-3.25);f.P.people.mori.root.position.set(-.4,0,-3.25);
 f.stage.setPhotograph(new THREE.Texture({width:10,height:10}),{approved:true});f.stage.restore({active:true,drawing:'blank',people:{},props:{}});
 await f.stage.act({state:'takeTea'});const saved=JSON.parse(JSON.stringify(f.stage.snapshot()));assert.equal(saved.held[0].who,'eric');
 const wrist=f.game.player.root.getObjectByName('RightHand'),point=()=>f.P.space.worldToLocal(wrist.getWorldPosition(new THREE.Vector3()));
 assert.ok(f.stage.props.pot.position.distanceTo(point())<1e-6);
 f.stage.restore(saved);f.game.player.update(.1);assert.ok(f.stage.props.pot.position.distanceTo(point())<1e-6);
 f.stage.leave();assert.equal(f.stage.props.pot.parent,f.stage.props.root);
});
test('early practice draws only the player page and preserves it through serialization',async()=>{
 const f=fixture();f.stage.setPhotograph(new THREE.Texture({width:10,height:10}),{approved:true});f.stage.restore({active:true,drawing:'blank',people:{},props:{}});
 await f.stage.act({state:'drawTogether'});const saved=JSON.parse(JSON.stringify(f.stage.snapshot()));assert.equal(saved.drawing,'blank');assert.equal(saved.playerDrawing.kind,'slope');
 const restored=fixture();restored.stage.setPhotograph(new THREE.Texture({width:10,height:10}),{approved:true});restored.stage.restore(saved);assert.equal(restored.stage.props.player.snapshot().kind,'slope');assert.equal(restored.stage.props.mori.snapshot().kind,'blank');
});
