import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {test} from 'node:test';
registerHooks({resolve(s,c,next){if(s==='three')return next(new URL('../../vendor/three/three.module.js',import.meta.url).href,c);if(s.startsWith('three/addons/'))return next(new URL('../../vendor/'+s.slice(13),import.meta.url).href,c);return next(s,c);}});
globalThis.window=globalThis;globalThis.location={search:''};globalThis.addEventListener=()=>{};
globalThis.document={createElement(){return {getContext(){return new Proxy({measureText:()=>({width:20}),createRadialGradient:()=>({addColorStop(){}})}, {get:(o,k)=>k in o?o[k]:()=>{}});}};}};
const THREE=await import('../../vendor/three/three.module.js');
const {createWinterStage}=await import('../../js/places/ongoing/winter-stage.js');
const {WINTER_SPOTS:S}=await import('../../js/places/ongoing/winter-props.js');
const {buildGym}=await import('../../js/scenes/rooms/gym.js');
function rig(){const root=new THREE.Group(),arm=new THREE.Bone(),fore=new THREE.Bone(),hand=new THREE.Bone();arm.name='RightArm';fore.name='RightForeArm';hand.name='RightHand';arm.position.y=.9;fore.position.y=-.24;hand.position.y=-.23;root.add(arm);arm.add(fore);fore.add(hand);return {root,update(){},setState(){}};}
function fixture(){const player=rig(),people={kuro:rig(),emi:rig(),attendant:rig()},space=new THREE.Group();space.add(player.root,...Object.values(people).map(r=>r.root));
 const cam={yaw:0,elev:1,fitDist:20,release(){this.close=null;},closeOn(point,zoom,y){this.close={point,zoom,y};}};
 const P={space,people,cam,camera:{aspect:1.6},nav:{free:()=>true}},game={player,place:P,walker:{sync(){}},tween:async(_,f)=>{for(let k=0;k<=10;k++)f(k/10);},wait:async()=>{}};
 return {game,P,stage:createWinterStage(game,P)};
}
test('all winter drill/organizer approaches connect through the real gym, never through the net',()=>{
 const w=buildGym();for(const [id,at] of Object.entries(S)){if(id==='sheet')continue;assert.ok(w.nav.free(...at,.2),id);assert.ok(w.nav.path(...w.door.in,...at)?.length,id);}
 assert.equal(w.nav.free(-1.1,-10.75),false);assert.ok(!w.nav.clear(S.kuro,S.eric),'actors must route around the net');
});
test('ordinary organizer paper is not taken from Emi or mutated by the special handoff',async()=>{
 const f=fixture();const prior=f.stage.snapshot();f.stage.restore({active:true,people:{},props:{},held:[{id:'attendant',item:'winter-organizer-sheet',target:null}]});
 const before=JSON.stringify(f.stage.snapshot().held);await f.stage.act({state:'sheetBack'});assert.equal(JSON.stringify(f.stage.snapshot().held),before);f.stage.leave();assert.equal(f.stage.snapshot().active,false);assert.equal(prior.active,false);
});
test('winter restore keeps actual hand ownership, serializable camera and native actor wrappers',()=>{
 const f=fixture(),base=f.P.people.emi.update;
 f.stage.restore({active:true,people:{},props:{},held:[{id:'emi',item:'winter-organizer-sheet',target:[.2,.7,0]}],shot:{shot:{point:[0,-8],distance:6,y:.7,yaw:.2,elev:.6},home:{yaw:0,elev:1}}});
 const hand=f.P.people.emi.root.getObjectByName('RightHand');f.P.people.emi.update(.1);assert.ok(f.stage.props.paper.position.distanceTo(hand.getWorldPosition(new THREE.Vector3()))<1e-6);
 const saved=JSON.parse(JSON.stringify(f.stage.snapshot()));f.stage.restore(saved);f.stage.update();assert.equal(f.P.cam.yaw,.2);assert.equal(f.stage.snapshot().held[0].id,'emi');f.stage.leave();assert.equal(f.P.people.emi.update,base);assert.equal(f.P.cam.yaw,0);assert.equal(f.stage.props.paper.parent,f.stage.props.root);
});
test('actual racket flights clear the existing net and meet both real contact points',async()=>{
 const f=fixture(),{winterActions}=await import('../../js/places/ongoing/winter-actions.js'),{poolAction}=await import('../../js/places/day3/pool-action.js');
 f.P.people.kuro.root.position.set(S.kuro[0],0,S.kuro[1]);f.P.people.kuro.root.rotation.y=Math.PI/2;f.game.player.root.position.set(S.eric[0],0,S.eric[1]);f.game.player.root.rotation.y=-Math.PI/2;
 const action=poolAction(f.game),moves=winterActions(f.game,f.P,f.stage.props,action),flights=[];
 f.game.tween=async(seconds,step)=>{const positions=[];for(let i=0;i<=60;i++){step(i/60);positions.push(f.stage.props.shuttle.position.toArray());}if(seconds===1.1)flights.push(positions);};
 await action.run(()=>moves.rally('eric'));
 assert.equal(flights.length,2);for(const flight of flights){const crossing=flight.filter(p=>Math.abs(p[0]+1.1)<.2);assert.ok(crossing.length);assert.ok(crossing.every(p=>p[1]>1.08&&p[1]<2.1),'flight clears net below the room ceiling');}
 const tip=moves.point(f.stage.props.rackets.kuro.contact);assert.ok(f.stage.props.shuttle.position.distanceTo(tip)<1e-6,'final contact reaches receiver racket');moves.dispose();
});
test('readiness requires visible real hand rigs and never reveals props when a participant is absent',async()=>{
 const f=fixture();assert.equal(f.stage.ready,true);f.P.people.attendant.root.visible=false;assert.equal(f.stage.ready,false);
 await assert.rejects(f.stage.act({state:'begin'}),/cast unavailable/);assert.equal(f.stage.props.root.visible,false);assert.equal(f.stage.snapshot().active,false);
});
test('cancelling an actual in-flight racket action cannot restore a late hand overlay or shuttle',async()=>{
 const f=fixture(),{winterActions}=await import('../../js/places/ongoing/winter-actions.js'),{poolAction}=await import('../../js/places/day3/pool-action.js');
 const action=poolAction(f.game),moves=winterActions(f.game,f.P,f.stage.props,action),original=f.P.people.kuro.update;
 let callback,finish;f.game.tween=(_,step)=>{callback=step;return new Promise(resolve=>{finish=resolve;});};
 const pending=action.run(()=>moves.demonstrate());while(!callback)await Promise.resolve();callback(.4);
 action.cancel();moves.dispose();f.stage.props.reset();await pending;callback(1);finish();await Promise.resolve();
 assert.equal(f.P.people.kuro.update,original);assert.equal(f.stage.props.shuttle.visible,false);assert.deepEqual(moves.snapshot(),[]);assert.equal(f.stage.props.rackets.kuro.root.parent,f.stage.props.root);
});
test('opposite paper edge grips preserve the visible sheet when ownership changes',()=>{
 const {stage}=fixture(),p=stage.props;p.paper.position.set(-6.7,.6,-7.7);p.paper.rotation.y=-Math.PI/2;p.paperGrip('emi');
 const center=p.paperCard.getWorldPosition(new THREE.Vector3()),receive=p.paperGrips.attendant.getWorldPosition(new THREE.Vector3());
 assert.ok(p.paperGrips.emi.getWorldPosition(new THREE.Vector3()).distanceTo(p.paper.position)<1e-9);
 const inCard=p.paperCard.worldToLocal(receive.clone());assert.ok(Math.abs(Math.abs(inCard.x)-.115)<1e-9);assert.ok(Math.abs(inCard.y)<=.15&&Math.abs(inCard.z)<1e-9,'receiving grip is on the actual paper edge');
 p.paper.position.copy(receive);p.paper.rotation.y=Math.PI/2;p.paperGrip('attendant');
 assert.ok(p.paperCard.getWorldPosition(new THREE.Vector3()).distanceTo(center)<1e-9,'the paper does not jump when held at the opposite edge');
 assert.ok(p.paperGrips.attendant.getWorldPosition(new THREE.Vector3()).distanceTo(receive)<1e-9);
});
