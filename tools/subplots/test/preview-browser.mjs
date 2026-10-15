// Preview clipping regression using synthetic public text and a fixture portrait only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {withBrowserJob} from '../../lib/browser-job.mjs';
import {scopedRoute} from '../../bible/check-scope.mjs';
const repo=path.resolve(path.dirname(new URL(import.meta.url).pathname),'../../..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'scene-preview-fixture-'));
const port=+(process.env.SUBPLOTS_PREVIEW_TEST_PORT||8899),base=`http://127.0.0.1:${port}`;
const before=process.env.PREVIEW_EXPECT_CLIP==='1';
const out=process.env.ARTIFACTS||path.join(repo,'game3d/shots/preview-fixture');fs.mkdirSync(out,{recursive:true});
if(await fetch(base).then(()=>true,()=>false))throw Error('Fixture port already in use');
const narration='FIRST NARRATION LINE. '+('Mira checks the platform map, then follows the signs toward the far entrance. '.repeat(24))+'LAST NARRATION LINE.';
const japanese='最初の日本語の行です。'+('駅の入り口で次の電車を待ちながら、案内板を確認しています。'.repeat(20))+'日本語の最後の行です。';
const english='FIRST ENGLISH LINE. '+('The next train stops at the smaller platform beyond the footbridge. '.repeat(22))+'LAST ENGLISH LINE.';
const last='FINAL BEAT FIRST LINE. '+('The platform is quieter now, and the next arrival is shown on the board. '.repeat(20))+'FINAL BEAT LAST LINE.';
const scene={id:'public:game3d/story/fixture.js#start',node:'start',title:'Preview text fixture',group:'Train',where:'game3d/story/fixture.js',audience:'public',revision:'fixture',entries:[],metadata:{},history:[],images:[],steps:[{narration},{say:'mira',text:japanese,en:english},{narration:last},{choice:[{text:'Wait here'},{text:'Take the footbridge'}]}]};
const extraScenes=[{...scene,id:scene.id.replace('#start','#branch'),node:'branch',steps:[{if:'alternate_path',then:[{narration:'The marked route is open.'}],else:[{narration:'The marked route is closed.'}]}]},{...scene,id:scene.id.replace('#start','#jump'),node:'jump',steps:[{go:'finish'}]},{...scene,id:scene.id.replace('#start','#finish'),node:'finish',steps:[{narration:'The public fixture has reached the other platform.'}]}];
extraScenes.push({...extraScenes[0],id:scene.id.replace('#start','#branchTarget'),node:'branchTarget'});extraScenes[0]={...extraScenes[0],steps:[{go:'branchTarget'}]};
const scenes=[scene,...extraScenes];
const report={before,errors:[],scope:[],writes:[],views:[]};
const server=spawn('python3',['tools/review_server.py',String(port)],{cwd:repo,stdio:'ignore',env:{...process.env,SUBPLOTS_ROOT:temp,SUBPLOTS_STATE:path.join(temp,'state'),SUBPLOTS_PUBLIC_ONLY:'1'}});
try{
 for(let i=0;i<80;i++){try{if((await fetch(base+'/tools/subplots/web/app.js')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 await withBrowserJob('preview-public-fixture',async browser=>{
  for(const [name,viewport]of[['phone',{width:390,height:844}],['desktop',{width:1366,height:860}]]){
   const context=await browser.newContext({viewport,serviceWorkers:'block'});let closing=false;
   await context.route('**/*',scopedRoute({publicOnly:true,onFailure:m=>report.scope.push(m),isClosing:()=>closing}));
   await context.route('**/fixture/portrait.svg',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="140" height="280"><circle cx="70" cy="62" r="48" fill="#84afb9"/><path d="M10 280V148Q70 100 130 148V280" fill="#395a75"/></svg>'}));
   await context.route('**/api/subplots/**',r=>{
    if(r.request().method()!=='GET'){report.writes.push(r.request().url());return r.abort();}
    const a=new URL(r.request().url()).pathname.slice('/api/subplots/'.length);
    const json=a==='authoring'?{characters:[{id:'mira',name:'Mira',color:'#84c8cf',portrait:'/fixture/portrait.svg'}],places:[],variables:[],events:[],words:[]}:a==='catalog'?{scenes}:a==='read'?scenes.find(s=>s.id===new URL(r.request().url()).searchParams.get('id')):a==='map'?{nodes:[]}:a==='status'?{status:{}}:a==='comments'?{comments:[]}:[];
    return r.fulfill({json});
   });
   const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
   try{
    await page.goto(base+'/tools/subplots/web/?scene='+encodeURIComponent(scene.id),{waitUntil:'networkidle'});
    await page.locator('#preview').click();
    const firstBounds=async(lastLine=false,selector='.pv-line')=>page.locator('#previewDialog '+selector).evaluate((el,end)=>{
     const walker=globalThis.document.createTreeWalker(el,globalThis.NodeFilter.SHOW_TEXT);let node,chosen;
     while((node=walker.nextNode()))if(node.textContent.trim()){chosen=node;if(!end)break;}
     const range=globalThis.document.createRange();const text=chosen.textContent;range.setStart(chosen,end?Math.max(0,text.length-8):0);range.setEnd(chosen,end?text.length:Math.min(8,text.length));
     const r=range.getBoundingClientRect(),stage=el.closest('.pv-stage').getBoundingClientRect(),copy=el.closest('.pv-copy')?.getBoundingClientRect();
     const box=copy||stage;const x=Math.max(box.left+1,Math.min(r.left+3,box.right-1)),y=r.top+r.height/2;
     const hit=globalThis.document.elementFromPoint(x,y);return{line:r.toJSON(),stage:stage.toJSON(),copy:copy?.toJSON(),visible:r.top>=box.top-1&&r.bottom<=box.bottom+1&&r.top>=stage.top-1&&r.bottom<=stage.bottom+1&&!!hit&&el.contains(hit)};
    },lastLine);
    const initial=await firstBounds();report.views.push({device:name,beat:'narration-first',...initial});
    await page.screenshot({path:path.join(out,name+'-narration-first.png')});
    if(before){if(name==='phone')assert.equal(initial.visible,false,'baseline reproduces missing first line');continue;}
    assert.equal(initial.visible,true,'first narration glyphs are visible within the stage');
    let toolbarHeight;
    const controls=async()=>{
     const state=await page.locator('.pv-bar').evaluate(el=>({rect:el.getBoundingClientRect().toJSON(),buttons:[...el.querySelectorAll('button')].map(x=>({text:x.textContent,rect:x.getBoundingClientRect().toJSON()}))}));
     for(const {rect}of state.buttons){assert.ok(rect.x>=0&&rect.right<=viewport.width);assert.ok(rect.y>=0&&rect.bottom<=viewport.height);}
     if(toolbarHeight)assert.equal(state.rect.height,toolbarHeight,'toolbar remains stable across beats');else toolbarHeight=state.rect.height;
     for(const button of await page.locator('.pv-bar button:enabled').all())await button.click({trial:true});
    };
    const scrollLast=async(selector,label)=>{
     const copy=page.locator('.pv-copy');await copy.hover();await page.mouse.wheel(0,100000);
     await page.waitForFunction(()=>{const e=globalThis.document.querySelector('.pv-copy');return e.scrollHeight-e.clientHeight-e.scrollTop<=2;});
     const bounds=await firstBounds(true,selector);assert.equal(bounds.visible,true,label+' final glyphs visible after normal scrolling');
     report.views.push({device:name,beat:label+'-last',...bounds});await page.screenshot({path:path.join(out,name+'-'+label+'-last.png')});
    };
    await controls();
    await page.locator('.pv-copy').click();
    const counter=await page.locator('.pv-counter').innerText();
    assert.match(counter,/Beat 1 of/,'clicking long text does not advance');
    for(const key of ['PageDown','Home','End',' ','Home']){await page.keyboard.press(key);await page.waitForTimeout(180);assert.equal(await page.locator('.pv-counter').innerText(),counter,'text scroll keys do not advance');}
    assert.equal((await firstBounds()).visible,true,'Home returns to first narration line');
    await scrollLast('.pv-line','narration');
    assert.match(await page.locator('.pv-counter').innerText(),/Beat 1 of/,'scrolling does not advance');
    await page.locator('[data-next]').click();
    const focusAfterNext=await page.evaluate(()=>({tag:globalThis.document.activeElement.tagName,inDialog:globalThis.document.querySelector('#previewDialog').contains(globalThis.document.activeElement)}));report.views.push({device:name,focusAfterNext});assert.equal(focusAfterNext.inDialog,true,'Next keeps keyboard focus in Preview');
    await page.locator('.pv-por').evaluate(x=>x.decode());
    if(name==='phone'){const portrait=await page.locator('.pv-por').boundingBox(),copy=await page.locator('.pv-copy').boundingBox();assert.ok(portrait.x+portrait.width<=copy.x,'portrait leaves all text unobstructed');}
    const jp=await firstBounds();assert.equal(jp.visible,true,'first Japanese glyphs visible');report.views.push({device:name,beat:'japanese-first',...jp});
    await controls();await page.screenshot({path:path.join(out,name+'-japanese-first.png')});
    const jpEnd=await firstBounds(true);await page.locator('.pv-copy').hover();await page.mouse.wheel(0,jpEnd.line.bottom-jpEnd.copy.bottom+12);
    await page.waitForTimeout(250);const jpLast=await firstBounds(true);assert.equal(jpLast.visible,true,'last Japanese glyphs visible');report.views.push({device:name,beat:'japanese-last',...jpLast});await page.screenshot({path:path.join(out,name+'-japanese-last.png')});
    const enStart=await firstBounds(false,'.pv-sub');await page.locator('.pv-copy').hover();await page.mouse.wheel(0,enStart.line.top-enStart.copy.top-2);await page.waitForTimeout(250);const enFirst=await firstBounds(false,'.pv-sub');assert.equal(enFirst.visible,true,'first English glyphs visible');report.views.push({device:name,beat:'english-first',...enFirst});await page.screenshot({path:path.join(out,name+'-english-first.png')});
    await scrollLast('.pv-sub','english');
    await page.locator('[data-back]').click();assert.equal((await firstBounds()).visible,true,'Back restores the first line');
    assert.equal(await page.locator('#previewDialog').evaluate(el=>el.contains(globalThis.document.activeElement)),true,'Back retains modal focus when Back becomes disabled');
    await page.keyboard.press('ArrowRight');assert.match(await page.locator('.pv-counter').innerText(),/Beat 2 of/);
    await page.keyboard.press('ArrowLeft');assert.match(await page.locator('.pv-counter').innerText(),/Beat 1 of/);
    await page.locator('[data-next]').click();await page.keyboard.press('Enter');assert.match(await page.locator('.pv-counter').innerText(),/Beat 3 of/,'Enter on Next advances once');
    await page.keyboard.press('ArrowLeft');await page.keyboard.press(' ');assert.match(await page.locator('.pv-counter').innerText(),/Beat 3 of/,'Space on Next advances once');
    assert.equal((await firstBounds()).visible,true,'final narration begins visibly');await controls();await scrollLast('.pv-line','final');
    await page.locator('[data-next]').click();assert.equal(await page.locator('[data-next]').isDisabled(),true,'Next waits for an authored choice');
    await page.locator('.pv-chips [data-opt="0"]').click();await page.getByRole('button',{name:'Back to editing',exact:true}).click();
    await page.locator('#preview').click();await page.keyboard.press('Escape');assert.equal(await page.locator('#previewDialog').isVisible(),false,'Escape closes Preview');
    for(const node of ['branch','jump']){
     await page.goto(base+'/tools/subplots/web/?scene='+encodeURIComponent(scene.id.replace('#start','#'+node)),{waitUntil:'networkidle'});await page.locator('#preview').click();
     if(node==='branch'){await page.locator('[data-follow]').click();await page.locator('[data-arm]').first().waitFor();}
     assert.equal(await page.locator('[data-next]').isDisabled(),true,node+' waits for its explicit action');
     const waiting=await page.locator('.pv-line').innerText();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('.pv-line').innerText(),waiting);
     await page.locator(node==='branch'?'[data-arm="then"]':'[data-follow]').click();await page.waitForFunction(()=>!globalThis.document.querySelector('[data-next]').disabled);
     assert.match(await page.locator('.pv-line').innerText(),node==='branch'?/marked route is open/:/other platform/);
     if(node==='branch'){await page.locator('[data-back]').click();await page.locator('[data-arm="else"]').click();assert.match(await page.locator('.pv-line').innerText(),/marked route is closed/);await page.locator('[data-next]').click();await page.getByRole('button',{name:'Back to editing',exact:true}).waitFor();}
     await page.keyboard.press('Escape');
    }
    const state=await page.evaluate(async()=>{const {S}=await import('/tools/subplots/web/store.js');return {metadata:S.scene.metadata,undo:S.undo.length};});assert.deepEqual(state,{metadata:{},undo:0});
   }catch(e){await page.screenshot({path:path.join(out,name+'-failure.png')});throw e;}finally{closing=true;await context.close();}
  }
 },{gpuWaitMs:60000,timeoutMs:110000});
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.scope,[]);assert.deepEqual(report.writes,[]);report.pass=true;
}catch(e){report.pass=false;report.failure=e.stack;process.exitCode=1;}
finally{server.kill('SIGTERM');await new Promise(r=>server.once('exit',r));fs.rmSync(temp,{recursive:true,force:true});fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({pass:report.pass,before,views:report.views.length,failure:report.failure,errors:report.errors,scope:report.scope,writes:report.writes}));
