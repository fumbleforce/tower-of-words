import assert from 'node:assert/strict';
import fs from 'node:fs';
import {withBrowserJob} from '../../tools/lib/browser-job.mjs';
import {scopedRoute} from '../../tools/bible/check-scope.mjs';
const width=+(process.argv[2]||1366),height=width<700?844:860,mc=width<700?'carina':'eric';
const base=`http://127.0.0.1:8771/${process.env.BASE||'game3d'}`;
const out=new URL(`../shots/karaoke-club/${process.env.ROUND||'round1'}-${width}/`,import.meta.url);fs.mkdirSync(out,{recursive:true});
const result={width,mc,actions:[]};
await withBrowserJob('karaoke-stage-'+width,async browser=>{
 const context=await browser.newContext({viewport:{width,height},hasTouch:width<700,isMobile:width<700}),page=await context.newPage();let closing=false;const errors=[],blocked=[];
 page.on('response',r=>{if(r.status()===404)console.log('HTTP404',r.url());});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')console.log('BROWSER',m.text());});
 await context.route('**/*',scopedRoute({publicOnly:true,isClosing:()=>closing,onFailure:s=>blocked.push(s)}));
 await page.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({privateMode:false,voiceOn:false,textSpeed:'instant'})));
 try{
  await page.goto(`${base}/index.html?day=3&place=karaoke_booth&q=0&mc=${mc}`);await page.waitForFunction(()=>globalThis.__game?.place,null,{timeout:45000});
  await page.evaluate(async()=>{
   const g=globalThis.__game,P=g.place;
   P.people.kenji.root.visible=P.people.kuroda.root.visible=true;
   P.people.kenji.root.position.set(-1.6,0,-1);P.people.kuroda.root.position.set(1.45,0,-2.5);
   g.beat(()=>new Promise(resolve=>{globalThis.__karaokeFinish=resolve;}));
   globalThis.__karaokeBase={player:g.player.root.position.toArray(),kenji:P.people.kenji.update,kuroda:P.people.kuroda.update,eric:g.player.update,yaw:P.cam.yaw,elev:P.cam.elev};
  });
  for(const a of ([{state:'start'},{state:'queue'},{state:'clearQueueExtras'},{state:'receiptFront'},{state:'receiptBack'},{state:'selectNumber'},{state:'takeMicrophone',who:'kenji'},{state:'passMicrophone',who:'kuroda'},{state:'keepMicrophone',who:'kuroda'},{state:'passMicrophone',who:'eric'},{state:'group'},{state:'group',who:'kenji'},{state:'group',who:'kuroda'}]).filter(a=>!process.env.GROUP_ONLY||a.state==='start'||a.state==='group')){
   await page.evaluate(a=>{const P=globalThis.__game.place;globalThis.__karaokeDone=false;globalThis.__karaokeError=null;P.hooks.karaokeClub(a).catch(e=>{globalThis.__karaokeError=e.message;}).finally(()=>{globalThis.__karaokeDone=true;});},a);
   if(a.state==='passMicrophone'){await page.waitForFunction(()=>globalThis.__game.place.karaokeClub.moves.phase==='shared-grip'||globalThis.__karaokeDone,null,{timeout:25000});await page.screenshot({path:new URL(a.state+'-'+a.who+'-contact.png',out).pathname});}
   await page.waitForTimeout(450);await page.screenshot({path:new URL(a.state+'-'+(a.who||'')+'-motion.png',out).pathname});
   await page.waitForFunction(()=>globalThis.__karaokeDone,null,{timeout:25000});
   const data=await page.evaluate(()=>({error:globalThis.__karaokeError,snapshot:globalThis.__game.place.karaokeClub.snapshot(),contacts:globalThis.__game.place.karaokeClub.moves.contacts}));
   result.actions.push({a,...data});assert.equal(data.error,null,a.state);
   await page.waitForTimeout(650);await page.screenshot({path:new URL(a.state+'-'+(a.who||'')+'.png',out).pathname});
   if(a.state==='receiptBack'||a.state==='queue'||a.state==='group'){
    await page.evaluate(a=>{const who=a.state==='group'?(a.who||'kenji'):'kuroda';void globalThis.__game.ui.say({name:who==='kenji'?'Kenji':'Hamada',color:'#ba9668'},who==='kenji'?'Come in. You can sit here. I put some songs in already.':'私のは、後でも大丈夫ですよ。',{whoId:who,overheard:who!=='kenji'});},a);
    await page.waitForTimeout(450);await page.screenshot({path:new URL(a.state+'-'+(a.who||'')+'-dialogue.png',out).pathname});
    await page.evaluate(()=>globalThis.__game.ui.closeTalk());
   }
  }
  if(!process.env.GROUP_ONLY){const contacts=result.actions.at(-1).contacts;assert.equal(contacts.length,4);for(const c of contacts)assert(c.gap<(c.action==='pickup'?.05:.075),JSON.stringify(c));}
  if(process.env.FRAMES){result.pass=true;return;}
  result.restore=await page.evaluate(()=>{const P=globalThis.__game.place,world=JSON.parse(JSON.stringify(P.snapshotState()));P.restoreState({world});return {before:world.karaokeClub.held,after:P.karaokeClub.snapshot().held};});assert.deepEqual(result.restore.before,result.restore.after);
  result.cleanup=await page.evaluate(async()=>{const g=globalThis.__game,P=g.place;await P.hooks.karaokeClub({state:'finish'});const base=globalThis.__karaokeBase;return {kenji:P.people.kenji.update===base.kenji,kuroda:P.people.kuroda.update===base.kuroda,eric:g.player.update===base.eric,active:P.karaokeClub.snapshot().active};});assert.deepEqual(result.cleanup,{kenji:true,kuroda:true,eric:true,active:false});
  await page.evaluate(()=>globalThis.__karaokeFinish());
  await page.evaluate(async()=>{const P=globalThis.__game.place;await P.hooks.karaokeClub({state:'start'});await P.hooks.karaokeClub({state:'receiptBack'});});
  const beforeContinue=await page.evaluate(()=>globalThis.__game.place.karaokeClub.snapshot());
  if(width<700)await page.locator('#qsaveBtn').tap();else await page.keyboard.press('F5');
  await page.waitForFunction(()=>/Quick saved/.test(globalThis.document.querySelector('#toast')?.textContent||''));
  await page.goto(`${base}/index.html?mc=${mc}`);await page.locator('#title .mcont').click();await page.locator('.slot[data-id="quick"]').click();
  await page.waitForFunction(()=>globalThis.__game?.place?.name==='karaoke_booth'&&!globalThis.document.querySelector('#boot:not(.gone)')&&!globalThis.document.body.classList.contains('loading'),null,{timeout:45000});
  await page.waitForTimeout(650);
  const afterContinue=await page.evaluate(()=>globalThis.__game.place.karaokeClub.snapshot());
  assert.equal(afterContinue.active,true);assert.deepEqual(afterContinue.held,beforeContinue.held);assert.equal(afterContinue.receiptSide,'back');
  assert.deepEqual(Object.keys(afterContinue.people).sort(),['eric','kenji','kuroda']);result.continue={before:beforeContinue,after:afterContinue};
  await page.screenshot({path:new URL('receipt-continued.png',out).pathname});
  await page.evaluate(async()=>{const g=globalThis.__game,P=g.place;await P.hooks.karaokeClub({state:'finish'});await P.hooks.karaokeClub({state:'start'});const pending=P.hooks.karaokeClub({state:'receiptFront'});await g.wait(150);await g.travel('karaoke',{fast:true});if(await pending!==false)throw new Error('Cancelled karaoke action reported completion');if(P.karaokeClub.snapshot().active||P.karaokeClub.props.root.visible)throw new Error('Karaoke action survived place leave');});
  result.placeLeave=true;
  assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);result.pass=true;
 }finally{await page.screenshot({path:new URL('last.png',out).pathname});closing=true;fs.writeFileSync(new URL('report.json',out),JSON.stringify({...result,errors,blocked},null,2));await context.close();}
},{timeoutMs:230000});
console.log('KARAOKE_STAGE',out.pathname,result.pass);
