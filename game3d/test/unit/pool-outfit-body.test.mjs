// Exercise meshyFrom's real sampling against a transformed, already occupied pool actor root.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {registerHooks} from 'node:module';
import {test} from 'node:test';
registerHooks({resolve(s,c,next){if(s==='three')return next(new URL('../../vendor/three/three.module.js',import.meta.url).href,c);if(s.startsWith('three/addons/'))return next(new URL('../../vendor/'+s.slice(13),import.meta.url).href,c);return next(s,c);}});
globalThis.ProgressEvent=class{constructor(type,values){Object.assign(this,{type},values);}};
const THREE=await import('../../vendor/three/three.module.js');
const {GLTFLoader}=await import('../../vendor/loaders/GLTFLoader.js');
const {clone}=await import('../../vendor/utils/SkeletonUtils.js');
const {meshyFrom}=await import('../../js/avatar.js');
const {poolOutfitSlot}=await import('../../js/places/day3/pool-outfit-slot.js');
async function geometry(name,id='eric'){
 const file=fs.readFileSync(new URL('../../assets/characters/swimwear-'+id+'/'+name+'.glb',import.meta.url));
 const length=file.readUInt32LE(12),json=JSON.parse(file.subarray(20,20+length));
 for(const m of json.meshes)for(const p of m.primitives)delete p.material;
 json.buffers[0].uri='data:application/octet-stream;base64,'+file.subarray(28+length).toString('base64');
 return new GLTFLoader().parseAsync(JSON.stringify(json),'');
}
const [walk,run]=await Promise.all([geometry('walk'),geometry('run')]);
const carina=await Promise.all(['walk','run'].map(name=>geometry(name,'carina')));
const clip=(name,id='eric')=>THREE.AnimationClip.parse(JSON.parse(fs.readFileSync(new URL('../../assets/characters/swimwear-'+id+'/'+name+'.json',import.meta.url))));
function parts(id='eric'){const [w,r]=id==='carina'?carina:[walk,run];const model=clone(w.scene);model.traverse(o=>{if(o.isMesh)o.material=o.material.clone();});return [{...w,scene:model},r,clip('idle',id),{animations:[clip('sit',id)]},new THREE.Texture(),null];}
test('real supplied-root Meshy construction retains ordinary root and measures the same gait/seat as the default',()=>{
 const normal=meshyFrom('pool-default-root',parts(),{height:1.2});
 const parent=new THREE.Group(),root=new THREE.Group(),oldModel=new THREE.Group();parent.position.set(12,4,-9);parent.rotation.y=.7;parent.scale.setScalar(1.3);
 root.position.set(3,.1,6);root.rotation.set(.1,1.1,.2);root.scale.setScalar(1.2);parent.add(root);root.add(oldModel);
 const at=root.position.clone(),q=root.quaternion.clone(),sc=root.scale.clone(),original=()=>{};
 const actor={root,model:oldModel,update:original,setState(){},seated:false};
 const slot=poolOutfitSlot(actor,r=>meshyFrom('pool-owned-root',parts(),{root:r,height:1.2}));
 assert.equal(root.parent,parent);assert.ok(root.position.equals(at));assert.ok(root.quaternion.equals(q));assert.ok(root.scale.equals(sc));assert.equal(actor.update,original);
 slot.set(true);assert.equal(actor.root,root);assert.ok(actor.sitHip.distanceTo(normal.sitHip)<1e-6);
 for(const kind of ['walkV','runV'])assert.ok(Math.abs(actor.strides[kind]-normal.strides[kind])<1e-6);
 actor.sitAt(2,.4,5,.3);assert.equal(root.position.x,2);assert.equal(root.position.z,5);assert.equal(actor.state,'sit');
 slot.dispose();assert.equal(actor.model,oldModel);assert.equal(actor.update,original);assert.equal(oldModel.parent,root);
});

