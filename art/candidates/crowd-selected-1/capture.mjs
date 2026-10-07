import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {scopedRoute} from '../../../tools/bible/check-scope.mjs';
import {withBrowserJob} from '../../../tools/lib/browser-job.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const base='http://127.0.0.1:8771/'+path.relative('/home/jorgen/repo/japanese',root)+'/';
const out=process.argv[2]||path.join(root,'art/parts/crowd-selected-1/captures');fs.mkdirSync(out,{recursive:true});
await withBrowserJob('crowd-selected-face-capture',async browser=>{
 const page=await browser.newPage({viewport:{width:1500,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',scopedRoute({publicOnly:true,onFailure:e=>errors.push(e)}));
 await page.addInitScript(()=>localStorage.setItem('settings',JSON.stringify({privateMode:false})));
 await page.goto(base+'reviews/crowd-pilot-5/viewer.html?s=selected');
 await page.waitForFunction(()=>window.__viewer?.ready);
 const call=(f,...a)=>page.evaluate(([f,a])=>window.__viewer[f](...a),[f,a]);
 await call('freeze',true);await call('setMotion','idle');await call('advance',60);
 for(const key of ['a-selected','b-selected']) for(const [name,yaw]of[['front',0],['left',-.6],['right',.6]]){
  await call('closeOn',key,'face',yaw);await page.waitForTimeout(100);
  await page.locator('#c').screenshot({path:`${out}/${key}-${name}.png`});
 }
 await call('setMotion','sit');await call('advance',60);
 for(const key of ['a-selected','b-selected'])for(const[name,yaw]of[['front',0],['side',1.57]]){
  await call('closeOn',key,'body',yaw);await page.waitForTimeout(100);await page.locator('#c').screenshot({path:`${out}/${key}-sit-${name}.png`});
 }
 await call('show','selected-cast');await call('setMotion','idle');await call('advance',60);
 for(const key of ['kenji','kuro','aoi','emi'])for(const[name,yaw]of[['front',0],['left',-.6],['right',.6]]){
  await call('closeOn',key,'face',yaw);await page.waitForTimeout(100);await page.locator('#c').screenshot({path:`${out}/${key}-${name}.png`});
 }
 if(errors.length)throw Error(errors.join('\n'));
 console.log('PASS18 actual textured-model front/angle captures');
},{timeoutMs:240000});
