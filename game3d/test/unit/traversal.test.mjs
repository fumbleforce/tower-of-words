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
 add(0,0.2,0,1,0.4,0.5); // bench seat
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
