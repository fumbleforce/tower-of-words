import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { registerHooks } from 'node:module';
import * as THREE from '../../vendor/three/three.module.js';
import { sampleCameraFrames } from '../support/camera-coverage-sample.mjs';

const hooks = registerHooks({
  resolve(specifier, context, next) {
    return next(
      specifier === 'three' ? new URL('../../vendor/three/three.module.js', import.meta.url).href : specifier,
      context,
    );
  },
});
after(() => hooks.deregister());
const { RoomCam } = await import('../../js/cam.js');

function fixture() {
  const root = new THREE.Group();
  root.add(new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.02, 0.5).translate(0, 0.51, 0)));
  root.scale.setScalar(1.18);
  globalThis.window = { __game: { player: { root }, busy: false } };
  const cam = new RoomCam({ elev: 46, fov: 24 });
  cam.camera.aspect = 390 / 844;
  cam.camera.updateProjectionMatrix();
  cam.fitDist = 30.128343;
  cam.follow = true;
  cam.clamp = [-1, 30, -12.4, 12];
  cam.lead = -1.6;
  const measure = () => {
    const p = new THREE.Vector3();
    let margin = Infinity;
    for (const x of [-0.275, 0.275])
      for (const y of [0, 1.02])
        for (const z of [-0.25, 0.25]) {
          p.set(x, y, z).applyMatrix4(root.matrixWorld).project(cam.camera);
          margin = Math.min(margin, ((1 - Math.abs(p.x)) * 390) / 2, ((1 - Math.abs(p.y)) * 844) / 2);
        }
    return { margin, worst: 12 - margin };
  };
  return {
    root,
    cam,
    camera: cam.camera,
    walker: {},
    x: 34.55,
    z: -2.85,
    settle: 2.5,
    measure,
  };
}

test('crowd displacement preserves both the settled frame and the requested grid point', () => {
  const f = fixture();
  let invalidResetMargin;
  const result = sampleCameraFrames({
    ...f,
    advance() {
      f.root.position.x -= 0.4;
      f.cam.snap(f.root.position);
      // The old oracle teleported the body without updating the settled camera.
      f.root.position.x += 0.4;
      f.root.updateMatrixWorld(true);
      invalidResetMargin = f.measure().margin;
      f.root.position.x -= 0.4;
    },
  });
  assert(invalidResetMargin < 12, `old mismatched frame should fail: ${invalidResetMargin}`);
  assert.equal(result.frames.length, 2);
  assert(result.frames.every((frame) => frame.margin >= 12));
  assert(Math.abs(result.displacement - 0.4) < 1e-9);
  assert.deepEqual(result.actual, [34.15, -2.85]);
  assert.equal(f.root.position.x, 34.55);
});

test('a real settled camera failure remains a failure when the requested snap passes', () => {
  const f = fixture();
  const result = sampleCameraFrames({
    ...f,
    advance() {
      f.root.position.x -= 0.4;
      f.cam.snap(f.root.position);
      f.cam.target.x -= 1;
      f.cam.place();
    },
  });
  assert(result.frames[0].worst > 0);
  assert.equal(result.frames[0].stage, 'settled');
  assert(result.frames[1].worst <= 0);
});

test('a broken requested-point snap is detected independently of the settled frame', () => {
  const f = fixture();
  const result = sampleCameraFrames({
    ...f,
    advance() {
      f.root.position.x -= 0.4;
      f.cam.snap(f.root.position);
      f.cam.snap = () => {};
    },
  });
  assert(result.frames[0].worst <= 0);
  assert(result.frames[1].worst > 0);
  assert.equal(result.frames[1].stage, 'requested');
});

test('an undisplaced frame is measured once, without a second snap hiding camera lag', () => {
  const f = fixture();
  let snaps = 0;
  const snap = f.cam.snap.bind(f.cam);
  f.cam.snap = (p) => {
    snaps++;
    snap(p);
  };
  const result = sampleCameraFrames({ ...f, advance() {} });
  assert.equal(snaps, 1);
  assert.equal(result.frames.length, 1);
  assert.equal(result.displacement, 0);
});

test('displaced requested points cannot silently pass when a camera has no snap', () => {
  const f = fixture();
  f.cam.snap(new THREE.Vector3(f.x, 0, f.z));
  const result = sampleCameraFrames({
    ...f,
    cam: {},
    advance() {
      f.root.position.x -= 0.4;
    },
  });
  assert.equal(result.frames[1].stage, 'requested');
  assert.match(result.frames[1].unverified, /no snap/);
});
