import { publicResearchContextOptions } from '../test/support/research-integration-evidence.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {withBrowserJob} from '../../tools/lib/browser-job.mjs';
import {waitForGame} from '../test/support/wait-ready.mjs';
const width=+(process.argv[2]||1366),mc=process.argv[3]||'eric';
const base=new URL((process.env.BASE||'game3d')+'/',`http://127.0.0.1:${process.env.PORT||8771}/`).href;
const out=`/tmp/codex-research-story-${process.env.ROUND||'1'}`;fs.mkdirSync(out,{recursive:true});
await withBrowserJob('research-story',async browser=>{
 const context=await publicResearchContextOptions(browser,{viewport:{width,height:width<700?844:860}}),page=await context.newPage(),errors=[],requests=[],captures=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({v:2,textSpeed:'instant',voiceOn:false,privateMode:false})));
 const shot=async label=>page.screenshot({path:`${out}/${width}-${mc}-${label}.png`});
 const idle=()=>page.waitForFunction(()=>!globalThis.__game.busy,null,{timeout:90000});
 let watching=true;
 const watcher=(async()=>{while(watching){try{
  const cap=await page.evaluate(()=>globalThis.__researchCapture);
  if(cap){await page.waitForTimeout(450);await shot('line-'+cap.id);captures.push(cap);await page.evaluate(async()=>{globalThis.__researchCapture=null;const {ui}=await import('./js/ui.js');ui.auto=true;ui._advance?.();});}
 }catch{}await new Promise(r=>setTimeout(r,70));}})();
 const use=async(id,choices)=>{await page.evaluate(({id,choices})=>{const g=globalThis.__game;globalThis.__researchProof.choices=choices;g.use({id,...g.place.things[id]});},{id,choices});await page.waitForFunction(()=>globalThis.__game.busy,null,{timeout:60000});};
 let result;
 try{
  await waitForGame(page,60000,()=>page.goto(`${base}index.html?day=2&place=research_lab&mc=${mc}`),'play');await idle();
  await page.evaluate(async()=>{
   const g=globalThis.__game,{ui,setMuted}=await import('./js/ui.js'),{cond}=await import('./js/narrative/state.js');setMuted(true);ui.auto=true;
   globalThis.__researchProof={choices:[],lines:[],errors:[]};let count=0;const say=ui.say;
   ui.say=function(...args){this.auto=false;const result=say.apply(this,args),entry={id:++count,who:args[0],text:args[1]};globalThis.__researchProof.lines.push(entry);globalThis.__researchCapture=entry;return result;};
   ui.autoPick=()=>{const options=g.runner.lastStep.choice.filter(o=>cond(o.if)),wanted=globalThis.__researchProof.choices.shift(),i=options.findIndex(o=>o.text===wanted);if(i<0)globalThis.__researchProof.errors.push({wanted,options:options.map(o=>o.text)});return Math.max(0,i);};
   const node=g.onNode;g.onNode=(id,phase)=>{node?.(id,phase);if(id==='word_practice'&&phase==='start')ui.auto=false;};
  });
  await use('research_reader',['Leave the reader to their notes.']);await idle();
  await use('research_books',['Weather instruments · reading table']);
  await page.getByRole('button',{name:'Next page',exact:true}).click({timeout:90000});
  await page.getByRole('button',{name:'Mark this page',exact:true}).click();
  await page.getByRole('button',{name:'Save this reference',exact:true}).click();
  await page.waitForTimeout(350);await shot('saved-reference');
  await page.getByRole('button',{name:'Close book view',exact:true}).click();await idle();
  await use('research_reader',['Point to the white box in the weather book.']);
  await page.getByRole('button',{name:'Close book view',exact:true}).click({timeout:90000});await idle();
  await use('research_reader',['Ask about the cover word.','Keep reading.']);await idle();
  assert.equal(await page.evaluate(async()=> (await import('./js/lang.js')).known.has('shiryou')),false,'Declining practice must not learn');
  await use('research_reader',['Ask about the cover word.','Try saying “reference material”.']);
  await page.locator('.tp-in').fill('shiryou',{timeout:90000});await page.evaluate(async()=>{(await import('./js/ui.js')).ui.auto=true;});await idle();
  result=await page.evaluate(async()=>({state:globalThis.__game.place.research.state.read(),known:[...(await import('./js/lang.js')).known],flags:(await import('./js/narrative/state.js')).flags,proof:globalThis.__researchProof,contacts:globalThis.__game.place.research.hands.contacts}));
  assert.ok(result.known.includes('shiryou'));assert.equal(result.flags.found_research_weather_shapes,true);assert.deepEqual(result.proof.errors,[]);assert.deepEqual(errors,[]);
  await shot('finished');
 }catch(error){result={failure:error.stack,proof:await page.evaluate(()=>globalThis.__researchProof)};await shot('failure');throw error;}
 finally{watching=false;await watcher;fs.writeFileSync(`${out}/${width}-${mc}-report.json`,JSON.stringify({result,captures,errors,requests},null,2));await context.close();}
},{gpuWaitMs: Number(process.env.GPU_WAIT || 1800) * 1000, timeoutMs:300000});
