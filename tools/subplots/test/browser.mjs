import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {withBrowserJob} from '../../lib/browser-job.mjs';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'subplot-browser-'));
fs.mkdirSync(path.join(root,'game3d/story'),{recursive:true});
fs.writeFileSync(path.join(root,'game3d/story/office.js'),`export default {on:{'talk:colleague':{if:'office_open',node:'welcome'}},nodes:{welcome:[{say:'colleague',text:'The meeting starts in ten minutes.'},{say:'eric',text:'Which room are we using?'},{choice:[{text:'Ask about the room',go:'room'},{text:'Come back later',go:'later'}]}],room:['colleague: The room beside reception.'],later:['eric: See you there.']}};`);
const server=spawn('python3',['tools/review_server.py','8796'],{env:{...process.env,SUBPLOTS_ROOT:root,SUBPLOTS_STATE:path.join(root,'state'),SUBPLOTS_PUBLIC_ONLY:'1'},stdio:'ignore'});
const base='http://127.0.0.1:8796';
try{
 for(let i=0;i<60;i++){try{if((await fetch(base+'/api/subplots/catalog')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 await withBrowserJob('codex-subplot-editor',async browser=>{
  for(const width of [1366,390]){
   const page=await browser.newPage({viewport:{width,height:width===390?844:900}}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/tools/subplots/web/');
   await page.locator('[data-id$="#welcome"]').click();
   await page.locator('[data-field=text]').first().fill('The meeting starts at nine.');
   await page.locator('#notes').fill('Check the office staging.');
   await page.locator('#draft').click();await page.getByRole('status').filter({hasText:'Draft saved.'}).waitFor();
   assert.ok(fs.readFileSync(path.join(root,'game3d/story/office.js'),'utf8').includes('ten minutes'));
   await page.locator('#save').click();await page.getByRole('status').filter({hasText:'Saved to the story'}).waitFor();
   assert.ok(fs.readFileSync(path.join(root,'game3d/story/office.js'),'utf8').includes('at nine'));
   await page.locator('#preview').click();await page.locator('#previewDialog').waitFor({state:'visible'});
   assert.match(await page.locator('#previewBody').innerText(),/at nine/);await page.locator('#closePreview').click();
   await page.locator('[data-view=history]').click();assert.ok(await page.locator('.revision').count());
   await page.locator('[data-view=sequence]').click();
   assert.equal(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth>globalThis.innerWidth),false);
   assert.deepEqual(errors,[]);
   fs.mkdirSync('/tmp/codex-subplot-shots',{recursive:true});await page.screenshot({path:`/tmp/codex-subplot-shots/${width}.png`,fullPage:true});
   // Reset source for the second viewport's draft assertion.
   if(width===1366){const file=path.join(root,'game3d/story/office.js');fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('at nine','in ten minutes'));}
   await page.close();console.log(`PASS ${width}: edit, draft, source save, preview, history, no overflow/errors`);
  }
 },{timeoutMs:120000,gpuWaitMs:60000});
}finally{server.kill('SIGTERM');fs.rmSync(root,{recursive:true,force:true});}
