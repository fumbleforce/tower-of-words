import fs from 'node:fs';
import {withBrowserJob} from '../../tools/lib/browser-job.mjs';
import {waitForGame} from '../test/support/wait-ready.mjs';
const width=+(process.argv[2]||390),mc=width<700?'carina':'eric',out=`/tmp/codex-research-grip-probe-${process.env.ROUND||'1'}`;fs.mkdirSync(out,{recursive:true});
await withBrowserJob('research-grip-probe',async browser=>{
 const c=await browser.newContext({viewport:{width,height:844}}),p=await c.newPage();
 await p.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({v:2,voiceOn:false,textSpeed:'instant',privateMode:false})));
 try{
 await waitForGame(p,60000,()=>p.goto(`http://127.0.0.1:8786/game3d/index.html?day=2&place=office&mc=${mc}`),'play');await p.waitForFunction(()=>!globalThis.__game.busy);
 await p.evaluate(async()=>{const g=globalThis.__game,{flags}=await import('./js/narrative/state.js');flags.d2_ticket_done=true;g.place.hooks.officeDay2({state:'arrive'});g.busy=true;await g.place.researchOffice.act({state:'desk'});const wait=g.wait;g.wait=ms=>ms===700&&g.place.researchOffice.phase==='copy-offer'?new Promise(resolve=>{globalThis.__release=()=>{g.wait=wait;resolve();};}):wait(ms);globalThis.__handoff=g.place.researchOffice.act({state:'handoff'});});
 await p.waitForFunction(()=>globalThis.__game.place.researchOffice.phase==='copy-offer',null,{timeout:60000});
 const report=await p.evaluate(async()=>{const T=await import('three'),g=globalThis.__game,res={};for(const [id,r]of[['mori',g.place.people.mori],['player',g.player]]){r.root.updateMatrixWorld(true);let hand;r.root.traverse(o=>{if(o.isBone&&/^(mixamorig)?LeftHand$/.test(o.name))hand=o;});const box=new T.Box3(),world=new T.Box3(),point=new T.Vector3(),points=[];r.root.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;mesh.skeleton.update();const a=mesh.geometry.attributes;for(let i=0;i<a.position.count;i++){let b=-1,wt=0;for(let k=0;k<4;k++)if(a.skinWeight.getComponent(i,k)>wt){wt=a.skinWeight.getComponent(i,k);b=a.skinIndex.getComponent(i,k);}let parent=mesh.skeleton.bones[b],yes=false;while(parent){if(parent===hand)yes=true;parent=parent.parent;}if(!yes)continue;mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld);world.expandByPoint(point);hand.worldToLocal(point);box.expandByPoint(point);points.push(point.toArray());}});res[id]={bones:[],bounds:box,world,hand:hand.getWorldPosition(new T.Vector3()),points};hand.traverse(o=>{if(o.isBone)res[id].bones.push({name:o.name,pos:o.position.toArray(),quat:o.quaternion.toArray()});});}return res;});
 fs.writeFileSync(out+`/${width}-hands.json`,JSON.stringify(report,null,2));await p.screenshot({path:out+`/${width}-offer.png`});await p.evaluate(()=>globalThis.__release());await p.evaluate(()=>globalThis.__handoff);
 }finally{await c.close();}
},{timeoutMs:180000,gpuWaitMs:1200000});
