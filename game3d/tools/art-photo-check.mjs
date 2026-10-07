import assert from 'node:assert/strict';
import fs from 'node:fs';
import {withBrowserJob} from '../../tools/lib/browser-job.mjs';
import {scopedRoute} from '../../tools/bible/check-scope.mjs';
import {waitForGame} from '../test/support/wait-ready.mjs';
const width=+(process.argv[2]||390),height=width<600?844:860,mc=width<600?'carina':'eric';
const visit=process.env.VISIT||'first';
const resumeAt=process.env.CONTINUE_AT|| (visit==='first'?'photo':null);
const base=process.env.BASE||'game3d',out=new URL(`../shots/art-photo/${process.env.OUT||Date.now()}-${width}/`,import.meta.url).pathname;
fs.mkdirSync(out,{recursive:true});
const report={width,mc,visit,fixture:'Tuesday art membership and explicit visit fixture; real title Continue and Runner',lines:[],errors:[]};
await withBrowserJob('art-photo-'+width,async browser=>{
 const context=await browser.newContext({viewport:{width,height},isMobile:width<600,hasTouch:width<600}),page=await context.newPage();let closing=false;
 const safeRoute=scopedRoute({publicOnly:true,isClosing:()=>closing,onFailure:e=>report.errors.push(e)});
 await context.route('**/*',route=>process.env.PHOTO_FAIL&&route.request().url().endsWith('/assets/photos/mori-lillehammer.png')?route.fulfill({status:503,body:'Photo unavailable'}):safeRoute(route));
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({privateMode:false,voiceOn:false,textSpeed:'instant'})));
 const shot=name=>page.screenshot({path:out+name+'.png'});
 const status=()=>page.evaluate(async()=>{const g=globalThis.__game,{flags}=await import('./js/narrative/state.js');return {busy:g.busy,place:g.place.name,period:g.sim.period,flags:{...flags},recovery:g.runner.recoveryError,execution:g.runner.snapshot?.(),line:globalThis.document.querySelector('#talk:not([hidden]) .line')?.textContent,choices:[...globalThis.document.querySelectorAll('#talk:not([hidden]) .chips button')].map(x=>x.textContent),contacts:g.place.artClub?.contacts,art:g.place.artClub?.snapshot()};});
 async function continueTitle(){
  await page.goto(`http://127.0.0.1:8771/${base}/index.html?q=0&mc=${mc}`);
  await page.waitForSelector('#title:not([hidden])');console.log('title ready');
  const button=page.locator('#title button').filter({hasText:/Continue/}).filter({visible:true});
  await button.first().click();
  await page.locator('#saves button.slot').filter({hasText:'Autosave'}).click();
  await page.waitForFunction(()=>globalThis.__game?.place?.name==='dorm_commons'&&!globalThis.document.body.classList.contains('at-title'),null,{timeout:60000});
 }
 try{
  await waitForGame(page,60000,()=>page.goto(`http://127.0.0.1:8771/${base}/index.html?day=${visit==='first'?6:13}&place=dorm_commons&mc=${mc}&q=0`),'play');
  await page.waitForFunction(()=>!globalThis.__game.busy);
  console.log('initial room idle');const ready=await page.evaluate(()=>globalThis.__game.place.artClub.ready());if(process.env.PHOTO_FAIL){assert.equal(ready,false);assert.equal((await status()).place,'dorm_commons');report.unavailablePhoto=true;report.pass=true;await shot('photo-unavailable-room');return;}assert.equal(ready,true,'approved production photo is loaded');
  report.seed=await page.evaluate(async visit=>{
   const g=globalThis.__game,{save,loadSave,bonds}=await import('./js/sim.js');save(g);const s=loadSave();
   s.period='evening';s.flags.period='evening';for(const p of ['early','morning','lunch','afternoon','evening'])s.flags['period_'+p]=p==='evening';
   s.flags.club_art=true;
   if(visit!=='first'){s.flags.art_first_page=true;s.flags.art_first_day=6;s.flags.art_photo_seen=true;s.flags.ms2_mori=true;const q=bonds.person('mori');q.pts=visit==='practice'?6:14;q.met=true;if(visit==='repeat'){s.flags.art_mori_started=true;s.flags.ms3_mori=true;s.flags.bond3_mori=true;}s.rel.bonds=bonds.toJSON();s.flags.bond_mori=q.pts;s.flags.step_mori=bonds.step('mori');s.flags.bondready_mori=visit==='repeat'?0:bonds.ready('mori');s.flags.bond2_mori=true;}
   s.runner=null;s.world=null;s.pendingStart='dorm_commons';globalThis.localStorage.setItem('amakawa-day1-save',JSON.stringify(s));return {rel:s.rel,flags:s.flags};
  },visit);
  await continueTitle();
  await page.waitForTimeout(600);report.loaded=await page.evaluate(async()=>{const m=await import('./js/sim.js');return {rel:m.bonds.toJSON(),save:m.loadSave()?.rel,sim:m.sim.bonds};});
  if(!await page.evaluate(()=>globalThis.__game.busy)){
   const began=await page.evaluate(()=>{const g=globalThis.__game,m=g.markers.list.find(m=>m.id==='mori');if(!m||!m.enabled())return false;g.use(m);return true;});assert.equal(began,true,'Mori is available through his actual marker');
  }
  let checkpoint=false,photo=false;
  const observe=()=>page.evaluate(()=>{
   const g=globalThis.__game,club=g.place.artClub;clearInterval(globalThis.__artTimer);
   const proof=globalThis.__artProof={phase:null,capture:null,count:0,seen:[],contacts:[]},act=club.act;
   club.act=async args=>{proof.phase=args.state;return act(args);};
   globalThis.__artTimer=setInterval(()=>{
    if(proof.capture)return;
    const c=club.contacts[proof.count];let id=null;
    if(c){proof.count++;proof.contacts.push(c);id=c.item+'-'+c.phase+'-'+proof.count;}
    else if(club.props.stream.visible&&club.props.cupLevels[1]>.4&&!proof.seen.includes('pour-stream'))id='pour-stream';
    else {const d=club.props.mori.snapshot(),p=club.props.player.snapshot();if(d.progress>.4&&d.progress<.7&&!proof.seen.includes('mori-draw'))id='mori-draw';else if(p.progress>.4&&p.progress<.7&&!proof.seen.includes('player-draw'))id='player-draw';}
    if(id){proof.capture=id;proof.seen.push(id);g.paused=true;}
   },15);
  });
  await observe();
  for(let n=0;n<1400;n++){
   await page.waitForTimeout(80);
   const capture=await page.evaluate(()=>globalThis.__artProof?.capture);
   if(capture){
    await page.waitForTimeout(120);await shot((checkpoint?'continued-':'')+capture);
    report.captures||=[];report.captures.push(capture);
    if(!checkpoint&&resumeAt===capture){report.beforeContinue=await status();await page.evaluate(async()=>{const m=await import('./js/sim.js');m.save(globalThis.__game);});checkpoint=true;await continueTitle();await observe();report.afterContinue=await status();continue;}
    await page.evaluate(()=>{globalThis.__artProof.capture=null;globalThis.__game.paused=false;});continue;
   }
   const s=await status();if(n%15===0||s.choices.length)console.log('step',n,s.busy,s.line?.slice(0,50),s.choices);assert.ok(!s.recovery,JSON.stringify(s.recovery));
   if(s.line&&report.lines.at(-1)!==s.line)report.lines.push(s.line);
   if(s.line?.includes('1994')){
    await page.waitForTimeout(700);await shot(checkpoint?'photo-continued':'photo');photo=true;
    if(!checkpoint&&resumeAt==='photo'){report.beforeContinue=s;await page.evaluate(async()=>{const m=await import('./js/sim.js');m.save(globalThis.__game);});checkpoint=true;await continueTitle();await observe();await page.waitForTimeout(500);report.afterContinue=await status();continue;}
   }
   const choices=page.locator('#talk:not([hidden]) .chips button:visible');
   if(await choices.count()){
    await shot('choice-'+n);const choice=choices.filter({hasText:({first:'Watch him sketch',tea:'Offer to pour',together:'Leave a pencil',practice:'Use the photograph',repeat:'Sit with him',defer:'Leave the club'})[visit]});assert.ok(await choice.count(),'expected art choice');await choice.click();await page.waitForTimeout(300);
   }else if(await page.locator('#talk:not([hidden])').isVisible()){await page.locator('#talkHit').click({position:{x:15,y:40}});await page.waitForTimeout(300);}
   else if(!s.busy&&(visit==='first'?s.flags.art_first_page:true)){report.completed=s;break;}
  }
  if(visit==='first')assert.ok(photo,'actual first visit showed the approved photograph');assert.ok(report.completed?.flags.art_first_page,'first page completed through real Runner');
  await shot('completed');assert.deepEqual(report.errors,[]);if(['tea','together','repeat'].includes(visit))assert.equal(report.completed.flags.art_mori_started,true);if(['practice','defer'].includes(visit))assert.equal(!!report.completed.flags.art_mori_started,false);
  for(const c of [...(report.beforeContinue?.contacts||[]),...report.completed.contacts]) assert.ok(c.gap < (c.phase==='draw-tip'?.02:c.phase==='pour-spout'?.043:.055),JSON.stringify(c));
  if(resumeAt)assert.equal(checkpoint,true,'requested actual title Continue reached');report.continued=checkpoint;report.pass=true;
 }catch(e){report.failure=e.stack;report.last=await status().catch(()=>null);await shot('failure');throw e;}
 finally{fs.writeFileSync(out+'report.json',JSON.stringify(report,null,2));closing=true;await context.close();}
},{timeoutMs:280000});
console.log('ART_PHOTO',out,report.pass);
