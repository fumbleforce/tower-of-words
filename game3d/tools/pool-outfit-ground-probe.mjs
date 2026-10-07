// CPU measurements of selected and repaired clips; no mesh or animation is mutated on disk.
import fs from 'node:fs';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return n(s==='three'?new URL('../vendor/three/three.module.js',import.meta.url).href:s.startsWith('three/addons/')?new URL('../vendor/'+s.slice(13),import.meta.url).href:s,c);}});
globalThis.ProgressEvent=class{constructor(type,values){Object.assign(this,{type},values);}};
const THREE=await import('../vendor/three/three.module.js');
const {GLTFLoader}=await import('../vendor/loaders/GLTFLoader.js');
const {meshyFrom}=await import('../js/avatar.js');
const rows=[];
async function geometry(path){
 const file=fs.readFileSync(path),length=file.readUInt32LE(12),json=JSON.parse(file.subarray(20,20+length));
 for(const m of json.meshes)for(const p of m.primitives)delete p.material;
 json.buffers[0].uri='data:application/octet-stream;base64,'+file.subarray(28+length).toString('base64');
 return new GLTFLoader().parseAsync(JSON.stringify(json),'');
}
for(const id of ['eric','carina','emi','kuro-b'])for(const version of (process.env.VERSIONS||'original,ankle-bind-seat-8').split(',')){
 const dir=`art/parts/${version==='original'?'pool-swimwear-1/game':'pool-swimwear-runtime-1/'+version}/${id}`;
 const [walk,run]=await Promise.all(['walk','run'].map(n=>geometry(`${dir}/${n}.glb`)));
 const size=new THREE.Box3().setFromObject(walk.scene).getSize(new THREE.Vector3()).y;
 const clip=n=>THREE.AnimationClip.parse(JSON.parse(fs.readFileSync(`${dir}/${n}.json`)));
 const a=meshyFrom(`probe-${version}-${id}`,[walk,run,clip('idle'),{animations:[clip('sit')]},new THREE.Texture(),null],{height:{eric:1.2,carina:1.12,emi:1.09,'kuro-b':1.12}[id],size});
 a.root.scale.setScalar(1.18);
 const vertices=[],p=new THREE.Vector3();
 a.model.traverse(o=>{if(!o.isSkinnedMesh)return;const at=o.geometry.attributes;
  for(let i=0;i<at.position.count;i++){
   let best=0;for(let k=1;k<4;k++)if(at.skinWeight.getComponent(i,k)>at.skinWeight.getComponent(i,best))best=k;
   vertices.push([o,i,/Foot|Toe/.test(o.skeleton.bones[at.skinIndex.getComponent(i,best)].name)]);
  }
 });
 const measure=()=>{a.root.updateMatrixWorld(true);let low=Infinity,high=-Infinity,foot=Infinity;
  for(const[o,i,isFoot]of vertices){o.getVertexPosition(i,p).applyMatrix4(o.matrixWorld);low=Math.min(low,p.y);high=Math.max(high,p.y);if(isFoot)foot=Math.min(foot,p.y);}
  return{low,high,height:high-low,foot};
 };
 a.setState('idle');for(let n=0;n<60;n++)a.update(1/60);
 const row={id,version,rootScale:a.root.scale.toArray(),nominalHeight:{eric:1.2,carina:1.12,emi:1.09,'kuro-b':1.12}[id],standing:measure(),motions:{}};
 // Sample native clips directly, matching the runtime's x/z hip pin without the speed blend.
 const hips=a.model.getObjectByName('Hips'),rest=hips.position.clone();
 for(const[mode,gltf]of [['walk',walk],['run',run]]){
  a.mixer.stopAllAction();const ac=a.mixer.clipAction(gltf.animations[0]);ac.reset().play();ac.timeScale=0;
  const samples=[], heads=[];
  const count=+(process.env.SAMPLES||72);for(let n=0;n<count;n++){ac.time=gltf.animations[0].duration*n/count;a.mixer.update(0);hips.position.x=rest.x;hips.position.z=rest.z;samples.push(measure().foot);heads.push(a.model.getObjectByName('Head').getWorldPosition(new THREE.Vector3()).y);}
  const dt=gltf.animations[0].duration/count, speeds=heads.map((y,i)=>(heads[(i+1)%count]-y)/dt);
  row.motions[mode]={min:Math.min(...samples),max:Math.max(...samples),samples,headRange:Math.max(...heads)-Math.min(...heads),maxHeadStep:Math.max(...speeds.map(Math.abs))*dt,wrapHeadStep:heads[0]-heads.at(-1),heads};
 }
 rows.push(row);console.log(id,version,'standing',row.standing,'walk',row.motions.walk.min,row.motions.walk.max,'run',row.motions.run.min,row.motions.run.max);
}
fs.writeFileSync(process.env.OUT||'art/parts/pool-swimwear-runtime-1/ground-baseline.json',JSON.stringify(rows,null,2));