const {poolOutfitGround}=await import('../../js/places/day3/pool-outfit-ground.js');
const {swimmerPose}=await import('../../js/places/day3/swim-pose.js');
function sole(actor) {
 actor.root.updateWorldMatrix(true,true);let low=Infinity;const v=new THREE.Vector3(),inv=actor.root.parent?.matrixWorld.clone().invert()||new THREE.Matrix4();
 actor.model.traverse(o=>{if(!o.isSkinnedMesh)return;const a=o.geometry.attributes;
  for(let i=0;i<a.position.count;i++){let best=0;for(let k=1;k<4;k++)if(a.skinWeight.getComponent(i,k)>a.skinWeight.getComponent(i,best))best=k;
   if(/Foot|Toe/.test(o.skeleton.bones[a.skinIndex.getComponent(i,best)].name))low=Math.min(low,o.getVertexPosition(i,v).applyMatrix4(o.matrixWorld).applyMatrix4(inv).y);
  }
 });return low;
}
for(const id of ['eric','carina'])test(`${id} real dry clip blends ground without accumulated lift and seat/water transitions clear correction`,()=>{
 const actor=meshyFrom('grounded-'+id,parts(id),{height:id==='eric'?1.2:1.12}),parent=new THREE.Group();parent.position.set(4,2,-3);parent.rotation.y=.7;parent.add(actor.root);actor.root.scale.setScalar(1.18);
 const grounding=poolOutfitGround(actor),rootScale=actor.root.scale.clone();
 const start=performance.now(),costs=[];let count=0;
 for(const speed of [0, .3, 1.4, 2, .2, 0]){
  actor.setState(speed?'walk':'idle');actor.setGait(speed,{run:speed>1.5});
  for(let n=0;n<90;n++){
   actor.root.position.z+=speed/60;const before=performance.now();actor.update(1/60);costs.push(performance.now()-before);count++;
   assert.ok(sole(actor)>-.0002,`sole grounded during ${speed}: ${sole(actor)}`);
   assert.equal(actor.root.position.y,0);assert.ok(actor.root.scale.equals(rootScale));
  }
 }
 // Repeated identical updates cannot add yesterday's lift to the current mixer pose.
 actor.setState('idle');for(let n=0;n<60;n++)actor.update(1/60);
 const hip=actor.model.getObjectByName('Hips'),y=hip.position.y;
 for(let n=0;n<100;n++)actor.update(0);
 assert.ok(Math.abs(hip.position.y-y)<1e-7);
 actor.sitAt(2,.34,3,1);actor.seated=true;const seatY=actor.root.position.y;
 for(let n=0;n<30;n++)actor.update(1/60);
 assert.equal(actor.root.position.y,seatY);assert.equal(actor.state,'sit');
 const water=swimmerPose(actor);water.enter();for(let n=0;n<60;n++)actor.update(1/60);
 assert.equal(actor.swimming,true);assert.ok(actor.root.position.y<0);
 water.leave();water.dispose();actor.root.position.y=0;actor.setState('idle');actor.update(0);
 assert.ok(sole(actor)>-.0002);grounding.clear();
 costs.sort((a,b)=>a-b);console.log(id,'full grounded mixer update ms',{mean:costs.reduce((a,b)=>a+b,0)/costs.length,p95:costs[Math.floor(costs.length*.95)]});
 console.log(`grounding contact test: ${count} real mixer frames plus geometry assertions in ${(performance.now()-start).toFixed(1)}ms`);
});

test('cached pool body can deactivate and return with the same live mixer and owned materials',()=>{
 const root=new THREE.Group(),model=new THREE.Group();root.add(model);const actor={root,model,update(){},setState(){}};
 const slot=poolOutfitSlot(actor,r=>meshyFrom('cached-pool-eric',parts(),{root:r,height:1.2}));
 let disposed=0,material;slot.set(true);const mixer=actor.mixer;
 actor.model.traverse(o=>{if(o.isMesh){material=o.material;o.material.addEventListener('dispose',()=>disposed++);}});
 for(let visit=0;visit<3;visit++){
  actor.update(.1);assert.equal(actor.state,'idle');assert.ok(mixer._actions.some(a=>a.isRunning()));
  slot.set(false);assert.equal(actor.model,model);assert.equal(disposed,0);
  slot.set(true);assert.equal(actor.mixer,mixer);assert.equal(disposed,0);
 }
 slot.dispose();assert.ok(disposed>0);assert.ok(material);
});
