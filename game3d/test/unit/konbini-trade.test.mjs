import assert from 'node:assert/strict';
import test from 'node:test';
import {konbiniTrade} from '../../js/places/konbini/trade.js';
import {ITEMS} from '../../js/gameplay/items.js';
import {konbiniNav,DOOR,SPOTS,SEAT} from '../../js/scenes/konbini/plan.js';
const fresh=()=>{const sim={yen:1000,inv:[]},flags={};return{sim,flags,t:konbiniTrade(sim,flags)};};
test('a saved basket has three distinct selections and uses canonical item prices',()=>{
 const {t,flags}=fresh();t.add('milk');const id=flags.konbini_order_id;t.add('milk');t.add('tea');t.add('coffee');
 assert.equal(flags.konbini_order_id,id);assert.deepEqual(t.basket(),['milk','tea','coffee']);
 assert.equal(t.total(),ITEMS.milk.price+ITEMS.tea.price+ITEMS.coffee.price);assert.equal(t.add('riceball'),false);
 t.remove('tea');t.remove('tea');assert.equal(t.add('riceball'),true);assert.deepEqual(t.basket(),['milk','coffee','riceball']);
});
test('confirmed basket payment and resumed collection award each selected item once',()=>{
 const {t,sim,flags}=fresh();t.add('milk');t.add('riceball');t.add('tea');assert.equal(t.pay(),true);
 const snapshot=structuredClone({sim,flags}),again=konbiniTrade(snapshot.sim,snapshot.flags);assert.equal(again.pay(),true);again.finish();again.pay();
 assert.equal(snapshot.sim.yen,590);assert.deepEqual(snapshot.sim.inv,['milk','riceball','tea']);
 again.add('milk');again.pay();again.finish();assert.equal(snapshot.sim.yen,440);assert.equal(snapshot.sim.inv.filter(x=>x==='milk').length,2);
});
test('return, cancellation and insufficient money never award unpaid groceries',()=>{
 const {t,sim,flags}=fresh();sim.yen=100;t.add('milk');assert.equal(t.pay(),false);assert.equal(flags.konbini_cant_pay,true);
 t.remove('milk');assert.equal(t.total(),0);assert.equal(t.pay(),false);t.add('riceball');t.cancel();
 assert.deepEqual(sim,{yen:100,inv:[]});assert.deepEqual(t.basket(),[]);assert.equal(flags.konbini_phase,'cancelled');
});
test('an eaten grocery is removed once across replay, without stats or gift effects',()=>{
 const {t,sim,flags}=fresh();t.add('milk');t.add('riceball');t.pay();t.finish();t.prepareConsume('milk');const id=flags.konbini_food_id;
 t.prepareConsume('milk');assert.equal(flags.konbini_food_id,id);assert.equal(t.consume(),true);assert.equal(t.consume(),false);
 assert.deepEqual(sim,{yen:720,inv:['riceball']});assert.equal(t.prepareConsume('tea'),false);assert.equal(ITEMS.milk.giftable,false);assert.equal(ITEMS.riceball.giftable,false);
});
test('the real entrance reaches fridge, till and perch without crossing furnishings',()=>{
 const n=konbiniNav();for(const p of [...Object.values(SPOTS),DOOR.out,SEAT.out]){assert.ok(n.free(...p),String(p));assert.ok(n.path(...DOOR.in,...p)?.length,String(p));}
 assert.equal(n.free(-1.4,-1.4),false);assert.equal(n.free(1.65,-2.4),false);assert.equal(n.free(0,-4),false);
});
