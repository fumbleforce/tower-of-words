import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseCondition,writeCondition} from '../web/conditions.js';
test('nested availability stays grouped and round trips',()=>{
 const t=parseCondition('day >= 2 && (know_ohayo || !met_kuro)');
 assert.equal(t.all[0].value,2);assert.equal(t.all[1].any[1].not.field,'met_kuro');assert.deepEqual(parseCondition(writeCondition(t)),t);
});
test('custom expressions are preserved without execution',()=>{
 for(const s of ['custom(x)','flags.ready','a + b',"place == 'station' garbage"])assert.equal(parseCondition(s).preserved,s);
});
test('typed values and empty availability',()=>{
 assert.equal(parseCondition("place == 'station'").value,'station');assert.equal(parseCondition('done == false').value,false);assert.equal(writeCondition(parseCondition('')),'');
});
test('empty nested groups do not create invalid expressions',()=>{
 const output=writeCondition({all:[{field:'day',op:'>=',value:2},{any:[]}]});
 assert.equal(output,'(day >= 2)');assert.equal(parseCondition(output).field,'day');
});
test('removing every condition in a negated group removes the empty rule',()=>{
 assert.equal(writeCondition({not:{all:[]}}),'');
});
