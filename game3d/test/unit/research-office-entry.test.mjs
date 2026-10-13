import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({resolve(s,c,next){return next(s==='three'?new URL('../../vendor/three/three.module.js',import.meta.url).href:s.startsWith('three/addons/')?new URL('../../vendor/'+s.slice(13),import.meta.url).href:s,c);}});
globalThis.location={search:''};
const T=await import('three');
const {officeWalls,officeEntryFrame,OFFICE_DOOR_HEIGHT}=await import('../../js/scenes/office-enclosure.js');
const {createTraversal}=await import('../../js/movement/traversal.js');
test('ordinary office doorway clears the office-scaled player in both directions',()=>{
 const space=new T.Group(),W=officeWalls(space,{x0:-7,x1:7,z0:-6.4,z1:6.4});
 W('x',-4.2,3.4,.2,1.45,.16,{holes:[[-.8,.3,0,OFFICE_DOOR_HEIGHT]]});
 officeEntryFrame(space,.2,.16,new T.MeshStandardMaterial());
 const traversal=createTraversal({space});
 assert.equal(traversal.free(-.25,-.2,-.25,.7,0,1.18,false),true);
 assert.equal(traversal.free(-.25,.7,-.25,-.2,0,1.18,false),true);
 assert.equal(traversal.free(-1,-.2,-1,.7,0,1.18,false),false,'adjacent wall stays solid');
});
