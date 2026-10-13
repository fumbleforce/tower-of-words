import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Exercise the actual lifecycle with rendering, loading and the outing controller as boundaries.
const noop = (...names) => names.map(name => `export const ${name}=()=>{};`).join('');
const modules = {
  '/narrative/registration.js': 'export const assertPlaceRegistered=()=>globalThis.__outingLifecycleTest.log.push("registered");',
  '/narrative/events.js': 'export const eventTrigger=(place,event)=>place+":"+event;',
  '/places/catalog.js': 'export const PLACE_DETAILS={origin:{},shop:{}},SHARED_THINGS={mio:{}};',
  '/places/definitions.js': 'export const NEXT={};',
  '/places/saved-people.js': noop('cancelSavedWalk'),
  '/places/lift.js': noop('attachLift'),
  '/look/index.js': noop('lookSteps'),
  '/perf/slice.js': noop('sliced', 'setUrgent', 'nextFrame'),
  '/perf/batch.js': noop('optimizePlace'),
  '/perf/phone.js': noop('lightenForPhone', 'phoneBatch'),
  '/perf/warm.js': noop('warmPlace'),
  '/move.js': 'export class SmoothWalker { constructor(){this.facing=0;} stop(){globalThis.__outingLifecycleTest.log.push("stop");} }',
  '/ui.js': noop('playMusic'),
  '/sim.js': 'export const sim={day:1,period:"early",date:"Thu 1 Oct"},PERIODS=["early","morning"];export const periodName=p=>p;export const absorb=()=>{};export const applySchedule=()=>globalThis.__outingLifecycleTest.log.push("schedule");export const save=g=>globalThis.__outingLifecycleTest.log.push(["save",g.place.name,g.outing?.state]);',
  '/trips.js': 'export const leave=async(g,p,s)=>{globalThis.__outingLifecycleTest.log.push("leave");await p.tripOut?.(g,s);};export const arrive=async(g,p,s)=>{globalThis.__outingLifecycleTest.log.push("arrive");await p.tripIn?.(g,s);};',
  '/finds/index.js': noop('installFinds', 'findSpotSteps', 'syncFinds'),
  '/tickets/index.js': noop('installTickets'),
  '/conversations/index.js': noop('installConversations') + 'export const withConversations=s=>s;',
  '/clubs/index.js': noop('installClubs', 'clubArrival') + 'export const withClubs=s=>s;',
  '/places/day3/place.js': noop('installDay3'),
  '/places/day4/index.js': noop('attachSunday', 'installDay4'),
  '/places/day5/place.js': noop('attachMonday', 'installDay5'),
  '/places/ongoing/index.js': noop('installOngoing') + 'export const attachOngoing=()=>globalThis.__outingLifecycleTest.log.push("ongoing");',
  '/places/day3/seats.js': noop('noteBenches'),
  '/plugins.js': noop('installBoot', 'installPlacePlugin', 'watchPlacePlugins'),
  '/creatures/index.js': noop('installCreatures'),
  '/crowd/index.js': noop('attachCrowd'),
  '/look/char-lift.js': noop('liftPeople'),
  '/travel/ways.js': noop('keepPublic'),
  '/travel/visited.js': noop('noteVisit'),
  '/flavor-finds/index.js': noop('installFlavorFinds', 'attachFlavorFinds'),
  '/outings/index.js': 'export const installOuting=g=>{if(globalThis.__outingLifecycleTest.controller)g.outing=globalThis.__outingLifecycleTest.controller;};export const attachOuting=()=>globalThis.__outingLifecycleTest.log.push("attach-outing");',
};
const loader = registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('.')) {
    const url = new URL(specifier, context.parentURL).href;
    if (Object.keys(modules).some(suffix => url.endsWith('/game3d/js' + suffix))) return {url,shortCircuit:true};
  }
  return next(specifier,context);
}, load(url, context, next) {
  const found = Object.entries(modules).find(([suffix]) => url.endsWith('/game3d/js' + suffix));
  return found ? { format: 'module', source: found[1], shortCircuit: true } : next(url, context);
} });
const { createPlaceLifecycle } = await import('../../js/places/lifecycle.js');
loader.deregister();

