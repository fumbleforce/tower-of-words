import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const fixtureKey = '__outingControllerTest';
const mocks = {
  '/narrative/state.js': `export const flags={};`,
  '/sim.js': `export const sim={day:10,period:'lunch',met:new Set(['kenji'])};export const save=()=>{};`,
  '/clubs/index.js': `export const clubs={ids:()=>['karaoke'],members:()=>['kenji'],meetingOn:()=>globalThis.${fixtureKey}.meeting};`,
  '/places/saved-people.js': `export const snapshotPeople=p=>({kenji:{x:p.kenji.root.position.x}});export const restorePeople=(p,s)=>{p.kenji.root.position.x=s.kenji.x;};export const cancelSavedWalk=r=>{r.root.userData.walkTok++;r._walk=false;};`,
  '/move.js': `export const walkRig=async(g,r,q)=>{r.root.userData.walkTok++;if(!globalThis.${fixtureKey}.blocked)r.root.position.set(q[0],0,q[1]);await globalThis.${fixtureKey}.afterWalk?.(g,r);};export const freeNear=(n,b,x,z)=>[x,z];export const bodies=()=>[];export const faceRig=async(g,r)=>globalThis.${fixtureKey}.afterFace?.(g,r);export const glide=async(g,r,q)=>r.position.set(q[0],0,q[1]);`,
  '/movement/navigation.js': `export const clearOf=()=>true;`,
  '/movement/gait.js': `export const stopGait=()=>{};`,
  '/crowd/motion.js': `export const standPose=r=>{r.seated=false;};`,
  '/outings/actor.js': `export const outingActor=g=>{const rig=globalThis.${fixtureKey}.rig;let current=null;return{rig,resident:p=>p.people.kenji,home:()=>globalThis.${fixtureKey}.home||({visible:true,position:[0,0,0]}),current:()=>current,activate:p=>{current=p;p.people.kenji=rig;},release:()=>{current=null;},update(){}};};`,
  '/outings/follow.js': `export const createOutingFollower=()=>({pause(){},update(){}});`,
  '/outings/attachment.js': `export const attachOutingPlace=()=>{};export const restoreOutingPlayer=()=>{};`,
  '/outings/seating.js': `export const cancelOutingSeats=()=>{};export const freeOutingSeats=()=>[];export const sitOutingPair=async()=>globalThis.${fixtureKey}.seated;`,
};
const loader=registerHooks({resolve(specifier,context,next){
  if(specifier.startsWith('.')) {const url=new URL(specifier,context.parentURL).href;
    if(Object.keys(mocks).some(s=>url.endsWith('/game3d/js'+s)))return{url,shortCircuit:true};}
  return next(specifier,context);
},load(url,context,next){const match=Object.entries(mocks).find(([s])=>url.endsWith('/game3d/js'+s));
  return match?{format:'module',source:match[1],shortCircuit:true}:next(url,context);
}});
const {installOuting}=await import('../../js/outings/index.js');
const {flags}=await import('../../js/narrative/state.js');
const {sim}=await import('../../js/sim.js');
loader.deregister();
function setup(){
  for(const key of Object.keys(flags))delete flags[key];
  Object.assign(sim,{day:10,period:'lunch',met:new Set(['kenji'])});
  const rig=()=>({root:{visible:true,userData:{walkTok:0},scale:{x:1},rotation:{y:0},position:{x:0,y:0,z:0,set(x,y,z){Object.assign(this,{x,y,z});}}}});
  const context=globalThis[fixtureKey]={rig:rig(),blocked:false,seated:false,meeting:null};
  const game={place:{name:'shotengai',people:{kenji:rig()},nav:{R:0.2,free:()=>true},things:{store:{spot:()=>[4,4]},game_centre:{spot:()=>[8,8],face:()=>[8,9]}}},player:rig(),walker:{sync(){this.targetFacing=null;},faceTo(x,z){this.targetFacing=[x,z];},stop(){this.aside=null;this.path=null;}},hooks:{}};
  context.markers=0;installOuting(game,{refreshMarkers:()=>context.markers++});return{game,outing:game.outing,context};
}
test('actual controller declines busy/unmet invitations and preserves a paused walk until resumed',()=>{
  const {outing,context}=setup();context.meeting={period:'lunch'};
  assert.equal(outing.invite(),false);context.meeting=null;sim.met.clear();assert.equal(outing.invite(),false);
  sim.met.add('kenji');assert.equal(outing.invite(),true);assert.equal(outing.controls('kenji'),true);
  sim.period='afternoon';outing.syncClock();assert.equal(outing.state().status,'paused');assert.equal(outing.controls('kenji'),false);
  assert.equal(outing.invite(),false);sim.day=11;assert.equal(outing.resume(),true);assert.equal(outing.state().day,11);
});
test('arcade and shop walking require observed arrival, not a resolved stalled walk',async()=>{
  const {outing,context,game}=setup();outing.invite();context.blocked=true;
  assert.equal(await outing.stop('arcade'),false);assert.deepEqual(outing.state().stops,[]);
  context.blocked=false;assert.equal(await outing.stop('arcade'),true);assert.deepEqual(outing.state().stops,['arcade']);
  assert.equal(game.player.root.position.x,8);assert.equal(game.player.root.position.z,7.2);assert.equal(context.rig.root.position.x,7.2);assert.equal(context.rig.root.position.z,7.2);
  context.blocked=true;assert.equal(await outing.stop('drink'),false);assert.equal(flags.outing_stage.waiting,undefined);
  await outing.beforeTravel({from:'shotengai',to:'konbini'});assert.equal(outing.state().status,'paused');
});
test('a drink callback requires a new paid and physically collected drink order',async()=>{
  const {outing,game}=setup();outing.invite();flags.konbini_order_id=2;flags.konbini_paid_id=2;
  assert.equal(await outing.stop('drink'),true);game.place={name:'konbini'};
  Object.assign(flags,{konbini_phase:'complete',konbini_basket:['tea']});outing.update(game.place);
  assert.equal(flags.outing_stage.collected,undefined);
  flags.konbini_order_id=3;flags.konbini_phase='paid';flags.konbini_paid_id=3;outing.update(game.place);
  assert.equal(flags.outing_stage.collected,undefined);
  flags.konbini_phase='complete';flags.konbini_basket=['riceball'];outing.update(game.place);
  assert.equal(flags.outing_stage.collected,undefined);
  flags.konbini_basket=['tea'];outing.update(game.place);assert.equal(flags.outing_stage.collected,true);
  game.place={name:'shotengai'};await outing.afterTravel();await outing.finish();
  assert.equal(outing.state().callback,'drink');
});
test('leaving an empty-handed shop records no stop and seated completion requires both seats',async()=>{
  const {outing,game,context}=setup();outing.invite();await outing.stop('drink');await outing.afterTravel();
  assert.deepEqual(outing.state().stops,[]);game.place={name:'east_coast'};
  assert.equal(await outing.stop('coast'),false);assert.deepEqual(outing.state().stops,[]);
  context.seated=true;assert.equal(await outing.stop('coast'),true);assert.deepEqual(outing.state().stops,['coast']);
});
test('restoration retains saved companion pose and unsupported travel pauses before departure',async()=>{
  const {outing,context}=setup();outing.invite();outing.restored({world:{outing:{place:'shotengai',people:{kenji:{x:7}}}}});
  assert.equal(context.rig.root.position.x,7);await outing.beforeTravel({from:'shotengai',to:'office'});
  assert.equal(outing.state().status,'paused');assert.equal(outing.controls('kenji'),false);
});
test('hook commands are explicitly validated and failed action reports false',async()=>{
  const {game,context}=setup();await assert.rejects(game.hooks.outing({state:'update'}),/Unknown outing action/);
  await game.hooks.outing({state:'invite'});context.blocked=true;await game.hooks.outing({state:'arcade'});
  assert.equal(flags.outing_action_complete,false);
});

