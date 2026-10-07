import assert from 'node:assert/strict';
import fs from 'node:fs';
import {withBrowserJob} from '../../tools/lib/browser-job.mjs';
import {scopedRoute} from '../../tools/bible/check-scope.mjs';
const base=process.env.BASE||'game3d';
await withBrowserJob('karaoke-selector-regression',async browser=>{
 for(const width of [1366,390]){
  const context=await browser.newContext({viewport:{width,height:860},hasTouch:width<700}),page=await context.newPage(),errors=[];
  await context.route('**/*',scopedRoute({publicOnly:true,onFailure:e=>errors.push(e)}));page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({privateMode:false,voiceOn:false,textSpeed:'instant'}));
   globalThis.localStorage.setItem('amakawa-day1-save',JSON.stringify({v:1,day:5,period:'lunch',place:'karaoke_booth',known:[],seen:[],found:[],met:[],taught:{},inv:[],yen:4000,bonds:{},flags:{day:5,period:'lunch',place:'karaoke_booth',d5_started:true},runner:{onceDone:[]}}));
  });
  await page.goto(`http://127.0.0.1:8771/${base}/index.html?q=0`);
  await page.locator('#title .mcont').click();await page.locator('#saves button.slot').filter({hasText:'Autosave'}).click();
  await page.waitForFunction(()=>globalThis.__game?.place?.name==='karaoke_booth'&&!globalThis.__game.busy,null,{timeout:45000});
  const out=new URL(`../shots/karaoke-club/selector-${width}/`,import.meta.url);fs.mkdirSync(out,{recursive:true});
  await page.evaluate(()=>{globalThis.__game.busy=true;globalThis.__game.setHurry(true);});
  for(const state of ['show','key','book','verify']){
   await page.evaluate(state=>globalThis.__game.place.hooks.selectorRepair({state}),state);
   await page.waitForTimeout(500);await page.screenshot({path:new URL(state+'.png',out).pathname});
  }
  const result=await page.evaluate(()=>{const g=globalThis.__game,P=g.place,p=P.things.song_terminal.anchor(g.player.root.position.clone());return {anchor:p.toArray(),visible:P.people.kenji.root.visible,repair:P.snapshotState().monday};});
  assert.equal(result.anchor[1],.69);assert(result.visible);assert.deepEqual(errors,[]);
  fs.writeFileSync(new URL('result.json',out),JSON.stringify({result,errors,pass:true},null,2));await context.close();console.log(width,'selector repair PASS');
 }
},{timeoutMs:120000});
