import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../../game3d/vendor/three/three.core.js';

const code = readFileSync(new URL('./retarget.js', import.meta.url), 'utf8')
  .replace("from 'three'", `from '${new URL('../../game3d/vendor/three/three.core.js', import.meta.url).href}'`);
const { retargetRotationValues } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const turn = (axis, angle) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...axis), angle);
const close = (actual, expected) => {
  const error = actual.clone().normalize().angleTo(expected.clone().normalize());
  assert.ok(error < 1e-6, `Rotation error ${error}`);
};
const sourceRoot = turn([0, 1, 0], 0.7), sourceChild = turn([0, 0, 1], 0.5);
const hostRoot = turn([1, 0, 0], 0.9), hostChild = turn([0, 1, 0], -0.6);
const reference = { parent: { Hips: null, Arm: 'Hips' },
  B: { Hips: sourceRoot, Arm: sourceRoot.clone().multiply(sourceChild) } };
const host = { B: { Hips: hostRoot, Arm: hostRoot.clone().multiply(hostChild) } };
const savedFrames = JSON.stringify({ reference, host });

// The reference path keeps even non-unit float samples byte-for-byte; it must
// not subtly change Eric while fixing a different host.
const referenceValues = new Float32Array([0.1, -0.2, 0.3, 0.9, 0, 0, 0, 1]);
const preserved = retargetRotationValues(referenceValues, 'Hips', reference, reference);
assert.deepEqual(preserved, referenceValues);
assert.notEqual(preserved, referenceValues);

// The source rest frame must land on the host rest frame, for roots and children
// whose parents have different rotations in world space.
close(new THREE.Quaternion().fromArray(retargetRotationValues(sourceRoot.toArray(), 'Hips', host, reference)), hostRoot);
close(new THREE.Quaternion().fromArray(retargetRotationValues(sourceChild.toArray(), 'Arm', host, reference)), hostChild);

// A 90-degree motion in local bone coordinates keeps that motion on the host.
const motion = turn([1, 0, 0], Math.PI / 2);
const sourceMotion = sourceChild.clone().multiply(motion);
const samples = new Float32Array([...sourceChild.toArray(), ...sourceMotion.toArray()]);
const savedSamples = samples.slice();
const corrected = retargetRotationValues(samples, 'Arm', host, reference);
close(new THREE.Quaternion().fromArray(corrected, 4), hostChild.clone().multiply(motion));
for (let i = 0; i < corrected.length; i += 4) {
  assert.ok(Math.abs(new THREE.Quaternion().fromArray(corrected, i).length() - 1) < 1e-6);
}
assert.deepEqual(samples, savedSamples);
assert.equal(JSON.stringify({ reference, host }), savedFrames);

// Input tracks can contain non-unit samples; correction must normalize a
// non-reference host even though Eric's reference samples are preserved above.
const nonUnit = Float32Array.from(sourceMotion.toArray(), n => n * 3.2);
const unitResult = new THREE.Quaternion().fromArray(retargetRotationValues(nonUnit, 'Arm', host, reference));
assert.ok(Math.abs(unitResult.length() - 1) < 1e-6);
close(unitResult, hostChild.clone().multiply(motion));

// Exercise the checked-in clipsFor implementation, with only its asset loader
// replaced by a preloaded fixture. The armature turn does not commute with the
// host correction, so moving correction before armQ makes this test fail.
const recipeText = readFileSync(new URL('./recipe.js', import.meta.url), 'utf8');
const clipsSource = recipeText.match(/export (async function clipsFor[\s\S]*?)\n\/\/ A recipe:/)?.[1];
assert.ok(clipsSource, 'Could not locate the actual clipsFor implementation');
const clipsFor = new Function('THREE', 'BONES', 'ROOT', 'loadGLB', 'retargetRotationValues',
  `${clipsSource}\nreturn clipsFor;`)(THREE, ['Hips'], '',
  () => { throw Error('Unexpected asset load in preloaded test fixture'); }, retargetRotationValues);
const scene = new THREE.Group(), armature = new THREE.Group(), hips = new THREE.Object3D();
hips.name = 'Hips'; scene.add(armature); armature.add(hips);
armature.quaternion.copy(turn([0, 0, 1], -0.45));
const rawRest = armature.quaternion.clone().invert().multiply(sourceRoot);
const rawTrack = new THREE.QuaternionKeyframeTrack('Hips.quaternion', [0, 1], [...rawRest.toArray(), ...rawRest.toArray()]);
const rawValues = rawTrack.values.slice();
const source = { ...reference, P: { Hips: new THREE.Vector3(0, 1, 0) } };
const destination = { ...host, P: { Hips: new THREE.Vector3(0, 0.8, 0) } };
const library = { reference: 'reference', src: { reference: source }, anims: { rest: 'fixture' },
  clips: { fixture: { scene, animations: [new THREE.AnimationClip('rest', 1, [rawTrack])] } } };
const unchanged = await clipsFor(library, destination);
close(new THREE.Quaternion().fromArray(unchanged.rest.tracks[0].values), sourceRoot);
library.retargetRest = true;
const mapped = await clipsFor(library, destination);
close(new THREE.Quaternion().fromArray(mapped.rest.tracks[0].values), hostRoot);
assert.deepEqual(rawTrack.values, rawValues, 'clipsFor mutated a cached input track');
console.log('PASS: reference preservation, rest mapping, local motion, non-unit normalization, immutable inputs, clipsFor armature order');
