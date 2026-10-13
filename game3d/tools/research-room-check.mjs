import fs from 'node:fs';
import assert from 'node:assert/strict';
import {withBrowserJob} from '../../tools/lib/browser-job.mjs';
import {waitForGame} from '../test/support/wait-ready.mjs';
import {publicResearchContext,settledResearchView} from '../test/support/research-integration-evidence.mjs';
const base=new URL((process.env.BASE||'game3d')+'/',`http://127.0.0.1:${process.env.PORT||8771}/`).href;
const out=`/tmp/codex-research-room-${process.env.ROUND||'1'}`;fs.mkdirSync(out,{recursive:true});
await withBrowserJob('research-room',async browser=>{
 for(const width of [1366,390]){
  const errors=[],context=await publicResearchContext(browser,{width,height:width<700?844:860},errors),page=await context.newPage(),requests=[],consoleErrors=[];
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await page.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({v:2,textSpeed:'instant',voiceOn:false,privateMode:false})));
  const report={width,errors,requests,consoleErrors};
  try{
   await waitForGame(page,60000,()=>page.goto(`${base}index.html?day=2&place=research_lab`),'play');
   await page.waitForFunction(()=>!globalThis.__game.busy);await settledResearchView(page);await page.waitForTimeout(1000);
   await page.screenshot({path:`${out}/${width}-room.png`});
   report.room=await page.evaluate(()=>({textures:[...globalThis.__game.place.space.getObjectsByProperty('type','Mesh')].filter(o=>o.name.startsWith('research-paper')).map(o=>({name:o.name,size:[o.material.map?.image?.naturalWidth,o.material.map?.image?.naturalHeight],complete:o.material.map?.image?.complete})),place:globalThis.__game.place.name,pos:globalThis.__game.player.root.position,things:Object.keys(globalThis.__game.place.things)}));
   assert.equal(report.room.place,'research_lab');assert.deepEqual(errors,[]);
   if(process.env.WINDOW){
    report.window=await page.evaluate(()=>{const g=globalThis.__game,view=g.place.space.getObjectByName('research-window-view');if(!view)throw Error('Missing actual Research exterior');const meshes=view.getObjectsByProperty('type','Mesh');g.paused=true;globalThis.__researchWindowCamera={position:g.place.camera.position.clone(),quaternion:g.place.camera.quaternion.clone(),fov:g.place.camera.fov};g.place.camera.fov=48;g.place.camera.position.set(-6,7,2);g.place.camera.lookAt(-10.5,.6,-4.5);g.place.camera.updateProjectionMatrix();return{position:view.position.toArray(),meshes:meshes.length,vertices:meshes.reduce((n,m)=>n+(m.geometry.attributes.position?.count||0),0)};});
    await page.waitForTimeout(600);await page.screenshot({path:`${out}/${width}-window-station.png`});
    await page.evaluate(()=>{const g=globalThis.__game;const saved=globalThis.__researchWindowCamera;g.place.camera.position.copy(saved.position);g.place.camera.quaternion.copy(saved.quaternion);g.place.camera.fov=saved.fov;g.place.camera.updateProjectionMatrix();g.paused=false;});
   }
   if(process.env.BROWSE){
    report.fixtures=await page.evaluate(async()=>{const T=await import('three'),p=globalThis.__game.place,{R}=await import('./js/scenes/research-room/plan.js'),caseMesh=p.space.getObjectByName('research-archive-case'),shelf=p.space.getObjectByName('research-back-issues');if(!caseMesh||!shelf)throw Error('Missing actual archive geometry');p.space.updateMatrixWorld(true,true);const a=new T.Box3().setFromObject(caseMesh),b=new T.Box3().setFromObject(shelf);return{cabinet:a,shelf:b,eastGapMetres:(R.x1-a.max.x)*1.5,northGapMetres:(b.min.z-R.z0)*1.5};});
    assert.ok(report.fixtures.eastGapMetres>=0&&report.fixtures.eastGapMetres<=.1);assert.ok(report.fixtures.northGapMetres>=0&&report.fixtures.northGapMetres<=.1);
    await page.evaluate(async()=>{const g=globalThis.__game;await g.walkTo(2.7,1.9);g.hooks.face({who:'eric',to:[3.5,1.9]});});await page.waitForTimeout(800);await page.screenshot({path:`${out}/${width}-archive-browsing.png`});
    report.browsing=await page.evaluate(()=>globalThis.__game.player.root.position.toArray());assert.ok(Math.hypot(report.browsing[0]-2.7,report.browsing[2]-1.9)<.15);
   }

   if(process.env.ACTION){
    await page.evaluate(()=>{const g=globalThis.__game;g.busy=true;globalThis.__researchAction=g.place.research.act({state:'select',book:'weather',seat:'research_table_seat'}).then(()=>{g.busy=false;}).catch(e=>{globalThis.__researchFailure=e.message;g.busy=false;});});
    await page.waitForFunction(()=>globalThis.__researchFailure||!globalThis.document.querySelector('#findView')?.hidden,null,{timeout:60000});
    const failure=await page.evaluate(()=>globalThis.__researchFailure);if(failure)throw new Error(failure);
    await page.waitForTimeout(350);await page.screenshot({path:`${out}/${width}-reading.png`});
    await page.getByRole('button',{name:'Next page',exact:true}).click();
    await page.getByRole('button',{name:'Mark this page',exact:true}).click();
    await page.getByRole('button',{name:'Save this reference',exact:true}).click();
    await page.getByRole('button',{name:'Close book view',exact:true}).click();
    await page.waitForFunction(()=>!globalThis.__game.busy);
    await page.screenshot({path:`${out}/${width}-seated.png`});
    report.reading=await page.evaluate(()=>({state:globalThis.__game.place.research.state.read(),contacts:globalThis.__game.place.research.hands.contacts}));
    assert.equal(report.reading.state.marks.weather,1);
    if(process.env.REPLACE){
     await page.evaluate(()=>{const g=globalThis.__game;g.busy=true;globalThis.__researchFailure=null;g.place.research.act({state:'select',book:'copier',seat:'research_window_seat'}).then(()=>{g.busy=false;}).catch(e=>{globalThis.__researchFailure=e.message;g.busy=false;});});
     await page.waitForFunction(()=>globalThis.__researchFailure||!globalThis.document.querySelector('#findView')?.hidden,null,{timeout:60000});
     const failure=await page.evaluate(()=>globalThis.__researchFailure);if(failure)throw new Error(failure);
     await page.getByRole('button',{name:'Close book view',exact:true}).click();await page.waitForFunction(()=>!globalThis.__game.busy);
     await page.screenshot({path:`${out}/${width}-window.png`});
     report.replaced=await page.evaluate(()=>({state:globalThis.__game.place.research.state.read(),contacts:globalThis.__game.place.research.hands.contacts}));
     assert.equal(report.replaced.state.active.book,'copier');
     await page.evaluate(async()=>{const g=globalThis.__game;await g.place.research.act({state:'putBack'});});
     assert.equal(await page.evaluate(()=>globalThis.__game.place.research.state.read().active),null);
    }

   }

  }catch(e){report.failure=e.message;report.contacts=await page.evaluate(()=>globalThis.__game?.place?.research?.hands.contacts);await page.screenshot({path:`${out}/${width}-failure.png`});throw e;}
  finally{fs.writeFileSync(`${out}/${width}-report.json`,JSON.stringify(report,null,2));await context.close();}
 }
},{gpuWaitMs: Number(process.env.GPU_WAIT || 1800) * 1000, timeoutMs:180000});
