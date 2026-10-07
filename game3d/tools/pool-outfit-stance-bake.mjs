// Isolated candidate: source pelvis motion, support-foot orientation and original knee bend direction.
import fs from 'node:fs';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return n(s==='three'?new URL('../vendor/three/three.module.js',import.meta.url).href:s,c);}});
globalThis.ProgressEvent=class{constructor(type,values){Object.assign(this,{type},values);}};
const T=await import('../vendor/three/three.module.js');
const {GLTFLoader}=await import('../vendor/loaders/GLTFLoader.js');
const base='art/parts/pool-swimwear-runtime-1',source=base+'/ankle-bind-seat-8',dest=base+'/'+(process.env.ATTEMPT||'stance-14');
if(fs.existsSync(dest))throw Error('Refusing to overwrite an attempt');fs.cpSync(source,dest,{recursive:true});
const all=[];
const previous=process.env.SMOOTH_FROM?JSON.parse(fs.readFileSync(base+'/'+process.env.SMOOTH_FROM+'/stance.json')):null;
const position=b=>b.getWorldPosition(new T.Vector3());
const worldQ=b=>b.getWorldQuaternion(new T.Quaternion());
const smooth=(a,b,x)=>T.MathUtils.smoothstep(x,a,b);
function setWorld(b,q){b.quaternion.copy(worldQ(b.parent).invert().multiply(q));b.updateWorldMatrix(false,true);}
function aim(b,from,to){const q=new T.Quaternion().setFromUnitVectors(from.normalize(),to.normalize());setWorld(b,q.multiply(worldQ(b)));}
function legIK(f,target){
 const h=position(f.up),k=position(f.leg),a=position(f.foot),l1=h.distanceTo(k),l2=k.distanceTo(a);
 const direction=target.clone().sub(h),distance=T.MathUtils.clamp(direction.length(),Math.abs(l1-l2)+1e-5,l1+l2-1e-5);direction.normalize();
 const pole=k.clone().sub(h);pole.addScaledVector(direction,-pole.dot(direction));if(pole.length()<1e-7)return;pole.normalize();
 const along=(l1*l1-l2*l2+distance*distance)/(2*distance),across=Math.sqrt(Math.max(0,l1*l1-along*along));
 const knee=h.clone().addScaledVector(direction,along).addScaledVector(pole,across);
 aim(f.up,k.sub(h),knee.clone().sub(h));
 const nowK=position(f.leg),nowA=position(f.foot);aim(f.leg,nowA.sub(nowK),target.clone().sub(nowK));
}
for(const id of ['eric','carina'])for(const mode of ['walk','run']){
 const raw=fs.readFileSync(`${source}/${id}/${mode}.glb`),jl=raw.readUInt32LE(12),j=JSON.parse(raw.subarray(20,20+jl));let bin=raw.subarray(28+jl,28+jl+j.buffers[0].byteLength);
 const render=structuredClone(j);for(const m of render.meshes)for(const p of m.primitives)delete p.material;render.buffers[0].uri='data:application/octet-stream;base64,'+bin.toString('base64');
 const gltf=await new GLTFLoader().parseAsync(JSON.stringify(render),''),model=gltf.scene,mixer=new T.AnimationMixer(model),idle=T.AnimationClip.parse(JSON.parse(fs.readFileSync(`${source}/${id}/idle.json`)));
 mixer.clipAction(idle).play();mixer.update(0);model.updateMatrixWorld(true);
 const feet={};
 for(const side of ['Left','Right']){
  const foot=model.getObjectByName(side+'Foot'),toe=model.getObjectByName(side+'ToeBase'),direction=position(toe).sub(position(foot)),vertices=[];
  model.traverse(o=>{if(!o.isSkinnedMesh)return;const a=o.geometry.attributes;for(let i=0;i<a.position.count;i++){let best=0;for(let k=1;k<4;k++)if(a.skinWeight.getComponent(i,k)>a.skinWeight.getComponent(i,best))best=k;if(new RegExp(side+'(Foot|Toe)').test(o.skeleton.bones[a.skinIndex.getComponent(i,best)].name))vertices.push([o,i]);}});
  feet[side]={foot,toe,up:model.getObjectByName(side+'UpLeg'),leg:model.getObjectByName(side+'Leg'),vertices,neutral:worldQ(foot),neutralToe:worldQ(toe),heading:Math.atan2(direction.x,direction.z)};
 }
 const sole=f=>{model.updateMatrixWorld(true);let low=Infinity;const p=new T.Vector3();for(const[o,i]of f.vertices)low=Math.min(low,o.getVertexPosition(i,p).applyMatrix4(o.matrixWorld).y);return low;};
 mixer.stopAllAction();const clip=gltf.animations[0],action=mixer.clipAction(clip);action.reset().play();action.timeScale=0;
 const count=Math.ceil(clip.duration*180),times=[],tracks={},frames=[];
 const sourcePose=clip.tracks.map(track=>{const split=track.name.lastIndexOf('.');return [model.getObjectByName(track.name.slice(0,split)),track.name.slice(split+1),track.createInterpolant()];});
 const profile=previous?.find(r=>r.id===id&&r.mode===mode).frames;
 const filtered=(n,side,key)=>{let sum=0,total=0;for(let k=-11;k<=11;k++){const w=Math.exp(-.5*(k/3.5)**2);sum+=profile[((n+k)%count+count)%count].feet[side][key]*w;total+=w;}return sum/total;};
 for(let n=0;n<=count;n++){
  const t=n/count*clip.duration;times.push(t);
  // A PropertyMixer skips writing unchanged values; direct sampling must replace every edited bone each frame.
  for(const[object,key,sampler]of sourcePose)object[key].fromArray(sampler.evaluate(t));
  model.updateMatrixWorld(true);const originalFloor=Math.min(...Object.values(feet).map(sole));
  const flightFloor=mode==='run'?Math.max(0,originalFloor):0;
  const frame={phase:n/count,originalFloor,flightFloor,feet:{}};
  for(const f of Object.values(feet)){
   f.initialFoot=worldQ(f.foot);f.initialToe=worldQ(f.toe);
   const direction=position(f.toe).sub(position(f.foot)),delta=f.initialFoot.clone().multiply(f.neutral.clone().invert());
   // The toe direction becomes vertical at toe-off; its horizontal projection can flip by pi.
   // Extract the actual foot's yaw twist instead of assigning a new heading at that singularity.
   const yaw=process.env.HEADING==='projected'?new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.atan2(direction.x,direction.z)-f.heading):new T.Quaternion(0,delta.y,0,delta.w).normalize();
   f.flatQ=yaw.clone().multiply(f.neutral);f.flatToe=yaw.clone().multiply(f.neutralToe);
   setWorld(f.foot,f.flatQ);setWorld(f.toe,f.flatToe);f.flatLow=sole(f);
   setWorld(f.foot,f.initialFoot);setWorld(f.toe,f.initialToe);
  }
  for(const[side,f]of Object.entries(feet)){
   const other=feet[side==='Left'?'Right':'Left'];
   const rawSupport=(1-smooth(.005,.035,f.flatLow-other.flatLow))*(mode==='run'?1-smooth(.03,.06,Math.min(f.flatLow,other.flatLow)):1);
   const support=profile?Math.min(rawSupport,filtered(n,side,'support')):rawSupport;
   function orient(weight){setWorld(f.foot,f.initialFoot.clone().slerp(f.flatQ,weight));setWorld(f.toe,f.initialToe.clone().slerp(f.flatToe,weight));}
   let weight=support;orient(weight);
   if(sole(f)<0){
    if(f.flatLow<=.001)weight=1;
    else {let lo=weight,hi=1;for(let k=0;k<9;k++){const mid=(lo+hi)/2;orient(mid);if(sole(f)<.001)lo=mid;else hi=mid;}weight=hi;}
   }
   if(profile)weight=filtered(n,side,'orientation');
   orient(weight);const desired=worldQ(f.foot),desiredToe=worldQ(f.toe),oldAnkle=position(f.foot);
   for(let k=0;k<3;k++){
    const low=sole(f),gap=flightFloor-low,shift=gap>0?gap:gap*support;
    if(Math.abs(shift)<1e-5)break;
    const target=position(f.foot);target.y+=shift;legIK(f,target);setWorld(f.foot,desired);setWorld(f.toe,desiredToe);
   }
   frame.feet[side]={support,orientation:weight,sole:sole(f),ankleShift:position(f.foot).sub(oldAnkle).toArray()};
   for(const bone of [f.up,f.leg,f.foot,f.toe]){
    const values=tracks[bone.name]||=[];const q=bone.quaternion.clone();if(values.length&&q.dot(new T.Quaternion().fromArray(values,values.length-4))<0)q.set(-q.x,-q.y,-q.z,-q.w);values.push(...q.toArray());
   }
  }
  frames.push(frame);
 }
 function append(data,type){const padding=(4-bin.length%4)%4;if(padding)bin=Buffer.concat([bin,Buffer.alloc(padding)]);const bytes=Buffer.from(new Float32Array(data).buffer),view=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:bin.length,byteLength:bytes.length});bin=Buffer.concat([bin,bytes]);const accessor=j.accessors.length;j.accessors.push({bufferView:view,componentType:5126,count:data.length/(type==='VEC4'?4:1),type,...(type==='SCALAR'?{min:[data[0]],max:[data.at(-1)]}:{})});return accessor;}
 const input=append(times,'SCALAR');
 for(const[name,values]of Object.entries(tracks)){
  const channel=j.animations[0].channels.find(c=>j.nodes[c.target.node].name===name&&c.target.path==='rotation');if(!channel)throw Error('Missing rotation '+name);
  Object.assign(j.animations[0].samplers[channel.sampler],{input,output:append(values,'VEC4'),interpolation:'LINEAR'});
 }
 j.buffers[0].byteLength=bin.length;const json=Buffer.from(JSON.stringify(j)),jp=Buffer.alloc((4-json.length%4)%4,32),bp=Buffer.alloc((4-bin.length%4)%4),header=Buffer.alloc(20),bh=Buffer.alloc(8);
 header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+jp.length+bin.length+bp.length,8);header.writeUInt32LE(json.length+jp.length,12);header.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(bin.length+bp.length);bh.writeUInt32LE(0x004e4942,4);
 fs.writeFileSync(`${dest}/${id}/${mode}.glb`,Buffer.concat([header,json,jp,bh,bin,bp]));all.push({id,mode,frames});
 console.log(id,mode,'worst sole',Math.min(...frames.flatMap(f=>Object.values(f.feet).map(x=>x.sole))),'max ankle move',Math.max(...frames.flatMap(f=>Object.values(f.feet).map(x=>Math.hypot(...x.ankleShift)))));
}
fs.writeFileSync(dest+'/stance.json',JSON.stringify(all,null,2));
