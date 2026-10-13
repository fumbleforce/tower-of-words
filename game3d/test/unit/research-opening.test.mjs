import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import test from 'node:test';
const hooks=registerHooks({resolve(s,c,n){return n(s==='three'?new URL('../../vendor/three/three.module.js',import.meta.url).href:s.startsWith('three/addons/')?new URL('../../vendor/'+s.slice(13),import.meta.url).href:s,c);}});
globalThis.location={search:''};globalThis.window={};
const {officeBlockSteps}=await import('../../js/scenes/outdoor/block.js');
const {remainingCore}=await import('../../js/scenes/research-room/opening.js');
const rect=[-35.2,-11.6,-107.1,-99.8],interior=[-35.2,-27,-106.8,-100.1];
function recorded(options={}){
 const calls={p:[],glass:[],lit:[]},sets=Object.fromEntries(Object.keys(calls).map(k=>[k,{box(...args){calls[k].push(['box',...args]);},geo(color,g,o){calls[k].push(['geo',color,...g.attributes.position.array,o]);g.dispose();}}]));
 const it=officeBlockSteps(sets,rect,{storeys:6,fh:2,doors:[{face:'w',at:-103.45,w:1.1,canopy:{out:1.3,side:.7},...options.door}],...options});while(!it.next().done){}return calls;
}
test('new facade options leave unopted building geometry exactly unchanged',()=>{
 assert.deepEqual(recorded(),recorded({interior:null,door:{open:false}}));
});
test('Research core keeps every ground-floor part outside the built room and all upper floors',()=>{
 const bounds=[rect[0]+.15,rect[1]-.15,rect[2]+.15,rect[3]-.15],parts=remainingCore(bounds,interior);
 const area=r=>(r[1]-r[0])*(r[3]-r[2]);
 const hole=[bounds[0],interior[1],interior[2],interior[3]];
 assert.ok(Math.abs(parts.reduce((s,r)=>s+area(r),0)+area(hole)-area(bounds))<1e-9);
 assert.ok(parts.some(r=>r[0]===-27&&r[1]===bounds[1]));
 const old=recorded(),opened=recorded({interior,door:{open:true}});
 // Upper body is exactly the same box, not a hollowed whole building.
 assert.deepEqual(opened.p.find(c=>c[0]==='box'&&c[6]===2.4),old.p.find(c=>c[0]==='box'&&c[6]===2.4));
 const atDoor=call=>call[0]==='box'&&Math.abs(call[5]+35.2)<.2&&Math.abs(call[7]+103.45)<.1&&call[3]>1.5;
 assert.ok(old.p.some(atDoor));assert.equal(opened.p.some(atDoor),false);
 assert.equal(opened.glass.filter(atDoor).length,0);
});
process.on('exit',()=>hooks.deregister());
