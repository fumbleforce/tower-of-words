import * as THREE from 'three';
// Read the actual supporting skin or procedural pelvis, then raycast the displayed chair beneath it.
export function researchSeatContact(place,rig,actors){
 rig.stepNow?.();rig.root.updateWorldMatrix(true,true);
 let hip;rig.root.traverse(o=>{if(o.isBone&&/^(mixamorig)?hips$/i.test(o.name))hip=o;});
 const point=new THREE.Vector3(),center=hip?rig.root.worldToLocal(hip.getWorldPosition(new THREE.Vector3())):null;
 let underside=Infinity,vertices=0;
 const record=p=>{vertices++;underside=Math.min(underside,place.space.worldToLocal(p.clone()).y);};
 if(hip)rig.root.traverse(mesh=>{
  if(!mesh.isSkinnedMesh||!mesh.visible)return;
  mesh.skeleton.update();const {position,skinIndex,skinWeight}=mesh.geometry.attributes;
  const support=mesh.skeleton.bones.map(b=>/hips|pelvis|up_?leg|thigh/i.test(b.name));
  for(let i=0;i<position.count;i++){
   let weight=0,bone=-1;for(let k=0;k<4;k++)if(skinWeight.getComponent(i,k)>weight){weight=skinWeight.getComponent(i,k);bone=skinIndex.getComponent(i,k);}
   if(!support[bone])continue;
   mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld);
   if(rig.root.worldToLocal(point.clone()).z-center.z<.2)record(point);
  }
 });
 else {
  const pelvis=rig.hips?.children.find(o=>o.isMesh);if(!pelvis)throw Error('Missing rendered procedural pelvis');
  const position=pelvis.geometry.attributes.position;
  for(let i=0;i<position.count;i++)record(point.fromBufferAttribute(position,i).applyMatrix4(pelvis.matrixWorld));
 }
 if(!vertices)throw Error('Missing rendered seat-support vertices');
 const roots=new Set(actors.map(a=>a?.root).filter(Boolean)),p=rig.root.position;
 place.space.updateWorldMatrix(true,true);
 const ray=new THREE.Raycaster(place.space.localToWorld(new THREE.Vector3(p.x,.5,p.z)),new THREE.Vector3(0,-1,0),0,.35),hits=[];
 place.space.traverse(mesh=>{if(!mesh.isMesh||!mesh.geometry||mesh.material?.transparent)return;for(let parent=mesh;parent;parent=parent.parent)if(roots.has(parent))return;THREE.Mesh.prototype.raycast.call(mesh,ray,hits);});
 hits.sort((a,b)=>a.distance-b.distance);
 const hit=hits.find(h=>{const y=place.space.worldToLocal(h.point.clone()).y;return y>.2&&y<.35;});
 if(!hit)throw Error('Missing actual reading-chair cushion');
 const cushion=place.space.worldToLocal(hit.point.clone()).y;
 return{vertices,underside,cushion,gap:underside-cushion};
}