function fixture(controller) {
  const log = [];
  globalThis.__outingLifecycleTest = { log, controller };
  const classes = new Set();
  globalThis.document = { body: { dataset: {}, classList: {
    contains: name => classes.has(name), add: (...names) => names.forEach(n => classes.add(n)), remove: (...names) => names.forEach(n => classes.delete(n)),
  } } };
  const rig = () => ({ root: { position: { x: 0, y: 0, z: 0, set(x,y,z){Object.assign(this,{x,y,z});} }, rotation: {}, scale: { setScalar(){} } }, setState(){} });
  const place = name => ({ name, people: {}, spots: {}, things: {}, start: [0,0], space: { add(){} },
    tripOut: async () => log.push('visible-departure'), tripIn: async () => log.push('visible-arrival') });
  const game = { prepared: {}, ui: { clock(){},goal(){} }, player: rig(), mioNpc: rig(), runner: {
    load: async name => name === 'transitions' ? {} : {name}, use(){},has:()=>false,
  } };
  const lifecycle = createPlaceLifecycle(game, { PLACES: {origin:()=>place('origin'),shop:()=>place('shop')},
    setComposer(){},resize(){},size:()=>[1366,860],buildMarkers(){},nearSet:new Set(),zoneSet:new Set(),
    snapshot:()=>{log.push('snapshot');return {};},crossfade:()=>log.push('crossfade'),
  });
  return { game, lifecycle, log };
}

test('prepare attaches outing after normal residents and before registration; entry follows schedule', async () => {
  const controller = { enter(p,{resuming}) { globalThis.__outingLifecycleTest.log.push(['outing-enter',p.name,resuming]); } };
  const {lifecycle,log} = fixture(controller);
  await lifecycle.enter('origin',{resuming:true});
  assert.ok(log.indexOf('ongoing') < log.indexOf('attach-outing'));
  assert.ok(log.indexOf('attach-outing') < log.indexOf('registered'));
  const entry = log.findIndex(x=>Array.isArray(x)&&x[0]==='outing-enter');
  assert.ok(log.indexOf('schedule') < entry);
  assert.deepEqual(log[entry],['outing-enter','origin',true]);
  assert.ok(entry < log.findIndex(x=>Array.isArray(x)&&x[0]==='save'));
});

test('travel locks input and awaits companion cleanup before saving or leaving', async () => {
  let release, started;
  const pending = new Promise(resolve=>{release=resolve;});
  const entered = new Promise(resolve=>{started=resolve;});
  let game;
  const controller = {state:'active',enter(){},async beforeTravel(context){
    assert.deepEqual(context,{from:'origin',to:'shop',fast:false,arriving:false});
    assert.equal(game.busy,true);assert.equal(game.walker.locked,true);started();await pending;this.state='suspended';
  },afterTravel(){globalThis.__outingLifecycleTest.log.push('after-travel');}};
  const f=fixture(controller);({game}=f);await f.lifecycle.enter('origin');f.log.length=0;
  const travel=f.lifecycle.travel('shop');await entered;
  assert.equal(f.log.some(x=>Array.isArray(x)&&x[0]==='save'),false);
  assert.equal(f.log.includes('leave'),false);
  release();await travel;
  assert.deepEqual(f.log.find(x=>Array.isArray(x)&&x[0]==='save'),['save','origin','suspended']);
  assert.ok(f.log.indexOf('visible-departure') < f.log.indexOf('snapshot'));
  assert.ok(f.log.indexOf('visible-arrival') < f.log.indexOf('after-travel'));
  assert.equal(game.busy,false);assert.equal(game.walker.locked,false);
});

test('fast travel reports the actual source, while arriving Continue preserves its saved source', async () => {
  const contexts=[],controller={enter(){},beforeTravel:c=>contexts.push(c),afterTravel(){}};
  const {game,lifecycle,log}=fixture(controller);await lifecycle.enter('origin');
  await lifecycle.travel('shop',{fast:true,via:'plaza'});
  assert.equal(contexts[0].from,'origin');assert.equal(contexts[0].fast,true);
  assert.equal(log.includes('visible-departure'),false);
  log.length=0;
  await lifecycle.travel('shop',{arriving:true,fromName:'origin'});
  assert.equal(contexts[1].from,'origin');assert.equal(contexts[1].arriving,true);
  assert.equal(log.includes('schedule'),false,'arriving Continue does not re-enter the saved place');
  assert.equal(log.includes('visible-departure'),false);assert.ok(log.includes('visible-arrival'));
  assert.equal(game.transition,null);
});

test('day-one travel keeps its existing departure and arrival without an outing controller', async () => {
  const {game,lifecycle,log}=fixture();await lifecycle.enter('origin');await lifecycle.travel('shop');
  assert.equal(game.outing,undefined);assert.ok(log.includes('visible-departure'));assert.ok(log.includes('visible-arrival'));
  assert.equal(game.place.name,'shop');assert.equal(game.transition,null);
});
