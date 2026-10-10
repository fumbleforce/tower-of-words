import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({resolve(s,c,next){if(s==='three')return next(new URL('../../vendor/three/three.module.js',import.meta.url).href,c);return next(s,c);}});
const THREE=await import('../../vendor/three/three.module.js');
const { recessedShopWall, shopfront } = await import('../../js/scenes/shotengai/shopfronts.js');
const {frontCarts}=await import('../../js/scenes/shotengai/front-carts.js');
import { DISPLAY, displayCenters, displayKeep, FRONT_IDS } from '../../js/scenes/shotengai/shopfront-plan.js';

import { ROWS_Z, SHOPS, bayMid } from '../../js/scenes/island-south.js';
const DOORS=SHOPS.map(s=>({id:s.id,at:[bayMid(s.door),s.row==='north'?ROWS_Z.arcade:ROWS_Z.south],out:s.row==='north'?1:-1}));

const box = (w,h,d,x,y,z) => new THREE.BoxGeometry(w,h,d).translate(x,y+h/2,z);
test('display openings have real depth while doors and upper walls remain solid', () => {
  for(const n of [-1,1]) {
    const front=n>0?4.5:0;
    const geometries=recessedShopWall(box,{ua:0,ub:9,h:4,depth:4.5,v0:0,n,centers:displayCenters(2.25)});
    const meshes=geometries.map(g=>new THREE.Mesh(g,new THREE.MeshBasicMaterial()));
    for(const [x,y,expected] of [[2.25,1,1],[2.25-DISPLAY.offset,1,1+DISPLAY.recess],[2.25+DISPLAY.offset,1,1+DISPLAY.recess],[2.25+DISPLAY.offset,2.2,1],[6.75,1,1]]) {
      const ray=new THREE.Raycaster(new THREE.Vector3(x,y,front+n),new THREE.Vector3(0,0,-n));
      const hit=ray.intersectObjects(meshes)[0];
      assert.ok(hit && Math.abs(hit.distance-expected)<1e-5,`${n}/${x}/${y}: ${hit?.distance}`);
    }
    geometries.forEach(g=>g.dispose());
  }
});
test('fitted goods stay within declared display footprints and central door clearance',()=>{
  for(const id of FRONT_IDS) {
    const parts=[];
    const p={geo(c,g){g.computeBoundingBox();parts.push(g.boundingBox.clone());g.dispose();},box(c,w,h,d,x,y,z){this.geo(c,box(w,h,d,x,y,z));}};
    shopfront(p,id,0,0,1);
    for(const b of parts) {
      assert.ok(b.min.x >= -2.08 && b.max.x <= 2.08,`${id} leaves its bay`);
      assert.ok(b.min.z >= -.685 && b.max.z <= .361,`${id} exceeds recessed case or nav blocker`);
      if(b.max.y>.2 && b.max.z>.12) assert.ok(b.max.x <= -.7 || b.min.x >= .7,`${id} blocks the central door`);
    }
  }
});
test('display blockers preserve all door approaches and the central pedestrian strip',()=>{
  const keep=displayKeep(DOORS);
  assert.equal(keep.length,6);
  const radius=.22;
  for(const door of DOORS.filter(d=>FRONT_IDS.includes(d.id))) {
    const [x,z]=door.at;
    for(const [x0,z0,x1,z1] of keep) {
      assert.ok(x+radius<=x0 || x-radius>=x1 || z+.85+radius<=z0 || z+.85-radius>=z1);
      assert.ok(z1 <= ROWS_Z.arcade+.361 || z0 >= ROWS_Z.south-.31);
    }
    assert.ok(DISPLAY.offset-DISPLAY.width/2> .55+radius-1e-6,'door width plus body clearance');
  }
});

test('low carts match their physical blockers without occupying doors, poles or the store queue',()=>{
  const parts=[];
  const p={geo(c,g){g.computeBoundingBox();parts.push(g.boundingBox.clone());g.dispose();},box(c,w,h,d,x,y,z){this.geo(c,box(w,h,d,x,y,z));}};
  const keep=frontCarts(p,bayMid,ROWS_Z.arcade);
  for(const b of parts)assert.ok(keep.some(([x0,z0,x1,z1])=>b.min.x>=x0-1e-5&&b.max.x<=x1+1e-5&&b.min.z>=z0-1e-5&&b.max.z<=z1+1e-5),'cart geometry outside nav footprint '+JSON.stringify(b));
  for(const [x0,z0,x1,z1]of keep) {
    assert.ok(z1<ROWS_Z.arcade+1.05,'cart leaves the central walking strip clear');
    for(const d of DOORS)assert.ok(d.at[0]<x0-.22 || d.at[0]>x1+.22,'cart blocks a door');
    for(const bay of [7,10]) {
      const post=bayMid(bay)-1.25;
      assert.ok(post+.05<x0||post-.05>x1||ROWS_Z.arcade+.4<z0,'cart overlaps arcade post');
    }
    for(let i=0;i<3;i++) {
      const qx=bayMid(7)+i*.7316,qz=ROWS_Z.arcade+.85;
      const dx=Math.max(x0-qx,0,qx-x1),dz=Math.max(z0-qz,0,qz-z1);
      assert.ok(Math.hypot(dx,dz)>.2832,'cart overlaps existing queue body');
    }
  }
});
