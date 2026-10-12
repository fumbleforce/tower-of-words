import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({resolve(specifier,context,next) {
  return next(specifier === 'three' ? new URL('../../vendor/three/three.module.js',import.meta.url).href : specifier,context);
}});
Object.assign(globalThis,{window:{},location:{search:''},addEventListener(){},innerWidth:1366,innerHeight:860,document:{body:{classList:{contains:()=>false,toggle(){}}},documentElement:{style:{setProperty(){}}}}});
const {clearTreeSite,islandTreeSpots}=await import('../../js/scenes/distant-trees.js');
const layout=await import('../../js/scenes/island-layout.js');
test('distant crowns leave rectangular, circular and polyline paths clear',()=>{
  const L={BUILDINGS:[{rect:[0,0,2,2]}],PATHS:[{circle:[10,0,2]},{points:[[0,10],[20,10]],width:2},{line:[[20,0],[20,10]],w:2},{rect:[30,0,34,2]}]};
  for(const [x,z] of [[3,1],[13,0],[5,12],[22,5],[35,1]])assert.equal(clearTreeSite(L,x,z,1),false,`${x},${z}`);
  assert.equal(clearTreeSite(L,15,5,1),true);
});
test('island tree sites are deterministic, cached and clear of actual layout paths',()=>{
  const trees=islandTreeSpots(layout);
  assert.equal(islandTreeSpots(layout),trees);
  assert.ok(trees.length>100);
  for(const t of trees)assert.ok(clearTreeSite(layout,t.x,t.z,t.r));
});
