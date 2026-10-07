import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from '../../vendor/three/three.module.js';
import {poolOutfitSlot} from '../../js/places/day3/pool-outfit-slot.js';
function fixture(){
 const parent=new THREE.Group(),root=new THREE.Group(),model=new THREE.Group(),holder=new THREE.Group(),blob=new THREE.Mesh();
 parent.position.set(30,4,20);parent.rotation.y=.8;root.position.set(-4,.2,9);root.rotation.set(.2,.9,0);root.scale.setScalar(1.2);
 parent.add(root);root.add(holder,blob);holder.add(model);
 let state='idle';const actor={id:'eric',root,model,seated:false,scripted:false,update(){},setState(s){state=s;},get state(){return state;}};
 return {actor,parent,blob,holder};
}
function body(root){const model=new THREE.Group();root.add(model);let state='idle';return {root,model,update(){},setState(s){state=s;},get state(){return state;},sitAt(x,y,z){root.position.set(x,y,z);}};}
test('pool outfit preparation isolates and restores transformed parent/root and child ownership',()=>{
 const {actor,parent,holder,blob}=fixture(),root=actor.root,position=root.position.clone(),quaternion=root.quaternion.clone(),scale=root.scale.clone();
 const original=actor.update;
 const slot=poolOutfitSlot(actor,r=>{assert.equal(r,root);assert.equal(r.parent,null);assert.deepEqual(r.position.toArray(),[0,0,0]);assert.deepEqual(r.scale.toArray(),[1,1,1]);assert.equal(r.children.length,0);return body(r);});
 assert.equal(root.parent,parent);assert.ok(root.position.equals(position));assert.ok(root.quaternion.equals(quaternion));assert.ok(root.scale.equals(scale));assert.deepEqual(root.children,[holder,blob]);
 slot.set(true);assert.equal(actor.root,root);assert.equal(blob.parent,root);assert.equal(holder.parent,null);assert.notEqual(actor.update,original);
 actor.sitAt(3,.3,4);assert.deepEqual(root.position.toArray(),[3,.3,4]);actor.setState('walk');assert.equal(actor.state,'walk');
 slot.set(false);assert.equal(actor.update,original);assert.equal(actor.model,holder.children[0]);assert.equal(holder.parent,root);assert.equal(blob.parent,root);assert.equal(actor.sitAt,undefined);
 slot.dispose();assert.equal(actor.update,original);
});
test('failed outfit construction restores original root, children and methods',()=>{
 const {actor,parent,holder,blob}=fixture(),root=actor.root,position=root.position.clone(),original=actor.update;
 assert.throws(()=>poolOutfitSlot(actor,r=>{r.add(new THREE.Group());throw Error('invalid candidate');}),/invalid candidate/);
 assert.equal(root.parent,parent);assert.deepEqual(root.children,[holder,blob]);assert.ok(root.position.equals(position));assert.equal(actor.update,original);
});
test('NPC decorations and getters switch repeatedly without retaining old appearance helpers',()=>{
 const {actor}=fixture(),ordinary=actor.model;let count=0;
 const slot=poolOutfitSlot(actor,body,a=>{count++;a.head=new THREE.Object3D();a.model.add(a.head);a.lap=new THREE.Object3D();a.root.add(a.lap);});
 slot.set(true);const head=actor.head,model=actor.model;slot.set(false);assert.equal(actor.head,undefined);assert.equal(actor.model,ordinary);
 slot.set(true);assert.equal(actor.head,head);assert.equal(actor.model,model);assert.equal(count,1);slot.dispose();assert.equal(actor.head,undefined);assert.equal(actor.model,ordinary);
});
test('procedural player fallback keeps one visible body and restores its rig surface',()=>{
 const {actor,holder,blob}=fixture();actor.rig={root:holder};delete actor.model;
 const rig=actor.rig,slot=poolOutfitSlot(actor,body);slot.set(true);
 assert.equal(actor.rig,undefined);assert.equal(holder.parent,null);assert.equal(blob.parent,actor.root);
 slot.dispose();assert.equal(actor.rig,rig);assert.equal(holder.parent,actor.root);assert.equal(actor.model,undefined);
});
