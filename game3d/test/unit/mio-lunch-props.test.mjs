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
const {mioLunchProps}=await import('../../js/places/mio-lunch/props.js');
const fixture=()=>{const space=new THREE.Group();return {space,props:mioLunchProps(space)};};
const worldScale=o=>o.getWorldScale(new THREE.Vector3()).toArray();
function near(actual,expected){assert.equal(actual.length,expected.length);actual.forEach((v,i)=>assert(Math.abs(v-expected[i])<1e-10,`${actual} != ${expected}`));}
test('missing and partial older saves preserve canonical resting prop parents and geometry',()=>{
 const {props}=fixture(),canonical=props.snapshot();
 props.restore();assert.equal(props.sticks.parent,props.food);assert.equal(props.pencil.parent,props.sheet);
 assert.deepEqual(props.snapshot().items,canonical.items);assert.equal(props.bite.visible,false);
 props.restore({visible:true,items:{cable:{...canonical.items.cable,position:[4.34,.225,-2.09]}}});
 assert.equal(props.sticks.parent,props.food);assert.equal(props.pencil.parent,props.sheet);
 assert.deepEqual(props.snapshot().items.sticks,canonical.items.sticks);
 assert.deepEqual(props.snapshot().items.pencil,canonical.items.pencil);
 near(worldScale(props.sticks),[1,1,1]);
});
test('resting and held chopsticks round-trip local and world scale along with their ownership',()=>{
 for(const held of [false,true]){
  const {space,props}=fixture();
  if(held){space.attach(props.sticks);props.sticks.position.set(5.7,.55,-2.2);props.sticks.rotation.set(0,.5,0);props.bite.visible=true;}
  const before=props.snapshot(),scale=worldScale(props.sticks),position=props.sticks.getWorldPosition(new THREE.Vector3()).toArray();
  const fresh=fixture().props;fresh.restore(JSON.parse(JSON.stringify(before)));
  assert.equal(fresh.sticks.parent,held?fresh.root:fresh.food);
  assert.deepEqual(fresh.snapshot().items.sticks,before.items.sticks);
  near(worldScale(fresh.sticks),scale);near(fresh.sticks.getWorldPosition(new THREE.Vector3()).toArray(),position);
  assert.equal(fresh.bite.visible,held);
 }
});
test('pre-scale saved utensils use the correct canonical scale for held versus resting parents',()=>{
 for(const held of [false,true]){
  const {space,props}=fixture();if(held)space.attach(props.sticks);
  const saved=props.snapshot();delete saved.items.sticks.scale;
  const restored=fixture().props;restored.restore(saved);near(worldScale(restored.sticks),[1,1,1]);
 }
});
