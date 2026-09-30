import * as THREE from 'three';
import { GLTFLoader } from '../../game3d/vendor/loaders/GLTFLoader.js';
import { loadRelaxedIdle } from '../../game3d/js/relaxed-idle.js';
import { makeRig } from './recipe.js';

const cache = new WeakMap();
const mixamoNames = { Spine: 'Spine02', Spine1: 'Spine01', Spine2: 'Spine', Neck: 'neck', HeadTop_End: 'head_end' };
const sharedName = name => {
  const plain = name.replace(/^mixamorig:?/, '');
  return plain === name ? name : mixamoNames[plain] || plain;
};

// Native idle exports preserve the approved per-character pose. Carry their skin
// transforms back into the creator's shared axes, including the approved grounding.
// This deliberately does not copy Eric's bone rotations onto another body.
async function convert(library, body) {
  if (!['eric', 'mio'].includes(body)) throw new Error(`No approved creator idle for ${body}`);
  const host = library.src[body], reference = library.src[library.reference];
  if (!host || !reference) throw new Error(`Load the creator library before the ${body} idle`);
  const [nativeClip, gltf] = await Promise.all([
    loadRelaxedIdle(body),
    new GLTFLoader().loadAsync(new URL(`../../game3d/assets/${body}/walk.glb`, import.meta.url).href),
  ]);
  try {
    if (nativeClip.userData.approval !== 'creator-idle-neutral-3/relaxed-3') throw new Error('Unexpected idle approval');
    const native = gltf.scene;
    native.updateMatrixWorld(true);
    let skeleton;
    native.traverse(node => { if (node.isSkinnedMesh && !skeleton) skeleton = node.skeleton; });
    const { rig, bones } = makeRig(host, reference);
    const bind = Object.fromEntries(Object.entries(bones).map(([name, bone]) => [name, bone.matrixWorld.clone()]));
    const nativeByName = new Map(skeleton.bones.map((bone, index) => [sharedName(bone.name), { bone, inverse: skeleton.boneInverses[index] }]));
    const normalize = new THREE.Matrix4().makeScale(1 / host.raw.H, 1 / host.raw.H, 1 / host.raw.H)
      .multiply(new THREE.Matrix4().makeTranslation(-host.raw.off.x, -host.raw.off.y, -host.raw.off.z));
    const unnormalize = normalize.clone().invert();
    const mixer = new THREE.AnimationMixer(native);
    mixer.clipAction(nativeClip).play();
    const count = Math.round(nativeClip.duration * 30), times = Array.from({ length: count + 1 }, (_, i) => i * nativeClip.duration / count);
    const values = Object.fromEntries(Object.keys(bones).map(name => [name, { position: [], quaternion: [], scale: [] }]));
    for (const time of times) {
      mixer.setTime(time === nativeClip.duration ? 0 : time);
      native.updateMatrixWorld(true);
      const desired = {};
      for (const name of Object.keys(bones)) {
        const source = nativeByName.get(name);
        if (!source) throw new Error(`${body}: missing native bone ${name}`);
        desired[name] = normalize.clone().multiply(source.bone.matrixWorld).multiply(source.inverse)
          .multiply(unnormalize).multiply(bind[name]);
      }
      for (const [name, bone] of Object.entries(bones)) {
        const parent = reference.parent[name];
        const local = (parent ? desired[parent].clone().invert() : new THREE.Matrix4()).multiply(desired[name]);
        local.decompose(bone.position, bone.quaternion, bone.scale);
        for (const property of ['position', 'quaternion', 'scale']) values[name][property].push(...bone[property].toArray());
      }
      rig.updateMatrixWorld(true);
    }
    mixer.stopAllAction();
    const tracks = [];
    for (const [name, properties] of Object.entries(values)) for (const [property, samples] of Object.entries(properties)) {
      const Track = property === 'quaternion' ? THREE.QuaternionKeyframeTrack : THREE.VectorKeyframeTrack;
      tracks.push(new Track(`${name}.${property}`, times, samples));
    }
    const clip = new THREE.AnimationClip('neutral', nativeClip.duration, tracks).optimize();
    clip.userData = { ...nativeClip.userData, rig: 'creator-shared', body };
    return clip;
  } finally {
    gltf.scene.traverse(node => {
      if (!node.isMesh) return;
      node.geometry.dispose();
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
        for (const value of Object.values(material)) if (value?.isTexture) value.dispose();
        material.dispose();
      }
    });
  }
}

// Use as ch.actions.neutral = ch.mixer.clipAction(await approvedIdleFor(lib, body));
// ch.play('neutral') plays the loop; the legacy 'idle' action holds one frame.
export function approvedIdleFor(library, body) {
  let byBody = cache.get(library);
  if (!byBody) { byBody = new Map(); cache.set(library, byBody); }
  if (!byBody.has(body)) {
    const pending = convert(library, body);
    byBody.set(body, pending);
    pending.catch(() => { if (byBody.get(body) === pending) byBody.delete(body); });
  }
  return byBody.get(body);
}