test('actor replacement refreshes markers and ending a seated walk stands the player',async()=>{
  const {outing,game,context}=setup();outing.invite();assert.equal(context.markers,1);
  game.player.seated=true;context.rig.seated=true;game.standUp=()=>{game.player.seated=false;};
  await outing.finish();assert.equal(game.player.seated,false);assert.equal(context.rig.seated,false);
  assert.equal(context.markers,2);assert.equal(outing.state().status,'ended');
});
test('a repeated drink visit preserves the outing without repeating its receipt',async()=>{
  const {outing}=setup();outing.invite();await outing.stop('drink');
  flags.outing_stage.collected=true;await outing.afterTravel();
  await outing.beforeTravel({from:'shotengai',to:'konbini'});
  assert.equal(outing.state().status,'active');assert.equal(flags.outing_stage.waiting,true);
  await outing.afterTravel();assert.deepEqual(outing.state().stops,['drink']);
});

test('parting cannot release a companion before a blocked home walk actually arrives',async()=>{
  const {outing,context}=setup();outing.invite();context.rig.root.position.x=8;context.blocked=true;
  assert.equal(await outing.finish(),false);assert.equal(outing.state().status,'active');
  assert.equal(outing.controls('kenji'),true);context.blocked=false;
  await outing.finish();assert.equal(context.rig.root.position.x,0);assert.equal(outing.state().status,'ended');
});

