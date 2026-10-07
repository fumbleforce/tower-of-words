import assert from 'node:assert/strict';
import fs from 'node:fs';
import {withBrowserJob} from '../../tools/lib/browser-job.mjs';
import {scopedRoute} from '../../tools/bible/check-scope.mjs';
import {waitForGame} from '../test/support/wait-ready.mjs';
const width=+(process.argv[2]||390),height=width<600?844:860,mc=width<600?'carina':'eric';
const base=process.env.BASE||'game3d',out=new URL(`../shots/art-photo/${process.env.OUT||Date.now()}-${width}/`,import.meta.url).pathname;
fs.mkdirSync(out,{recursive:true});
const report={width,mc,fixture:'Tuesday evening art member, no prior art visit; real title Continue and Runner',lines:[],errors:[]};
await withBrowserJob('art-reach-'+width,async browser=>{
 const context=await browser.newContext({viewport:{width,height},isMobile:width<600,hasTouch:width<600}),page=await context.newPage();let closing=false;
 await context.route('**/*',scopedRoute({publicOnly:true,isClosing:()=>closing,onFailure:e=>report.errors.push(e)}));
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({privateMode:false,voiceOn:false,textSpeed:'instant'})));
 const shot=name=>page.screenshot({path:out+name+'.png'});
 const status=()=>page.evaluate(async()=>{const g=globalThis.__game,{flags}=await import('./js/narrative/state.js');return {busy:g.busy,place:g.place.name,period:g.sim.period,flags:{...flags},recovery:g.runner.recoveryError,execution:g.runner.snapshot?.(),line:globalThis.document.querySelector('#talk:not([hidden]) .line')?.textContent,choices:[...globalThis.document.querySelectorAll('#talk:not([hidden]) .chips button')].map(x=>x.textContent),contacts:g.place.artClub?.contacts,art:g.place.artClub?.snapshot()};});
 async function continueTitle(){
  await page.goto(`http://127.0.0.1:8771/${base}/index.html?q=0&mc=${mc}`);
  await page.waitForSelector('#title:not([hidden])');console.log('title ready');
  const button=page.locator('#title button').filter({hasText:/Continue/}).filter({visible:true});
  await button.first().click();
  await page.locator('#saves button.slot').filter({hasText:'Autosave'}).click();
  await page.waitForFunction(()=>globalThis.__game?.place?.name==='dorm_commons'&&!globalThis.document.body.classList.contains('at-title'),null,{timeout:60000});
 }
 try{
  await waitForGame(page,60000,()=>page.goto(`http://127.0.0.1:8771/${base}/index.html?day=6&place=dorm_commons&mc=${mc}&q=0`),'play');
  await page.waitForFunction(()=>!globalThis.__game.busy);
  console.log('initial room idle');const ready=await page.evaluate(()=>globalThis.__game.place.artClub.ready());assert.equal(ready,true,'approved production photo is loaded');
  await page.evaluate(async()=>{
   const g=globalThis.__game,{save,loadSave}=await import('./js/sim.js');save(g);const s=loadSave();
   s.period='evening';s.flags.period='evening';for(const p of ['early','morning','lunch','afternoon','evening'])s.flags['period_'+p]=p==='evening';
   s.flags.club_art=true;s.runner=null;s.world=null;s.pendingStart='dorm_commons';globalThis.localStorage.setItem('amakawa-day1-save',JSON.stringify(s));
  });
  await continueTitle();
  await page.waitForTimeout(600);
  if(!await page.evaluate(()=>globalThis.__game.busy)){
   const began=await page.evaluate(()=>{const g=globalThis.__game,m=g.markers.list.find(m=>m.id==='mori');if(!m||!m.enabled())return false;g.use(m);return true;});assert.equal(began,true,'Mori is available through his actual marker');
  }
  await page.waitForFunction(()=>globalThis.document.querySelector('#talk:not([hidden]) .line')?.textContent);
  report.probe=await page.evaluate(async()=>{
   const g=globalThis.__game,P=g.place,{diningHands}=await import('./js/places/izakaya/hands.js'),THREE=await import('three');
   const solver=diningHands(g,P.space),result={};
   for(const [id,r] of Object.entries({mori:P.people.mori,player:g.player})){
    const root=r.model||r.root,hand=root.getObjectByName('RightHand')||root.getObjectByName('mixamorigRightHand')||r.arms?.[1]?.userData.hand;
    const at=o=>P.space.worldToLocal(o.getWorldPosition(new THREE.Vector3())).toArray();
    const joints=[];r.root.traverse(o=>{if(o.isBone||o===hand||o===hand.parent)joints.push({name:o.name,at:at(o)})});
    result[id]={root:at(r.root),keys:Object.keys(r),joints,targets:[]};
    const state=solver.start(r);
    for (const name of ['Spine01','Spine02']) { const b=root.getObjectByName(name);if(b){state.chain.push(b);state.base.push(b.quaternion.clone());} }
    const x=r.root.position.x;
    for(const dx of [-.15,0,.15])for(const y of [.42,.48,.54,.6])for(const z of [-3.0,-2.9,-2.8]){
     const target=[x+dx,y,z];state.target.copy(P.space.localToWorld(new THREE.Vector3(...target)));solver.update();const actual=at(hand);
     result[id].targets.push({target,actual,gap:new THREE.Vector3(...actual).distanceTo(new THREE.Vector3(...target))});
    }
    solver.stop(state);
   }
   solver.clear();return result;
  });
  await shot('probe');report.pass=true;
 }catch(e){report.failure=e.stack;report.last=await status().catch(()=>null);await shot('failure');throw e;}
 finally{fs.writeFileSync(out+'report.json',JSON.stringify(report,null,2));closing=true;await context.close();}
},{timeoutMs:280000});
console.log('ART_PHOTO',out,report.pass);
