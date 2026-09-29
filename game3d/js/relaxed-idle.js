import * as THREE from 'three';

// Frozen export of the exact relaxed-3 approval, in each game rig's native axes.
export async function loadRelaxedIdle(rig, version = '') {
  const url = new URL(`../assets/characters/relaxed-idle-${rig}.json`, import.meta.url);
  const response = await fetch(url.href + version);
  if (!response.ok) throw new Error(`Approved idle: ${response.status} ${url.pathname}`);
  return THREE.AnimationClip.parse(await response.json());
}
