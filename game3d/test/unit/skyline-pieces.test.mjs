import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({resolve(specifier,context,next) {
  if(specifier.startsWith('three/addons/'))return next(new URL('../../vendor/'+specifier.slice(13),import.meta.url).href,context);
  return next(specifier === 'three' ? new URL('../../vendor/three/three.module.js',import.meta.url).href : specifier,context);
}});
Object.assign(globalThis,{window:{},location:{search:''},addEventListener(){},innerWidth:1366,innerHeight:860,document:{body:{classList:{contains:()=>false,toggle(){}}},documentElement:{style:{setProperty(){}}}}});
const {skylinePieces,skylinePieceId}=await import('../../js/scenes/skyline-pieces.js');
const {farModelSteps}=await import('../../js/scenes/far-model.js');
const layout=await import('../../js/scenes/island-layout.js');
const building=layout.BUILDINGS.find(b=>b.id==='shops_north');
const pieces=skylinePieces(building);
function model(skip) {
  const generator=farModelSteps({chunk:'dorm_court',near:0,box:[-4,4,-5,5],skip},{...layout,BUILDINGS:[building]});
  let value;do {value=generator.next();}while(!value.done);
  value.value.mesh?.geometry.dispose();value.value.lit?.geometry.dispose();
  return value.value.stats;
}
test('render identities distinguish market halves while destination IDs stay canonical',()=>{
  assert.equal(pieces.length,2);
  assert.ok(pieces.every(p=>p.id===building.id));
  assert.notEqual(skylinePieceId(pieces[0]),skylinePieceId(pieces[1]));
});
test('a near market half leaves its far sibling visible; explicit source skip removes both',()=>{
  assert.equal(model([skylinePieceId(pieces[1])]).buildings,1);
  assert.equal(model([building.id]).buildings,0);
});
