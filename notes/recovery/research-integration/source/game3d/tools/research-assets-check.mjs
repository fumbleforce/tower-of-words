import fs from 'node:fs';
import assert from 'node:assert/strict';
import {withBrowserJob} from '../../tools/lib/browser-job.mjs';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=fileURLToPath(new URL('../../',import.meta.url));
const props=JSON.parse(execFileSync('python3',['tools/assets/scan.py','--runtime-data'],{cwd:root,encoding:'utf8'})).props.filter(p=>p.place==='research_lab'||p.id_==='prop/works/weather_station');
const entries=[{id_:'room/research_lab',view:{type:'room',room:'research-room'}},...props];
const out=`/tmp/codex-research-assets-${process.env.ROUND||'1'}`;fs.mkdirSync(out,{recursive:true});
await withBrowserJob('research-assets',async browser=>{
 const context=await browser.newContext({viewport:{width:480,height:480}}),page=await context.newPage(),errors=[],requests=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 try{await page.goto(`http://127.0.0.1:${process.env.PORT||8771}/${process.env.BASE?process.env.BASE.replace(/game3d$/,''):''}tools/assets/render.html`);await page.waitForFunction(()=>globalThis.ready);
  const geometry=await page.evaluate(async()=>{const {buildAsset}=await import('./viewer.js'),{SHELF}=await import('../../game3d/js/scenes/research-room/plan.js'),b=await buildAsset({type:'room',room:'research-room'});return Object.fromEntries(Object.entries(SHELF).map(([id,at])=>[id,{expected:at,actual:b.object.getObjectByName('research-book:'+id).position.toArray()}]));});for(const book of Object.values(geometry))assert.deepEqual(book.actual,book.expected,'preview starts with the original books on their shelf');checks.push({geometry});
  for(const entry of entries){await page.evaluate(v=>globalThis.renderThumb(v),entry.view);await page.waitForTimeout(1100);const url=await page.evaluate(v=>globalThis.renderThumb(v),entry.view);assert.match(url,/^data:image\/webp;base64,/);const bytes=Buffer.from(url.split(',')[1],'base64');assert.ok(bytes.length>1000);const name=entry.id_.replaceAll('/','-')+'.webp';fs.writeFileSync(out+'/'+name,bytes);checks.push({id:entry.id_,view:entry.view,image:name,bytes:bytes.length});}
  assert.deepEqual(errors,[]);
 }catch(error){checks.push({failure:error.stack});await page.screenshot({path:out+'/failure.png'});throw error;}finally{fs.writeFileSync(out+'/report.json',JSON.stringify({checks,errors,requests},null,2));await context.close();}
},{timeoutMs:180000,gpuWaitMs:1200000});
