import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'three')
      return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, context);
    if (specifier.startsWith('three/addons/'))
      return next(new URL('../../vendor/' + specifier.slice(13), import.meta.url).href, context);
    return next(specifier, context);
  },
});
Object.assign(globalThis, {
  location: { search: '' },
  window: {},
  addEventListener() {},
  innerWidth: 1366,
  innerHeight: 860,
  localStorage: { getItem: () => null, setItem() {} },
  document: {
    body: { classList: { contains: () => false, toggle() {} } },
    documentElement: { style: { setProperty() {} } },
  },
});
const ctx = new Proxy({measureText:t=>({width:String(t).length*8}), createRadialGradient:()=>({addColorStop(){}}), createLinearGradient:()=>({addColorStop(){}})}, {get:(o,k)=>o[k]||(()=>{})});
globalThis.document.createElement = () => ({width:128,height:128,getContext:()=>ctx,style:{}});
const {buildCampus} = await import('../../js/scenes/campus.js');
const P = await import('../../js/scenes/campus/plan.js');
test('campus paths connect every exit, print door and the usable bench approach',()=>{
 const w=buildCampus();
 for(const p of [...Object.values(P.EXITS).flatMap(e=>[e.lane,e.in]),P.PRINT_STEP,P.BENCH.out]) {
   assert.ok(w.nav.free(...p), `blocked ${p}`);
   assert.ok(w.nav.path(...P.IN,...p).length, `unreachable ${p}`);
 }
});

const L=await import('../../js/scenes/island-layout.js');
const F=await import('../../js/scenes/forecourt/plan.js');
const O=await import('../../js/scenes/office-quarter/plan.js');
const H=await import('../../js/scenes/harbour/plan.js');
const {canTravel}=await import('../../js/places/definitions.js');
const {storyPath}=await import('../../js/days.js');
test('each pedestrian seam has the identical island endpoint and arrivals land beyond its own trigger',()=>{
 const global=(chunk,p)=>L.toIsland(chunk,...p);
 for(const [campus,chunk,other]of [[P.EXITS.forecourt,'forecourt',F.CAMPUS_EXIT],[P.EXITS.office_quarter,'office_quarter',O.CAMPUS_EXITS.quarter],[P.EXITS.office_shed,'office_quarter',O.CAMPUS_EXITS.shed],[P.EXITS.harbour,'harbour',H.CAMPUS_EXIT]]){
  const a=global('campus',campus.edge),b=global(chunk,other.edge);
  assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])<1e-8,`${chunk} no position jump`);
  assert.equal(P.inRect(...campus.in,campus.zone),false);
  assert.equal(P.inRect(...other.in,other.zone),false);
 }
});
test('opening and continuing weeks retain native campus routes at real loader paths',async()=>{
 for(const day of [1,2,3,4,5,6,17,32])for(const [from,to,target]of [['forecourt','campus','campus'],['campus','office_quarter','office_shed'],['office_quarter','campus','campus_quarter'],['harbour','campus','campus'],['campus','print_shop','print_shop'],['print_shop','campus','print_exit']]){
  const story=(await import(new URL('../../js/'+storyPath(from,day),import.meta.url))).default;
  const node=story.on['talk:'+target];assert.ok(node,`${day} ${from} ${target}`);
  assert.equal(story.nodes[node][0].to,to);assert.ok(canTravel(from,to,day));
 }
});
test('campus lighting reverses and keeps navigation stable',()=>{
 const w=buildCampus(),initial=w.sun.intensity,nav=w.nav.rects.map(r=>[...r]);
 w.period('evening');assert.ok(w.sun.intensity<initial);w.period('morning');assert.equal(w.sun.intensity,initial);assert.deepEqual(w.nav.rects,nav);
});
const {buildPrintShop}=await import('../../js/scenes/print-shop/room.js');
test('print shop occupies w3 and keeps all usable approaches connected around solid equipment',()=>{
 const w=buildPrintShop();
 for(const p of [w.door.in,w.door.out,...Object.values(w.spots),...Object.values(w.seats).map(s=>s.out)]){
  assert.ok(w.nav.free(...p),`free ${p}`);const route=w.nav.path(...w.door.in,...p);assert.ok(route?.length,`reachable ${p}`);assert.ok(route.every(p=>w.nav.free(...p)));
 }
 for(const p of [[-1.1,-3.2],[1.3,-5.65],[0,-8.4]])assert.equal(w.nav.free(...p),false);
 const row=L.BUILDINGS.find(b=>b.id==='w3').rect;
 for(const p of [[w.bounds.x0,w.bounds.z0],[w.bounds.x1,0]]){
  const [x,z]=L.toIsland('print_shop',...p);assert.ok(x>=row[0]&&x<=row[2]+1e-7&&z>=row[1]&&z<=row[3]);
 }
 const day=w.sun.intensity;w.period('evening');assert.ok(w.sun.intensity<day);w.period('morning');assert.equal(w.sun.intensity,day);
});

process.on('exit',()=>hooks.deregister());
