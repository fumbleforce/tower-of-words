import assert from 'node:assert/strict';
import test from 'node:test';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){if(s==='three')return n(new URL('../../vendor/three/three.module.js',import.meta.url).href,c);if(s.startsWith('three/addons/'))return n(new URL('../../vendor/'+s.slice(13),import.meta.url).href,c);return n(s,c);}});
globalThis.location={search:''};
const {PEOPLE}=await import('../../js/cast.js');
const {K}=await import('../../js/scenes/office.js');
const {BODY}=await import('../../js/movement/shared.js');
import { COUNTER, SERVICE_END, STAFF_COUNTER_ROUTE, R } from '../../js/scenes/canteen/plan.js';
const actor=PEOPLE.worker(25);actor.root.scale.multiplyScalar(K);
const radius=BODY*actor.root.scale.x;
const rectDistance=(p,r)=>Math.hypot(Math.max(r.x-r.w/2-p[0],0,p[0]-r.x-r.w/2),Math.max(r.z-r.d/2-p[1],0,p[1]-r.z-r.d/2));
test('every authored staff-only segment clears the actual counter and service-end surface with an unchanged body radius',()=>{
 const walls={x:R.x1-radius,z:R.z0+radius};
 for(let i=1;i<STAFF_COUNTER_ROUTE.length;i++) {
   const a=STAFF_COUNTER_ROUTE[i-1],b=STAFF_COUNTER_ROUTE[i];
   for(let step=0;step<=100;step++) {
     const k=step/100,p=[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k];
     for(const rect of [{...COUNTER,w:COUNTER.w+.08,d:COUNTER.d+.08},SERVICE_END])assert.ok(rectDistance(p,rect)>=radius,`${p} intersects service furniture`);
     assert.ok(p[0]<walls.x&&p[1]>walls.z);
   }
 }
});