test('unsupported departure preserves the waiting companion in the saved frame until the next place',async()=>{
  const {outing,game,context}=setup();outing.invite();game.transition={from:'shotengai',to:'office',phase:'leaving'};
  await outing.beforeTravel({from:'shotengai',to:'office'});
  assert.equal(outing.state().status,'paused');assert.equal(outing.controls('kenji'),true);
  outing.restored({transition:game.transition,world:{outing:{place:'shotengai',people:{kenji:{x:6}}}}});
  assert.equal(context.rig.root.position.x,6);assert.equal(outing.controls('kenji'),true);
  game.place={name:'office'};outing.enter(game.place);assert.equal(outing.controls('kenji'),false);
});

test('Continue resumes the saved parting destination instead of inventing a new local home',async()=>{
  const first=setup();first.outing.invite();first.context.rig.root.position.x=8;first.context.blocked=true;
  assert.equal(await first.outing.finish(),false);
  const savedFlags=JSON.parse(JSON.stringify(flags));
  assert.deepEqual(savedFlags.outing_stage.parting.lane,[0,0]);
  const second=setup();Object.assign(flags,savedFlags);second.context.home={visible:true,position:[100,0,100]};
  await second.outing.restored({world:{outing:{place:'shotengai',people:{kenji:{x:5}}}}});
  assert.equal(second.context.rig.root.position.x,0);assert.equal(second.outing.state().status,'ended');
  assert.equal(flags.outing_stage.parting,undefined);
});


test('revisiting arcade and coast repeats physical actions without awarding another stop', async () => {
  const { outing, context, game } = setup();
  outing.invite();
  assert.equal(await outing.stop('arcade'), true);
  game.player.root.position.x = 0;
  assert.equal(await outing.stop('arcade'), true);
  assert.equal(game.player.root.position.x, 8);
  assert.deepEqual(outing.state().stops, ['arcade']);
  assert.equal(flags.outing_done_arcade, true);
  game.place = { name: 'east_coast' };
  context.seated = true;
  assert.equal(await outing.stop('coast'), true);
  context.seated = false;
  assert.equal(await outing.stop('coast'), false, 'a prior receipt cannot bypass physical seating');
  context.seated = true;
  assert.equal(await outing.stop('coast'), true);
  assert.deepEqual(outing.state().stops, ['arcade', 'coast']);
  assert.equal(flags.outing_done_coast, true);
});

