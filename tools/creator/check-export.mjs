import {withBrowserJob} from '../lib/browser-job.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const shots=fileURLToPath(new URL('../../art/parts/shots/glb-export/',import.meta.url));fs.mkdirSync(shots,{recursive:true});
await withBrowserJob('codex-creator-export',async browser=>{
 for(const [name,body,viewport] of [['desktop','mio',{width:1366,height:860}],['phone','eric',{width:390,height:844}]]){
  const page=await browser.newPage({viewport,acceptDownloads:true}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:8771/tools/creator/');await page.waitForFunction(()=>globalThis.__done);
  await page.selectOption('#body',body);await page.waitForFunction(()=>!globalThis.document.querySelector('#export-glb').disabled);
  const selected=JSON.parse(await page.locator('#recipe').inputValue());
  if(body==='eric')for(const slot of Object.keys(selected.parts))selected.parts[slot]='eric-'+slot;
  selected.parts.top='mio-top';
  selected.colours=body==='eric'?{top:'#ffffff',hair:'#653419',skin:'#e8bfa3'}:{top:'#a3543b'};
  selected.height=body==='eric'?1.3:1.1;selected.fit={hair:{scale:1.04,offset:[0,.01,0]}};
  await page.locator('#recipe-file').setInputFiles({name:'export-check.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(selected))});
  await page.getByText('Recipe loaded.',{exact:true}).waitFor();
  const recipe=JSON.parse(await page.locator('#recipe').inputValue());
  const pending=page.waitForEvent('download',{timeout:90000});await page.click('#export-glb');const download=await pending;
  const bytes=fs.readFileSync(await download.path());fs.writeFileSync(shots+body+'.glb',bytes);
  assert.equal(bytes.readUInt32LE(0),0x46546c67);
  const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  assert.deepEqual(gltf.animations.map(a=>a.name).sort(),['idle','walk']);
  assert.ok(gltf.skins.every(s=>s.joints.length===24));assert.ok(gltf.images.every(i=>i.bufferView!==undefined));
  const result=await page.evaluate(async({b64,recipe,name})=>{
   const THREE=await import('three'),{GLTFLoader}=await import('/game3d/vendor/loaders/GLTFLoader.js');
   const {loadLibrary,buildCharacter}=await import('/tools/creator/recipe.js');
   const library=await loadLibrary(),source=await buildCharacter(library,recipe);
   const data=Uint8Array.from(globalThis.atob(b64),c=>c.charCodeAt(0));const loaded=await new GLTFLoader().parseAsync(data.buffer,'');
   const mixer=new THREE.AnimationMixer(loaded.scene),boneErrors=[];
   for(const [clip,time] of [['idle',0],['idle',.7],['walk',.3],['walk',.8]]){
    source.bindPose();source.play(clip,0);source.update(time);
    mixer.stopAllAction();mixer.clipAction(loaded.animations.find(a=>a.name===clip)).reset().play();mixer.update(time);
    source.root.updateMatrixWorld(true);loaded.scene.updateMatrixWorld(true);
    for(const bone of Object.values(source.bones)){
     const other=loaded.scene.getObjectByName(bone.name);let difference=0;
     for(let i=0;i<16;i++)difference=Math.max(difference,Math.abs(bone.matrixWorld.elements[i]-other.matrixWorld.elements[i]));
     if(difference>.00001)boneErrors.push({clip,time,bone:bone.name,difference});
    }
   }
   if(boneErrors.length)throw Error(JSON.stringify(boneErrors.slice(0,5)));
   let faces=0;loaded.scene.traverse(o=>{if(o.isMesh)faces+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});
   const originalFaces=Object.values(source.meshes).reduce((sum,m)=>sum+m.geometry.attributes.position.count/3,0);
   loaded.scene.traverse(o=>{if(o.isMesh){const c=o.geometry.attributes.color;if(c && Array.from(c.array).some(v=>v<0||v>1))throw Error('Invalid glTF vertex colour');}});
   if(faces!==originalFaces)throw Error('Triangle count changed '+faces+' vs '+originalFaces);
   source.bindPose();source.play('idle',0);source.update(0);mixer.stopAllAction();mixer.clipAction(loaded.animations.find(a=>a.name==='idle')).reset().play();mixer.update(0);
   const scene=new THREE.Scene();scene.background=new THREE.Color('#e9ecf1');
   const sun=new THREE.DirectionalLight(0xffffff,1.6);sun.position.set(1.5,3,2.5);scene.add(sun,new THREE.HemisphereLight(0xffffff,0x8f98ab,2));
   source.root.position.x=-.48;loaded.scene.position.x=.48;scene.add(source.root,loaded.scene);
   const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(name==='phone'?780:1200,850);
   const camera=new THREE.PerspectiveCamera(28,(name==='phone'?780:1200)/850,.05,50);camera.position.set(0,.75,name==='phone'?4.4:3.6);camera.lookAt(0,.55,0);
   globalThis.document.body.replaceChildren(renderer.domElement);renderer.render(scene,camera);
   return {faces,clips:loaded.animations.map(c=>c.name),boneErrors:boneErrors.length};
  },{b64:bytes.toString('base64'),recipe,name});
  await page.screenshot({path:shots+name+'-roundtrip.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS',name,body,bytes.length,result);
  await page.close();
 }
});
