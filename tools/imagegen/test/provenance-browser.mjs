// Fully intercepted public fixtures. No live services, presets, scenes, user files or generator are accessed.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {withBrowserJob} from '../../lib/browser-job.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const out=process.env.ARTIFACTS||'/tmp/amakawa-provenance-599';
await fs.mkdir(out,{recursive:true});
const id='public:game3d/story/fixture.js#start',slot='file:fixture/station.webp';
const ref={path:'/fixture/reference.png',sha256:'a'.repeat(64),width:640,height:400,file:'references/fixture/ref.png'};
const external={id:'external-fixture',n:2,run_id:'external-fixture',idx:1,status:'done',at:'2026-10-15T20:30:00Z',rating:'safe',
 imported_at:'2026-10-15T20:32:00Z',file:'fixture/banner.png',thumb:'fixture/banner.webp',source:'agent',owner:'Fixture artist',round:'Public provenance fixture',positive:'A quiet station entrance with a blue sign.',negative:'',seed:null,model_file:null,steps:null,cfg:null,sampler:null,scheduler:null,w:1152,h:896,
 compose:{subplotId:id,imageSlot:slot},provenance:{schema:1,kind:'external',engine:'image_gen.imagegen',import_id:'fixture-output',replay:false,
 generated_at:'2026-10-15T20:30:00Z',timestamp_source:'source_file_mtime',requested:{prompt:'A quiet station entrance with a blue sign.',transparent_background:false,referenced_image_paths:['/fixture/reference.png']},
 observed:{provider_output:'fixture-output.png'},unavailable:['model_version','seed','steps','cfg','sampler','scheduler','negative'],output:{path:'/fixture/original.png',sha256:'b'.repeat(64),width:1152,height:896},references:[ref]}};
const local={id:'local-fixture',n:1,run_id:'local-fixture',status:'done',at:'2026-10-15T20:29:00Z',rating:'safe',file:'fixture/local.png',thumb:'fixture/local.webp',seed:41,model_file:'fixture.safetensors',positive:'Exact saved words from preset version three.',negative:'Exact saved exclusions.',w:1152,h:896,steps:27,cfg:0,sampler:'dpmpp_2m',scheduler:'karras',
 presets:{style:{id:'paint',v:3}},compose:{subplotId:id,imageSlot:slot,style:'paint',scene:'A different block text',characters:[],blockOverrides:{style:{paint:{quality:'local quality'}}}},ipa:{ref:'fixture/ref.png',strength:0.35,cutout:false},start:{image:'fixture/start.png',denoise:0.6},loras:[{file:'fixture-lora.safetensors',weight:0.4}],control:{file:'fixture-guide.safetensors',strength:0.5},huefix:[]};
