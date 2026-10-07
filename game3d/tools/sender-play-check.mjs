import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const width=+(process.argv[2]||1366), mc=process.argv[3]||'eric', order=process.argv[4]||'none', releaseHeld=process.argv[5]==='release';
const out=`/tmp/codex-sender-play-${process.env.ROUND||'1'}`;
fs.mkdirSync(out,{recursive:true});
await withBrowserJob('sender-play',async browser=>{
 const context=await browser.newContext({viewport:{width,height:width<700?844:860}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({v:2,textSpeed:'instant',voiceOn:false,privateMode:false}));});
 const snapshot=async label=>{await page.screenshot({path:`${out}/${width}-${mc}-${label}.png`});};
 const driver=async(choices=[])=>page.evaluate(async choices=>{
  const g=globalThis.__game,{ui,setMuted}=await import('./js/ui.js'),{cond}=await import('./js/narrative/state.js');
  setMuted(true);ui.auto=true;
  globalThis.__senderProof={choices:[...choices],lines:[],errors:[]};
  const say=ui.say;
  ui.say=function(...args){const tag=String(args[1]).includes('そちらには')?'mori-remark':String(args[1]).includes('Thanks. I was about')?'payoff-line':null;if(tag)this.auto=false;const p=say.apply(this,args);globalThis.__senderProof.lines.push(globalThis.document.querySelector('#talk .line').textContent);if(tag)globalThis.__senderCapture=tag;return p;};
  const onNode=g.onNode;g.onNode=(node,phase)=>{onNode?.(node,phase);if(node==='sender_practice'&&phase==='start')ui.auto=false;};
  ui.autoPick=()=>{const options=g.runner.lastStep.choice.filter(o=>cond(o.if));const wanted=globalThis.__senderProof.choices.shift(),index=options.findIndex(o=>o.text===wanted);if(index<0)globalThis.__senderProof.errors.push({wanted,options:options.map(o=>o.text)});return Math.max(0,index);};
  globalThis.__senderCaptured=new Set();
  globalThis.__senderHurry=setInterval(()=>{const phase=g.place.sender?.stage.phase;if(['desk-keyboard','wake-control','note-place','door-point','door-referent'].includes(phase)&&!globalThis.__senderCaptured.has(phase)){globalThis.__senderCapture=phase;g.paused=true;g.setHurry(false);}else g.setHurry(!globalThis.document.querySelector('.sender-inspect'));},20);
 },choices);
 const physical=[];
 const samplePhysical=async tag=>{
  const sample=await page.evaluate(tag=>{
   const g=globalThis.__game,p=g.place,props=p.sender.props;
   const monitors=[props.deskMonitor,props.consoleScreen.parent].map(o=>{o.updateWorldMatrix(true,false);return o.matrixWorld.toArray();});
   const pointing=p.sender.stage.snapshot().pointing;
   let hand=null;
   if(pointing){p.people.mori.root.traverse(o=>{if(o.isBone&&/^(mixamorig)?LeftHand$/.test(o.name))hand=o;});if(!hand)throw new Error('Missing rendered Mori left hand');}
   return {tag,time:performance.now(),monitors,pointing,hand:hand?p.space.worldToLocal(hand.getWorldPosition(g.player.root.position.clone())).toArray():null};
  },tag);
  physical.push(sample);return sample;
 };
 let watching=true;
 const captures=(async()=>{while(watching){try{const phase=await page.evaluate(()=>globalThis.__senderCapture);if(phase){if(['mori-remark','payoff-line'].includes(phase))await page.waitForTimeout(350);await samplePhysical(phase);await snapshot('story-'+phase);if(phase==='mori-remark'){await page.waitForTimeout(600);await samplePhysical('mori-remark-held');}await page.evaluate(async()=>{if(['mori-remark','payoff-line'].includes(globalThis.__senderCapture)){const {ui}=await import('./js/ui.js');ui.auto=true;ui._advance?.();}globalThis.__senderCaptured.add(globalThis.__senderCapture);globalThis.__senderCapture=null;globalThis.__game.paused=false;});}}catch{}await new Promise(r=>setTimeout(r,50));}})();
 const idle=()=>page.waitForFunction(()=>!globalThis.__game.busy,null,{timeout:60000});
 try{
  await waitForGame(page,60000,()=>page.goto(`http://127.0.0.1:8786/game3d/index.html?day=2&place=office&mc=${mc}`),'play');
  await idle();await samplePhysical('initial');
  await page.evaluate(async()=>{const g=globalThis.__game,{flags}=await import('./js/narrative/state.js');flags.d2_ticket_done=true;g.place.hooks.officeDay2({state:'arrive'});});
  await driver(['Give me a minute.']);
  await page.evaluate(()=>globalThis.__game.runner.trigger('ask:mio-sender'));
  await idle();
  const declined=await page.evaluate(async()=>({state:globalThis.__game.place.sender.state.read(),known:[...(await import('./js/lang.js')).known],memory:(await import('./js/conversations/state.js')).conversationMemory.entries()}));
  assert.equal(declined.state.offered,true);assert.equal(declined.known.includes('mada'),false);assert.equal(declined.memory.some(r=>r.id==='mori_sender_retained'),false);
  await snapshot('declined');
  await page.evaluate(order=>{globalThis.__senderProof.choices=order==='first'?['How do you say “not yet”?','Try “mada”.','Show me.']:['Show me.'];globalThis.__game.runner.trigger('ask:mio-sender');},order);
  if(order==='first'){await page.locator('.tp-in').fill('mada');await page.evaluate(async()=>{(await import('./js/ui.js')).ui.auto=true;});}
  await idle();await samplePhysical('after-remark');await snapshot('doorway');
  await page.evaluate(()=>{globalThis.__senderProof.choices=['Hold 25 and try the others.'];globalThis.__game.use({id:'sender_console',...globalThis.__game.place.things.sender_console});});
  await page.getByRole('dialog',{name:'Sender console'}).waitFor({timeout:60000});await snapshot('output');
  await page.getByRole('button',{name:'Attempt 2, item 25, started',exact:true}).click();
  await page.getByRole('button',{name:'Attempt 1, item 25, started',exact:true}).click();
  await page.waitForFunction(()=>globalThis.__game.place.sender.state.read().acknowledged.includes(26),null,{timeout:60000});
  const mid=await page.evaluate(()=>globalThis.__game.place.sender.state.read());
  await snapshot('ack26');
  await page.goto('http://127.0.0.1:8786/game3d/index.html');await page.locator('#title .mcont').click();await page.locator('#saves button.slot').filter({hasText:'Autosave'}).click();
  await page.waitForFunction(()=>globalThis.__game?.place?.sender&&globalThis.document.querySelector('.sender-inspect'),null,{timeout:60000});
  await driver();
  await page.waitForFunction(()=>globalThis.__game.place.sender.state.read().acknowledged.includes(27));
  await snapshot('continued-delivery');
  if(releaseHeld)await page.getByRole('button',{name:'Return held item',exact:true}).click();
  await page.getByRole('button',{name:'Leave',exact:true}).click();await idle();await snapshot('payoff');
  if(order==='late'){
   await page.evaluate(()=>{globalThis.__senderProof.choices=['How do you say “not yet”?','Try “mada”.','Leave it for now.'];globalThis.__game.runner.trigger('ask:mio-sender');});
   await page.locator('.tp-in').fill('mada');await page.evaluate(async()=>{(await import('./js/ui.js')).ui.auto=true;});await idle();
  }
  if(order!=='none'){
   await page.evaluate(()=>globalThis.__game.use({id:'sender_console',...globalThis.__game.place.things.sender_console}));
   await page.getByRole('button',{name:'Ask Mori about “mada”',exact:true}).click({timeout:60000});
   await page.waitForFunction(async()=> (await import('./js/narrative/state.js')).flags.sender_interpreted);
   await page.getByRole('dialog',{name:'Sender console'}).waitFor();await snapshot('interpretation-after-delivery');
   await page.getByRole('button',{name:'Leave',exact:true}).click();await idle();
  }
  const result=await page.evaluate(async()=>({queue:globalThis.__game.place.sender.state.read(),flags:(await import('./js/narrative/state.js')).flags,known:[...(await import('./js/lang.js')).known],memory:(await import('./js/conversations/state.js')).conversationMemory.entries(),contacts:globalThis.__game.place.sender.stage.contacts,proof:globalThis.__senderProof}));
  fs.writeFileSync(`${out}/${width}-${mc}.json`,JSON.stringify({declined,mid,result,physical,errors},null,2));
  assert.deepEqual(result.queue.acknowledged,[24,26,27]);assert.equal(result.queue.held,releaseHeld?null:25);assert.equal(result.flags.sender_result_shown,true);assert.equal(result.known.includes('mada'),order!=='none');
  const remark=result.memory.find(r=>r.id==='mori_sender_retained');assert.equal(remark.understoodAtTime,order==='first');if(order!=='none')assert.equal(result.flags.sender_interpreted,true);assert.deepEqual(errors,[]);assert.deepEqual(result.proof.errors,[]);
  for(const sample of physical)assert.deepEqual(sample.monitors,physical[0].monitors,'actual monitors remain fixed at '+sample.tag);
  const held=physical.filter(s=>['mori-remark','mori-remark-held'].includes(s.tag));
  assert.equal(held.length,2);assert.ok(held[1].time-held[0].time>=500,'point remains during spoken-line wait');
  const point=physical.find(s=>s.tag==='door-point');
  for(const sample of held){assert.ok(Math.hypot(...sample.pointing.map((v,i)=>v-[4.58,.83,-.2][i]))<1e-9,'point stays on authored referent');assert.ok(sample.hand[1]>.7,'rendered pointing hand remains raised');assert.ok(Math.hypot(...sample.hand.map((v,i)=>v-point.hand[i]))<.015,'rendered hand keeps the established pointing pose');}
  assert.equal(physical.find(s=>s.tag==='after-remark').pointing,null,'point releases after line');
  console.log(`PASS sender native ${width} ${mc}: decline, actual memory, comparison, automatic delivery, public Continue, desk payoff, language order ${order}`);
 }catch(error){await snapshot('failed');fs.writeFileSync(`${out}/${width}-${mc}-failure.json`,JSON.stringify({error:error.stack,errors},null,2));throw error;}
 finally{watching=false;await captures;await context.close();}
},{timeoutMs:300000,gpuWaitMs:1200000});
