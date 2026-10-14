// Native walking through B2's copy-room doorway from the reported female MC position.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const base = process.env.BASE || 'game3d';
const out = process.env.OUT || new URL('../shots/copy-room-entry-20261014/', import.meta.url).pathname;
const blocked = process.env.EXPECT_BLOCKED === '1';
fs.mkdirSync(out, { recursive: true });
await withBrowserJob('copy-room-entry-check', async browser => {
 for (const mc of blocked ? ['carina'] : ['carina', 'eric']) {
  for (const width of blocked ? [1366] : [390,1366]) {
   const page = await browser.newPage({ viewport:{width,height:width<600?844:860} });
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',r=>new URL(r.request().url()).pathname.includes('/private/')?r.fulfill({status:404,body:''}):r.continue());
   await page.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({v:99,privateMode:false,voiceOn:false,cameraMode:'follow',textSpeed:'instant'})));
   await waitForGame(page,60000,()=>page.goto(`http://127.0.0.1:8771/${base}/?place=office&mc=${mc}&perf&cap&q=2`),'any');
   await page.waitForFunction(()=>globalThis.__done);
   await page.evaluate(async()=>{
    globalThis.__run=true;
    globalThis.document.body.classList.remove('cap');
    const {flags}=await import('./js/narrative/state.js');
    Object.assign(flags,{greeted_mori:true,kenji_intro:true,machine_open:true,chair_back:true,got_ticket:true,copier_done:true});
   });
   await page.locator('#boot').waitFor({state:'hidden'});
   await page.waitForFunction(()=>!globalThis.__game.busy&&!globalThis.__game.walker.path);
   for (const cameraMode of ['overview','follow']) {
    await page.evaluate(async cameraMode=>{
     const g=globalThis.__game;
     (await import('./js/settings.js')).setSetting('cameraMode',cameraMode);
     g.walker.stop();g.player.root.position.set(-4.03,0,2.14);g.jump.reset();g.walker.sync();
     g.followCamera.aim(0,0.05);
    },cameraMode);
    await page.waitForTimeout(700);
    const clearance=await page.evaluate(()=>{
     const g=globalThis.__game;
     return {nav:g.place.nav.free(-4.03,2.5),physical:g.walker.traversal.clear([-4.03,2.14],[-4.03,2.9]),scale:g.player.root.scale.x};
    });
    // Use the real keyboard path. Pin its initial camera frame toward the door so both views use the same direction.
    const walk=async direction=>{
     await page.keyboard.down('ArrowUp');
     await page.evaluate(direction=>{globalThis.__game.walker.keyFrame={x:0,y:0,z:direction};},direction);
     try {await page.waitForTimeout(950);} finally {await page.keyboard.up('ArrowUp');}
     await page.waitForTimeout(180);
     return page.evaluate(()=>globalThis.__game.player.root.position.toArray());
    };
    const entered=await walk(1);
    await page.screenshot({path:`${out}/${mc}-${width}-${cameraMode}-${blocked?'baseline':'inside'}.png`});
    if(blocked){assert.ok(entered[2]<2.4,`Baseline must stop before entry ${entered}`);assert.equal(clearance.physical,false);}
    else {
     assert.ok(entered[2]>2.85,`Native entry failed ${entered}`);assert.equal(clearance.physical,true);
     const returned=await walk(-1);
     assert.ok(returned[2]<2.25,`Native exit failed ${returned}`);
    }
    console.log('PASS',blocked?'baseline blocker':'native doorway',mc,width,cameraMode,JSON.stringify({clearance,entered}));
   }
   if(!blocked){
    await page.evaluate(async()=>{
     const g=globalThis.__game,{flags}=await import('./js/narrative/state.js');
     flags.copier_done=false;flags.copier_started=false;
     g.walker.stop();g.player.root.position.set(-4.03,0,2.14);g.jump.reset();g.walker.sync();
    });
    await page.keyboard.down('ArrowUp');
    await page.evaluate(()=>{globalThis.__game.walker.keyFrame={x:0,y:0,z:1};});
    try {await page.waitForFunction(async()=> (await import('./js/narrative/state.js')).flags.copier_started,{timeout:10000});}
    finally {await page.keyboard.up('ArrowUp');}
    await page.waitForFunction(()=>globalThis.__game.runner.currentNode==='copier',{timeout:15000});
    await page.waitForTimeout(2500);
    await page.screenshot({path:`${out}/${mc}-${width}-copier-scene.png`});
    const scene=await page.evaluate(async()=>({node:globalThis.__game.runner.currentNode,started:(await import('./js/narrative/state.js')).flags.copier_started,position:globalThis.__game.player.root.position.toArray()}));
    assert.equal(scene.started,true);assert.equal(scene.node,'copier');
    console.log('PASS native entry starts copier scene',mc,width,JSON.stringify(scene));
   }
   assert.deepEqual(errors,[]);
   await page.close();
  }
 }
}, {timeoutMs:240000,gpuWaitMs:900000});
