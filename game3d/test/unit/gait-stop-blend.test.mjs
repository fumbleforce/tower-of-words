import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../../vendor/three/three.core.js';

const source = fs.readFileSync(new URL('../../js/movement/gait.js', import.meta.url), 'utf8');
const implementation = source.slice(source.indexOf('export const BRISK'), source.indexOf('// The ground speed'));
const makeGait = new Function('THREE', implementation.replaceAll('export ', '') + '\nreturn makeGait;')(THREE);

test('running fades into idle without inserting a full-weight walking pose, then walking resumes', () => {
  const body = new THREE.Object3D(), mixer = new THREE.AnimationMixer(body);
  const action = (name, angle) => {
    const turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), angle).toArray();
    return mixer.clipAction(new THREE.AnimationClip(name, 1, [
      new THREE.QuaternionKeyframeTrack('.quaternion', [0, 1], [...turn, ...turn]),
    ]));
  };
  const walk = action('walk', -0.6), run = action('run', 0.6), idle = action('idle', 0);
  const gait = makeGait({ walk, run }, { walkV: 0.5, runV: 1 });
  walk.play(); gait.set(1, { run: true });
  for (let i = 0; i < 120; i++) { gait.step(1 / 60, 'walk', 1); mixer.update(1 / 60); }
  const before = body.quaternion.clone();
  assert.ok(before.x > 0.29, 'fixture reached the running pose');
  // These are the same fades applied by meshyFrom.setState('idle').
  idle.reset().setEffectiveWeight(1).fadeIn(0.25).play(); walk.fadeOut(0.25);
  gait.step(0, 'idle', 1); mixer.update(0);
  assert.ok(body.quaternion.angleTo(before) < 1e-6, 'stopping changed the pose before fade time elapsed');
  for (let i = 0; i < 30; i++) { gait.step(1 / 60, 'idle', 1); mixer.update(1 / 60); }
  assert.ok(body.quaternion.angleTo(new THREE.Quaternion()) < 1e-6, 'fade reaches idle');
  walk.reset().setEffectiveWeight(1).fadeIn(0.25).play(); idle.fadeOut(0.25); gait.set(0.5);
  for (let i = 0; i < 30; i++) { gait.step(1 / 60, 'walk', 1); mixer.update(1 / 60); }
  assert.ok(body.quaternion.x < -0.29, 'walking can restart at full weight');
});
