import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({resolve(specifier,context,next) {
  return next(specifier === 'three' ? new URL('../../vendor/three/three.module.js',import.meta.url).href : specifier,context);
}});
const THREE = await import('three');
const {pavedGround} = await import('../../js/scenes/diorama/planting-ground.js');
function path(root,x,z,w,d,y=.1) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w,d).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial());
  mesh.position.set(x,y,z); mesh.userData.surf='concrete';root.add(mesh); return mesh;
}
test('meadow avoids actual paving beyond walkable bounds, leaving open lawn and raised planting',()=>{
  const root=new THREE.Group(); path(root,2,0,2,4);
  const paved=pavedGround(root,[-5,5,-5,5]);
  assert.equal(paved(new THREE.Vector3(2,0,1)),true);
  assert.equal(paved(new THREE.Vector3(0,0,1)),false);
  assert.equal(paved(new THREE.Vector3(2,.3,1)),false);
});
test('paving mask follows rotated adjacent chunks and ignores roofs and invisible floors',()=>{
  const world=new THREE.Group(), root=new THREE.Group(), adjacent=new THREE.Group();
  world.add(root);root.position.set(40,0,20);root.rotation.y=Math.PI/2; root.add(adjacent);
  adjacent.position.set(-1,0,2);adjacent.rotation.y=Math.PI/2;
  path(adjacent,0,0,2,4);path(root,3,0,2,2,4);path(root,-3,0,1,1).visible=false;
  const paved=pavedGround(root,[-5,5,-5,5]);
  assert.equal(paved(new THREE.Vector3(-2.5,0,2)),true);
  assert.equal(paved(new THREE.Vector3(-1,0,3.5)),false);
  assert.equal(paved(new THREE.Vector3(3,0,0)),false);
  assert.equal(paved(new THREE.Vector3(-3,0,0)),false);
});
