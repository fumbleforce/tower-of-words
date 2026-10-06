import assert from 'node:assert/strict';
import {withBrowserJob} from '../../../tools/lib/browser-job.mjs';
import {scopedRoute} from '../../../tools/bible/check-scope.mjs';
const base=process.env.BASE_URL||'http://127.0.0.1:8771/';
await withBrowserJob('karaoke-song-review',async browser=>{
 for(const width of [1366,390]){
  const context=await browser.newContext({viewport:{width,height:860}}),page=await context.newPage(),errors=[];
  await context.route('**/*',scopedRoute({publicOnly:true,onFailure:e=>errors.push(e)}));
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(new URL('reviews/karaoke-song-1/details.html',base).href);
  await page.waitForFunction(()=>[...document.querySelectorAll('audio')].every(a=>a.readyState>=1));
  const sizes=await page.evaluate(()=>({body:document.documentElement.scrollWidth,view:innerWidth,durations:[...document.querySelectorAll('audio')].map(a=>a.duration)}));
  assert(sizes.body<=width,JSON.stringify(sizes));assert(Math.abs(sizes.durations[0]-52.44)<.1);assert(Math.abs(sizes.durations[1]-54.2)<.1);
  for(let i=0;i<2;i++){
   await page.locator('audio').nth(i).evaluate(a=>{a.muted=true;return a.play();});
   await page.waitForFunction(i=>document.querySelectorAll('audio')[i].currentTime>.5,i);
   await page.locator('audio').nth(i).evaluate(a=>a.pause());
  }
  assert.deepEqual(errors,[]);await context.close();console.log(width,'audio metadata/playback/layout PASS');
 }
},{timeoutMs:60000});