test('story flags expose actual waiting and paired seating and pause clears only the owned goal', async () => {
  const { outing, context, game } = setup();
  game.ui = { sideText: '', sideGoal(text) { this.sideText = text; } };
  outing.invite();
  await game.hooks.outing({ state: 'goal', text: 'Walk to the seafront with Kenji.' });
  await outing.stop('drink');
  assert.equal(flags.outing_waiting, true);
  await outing.afterTravel();
  assert.equal(flags.outing_waiting, false);
  game.player.seated = true;
  outing.update(game.place);
  assert.equal(flags.outing_seated, false);
  context.rig.seated = true;
  outing.update(game.place);
  assert.equal(flags.outing_seated, true);
  sim.period = 'afternoon';
  outing.syncClock();
  assert.equal(flags.outing_seated, false);
  assert.equal(game.ui.sideText, '');
  outing.resume();
  outing.goal('Walk to the seafront with Kenji.');
  game.ui.sideGoal('Return the library book.');
  await outing.beforeTravel({ from: 'shotengai', to: 'office' });
  assert.equal(game.ui.sideText, 'Return the library book.');
  assert.equal(flags.outing_goal, '');
});


test('arcade placement owns give-way movement until both actors have settled', async () => {
  const { outing, game, context } = setup();
  outing.invite();
  game.walker.aside = [[20,20]];
  context.afterWalk = (g) => {
    assert.ok(g.player.scripted, 'both walks hold the player against autonomous give-way');
    assert.equal(g.walker.aside, null, 'stale give-way is cancelled before moving');
  };
  assert.equal(await outing.stop('arcade'), true);
  assert.equal(game.player.scripted, false);
  assert.deepEqual(game.walker.targetFacing, [8,9], 'release retains the frontage-facing target');
});

test('arcade refuses foreign movement and preserves superseding scripted ownership', async () => {
  const { outing, game, context } = setup();
  outing.invite();
  game.player.scripted = true;
  assert.equal(await outing.stop('arcade'), false);
  assert.equal(game.player.scripted, true);
  game.player.scripted = false;
  game.player._walk = true;
  assert.equal(await outing.stop('arcade'), false);
  game.player._walk = false;
  game.walker.path = Object.assign([[2,2]], { scripted: true });
  assert.equal(await outing.stop('arcade'), false);
  game.walker.path = null;
  context.afterWalk = (g, r) => {
    if (r !== context.rig) return;
    g.player.scripted = true;
    g.player.root.userData.walkTok++;
    g.player._walk = true;
    outing.keepWalking();
  };
  assert.equal(await outing.stop('arcade'), false);
  assert.equal(game.player.scripted, true);
  assert.equal(game.player._walk, true);
  assert.deepEqual(outing.state().stops, []);
});

test('arcade verifies the player again after companion arrival and facing', async () => {
  for (const phase of ['afterWalk', 'afterFace']) {
    const { outing, game, context } = setup();
    outing.invite();
    context[phase] = (g, r) => { if (r === context.rig) g.player.root.position.x += 2; };
    assert.equal(await outing.stop('arcade'), false, phase);
    assert.deepEqual(outing.state().stops, []);
    assert.equal(game.player.scripted, false);
  }
});


test('cancelled first arcade walk cannot reset the next scene walker', async () => {
  const { outing, game, context } = setup();
  outing.invite();
  context.afterWalk = (g, r) => {
    if (r !== g.player) return;
    outing.keepWalking();
    g.player.scripted = true;
    g.player.root.userData.walkTok++;
    g.player._walk = true;
    g.walker.targetFacing = [12,13];
  };
  assert.equal(await outing.stop('arcade'), false);
  assert.deepEqual(game.walker.targetFacing, [12,13]);
  assert.equal(game.player.scripted, true);
  assert.equal(game.player._walk, true);
  assert.deepEqual(outing.state().stops, []);
});
