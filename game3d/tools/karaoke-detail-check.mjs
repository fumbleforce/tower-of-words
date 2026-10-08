// Native door and stair clicks with scripted approaches; detail cameras do not alter layout.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {withBrowserJob} from '../../tools/lib/browser-job.mjs';
import {scopedRoute} from '../../tools/bible/check-scope.mjs';
import {waitForGame} from '../test/support/wait-ready.mjs';
const width=+(process.argv[2]||1366),height=width<700?844:860,mc=width<700?'carina':'eric';
const base=`http://127.0.0.1:8771/${process.env.BASE||'game3d'}`,out=process.env.OUT||'game3d/shots/karaoke-detail';
fs.mkdirSync(out,{recursive:true});
await withBrowserJob('karaoke-detail-'+width,async browser=>{
 const page=await browser.newPage({viewport:{width,height},isMobile:width<700,hasTouch:width<700});
 const errors=[],missing=[],activity=[];const result={pass:false,contacts:[],continue:false,returned:false};let closing=false,index=0;
 await page.route('**/*',scopedRoute({publicOnly:true,isClosing:()=>closing,onFailure:s=>errors.push(s)}));
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
 await page.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({privateMode:false,voiceOn:false,textSpeed:'instant'})));
 const shot=name=>page.screenshot({path:`${out}/${width}-${mc}-${String(++index).padStart(2,'0')}-${name}.png`});
 const ready=()=>page.waitForFunction(()=>!globalThis.__game.busy&&!globalThis.__game.walker.path);
 async function use(id,place){
  await ready();await page.evaluate(async id=>{const g=globalThis.__game;g.standUp?.();await g.walkTo(...g.place.things[id].spot());},id);
  await page.waitForTimeout(450);
  const p=await page.evaluate(id=>{const m=globalThis.__game.markers.list.find(m=>m.id===id),r=m?.el.querySelector('.pin')?.getBoundingClientRect();if(!r?.width)throw Error('Missing pin '+id);return [r.x+r.width/2,r.y+r.height/2];},id);
  if(width<700)await page.touchscreen.tap(...p);else await page.mouse.click(...p);
  await page.waitForTimeout(120);const menu=page.locator('#actMenu:not([hidden]) .use');if(await menu.isVisible())await menu.click();
  await page.waitForFunction(place=>globalThis.__game.place.name===place&&!globalThis.__game.busy,place,{timeout:45000});await page.waitForTimeout(550);
 }
 async function details(room,views){
  if(process.env.ACTIVITY_ONLY)return;
  for(const [name,x,z,y,yaw,d]of views){
   await page.evaluate(({x,z,y,yaw,d,room,name})=>{const g=globalThis.__game,c=g.place.cam;g.busy=true;c.elev=room==='desk'&&name==='drinks'?.55:(room==='desk'?54:56)*Math.PI/180;c.yaw=yaw;c.closeOn([x,z],d,y);c.snap(g.player.root.position);},{x,z,y,yaw,d,room,name});
   await page.waitForTimeout(300);await shot(room+'-'+name);
  }
  await page.evaluate(()=>{const g=globalThis.__game;g.place.cam.elev=(g.place.name==='karaoke'?54:56)*Math.PI/180;g.place.cam.yaw=0;g.place.cam.release();g.busy=false;});
 }
 try{
  await waitForGame(page,60000,()=>page.goto(`${base}/index.html?day=3&place=shotengai&mc=${mc}`),'play');await ready();await page.waitForTimeout(650);
  await shot('street');await use('karaoke','karaoke');await shot('desk-arrival');
  await details('desk',[['counter',2.65,-2.1,.6,-.9,3],['drinks',.7,-4,.7,0,width<700?2.1:3],['waiting',-3.2,-1.55,.35,.65,3],['stairs',-2.9,-3.1,.55,.25,3]]);
  await use('karaoke_stairs','karaoke_booth');await shot('booth-arrival');
  await details('booth',[['screen',0,-3.2,.7,0,3],['table',-.5,-1.9,.65,.25,2.5],['west-bench',-1.95,-1.6,.55,.65,3],['door',2.1,-1.7,.7,-.7,3]]);
  // Invoke the existing physical stage to check furniture clearance; no story trigger is claimed.
  await page.evaluate(()=>{const g=globalThis.__game;g.beat(()=>new Promise(resolve=>{globalThis.__karaokeFinish=resolve;}));for(const id of ['kenji','kuroda'])g.place.people[id].root.visible=true;g.place.people.kenji.root.position.set(-1.6,0,-1);g.place.people.kuroda.root.position.set(1.45,0,-2.5);});
  for(const a of [{state:'start'},{state:'queue'},{state:'clearQueueExtras'},{state:'receiptFront'},{state:'receiptBack'},{state:'selectNumber'},{state:'takeMicrophone',who:'kenji'},{state:'passMicrophone',who:'kuroda'},{state:'keepMicrophone',who:'kuroda'},{state:'passMicrophone',who:'eric'},{state:'group'}]){
   await page.evaluate(a=>globalThis.__game.place.hooks.karaokeClub(a),a);
   await page.waitForTimeout(650);if(['start','queue','receiptBack','takeMicrophone','passMicrophone','group'].includes(a.state))await shot('stage-'+a.state+'-'+(a.who||'group'));
   activity.push(await page.evaluate(()=>globalThis.__game.place.karaokeClub.snapshot()));
  }
  const contacts=await page.evaluate(()=>globalThis.__game.place.karaokeClub.moves.contacts);
  result.contacts=contacts;
  const saved=activity.at(-1);
  await page.evaluate(()=>globalThis.__karaokeFinish());
  if(width<700)await page.locator('#qsaveBtn').tap();else await page.keyboard.press('F5');
  await page.waitForFunction(()=>/Quick saved/.test(globalThis.document.querySelector('#toast')?.textContent||''));
  await page.goto(`${base}/index.html?mc=${mc}`);await page.locator('#title .mcont').click();await page.locator('.slot[data-id="quick"]').click();
  await page.waitForFunction(()=>globalThis.__game?.place?.name==='karaoke_booth'&&!globalThis.document.querySelector('#boot:not(.gone)'),null,{timeout:45000});
  await page.waitForTimeout(600);
  const resumed=await page.evaluate(()=>globalThis.__game.place.karaokeClub.snapshot());
  assert.equal(resumed.active,true);assert.deepEqual(resumed.held,saved.held);assert.deepEqual(resumed.queue,saved.queue);result.continue=true;await shot('stage-continued');
  await page.evaluate(async()=>{const g=globalThis.__game;await g.place.hooks.karaokeClub({state:'finish'});g.busy=false;g.setHurry(false);});
  await use('booth_door','karaoke');await shot('desk-return');await use('karaoke_door','shotengai');await shot('street-return');
  result.returned=true;assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  // Report independent Continue/route results even when a contact threshold fails.
  assert.equal(contacts.length,4);for(const c of contacts)assert(c.gap<(c.action==='pickup'?.05:.075),JSON.stringify(c));
  result.pass=true;console.log('PASS native karaoke door/stairs/booth/return with scripted approaches; invoked stage and title Continue');
 }catch(e){await shot('failure');throw e;}finally{fs.writeFileSync(`${out}/${width}-report.json`,JSON.stringify({...result,errors,missing,activity},null,2));closing=true;await page.close();}
},{timeoutMs:240000,gpuWaitMs:180000});
