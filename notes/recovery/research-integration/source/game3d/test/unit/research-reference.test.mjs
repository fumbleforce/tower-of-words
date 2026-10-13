import test from 'node:test';
import assert from 'node:assert/strict';
import { loadReading, readingAction as act, bookLocations, currentPage } from '../../js/reading-room/model.js';
import { readingState } from '../../js/reading-room/state.js';
test('two real volumes survive replacement, seat changes and Continue without duplication', () => {
 let s=act(null,{type:'select',book:'weather',seat:'research_table_seat'});
 s=act(s,{type:'turn',page:1});s=act(s,{type:'mark'});
 s=act(s,{type:'select',book:'copier',seat:'research_window_seat'});
 assert.deepEqual(bookLocations(s),{weather:'shelf',copier:'research_window_seat'});
 s=loadReading(JSON.parse(JSON.stringify(s)));
 s=act(s,{type:'select',book:'weather',seat:'research_window_seat'});
 assert.equal(currentPage(s),'weather-shapes');
 assert.deepEqual(bookLocations(s),{weather:'research_window_seat',copier:'shelf'});
 s=act(s,{type:'putBack'});assert.deepEqual(bookLocations(s),{weather:'shelf',copier:'shelf'});
 assert.equal(s.marks.weather,1);
});
test('bad saves cannot put a volume on an unknown seat or select an absent page', () => {
 const s=loadReading({v:1,active:{book:'weather',seat:'chief_desk'},pages:{weather:99,copier:-1},marks:{weather:'1',copier:0}});
 assert.equal(s.active,null);assert.deepEqual(s.pages,{weather:0,copier:0});assert.deepEqual(s.marks,{weather:null,copier:0});
 assert.throws(()=>act(s,{type:'select',book:'third',seat:'research_table_seat'}));
 assert.throws(()=>act(s,{type:'turn',page:0}));
});
test('state commits only explicit physical completion; replayed placement is idempotent', () => {
 const flags={copier_done:true,sender_state:{held:25}},saved=[];const s=readingState(flags,()=>saved.push(structuredClone(flags)));
 assert.equal(flags.research_state,undefined);
 const action={type:'select',book:'copier',seat:'research_table_seat'};
 s.act(action);const first=s.read();s.act(action);assert.deepEqual(s.read(),first);
 const outside=readingState(flags);assert.deepEqual(outside.read(),first);
 const copy=outside.read();copy.active.book='weather';assert.equal(outside.read().active.book,'copier');
 assert.equal(flags.copier_done,true);assert.deepEqual(flags.sender_state,{held:25});assert.equal(saved.length,2);
});

test('spare reading seats retain one active volume and its bookmark across saves', () => {
 let s=act(null,{type:'select',book:'weather',seat:'research_table_seat'});
 s=act(s,{type:'turn',page:1});s=act(s,{type:'mark'});
 for(const seat of ['research_side_seat','research_end_seat']) {
  s=act(s,{type:'select',book:'weather',seat});
  s=loadReading(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(bookLocations(s),{weather:seat,copier:'shelf'});
  assert.equal(currentPage(s),'weather-shapes');assert.equal(s.marks.weather,1);
 }
});
