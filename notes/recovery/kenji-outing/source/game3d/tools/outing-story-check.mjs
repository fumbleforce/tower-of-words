import assert from 'node:assert/strict';
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
const root=fileURLToPath(new URL('../../',import.meta.url));
const url=p=>pathToFileURL(root+p);
register(url('game3d/test/support/save-loader.mjs'));
globalThis.localStorage={getItem:()=>null,setItem(){}};
globalThis.location={search:'?mc='+(process.argv[2]||'eric')};
globalThis.window={};
globalThis.fetch=async()=>({ok:false});
const {Runner,flags}=await import(url('game3d/js/runner.js'));
const {known,seen}=await import(url('game3d/js/lang.js'));
const {MC}=await import(url('game3d/js/mc.js'));
const {default:story}=await import(url('game3d/story/conversations/index.js'));
const {default:outing}=await import(url('game3d/story/conversations/outing.js'));
const {topicFor,withConversations}=await import(url('game3d/js/conversations/index.js'));
const model=await import(url('game3d/js/outings/model.js'));
const records=[];
function inspect(steps){for(const s of steps){assert(!s.wait&&!s.en&&!s.learn&&!s.offer,'No timed reading, translations or free lesson');if(s.say==='kenji')assert(s.overheard);if(s.do)assert(!['bond','bondStep','take','buy','type','remember','fact','trip'].includes(s.do),'No story-owned award or teleport');if(s.then)inspect(s.then);if(s.else)inspect(s.else);}}
Object.values(outing.nodes).forEach(inspect);
assert.equal(topicFor('kenji',undefined,undefined,true).label,'Chat with Kenji');
assert.equal(topicFor('kenji',undefined,undefined,false),null);
const merged=withConversations({on:{'talk:kenji':'primary'},nodes:{primary:[]}});
assert.equal(merged.on['talk:kenji'],'primary');
assert.equal(merged.on['ask:kenji'],'outing_chat');
async function play(name,{node='outing_chat',initial={},words=[],picks=[],fail=[]}={}){
 for(const k of Object.keys(flags))delete flags[k];
 known.clear();seen.clear();words.forEach(w=>known.add(w));
 Object.assign(flags,{day:3,period:'afternoon',...initial});
 const transcript=[],menus=[],actions=[];let cursor=0;
 let state=model.readOuting(initial.state||{status:initial.outing_active?'active':initial.outing_paused?'paused':'idle',day:3,period:'afternoon',stops:initial.outing_done_arcade?['arcade']:[],callback:initial.outing_callback});
 function sync(){flags.outing_active=state.status==='active';flags.outing_paused=state.status==='paused';flags.outing_callback=state.callback||'';for(const s of ['arcade','drink','coast'])flags['outing_done_'+s]=state.stops.includes(s);}
 sync();
 globalThis.__saveTestUI={say:(speaker,text,opts)=>{transcript.push({speaker:speaker?.name,text,overheard:opts?.overheard});},choose:(_who,_text,options)=>{const labels=options.map(o=>o.html);menus.push(labels);const wanted=picks[cursor++];assert(wanted,`${name}: unexpected menu ${labels}`);const at=labels.findIndex(s=>s.includes(wanted));assert(at>=0,`${name}: missing ${wanted} in ${labels}`);return at;}};
 const place={name:initial.place||'shotengai',people:{},hooks:{}};
 const game={place,queue:[],wait:async()=>{},hooks:{cam(){},gesture(){},face(){},save(){},goal(s){actions.push(s);},outing(s){actions.push(s);flags.outing_action_complete=!fail.includes(s.state);if(!flags.outing_action_complete){if(['arcade','drink','coast'].includes(s.state))state=model.beginStop(state,s.state);s.failedPending=state.pending;return;}switch(s.state){case'invite':state=model.inviteOuting(state,{day:3,period:'afternoon',weekend:true,met:true,visible:true,available:true});break;case'resume':state=model.resumeOuting(state,{day:3,period:'afternoon',weekend:true,met:true,visible:true,available:true});break;case'pause':state=model.pauseOuting(state);break;case'finish':state=model.finishOuting(state);flags.outing_seated=false;break;case'keepWalking':state=model.cancelStop(state);flags.outing_seated=false;break;case'arcade':case'coast':state=model.completeStop(model.beginStop(state,s.state),s.state);if(s.state==='coast')flags.outing_seated=true;break;}sync();}}};
 const runner=game.runner=new Runner(game);runner.use(place,story);await runner.run(node);
 assert.equal(cursor,picks.length,`${name}: unused picks`);assert.equal(runner.recoveryError,undefined);assert.equal(runner.frames.length,0);
 assert.deepEqual([...known],words,`${name}: knowledge changed`);
 const result={name,mc:MC.id,transcript,menus,actions,state,flags:{...flags}};records.push(result);return result;
}
for(const words of [[],['ikitai'],['isshoni'],['ikitai','isshoni']]){
 const r=await play('invitation menu '+words,{words,picks:['Maybe another time']});
 assert.equal(r.menus[0].some(s=>s.includes('Try')),words.length===2);
}
let r=await play('ordinary invitation unknown words',{picks:['Invite Kenji','Walk to the seafront']});assert.equal(r.state.status,'active');assert.deepEqual(r.state.stops,[]);
r=await play('word invitation',{words:['ikitai','isshoni'],picks:['Try','Walk to the shop street']});assert(r.transcript.some(l=>l.text==='うん、{isshoni}行こう。'));
r=await play('busy invitation',{picks:['Invite Kenji'],fail:['invite']});assert.equal(r.state.status,'idle');assert(!r.transcript.some(l=>l.text.includes('どっち')));
r=await play('busy resume',{initial:{outing_paused:true},picks:['Continue our walk'],fail:['resume']});assert.equal(r.state.status,'paused');
r=await play('resume keeps receipt',{initial:{outing_paused:true,state:{status:'paused',day:3,period:'afternoon',stops:['arcade']}},picks:['Continue our walk','Walk to the seafront']});assert.deepEqual(r.state.stops,['arcade']);
for(const heard of [false,true]){r=await play('arcade context '+heard,{initial:{outing_active:true,kenji_arcade_talked:heard},picks:['Stop by','Keep walking']});assert.equal(r.transcript.some(l=>l.text.includes('telling me')),heard);assert.equal(r.flags.kenji_arcade_talked,heard);assert.deepEqual(r.state.stops,['arcade']);}
r=await play('failed arcade arrival',{initial:{outing_active:true},picks:['Stop by','Keep walking'],fail:['arcade']});assert.deepEqual(r.state.stops,[]);assert.equal(r.transcript.length,0);assert.equal(r.actions.find(a=>a.state==='arcade').failedPending,'arcade');assert.equal(r.state.pending,null);
r=await play('repeat arcade',{initial:{outing_active:true,outing_done_arcade:true},picks:['Stop by','Keep walking']});assert(r.transcript.some(l=>l.text==='もう少し見る？'));assert.deepEqual(r.state.stops,['arcade']);
r=await play('drink wait no purchase yet',{initial:{outing_active:true},picks:['Buy a drink']});assert.deepEqual(r.state.stops,[]);assert(r.actions.some(a=>a.state==='drink'));assert(!r.actions.some(a=>a.do==='trip'));
r=await play('closed shop',{initial:{day:2,outing_active:true},picks:['Buy a drink']});assert(!r.actions.some(a=>a.state==='drink'));assert.deepEqual(r.state.stops,[]);
r=await play('coast sit successful',{initial:{outing_active:true,place:'east_coast'},picks:['Sit on','Stay on']});assert.deepEqual(r.state.stops,['coast']);assert.equal(r.flags.outing_seated,true);
r=await play('coast unavailable',{initial:{outing_active:true,place:'east_coast'},picks:['Sit on'],fail:['coast']});assert.deepEqual(r.state.stops,[]);assert(!r.transcript.some(l=>l.text==='あー、ちょっと休もう。'));
r=await play('restored seated controls',{initial:{outing_active:true,outing_seated:true,place:'east_coast'},picks:['Get up']});assert.equal(r.flags.outing_seated,false);
r=await play('part before stop',{initial:{outing_active:true},picks:['split up']});assert.equal(r.state.callback,null);assert.equal(r.state.status,'ended');
for(const receipt of ['arcade','drink','coast']){
 const text={arcade:'Ask about stopping',drink:'Mention the drink',coast:'Tell him you liked'}[receipt];
 r=await play('callback '+receipt,{initial:{outing_callback:receipt},picks:[text]});assert.equal(r.state.callback,receipt);assert.equal(r.transcript.length,2);
}
r=await play('legacy arcade remains reachable',{picks:['Talk about the arcade','Let him get back']});assert.equal(r.state.status,'idle');
r=await play('waiting survives another Chat',{initial:{outing_active:true,outing_waiting:true},picks:["I'll head into"]});assert(!r.actions.some(a=>a.state==='keepWalking'));assert(!r.actions.some(a=>a.do==='trip'));
r=await play('cancel waiting by walking',{initial:{outing_active:true,outing_waiting:true},picks:['Keep walking']});assert(r.actions.some(a=>a.state==='keepWalking'));
r=await play('repeat coast seating',{initial:{outing_active:true,place:'east_coast',state:{status:'active',day:3,period:'afternoon',stops:['coast']}},picks:['Sit on','Stay on']});assert.deepEqual(r.state.stops,['coast']);assert(!r.transcript.some(l=>l.text==='あー、ちょっと休もう。'));
for(const place of ['plaza','east_lane','dorm_commons']){r=await play('route controls '+place,{initial:{outing_active:true,place},picks:['Keep walking']});assert(r.menus[0].some(s=>s.includes('shop street')));assert(r.menus[0].some(s=>s.includes('seafront')));}
r=await play('old word topic remains available',{initial:{kenji_arcade_talked:true},picks:['Talk about the arcade','Let him get back']});assert(r.menus[1].some(s=>s.includes('How do you say')));
r=await play('failed drink returns to walking',{initial:{outing_active:true},picks:['Buy a drink','Keep walking'],fail:['drink']});assert.equal(r.actions.find(a=>a.state==='drink').failedPending,'drink');assert.equal(r.state.pending,null);assert.equal(r.state.status,'active');
r=await play('failed departure returns to walking',{initial:{outing_active:true},picks:['split up','Keep walking'],fail:['finish']});assert.equal(r.state.status,'active');assert.equal(r.state.callback,null);assert.equal(r.transcript.length,2);
r=await play('repeat arcade stay',{initial:{outing_active:true,outing_done_arcade:true},picks:['Stop by','Stay here']});assert.deepEqual(r.state.stops,['arcade']);assert.equal(r.state.status,'active');
const source=Object.fromEntries(['game3d/story/conversations/outing.js','game3d/story/conversations/index.js','game3d/js/conversations/index.js'].map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(root+p)).digest('hex')]));
const out=process.env.OUTING_TRANSCRIPTS || path.join(root,'game3d/shots/kenji-outing/branches');
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,`${MC.id}-transcripts.json`),JSON.stringify({scope:'Actual Runner and actual outing save model; physical hooks are controlled outcomes, not browser evidence.',source,records},null,2)+'\n');
console.log(`PASS ${MC.id}: ${records.length} actual Runner branch transcripts; preserved legacy topic and primary Talk; no knowledge or reward grants`);
