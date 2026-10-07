// Native user activation -> actual authored say node -> Runner -> audio. No synthetic media.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { openGame } from '../test/support/open-game.mjs';
import { blockedSource } from '../../tools/bible/check-scope.mjs';
const targets = new Set(['bun-ohayo','guard-greeting-ohayo','commuter-ohayo','kuro-otsukare','guard-dozo','guard-konnichiwa','aoi-konbanwa']);
const entries = new Map();
function find(value) {
  if (!value || typeof value !== 'object') return;
  if (value.say && targets.has(value.voice)) entries.set(value.voice, value);
  for (const item of Object.values(value)) if (typeof item === 'object') find(item);
}
for (const file of ['train','gate','forecourt','day2/gate','day3/gate','day3/east_coast']) find((await import(`../story/${file}.js`)).default);
assert.equal(entries.size, 7);
const base = process.env.BASE || 'game3d', out = new URL('../shots/greeting-voices/', import.meta.url).pathname;
fs.mkdirSync(out,{recursive:true});
await withBrowserJob('greeting-runtime-audio', async browser => {
 for (const [width,height,mc] of [[1366,860,'eric'],[390,844,'carina']]) {
  const forbidden=[];
  const opened=await openGame(browser,{ mode:'play',viewport:{width,height},touch:width===390,
   initialOnboarding:{moved:true,talked:true,uses:1,sayUsed:true},
   url:`http://127.0.0.1:8771/${base}/index.html?mc=${mc}&q=0`,
   beforeNavigate: async page => {
    await page.route('**/*',route=>{if(blockedSource(route.request().url(),true)){forbidden.push(route.request().url());return route.abort();}return route.continue();});
    await page.addInitScript(()=>{
     globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({v:2,privateMode:false,voiceOn:true,textSpeed:'instant',music:0,ambience:0,master:0.7,voice:0.8}));
     globalThis.__greetingMedia=[];
     const play=globalThis.HTMLMediaElement.prototype.play;
     globalThis.HTMLMediaElement.prototype.play=function(...args){
      if(this.src.includes('/audio/')) {
       const record={src:this.src,playing:false,ended:false,duration:null,time:0,error:null};
       globalThis.__greetingMedia.push(record);
       this.addEventListener('playing',()=>{record.playing=true;record.duration=this.duration;},{once:true});
       this.addEventListener('timeupdate',()=>record.time=this.currentTime);
       this.addEventListener('ended',()=>{record.ended=true;record.time=this.currentTime;},{once:true});
       this.addEventListener('error',()=>record.error=this.error?.message,{once:true});
      }
      return play.apply(this,args);
     };
    });
   }
  });
  try {
   const {page}=opened;
   await opened.waitForSettled();
   await page.evaluate(async ({base,lines})=>{
    const {Runner}=await import(`/${base}/js/runner.js`),g=globalThis.__game;
    const runner=new Runner(g);runner.use(g.place,{nodes:Object.fromEntries(lines.map(s=>[s.voice,[s]]))});
    const button=globalThis.document.createElement('button');button.id='check-greeting';button.textContent='Play greeting';
    Object.assign(button.style,{position:'fixed',left:'8px',top:'110px',zIndex:10000});globalThis.document.body.append(button);
    button.addEventListener('click',event=>{
     event.stopPropagation();globalThis.__greetingDone=false;
     runner.run(button.dataset.key).then(()=>globalThis.__greetingDone=true).catch(error=>globalThis.__greetingError=error.message);
    });
   },{base,lines:[...entries.values()]});
   const records=[];
   for(const [key,line] of entries) {
    const before=await page.evaluate(key=>{globalThis.document.querySelector('#check-greeting').dataset.key=key;return globalThis.__greetingMedia.length;},key);
    await page.locator('#check-greeting').click();
    await page.waitForFunction(({before,key})=>globalThis.__greetingMedia.slice(before).some(a=>a.src.endsWith('/'+key+'.mp3')&&a.playing&&a.ended),{before,key},{timeout:15000});
    const record=await page.evaluate(before=>({media:globalThis.__greetingMedia.slice(before),shown:globalThis.__game.ui._cur?.voiceKey,error:globalThis.__greetingError}),before);
    assert.equal(record.media.length,1,key);const media=record.media[0];
    assert.equal(record.shown,key);assert.ok(media.duration>0.15&&media.time>0.15&&!media.error,JSON.stringify(record));
    assert.equal(record.error,undefined);
    records.push({key,speaker:line.say,...record});
    await page.locator('#talkHit').click();
    await page.waitForFunction(()=>globalThis.__greetingDone===true,null,{timeout:3000});
   }
   await page.screenshot({path:`${out}/${width}-complete.png`});
   assert.deepEqual(opened.errors,[]);assert.deepEqual(forbidden,[]);
   fs.writeFileSync(`${out}/${width}-playback.json`,JSON.stringify({records,forbidden,errors:opened.errors},null,2));
   console.log(`PASS ${width}: 7 authored explicit keys, native activation, decoded media advance/end and native dialogue advance`);
  } finally {await opened.close();}
 }
},{timeoutMs:285000});
