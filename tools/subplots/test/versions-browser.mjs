// Shot-history regression on public fixture data. No real scenes, renders, picks or writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {withBrowserJob} from '../../lib/browser-job.mjs';
import {scopedRoute} from '../../bible/check-scope.mjs';
const repo=path.resolve(path.dirname(new URL(import.meta.url).pathname),'../../..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'shot-versions-'));
const port=+(process.env.SUBPLOTS_VERSIONS_TEST_PORT || 8898), base=`http://127.0.0.1:${port}`;
const out=process.env.ARTIFACTS || path.join(repo,'game3d/shots/shot-versions');
fs.mkdirSync(out,{recursive:true});
if(await fetch(base).then(()=>true,()=>false))throw Error('Fixture port already in use');
const id='public:game3d/story/fixture.js#start',slot='file:fixture/station.webp';
const scene={id,node:'start',title:'A station door',group:'Train',where:'game3d/story/fixture.js',audience:'public',revision:'fixture',entries:[],metadata:{},history:[],
 images:[{id:slot,file:'fixture/station.webp',url:'/fixture/live.svg',available:true}],
 steps:[{narration:'The station doors close as Mira reaches the platform.'},{shot:{},imageSlot:slot,imageUrl:'/fixture/live.svg'},{say:'mira',text:'Hold the door, please.'},{choice:[{text:'Wait here'},{text:'Go ahead'}]}]};
const renders=Array.from({length:8},(_,i)=>({id:'attempt-'+(i+1),n:i+1,file:`fixture/${i+1}.svg`,thumb:`fixture/${i+1}.svg`,seed:100+i,at:`2026-10-15T12:0${i}:00`,
 reject:i%2===0,reject_reason:i%2===0?'The door frame is clipped.':'',compose:{subplotId:id,imageSlot:slot}}));
const deleted={...renders[0],id:'deleted',n:9,deleted:true};
const other={...renders[1],id:'other-shot',n:10,compose:{subplotId:id,imageSlot:'file:fixture/other.webp'}};
const history=[{run_id:'fixture',positive:'Public station diagram fixture',characters:['mira'],renders:[...renders,deleted,other]}];
const original=JSON.stringify(renders);
const svg=n=>`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400"><rect width="640" height="400" fill="#243f5b"/><path fill="#486c8a" d="M0 250L640 180V400H0Z"/><rect x="170" y="40" width="300" height="290" rx="12" fill="#94b5c5"/><rect x="200" y="64" width="110" height="215" fill="#193246"/><rect x="330" y="64" width="110" height="215" fill="#193246"/><path d="M320 42V320" stroke="#14283e" stroke-width="8"/><text x="24" y="365" fill="white" font-family="sans-serif" font-size="30">Fixture ${n}</text></svg>`;
const server=spawn('python3',['tools/review_server.py',String(port)],{cwd:repo,stdio:'ignore',env:{...process.env,SUBPLOTS_ROOT:temp,SUBPLOTS_STATE:path.join(temp,'state'),SUBPLOTS_PUBLIC_ONLY:'1'}});
const report={errors:[],scope:[],writes:[],views:[]};
try{
 for(let i=0;i<80;i++){try{if((await fetch(base+'/tools/subplots/web/app.js')).ok)break;}catch{} await new Promise(r=>setTimeout(r,100));}
 await withBrowserJob('shot-versions-fixture',async browser=>{
  for(const [name,viewport] of [['desktop',{width:1366,height:860}],['phone',{width:390,height:844}]]){
   const context=await browser.newContext({viewport,serviceWorkers:'block'});let closing=false;
   await context.route('**/*',scopedRoute({publicOnly:true,onFailure:m=>report.scope.push(m),isClosing:()=>closing}));
   await context.route('**/fixture/**',r=>r.fulfill({contentType:'image/svg+xml',body:svg(new URL(r.request().url()).pathname.split('/').at(-1))}));
   await context.route('**/api/subplots/**',async r=>{
    if(r.request().method()!=='GET'){report.writes.push(r.request().url());return r.abort();}
    const u=new URL(r.request().url()),a=u.pathname.slice('/api/subplots/'.length);
    if(a.includes('/out/')||a.includes('/thumb/'))return r.fulfill({contentType:'image/svg+xml',body:svg(u.pathname.split('/').at(-1))});
    const json=a==='authoring'?{characters:[{id:'mira',name:'Mira'}],places:[],variables:[],events:[],words:[]}:a==='catalog'?{scenes:[scene]}:a==='map'?{nodes:[]}:a==='status'?{status:{}}:a==='read'?scene:a==='pictures'?{runs:history}:a==='picture-source'?{job:null}:a==='comments'?{comments:[]}:a==='image/api/jobs'?[{...renders[2],status:'done'}]:a==='image/api/presets'?{}:[];
    return r.fulfill({json});
   });
   const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
   try{
    await page.goto(base+'/tools/subplots/web/?scene='+encodeURIComponent(id),{waitUntil:'networkidle'});
    assert.match(await page.locator('#timeline textarea').first().inputValue(),/station doors close/);
    await page.locator('#timeline .pic .change').click();
    await page.locator('[data-v="attempt-8"]').waitFor();
    assert.equal(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth<=globalThis.innerWidth),true,'no horizontal page overflow');
    assert.equal(await page.locator('.ver-strip [data-v]').count(),9,'eight attempts plus current scene picture');
    assert.equal(await page.locator('.ver-strip [data-v=deleted]').count(),0);
    assert.equal(await page.locator('.ver-strip [data-v=other-shot]').count(),0);
    assert.equal(await page.locator('.ver-strip button').filter({hasText:'Rejected'}).count(),4);
    assert.equal(await page.locator('.history-grid button').evaluateAll(xs=>xs.filter(x=>x.textContent.trim()==='#1').length),0,'ordinary picker still excludes rejected attempts');
    await page.locator('.ver-strip img').evaluateAll(xs=>Promise.all(xs.map(x=>x.decode())));
    await page.locator('.ver-strip [data-v=attempt-1]').scrollIntoViewIfNeeded();
    await page.locator('#tabPicture [data-compose]').click({trial:true});
    await page.locator('#tabPicture [data-new]').click({trial:true});
    await page.screenshot({path:path.join(out,name+'-history.png'),fullPage:true});
    await page.locator('.ver-strip').screenshot({path:path.join(out,name+'-history-detail.png')});
    await page.locator('[data-v=attempt-1]').click();
    await page.locator('#compareDialog').waitFor({state:'visible'});
    assert.match(await page.locator('#compareDialog .cmp-pair').innerText(),/Rejected[\s\S]*The door frame is clipped/);
    assert.equal(await page.locator('#compareDialog').evaluate(el=>el.scrollWidth<=el.clientWidth),true,'Compare has no outer horizontal overflow');
    assert.equal(await page.locator('#compareDialog [data-pick]').count(),9);
    await page.locator('#compareDialog img').evaluateAll(xs=>Promise.all(xs.map(x=>x.decode())));
    await page.screenshot({path:path.join(out,name+'-compare.png')});
    await page.locator('#compareDialog [data-close]').click();
    const state=await page.evaluate(async()=>{const {S}=await import('/tools/subplots/web/store.js');return {metadata:S.scene.metadata,dirty:S.undo.length};});
    assert.deepEqual(state,{metadata:{},dirty:0},'inspection does not pick or edit');
    report.views.push({device:name,attempts:8,rejected:4,state});
   }catch(e){await page.screenshot({path:path.join(out,name+'-failure.png'),fullPage:true});throw e;}finally{closing=true;await context.close();}
  }
 },{gpuWaitMs:60000,timeoutMs:90000});
 assert.equal(JSON.stringify(renders),original);assert.deepEqual(report.errors,[]);assert.deepEqual(report.scope,[]);assert.deepEqual(report.writes,[]);report.pass=true;
}catch(e){report.pass=false;report.failure=e.stack;process.exitCode=1;}
finally{server.kill('SIGTERM');await new Promise(r=>server.once('exit',r));fs.rmSync(temp,{recursive:true,force:true});fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify(report));
