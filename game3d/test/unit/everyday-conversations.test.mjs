import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';
const root = new URL('../../../', import.meta.url).href;
register(root + 'game3d/test/support/save-loader.mjs');
globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.window = {};
globalThis.fetch = async () => ({ ok: false });
const { Runner, flags } = await import(root + 'game3d/js/runner.js');
const { known } = await import(root + 'game3d/js/lang.js');
const stories = {};
for (const id of ['mio','emi','guard','kuro','aoi','rei']) stories[id] = (await import(root + `game3d/story/conversations/${id}.js`)).default;
const intro = { kuro:'d3_kuro_intro', aoi:'d3_aoi_intro', rei:'d4_rei_intro' };
async function play(id, node, options = {}) {
  for (const k of Object.keys(flags)) delete flags[k];
  known.clear();for(const word of options.words||[])known.add(word);
  Object.assign(flags, { day: 10, [intro[id]]: true, ...options.flags });
  const lines=[],menus=[],typed=[],effects=[],staging=[];
  const place = { name: options.place || 'plaza', people: {}, hooks: {} };
  const game={place,queue:[],wait:async()=>{},hooks:{
    face(a){staging.push({face:a});},cam(a){staging.push({cam:a});},gesture(){},bow(){},save(){},remember(){},type({word}){typed.push(word);known.add(word);},
    bond:a=>effects.push(a),bondStep:a=>effects.push(a),meet:a=>effects.push(a),
  }};
  let savedFrames;
  game.captureStaging=()=>({place:place.name});game.restoreStaging=()=>{};
  const picks=[...(options.picks||[])];
  globalThis.__saveTestUI={say:(who,text,meta)=>lines.push({who:meta?.whoId,text}),choose:(_who,_line,opts)=>{
    menus.push(opts.map(o=>o.html));
    if(options.replay)savedFrames=structuredClone(game.runner.frames);
    const desired=picks.shift();
    if(desired===undefined)return opts.length-1;
    const n=opts.findIndex(o=>o.html.includes(desired));assert.ok(n>=0,`Missing ${desired}: ${opts.map(o=>o.html)}`);return n;
  }};
  const runner=game.runner=new Runner(game);runner.use(place,stories[id]);await runner.run(node);
  if(options.replay){staging.length=0;await runner.run(node,{restored:savedFrames});}
  assert.equal(runner.recoveryError,undefined);assert.equal(runner.frames.length,0);assert.deepEqual(effects,[]);
  assert.ok(!Object.keys(flags).some(k=>k.startsWith('ms')&&flags[k]),'no invented milestones');
  return {lines,menus,typed,staging,flags:structuredClone(flags),known:[...known]};
}
test('all new entry menus preserve the canonical introduction boundary',async()=>{
 for(const id of ['kuro','aoi','rei'])for(const node of [`chat_${id}`,`chat_${id}_understood`]){
  const r=await play(id,node,{flags:{[intro[id]]:false}});assert.deepEqual(r.lines,[]);assert.deepEqual(r.menus,[]);
 }
});
test('Kuro defers only actual workday reception mornings and retains off-duty topics',async()=>{
 const busy=await play('kuro','chat_kuro',{place:'forecourt',flags:{day:5,period_morning:true}});assert.equal(busy.menus.length,0);assert.equal(busy.lines.length,1);
 const off=await play('kuro','chat_kuro',{place:'forecourt',flags:{day:9,period_morning:true,ongoing_workday:false}});assert.equal(off.menus.length,1);
 const free=await play('kuro','chat_kuro',{place:'gym'});assert.ok(free.menus[0].some(t=>t.includes('away from the counter')));
});
test('unknown swimming stays an untranslated remark and does not leak through repeat labels',async()=>{
 const first=await play('kuro','chat_kuro',{picks:['time off']});assert.ok(first.lines.some(l=>l.text.startsWith('{oyogu}')));assert.deepEqual(first.known,[]);
 const again=await play('kuro','chat_kuro',{flags:{chat_kuro_swimming_asked:true}});assert.ok(again.menus[0].includes('Ask about her time off again.'));assert.ok(!again.menus[0].some(t=>t.includes('swimming')));
});
test('Aoi again depends on completed physical tennis, not an earlier rally choice',async()=>{
 const before=await play('aoi','chat_aoi_tennis',{flags:{d4_played_aoi:true}});assert.ok(before.lines.some(l=>l.text.startsWith('テニス、私も')));assert.deepEqual(before.known,[]);
 const after=await play('aoi','chat_aoi_tennis',{flags:{d4_tennis_done:true}});assert.ok(after.lines.some(l=>l.text.startsWith('またテニス')));
 const known=await play('aoi','chat_aoi_tennis',{words:['ikitai'],picks:['You want to go?']});assert.equal(known.flags.chat_aoi_tennis_understood,true);
});
test('Rei catch-up can be declined; choosing it teaches through the actual type hook and responds',async()=>{
 const skip=await play('rei','chat_rei_repeat_word');assert.deepEqual(skip.typed,[]);assert.deepEqual(skip.known,[]);
 const take=await play('rei','chat_rei_repeat_word',{picks:['Try saying','One game is enough']});assert.deepEqual(take.typed,['mouichido']);assert.equal(take.flags.chat_rei_one_game,true);assert.equal(take.flags.chat_rei_more_games,false);
});
test('Rei preserves a reversible conversational preference without inventing a played game',async()=>{
 const pending=await play('rei','chat_rei_preference_repeat');assert.ok(pending.lines.some(l=>l.text==='Would you ask for another game, or stop there?'));
 const change=await play('rei','chat_rei_preference_repeat',{flags:{chat_rei_one_game:true},picks:['I’d ask again']});assert.equal(change.flags.chat_rei_one_game,false);assert.equal(change.flags.chat_rei_more_games,true);
});
test('all local node references resolve and Kuro/Aoi speech has no translated subtitle bypass',()=>{
 for(const [id,story] of Object.entries(stories)){
  const walk=x=>{if(!x||typeof x!=='object')return;for(const k of ['go','call'])if(x[k])assert.ok(story.nodes[x[k]],`${id}:${x[k]}`);
   if(x.say===id&&['kuro','aoi','guard'].includes(id)){assert.equal(x.en,undefined);assert.ok(x.overheard||x.slow);}
   for(const v of Object.values(x))if(typeof v==='object')Array.isArray(v)?v.forEach(walk):walk(v);
  };walk(story.nodes);
 }
});
test('proposed exact remarks survive save and accept either order without inventing knowledge at hearing',async()=>{
 const {REMARKS:catalogue}=await import(root+'game3d/story/conversations/remarks.js');
 const {createConversationMemory}=await import(root+'game3d/js/conversations/memory.js');
 for(const entry of catalogue)for(const before of [false,true]){
  const memory=createConversationMemory(catalogue),words=new Set(before?entry.words:[]);
  assert.equal(memory.ready(entry.id,words),false);
  memory.hear({who:entry.who,text:entry.lines[0],known:words,source:{day:8,period:'lunch',place:'plaza',node:'authored'}});
  const restored=createConversationMemory(catalogue);restored.load(memory.toJSON());
  assert.equal(restored.entries()[0].understoodAtTime,before);
  entry.words.forEach(word=>words.add(word));assert.equal(restored.ready(entry.id,words),true);
  assert.equal(restored.entries()[0].understoodAtTime,before);
 }
});

