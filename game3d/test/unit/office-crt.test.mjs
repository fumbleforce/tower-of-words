import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({resolve(s,c,next){
 if(s==='three')s=new URL('../../vendor/three/three.module.js',import.meta.url).href;
 else if(s.startsWith('three/addons/'))s=new URL('../../vendor/'+s.slice('three/addons/'.length),import.meta.url).href;
 return next(s,c);
}});
globalThis.location={search:''};
globalThis.document={createElement(){return {getContext(){return new Proxy({}, {get:()=>()=>{}});}};}};
const THREE=await import('../../vendor/three/three.module.js');
const {crtHousing}=await import('../../js/look/crt.js');
const {plainMonitor,rbox,mat}=await import('../../js/props.js');
const {monitor}=await import('../../js/look/detail.js');
const screen=g=>g.children.find(c=>c.geometry?.type==='PlaneGeometry');
const shape=g=>g.children.map(c=>({type:c.geometry?.type,position:c.position.toArray(),parameters:c.geometry?.parameters,color:c.material?.color?.getHex()}));
test('unopted plain and detailed monitors retain exact default geometry',()=>{
 for(const build of [plainMonitor,monitor])assert.deepEqual(shape(build({on:false})),shape(build({on:false,crt:false})));
});
test('CRT housing keeps the original screen object, material and local transform',()=>{
 const g=plainMonitor({kind:'term'}),s=screen(g),material=s.material,transform=s.matrix.clone(),position=s.position.clone();
 crtHousing(g,rbox,mat);
 assert.equal(screen(g),s);assert.equal(s.material,material);assert.deepEqual(s.matrix,transform);assert.deepEqual(s.position,position);
 assert.equal(g.userData.crt,true);
});
test('office CRT bodies have substantial depth, fit the island gap and leave screen exposed',()=>{
 for(const build of [plainMonitor,monitor]){
  const old=screen(build({on:false})),g=build({on:false,crt:true}),s=screen(g);
  assert.deepEqual(s.position,old.position);assert.deepEqual(s.geometry.parameters,old.geometry.parameters);
  const bounds=new THREE.Box3().setFromObject(g),size=bounds.getSize(new THREE.Vector3());
  assert(size.z>.20);assert(bounds.min.z>=-.21,'opposed desk backs must not intersect');
  const body=g.children.find(c=>c.geometry?.type==='BoxGeometry'&&c.geometry.parameters.depth===.205);
  assert(new THREE.Box3().setFromObject(body).max.z<s.position.z,'live screen remains in front of tube housing');
 }
});
test('opposed office CRT housings do not intersect across the original desk island',()=>{
 const north=monitor({crt:true,on:false}),south=monitor({crt:true,on:false});
 north.rotation.y=Math.PI;north.position.set(0,.42,-3.72+.14);south.position.set(0,.42,-3-.14);
 const a=new THREE.Box3().setFromObject(north),b=new THREE.Box3().setFromObject(south);
 assert(a.max.z<b.min.z,'tube backs retain an actual gap');
});
