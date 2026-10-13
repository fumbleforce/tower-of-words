import test from 'node:test';
import assert from 'node:assert/strict';
import {createConversationMemory} from '../../js/conversations/memory.js';
import {REMARKS} from '../../story/conversations/remarks.js';
import {referenceEligibility} from '../../js/reading-room/evidence.js';
const place=()=>{const space={};return {name:'office',space,people:{mori:{root:{visible:true,parent:space},seated:true}}};};
const hear=m=>m.hear({who:'mori',text:'古い資料ですが、よかったら使ってください。',source:{day:2,place:'office',node:'d2_mori_work'},known:new Set()});
test('exact offer and intentionally learned word unlock in either order across Continue',()=>{
 for(const wordFirst of [true,false]){
  let m=createConversationMemory(REMARKS);const words=new Set(),p=place();
  if(wordFirst)words.add('shiryou');else hear(m);
  assert.equal(referenceEligibility(p,{},m,words,2).understood,false);
  if(wordFirst)hear(m);else words.add('shiryou');
  const saved=m.toJSON();m=createConversationMemory(REMARKS);m.load(saved);
  assert.equal(referenceEligibility(p,{},m,words,2).understood,true);
 }
});
test('day and completed repair never invent offer evidence; exact Mio notes only affect recognition',()=>{
 const m=createConversationMemory(REMARKS),words=new Set(['shiryou']),p=place();
 assert.deepEqual(referenceEligibility(p,{day:9,d2_shift_done:true},m,words,9),{available:true,understood:false,notesRecognized:true});
 m.hear({who:'mio',text:REMARKS.find(r=>r.id==='mio_old_copier_explanation').lines[0],source:{day:2,node:'d2_notes'},known:words});
 assert.equal(referenceEligibility(p,{},m,words,2).notesRecognized,true);
 assert.equal(referenceEligibility(p,{},m,words,2).understood,false);
});
test('unavailable or outside Mori never exposes an office paper callback',()=>{
 const m=createConversationMemory(REMARKS),words=new Set(['shiryou']);hear(m);
 for(const mutate of [p=>p.name='harbour',p=>p.people.mori.root.visible=false,p=>p.people.mori.root.parent={},p=>p.people.mori._walk=true,p=>p.people.mori.seated=false]){
  const p=place();mutate(p);assert.equal(referenceEligibility(p,{},m,words,2).understood,false);
 }
});

test('day1 reading cannot grant Mori’s old annotated copy even with imported evidence',()=>{const p=place(),m=createConversationMemory(REMARKS);hear(m);assert.equal(referenceEligibility(p,{},m,new Set(['shiryou']),1).available,false);});
