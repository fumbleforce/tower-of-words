import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
const vendor = new URL('../../vendor/', import.meta.url).href;
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s,c,next) {
  if(s==='three') return {url:'${vendor}three/three.module.js',shortCircuit:true};
  if(s.startsWith('three/addons/')) return {url:'${vendor}'+s.slice(13),shortCircuit:true};
  return next(s,c);
}`));
globalThis.location ??= { search: '' };
const THREE = await import('../../vendor/three/three.module.js');
const { Kit } = await import('../../js/scenes/dorms/kit.js');
const { wall, mat, PAL } = await import('../../js/props.js');
const { R } = await import('../../js/scenes/rooms/gym-plan.js');
const { GYM_WINDOWS, gymWindowHoles, gymWindows, ballCart, equipmentShelf, gymMats } = await import('../../js/scenes/rooms/gym-fixtures.js');
function built(fn) { const kit=new Kit(), root=new THREE.Group(); fn(kit); kit.flush(root); root.updateMatrixWorld(true); return root; }
function bounds(root) { return new THREE.Box3().setFromObject(root); }

test('ten window apertures pass rays through the full wall thickness and retain wall below them', () => {
  const holes=gymWindowHoles();
  assert.equal(Object.values(holes).flat().length,10);
  for(const [side, openings] of Object.entries(holes)) {
    const north=side==='n';
    const center=north?R.z0-R.t/2:side==='w'?R.x0-R.t/2:R.x1+R.t/2;
    const shell=wall(north?'x':'z',north?R.x0:R.z0,north?R.x1:R.z1,center,R.h,R.t,{holes:openings});
    shell.updateMatrixWorld(true);
    for(const [lo,hi,bottom,top] of openings) {
      for(const y of [(bottom+top)/2,bottom-.2]) {
        const origin=new THREE.Vector3(north?(lo+hi)/2:center+(side==='w'?1:-1),y,north?center+1:(lo+hi)/2);
        const direction=new THREE.Vector3(north?0:side==='w'?-1:1,0,north?-1:0);
        const ray=new THREE.Raycaster(origin,direction,0,2);
        assert.equal(ray.intersectObject(shell,true).length>0,y<bottom,`${side} window ${lo}: wall at y=${y}`);
      }
    }
  }
});

test('window casing faces stand 20mm inside the plaster reveals', () => {
  const frame=built(gymWindows),openings=gymWindowHoles().n;
  const shell=wall('x',R.x0,R.x1,R.z0-R.t/2,R.h,R.t,{holes:openings});
  shell.updateMatrixWorld(true);
  // This depth clears the beads and mullion, so the rays hit only the casing.
  const depth=R.z0-R.t/2+.04;
  for(const [origin,direction,expected] of [
    [[-5.6,1.6,depth],[1,0,0],[-5.01,1.6,depth]],
    [[-5.6,1.6,depth],[-1,0,0],[-6.19,1.6,depth]],
    [[-5.8,1.6,depth],[0,-1,0],[-5.8,1.36,depth]],
    [[-5.8,1.84,depth],[0,1,0],[-5.8,1.90,depth]],
  ]) {
    const ray=new THREE.Raycaster(new THREE.Vector3(...origin),new THREE.Vector3(...direction),0,1);
    const casing=ray.intersectObject(frame,true)[0],plaster=ray.intersectObject(shell,true)[0];
    assert.ok(casing&&plaster,'both reveal surfaces exist');
    assert.equal(casing.object.material,mat(PAL.trim));
    assert.ok(casing.point.distanceTo(new THREE.Vector3(...expected))<1e-5,'hit is on the casing inner face');
    assert.ok(Math.abs(plaster.distance-casing.distance-.02)<1e-5,'casing inner face is 20mm inside the plaster cut');
  }
});

test('every window corner and rounded casing join has continuous outer backing', () => {
  const frame=built(gymWindows);
  for(const {side,at} of GYM_WINDOWS) {
    const x=side==='n'?at:side==='w'?R.x0-R.t/2:R.x1+R.t/2;
    const z=side==='n'?R.z0-R.t/2:at;
    const ry=side==='w'?Math.PI/2:side==='e'?-Math.PI/2:0;
    const rotation=new THREE.Matrix4().makeRotationY(ry);
    const direction=new THREE.Vector3(0,0,1).applyMatrix4(rotation);
    const samples=[[-.60,-.01],[.60,-.01],[-.60,.55],[.60,.55]];
    for(const side of [-1,1]) for(const top of [false,true])
      for(const [u,v] of [[.591,.001],[.589,-.001],[.599,.001],[.591,.009]])
        samples.push([side*u,top?.54-v:v]);
    for(const [dx,y] of samples) {
      const origin=new THREE.Vector3(dx,y,-.5).applyMatrix4(rotation).add(new THREE.Vector3(x,1.36,z));
      const hit=new THREE.Raycaster(origin,direction,0,1).intersectObject(frame,true)[0];
      assert.ok(hit,`${side} window ${at}: corner ${dx},${y} is covered`);
      assert.equal(hit.object.material,mat(PAL.trim));
      assert.ok(Math.abs(hit.distance-.394)<1e-5,'backing closes each join at local z=-0.106');
    }
  }
});

test('reported rounded jamb join is closed from outside', () => {
  const frame=built(gymWindows);
  const ray=new THREE.Raycaster(new THREE.Vector3(-5.009,1.899,-13.59),new THREE.Vector3(0,0,1),0,1);
  assert.ok(ray.intersectObject(frame,true)[0], 'exact reported corner-edge ray hits trim');
});

test('cart retains full-size balls without intersections or an enlarged floor footprint', () => {
  const kit=new Kit(),root=new THREE.Group(),balls=[],add=kit.add.bind(kit);
  kit.add=(color,geometry,opts)=>{
    if(geometry.type==='IcosahedronGeometry') {
      geometry.computeBoundingBox();
      balls.push({center:geometry.boundingBox.getCenter(new THREE.Vector3()),radius:geometry.parameters.radius,
        triangles:geometry.attributes.position.count/3});
    }
    return add(color,geometry,opts);
  };
  ballCart(kit,0,0,'#d8743a',14);kit.flush(root);
  const b=bounds(root);
  assert.ok(b.min.x>=-.3 && b.max.x<=.3 && b.min.z>=-.3 && b.max.z<=.3);
  assert.ok(b.min.y>=-1e-6 && b.min.y<.005,`wheel bottom ${b.min.y}`);
  assert.ok(b.max.y<=.92,'balls fit within the loaded trolley height');
  assert.equal(balls.length,14);
  for(const ball of balls) {
    assert.equal(ball.radius,.1,'balls keep their original 20cm diameter');
    assert.ok(ball.triangles<=80,'ball detail stays within its original geometry cost');
  }
  for(let i=0;i<balls.length;i++) for(let j=0;j<i;j++)
    assert.ok(balls[i].center.distanceTo(balls[j].center)>=balls[i].radius+balls[j].radius-1e-6);
});

test('open bib shelf and mat handles fit the unchanged store blockers', () => {
  const shelf=built(equipmentShelf), mats=built(gymMats);
  const s=bounds(shelf),m=bounds(mats);
  assert.ok(s.min.x>=-7.1 && s.max.x<=-6.6 && s.min.z>=-12.4 && s.max.z<=-11.4);
  assert.ok(m.min.x>=R.x0 && m.max.x<=-8.4 && m.min.z>=-12.9 && m.max.z<=-11.8);
  // Rays above each actual stack pass into the open front, before the rear brace.
  for(const z of [-12.1,-11.7]) {
    const ray=new THREE.Raycaster(new THREE.Vector3(-7.3,.155,z),new THREE.Vector3(1,0,0),0,.45);
    assert.equal(ray.intersectObject(shelf,true).length,0);
  }
});
