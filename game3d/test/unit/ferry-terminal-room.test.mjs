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
const {buildFerryTerminal}=await import('../../js/scenes/ferry-terminal/room.js');
const P=await import('../../js/scenes/ferry-terminal/plan.js');
const H=await import('../../js/scenes/harbour/plan.js');
const {terminalOpen,terminalStaffed,TERMINAL_OPEN}=await import('../../js/gameplay/terminal-hours.js');
const {canTravel}=await import('../../js/places/definitions.js');
const {storyPath}=await import('../../js/days.js');
test('terminal room fits the actual facade and connects every public approach and both bag handling positions',()=>{
 const w=buildFerryTerminal();
 for(const p of [w.door.in,w.door.out,...Object.values(w.spots),...Object.values(w.seats).map(s=>s.out),[-4.8,-3.44],[-6.59,-3.63]]){
  assert.ok(w.nav.free(...p),`blocked ${p}`);assert.ok(w.nav.path(...w.door.in,...p).length,`unreachable ${p}`);
 }
 for(const s of Object.values(w.seats))assert.equal(w.nav.free(s.x,s.z),false,'seat occupies furniture');
 assert.deepEqual(P.ISLAND_DOOR,H.front('ferry_terminal').door);
 const width=w.bounds.x1-w.bounds.x0;assert.ok(width<16&&width>15.5);assert.ok(-w.bounds.z0<8);
 const original=w.sun.intensity;w.period('evening');assert.ok(w.sun.intensity<original);w.period('morning');assert.equal(w.sun.intensity,original);
});
test('actual story loaders and travel rules keep terminal access in opening and continuing weeks',async()=>{
 for(const day of [1,2,3,4,5,6,17,32]){
  assert.ok(canTravel('harbour','ferry_terminal',day),`entry day ${day}`);
  assert.ok(canTravel('ferry_terminal','harbour',day),`exit day ${day}`);
  const room=(await import(new URL('../../js/'+storyPath('ferry_terminal',day),import.meta.url))).default;
  assert.equal(room.nodes[room.on['talk:ferry_exit']][0].to,'harbour');
  for(const id of Object.keys(P.SEATS))assert.ok(room.nodes[room.on['talk:'+id]],`day ${day} missing seat interaction: ${id}`);
  const harbour=(await import(new URL('../../js/'+storyPath('harbour',day),import.meta.url))).default;
  assert.equal(harbour.on['talk:ferry_terminal'],'terminal');
  assert.equal(harbour.nodes.terminal[0].if,TERMINAL_OPEN);
 }
 for(const period of ['early','morning','lunch','afternoon','evening'])assert.equal(terminalOpen(3,period),true);
 assert.equal(terminalStaffed(3,'early'),false);assert.equal(terminalStaffed(3,'evening'),false);assert.equal(terminalStaffed(3,'afternoon'),true);
 assert.equal(terminalOpen(3,'night'),false);
});
process.on('exit',()=>hooks.deregister());

test('every registered place has a finite real player/goal map frame; terminal door matches the existing harbour facade',async()=>{
 const {PLACE_FILES}=await import('../../js/places/definitions.js');
 const {CHUNKS,toIsland,BUILDINGS}=await import('../../js/scenes/island-layout.js');
 const {ericAt,goalAt}=await import('../../js/ui/map/where.js');
 for(const name of Object.keys(PLACE_FILES)){
  assert.ok(CHUNKS[name],`missing map frame: ${name}`);
  const g={place:{name},player:{root:{position:{x:1,z:-1},rotation:{y:.7}}},markers:{list:[{enabled:()=>true,goal:()=>true,anchor:v=>v.set(1,0,-1)}]}};
  const player=ericAt(g),goal=goalAt(g);assert.ok(player&&Object.values(player).every(Number.isFinite),name);assert.ok(goal?.every(Number.isFinite),name);
  assert.deepEqual([player.x,player.z],goal,name);
 }
 assert.deepEqual(toIsland('ferry_terminal',0,0),H.front('ferry_terminal').door);
 const bounds=BUILDINGS.find(b=>b.id==='ferry_terminal').rect;
 for(const [x,z] of [[P.R.x0,P.R.z0],[P.R.x1,0]]){const p=toIsland('ferry_terminal',x,z);assert.ok(p[0]>=bounds[0]&&p[0]<=bounds[2]&&p[1]>=bounds[1]&&p[1]<=bounds[3]);}
});
