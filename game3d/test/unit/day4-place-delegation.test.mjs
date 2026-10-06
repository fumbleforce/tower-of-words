import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Exercise the real wrapper with a small place; rendered supplements are irrelevant to its delegation contract.
const stubs = {
  '/saved-people.js': 'export const snapshotPeople=()=>({}), restorePeople=()=>{};',
  '/day-cast.js': 'export const dayCast=()=>({update(){}});',
  '/day3/index.js': 'export const applyPlan=()=>{};',
  '/day3/place.js': 'export const day3Place=()=>({});',
  '/day4/plan.js': 'export const PLANS={};',
  '/day4/calendar.js': 'export const isSunday=()=>false;',
  '/day4/props.js': 'export const sundayProps=()=>({things:{},snapshot:()=>({}),load(){}});',
  '/day4/tennis.js': 'export const tennisCourt=()=>null;',
  '/day4/fan.js': 'export const fanRepair=()=>null;',
};
const hook = registerHooks({load(url, context, next) {
  const entry = Object.entries(stubs).find(([suffix]) => url.endsWith(suffix));
  return entry ? {format:'module',source:entry[1],shortCircuit:true} : next(url, context);
}});
const { attachSunday } = await import('../../js/places/day4/index.js');
hook.deregister();
test('Sunday supplements preserve the place receiver, absolute clock and saved-state arguments', () => {
  const calls = [];
  const P = {people:{}, cam:{yaw:0,elev:1,release(){}}, scale:2,
    update(dt,t,marker) { this.motion = Math.sin(t)*this.scale; calls.push([dt,t,marker]); },
    snapshotState(marker) { return {base:this.scale,marker}; },
    restoreState(saved,marker) { this.restored = [saved,marker]; },
  };
  attachSunday({},P,'gate');
  const marker = {};
  P.update(0.016,12.5,marker);
  assert.equal(P.motion, Math.sin(12.5)*2);
  assert.deepEqual(calls, [[0.016,12.5,marker]]);
  assert.equal(P.snapshotState(marker).base,2);
  assert.equal(P.snapshotState(marker).marker,marker);
  const saved={world:{}};P.restoreState(saved,marker);
  assert.deepEqual(P.restored,[saved,marker]);
});
