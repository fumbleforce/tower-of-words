import test from 'node:test';
import assert from 'node:assert/strict';
import { timeChoices } from '../../js/ui/time-policy.js';
import { overlayTop } from '../../js/perf/overlay-position.js';
const periods = ['early','morning','lunch','afternoon','evening'];
const choices = args => timeChoices({day:3,period:'morning',started:true,...args},periods);
test('clock preserves authored day-one and day-two progression',()=>{
  for(const day of [1,2]) for(const period of periods) {
    const result=choices({day,period});assert.deepEqual(result.targets,[]);assert.match(result.reason,/current goal/);
  }
});
test('free days offer only later periods, not tomorrow or a backward jump',()=>{
  for(const day of [3,4,5]) {
    assert.deepEqual(choices({day}).targets,['lunch','afternoon','evening']);
    assert.deepEqual(choices({day,period:'lunch'}).targets,['afternoon','evening']);
    assert.deepEqual(choices({day,period:'afternoon'}).targets,['evening']);
    assert.match(choices({day,period:'evening'}).reason,/Sleep in your room/);
  }
});
test('opening messages, active scenes and completed days cannot be skipped',()=>{
  for(const state of [{started:false},{busy:'talking'},{busy:'busy'},{ended:true}]) {
    const result=choices(state);assert.deepEqual(result.targets,[]);assert.ok(result.reason);
  }
  assert.deepEqual(choices({period:'bad'}).targets,[]);
});
test('performance placement follows scaled/wrapped HUD and ignores hidden boxes',()=>{
  assert.equal(overlayTop([{width:850,height:44,bottom:64}]),74);
  assert.equal(overlayTop([{width:370,height:142,bottom:152}]),162);
  assert.equal(overlayTop([{width:0,height:0,bottom:500},{width:300,height:70,bottom:95.3}]),106);
});