const rows=[local,external];
const scene={id,node:'start',title:'Station image settings',group:'Fixture',where:'game3d/story/fixture.js',audience:'public',recipe:true,capabilities:{picture:'pic'},revision:'fixture',entries:[],metadata:{images:{[slot]:{id:external.id,applied:true}}},history:[],images:[{id:slot,file:'fixture/station.webp',url:'/fixture/live.svg',available:true}],steps:[{narration:'The station doors close.'},{shot:{},imageSlot:slot,imageUrl:'/fixture/live.svg'}]};
const presets={character:[],outfit:[],style:[{id:'paint',v:4,data:{name:'Painted',quality:'Changed current preset words'}}],model:[{id:'local',data:{name:'Local fixture',file:'fixture.safetensors',steps:30,cfg:5}}],framing:[{id:'wide',data:{name:'Wide',w:1152,h:896}}],camera:[],negative:[],location:[],pose:[],light:[],scene:[]};
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1152" height="896"><rect width="1152" height="896" fill="#18384d"/><rect x="180" y="110" width="792" height="610" rx="18" fill="#678fa5"/><rect x="270" y="190" width="250" height="470" fill="#203f55"/><rect x="630" y="190" width="250" height="470" fill="#203f55"/><path d="M0 780h1152" stroke="#b8d4de" stroke-width="10"/><text x="40" y="850" font-family="sans-serif" font-size="38" fill="white">Public settings fixture</text></svg>';
const report={errors:[],unexpected:[],writes:[],views:[],contrast:[]};
const luminance=c=>c.map(n=>{n/=255;return n<=0.04045?n/12.92:((n+0.055)/1.055)**2.4;}).reduce((sum,n,i)=>sum+n*[0.2126,0.7152,0.0722][i],0);
async function checkContrast(locator,label){
 const colors=await locator.first().evaluate(el=>{const fg=globalThis.getComputedStyle(el).color;let parent=el,bg='';while(parent){bg=globalThis.getComputedStyle(parent).backgroundColor;if(bg!=='rgba(0, 0, 0, 0)')break;parent=parent.parentElement;}return {fg,bg};});
 const fg=luminance(colors.fg.match(/[\d.]+/g).slice(0,3).map(Number)),bg=luminance(colors.bg.match(/[\d.]+/g).slice(0,3).map(Number));
 const ratio=(Math.max(fg,bg)+0.05)/(Math.min(fg,bg)+0.05);report.contrast.push({label,...colors,ratio});assert.ok(ratio>=4.5,label+' contrast '+ratio);
}
await withBrowserJob('imagegen-settings-599',async browser=>{
 for(const host of ['studio','scene']) for(const [device,viewport] of [['phone',{width:390,height:844}],['desktop',{width:1366,height:860}]]){
  const context=await browser.newContext({viewport,serviceWorkers:'block'});let closing=false;
  await context.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url()),p=u.pathname;
   if(closing)return route.abort();
   if(p.includes('/island/private/')||p.includes('/api/nav-private')||p.endsWith('.user.json')){report.unexpected.push(p);return route.abort();}
   if(p.endsWith('/tools/nav/nav.js'))return route.fulfill({contentType:'text/javascript',body:''});
   if(p.startsWith('/fixture/')||/\/(out|thumb|agentsrc)\//.test(p))return route.fulfill({contentType:'image/svg+xml',body:svg});
   if(p.startsWith('/api/')){
    const a=p.replace(/^\/api\/subplots\/image\/api\//,'').replace(/^\/api\/subplots\//,'').replace(/^\/api\//,'');
    if(req.method()!=='GET'){report.writes.push({host,device,path:p,body:req.postDataJSON()});return route.fulfill({json:{ok:true}});}
    let json;
    if(a==='mode')json={private:false};else if(a==='state')json={session:{state:'off'},queued:0,running:0};
    else if(a==='presets')json=presets;else if(a==='models/files')json=['fixture.safetensors'];else if(['loras','controls','portraits','trash'].includes(a))json=[];
    else if(a==='jobs')json=rows;else if(a==='history')json=rows.map(j=>({...j,renders:[j]}));
    else if(a==='catalog')json={scenes:[scene]};else if(a==='read')json=scene;else if(a==='map')json={nodes:[]};else if(a==='status')json={status:{}};
    else if(a==='authoring')json={characters:[],places:[],variables:[],events:[],words:[],plugins:[]};else if(a==='pictures')json={runs:rows.map(j=>({...j,renders:[j]}))};
    else if(a==='picture-source')json={job:external,how:'fixture record'};else if(a==='comments')json={comments:[]};else{report.unexpected.push(p);return route.abort();}
    return route.fulfill({json});
   }
   let file=p==='/'?'tools/imagegen/web/index.html':p.startsWith('/web/')?'tools/imagegen'+p:p.endsWith('/tools/subplots/web/')?'tools/subplots/web/index.html':p.slice(1);
   if(!/^(tools\/(imagegen|subplots)\/web\/|game3d\/fonts\/)/.test(file)||file.includes('..')){report.unexpected.push(p);return route.abort();}
   try{return route.fulfill({contentType:{'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2'}[path.extname(file)],body:await fs.readFile(path.join(root,file))});}catch{report.unexpected.push(p);return route.abort();}
  });
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  try{
   await page.goto(host==='studio'?'http://fixture.test/':'http://fixture.test/tools/subplots/web/?scene='+encodeURIComponent(id));
   if(host==='scene'){
    await page.waitForFunction(expected=>import('/tools/subplots/web/store.js').then(({S})=>S.scene?.id===expected),id);
    await page.locator('#timeline .pic .change').click();await page.locator('#tabPicture [data-compose]').click();
   }
   await page.locator('#renders .render-card').first().waitFor();
   if(host==='scene'){
    await page.locator('.image-original').waitFor();
    assert.equal(await page.locator('#generate').isDisabled(),true);
    if(await page.locator('#quickGenerate').count())assert.equal(await page.locator('#quickGenerate').isDisabled(),true);
    await page.locator('.image-original').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(out,`${host}-${device}-external-source.png`)});
    await page.locator('.external-source-notice').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(out,`${host}-${device}-external-explanation.png`)});
   }
   const externalCard=page.locator('#renders .render-card').filter({has:page.locator('img[src*="banner"]')});
   await externalCard.locator('[data-lib=open]').first().click();
   await page.locator('#libLightbox .pic img').evaluate(img=>img.decode());
   const lb=page.locator('#libLightbox');
   assert.match(await lb.innerText(),/image_gen.imagegen/);
   await checkContrast(lb.locator('.generation-provenance .hint'),host+' '+device+' provider note');
   assert.match(await lb.innerText(),/transparent_background/);
   assert.equal(await lb.locator('[data-a=sameseed]:enabled,[data-a=newseeds]:enabled,[data-a=copyseed]:enabled').count(),0);
   assert.equal(await lb.evaluate(el=>el.scrollWidth<=el.clientWidth),true);
   const physical=await lb.locator('.side').evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:globalThis.innerWidth};});
   assert.ok(physical.left>=0&&physical.right<=viewport.width+1,JSON.stringify(physical));
   for(const button of await lb.locator('[data-close],[data-a=star],[data-lb]').all()){
    const b=await button.boundingBox();assert.ok(b.x>=0&&b.x+b.width<=viewport.width+1,'lightbox controls fit physical viewport');
   }
   assert.equal(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth<=globalThis.innerWidth),true);
   await page.screenshot({path:path.join(out,`${host}-${device}-external.png`)});
   const settings=lb.locator('.side');
   for(const target of await lb.locator('[data-close],[data-a=star],#lbReason,#lbNote,[data-a=scene],[data-a=character]').all()){
    await target.scrollIntoViewIfNeeded();
    const b=await target.boundingBox();assert.ok(b.x>=0&&b.x+b.width<=viewport.width+1&&b.y>=0&&b.y+b.height<=viewport.height+1,'settings/action reachable within viewport');
   }
   await settings.evaluate(el=>{el.scrollTop=el.scrollHeight;});
   await page.screenshot({path:path.join(out,`${host}-${device}-external-settings.png`)});
   await lb.locator('[data-close]').click();
   if(host==='scene'){
    await page.locator('[data-new-local-generation]').click();
    assert.equal(await page.locator('#generate').isDisabled(),false);
    assert.match(await page.locator('.image-original').innerText(),/OpenAI image generator/);
   }
   const localCard=page.locator('#renders .render-card').filter({has:page.locator('img[src*="local."]')});
   await localCard.locator('[data-lib=open]').click();
   await lb.locator('.pic img').evaluate(img=>img.decode());
   assert.match(await lb.innerText(),/dpmpp_2m[\s\S]*karras/);
   assert.match(await lb.innerText(),/Prompt strength \(CFG\)[\s\S]*0/);
   await page.screenshot({path:path.join(out,`${host}-${device}-local.png`)});
   await lb.locator('[data-a=sameseed]').click();
   if(host==='studio'&&device==='phone'&&!await page.locator('.studio-controls').evaluate(e=>e.open))await page.locator('.studio-controls-toggle').click();
   await page.locator('[data-original-open]').waitFor();
   await page.locator('[data-original-open] > summary').click();
   const originalPositive=page.locator(host==='studio'?'[data-recorded-prompt=positive]':'[data-original=positive]');
   const originalNegative=page.locator(host==='studio'?'[data-recorded-prompt=negative]':'[data-original=negative]');
   assert.equal(await originalPositive.inputValue(),local.positive);
   assert.equal(await originalNegative.inputValue(),local.negative);
   if(host==='studio'){
    assert.equal(await originalPositive.getAttribute('readonly'),'');
    await page.locator('#posOut').fill('An edited current prompt.');
    await page.locator('#negOut').fill('An edited current exclusion.');
    assert.equal(await originalPositive.inputValue(),local.positive);
    assert.equal(await originalNegative.inputValue(),local.negative);
    await page.locator('[data-use-original]').click();
    assert.equal(await page.locator('#posOut').inputValue(),local.positive);
    assert.equal(await page.locator('#negOut').inputValue(),local.negative);
   }
   assert.match(await page.locator('.image-settings .settings-peek').innerText(),/CFG 0/);
   await checkContrast(page.locator('.image-original .hint'),host+' '+device+' original metadata');
   const empty=page.locator('.image-cast > .hint');if(await empty.count()){const b=await empty.boundingBox();assert.ok(b.width>200,'empty preset hint spans its column');}
   await page.locator('.image-original').scrollIntoViewIfNeeded();
   await page.screenshot({path:path.join(out,`${host}-${device}-original.png`)});
   report.views.push({host,device,externalSettings:true,localSettings:true,exactPrompt:true});
  }catch(error){await page.screenshot({path:path.join(out,`${host}-${device}-failure.png`)});throw error;}finally{closing=true;await context.close();}
 }
},{timeoutMs:120000,gpuWaitMs:60000});
assert.deepEqual(report.errors,[]);assert.deepEqual(report.unexpected,[]);assert.deepEqual(report.writes,[]);
report.pass=true;await fs.writeFile(path.join(out,'receipt.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
