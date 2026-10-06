import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
const width=+(process.argv[2]||1366), height=width<700?844:860, mc=width<700?'carina':'eric';
const base=`http://127.0.0.1:8771/${process.env.BASE||'game3d'}`;
const out=new URL(`../shots/room-life/${Date.now()}-${width}/`,import.meta.url);
fs.mkdirSync(out,{recursive:true});
const results=[];
const staging=process.argv.includes('--staging');
async function advance(page,target='settled'){
  const until=Date.now()+25000;
  while(Date.now()<until){
    const state=await page.evaluate(()=>({settled:!globalThis.__game.busy&&!globalThis.__game.walker.path,
      chips:[...globalThis.document.querySelectorAll('#talk .chip:not([disabled])')].map(b=>b.textContent),
      talk:!globalThis.document.querySelector('#talk').hidden}));
    if(target==='settled'&&state.settled)return;
    if(target!=='settled'&&state.chips.some(t=>t.includes(target)))return;
    if(state.chips.length)throw new Error('Unexpected choices '+JSON.stringify(state));
    if(state.talk){
      if(process.argv.includes('--resume'))await page.locator('#talkHit').click({position:{x:10,y:50}});
      else await page.keyboard.press('Space');
    }
    await page.waitForTimeout(110);
  }
  throw new Error('Did not reach '+target+' '+JSON.stringify(await page.evaluate(()=>({busy:globalThis.__game?.busy,place:globalThis.__game?.place?.name,recovery:globalThis.__game?.runner?.recoveryError,frames:globalThis.__game?.runner?.frames,saved:JSON.parse(globalThis.localStorage.getItem('amakawa-day1-save'))?.runner,talk:globalThis.document.querySelector('#talk')?.textContent}))));
}
async function choose(page,who,text){
  await page.evaluate(who=>globalThis.__game.use(globalThis.__game.markers.list.find(m=>m.id===who)),who);
  await advance(page,text);await page.waitForTimeout(900);
  await page.locator('#talk .chip:not([disabled])').filter({hasText:text}).click();
  await advance(page);
}
await withBrowserJob('room-life-'+width,async browser=>{
  const context=await browser.newContext({viewport:{width,height}}), page=await context.newPage();
  let closing=false;const errors=[],blocked=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',scopedRoute({publicOnly:true,isClosing:()=>closing,onFailure:s=>blocked.push(s)}));
  await page.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({privateMode:false,voiceOn:false,textSpeed:'instant'})));
  async function setup(place,day,period){
    await page.goto(`${base}/index.html?day=${day}&place=${place}&q=0&mc=${mc}`);
    await page.waitForFunction(()=>globalThis.__game?.place&&!globalThis.__game.busy,null,{timeout:45000});
    await page.evaluate(async({period})=>{
      const {setPeriod}=await import('./js/sim.js');setPeriod(period,globalThis.__game);
      globalThis.__game.place.onPeriod?.(period);
      if(globalThis.__game.sim.day===3)await globalThis.__game.place.day3?.({});
      else if(globalThis.__game.sim.day===4)await globalThis.__game.place.day4?.({});
      const {startMoveCheck}=await import('./js/movement/checks.js');startMoveCheck(globalThis.__game);
      globalThis.__roomLines=[];const say=globalThis.__game.ui.say;
      globalThis.__game.ui.say=function(...args){globalThis.__roomLines.push(args[1]);return say.apply(this,args);};
    },{period});
  }
  async function capture(id){await page.screenshot({path:new URL(id+'.png',out).pathname});}
  const state=()=>page.evaluate(async()=>({
    flags:{...(await import('./js/narrative/state.js')).flags},known:[...(await import('./js/lang.js')).known],
    lines:globalThis.__roomLines,overlaps:globalThis.__moveCheck.overlaps,spins:globalThis.__moveCheck.spins,
    player:globalThis.__game.player.root.position.toArray(),seated:globalThis.__game.place.people.kenji?.seated,
  }));
  try{
    if(process.argv.includes('--resume')){
      for(const [place,period,who,choice] of [['canteen','afternoon','canteen_worker','Leave her'],['dorm_commons','evening','kenji','let you watch']]){
        await setup(place,3,period);
        await page.evaluate(who=>globalThis.__game.use(globalThis.__game.markers.list.find(m=>m.id===who)),who);
        await advance(page,choice);await page.waitForTimeout(1000);
        const before=await page.evaluate(()=>{const g=globalThis.__game;g.hooks.save();return {yaw:g.place.cam.yaw,elev:g.place.cam.elev,shot:g.place.snapshotState().roomActivity.shot};});
        assert.ok(before.shot);
        await page.goto(`${base}/index.html?mc=${mc}`);
        await page.locator('#title .mcont').click();
        await page.locator('#saves button.slot').filter({hasText:'Autosave'}).click();
        await page.waitForFunction(()=>globalThis.__game?.place,null,{timeout:45000});
        await advance(page,choice);await page.waitForTimeout(1000);
        const after=await page.evaluate(()=>{const g=globalThis.__game;g.place.update(.1,1);return {yaw:g.place.cam.yaw,elev:g.place.cam.elev,shot:g.place.snapshotState().roomActivity.shot};});
        assert.deepEqual(after,before,'live room framing survives title Continue and normal update');
        await capture(place+'-mid-talk-continue');results.push({case:'mid-talk Continue',place,before,after});
        await page.locator('#talk .chip:not([disabled])').filter({hasText:choice}).click();await advance(page);
      }
      assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);return;
    }
    await setup('canteen',3,'afternoon');
    if(staging){
      await page.evaluate(async()=>{
        const g=globalThis.__game;await g.walkTo(...g.place.things.canteen_worker.spot());
        await g.place.hooks.roomWorker({state:'frame'});await g.wait(1800);
        const r=g.place.people.canteen_worker,hand=r.model?.getObjectByName('RightHand')||r.arms?.[1]?.userData.hand;
        if(!hand)throw new Error('Actual worker has no RightHand');
        globalThis.__workerMotion=[];const cloth=g.place.space.getObjectByName('room-worker-cloth');
        const THREE=await import('./vendor/three/three.module.js');
        const sample=()=>{const p=hand.getWorldPosition(new THREE.Vector3());g.place.space.worldToLocal(p);
          globalThis.__workerMotion.push({hand:p.toArray(),cloth:cloth.position.toArray(),root:r.root.position.toArray()});
          if(globalThis.__workerMotion.length<65)globalThis.requestAnimationFrame(sample);};
        globalThis.requestAnimationFrame(sample);g.beat(()=>g.place.hooks.roomWorker({state:'wipe'}));
      });
      await page.waitForTimeout(400);await capture('counter-wipe');
      await page.waitForTimeout(850);
      const motion=await page.evaluate(()=>globalThis.__workerMotion);
      const active=motion.slice(1,Math.min(45,motion.length));
      const xs=active.map(s=>s.hand[0]);assert.ok(Math.max(...xs)-Math.min(...xs)>.04,'actual worker wrist moves');
      const contact=active.map(s=>Math.hypot(...s.hand.map((x,i)=>x-s.cloth[i])));
      assert.ok(Math.min(...contact)<.025,'cloth contacts real wrist during wipe');
      results.push({case:'actual worker motion',motion});
      await page.evaluate(()=>{globalThis.__game.beat(()=>globalThis.__game.place.hooks.roomWorker({state:'utensils'}));});
      await page.waitForTimeout(350);await capture('counter-utensils');await advance(page);
      // Exercise the actual place leave callback while its action promise is live, then reuse the cached room.
      await page.evaluate(async()=>{
        const g=globalThis.__game,P=g.place,r=P.people.canteen_worker;P.leave();const baseUpdate=r.update;
        const action=P.hooks.roomWorker({state:'wipe'});await g.wait(120);P.leave();await action;
        if(r.update!==baseUpdate)throw new Error('Late action resurrected disposed worker pose');
        P.onPeriod('afternoon');P.update(.1,g.t);P.leave();
        if(r.update!==baseUpdate)throw new Error('Repeat visit stacked worker wrappers');
      });
      await setup('dorm_commons',3,'evening');
      await page.evaluate(async()=>{const g=globalThis.__game;await g.walkTo(...g.place.things.kenji.spot());g.use(g.markers.list.find(m=>m.id==='kenji'));});
      await advance(page,'know the result');await capture('sofa-replay-talk');
      await page.waitForTimeout(600);await capture('sofa-replay-later');
      assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);return;
    }
    const before=await state();
    await choose(page,'canteen_worker','Leave her to it');
    let row=await state();assert.ok(!row.flags.room_trays_seen&&!row.flags.room_closing_seen);
    await capture('canteen-approach');
    for(const text of ['water dispenser','tray-return','closing up','tray-return','closing up'])await choose(page,'canteen_worker',text);
    row=await state();assert.ok(row.flags.room_trays_seen&&row.flags.room_closing_seen);
    assert.ok(row.lines.some(t=>t?.includes('今日も')),'repeat closing response');
    assert.deepEqual(row.known,before.known,'ordinary conversations never grant vocabulary');
    assert.deepEqual(row.overlaps,[]);assert.deepEqual(row.spins,[]);
    results.push({case:'service, topics, repeat and leave',...row});
    await page.evaluate(async()=>{const {setPeriod}=await import('./js/sim.js');setPeriod('lunch',globalThis.__game);const {flags}=await import('./js/narrative/state.js');delete flags.room_closing_seen;});
    await choose(page,'canteen_worker','closing up');row=await state();assert.ok(!row.flags.room_closing_seen,'busy keeps topic available');
    results.push({case:'lunch busy deferral',...row});
    await page.evaluate(async()=>{const {setPeriod}=await import('./js/sim.js');setPeriod('evening',globalThis.__game);globalThis.__game.place.onPeriod('evening');});
    assert.equal(await page.evaluate(()=>globalThis.__game.markers.list.find(m=>m.id==='canteen_worker').enabled()),false);
    await page.evaluate(async()=>{const {setPeriod}=await import('./js/sim.js');setPeriod('afternoon',globalThis.__game);globalThis.__game.place.onPeriod('afternoon');});
    assert.equal(await page.evaluate(()=>globalThis.__game.markers.list.find(m=>m.id==='canteen_worker').enabled()),true);
    await page.evaluate(()=>globalThis.__game.beat(()=>globalThis.__game.place.hooks.roomWorker({state:'wipe'})));
    await advance(page);await capture('canteen-counter');
    await setup('dorm_commons',3,'evening');
    for(const text of ['let you watch','know the result','work going','work going','know the result'])await choose(page,'kenji',text);
    row=await state();assert.ok(row.flags.room_replay_seen&&row.flags.room_work_seen);
    assert.ok(row.lines.some(t=>t?.includes('Still no Kenji')));assert.ok(row.seated);
    assert.deepEqual(row.overlaps,[]);assert.deepEqual(row.spins,[]);
    await capture('commons-tv');results.push({case:'sofa both topics and repeats',...row});
    // The real end-node save must retain topic progress through the title's Continue path.
    await page.goto(`${base}/index.html?mc=${mc}`);
    await page.locator('#title .mcont').click();
    await page.locator('#saves button.slot').filter({hasText:'Autosave'}).click();
    await page.waitForFunction(()=>globalThis.__game?.place?.name==='dorm_commons'&&!globalThis.__game.busy,null,{timeout:45000});
    assert.ok(await page.evaluate(async()=>(await import('./js/narrative/state.js')).flags.room_work_seen));
    await capture('commons-continue');
    await setup('dorm_commons',4,'morning');
    await choose(page,'kenji','let you watch');row=await state();
    assert.ok(row.flags.room_remote_found);assert.ok(row.lines.some(t=>t?.includes('Remote is under me')));assert.ok(row.seated);
    const first=row.lines.filter(t=>t?.includes('Remote is under me')).length;
    await choose(page,'kenji','let you watch');row=await state();
    assert.equal(row.lines.filter(t=>t?.includes('Remote is under me')).length,first);
    assert.deepEqual(row.overlaps,[]);assert.deepEqual(row.spins,[]);
    await capture('commons-sunday');results.push({case:'Sunday remote once and reseat',...row});
    assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);
  }finally{fs.writeFileSync(new URL('report.json',out),JSON.stringify({width,mc,results,errors,blocked},null,2));closing=true;await context.close();}
},{timeoutMs:280000});
console.log('PASS room life',width,out.pathname);
