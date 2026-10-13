import { publicResearchContextOptions } from '../test/support/research-integration-evidence.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {withBrowserJob} from '../../tools/lib/browser-job.mjs';
import {waitForGame} from '../test/support/wait-ready.mjs';
const out=`/tmp/codex-research-goal-${process.env.ROUND||'1'}`;fs.mkdirSync(out,{recursive:true});
const long='Head office is back down the works street and east along the office street, past the gym and the plaza. Take its lift down to B2.';
await withBrowserJob('research-goal',async browser=>{
 for(const width of [1366,390]){
 const c=await publicResearchContextOptions(browser,{viewport:{width,height:844}}),p=await c.newPage(),checks=[],errors=[];p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({v:2,voiceOn:false,privateMode:false})));
 try{
 await waitForGame(p,60000,()=>p.goto(`http://127.0.0.1:${process.env.PORT||8771}/${process.env.BASE||'game3d'}/index.html?day=2&place=works`),'play');await p.waitForFunction(()=>!globalThis.__game.busy);await p.locator('#boot').waitFor({state:'detached'});
 for(const [id,text]of [['long',long],['short','Return to the office.']]){
 await p.evaluate(text=>{globalThis.__game.ui.goal(text);},text);await p.waitForTimeout(500);
 const rect=await p.evaluate(()=>{const t=globalThis.document.querySelector('#goal .t'),b=globalThis.document.querySelector('#goal .gl'),s=globalThis.getComputedStyle(t);return{text:t.textContent,aria:b.getAttribute('aria-label'),height:t.clientHeight,line:parseFloat(s.lineHeight),padding:[s.paddingTop,s.paddingBottom],button:b.getBoundingClientRect().toJSON()};});
 checks.push({id,...rect});assert.equal(rect.text,text);assert.equal(rect.aria,'Goal: '+text);assert.deepEqual(rect.padding,['0px','0px']);assert.ok(rect.height<=rect.line*2+.5);assert.ok(rect.button.height>=(width<700?44:40));assert.ok(rect.button.x>=0&&rect.button.right<=width);await p.screenshot({path:`${out}/${width}-${id}.png`});
 await p.evaluate(text=>{const u=globalThis.__game.ui;u.hint(text);u.hideHint();},text);await p.locator('#goal .gl').click();await p.locator('#hint').waitFor({state:'visible'});assert.equal(await p.locator('#hint .hx').textContent(),text);await p.screenshot({path:`${out}/${width}-${id}-hint.png`});
 }
 assert.deepEqual(errors,[]);
 }catch(error){await p.screenshot({path:`${out}/${width}-failure.png`});throw error;}finally{fs.writeFileSync(`${out}/${width}-report.json`,JSON.stringify({checks,errors},null,2));await c.close();}
 }
},{gpuWaitMs: Number(process.env.GPU_WAIT || 1800) * 1000, timeoutMs:180000});
