import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({ resolve(s,c,next) { return next(s==='three' ? new URL('../../vendor/three/three.module.js',import.meta.url).href : s,c); } });
const T=await import('three');
const {createTraversal}=await import('../../js/movement/traversal.js');
function world() {
 const space=new T.Group();
 const add=(x,y,z,w,h,d,material=new T.MeshStandardMaterial())=>{
  const m=new T.Mesh(new T.BoxGeometry(w,h,d),material);m.position.set(x,y,z);space.add(m);return m;
 };
 add(0,-0.1,0,8,0.2,8);
 add(0,0.35,0,1,0.1,0.5); // bench seat
 add(2,0.05,0,0.16,0.1,5); // small curb
 add(3,1,0,0.2,2,4); // solid wall
 add(-5,-0.6,0,2,0.2,6); // lower beach
 return {space,add};
}
test('visible bench is solid at shin height and supports feet above its seat',()=>{
 const p=world(), t=createTraversal(p);
 assert.deepEqual(t.collide(-0.4,0,-0.8,0,0,1,false),[-0.8,0]);
 assert.deepEqual(t.collide(-0.4,0,-0.8,0,0.55,1,true),[-0.4,0]);
 assert.ok(Math.abs(t.support(0,0,0.8)-0.4)<1e-6);
 assert.ok(Math.abs(t.support(-5,0,0.5)+0.5)<1e-6);
});
test('curbs step across but full height walls and glass stop the body',()=>{
 const p=world();p.add(-2,1,1,0.1,2,2,new T.MeshStandardMaterial({transparent:true,opacity:0.4}));
 const t=createTraversal(p);
 assert.deepEqual(t.collide(2.05,2,1.75,2,0,1,false),[2.05,2]);
 assert.deepEqual(t.collide(3,2,2.6,2,0.7,1,true),[2.6,2]);
 assert.deepEqual(t.collide(-2,1,-2.4,1,0,1,false),[-2.4,1]);
});
test('instanced solids and transformed place frames retain their physical surfaces',()=>{
 const p=world();p.space.position.set(50,7,-30);p.space.rotation.y=0.7;
 const inst=new T.InstancedMesh(new T.BoxGeometry(0.6,0.6,0.6),new T.MeshStandardMaterial(),1);
 inst.setMatrixAt(0,new T.Matrix4().makeTranslation(1,0.3,1));p.space.add(inst);
 const t=createTraversal(p);
 assert.ok(Math.abs(t.support(1,1,1)-0.6)<1e-6);
 assert.deepEqual(t.collide(1,1,0.5,1,0,1,false),[0.5,1]);
});
test('decorative shadows and actors never become support or static obstacles',()=>{
 const p=world(); const actor=p.add(1,1,-1,0.5,2,0.5);
 p.add(1,1,2,1,0.1,1,new T.MeshBasicMaterial({transparent:true,depthWrite:false}));
 const t=createTraversal(p,[actor]);
 assert.ok(Math.abs(t.support(1,-1,3))<1e-6);
 assert.ok(Math.abs(t.support(1,2,3))<1e-6);
 assert.equal(t.support(20,20,1),null);
});
test('moved and opened doors follow their current transforms and visibility',()=>{
 const p=world(),door=p.add(-1,1,2,.1,2,1),t=createTraversal(p);
 assert.equal(t.free(-1,2,-1.4,2,0,1,false),false);
 door.position.x=-3;t.refresh();
 assert.equal(t.free(-1,2,-1.4,2,0,1,false),true);
 assert.equal(t.free(-3,2,-3.4,2,0,1,false),false);
 door.visible=false;
 assert.equal(t.free(-3,2,-3.4,2,0,1,false),true);
});
test('shadow proxies and map-only geometry are excluded; hidden camera enclosures remain solid',()=>{
 const p=world(),proxy=p.add(-1,1,2,.1,2,1),map=p.add(-2,1,2,.1,2,1);
 proxy.raycast=()=>{};map.layers.set(2);
 const wall=p.add(-3,1,2,.1,2,1);wall.visible=false;wall.userData.followEnclosure={};
 const t=createTraversal(p);
 assert.equal(t.free(-1,2,-1.4,2,0,1,false),true);
 assert.equal(t.free(-2,2,-2.4,2,0,1,false),true);
 assert.equal(t.free(-3,2,-3.4,2,0,1,false),false);
});
test('opaque water triangles do not support feet and jumping meets a solid low ceiling',()=>{
 const p=world(),water=p.add(-5,-.3,0,2,.01,6);
 water.userData.noTraversal=true;
 const ceiling=p.add(0,1.8,2,2,.1,2),t=createTraversal(p);
 assert.ok(Math.abs(t.support(-5,0,0.5)+.5)<1e-6);
 assert.equal(t.free(0,2,0,2,.1,1,true),true);
 assert.equal(t.free(0,2,0,2,.7,1,true),false);
 assert.ok(ceiling);
});

test('geometry attached after a place loads joins the physical index',()=>{
 const p=world(),t=createTraversal(p);
 p.add(-1,1,2,.1,2,1);t.refresh();
 assert.equal(t.free(-1,2,-1.4,2,0,1,false),false);
});

test('a pool aperture removes covered deck/water support while coping outside remains solid',()=>{
 const p=world();p.space.userData.traversalVoids=[{min:[-.8,-20,1],max:[.8,.2,3]}];
 const t=createTraversal(p);
 assert.equal(t.support(0,2,1),null);
 assert.ok(Math.abs(t.support(1,2,1))<1e-6);
});
test('render-batched originals on unsigned layer31 retain physical geometry',()=>{
 const p=world(),door=p.add(-1,1,2,.1,2,1);door.layers.set(31);
 assert.equal(createTraversal(p).free(-1,2,-1.4,2,0,1,false),false);
});

test('an old route corner is repaired around a visible open door leaf',()=>{
 const space=new T.Group();
 const floor=new T.Mesh(new T.BoxGeometry(8,.1,8),new T.MeshStandardMaterial());floor.position.y=-.05;space.add(floor);
 const flap=new T.Mesh(new T.BoxGeometry(.1,.5,.55),new T.MeshStandardMaterial());flap.position.set(-.58,.45,-.27);space.add(flap);
 const t=createTraversal({space}),a=[-.5,.7],b=[-.35,-.85];
 assert.equal(t.clear(a,b,0,1.18),false);
 const path=t.route(a,[b],0,1.18);
 assert.ok(path.length>1);
 let prev=a;for(const next of path){assert.equal(t.clear(prev,next,0,1.18),true);prev=next;}
});

test('platform sibling follows moving place frame while retaining world support',()=>{
 const scene=new T.Scene(),space=new T.Group(),station=new T.Group();scene.add(space,station);
 const floor=new T.Mesh(new T.BoxGeometry(2,.2,2),new T.MeshStandardMaterial());floor.position.set(3,-.1,0);station.add(floor);
 const t=createTraversal({space,traversalRoots:[station]});
 assert.ok(Math.abs(t.support(3,0,.3))<1e-6);
 space.position.x=1;t.refresh();
 assert.ok(Math.abs(t.support(2,0,.3))<1e-6);
 assert.equal(t.support(4,0,.3),null);
 station.position.x=2;t.refresh();
 assert.ok(Math.abs(t.support(4,0,.3))<1e-6);
});
