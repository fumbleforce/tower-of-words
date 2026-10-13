import test from 'node:test';
import assert from 'node:assert/strict';
import works from '../../story/works.js';
import room from '../../story/research_lab.js';
import {STORIES as day2} from '../../story/day2/index.js';
import {STORIES as day3} from '../../story/day3/index.js';
import {STORIES as day4} from '../../story/day4/index.js';
import {STORIES as day5} from '../../story/day5/index.js';
import {STORIES as recurring} from '../../story/ongoing/index.js';
import {waysOut} from '../../js/travel/ways.js';
import {placeStates,openToday} from '../../js/travel/rules.js';
import {createConditionEvaluator} from '../../js/narrative/conditions.js';
const cond=createConditionEvaluator(()=>false);
test('the real Research door and both map directions are plain walks on every public day',()=>{
 for(const [day,stories]of [[1,{works,research_lab:room}],[2,day2],[3,day3],[4,day4],[5,day5],[6,recurring]]){
  const graph=Object.fromEntries(['works','research_lab'].map(p=>[p,waysOut(p,stories[p],{day,cond})]));
  assert.equal(graph.works.find(x=>x.to==='research_lab')?.scene,false,'entry on day '+day);
  assert.equal(graph.research_lab.find(x=>x.to==='works')?.scene,false,'exit on day '+day);
  for(const [from,to]of [['works','research_lab'],['research_lab','works']])assert.equal(placeStates({here:from,day,graph})[to].state,'go');
 }
});
test('day2 extension leaves sports and other works interiors closed and keeps its objective',()=>{
 assert.equal(openToday(2).includes('sports'),false);
 for(const id of ['old_factory','old_power_plant','recycling_centre','server_hall'])assert.equal(openToday(2).includes(id),false);
 assert.deepEqual(day2.works.nodes.arrive,[]);assert.deepEqual(day2.research_lab.nodes.arrive,[]);
 assert.deepEqual(day2.works.goal,{});
});

test('optional ongoing arrival keeps setup and explicitly preserves the existing objective',()=>{
 assert.deepEqual(recurring.research_lab.nodes.ongoing_arrive,[{do:'ongoingSetup'}]);
 assert.deepEqual(recurring.works.nodes.ongoing_arrive,[{do:'ongoingSetup'},{do:'ongoingGoal',keepExisting:true}]);
 assert.equal(recurring.harbour.nodes.ongoing_arrive.at(-1).do,'ongoingGoal');
 assert.equal(recurring.harbour.nodes.ongoing_arrive.at(-1).keepExisting,undefined);
});
