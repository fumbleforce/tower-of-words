import assert from 'node:assert/strict';
import {register} from 'node:module';
import test from 'node:test';
register(new URL('../support/save-loader.mjs',import.meta.url));
globalThis.localStorage={getItem:()=>null,setItem(){}};globalThis.window={};globalThis.fetch=async()=>({ok:false});
const {Runner}=await import('../../js/runner.js');
const {installResearch}=await import('../../js/reading-room/hook.js');
function setup(hook='research'){
 const calls=[],game={place:{name:'research_lab',people:{},research:{state:{read:()=>({active:null})},act:async(_a,replay)=>{calls.push(replay);return true;}}},hooks:{},queue:[],wait:async()=>{},captureStaging:()=>({fixture:true}),restoreStaging(){}};
 installResearch(game);if(hook!=='research')game.hooks[hook]=async(_a,replay)=>calls.push(replay);
 const story={people:{eric:{name:'Eric'}},nodes:{page:[{do:hook,state:'weatherPage'},{say:'eric',text:'The diagram.'}]}};
 const runner=game.runner=new Runner(game);runner.use(game.place,story);
 return{game,runner,story,calls};
}
test('actual Runner distinguishes a completed Research viewer from an unfinished one during replay',async()=>{
 for(const incomplete of [false,true]){
  const x=setup();let checkpoint;
  globalThis.__saveTestUI={say:()=>{checkpoint ||= x.runner.snapshot();}};
  const act=x.game.place.research.act;
  x.game.place.research.act=async(...args)=>{if(incomplete)checkpoint ||= x.runner.snapshot();return act(...args);};
  await x.runner.run('page');assert.equal(x.calls[0].completedReplay,false);
  const resumed=x.game.runner=new Runner(x.game);resumed.use(x.game.place,x.story);resumed.restore(checkpoint);await resumed.resume();
  assert.equal(x.calls.at(-1).completedReplay,!incomplete);
  assert.equal(x.calls.length,2,'physical world action is still replayed in either case');
 }
});
test('existing completed WORLD hook still replays its physical action exactly once',async()=>{
 const x=setup('cup');let checkpoint;globalThis.__saveTestUI={say:()=>{checkpoint ||= x.runner.snapshot();}};
 await x.runner.run('page');const resumed=x.game.runner=new Runner(x.game);resumed.use(x.game.place,x.story);resumed.restore(checkpoint);await resumed.resume();assert.equal(x.calls.length,2);assert.equal(x.calls.at(-1).completedReplay,true);
});
test('old Research checkpoint without a done marker safely reopens its viewer once',async()=>{
 const x=setup();let checkpoint;globalThis.__saveTestUI={say:()=>{checkpoint ||= x.runner.snapshot();}};
 await x.runner.run('page');for(const frame of checkpoint.execution.frames)frame.done=frame.done.filter(key=>!key.endsWith(':hook'));
 const resumed=x.game.runner=new Runner(x.game);resumed.use(x.game.place,x.story);resumed.restore(checkpoint);await resumed.resume();assert.equal(x.calls.at(-1).completedReplay,false);assert.equal(x.calls.length,2);
});
