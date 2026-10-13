import fs from 'node:fs';
import assert from 'node:assert/strict';
import {withBrowserJob} from '../../tools/lib/browser-job.mjs';
import {waitForGame} from '../test/support/wait-ready.mjs';
import {publicResearchContextOptions} from '../test/support/research-integration-evidence.mjs';
const base=new URL((process.env.BASE||'game3d')+'/',`http://127.0.0.1:${process.env.PORT||8771}/`).href,out=`/tmp/codex-research-menu-${process.env.ROUND||'1'}`;fs.mkdirSync(out,{recursive:true});
await withBrowserJob('research-menu',async browser=>{
 const context=await publicResearchContextOptions(browser,{viewport:{width:390,height:844}}),page=await context.newPage(),errors=[],checks=[];
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({v:2,textSpeed:'instant',voiceOn:false,privateMode:false})));
 const idle=async()=>{await page.waitForFunction(()=>!globalThis.__game.busy||globalThis.document.body.innerText.includes('The scene could not finish'),null,{timeout:90000});assert.deepEqual(errors,[]);};
 const use=async id=>page.evaluate(id=>{const g=globalThis.__game;g.use({id,...g.place.things[id]});},id);
 const choose=async text=>{const target=page.getByText(text,{exact:true});await target.waitFor({state:'visible',timeout:90000});await page.waitForTimeout(950);await target.click();};
 const state=()=>page.evaluate(()=>globalThis.__game.place.research.state.read());
 try{
  await waitForGame(page,60000,()=>page.goto(`${base}index.html?day=2&place=research_lab&mc=carina`),'play');await idle();
  await page.evaluate(async()=>{const{ui,setMuted}=await import('./js/ui.js');setMuted(true);ui.auto=true;const choice=ui.choose;ui.choose=async function(...args){this.auto=false;try{return await choice.apply(this,args);}finally{this.auto=true;}};});
  await use('research_books');await choose('Weather instruments · window chair');await choose('Next page');await choose('Mark this page');await choose('Remove bookmark');await choose('Previous page');await choose('Close book view');await idle();
  checks.push(await state());assert.deepEqual(checks.at(-1).active,{book:'weather',seat:'research_window_seat'});assert.equal(checks.at(-1).pages.weather,0);assert.equal(checks.at(-1).marks.weather,null);
  await use('research_books');await choose('Copier · reading table');await choose('Close book view');await idle();
  checks.push(await state());assert.deepEqual(checks.at(-1).active,{book:'copier',seat:'research_table_seat'});
  await use('research_reader');await choose('Ask about the cover word.');await choose('Keep reading.');await idle();checks.push(await state());assert.equal(checks.at(-1).active.book,'copier');
  await use('research_reader');await choose('Point to the white box in the weather book.');await choose('Close book view');await idle();checks.push(await state());assert.equal(checks.at(-1).active.book,'weather');
  await use('research_reader');await choose('Point to the white box in the weather book.');await choose('Close book view');await idle();
  await use('research_books');await choose('Put the book back.');await idle();assert.equal((await state()).active,null);
  await page.screenshot({path:`${out}/finished.png`});assert.deepEqual(errors,[]);
 }catch(error){checks.push({failure:error.stack});await page.screenshot({path:`${out}/failure.png`});throw error;}
 finally{fs.writeFileSync(`${out}/report.json`,JSON.stringify({checks,errors},null,2));await context.close();}
},{gpuWaitMs:Number(process.env.GPU_WAIT||1800)*1000,timeoutMs:295000});
