import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
registerHooks({ resolve(s, c, next) {
  if (s === 'three') return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, c);
  if (s.startsWith('three/addons/')) return next(new URL('../../vendor/' + s.slice(13), import.meta.url).href, c);
  return next(s, c);
} });
globalThis.ProgressEvent = class { constructor(_type, values) { Object.assign(this, values); } };
const THREE = await import('../../vendor/three/three.module.js');
const { GLTFLoader } = await import('../../vendor/loaders/GLTFLoader.js');
const { clone } = await import('../../vendor/utils/SkeletonUtils.js');
const { meshyFrom } = await import('../../js/avatar.js');
const { poolMarkerAnchor } = await import('../../js/places/day3/pool-marker-anchor.js');
async function geometry(id, name) {
  const file = fs.readFileSync(new URL(`../../assets/characters/swimwear-${id}/${name}.glb`, import.meta.url));
  const length = file.readUInt32LE(12), json = JSON.parse(file.subarray(20, 20 + length));
  for (const mesh of json.meshes) for (const primitive of mesh.primitives) delete primitive.material;
  json.buffers[0].uri = 'data:application/octet-stream;base64,' + file.subarray(28 + length).toString('base64');
  return new GLTFLoader().parseAsync(JSON.stringify(json), '');
}
const assets = Object.fromEntries(await Promise.all(['eric', 'carina', 'emi', 'kuro'].map(async id => [id,
  await Promise.all(['walk', 'run'].map(name => geometry(id, name)))])));
const sizes = Object.fromEntries(Object.entries(assets).map(([id,[walk]]) => [id, new THREE.Box3().setFromObject(walk.scene).getSize(new THREE.Vector3()).y]));
function actor(id) {
  const [walk, run] = assets[id], clip = name => THREE.AnimationClip.parse(JSON.parse(fs.readFileSync(
    new URL(`../../assets/characters/swimwear-${id}/${name}.json`, import.meta.url))));
  return meshyFrom(id, [{ ...walk, scene: clone(walk.scene) }, run, clip('idle'), { animations: [clip('sit')] }, new THREE.Texture(), null],
    { height: id === 'eric' ? 1.2 : 1.12, size: sizes[id] });
}
function highest(person, camera) {
  let top = -Infinity;
  person.root.updateWorldMatrix(true, false); person.root.updateMatrixWorld(true);
  person.model.traverse(mesh => {
    if (!mesh.isSkinnedMesh) return;
    const a = mesh.geometry.attributes;
    for (let i = 0; i < a.position.count; i++) {
      if (![0, 1, 2, 3].some(k => a.skinWeight.getComponent(i, k) > .05 &&
        /Head|Neck/.test(mesh.skeleton.bones[a.skinIndex.getComponent(i, k)].name))) continue;
      top = Math.max(top, mesh.getVertexPosition(i, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld).project(camera).y);
    }
  });
  return top;
}
for (const aspect of [390 / 844, 1366 / 860]) test(`pool marker clears actual hair after an outfit identity or head transform changes at ${aspect}`, () => {
  const camera = new THREE.PerspectiveCamera(24, aspect, .01, 100);
  camera.position.set(6, 4, 4); camera.lookAt(0, .8, 0); camera.updateMatrixWorld(true);
  const anchor = poolMarkerAnchor(camera), person = {};
  for (const id of ['eric', 'carina', 'emi', 'kuro']) {
    Object.assign(person, actor(id));
    const parent = new THREE.Group(); parent.position.set(40, 0, -24); parent.rotation.y = .3; parent.add(person.root);
    camera.position.set(46,4,-20); camera.lookAt(40,.8,-24); camera.updateMatrixWorld(true);
    for (const yaw of [1.2, -.6]) {
      person.sitAt(1.3, .34, -.7, yaw); person.seated = true;
      person.model.getObjectByName('Head').rotation.z += .12;
      // First marker may follow a root movement/outfit install before renderer binding refresh.
      person.root.position.x += 1.5; person.root.position.z -= .8;
      person.root.updateWorldMatrix(true, false); person.root.updateMatrixWorld(true);
      const v = anchor(person, new THREE.Vector3()).project(camera);
      const top = highest(person, camera);
      assert.ok(v.y >= top + .019, `${id} marker remains above all hair`);
      assert.ok(v.y <= top + .2, `${id} marker stays close to actual rendered hair, gap ${v.y-top}`);
      assert.ok(Number.isFinite(v.x) && v.z > -1 && v.z < 1);
    }
  }
});

test('first marker uses renderer attached-skin binding after scaled actor placement', () => {
  const camera = new THREE.PerspectiveCamera(24, 1366/860, .01, 100);
  camera.position.set(10,4,-24); camera.lookAt(5,.8,-30); camera.updateMatrixWorld(true);
  for (const id of ['eric','carina','emi','kuro']) {
    const person = actor(id), scene = new THREE.Group(); scene.add(person.root);
    person.root.scale.setScalar(1.18); person.sitAt(5,.34,-30,1.2);
    const anchor = poolMarkerAnchor(camera), v = anchor(person,new THREE.Vector3()).project(camera);
    scene.updateMatrixWorld(true);
    const top = highest(person,camera);
    assert.ok(v.y >= top+.019 && v.y < top+.2, `${id} first marker remains near rendered hair: ${v.y} versus ${top}`);
    assert.ok(Math.abs(anchor(person,new THREE.Vector3()).project(camera).y-v.y)<1e-6, 'renderer update cannot change cached anchor');
  }
});
