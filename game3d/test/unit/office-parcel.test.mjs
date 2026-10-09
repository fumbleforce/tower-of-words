import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerHooks } from 'node:module';
import * as THREE from '../../vendor/three/three.module.js';
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'three')
      return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, context);
    if (specifier.startsWith('three/addons/'))
      return next(new URL('../../vendor/' + specifier.slice(13), import.meta.url).href, context);
    return next(specifier, context);
  },
});
globalThis.location = { search: '' };
const { GLTFLoader } = await import('../../vendor/loaders/GLTFLoader.js');
const { meshyFrom } = await import('../../js/avatar.js');
const { meshyPerson } = await import('../../js/cast3d.js');
const { proxyParts } = await import('../../js/chibi-crowd.js');
const { bridgeOfficePose } = await import('../../js/crowd/office-pose.js');
const { carryOfficeParcel } = await import('../../js/crowd/office-parcel.js');
process.on('exit', () => hooks.deregister());

async function carrier() {
  // Production native mesh and clips; only image decoding is unnecessary in Node.
  const loader = new GLTFLoader().register(() => ({
    name: 'test-textures',
    loadTexture: () => Promise.resolve(new THREE.Texture()),
  }));
  const load = async (name) => {
    const b = fs.readFileSync(new URL(`../../assets/characters/crowd-a/${name}.glb`, import.meta.url));
    return loader.parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '');
  };
  const [walk, run, sit] = await Promise.all(['walk', 'run', 'sit'].map(load));
  const idle = THREE.AnimationClip.parse(
    JSON.parse(fs.readFileSync(new URL('../../assets/characters/crowd-a/idle.json', import.meta.url))),
  );
  const rig = meshyPerson(meshyFrom('crowd-a', [walk, run, idle, sit, new THREE.Texture(), null], { height: 1.09 }));
  rig.approvedCrowd = 'a';
  rig.ph = 5 * 1.37;
  proxyParts(rig);
  bridgeOfficePose(rig);
  rig.root.scale.setScalar(1.18);
  return rig;
}
function measure(rig) {
  rig.root.updateMatrixWorld(true);
  const parcel = rig.root.getObjectByName('office-parcel');
  const inverse = rig.root.matrixWorld.clone().invert();
  const box = new THREE.Box3();
  parcel.traverse((mesh) => {
    if (!mesh.isMesh) return;
    mesh.geometry.computeBoundingBox();
    box.union(
      mesh.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld)),
    );
  });
  const point = new THREE.Vector3();
  let bodyInside = 0,
    armInside = 0,
    supportGap = Infinity,
    bodyGap = Infinity;
  const intersections = [];
  rig.model.traverse((mesh) => {
    if (!mesh.isSkinnedMesh) return;
    mesh.skeleton.update();
    const { position, skinIndex, skinWeight } = mesh.geometry.attributes;
    for (let i = 0; i < position.count; i++) {
      let body = 0,
        arm = 0,
        hand = 0;
      for (let j = 0; j < 4; j++) {
        const name = mesh.skeleton.bones[skinIndex.getComponent(i, j)].name;
        const w = skinWeight.getComponent(i, j);
        if (/^(Hips|Spine\d*|LeftUpLeg|RightUpLeg|LeftLeg|RightLeg)$/.test(name)) body += w;
        if (/^Left(Arm|ForeArm|Hand)$/.test(name)) arm += w;
        if (name === 'LeftHand') hand += w;
      }
      mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);
      if (body > 0.5) bodyGap = Math.min(bodyGap, box.distanceToPoint(point));
      if (box.containsPoint(point)) {
        if (body > 0.5) bodyInside++;
        if (arm > 0.5) {
          armInside++;
          intersections.push({ point: point.toArray(), hand, bottom: box.min.y, back: box.min.z });
        }
      }
      if (hand > 0.6 && point.x > box.min.x && point.x < box.max.x && point.z > box.min.z && point.z < box.max.z)
        supportGap = Math.min(supportGap, box.min.y - point.y);
    }
  });
  return {
    bodyInside,
    armInside,
    supportGap,
    bodyGap,
    intersections: intersections.slice(0, 5),
    size: box.getSize(new THREE.Vector3()).toArray(),
  };
}

test('native carrier supports a small parcel without body or arm intersection through queue, tap and walk', async () => {
  const rig = await carrier();
  carryOfficeParcel(rig);
  const phases = ['idle', 'walk', 'queue', 'tap', 'through'];
  for (const [phaseIndex, phase] of phases.entries()) {
    rig.root.rotation.y = phaseIndex * 0.8;
    rig.setState(phase === 'walk' || phase === 'through' ? 'walk' : 'idle');
    rig.arms[0].rotation.set(phase === 'tap' ? -1.2 : 0, 0, 0);
    rig.arms[1].rotation.set(phase === 'queue' ? -1.25 : 0, 0, 0);
    rig.torso.position.y = phase === 'queue' ? 0.008 : 0.02;
    for (let frame = 0; frame < 120; frame++) {
      rig.update(1 / 60);
      if (frame % 20) continue;
      const m = measure(rig);
      assert.equal(m.bodyInside, 0, `${phase}/${frame} torso and legs ${JSON.stringify(m)}`);
      assert.ok(m.bodyGap > 0.005, `${phase}/${frame} torso/leg clearance ${JSON.stringify(m)}`);
      assert.equal(m.armInside, 0, `${phase}/${frame} carrying arm ${JSON.stringify(m)}`);
      assert.ok(m.supportGap >= 0 && m.supportGap < 0.005, `${phase}/${frame} palm support ${JSON.stringify(m)}`);
      assert.ok(m.size[0] < 0.18 && m.size[1] < 0.09 && m.size[2] < 0.11, 'small shallow parcel');
    }
  }
});

test('parcel pose leaves the reader-tapping right arm at the production gesture', async () => {
  const rig = await carrier();
  const right = rig.model.getObjectByName('RightHand');
  rig.arms[0].rotation.set(-1.2, 0, 0);
  rig.update(0);
  const before = right.getWorldPosition(new THREE.Vector3());
  carryOfficeParcel(rig);
  for (let i = 0; i < 120; i++) rig.update(0);
  assert.ok(before.distanceTo(right.getWorldPosition(new THREE.Vector3())) < 1e-8);
});

test('draw-time queue release updates carton world matrices before the renderer draws its meshes', async () => {
  const rig = await carrier();
  carryOfficeParcel(rig);
  const parcel = rig.root.getObjectByName('office-parcel');
  const expected = new THREE.Matrix4(),
    local = new THREE.Matrix4();
  for (const y of [0.008, 0.02, 0.008, 0.02]) {
    // Renderer has already built world matrices when the first mesh asks stepNow
    // to advance the body. Do not refresh the root after this production update.
    rig.root.updateMatrixWorld(true);
    rig.torso.position.y = y;
    rig.update(0);
    local.compose(parcel.position, parcel.quaternion, parcel.scale);
    expected.multiplyMatrices(rig.root.matrixWorld, local);
    for (const mesh of parcel.children) {
      const wanted = expected.clone().multiply(mesh.matrix);
      assert.ok(
        wanted.elements.every((n, i) => Math.abs(n - mesh.matrixWorld.elements[i]) < 1e-9),
        'visible carton follows its solved palm on this draw',
      );
    }
  }
});
