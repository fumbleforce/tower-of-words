import assert from 'node:assert/strict';
import test from 'node:test';
import {terminalFoodState} from '../../js/places/ferry-terminal/food-state.js';
test('a prepared meal changes inventory only on completed consumption and survives Continue replay once',()=>{
 const sim={inv:['milk','milk','island_directory']},flags={},food=terminalFoodState(sim,flags);
 assert.equal(food.prepare('milk'),true);assert.deepEqual(sim.inv,['milk','milk','island_directory']);
 const before=JSON.parse(JSON.stringify({sim,flags})),resumed=terminalFoodState(before.sim,before.flags);
 assert.equal(resumed.prepare('milk'),true);assert.equal(before.flags.ferry_food_id,1);assert.equal(resumed.consume(),true);
 assert.deepEqual(before.sim.inv,['milk','island_directory']);
 const after=JSON.parse(JSON.stringify(before)),replayed=terminalFoodState(after.sim,after.flags);
 assert.equal(replayed.consume(),false);assert.deepEqual(after.sim.inv,['milk','island_directory']);
 assert.equal(replayed.prepare('milk'),true);assert.equal(after.flags.ferry_food_id,2);assert.equal(replayed.consume(),true);
 assert.deepEqual(after.sim.inv,['island_directory']);
});
test('unsupported or missing food never becomes an inventory action; leaving selected food does not consume it',()=>{
 const sim={inv:['island_directory','riceball']},flags={},food=terminalFoodState(sim,flags);
 assert.equal(food.prepare('island_directory'),false);assert.equal(food.prepare('milk'),false);
 assert.equal(food.prepare('riceball'),true);food.sync();assert.equal(flags.ferry_has_riceball,true);
 assert.deepEqual(sim.inv,['island_directory','riceball']);
 sim.inv.splice(1,1);assert.equal(food.consume(),false);assert.equal(flags.ferry_consumed_id,undefined);
});
