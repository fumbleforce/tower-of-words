import * as THREE from 'three';

// Frozen export of the exact relaxed-3 approval, in each game rig's native axes.
export async function loadRelaxedIdle(rig, version = '') {
  const url = new URL(`../assets/characters/relaxed-idle-${rig}.json`, import.meta.url);
  const response = await fetch(url.href + version);
  if (!response.ok) throw new Error(`Approved idle: ${response.status} ${url.pathname}`);
  return THREE.AnimationClip.parse(await response.json());
}

// API characters share rotations, but keep their own limb lengths and hip height.
export function fitSharedIdle(clip, model) {
  let skeleton;
  model.traverse((node) => {
    if (node.isSkinnedMesh && !skeleton) skeleton = node.skeleton;
  });
  const world = new Map(skeleton.bones.map((bone, i) => [bone, skeleton.boneInverses[i].clone().invert()]));
  const tracks = clip.tracks.filter((track) => track.name.endsWith('.quaternion')).map((track) => track.clone());
  for (const [bone, matrix] of world) {
    const parent = world.get(bone.parent) || bone.parent.matrixWorld;
    const position = new THREE.Vector3(),
      rotation = new THREE.Quaternion(),
      scale = new THREE.Vector3();
    parent.clone().invert().multiply(matrix).decompose(position, rotation, scale);
    tracks.push(new THREE.VectorKeyframeTrack(`${bone.name}.position`, [0], position.toArray()));
    tracks.push(new THREE.VectorKeyframeTrack(`${bone.name}.scale`, [0], scale.toArray()));
  }
  return new THREE.AnimationClip(clip.name, clip.duration, tracks);
}
