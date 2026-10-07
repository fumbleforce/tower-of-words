import test from 'node:test';
import assert from 'node:assert/strict';
import { senderState } from '../../js/investigations/sender/state.js';
test('unoffered console adds no synthetic investigation to an ordinary legacy save', () => {
 const flags={day:2,d2_ticket_done:true}; const before=structuredClone(flags);
 const sender=senderState(flags);sender.reload();assert.deepEqual(flags,before);
});
test('offered model survives global save hydration while other progression remains unchanged',()=>{
 const flags={day:2,d2_ticket_done:true,money:7};let saved;
 const sender=senderState(flags,()=>{saved=structuredClone(flags);});
 sender.act({type:'offer'});sender.act({type:'wake'});sender.act({type:'select',row:'1:1'});
 const restored=senderState(saved);assert.deepEqual(restored.read(),sender.read());
 assert.equal(saved.money,7);assert.equal(saved.sender_compared,false);
 restored.act({type:'select',row:'2:0'});restored.act({type:'hold',item:25});
 assert.equal(saved.sender_compared,true);assert.equal(saved.sender_partial,false);
});
