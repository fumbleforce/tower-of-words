import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { followAvailable, followAllowed } from '../../js/camera/policy.js';
registerHooks({ resolve(s, c, next) {
  if (s === 'three') return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, c);
  if (s.startsWith('three/addons/')) return next(new URL('../../vendor/' + s.slice(13), import.meta.url).href, c);
  return next(s, c);
} });
const THREE = await import('../../vendor/three/three.module.js');
const { followCamera } = await import('../../js/camera/follow.js');
const { cameraObstruction } = await import('../../js/camera/obstruction.js');
function fixture() {
  const scene = new THREE.Scene(), root = new THREE.Group(), player = new THREE.Group();
  scene.add(root); root.add(player);
  const camera = new THREE.PerspectiveCamera(22, 1.5, 0.5, 200);
  camera.position.set(7, 8, 9); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  const place = { scene, space: root, camera, people: {}, charScale: 1, cam: {}, nav: {x0:-9,x1:9,z0:-9,z1:9} };
  const game = { place, player: { root: player }, saveEnabled: true, ui: { menuClosed: () => true } };
  return { game, place, player, root, scene, camera };
}
test('desktop opt-in never overrides phone, authored shots, dialogue or menus', () => {
  assert.equal(followAvailable({width:1366,height:860}), true);
  for (const v of [{width:390,height:844}, {width:1366,height:860,coarse:true}, {width:1366,height:860,pointerLock:false}]) assert.equal(followAvailable(v), false);
  const {game}=fixture(); assert.equal(followAllowed(game,true),true);
  for(const key of ['busy','paused','mapOpen','saying','transition']) {
    game[key]=true; assert.equal(followAllowed(game,true),false,key); game[key]=false;
  }
  game.place.cam.close={}; assert.equal(followAllowed(game,true),false);
  game.place.cam.close=null; game.ui.talking=true; assert.equal(followAllowed(game,true),false);
});
test('follow restores exact authored lens/pose without changing scene-camera state or shared actor materials', () => {
  const {game,place,camera,player}=fixture();
  const original={pos:camera.position.clone(), q:camera.quaternion.clone(), fov:camera.fov, near:camera.near};
  const follow=followCamera(game,place); follow.update(); assert.equal(camera.fov,50);
  follow.restore(); assert.deepEqual(camera.position,original.pos); assert.deepEqual(camera.quaternion.toArray(),original.q.toArray());
  assert.equal(camera.fov,original.fov); assert.equal(camera.near,original.near); assert.equal(player.visible,true);
  // The authored camera is free to change its own lens in the next frame.
  camera.fov=37;camera.position.set(2,3,4); follow.look(120,30);follow.update();follow.restore();
  assert.equal(camera.fov,37);assert.deepEqual(camera.position.toArray(),[2,3,4]);
});
test('camera-relative controls use parent-local yaw and never change the avatar heading', () => {
  const {game,place,root,player}=fixture();root.rotation.y=Math.PI/2;root.updateMatrixWorld(true);
  const follow=followCamera(game,place);assert.ok(follow.movementFrame().distanceTo(new THREE.Vector3(0,0,1))<1e-8);
  follow.look(100,0);assert.equal(player.rotation.y,0);assert.equal(root.rotation.y,Math.PI/2);
  assert.ok(follow.movementFrame().x<0);
});
test('wall centre and lens corners block camera, hidden layers/actors do not, material sides are preserved', () => {
  const {place,scene,player}=fixture();
  const wall=new THREE.Mesh(new THREE.BoxGeometry(3,3,.1),new THREE.MeshBasicMaterial());
  wall.position.set(0,1,-1);scene.add(wall);scene.updateMatrixWorld(true);
  const obstruct=cameraObstruction(place,new Set([player])), from=new THREE.Vector3(0,1,0), to=new THREE.Vector3(0,1,-4);
  assert.equal(obstruct(from,to),true);assert.ok(to.z>-.95);assert.equal(wall.material.side,THREE.FrontSide);
  wall.visible=false;to.set(0,1,-4);assert.equal(obstruct(from,to),false);
  wall.visible=true;wall.layers.set(7);to.set(0,1,-4);assert.equal(obstruct(from,to),false);
  wall.layers.set(0);player.add(wall);scene.updateMatrixWorld(true);to.set(0,1,-4);assert.equal(obstruct(from,to),false);
  scene.add(wall);wall.position.x=1.6;scene.updateMatrixWorld(true);to.set(0,1,-4);
  assert.equal(obstruct(from,to),true,'lens edge clips a wall which the centre ray misses');
});
test('batched source walls and moved doors retain exact collision while render batches are ignored', () => {
  const {place,scene}=fixture();
  const wall=new THREE.Mesh(new THREE.BoxGeometry(2,2,.1),new THREE.MeshBasicMaterial());
  wall.position.set(0,1,-1);wall.layers.set(31);scene.add(wall);
  const batch=new THREE.Mesh(new THREE.BoxGeometry(50,50,50),new THREE.MeshBasicMaterial());
  batch.userData.perfBatch=true;scene.add(batch);scene.updateMatrixWorld(true);
  const collide=cameraObstruction(place,new Set()), a=new THREE.Vector3(0,1,0), b=new THREE.Vector3(0,1,-4);
  assert.equal(collide(a,b),true);assert.ok(b.z>-.95);
  wall.position.x=4;scene.updateMatrixWorld(true);b.set(0,1,-4);
  assert.equal(collide(a,b),false,'moving the source door invalidates its cached bounds');
  wall.position.x=0;scene.updateMatrixWorld(true);b.set(0,1,-4);assert.equal(collide(a,b),true);
});
test('instanced walls use the instance bounds rather than the prototype at the origin', () => {
  const {place,scene}=fixture();
  const walls=new THREE.InstancedMesh(new THREE.BoxGeometry(1,2,.1),new THREE.MeshBasicMaterial(),1);
  walls.setMatrixAt(0,new THREE.Matrix4().makeTranslation(4,1,-1));scene.add(walls);scene.updateMatrixWorld(true);
  const collide=cameraObstruction(place,new Set()), a=new THREE.Vector3(4,1,0), b=new THREE.Vector3(4,1,-4);
  assert.equal(collide(a,b),true);assert.ok(b.z>-.95);
  walls.setMatrixAt(0,new THREE.Matrix4().makeTranslation(8,1,-1));walls.instanceMatrix.needsUpdate=true;b.set(4,1,-4);
  assert.equal(collide(a,b),false);
});
test('render batching narrows the broad phase without hiding released collision sources', () => {
  const {place,scene}=fixture();
  const wall=new THREE.Mesh(new THREE.BoxGeometry(2,2,.1),new THREE.MeshBasicMaterial());
  wall.position.set(0,1,-1);wall.layers.set(31);scene.add(wall);
  const rendered=new THREE.Mesh(wall.geometry,wall.material);rendered.position.copy(wall.position);
  rendered.userData.perfBatch=true;scene.add(rendered);scene.updateMatrixWorld(true);
  const batch={mesh:rendered}, info=new Map([[wall,{state:'batched',batches:[batch]}]]);
  place.perf={info,stats:{merged:1,released:0,scans:1,batches:1}};
  const collide=cameraObstruction(place,new Set()), a=new THREE.Vector3(0,1,0), b=new THREE.Vector3(0,1,-4);
  assert.equal(collide(a,b),true);
  // The normal batching pass releases a door which moves independently of its batch.
  info.set(wall,{state:'dynamic'});place.perf.stats.released++;
  wall.position.x=4;scene.updateMatrixWorld(true);b.set(0,1,-4);assert.equal(collide(a,b),false);
  a.x=4;b.set(4,1,-4);assert.equal(collide(a,b),true);
});
test('large triangle lookup matches exact transformed geometry, draw range and changed vertices', async () => {
  const {cameraTriangles}=await import('../../js/camera/triangles.js');
  const cached=cameraTriangles();
  for(const indexed of [true,false]) {
    const original=new THREE.BoxGeometry(7,4,2,32,32,32);
    const geometry=indexed?original:original.toNonIndexed();
    const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
    mesh.position.set(4,1,-3);mesh.rotation.y=.7;mesh.scale.set(.7,1.3,1.6);mesh.updateMatrixWorld(true);
    const compare=()=>{
      for(let x=-2;x<11;x+=.37) {
        const ray=new THREE.Raycaster(new THREE.Vector3(x,1,4),new THREE.Vector3(0,0,-1),.05,14);
        const expected=ray.intersectObject(mesh,false)[0]?.distance??Infinity,actual=cached(mesh,ray);
        assert.notEqual(actual,undefined);assert.ok(expected===actual||Math.abs(expected-actual)<1e-7,`${x}: ${expected} vs ${actual}`);
      }
    };
    compare();geometry.setDrawRange(6,2400);compare();
    geometry.attributes.position.setX(9,13);geometry.attributes.position.needsUpdate=true;
    geometry.computeBoundingSphere();compare();
  }
});
test('ambient crowd bodies do not push the lens away from the player', () => {
  const {game,place,scene}=fixture();
  const crowd=new THREE.Group();place.crowd=[{root:crowd}];scene.add(crowd);
  crowd.add(new THREE.Mesh(new THREE.BoxGeometry(15,15,15),new THREE.MeshBasicMaterial()));
  scene.updateMatrixWorld(true);
  const follow=followCamera(game,place);follow.update();
  assert.equal(follow.blocked,false);assert.ok(follow.distance>3);follow.restore();
});
test('bounds invalidate on replacement attributes and instanced geometry vertex edits', () => {
  for(const instanced of [false,true]) {
    const {place,scene}=fixture();
    const geometry=new THREE.BoxGeometry(1,2,.1),material=new THREE.MeshBasicMaterial();
    const wall=instanced?new THREE.InstancedMesh(geometry,material,1):new THREE.Mesh(geometry,material);
    if(instanced) wall.setMatrixAt(0,new THREE.Matrix4().makeTranslation(0,1,-1));
    else wall.position.set(0,1,-1);
    scene.add(wall);scene.updateMatrixWorld(true);
    const collide=cameraObstruction(place,new Set()),a=new THREE.Vector3(4,1,0),b=new THREE.Vector3(4,1,-4);
    assert.equal(collide(a,b),false);
    const replacement=geometry.attributes.position.clone();
    for(let i=0;i<replacement.count;i++) replacement.setX(i,replacement.getX(i)+4);
    geometry.setAttribute('position',replacement);
    b.set(4,1,-4);assert.equal(collide(a,b),true,'replacement version-zero attribute');
    for(let i=0;i<replacement.count;i++) replacement.setX(i,replacement.getX(i)+4);
    replacement.needsUpdate=true;
    b.set(4,1,-4);assert.equal(collide(a,b),false);
    a.x=8;b.set(8,1,-4);assert.equal(collide(a,b),true,'edited instanced geometry');
  }
});
test('animation culling keeps the rendered follow frustum while authored lens is restored', () => {
  const {game,place,camera}=fixture();const follow=followCamera(game,place);
  follow.update();const rendered=camera.matrixWorld.clone();follow.restore();
  assert.equal(camera.fov,22);assert.equal(follow.visibilityCamera.fov,50);
  assert.deepEqual(follow.visibilityCamera.matrixWorld.toArray(),rendered.toArray());
  assert.notDeepEqual(camera.matrixWorld.toArray(),rendered.toArray());
});
test('interior closure preserves doorway aperture and releases its ceiling for overview', async () => {
  globalThis.location ||= {search:'?plainlook'};
  const {roomEnclosure}=await import('../../js/scenes/rooms/enclosure.js');
  const {game,place,root,scene,camera}=fixture();
  const enclosure=roomEnclosure(root,{x0:-2,x1:2,z0:-4,z1:0,h:2.4});
  enclosure.wall('x',-2,2,0,.2,.14,{holes:[[-.6,.6,0,.2]]},1.95);
  assert.equal(enclosure.group.visible,false);
  const follow=followCamera(game,place);follow.setActive(true);scene.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(0,1,-1),new THREE.Vector3(0,0,1));
  assert.equal(ray.intersectObject(enclosure.group,true).length,0,'door aperture remains open');
  ray.ray.origin.x=1;assert.ok(ray.intersectObject(enclosure.group,true).length>0,'wall beside doorway is solid');
  ray.ray.origin.set(0,2.15,-1);assert.ok(ray.intersectObject(enclosure.group,true).length>0,'door header is solid');
  follow.update();assert.ok(camera.position.y<=2.24+.001);follow.restore();follow.setActive(false);
  assert.equal(enclosure.group.visible,false);assert.equal(camera.fov,22);
});
test('separate dorm room ceilings activate in their own translated frame only', async () => {
  const {roomEnclosure}=await import('../../js/scenes/rooms/enclosure.js');
  const {game,place,root,scene,camera}=fixture();
  const upper=new THREE.Group();upper.position.x=20;root.add(upper);
  const a=roomEnclosure(root,{x0:-1,x1:1,z0:-3,z1:1,h:1.55});
  const b=roomEnclosure(upper,{x0:-1,x1:1,z0:-3,z1:1,h:1.55});
  for(const room of [a,b]) room.group.userData.followEnclosure.region=[-1,1,-3,1];
  const follow=followCamera(game,place);scene.updateMatrixWorld(true);
  game.player.root.position.set(0,0,-1);follow.setActive(true);
  assert.equal(a.group.visible,true);assert.equal(b.group.visible,false);
  follow.update();assert.ok(camera.position.y<=1.39+.001);follow.restore();
  game.player.root.position.set(20,0,-1);scene.updateMatrixWorld(true);follow.setActive(true);
  assert.equal(a.group.visible,false);assert.equal(b.group.visible,true);
  game.player.root.position.z=2;scene.updateMatrixWorld(true);follow.setActive(true);
  assert.equal(a.group.visible,false);assert.equal(b.group.visible,false);
  follow.update();assert.ok(camera.position.y>2,'outdoor corridor keeps its open camera height');follow.restore();
});
test('station enclosure closes cutaway sides but keeps its real glass-entry opening', async () => {
  const {stationEnclosure}=await import('../../js/scenes/station-enclosure.js');
  const {root,scene}=fixture();stationEnclosure(root,6.3,4.5,1.9);
  const group=root.children.find(o=>o.userData.followEnclosure);group.visible=true;scene.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(0,.8,3.7),new THREE.Vector3(0,0,1));
  assert.equal(ray.intersectObject(group,true).length,0);
  ray.ray.origin.y=1.65;assert.equal(ray.intersectObject(group,true).length,0);
  ray.ray.origin.y=2;assert.ok(ray.intersectObject(group,true).length>0);
  ray.ray.origin.set(6,1,4.2);ray.ray.direction.set(1,0,0);assert.ok(ray.intersectObject(group,true).length>0);
});
test('tight-space player visibility scales with the rig and restores before authored rendering', () => {
  const {game,place,root,player,scene}=fixture();place.charScale=1.18;
  const wall=new THREE.Mesh(new THREE.BoxGeometry(5,6,.1),new THREE.MeshBasicMaterial());wall.position.z=-.7;root.add(wall);scene.updateMatrixWorld(true);
  const follow=followCamera(game,place);follow.update();assert.ok(follow.distance<1.15*place.charScale);
  assert.equal(player.visible,false);assert.equal(wall.visible,true);follow.restore();assert.equal(player.visible,true);
});
