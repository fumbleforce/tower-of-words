import fs from 'node:fs';
import assert from 'node:assert/strict';
import {withBrowserJob} from '../../tools/lib/browser-job.mjs';
import {waitForGame} from '../test/support/wait-ready.mjs';
import {publicResearchContext} from '../test/support/research-integration-evidence.mjs';
const width=+(process.argv[2]||1366),order=process.argv[3]||'evidence',mc=width<700?'carina':'eric',base=new URL((process.env.BASE||'game3d')+'/',`http://127.0.0.1:${process.env.PORT||8771}/`).href,out=`/tmp/codex-research-callback-${process.env.ROUND||'1'}`;fs.mkdirSync(out,{recursive:true});
await withBrowserJob('research-callback',async browser=>{
 const errors=[],context=await publicResearchContext(browser,{width,height:width<700?844:860},errors),page=await context.newPage(),captures=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({v:2,textSpeed:'instant',voiceOn:false,privateMode:false})));
 const shot=id=>page.screenshot({path:`${out}/${width}-${order}-${id}.png`}),idle=()=>page.waitForFunction(()=>!globalThis.__game.busy,null,{timeout:90000});
 const phases=new Set();let watching=true;const watcher=(async()=>{while(watching){try{const cap=await page.evaluate(()=>globalThis.__referenceCapture);if(cap){await page.waitForTimeout(450);await shot('line-'+cap.id);captures.push(cap);await page.evaluate(async()=>{globalThis.__referenceCapture=null;const {ui}=await import('./js/ui.js');ui.auto=true;ui._advance?.();});}else {const phase=await page.evaluate(()=>globalThis.__game?.place?.researchOffice?.phase);if(phase&&!phases.has(phase)){phases.add(phase);await shot('action-'+phase);}}}catch{}await new Promise(r=>setTimeout(r,70));}})();
 async function enter(place){await page.evaluate(place=>globalThis.__game.travel(place,{fast:true}),place);await idle();if(place==='office')await page.evaluate(async()=>{const g=globalThis.__game,{flags}=await import('./js/narrative/state.js');flags.d2_ticket_done=true;g.place.hooks.officeDay2({state:'arrive'});g.sim.met.add('mori');});}
 async function use(id,choices){await page.evaluate(({id,choices})=>{const g=globalThis.__game;globalThis.__referenceProof.choices=choices;const trigger=id==='mori'?g.topicFor('mori').trigger:null;g.use({id,...g.place.things[id]},{direct:true,trigger});},{id,choices});await page.waitForFunction(()=>globalThis.__game.busy,null,{timeout:60000});}
 async function learn(){await enter('research_lab');await use('research_reader',['Ask about the cover word.','Try saying “reference material”.']);await page.locator('.tp-in').fill('shiryou',{timeout:90000});await page.evaluate(async()=>{(await import('./js/ui.js')).ui.auto=true;});await idle();}
 async function fixture(name){if(!process.env.FIXTURE_DIR)return;fs.mkdirSync(process.env.FIXTURE_DIR,{recursive:true});await page.keyboard.press('F5');await page.waitForTimeout(500);fs.writeFileSync(`${process.env.FIXTURE_DIR}/${name}.json`,JSON.stringify(await context.storageState({indexedDB:true}),null,2));}
 const status=()=>page.evaluate(async()=>({known:(await import('./js/lang.js')).known.has('shiryou'),memory:(await import('./js/conversations/state.js')).conversationMemory.entries(),copy:(await import('./js/finds/index.js')).found('research_mori_copy'),flags:{...(await import('./js/narrative/state.js')).flags}}));
 try{
  await waitForGame(page,60000,()=>page.goto(`${base}index.html?day=2&place=research_lab&mc=${mc}`),'play');await idle();await fixture('reader-room');
  await page.evaluate(async()=>{const g=globalThis.__game,{ui,setMuted}=await import('./js/ui.js'),{cond}=await import('./js/narrative/state.js');setMuted(true);ui.auto=true;globalThis.__referenceProof={choices:[],lines:[],errors:[]};let count=0;const say=ui.say;
   ui.say=function(...args){this.auto=false;const result=say.apply(this,args),entry={id:++count,who:args[0],text:args[1]};globalThis.__referenceProof.lines.push(entry);globalThis.__referenceCapture=entry;return result;};
   ui.autoPick=()=>{const options=g.runner.lastStep.choice.filter(o=>cond(o.if)),wanted=globalThis.__referenceProof.choices.shift(),i=options.findIndex(o=>o.text===wanted);if(i<0)globalThis.__referenceProof.errors.push({wanted,options:options.map(o=>o.text)});return Math.max(0,i);};
   const node=g.onNode;g.onNode=(id,phase)=>{node?.(id,phase);if(id==='word_practice'&&phase==='start')ui.auto=false;};
  });
  if(order==='knowledge')await learn();
  await enter('office');checks.push({beforeOffer:await status()});
  await use('mori',['Ask about the papers on his desk.',...(order==='knowledge'?['Leave the papers.']:[])]);await idle();const heard=await status();checks.push({heard});assert.equal(heard.copy,false);assert.equal(heard.memory.find(x=>x.id==='mori_old_reference').understoodAtTime,order==='knowledge');
  if(order==='evidence'){await learn();await enter('office');}
  if(order==='knowledge')await page.evaluate(async()=>{(await import('./js/narrative/state.js')).flags.d2_shift_done=true;});
  await fixture('mori-callback');
  await use('mori',['Ask for the reference material he mentioned.']);await page.locator('#findView').waitFor({state:'visible',timeout:90000});await shot('mori-paper');await page.locator('#findView').click({position:{x:20,y:120}});await idle();
  const acquired=await status();checks.push({acquired,contacts:await page.evaluate(()=>globalThis.__game.place.researchOffice.contacts)});assert.equal(acquired.copy,true);
  await enter('research_lab');await use('research_reader',['Show Mori’s copy.']);await idle();
  checks.push({retained:await status(),reading:await page.evaluate(()=>globalThis.__game.place.research.state.read())});assert.equal((await status()).copy,true);
  const proof=await page.evaluate(()=>globalThis.__referenceProof);checks.push({proof});assert.deepEqual(proof.errors,[]);assert.deepEqual(errors,[]);await shot('finished');
 }catch(error){checks.push({failure:error.stack,proof:await page.evaluate(()=>globalThis.__referenceProof),contacts:await page.evaluate(()=>{const g=globalThis.__game;return {room:g.place.research?.hands.contacts,office:g.place.researchOffice?.contacts,player:{position:g.player.root.position.toArray(),rotation:g.player.root.rotation.toArray(),seated:g.player.seated,pose:g.player.pose,holder:g.player.holder?.position?.toArray(),scale:g.player.root.scale.toArray()},walker:{facing:g.walker.facing,targetFacing:g.walker.targetFacing}};})});await shot('failure');throw error;}
 finally{watching=false;await watcher;fs.writeFileSync(`${out}/${width}-${order}-report.json`,JSON.stringify({checks,captures,phases:[...phases],errors},null,2));await context.close();}
},{gpuWaitMs: Number(process.env.GPU_WAIT || 1800) * 1000, timeoutMs:295000});
