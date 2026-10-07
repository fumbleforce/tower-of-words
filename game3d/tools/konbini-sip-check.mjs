// A single owned-carton fixture isolates the actual Runner's visible sip; payment is covered by konbini-check.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {withBrowserJob} from '../../tools/lib/browser-job.mjs';
import {waitForGame} from '../test/support/wait-ready.mjs';
const width=+(process.argv[2]||390),mc=process.argv[3]||'carina',out=`game3d/shots/codex-konbini/${process.env.ROUND||'sip'}`;
fs.mkdirSync(out,{recursive:true});
await withBrowserJob('konbini-sip',async browser=>{
 const page=await browser.newPage({viewport:{width,height:width<700?844:860}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({textSpeed:'instant',voiceOn:false,privateMode:false})));
 try{
  await waitForGame(page,60000,()=>page.goto(`http://127.0.0.1:8794/game3d/index.html?day=3&place=konbini&mc=${mc}`),'play');
  await page.waitForFunction(()=>!globalThis.__game.busy&&!globalThis.document.querySelector('#boot:not(.gone)'));
  await page.evaluate(async yaw=>{const g=globalThis.__game;(await import('./js/narrative/state.js')).flags.place='konbini';g.sim.inv.push('milk');g.place.konbini.trade.sync();const seat=g.place.seats.konbini_seat;g.player.sitAt(seat.x,seat.top,seat.z,seat.ry);g.player.seated=true;g.player.seatOut=[...seat.out];g.walker.facing=seat.ry;if(yaw!==null){const stage=g.place.konbini,update=stage.update;stage.update=function(...a){update.apply(this,a);g.place.cam.yaw=yaw;};}},process.env.SIP_YAW?+process.env.SIP_YAW:null);
  const action=page.evaluate(()=>globalThis.__game.beat(()=>globalThis.__game.runner.run('consume_milk')));action.catch(()=>{});
  await page.waitForFunction(()=>globalThis.__game.place.konbini.contacts.at(-1)?.action==='konbini-openMilk-place');
  await page.screenshot({path:`${out}/${width}-${mc}-sip.png`});
  const pose=await page.evaluate(async()=>{const g=globalThis.__game,p=g.place.konbini.models.openMilk,heads=[];g.player.root.traverse(o=>{if(o.isBone&&/head/i.test(o.name))heads.push({name:o.name,at:g.place.space.worldToLocal(o.getWorldPosition(g.player.root.position.clone())).toArray()});});return{heads,carton:p.position.toArray(),rotation:p.rotation.toArray(),scale:p.scale.toArray(),player:g.player.root.position.toArray()};});console.log('POSE',JSON.stringify(pose));await action;
  const report=await page.evaluate(()=>({inv:globalThis.__game.sim.inv,contacts:globalThis.__game.place.konbini.contacts}));assert.deepEqual(report.inv,[]);assert.deepEqual(errors,[]);
  fs.writeFileSync(`${out}/${width}-${mc}.json`,JSON.stringify({report,errors},null,2));console.log('PASS',width,mc);
 }finally{await page.close();}
},{timeoutMs:120000,gpuWaitMs:180000});
