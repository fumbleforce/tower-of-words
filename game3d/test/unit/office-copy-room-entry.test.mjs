import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({resolve(s,c,next){return next(s==='three'?new URL('../../vendor/three/three.module.js',import.meta.url).href:s.startsWith('three/addons/')?new URL('../../vendor/'+s.slice(13),import.meta.url).href:s,c);}});
globalThis.location={search:''};
const T=await import('three');
const {officeWalls}=await import('../../js/scenes/office-enclosure.js');
const {createTraversal}=await import('../../js/movement/traversal.js');

for (const mode of ['overview', 'follow']) {
 test(`B2 copy-room aperture clears the player capsule in both directions in ${mode}`,()=>{
  const space=new T.Group();
  const W=officeWalls(space,{x0:-7,x1:7,z0:-6.4,z1:6.4});
  W('x',-7,7,2.4,0.7,0.16,{holes:[[-4.4,-3.6,0,0.7]]});
  space.getObjectByName('follow-interior').visible=mode==='follow';
  const traversal=createTraversal({space});
  // The report's position: Carina at (-4.03, 0, 2.14). Both protagonists use scale 1.18.
  assert.equal(traversal.free(-4.03,2.85,-4.03,2.14,0.012,1.18,false),true);
  assert.equal(traversal.free(-4.03,2.14,-4.03,2.85,0.012,1.18,false),true);
  assert.equal(traversal.free(-4.6,2.85,-4.6,2.14,0.012,1.18,false),false,'adjacent wall remains solid');
  assert.equal(traversal.free(-4.03,2.85,-4.03,2.14,0.4,1.18,true),false,'door header still blocks a high jump');
 });
}
