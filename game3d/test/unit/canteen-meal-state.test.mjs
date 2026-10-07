import assert from 'node:assert/strict';
import test from 'node:test';
import {canteenMealState} from '../../js/places/canteen/meal-state.js';
import {CANTEEN_MEALS,canteenServing} from '../../js/gameplay/canteen-meals.js';
const resumed = (sim,flags) => {
 const data=JSON.parse(JSON.stringify({sim,flags}));
 return {...data,meal:canteenMealState(data.sim,data.flags)};
};
test('payment and physical collection survive replay without a second charge or lost meal',()=>{
 const sim={yen:1000,inv:['island_directory']},flags={},meal=canteenMealState(sim,flags);
 assert.equal(meal.select('curry'),true);assert.equal(meal.pay(),true);assert.equal(sim.yen,580);
 const save=resumed(sim,flags);
 assert.equal(save.meal.pay(),true);assert.equal(save.sim.yen,580);
 assert.equal(save.meal.select('vegetables'),false,'an outstanding tray must not be overwritten');
 assert.equal(save.meal.take(),true);save.meal.leave();
 assert.equal(save.meal.phase(),'paid');assert.equal(save.meal.pay(),true);assert.equal(save.sim.yen,580);
 assert.equal(save.meal.take(),true);assert.equal(save.meal.place('canteen_seat_w'),true);
 assert.equal(save.meal.eat(),true);
 const eaten=resumed(save.sim,save.flags);assert.equal(eaten.meal.eat(),false);
 assert.equal(eaten.meal.select('vegetables'),false);assert.equal(eaten.meal.returnTray(),true);
 assert.equal(eaten.meal.returnTray(),false);assert.equal(eaten.meal.select('vegetables'),true);
 assert.equal(eaten.meal.pay(),true);assert.equal(eaten.sim.yen,100);
 assert.deepEqual(eaten.sim.inv,['island_directory'],'room crockery never becomes a Bag item');
});
test('failed payment and early cancellation preserve money, and a seated tray remains where saved',()=>{
 const sim={yen:419},flags={},meal=canteenMealState(sim,flags);
 assert.equal(meal.select('curry'),true);assert.equal(meal.pay(),false);meal.cancelSelection();
 assert.equal(sim.yen,419);assert.equal(meal.take(),false);assert.equal(meal.eat(),false);
 sim.yen=500;meal.select('vegetables');assert.equal(meal.pay(),true);meal.take();meal.place('canteen_seat_e');meal.leave();
 const save=resumed(sim,flags);assert.equal(save.meal.phase(),'table');assert.equal(save.flags.canteen_meal_seat,'canteen_seat_e');
 assert.equal(save.sim.yen,20);assert.equal(save.meal.eat(),true);
 assert.throws(()=>meal.select('milk'),/Unknown canteen meal/);
});
test('the approved menu prices are canonical and hot service is lunch only across continuing days',()=>{
 assert.equal(CANTEEN_MEALS.curry.price,420);assert.equal(CANTEEN_MEALS.vegetables.price,480);
 for(const day of [1,3,6,32])for(const period of ['early','morning','lunch','afternoon','evening'])assert.equal(canteenServing(day,period),period==='lunch');
});
test('water parks an existing entitlement durably without reopening payment',()=>{
 const sim={yen:1000},flags={},meal=canteenMealState(sim,flags);
 meal.select('curry');meal.pay();meal.deliver();meal.take();assert.equal(meal.park(),true);
 const restored=resumed(sim,flags);assert.equal(restored.meal.phase(),'parked');assert.equal(restored.meal.delivered(),true);
 assert.equal(restored.meal.select('vegetables'),false);assert.equal(restored.meal.pay(),true);assert.equal(restored.sim.yen,580);
 restored.meal.leave();assert.equal(restored.meal.phase(),'parked');assert.equal(restored.meal.take(),true);
});
