import fs from 'node:fs';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return n(s==='three'?new URL('../vendor/three/three.module.js',import.meta.url).href:s,c);}});
globalThis.ProgressEvent=class{constructor(type,values){Object.assign(this,{type},values);}};
const T=await import('../vendor/three/three.module.js');
const {GLTFLoader}=await import('../vendor/loaders/GLTFLoader.js');
const results=[];
for(const id of ['eric','carina'])for(const mode of ['walk','run']){
 const dir=`art/parts/pool-swimwear-runtime-1/ankle-bind-seat-8/${id}`,file=fs.readFileSync(`${dir}/${mode}.glb`),jl=file.readUInt32LE(12),j=JSON.parse(file.subarray(20,20+jl));
 for(const m of j.meshes)for(const p of m.primitives)delete p.material;j.buffers[0].uri='data:application/octet-stream;base64,'+file.subarray(28+jl).toString('base64');
 const gltf=await new GLTFLoader().parseAsync(JSON.stringify(j),''),model=gltf.scene,mixer=new T.AnimationMixer(model),idle=T.AnimationClip.parse(JSON.parse(fs.readFileSync(`${dir}/idle.json`))),ia=mixer.clipAction(idle);ia.play();mixer.update(0);model.updateMatrixWorld(true);
 const feet={};
 for(const side of ['Left','Right']){
  const foot=model.getObjectByName(side+'Foot'),toe=model.getObjectByName(side+'ToeBase'),vertices=[];
  const f=foot.getWorldPosition(new T.Vector3()),t=toe.getWorldPosition(new T.Vector3()).sub(f);
  model.traverse(o=>{if(!o.isSkinnedMesh)return;const a=o.geometry.attributes;for(let i=0;i<a.position.count;i++){let best=0;for(let k=1;k<4;k++)if(a.skinWeight.getComponent(i,k)>a.skinWeight.getComponent(i,best))best=k;if(new RegExp(side+'(Foot|Toe)').test(o.skeleton.bones[a.skinIndex.getComponent(i,best)].name))vertices.push([o,i]);}});
  feet[side]={foot,toe,vertices,neutral:foot.getWorldQuaternion(new T.Quaternion()),neutralToe:toe.getWorldQuaternion(new T.Quaternion()),heading:Math.atan2(t.x,t.z)};
 }
 mixer.stopAllAction();const clip=gltf.animations[0],a=mixer.clipAction(clip);a.reset().play();a.timeScale=0;const rows=[];
 for(let n=0;n<32;n++){
  a.time=n/32*clip.duration;mixer.update(0);model.updateMatrixWorld(true);const row={phase:n/32};
  for(const[side,f]of Object.entries(feet)){
   const ankle=f.foot.getWorldPosition(new T.Vector3()),toe=f.toe.getWorldPosition(new T.Vector3()).sub(ankle),heading=Math.atan2(toe.x,toe.z),q=f.foot.quaternion.clone(),qt=f.toe.quaternion.clone();
   const sole=()=>{model.updateMatrixWorld(true);let lo=Infinity;for(const[o,i]of f.vertices)lo=Math.min(lo,o.getVertexPosition(i,new T.Vector3()).applyMatrix4(o.matrixWorld).y);return lo;};
   const before=sole(),yaw=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),heading-f.heading);
   for(const[b,neutral]of [[f.foot,f.neutral],[f.toe,f.neutralToe]]){b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(yaw.clone().multiply(neutral)));b.updateWorldMatrix(false,true);}
   const flat=sole();f.foot.quaternion.copy(q);f.toe.quaternion.copy(qt);model.updateMatrixWorld(true);
   row[side]={ankle:ankle.y,pitch:Math.atan2(toe.y,Math.hypot(toe.x,toe.z)),sole:before,flat};
  }
  rows.push(row);
 }
 results.push({id,mode,rows});console.log(id,mode);for(const r of rows.filter((_,i)=>i%2===0))console.log(r.phase.toFixed(3),...['Left','Right'].map(s=>Object.fromEntries(Object.entries(r[s]).map(([k,v])=>[k,+v.toFixed(3)]))));
}
fs.writeFileSync('art/parts/pool-swimwear-runtime-1/stance-profile.json',JSON.stringify(results,null,2));
