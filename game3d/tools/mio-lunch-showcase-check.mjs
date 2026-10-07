import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { blockedSource, scopedFetch } from '../../tools/bible/check-scope.mjs';
const base=process.env.BIBLE_BASE||'http://127.0.0.1:8771/';
const id='mio-lunch-20261007',out=`/tmp/codex-mio-lunch-showcase-check-${process.env.ROUND||'1'}`;
fs.mkdirSync(out,{recursive:true});
const entry=await (await scopedFetch(base+`showcase/${id}/entry.json`,{publicOnly:true})).json();
const manifests=await (await scopedFetch(base+`showcase/${id}/capture-sha256.json`,{publicOnly:true})).json();
const images=entry.sections.flatMap(s=>s.images),ids=images.map(i=>i.id),unique=new Map(manifests.map(i=>[i.image,i]));
assert.equal(new Set(ids).size,ids.length);assert.equal(unique.size,manifests.length);assert.equal(new Set(images.map(i=>i.image)).size,manifests.length);
for(const im of images)assert.ok(unique.has(im.image));
let cursor=0,verified=0;
await Promise.all(Array.from({length:4},async()=>{while(cursor<manifests.length){const row=manifests[cursor++];const response=await scopedFetch(base+row.image,{publicOnly:true});assert.equal(response.status,200);const bytes=Buffer.from(await response.arrayBuffer());assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256);verified++;}}));
await withBrowserJob('mio-lunch-showcase',async browser=>{
 const context=await browser.newContext({viewport:{width:1366,height:860},serviceWorkers:'block'}),requests=[],blocked=[],errors=[],decoded=[];
 await context.route('**/*',route=>{const u=route.request().url();requests.push(u);if(blockedSource(u,true)){blocked.push(u);return route.abort('blockedbyclient');}return route.continue();});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+`bible/#showcase/${id}`);
  await page.waitForFunction(()=>globalThis.document.body.dataset.ready==='1');
  assert.ok((await page.locator('#main').innerText()).includes(entry.title));
  for(const width of [1366,390]){await page.setViewportSize({width,height:width===390?844:860});await page.waitForTimeout(400);await page.evaluate(async()=>{await Promise.all([...globalThis.document.images].filter(img=>{const r=img.getBoundingClientRect();return r.top<globalThis.innerHeight&&r.bottom>0&&r.width>0;}).map(img=>img.decode()));});await page.screenshot({path:`${out}/entry-${width}.png`});}
  const imagePage=await context.newPage();
  await imagePage.goto(base+`showcase/${id}/entry.json`);
  for(const im of entry.sections[0].images){
   const width=im.id.includes('390')?390:1366;await imagePage.setViewportSize({width,height:width===390?844:860});
   await imagePage.evaluate(()=>globalThis.document.body.replaceChildren());
   const size=await imagePage.evaluate(async url=>{const img=new globalThis.Image();img.src=url;await img.decode();globalThis.document.body.append(img);return [img.naturalWidth,img.naturalHeight];},base+im.image);
   assert.equal(size[0],width);assert.equal(size[1],width===390?844:860);decoded.push({id:im.id,size});
  }
  assert.equal(decoded.length,entry.sections[0].images.length);assert.deepEqual(blocked,[]);assert.deepEqual(errors,[]);
  fs.writeFileSync(`${out}/report.json`,JSON.stringify({base,verified,uniqueIds:ids.length,decoded,blocked,errors,requests},null,2));
  console.log(`PASS own Showcase: ${verified} URL/SHA checks, ${ids.length} unique IDs, ${decoded.length} decoded final frames, no private requests`);
 }finally{fs.writeFileSync(`${out}/requests.json`,JSON.stringify({blocked,errors,requests,decoded},null,2));await context.close();}
},{timeoutMs:180000,gpuWaitMs:120000});
