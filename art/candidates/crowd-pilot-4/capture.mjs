import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {withBrowserJob} from '../../../tools/lib/browser-job.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const base='http://127.0.0.1:8771/'+path.relative('/home/jorgen/repo/japanese',root)+'/';
const out=process.argv[2]||path.join(root,'art/parts/crowd-pilot-4/captures');fs.mkdirSync(out,{recursive:true});
await withBrowserJob('crowd4-face-capture',async browser=>{
 const page=await browser.newPage({viewport:{width:1500,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'reviews/crowd-pilot-4/viewer.html?s=alternatives');
 await page.waitForFunction(()=>window.__viewer?.ready);
 const call=(f,...a)=>page.evaluate(([f,a])=>window.__viewer[f](...a),[f,a]);
 await call('freeze',true);await call('setMotion','idle');await call('advance',60);
 for(const key of ['a-calm','a-open','b-calm','b-open']) for(const [name,yaw]of[['front',0],['left',-.6],['right',.6]]){
  await call('closeOn',key,'face',yaw);await page.waitForTimeout(100);
  await page.locator('#c').screenshot({path:`${out}/${key}-${name}.png`});
 }
 await call('show','cast');await call('setMotion','idle');await call('advance',60);
 for(const key of ['kenji','kuro','aoi','emi'])for(const[name,yaw]of[['front',0],['left',-.6],['right',.6]]){
  await call('closeOn',key,'face',yaw);await page.waitForTimeout(100);await page.locator('#c').screenshot({path:`${out}/${key}-${name}.png`});
 }
 if(errors.length)throw Error(errors.join('\n'));
 console.log('PASS24 actual textured-model front/angle captures');
},{timeoutMs:240000});
