// Actual crowd attachment, moving skeletons and renderer counters. Public game only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../../tools/bible/check-scope.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const base=process.env.BASE || path.relative('/home/jorgen/repo/japanese',root)+'/game3d';
const out=process.env.OUT || path.join(root,'art/parts/crowd-selected-1/world');
const expected=process.env.BASELINE!=='1', fallback=process.env.FALLBACK==='1';fs.mkdirSync(out,{recursive:true});
const reports=[];
await withBrowserJob('selected-crowd-world',async browser=>{
 for(const width of (fallback?[390]:[1366,390])) {
  const page=await browser.newPage({viewport:{width,height:width===390?844:860}}),errors=[];
  let closing=false;
  await page.route('**/*',scopedRoute({publicOnly:true,isClosing:()=>closing,onFailure:e=>errors.push(e)}));
  if(fallback)await page.route('**/assets/characters/crowd-b/walk.glb',route=>route.fulfill({status:404,body:'deliberate missing-model fixture'}));
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('amakawa-settings',JSON.stringify({privateMode:false,voiceOn:false})));
  try {
   await page.goto(`http://127.0.0.1:8771/${base}/index.html?place=plaza&skip&q=1`);
   await page.waitForFunction(()=>globalThis.__game?.place?.name==='plaza'&&globalThis.__done,null,{timeout:60000});
   await page.waitForTimeout(2500);
   const details=await page.evaluate(()=>{
    const g=globalThis.__game;
    return g.place.crowd.map(r=>({kind:r.kind,selected:r.approvedCrowd,meshy:r.meshy,visible:r.root.visible,scale:r.root.scale.x}));
   });
   if(expected&&!(fallback?['a']:['a','b']).every(k=>details.some(r=>r.selected===k)))throw Error('Selected pair absent from actual crowd');
   if(fallback&&(details.some(r=>r.selected==='b')||!details.some(r=>r.kind==='office'&&!r.selected)))throw Error('Failed model did not preserve visible fallback');
   await page.screenshot({path:`${out}/plaza-${width}-start.png`});
   const frames=[];
   for(let i=0;i<40;i++) {
    frames.push(await page.evaluate(()=>{const g=globalThis.__game;return g.place.crowd.filter(r=>r.approvedCrowd).map(r=>{
     const point=r.root.getWorldPosition(r.root.position.clone());point.y+=.6*r.root.scale.x;point.project(g.followCamera?.visibilityCamera||g.place.camera);
     return ({
     key:r.approvedCrowd,visible:r.root.visible&&Math.abs(point.x)<.95&&Math.abs(point.y)<.95&&Math.abs(point.z)<1,state:r.state,root:r.root.position.toArray(),
     legs:['LeftLeg','RightLeg'].flatMap(n=>r.model.getObjectByName(n).quaternion.toArray()),
    });});}));
    await page.waitForTimeout(300);
   }
   fs.writeFileSync(`${out}/trace-${width}.json`,JSON.stringify({details,frames},null,2));
   if(expected) {
    const moving=frames[0].map((_,i)=>frames.map(f=>f[i])).filter(track=>track.filter(f=>f.visible&&f.state==='walk').length>10);
    if(!moving.length)throw Error('No sustained visible selected walker');
    for(const track of moving)if(new Set(track.map(f=>f.legs.map(n=>n.toFixed(3)).join(','))).size<8)throw Error('Actual selected crowd leg freeze');
   }
   const counters=await page.evaluate(async()=>{
    const g=globalThis.__game,info=g.renderer.info,gl=g.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
    const calls=[],tris=[];globalThis.__perfHold=true;info.autoReset=false;
    try{for(let i=0;i<60;i++){info.reset();await new Promise(requestAnimationFrame);calls.push(info.render.calls);tris.push(info.render.triangles);}}
    finally{globalThis.__perfHold=false;info.autoReset=true;}
    const median=x=>x.sort((a,b)=>a-b)[Math.floor(x.length/2)];
    return {calls:median(calls),triangles:median(tris),renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};
   });
   await page.screenshot({path:`${out}/plaza-${width}.png`});
   reports.push({width,details,counters,frames,errors});
   if(errors.length)throw Error(errors.join('\n'));
  }finally{closing=true;await page.close();}
 }
},{timeoutMs:240000});
fs.writeFileSync(`${out}/report.json`,JSON.stringify(reports,null,2)+'\n');
console.log('PASS actual plaza crowd, both viewports',reports.map(({width,counters})=>({width,...counters})));
