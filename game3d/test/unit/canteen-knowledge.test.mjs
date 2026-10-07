import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({resolve(s,c,next){if(s.endsWith('/move.js'))return{url:'data:text/javascript,export const faceRig=()=>{throw Error("Unexpected turn")}',shortCircuit:true};return next(s,c);}});
import { createConversationMemory } from '../../js/conversations/memory.js';
import { REMARKS } from '../../story/conversations/remarks.js';
const id='canteen_vegetable_recommendation';
const hear=(memory,known)=>memory.hear({who:'canteen_cardigan',text:'これ、{oishii}ですよ。',source:{day:3,period:'lunch',place:'canteen',node:'cardigan_hello'},known});
test('the actual heard recommendation and prior or later knowledge unlock the same saved topic without granting vocabulary',()=>{
 for(const first of ['hear','know']) {
   const words=new Set(),memory=createConversationMemory(REMARKS);
   if(first==='know')words.add('oishii');
   assert.equal(memory.ready(id,words),false,'knowing a word cannot invent the conversation');
   hear(memory,words);
   assert.equal(memory.ready(id,words),first==='know');
   if(first==='hear')assert.equal(words.size,0,'hearing never marks the word learned');
   const saved=memory.toJSON(),continued=createConversationMemory(REMARKS);continued.load(saved);
   words.add('oishii');assert.equal(continued.ready(id,words),true);
   assert.equal(continued.entries()[0].source.day,3);assert.equal(continued.entries()[0].text,'これ、{oishii}ですよ。');
   assert.equal(continued.entries()[0].understoodAtTime,first==='know');
 }
});


test('authored cardigan recommendation points with her arm to her actual side dish',async()=>{
 const {default:story}=await import('../../story/canteen.js');
 const {canteenDiners}=await import('../../js/places/canteen/diners.js');
 const step=story.nodes.cardigan_recommendation.find(s=>s.state==='recommendationPoint');
 const cardigan={},shirt={},calls=[];
 const P={people:{canteen_cardigan:cardigan,canteen_shirt:shirt}};
 const props={cardigan:{root:{position:{x:-5.1,y:.624,z:-1.43}}},shirt:{root:{position:{x:-9.35,y:.624,z:-4.5}}}};
 const hands={pointAt:async(job,rig,to)=>calls.push({rig,to})};
 await canteenDiners({},P,props,hands,()=>{},{ }).act({},step);
 assert.equal(calls.length,1);assert.equal(calls[0].rig,cardigan);
 assert.deepEqual(calls[0].to,[-5.1,.744,-1.43]);
});
