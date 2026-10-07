// Derived motion only: lift the pelvis where the deformed sole passes through the deck.
import fs from 'node:fs';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return n(s==='three'?new URL('../vendor/three/three.module.js',import.meta.url).href:s,c);}});
globalThis.ProgressEvent=class{constructor(type,values){Object.assign(this,{type},values);}};
const THREE=await import('../vendor/three/three.module.js');
const {GLTFLoader}=await import('../vendor/loaders/GLTFLoader.js');
const base='art/parts/pool-swimwear-runtime-1',source=base+'/ankle-bind-seat-8',dest=base+'/grounded-10';
if(fs.existsSync(dest))throw Error('Refusing to overwrite retained attempt');
fs.cpSync(source,dest,{recursive:true});
const report=[];
for(const id of ['eric','carina'])for(const mode of ['walk','run']){
 const path=`${source}/${id}/${mode}.glb`,raw=fs.readFileSync(path),jl=raw.readUInt32LE(12),j=JSON.parse(raw.subarray(20,20+jl));
 let bin=raw.subarray(28+jl,28+jl+j.buffers[0].byteLength);
 const render=structuredClone(j);for(const m of render.meshes)for(const p of m.primitives)delete p.material;
 render.buffers[0].uri='data:application/octet-stream;base64,'+bin.toString('base64');
 const gltf=await new GLTFLoader().parseAsync(JSON.stringify(render),''),model=gltf.scene,clip=gltf.animations[0];
 const mixer=new THREE.AnimationMixer(model),action=mixer.clipAction(clip);action.play();action.timeScale=0;
 const hips=model.getObjectByName('Hips'),vertices=[],point=new THREE.Vector3();
 model.traverse(o=>{if(!o.isSkinnedMesh)return;const a=o.geometry.attributes;
  for(let i=0;i<a.position.count;i++){let best=0;for(let k=1;k<4;k++)if(a.skinWeight.getComponent(i,k)>a.skinWeight.getComponent(i,best))best=k;
   if(/Foot|Toe/.test(o.skeleton.bones[a.skinIndex.getComponent(i,best)].name))vertices.push([o,i]);}
 });
 function sole(){model.updateMatrixWorld(true);let low=Infinity;for(const[o,i]of vertices){o.getVertexPosition(i,point).applyMatrix4(o.matrixWorld);low=Math.min(low,point.y);}return low;}
 const samples=Math.ceil(clip.duration*180),times=[],values=[],lift=[];
 for(let n=0;n<=samples;n++){
  const t=n/samples*clip.duration;action.time=t;mixer.update(0);model.updateMatrixWorld(true);
  const low=sole(),dy=hips.parent.matrixWorld.elements[5];
  const offset=Math.max(0,-low)/dy;
  times.push(t);values.push(hips.position.x,hips.position.y+offset,hips.position.z);lift.push(offset*dy);
 }
 // A periodic correction must not add a new discontinuity where the source clip wraps.
 const boundary=Math.max(lift[0],lift.at(-1));
 for(const i of [0,samples]){action.time=times[i];mixer.update(0);model.updateMatrixWorld(true);values[i*3+1]+=(boundary-lift[i])/hips.parent.matrixWorld.elements[5];lift[i]=boundary;}
 const channel=j.animations[0].channels.find(c=>j.nodes[c.target.node].name==='Hips'&&c.target.path==='translation');
 const sampler=j.animations[0].samplers[channel.sampler];
 function append(data,type){
  const pad=(4-bin.length%4)%4;if(pad)bin=Buffer.concat([bin,Buffer.alloc(pad)]);
  const buffer=Buffer.from(new Float32Array(data).buffer),view=j.bufferViews.length;
  j.bufferViews.push({buffer:0,byteOffset:bin.length,byteLength:buffer.length});bin=Buffer.concat([bin,buffer]);
  const accessor=j.accessors.length;j.accessors.push({bufferView:view,componentType:5126,count:data.length/(type==='VEC3'?3:1),type,...(type==='SCALAR'?{min:[data[0]],max:[data.at(-1)]}:{})});return accessor;
 }
 sampler.input=append(times,'SCALAR');sampler.output=append(values,'VEC3');sampler.interpolation='LINEAR';j.buffers[0].byteLength=bin.length;
 const json=Buffer.from(JSON.stringify(j)),jp=Buffer.alloc((4-json.length%4)%4,32),bp=Buffer.alloc((4-bin.length%4)%4);
 const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+jp.length+bin.length+bp.length,8);header.writeUInt32LE(json.length+jp.length,12);header.writeUInt32LE(0x4e4f534a,16);
 const bh=Buffer.alloc(8);bh.writeUInt32LE(bin.length+bp.length);bh.writeUInt32LE(0x004e4942,4);
 fs.writeFileSync(`${dest}/${id}/${mode}.glb`,Buffer.concat([header,json,jp,bh,bin,bp]));
 report.push({id,mode,keys:times.length,maxRawLift:Math.max(...lift),loopLift:boundary,flightKeysUnchanged:lift.filter(x=>x===0).length,times,lift});
}
fs.writeFileSync(dest+'/grounding.json',JSON.stringify(report,null,2));console.log('Derived grounded-10',report.map(({id,mode,keys,maxRawLift,loopLift})=>({id,mode,keys,maxRawLift,loopLift})));
