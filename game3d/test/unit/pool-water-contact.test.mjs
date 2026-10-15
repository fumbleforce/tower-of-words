import assert from 'node:assert/strict';
import {test} from 'node:test';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){return next(s==='three'?new URL('../../vendor/three/three.module.js',import.meta.url).href:s,c);}});
globalThis.location={search:''};
globalThis.addEventListener=()=>{};
globalThis.window={};
globalThis.document={body:{classList:{contains:()=>false,toggle(){}}},documentElement:{style:{setProperty(){}}}};
const T=await import('../../vendor/three/three.module.js');
const {poolWater,poolWaterContact}=await import('../../js/scenes/sports/pool-water.js');
test('one shared pool surface follows true transformed heading, clears dry contacts and resets restored state',()=>{
  const root=new T.Group(),island=new T.Group();root.position.set(20,2,-15);root.rotation.y=.42;root.add(island);island.position.set(-60,0,50);
  const surface=poolWater(island),mesh=root.getObjectByName('pool:water'),uniforms=mesh.material.uniforms,fx=poolWaterContact(root);
  const rig={root:new T.Group()};root.add(rig.root);rig.root.position.set(mesh.position.x-60,0,mesh.position.z+50);
  root.updateMatrixWorld(true);
  const array=uniforms.uSwimmers.value,values=[...array],geometry=mesh.geometry;
  for(const yaw of [0,Math.PI,Math.PI/2,-Math.PI/2]){
    rig.root.rotation.y=yaw;root.updateMatrixWorld(true);fx.set(0,rig,'swim');
    assert.ok(Math.abs(array[0].x)<1e-5&&Math.abs(array[0].y)<1e-5);
    assert.ok(Math.abs(Math.sin(array[0].z)-Math.sin(yaw))<1e-5&&Math.abs(Math.cos(array[0].z)-Math.cos(yaw))<1e-5);
    assert.equal(array[0].w,2);
  }
  fx.set(1,rig,'tread');assert.equal(array[1].w,1);
  fx.update(.05);assert.equal(uniforms.uTime.value,.05);
  fx.set(0,rig,null);assert.equal(array[0].w,0);
  rig.root.visible=false;fx.set(1,rig,'tread');assert.equal(array[1].w,0);
  rig.root.visible=true;fx.set(2,rig,'swim');fx.clear();
  assert.ok(array.every(v=>v.w===0));assert.equal(uniforms.uTime.value,0);
  fx.set(0,rig,'tread');assert.equal(array[0].w,1,'new wet restore starts from new actual state');
  assert.equal(mesh.geometry,geometry);assert.equal(uniforms.uSwimmers.value,array);assert.ok(values.every((v,i)=>array[i]===v));
  surface.onPeriod('evening');assert.equal(uniforms.uLight.value,.74);surface.onPeriod('morning');assert.equal(uniforms.uLight.value,1);
  assert.equal(root.getObjectsByProperty('isMesh',true).length,1,'surface and every contact remain one mesh');
});
