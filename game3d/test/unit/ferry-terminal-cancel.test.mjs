import assert from 'node:assert/strict';
import {register} from 'node:module';
import test from 'node:test';
register(new URL('../support/save-loader.mjs',import.meta.url));
globalThis.localStorage={getItem:()=>null,setItem(){}};globalThis.window={};globalThis.fetch=async()=>({ok:false});
const {Runner,flags}=await import('../../js/runner.js');
const {terminalAction}=await import('../../js/places/ferry-terminal/action.js');
const {diningActions}=await import('../../js/places/izakaya/actions.js');
const story=(await import('../../story/ferry_terminal.js')).default;
test('actual traveller story cannot offer the occupied seat or speak completion after a cancelled bag move',async()=>{
 for(const key of Object.keys(flags))delete flags[key];flags.place='ferry_terminal';
 const place={name:'ferry_terminal',people:{},hooks:{}},game={place,hooks:{},queue:[],wait:async()=>{},found:new Set()},lines=[],actions=diningActions();
 let reached,finish;const holding=new Promise(resolve=>{reached=resolve;});
 globalThis.__saveTestUI={say:(_,text)=>lines.push(text),choose:()=>{throw Error('Cancelled bag action reached menu');}};
 place.hooks.ferryActivity=terminalAction(game,place,async({state})=>{
  if(state!=='bag')return true;
  return actions.run(async job=>{reached();await job.wait(new Promise(resolve=>{finish=resolve;}));flags.ferry_bag_moved=true;return true;});
 });
 const runner=game.runner=new Runner(game);runner.use(place,story);const run=runner.run('traveller');await holding;
 actions.cancel();game.place={name:'harbour'};flags.place='harbour';await run;finish();await Promise.resolve();
 assert.equal(flags.ferry_bag_moved,undefined);assert.equal(flags.ferry_action_complete,false);
 assert.ok(!lines.includes('どうぞ。'));assert.deepEqual(runner.frames,[]);
});
test('an older terminal action cannot overwrite a newer place result',async()=>{
 const place={},game={place};let finish;const wait=new Promise(resolve=>{finish=resolve;});
 const perform=terminalAction(game,place,({old})=>old?wait:Promise.resolve(true));
 const old=perform({old:true});await perform({});finish(false);await old;assert.equal(flags.ferry_action_complete,true);
});
const {terminalFoodState}=await import('../../js/places/ferry-terminal/food-state.js');
test('actual meal node checkpoint after consumption cannot prepare a second identical item on Continue',async()=>{
 for(const key of Object.keys(flags))delete flags[key];flags.place='ferry_terminal';
 const inventory={inv:['milk','milk']},food=terminalFoodState(inventory,flags);let saved=null;
 const place={name:'ferry_terminal',people:{},hooks:{}},game={place,hooks:{},queue:[],wait:async()=>{},found:new Set()};
 globalThis.__saveTestUI={choose:(_who,_text,choices)=>choices.findIndex(c=>c.html.includes('Sit for a while'))};
 place.hooks.ferryActivity=terminalAction(game,place,async({state,item})=>{
  if(state==='prepareFood')return food.prepare(item);
  if(state==='consume'){if(food.pending()){food.consume();saved={runner:game.runner.snapshot(),flags:structuredClone(flags),inv:[...inventory.inv]};}return true;}
  if(state==='foodSync')food.sync();return true;
 });
 const runner=game.runner=new Runner(game);runner.use(place,story);await runner.run('food_milk');
 assert.deepEqual(inventory.inv,['milk']);assert.equal(saved.runner.execution.frames.at(-1).node,'eat_prepared');
 for(const key of Object.keys(flags))delete flags[key];Object.assign(flags,saved.flags);inventory.inv=[...saved.inv];
 const resumed=game.runner=new Runner(game);resumed.use(place,story);resumed.restore(saved.runner);assert.equal(await resumed.resume(),true);
 assert.deepEqual(inventory.inv,['milk'],'the second owned carton remains after replay');
 await resumed.run('food_milk');assert.deepEqual(inventory.inv,[],'a later deliberate choice may consume another carton');
});