test('working mornings defer Mio and Emi, while days off keep their full menus',async()=>{
 for(const id of ['mio','emi']){
  const busy=await play(id,`chat_${id}`,{place:'office',flags:{day:6,period_morning:true,ongoing_workday:true}});
  assert.equal(busy.menus.length,0);assert.equal(busy.lines.length,1);
  const off=await play(id,`chat_${id}`,{place:'office',flags:{day:10,period_morning:true,ongoing_workday:false}});
  assert.ok(off.menus[0].length>=3);
 }
});
test('Mio quote is Japanese, learning is optional, and later follow-up does not invent an outing',async()=>{
 const heard=await play('mio','chat_mio_mainland',{picks:['That sounds nice']});
 assert.ok(heard.lines.some(l=>l.text==='休みの日ぐらい、仕事を忘れなさい。'));
 assert.deepEqual(heard.known,[]);
 const later=await play('mio','chat_mio_break',{words:['yasumi'],picks:['She might have a point']});
 assert.equal(later.flags.chat_mio_break_understood,true);
 assert.ok(!later.lines.some(l=>l.text.includes('I’d been out')));
 const again=await play('mio','chat_mio_understood',{words:['yasumi'],flags:{chat_mio_break_understood:true},picks:['still ask about your weekends']});
 assert.ok(!again.lines.some(l=>l.text.includes('You got that part')));
});
test('Emi teaches only after a requested practice and never awards a club milestone',async()=>{
 const ordinary=await play('emi','chat_emi_team',{picks:['bring you the result']});assert.deepEqual(ordinary.typed,[]);
 const practice=await play('emi','chat_emi_repeat_word');assert.deepEqual(practice.typed,['mouichido']);
 const repeat=await play('emi','chat_emi_turn');assert.ok(!repeat.lines.some(l=>l.text.includes('got a turn this time')));
});
test('the guard does not mention a cat before meeting Tama or translate his full reply',async()=>{
 const menu=await play('guard','chat_guard');assert.ok(!menu.menus[0].includes('Ask about Tama.'));
 const hello=await play('guard','chat_guard_hello');assert.deepEqual(hello.known,[]);assert.deepEqual(hello.typed,[]);
 assert.ok(hello.lines.some(l=>l.text==='少し、お休みになりますか。'));
});

test('actual Runner replays both participants facing before each Chat camera',async()=>{
 for(const id of ['mio','emi','guard','kuro','aoi','rei']){
  const r=await play(id,`chat_${id}`,{replay:true});
  const at=r.staging.findIndex(s=>s.cam?.on===id);
  assert.ok(at>=2,id);
  assert.deepEqual(r.staging.slice(at-2,at),[{face:{do:'face',who:'eric',to:id}},{face:{do:'face',who:id,to:'eric'}}]);
 }
});
