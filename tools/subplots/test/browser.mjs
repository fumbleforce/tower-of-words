import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {withBrowserJob} from '../../lib/browser-job.mjs';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'subplot-browser-'));
fs.mkdirSync(path.join(root,'game3d/story'),{recursive:true});
const file=path.join(root,'game3d/story/office.js');
const original=`export default {on:{'talk:colleague':{if:'day >= 2 && (office_open || !met_colleague)',node:'welcome'}},nodes:{welcome:[{say:'colleague',text:'The meeting starts in ten minutes.'},{say:'eric',text:'Which room are we using?'},{set:{meeting_seen:1,day:2}},{choice:[{text:'Ask about the room',go:'room'},{text:'Come back later',go:'later'}]}],room:['colleague: The room beside reception.'],later:['eric: See you there.']}};`;
fs.writeFileSync(file,original);
const server=spawn('python3',['tools/review_server.py','8796'],{env:{...process.env,SUBPLOTS_ROOT:root,SUBPLOTS_STATE:path.join(root,'state'),SUBPLOTS_PUBLIC_ONLY:'1'},stdio:'ignore'});
const base='http://127.0.0.1:8796';
const authoring={characters:[{id:'colleague',name:'Mio',portrait:'/fixture-portrait.webp'},{id:'eric',name:'Eric'}],places:[{id:'office',name:'Office'},{id:'station',name:'Station'}],variables:[{id:'day',label:'Story day',type:'number'},{id:'office_open',label:'Office is open',type:'boolean'},{id:'met_colleague',label:'Met Mio',type:'boolean'},{id:'meeting_seen',label:'Attended the meeting',type:'number'}],events:[{id:'talk:colleague',label:'Talk to Mio'}],deliveries:[{id:'warm',label:'Warm'},{id:'curious',label:'Curious'}]};
const presets={character:[{id:'colleague',v:1,data:{name:'Mio',portrait:'game3d/assets/portraits/mio-neutral.webp',outfit:'a blouse',gender:'female',rating_cap:'safe'}}],scene:[{id:'meeting',v:1,data:{name:'At the office',text:'Two colleagues preparing for a meeting.'}}],style:[{id:'paint',v:1,data:{name:'Painted',quality:'detailed illustration'}}],model:[{id:'local',v:1,data:{name:'Local model',file:'fixture.safetensors'}}],framing:[{id:'wide',v:1,data:{name:'Wide',w:1152,h:896}}],camera:[{id:'window',v:1,data:{name:'Window light',prompt:'soft window light'}}],negative:[]};
const scene={id:'local:fixture:office:start',provider:'local',recipe:true,title:'Office arrival',node:'start',group:'Encounters',revision:'fixture-1',metadata:{},entries:[],routesEditable:false,placement:{place:'office',day:2,condition:'office_open'},history:[],images:[{id:'image:0',label:'internal-key',url:'/fixture-scene.png',available:true},{id:'image:1',label:'missing-key',url:'/not-available.png',available:false}],steps:[{shot:{width:.24,at:.48,focus:'55% 42%',push:.06,fade:1400,cue:'Footsteps outside the meeting room'},$staging:{},$recipe:"...gap('t01', { w: GW })",imageSlot:'image:0',imageUrl:'/fixture-scene.png'},{say:'colleague',text:'The room is ready.',en:'The room is ready.',ja:'部屋の準備ができました。',emo:'warm',$recipe:"duo(s('colleague','部屋の準備ができました。'),'The room is ready.')"},{shot:{},imageSlot:'image:1',imageUrl:'/not-available.png',$recipe:"pic('missing')"},{action:'go',destination:'finish'}]};
try{
 for(let i=0;i<60;i++){try{if((await fetch(base+'/api/subplots/catalog')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 await withBrowserJob('codex-human-editor',async browser=>{
  for(const width of [2560,1366,390]){
   fs.writeFileSync(file,original);
   const page=await browser.newPage({viewport:{width,height:width===390?844:width===2560?1440:900}}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/island/private/**',route=>route.abort());
   await page.route('**/api/subplots/authoring',route=>route.fulfill({json:authoring}));
   await page.route('**/fixture-scene.png',route=>route.fulfill({path:'/home/jorgen/repo/japanese/game3d/shots/office-south-final/return-desk.png'}));
   await page.route('**/fixture-portrait.webp',route=>route.fulfill({path:'/home/jorgen/repo/japanese/game3d/assets/portraits/mio-neutral.webp'}));
   await page.goto(base+'/tools/subplots/web/');
   if(width===390)await page.locator('#scenePicker').selectOption('public:game3d/story/office.js#welcome');else await page.locator('[data-id$="#welcome"]').click();
   await page.locator('[data-field=en]').first().fill('The meeting starts at nine.');
   await page.locator('[data-field=ja]').first().fill('会議は九時からです。');
   await page.locator('[data-field=emo]').first().selectOption('warm');
   await page.locator('#draft').click();await page.getByRole('status').filter({hasText:'Draft saved.'}).waitFor();
   assert.match(fs.readFileSync(file,'utf8'),/ten minutes/);
   await page.route('**/api/subplots/save',async route=>{await new Promise(r=>setTimeout(r,350));await route.continue();});
   await page.locator('#save').click();assert.equal(await page.locator('.workspace').evaluate(el=>el.inert),true);
   await page.getByRole('status').filter({hasText:'Saved to the story'}).waitFor();await page.unroute('**/api/subplots/save');
   assert.match(fs.readFileSync(file,'utf8'),/at nine/);assert.match(fs.readFileSync(file,'utf8'),/"meeting_seen": 1/);
   assert.equal(await page.locator('[data-field=ja]').first().inputValue(),'会議は九時からです。');
   assert.equal(await page.locator('#rawSource').count(),0);
   assert.equal(await page.locator('#entries input:not([type=checkbox]):not([type=number])').count(),0);
   await page.locator('#preview').click();assert.match(await page.locator('#previewBody').innerText(),/at nine/);await page.locator('#nextBeat').click();await page.locator('#nextBeat').click();await page.locator('#nextBeat').click();await page.getByRole('button',{name:'Ask about the room',exact:true}).click();await page.getByText('colleague: The room beside reception.',{exact:true}).waitFor();await page.locator('#closePreview').click();
   await page.locator('[data-view=history]').click();assert.ok(await page.locator('.revision').count());await page.locator('[data-view=sequence]').click();
   let saved=null,generation=null;
   await page.route('**/api/subplots/catalog?scope=local',r=>r.fulfill({json:{scenes:[{...scene,count:4},{...scene,id:'local:fixture:office:finish',node:'finish',title:'End of the meeting',count:1},{...scene,id:'local:fixture:other:secret',node:'secret',title:'Other scene',count:1}]}}));
   await page.route('**/api/subplots/read?id=local*',r=>r.fulfill({json:scene}));
   await page.route('**/api/subplots/save',r=>{saved=r.request().postDataJSON();const response={...scene,...structuredClone(saved),revision:'fixture-2'};for(const image of Object.values(response.metadata.images||{}))image.applied=true;return r.fulfill({json:response});});
   await page.route('**/api/subplots/image/**',async route=>{
    const u=new URL(route.request().url());let response={};
    if(u.pathname.endsWith('/presets'))response=presets;
    else if(u.pathname.endsWith('/jobs'))response=[];
    else if(u.pathname.endsWith('/history'))response=[{at:'2026-10-10T10:00:00',characters:['colleague'],renders:[{id:'old-render',file:'existing.png',thumb:'existing.png',positive:'office illustration',seed:12}]}];
    else if(u.pathname.endsWith('/generate')){generation=route.request().postDataJSON();response={run_id:'fixture',jobs:[]};}
    else if(u.pathname.includes('/repo/')){await route.fulfill({path:'/home/jorgen/repo/japanese/game3d/assets/portraits/mio-neutral.webp'});return;}
    else if(u.pathname.includes('/thumb/')||u.pathname.includes('/out/')){await route.fulfill({path:'/home/jorgen/repo/japanese/game3d/shots/office-south-final/return-desk.png'});return;}
    await route.fulfill({json:response});
   });
   await page.locator('[data-scope=local]').click();if(width===390)await page.locator('#scenePicker').selectOption(scene.id);else await page.locator(`[data-id="${scene.id}"]`).click();
   await page.waitForFunction(()=>{const img=globalThis.document.querySelector('.shot-picture img');return img?.complete&&img.naturalWidth>0;});
   assert.equal(await page.locator('.missing-picture').count(),1);
   assert.doesNotMatch(await page.locator('#sequence').innerText(),/\$expression|gap\(|internal-key|missing-key/);
   assert.equal(await page.locator('#sequence select option[value=secret]').count(),0);
   await page.locator('[data-field=en]').first().fill('The meeting room is ready.');await page.locator('[data-field=ja]').first().fill('会議室の準備ができました。');
   await page.locator('.shot-controls summary').first().click();await page.getByLabel('Fade in · seconds').first().fill('1.8');await page.getByLabel('Fade in · seconds').first().press('Tab');
   await page.locator('#save').click();await page.getByRole('status').filter({hasText:'Saved to the story'}).waitFor();
   assert.equal(saved.steps[0].shot.fade,1800);assert.equal(saved.steps[1].en,'The meeting room is ready.');assert.equal(saved.steps[1].ja,'会議室の準備ができました。');
   fs.mkdirSync('/tmp/codex-human-editor-shots',{recursive:true});await page.evaluate(()=>globalThis.scrollTo(0,0));await page.screenshot({path:`/tmp/codex-human-editor-shots/storyboard-${width}.png`,fullPage:true});
   await page.locator('.gallery-shot').first().click();await page.locator('[data-char=colleague]').click();
   await page.locator('[data-compose=pose]').selectOption('Seated');await page.locator('[data-compose=environment]').selectOption('Office interior');await page.locator('[data-compose=angle]').selectOption('High angle');
   await page.locator('#generate').click();await page.getByRole('status').filter({hasText:'Picture queued'}).waitFor();
   assert.match(generation.positive,/Seated/);assert.match(generation.positive,/High angle/);assert.match(generation.positive,/Office interior/);
   await page.locator('[data-library=all]').click();await page.locator('[data-use]').first().click();
   await page.locator('#save').click();await page.getByRole('status').filter({hasText:'Saved to the story'}).waitFor();assert.equal(saved.metadata.images['image:0'].file,'existing.png');
   assert.equal(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth>globalThis.innerWidth),false);assert.deepEqual(errors,[]);
   await page.evaluate(()=>globalThis.scrollTo(0,0));await page.screenshot({path:`/tmp/codex-human-editor-shots/images-${width}.png`,fullPage:true});if(width===390){await page.locator('.mobile-tools [data-panel=story]').click();assert.equal(await page.locator('#sequence').isVisible(),true);await page.keyboard.press('Tab');}
   if(width!==390)await page.locator('#backToStory').click();
   await page.locator('#addShot').click();await page.locator('#shotOptions button').first().click();
   assert.equal(await page.locator('#sequence > .beat').count(),5);
   await page.locator('#save').click();await page.getByRole('status').filter({hasText:'Saved to the story'}).waitFor();assert.equal(saved.steps.length,5);assert.equal(saved.steps[4].imageSlot,undefined);
   await page.close();
   console.log(`PASS ${width}: bilingual edit/save/reload, conditions, actual images, missing image, framing, scoped destinations, image history and composition, no code shown`);
  }
 },{timeoutMs:150000,gpuWaitMs:60000});
}finally{server.kill('SIGTERM');fs.rmSync(root,{recursive:true,force:true});}
