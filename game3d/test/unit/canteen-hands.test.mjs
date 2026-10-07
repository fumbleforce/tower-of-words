import assert from 'node:assert/strict';
import test from 'node:test';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){if(s.endsWith('/move.js'))return {url:'data:text/javascript,'+encodeURIComponent('export const walkRig=()=>{throw Error("Unexpected walk")};export const faceRig=()=>{throw Error("Unexpected turn")};'),shortCircuit:true};if(s==='three')return n(new URL('../../vendor/three/three.module.js',import.meta.url).href,c);if(s.startsWith('three/addons/'))return n(new URL('../../vendor/'+s.slice(13),import.meta.url).href,c);return n(s,c);}});
globalThis.location={search:''};
const THREE=await import('three'),{PEOPLE}=await import('../../js/cast.js'),{K}=await import('../../js/scenes/office.js');
const {mealHands}=await import('../../js/places/canteen/meal-hands.js'),{mealTray}=await import('../../js/scenes/canteen/meals.js');
const {COLLECTION}=await import('../../js/places/canteen/meal-props.js'),{STAFF_COUNTER_ROUTE}=await import('../../js/scenes/canteen/plan.js');
test('actual procedural worker carries with uncrossed arms and keeps the same physical rear grip through delivery',async()=>{
 const P={space:new THREE.Group()},rig=PEOPLE.worker(25),tray=mealTray('curry');rig.root.scale.multiplyScalar(K);rig.root.position.set(STAFF_COUNTER_ROUTE.at(-1)[0],0,STAFF_COUNTER_ROUTE.at(-1)[1]);P.space.add(rig.root,tray.root);
 let hands;const game={wait:async()=>hands.update(),tween:async(_seconds,fn)=>{for(let i=0;i<=20;i++){fn(i/20);hands.update();}}};hands=mealHands(game,P);
 const arm=rig.rig?.arms?.[1]||rig.arms[1],original=arm.quaternion.clone();hands.carry(rig,tray);
 const grip=hands.rigidCarryGrip(rig);assert.ok(grip.x>0&&grip.z<0,'procedural Right arm uses its own side and the rear tray edge');
 for(const contact of hands.carryContacts())assert.ok(contact.gap<.08,JSON.stringify(contact));
 const from=tray.root.position.clone().add(grip);hands.stopCarry();await hands.reach({wait:p=>p},rig,from.toArray(),{item:tray.root,grip:grip.toArray(),end:new THREE.Vector3(...COLLECTION).add(grip).toArray(),id:'handoff'});
 assert.ok(hands.contacts.every(c=>c.gap<.08),JSON.stringify(hands.contacts));assert.ok(tray.root.position.distanceTo(new THREE.Vector3(...COLLECTION))<1e-9);
 hands.clear();assert.ok(arm.quaternion.angleTo(original)<1e-7,'exact original arm restored');
});

test('undelivered receipt cannot animate hidden staff or fulfil hot service outside lunch',async()=>{
 const {mealService}=await import('../../js/places/canteen/meal-service.js');
 const worker={root:{visible:false}},game={player:{},sim:{day:3,period:'evening'}},P={people:{canteen_worker:worker}};
 const state={phase:()=> 'paid',delivered:()=>false};let walks=0;
 const api=mealService(game,P,state,{}, {},()=>{},()=>{},{});
 const job={wait:()=>{walks++;throw Error('Unavailable service started physical action');}};
 assert.equal(await api.collect(job),false);worker.root.visible=true;game.sim.period='morning';assert.equal(await api.collect(job),false);assert.equal(walks,0);
});
